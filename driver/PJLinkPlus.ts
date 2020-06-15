/*
 * Created 2018 by Samuel Walz
 * Version 2.3b
 * - supports class 2 commands
 * - supports authentication
 */
import {NetworkTCP} from 'system/Network';
import {NetworkProjector, State, BoolState, NumState} from 'driver/NetworkProjector';
import {callable, driver, min, max, parameter, property} from 'system_lib/Metadata';
import { SimpleFile } from 'system/SimpleFile';
import { Md5 } from 'lib/md5';

/*
 * projector commands
 */
 /* read / write */
/** Power status / control (R/W) [1] */               const CMD_POWR = 'POWR';  // class 1
/** Input switch (R/W) [1] */                         const CMD_INPT = 'INPT';  // class 1
/** Mute / Mute status (R/W) [1]  */                  const CMD_AVMT = 'AVMT';  // class 1
/** Freeze / Freeze status (R/W) [2] */               const CMD_FREZ = 'FREZ';  // since PJLink 2.0 (class 2)
/* read only */
/** Error status (RO) [1] */                          const CMD_ERST = 'ERST';  // class 1
/** Lamp number / lighting hour (RO) [1] */           const CMD_LAMP = 'LAMP';  // class 1
/** Input toggling list (RO) [2] */                   const CMD_INST = 'INST';  // since PJLink 2.0 (class 2)
/** Projector/Display name (RO) [1] */                const CMD_NAME = 'NAME';  // class 1
/** Manufacture name information (RO) [1] */          const CMD_INF1 = 'INF1';  // class 1
/** Product name information (RO) [1] */              const CMD_INF2 = 'INF2';  // class 1
/** Other information (RO) [1] */                     const CMD_INFO = 'INFO';  // class 1
/** Class information (RO) [1] */                     const CMD_CLSS = 'CLSS';  // class 1
/** Serial number (RO) [2] */                         const CMD_SNUM = 'SNUM';  // since PJLink 2.0 (class 2)
/** Software version (RO) [2] */                      const CMD_SVER = 'SVER';  // since PJLink 2.0 (class 2)
/** Input terminal name (RO) [2] */                   const CMD_INNM = 'INNM';  // since PJLink 2.0 (class 2)
/** Input resolution (RO) [2] */                      const CMD_IRES = 'IRES';  // since PJLink 2.0 (class 2)
/** Recommended resolution (RO) [2] */                const CMD_RRES = 'RRES';  // since PJLink 2.0 (class 2)
/** Filter usage time (RO) [2] */                     const CMD_FILT = 'FILT';  // since PJLink 2.0 (class 2)
/** Lamp replacement model number (RO) [2] */         const CMD_RLMP = 'RLMP';  // since PJLink 2.0 (class 2)
/** Filter replacement model number (RO) [2] */       const CMD_RFIL = 'RFIL';  // since PJLink 2.0 (class 2)
/* write only */
/** Speaker volume adjustment (write only) [2] */     const CMD_SVOL = 'SVOL';  // since PJLink 2.0 (class 2)
/** Microphone volume adjustment (write only) [2] */  const CMD_MVOL = 'MVOL';  // since PJLink 2.0 (class 2)
/* not a command */
/** server came online (receive only) [2] */          const MSG_LKUP = 'LKUP';  // since PJLink 2.0 (class 2)
/*
 * projector error codes
 */
/** Not supported / Not installed */              const ERR_1 = 'ERR1';
/** Out of parameter */                           const ERR_2 = 'ERR2';
/** Unavialable time for any reason */            const ERR_3 = 'ERR3';
/** Projector / Display failure */                const ERR_4 = 'ERR4';
/** Invalid password */                           const ERR_A = 'ERRA';

/*
 * fixed parameters
 */
/** status poll interval in milliseconds */       const STATUS_POLL_INTERVAL = 20000;
const LOG_DEBUG = false;
const PJLINK_PASSWORD = 'JBMIAProjectorLink';
const CREATE_DYNAMIC_PROPERTIES = false;

/*
 * other constants
 */
const MUTE_MIN : number = 10;
const MUTE_MAX : number = 31;
const RESOLUTION_SPLIT : string = 'x';
const IRES_NO_SIGNAL : string = '-';
const IRES_UNKNOWN_SIGNAL : string = '*';

const INPT_RGB = 1;
const INPT_VIDEO = 2;
const INPT_DIGITAL = 3;
const INPT_STORAGE = 4;
const INPT_NETWORK = 5;
const INPT_INTERNAL = 6;

const CONFIG_BASE_PATH = 'pjlinkplus.config';
const CACHE_BASE_PATH = 'pjlinkplus.cache';

const SEPARATOR_QUERY = ' ?';
const SEPARATOR_RESPONSE = '=';
const SEPARATOR_INSTRUCTION = ' ';

/**
 Manage a PJLink projector, accessed through a provided NetworkTCPDevice connection.
 Extended version.
 */
@driver('NetworkTCP', { port: 4352 })
export class PJLinkPlus extends NetworkProjector {

    private skipDeviceParameters : string[] = [];
    // line break for e.g. detailed status report
    private _lineBreak : string = '\n';

    // parameters to request when polling the device
    private devicePollParameters : string[] = [
        CMD_ERST,
        CMD_POWR,
        CMD_INPT,
        CMD_AVMT,
        CMD_LAMP,
        CMD_IRES,
        CMD_FILT,
    ];

    // from original PJLink implementation by Mike
    private unauthenticated: boolean;	// True if projector requires authentication
    private busyHoldoff?: CancelablePromise<void>;	// See projectorBusy()
    // private recentCmdHoldoff?: CancelablePromise<void>;	// See sentCommand()

    private pjlinkPassword : string;
    private randomAuthSequence : string;
    private authenticationSequence : string = '';

    private statusPoller: CancelablePromise<void>;
    private keepPollingStatus: boolean;

    private fetchingDeviceInfo: Promise<void> = null;
    private fetchDeviceInfoResolve: (value?: any) => void = null;
    private fetchDeviceInfoReject: (value?: any) => void = null;
    // private delayedDeviceInfoFetch: CancelablePromise<void>;
    // private static delayedFetchInterval: number = 10000;
    private _infoFetchDate : Date;
    private _lastKnownConnectionDate : Date;
    private _lastKnownConnectionDateSet: boolean = false;

    // power related
    private _powerStatus: number = 0;
    private _isOff: boolean = false;
    private _isOn: boolean = false;
    private _isCooling: boolean = false;
    private _isWarmingUp: boolean = false;
    // input
    private _inputType: number = 0;
    private _inputSource: string = '-';
    private _input: StringState;
    private _validInputs: string[];
    // audio / video mute
    private readonly _mute : NumState;
    // freeze
    private readonly _freeze : BoolState;
    // resolution
    private _inputResolution : Resolution;
    private _recommendedResolution : Resolution;
    // various information
    private _deviceName : string;
    private _manufactureName : string;
    private _productName : string;
    private _otherInformation : string;
    private _class : number;
    private _serialNumber : string;
    private _softwareVersion : string;
    // lamp information
    private _hasLamps : boolean;
    private _lampCount : number = 0;
    private _lampOneHours : number = -1;
    private _lampTwoHours : number = -1;
    private _lampThreeHours : number = -1;
    private _lampFourHours : number = -1;
    private _lampOneActive : boolean = false;
    private _lampTwoActive : boolean = false;
    private _lampThreeActive : boolean = false;
    private _lampFourActive : boolean = false;
    private _lampReplacementModelNumber : string;
    // filter information
    private _hasFilter : boolean;
    private _filterUsageTime : number = -1;
    private _filterReplacementModelNumber : string;
    // error / warning reated
    private _errorStatus : string = '000000';
    private _errorStatusFan : number = 0;
    private _errorStatusLamp : number = 0;
    private _errorStatusTemperature : number = 0;
    private _errorStatusCoverOpen : number = 0;
    private _errorStatusFilter : number = 0;
    private _errorStatusOther : number = 0;
    private _hasError : boolean = false;
    private _hasWarning : boolean = false;

    private _currentParameterFetchList : string[] = [];
    private _currentParameter : string;

    private _customRequestResult : string;

    private static commandInformation : Dictionary<CommandInfo> = {
        [CMD_POWR] : {dynamic: true,  cmdClass: 1, read: true,  write: true,  needsPower: false},
        [CMD_INPT] : {dynamic: true,  cmdClass: 1, read: true,  write: true,  needsPower: true },
        [CMD_AVMT] : {dynamic: true,  cmdClass: 1, read: true,  write: true,  needsPower: true },
        [CMD_ERST] : {dynamic: true,  cmdClass: 1, read: true,  write: false, needsPower: false},
        [CMD_LAMP] : {dynamic: true,  cmdClass: 1, read: true,  write: false, needsPower: false},
        [CMD_INST] : {dynamic: false, cmdClass: 2, read: true,  write: false, needsPower: false},
        [CMD_NAME] : {dynamic: false, cmdClass: 1, read: true,  write: false, needsPower: false},
        [CMD_INF1] : {dynamic: false, cmdClass: 1, read: true,  write: false, needsPower: false},
        [CMD_INF2] : {dynamic: false, cmdClass: 1, read: true,  write: false, needsPower: false},
        [CMD_INFO] : {dynamic: false, cmdClass: 1, read: true,  write: false, needsPower: false},
        [CMD_CLSS] : {dynamic: false, cmdClass: 1, read: true,  write: false, needsPower: false},
        [CMD_SNUM] : {dynamic: false, cmdClass: 2, read: true,  write: false, needsPower: false},
        [CMD_SVER] : {dynamic: false, cmdClass: 2, read: true,  write: false, needsPower: false},
        [CMD_INNM] : {dynamic: true,  cmdClass: 2, read: true,  write: false, needsPower: false},
        [CMD_IRES] : {dynamic: true,  cmdClass: 2, read: true,  write: false, needsPower: true },
        [CMD_RRES] : {dynamic: false, cmdClass: 2, read: true,  write: false, needsPower: false},
        [CMD_FILT] : {dynamic: true,  cmdClass: 2, read: true,  write: false, needsPower: false},
        [CMD_RLMP] : {dynamic: false, cmdClass: 2, read: true,  write: false, needsPower: false},
        [CMD_RFIL] : {dynamic: false, cmdClass: 2, read: true,  write: false, needsPower: false},
        [CMD_SVOL] : {dynamic: true,  cmdClass: 2, read: false, write: true,  needsPower: true },
        [CMD_MVOL] : {dynamic: true,  cmdClass: 2, read: false, write: true,  needsPower: true },
        [CMD_FREZ] : {dynamic: true,  cmdClass: 2, read: true,  write: true,  needsPower: true },
    }
    private commandReplyCache: Dictionary<CommandReply> = {};
    private cacheFilePath : string;
    private currentQuery: PJLinkQuery;

    private inputInformation : NumDict<InputTypeInfo> = {
        1 : {label: 'RGB', sourceIDs: []},
        2 : {label: 'Video', sourceIDs: []},
        3 : {label: 'Digital', sourceIDs: []},
        4 : {label: 'Storage', sourceIDs: []},
        5 : {label: 'Network', sourceIDs: []},
        6 : {label: 'Internal', sourceIDs: []},
    }

    private configurationFilePath: string;
    private configuration: PJLinkConfiguration;

	constructor(socket: NetworkTCP) {

        super(socket);

        this.addState(this._power = new BoolState('POWR', 'power'));
        this.addState(this._input = new StringState(CMD_INPT, 'input', () => this._power.getCurrent()));
		this.addState(this._mute = new NumState(
			CMD_AVMT, 'mute',
			MUTE_MIN, MUTE_MAX,
            () => this._power.getCurrent()
		));
        this.addState(this._freeze = new BoolState(CMD_FREZ, 'freeze', () => this._power.getCurrent()));
		/*	Set some reasonable default value to not return undefined, as the mute value
			isn't read back from the projector.
		 */
		this._mute.set(MUTE_MIN);

        socket.subscribe('connect', (_sender, _message)=> {
			this.onConnectStateChange();
		});

        this.cacheFilePath = CACHE_BASE_PATH + '/' + this.socket.name + '.json';
        this.configurationFilePath = CONFIG_BASE_PATH + '/' + this.socket.name + '.cfg.json';

        SimpleFile.read(this.configurationFilePath).then(readValue => {
            this.configuration = JSON.parse(readValue);
		}).catch(_error => {
			console.log('creating configuration file for "' + this.socket.name + '" under "' + this.configurationFilePath + '" - please fill out password if needed');
            this.storePassword(PJLINK_PASSWORD);
		}).finally(() => {
            this.pjlinkPassword = this.configuration.password;
            // start polling and connect
            this.poll();
            this.attemptConnect();
        });


    }
    private storePassword (password: string) : Promise<void> {
        if (!this.configuration) {
            this.configuration = new PJLinkConfiguration();
        }
        this.configuration.password = password;
        return this.storeConfiguration(this.configuration);
    }
    private storeConfiguration (cfg?: PJLinkConfiguration) : Promise<void> {
        if (!cfg) cfg = this.configuration;
        return SimpleFile.write(this.configurationFilePath, cfg.toJSON());
    }

    protected pollStatus(): boolean {
		return true;
	}

    justConnected (): void {
        wait(200).then(() => {
            if (this.unauthenticated) {
                console.warn('not authenticated');
            }
            else {
                this.getToKnowDevice().then(
                    _resolve =>  {
                        if (LOG_DEBUG) console.log('got to know device - starting to poll');
                        this.startPollDeviceStatus();
                    },
                    _reject => console.warn('could not get to know device')
                );
            }
        });
    }

    /**
     * collect valuable info about device
     */
    private getToKnowDevice () : Promise<void> {
        return new Promise<void> ((resolveGetToKnow, rejectGetToKnow) => {
            if (LOG_DEBUG) console.log('trying to load from disk');
            this.tryLoadCacheFromDisk().then(_resolve => {
                if (LOG_DEBUG) console.log('trying to get class 1 static info');
                // get static info class 1
                this.tryGetStaticInformation(1).then(_resolve => {
                    if (this._class > 1) {
                        if (LOG_DEBUG) console.log('trying to get class 2 static info');
                        // get static info class 2
                        this.tryGetStaticInformation(2).then(_resolve => {
                            if (CREATE_DYNAMIC_PROPERTIES) this.createDynamicInputProperties();
                            resolveGetToKnow();
                        },
                        _reject => {
                            rejectGetToKnow();
                        });
                    }
                    else {
                        // only class 1 : nothing left to do
                        resolveGetToKnow();
                    }
                },
                _reject => {
                    rejectGetToKnow();
                });
            });
        });
    }

    private tryLoadCacheFromDisk () : Promise<void> {
        return new Promise<void> ((resolve, _reject) => {
            SimpleFile.read(this.cacheFilePath).then(readValue => {
                this.commandReplyCache = JSON.parse(readValue);
                if (LOG_DEBUG) console.log('successfully loaded command reply cache');
                resolve();
            }).catch(_error => {
                SimpleFile.write(this.cacheFilePath, JSON.stringify(this.commandReplyCache));
                resolve();
            });
        });
    }
    private cacheCommandReply (command: string, reply: string) {
        var existingItem = this.commandReplyCache[command];
        if (existingItem && existingItem.reply == reply) return;
        this.commandReplyCache[command] = {reply: reply};
        SimpleFile.write(this.cacheFilePath, JSON.stringify(this.commandReplyCache)).then(_resolve => {
            if (LOG_DEBUG) console.log('updated cache file \'' + this.cacheFilePath + '\' with ' + command + '=\'' + reply + '\'');
        });
    }

    private tryGetStaticInformation (cmdClass: number) : Promise<void> {
        return new Promise((resolveGetStatic, rejectGetStatic) => {
            var commands : string[] = PJLinkPlus.getStaticCommands(cmdClass);
            this.fetchDeviceInformation(commands).then(_resolve => {
                resolveGetStatic();
            },
            reject => {
                rejectGetStatic(reject);
            });
        });
    }



    private static getStaticCommands (cmdClass: number) : string[] {
        var commands : string[] = [];
        for (var command in this.commandInformation) {
            var info = this.commandInformation[command];
            if (!info.dynamic && info.cmdClass == cmdClass) commands.push(command);
        }
        return commands;
    }


    /* power status */
    @property("Power status (detailed: 0, 1, 2, 3 -> off, on, cooling, warming)", true)
    public get powerStatus() : number {
        return this._powerStatus;
    }
    public set powerStatus(_value : number) {}
    @property("Is device off?", true)
    public get isOff() : boolean {
        return this._isOff;
    }
    public set isOff(value : boolean) {}
    @property("Is device on?", true)
    public get isOn() : boolean {
        return this._isOn;
    }
    public set isOn(value : boolean) {}
    @property("Is device cooling?", true)
    public get isCooling() : boolean {
        return this._isCooling;
    }
    public set isCooling(value : boolean) {}
    @property("Is device warming up?", true)
    public get isWarmingUp() : boolean {
        return this._isWarmingUp;
    }
    public set isWarmingUp(value : boolean) {}

    /* input */
    @property('current input (class 1: 11-59 / class 2: 11-6Z)')
    public set input(value: string) {
        if (value.length != 2) return;
        this.setInput(parseInt(value[0]), value[1]);
    }
    public get input() : string {
        return this._input.get();
    }
    private createDynamicInputProperties () : void {
        if (LOG_DEBUG) console.log('trying to create dynamic input properties');
        for(const type in this.inputInformation) {
            const typeNum = parseInt(type);
            const info = this.inputInformation[typeNum];
            if (info.sourceIDs.length > 0) {
                if (LOG_DEBUG) console.log('attempting create input for ' + info.label);
                this.property<string>('input' + info.label, { type: Number, description: 'select ' + info.label + ' input (valid values: ' + info.sourceIDs.join(', ') + ')'}, setValue => {
                    if (setValue !== undefined) {
                        this.setInput(typeNum, setValue + '');
                    }
                    return this._inputType == typeNum ? this._inputSource : '-';
                });
            }
        }
    }
    private setInput (type: number, id: string) : boolean {
        switch(this._class) {
            default:
            case 1:
                return this.setInputClass1(type, parseInt(id));
            case 2:
                return this.setInputClass2(type, id);
        }
    }
    private setInputClass1 (type: number, id: number) : boolean {
        if (type < INPT_RGB || type > INPT_NETWORK) return false;
        if (id === NaN) {
            console.warn('not a valid input id (1-9)');
            return false;
        }
        this._inputType = type;
        this._inputSource = id + '';
        if (this._input.set(type + '' + id)) {
            this.sendCorrection();
        }
    }
    private setInputClass2 (type: number, id: string) : boolean {
        if (type < INPT_RGB || type > INPT_INTERNAL) return false;
        if (!this.isValidSourceID(id, 2)) {
            console.warn('\'' + id + '\'not a valid input id (1-9 A-Z)');
            return false;
        }
        var inputValue = type + id;
        if (this._validInputs.indexOf(inputValue) === -1) {
            console.warn('not a valid input id - valid input ids: ' + this._validInputs.join(', '));
            return false;
        }
        this._inputType = type;
        this._inputSource = id;
        if (this._input.set(type + id)) {
            this.sendCorrection();
        }
        return true;
    }
    isValidSourceID(sourceID : string, sourceClass: number) {
        switch (sourceClass) {
            default:
            case 1:
                return sourceID.length === 1 && sourceID.match(/[1-9]/);
            case 2:
                return sourceID.length === 1 && sourceID.match(/[A-Z1-9]/);
        }

    }

    /* audio / video mute */
    @property("Mute setting. (Video mute on/off: 11/10, Audio mute on/off: 21/20, A/V mute on/off: 31/30)")
	@min(MUTE_MIN)
	@max(MUTE_MAX)
	public set mute(value: number) {
		if (this._mute.set(value)) {
            this.sendCorrection();
        }
	}
	public get mute(): number {
		return this._mute.get();
	}
    @property("Mute audio")
    public set muteAudio (value: boolean) {
        this.mute = value ? 21 : 20;
    }
    public get muteAudio () : boolean {
        var currentValue = this._mute.get();
        return currentValue == 31 || currentValue == 21;
    }
    @property("Mute video")
    public set muteVideo (value: boolean) {
        this.mute = value ? 11 : 10;
    }
    public get muteVideo () : boolean {
        var currentValue = this._mute.get();
        return currentValue == 31 || currentValue == 11;
    }

    /* resolution */
    @property('Input resolution (' + CMD_IRES + ')', true)
    public get inputResolution () : string {
        if (this._inputResolution) {
            return this._inputResolution.toString();
        }
        return 'undefined';
    }
    @property('Recommended resolution (' + CMD_RRES + ')', true)
    public get recommendedResolution () : string {
        if (this._recommendedResolution) {
            return this._recommendedResolution.toString();
        }
        return 'undefined';
    }

    /* various information */
    @property('Projector/Display name (' + CMD_NAME + ')', true)
    public get deviceName () : string {
        return this._deviceName;
    }
    @property('Manufacture name (' + CMD_INF1 + ')', true)
    public get manufactureName () : string {
        return this._manufactureName;
    }
    @property('Product name (' + CMD_INF2 + ')', true)
    public get productName () : string {
        return this._productName;
    }
    @property('Other information (' + CMD_INFO + ')', true)
    public get otherInformation () : string {
        return this._otherInformation;
    }
    @property('Serial number (' + CMD_SNUM + ')', true)
    public get serialNumber () : string {
        return this._serialNumber;
    }
    @property('Software version (' + CMD_SVER + ')', true)
    public get softwareVersion () : string {
        return this._softwareVersion;
    }

    /* lamp properties */
    @property("Lamp count", true)
    public get lampCount (): number {
        return this._lampCount;
    }
    @property("Lamp one: lighting hours", true)
    public get lampOneHours (): number {
        return this._lampOneHours;
    }
    @property("Lamp two: lighting hours", true)
    public get lampTwoHours (): number {
        return this._lampTwoHours;
    }
    @property("Lamp three: lighting hours", true)
    public get lampThreeHours (): number {
        return this._lampThreeHours;
    }
    @property("Lamp four: lighting hours", true)
    public get lampFourHours (): number {
        return this._lampFourHours;
    }
    @property("Lamp one: active", true)
    public get lampOneActive (): boolean {
        return this._lampOneActive;
    }
    @property("Lamp one: active", true)
    public get lampTwoActive (): boolean {
        return this._lampTwoActive;
    }
    @property("Lamp one: active", true)
    public get lampThreeActive (): boolean {
        return this._lampThreeActive;
    }
    @property("Lamp one: active", true)
    public get lampFourActive (): boolean {
        return this._lampFourActive;
    }
    @property('Lamp replacement model number (' + CMD_RLMP + ')', true)
    public get lampReplacementModelNumber () : string {
        return this._lampReplacementModelNumber;
    }

    /* filter properties */
    @property("Has filter?", true)
    public get hasFilter() : boolean {
        return this._hasFilter;
    }
    @property("Filter usage time (hours)", true)
    public get filterUsageTime () : number {
        return this._filterUsageTime;
    }
    @property('Filter replacement model number (' + CMD_RFIL + ')', true)
    public get filterReplacementModelNumber () : string {
        return this._filterReplacementModelNumber;
    }

    /* error properties*/
    @property("Error status (ERST)", true)
    public get errorStatus (): string {
        return this._errorStatus;
    }
    @property("Error reported?", true)
    public get hasError () : boolean {
        return this._hasError;
    }
    @property("Warning reported?", true)
    public get hasWarning () : boolean {
        return this._hasWarning;
    }
    @property("Problem reported?", true)
    public get hasProblem () : boolean {
        return this._hasError || this._hasWarning;
    }

    @property('PJLink password')
    public set password (value: string) {
        this.storePassword(value);
    }
    public get password () : string {
        return this.configuration ? this.configuration.password : PJLINK_PASSWORD;
    }

    /* special properties */
    @property("Is Projector/Display online? (Guesstimate: PJLink connection drops every now and then)", true)
    public get isOnline () : boolean {
    	const now = new Date();
        if (this.socket.connected) {
            this._lastKnownConnectionDate = now;
            return true;
        }
        if (!this._lastKnownConnectionDateSet) {
            console.warn('last known connection date unknown');
            return false;
        }
        var msSinceLastConnection = now.getTime() - this._lastKnownConnectionDate.getTime();
        // console.warn(msSinceLastConnection);
        return msSinceLastConnection < 42000;
    }

    @property("Detailed device status report (human readable)", true)
    public get detailedStatusReport () : string {
        if (this._infoFetchDate === undefined) {
            return 'call "fetchDeviceInfo" at least once before requesting "detailedStatusReport"';
        }
        return 'Device: ' + this._manufactureName + ' ' + this._productName + ' ' +  this._deviceName + this._lineBreak +
            'Power status: ' + this.translatePowerCode(this._powerStatus) + this._lineBreak +
            'Error status: (' + this._errorStatus + ')' + this._lineBreak +
            '  Fan: ' + this.translateErrorCode(this._errorStatusFan) + this._lineBreak +
            '  Lamp' + (this._lampCount > 1 ? 's' : '') + ': ' + (this._hasLamps !== undefined && this._hasLamps ? this.translateErrorCode(this._errorStatusLamp) : '[no lamps]') + this._lineBreak +
            '  Temperature: ' + this.translateErrorCode(this._errorStatusTemperature) + this._lineBreak +
            '  Cover open: ' + this.translateErrorCode(this._errorStatusCoverOpen) + this._lineBreak +
            '  Filter: ' + (this._hasFilter !== undefined && this._hasFilter ? this.translateErrorCode(this._errorStatusFilter) : '[no filter]') + this._lineBreak +
            '  Other: ' + this.translateErrorCode(this._errorStatusOther) + this._lineBreak +
            (this._lampCount > 0 ? 'Lamp status: ' + this._lineBreak : '') +
            (this._lampCount > 0 ? 'Lamp one: ' + (this._lampOneActive ? 'on' : 'off') + ', ' + this._lampOneHours + ' lighting hours' + this._lineBreak : '') +
            (this._lampCount > 1 ? 'Lamp two: ' + (this._lampTwoActive ? 'on' : 'off') + ', ' + this._lampTwoHours + ' lighting hours' + this._lineBreak : '') +
            (this._lampCount > 2 ? 'Lamp three: ' + (this._lampThreeActive ? 'on' : 'off') + ', ' + this._lampThreeHours + ' lighting hours' + this._lineBreak : '') +
            (this._lampCount > 3 ? 'Lamp four: ' + (this._lampFourActive ? 'on' : 'off') + ', ' + this._lampFourHours + ' lighting hours' + this._lineBreak : '') +
            (this._lampReplacementModelNumber ? 'Lamp replacement model number: ' + this._lampReplacementModelNumber + this._lineBreak : '') +
            (this._filterUsageTime ? 'Filter usage time: ' + this._filterUsageTime + ' hours' + this._lineBreak : '') +
            (this._filterReplacementModelNumber ? 'Filter replacement model number: ' + this._filterReplacementModelNumber + this._lineBreak : '') +
            (this._validInputs ? 'Inputs: ' + this._validInputs.join(', ') + this._lineBreak : '' ) +
            (this._serialNumber ? 'SNR: ' + this._serialNumber + this._lineBreak : '') +
            (this._softwareVersion ? 'Software version: ' + this._softwareVersion + this._lineBreak : '' ) +
            '(class ' + this._class + ', status report last updated ' + this._infoFetchDate + ')';
    }

    private translateErrorCode (code : number) : string {
        switch (code) {
            case 0:
                return 'OK';
            case 1:
                return 'Warning';
            case 2:
                return 'Error';
        }
        return 'unknown error code';
    }
    private translatePowerCode (code : number) : string {
        switch (code) {
            case 0:
                return 'Off';
            case 1:
                return 'On';
            case 2:
                return 'Cooling';
            case 3:
                return 'Warming Up';
        }
        return 'unknown power code';
    }

    private nextParameterToFetch () : string {
        var parameter : string;
        while (parameter === undefined &&
                this._currentParameterFetchList.length > 0) {
            parameter = this._currentParameterFetchList.pop();
            if (this.skipDeviceParameters.indexOf(parameter) > -1) parameter = undefined;
        }
        return parameter;
    }

    private fetchDeviceInformation (wantedInfo : string[]) : Promise<void> {
        if (LOG_DEBUG) console.log('trying to get info: \'' + wantedInfo.join(', ') + '\'');
        this._currentParameterFetchList = wantedInfo.slice().reverse();
        this.fetchingDeviceInfo = new Promise<void>((resolve, reject)=>{
            if (this.fetchDeviceInfoResolve) {
                reject('fetch already in progress');
            }
            else {
                this.fetchDeviceInfoResolve = resolve;
                this.fetchInfoLoop();
                this.fetchDeviceInfoReject = reject;
                wait(2000 * wantedInfo.length).then(() => {
                    reject('fetch timeout');
                });
            }
        });
        return this.fetchingDeviceInfo;
    }
    private fetchInfoLoop () : void {
        if (!this.keepFetchingInfo()) return;
        this._currentParameter = this.nextParameterToFetch();
        if (this._currentParameter !== undefined) {
            let pjClass : number;
            if (this._currentParameter == CMD_INPT) {
                pjClass = this._class;
            }
            else {
                pjClass = PJLinkPlus.determineCommandClass(this._currentParameter);
            }
            this.currentQuery = new PJLinkQuery(pjClass, this._currentParameter);
            this.fetchInfo(this.currentQuery).then(
                reply => {
                    this.processInfoQueryReply(this.currentQuery, reply);
                    wait(100).then(() => {
                        this.fetchInfoLoop();
                    });
                },
                _error => {
                    this.fetchInfoLoop();
                }
            );
        } else {
            this.finishFetchDeviceInformation();
        }
    }
    private abortFetchDeviceInformation () : void {
        if (this.fetchDeviceInfoResolve) {
            this.fetchDeviceInfoReject('fetching device info aborted');
            this.cleanUpFetchingDeviceInformation();
        }
    }
    private keepFetchingInfo () : boolean {
        return this.fetchDeviceInfoResolve !== undefined;
    }
    private finishFetchDeviceInformation () : void {
        if (this.fetchDeviceInfoResolve) {
            this.fetchDeviceInfoResolve(true);
            this._infoFetchDate = new Date();
            this.cleanUpFetchingDeviceInformation();
        }
    }
    private cleanUpFetchingDeviceInformation () : void {
        delete this.fetchingDeviceInfo;
        delete this.fetchDeviceInfoResolve;
        delete this.fetchDeviceInfoReject;
    }
    private fetchInfo (query: PJLinkQuery) : Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if ((!this._power || !this._power.getCurrent()) &&
                    PJLinkPlus.commandNeedsPower(query.command)) {
                reject('device needs to be powered on for command ' + query.command);
                return;
            }
            var cachedReply = this.commandReplyCache[query.command];
            if (cachedReply) {
                if (LOG_DEBUG) console.log('used cached reply for command ' + query.command);
                resolve(cachedReply.reply);
                return;
            }
            this.queryRequest(query).then(
                reply => {
                    if (reply != ERR_1) {
                        if (LOG_DEBUG) console.log('got reply for \'' + this._currentParameter + '\':' + reply);
                        // successful fetch and parameter is not dynamic? cache & skip next time
                        if (!PJLinkPlus.isCommandDynamic(query.command)) {
                            this.cacheCommandReply(query.command, reply);
                            this.addCommandToSkip(query.command);
                        }
                        resolve(reply);
                    } else {
                        // PJLink perceives ERR_1 and ERR_2 as successful queries
                        this.processInfoQueryError(query.command, reply);
                        reject('command not available: ' + query.command);
                    }
                },
                error => {
                    this.processInfoQueryError(query.command, error);
                    reject(error);
                }
            );
        });
    }
    private startPollDeviceStatus () {
        if (this.statusPoller) {
            console.warn('status polling already running');
            return;
        }
        this.pollDeviceStatus(true);
    }
    private pollDeviceStatus(skipInterval: boolean = false) {
        if (!this.connected) {
            this.abortPollDeviceStatus();
            return;
        }
        this.keepPollingStatus = true;
        // status interval minus up to 10% (to create some variation)
        let waitDuration = skipInterval ? 7 : STATUS_POLL_INTERVAL - Math.random() * (STATUS_POLL_INTERVAL * 0.1);
        if (LOG_DEBUG) console.log('going to wait for ' + waitDuration + ' ms');
		this.statusPoller = wait(waitDuration);
		this.statusPoller.then(()=> {
            if (!this.keepPollingStatus) return;
			if (this.socket.connected &&
                this.connected) {
                this.fetchDeviceInformation(this.devicePollParameters).then(_resolve => {
                    if (LOG_DEBUG) console.log('poll device status DONE');
                },
                reject => {
                    if (LOG_DEBUG) console.log('poll device status error: ' + reject);
                });
			}
			if (!this.discarded) {
                // Keep polling
                this.pollDeviceStatus();
            }
            else {
                this.abortPollDeviceStatus();
            }
		})
	}
    private abortPollDeviceStatus () : void {
        this.keepPollingStatus = false;
        this.abortFetchDeviceInformation();
        console.log('aborting polling device status');
        if (this.statusPoller) delete this.statusPoller;
    }

    private processInfoQueryError (command : string, error : string) {
        if (error == ERR_1) {
            if (command == CMD_LAMP) this._hasLamps = false;
            if (command == CMD_FILT) this._hasFilter = false;
            this.skipDeviceParameters.push(command);
        }
    }
    private processInfoQueryReply (query : PJLinkQuery, reply : string) {
        switch (query.command) {
            case CMD_POWR:
                var newPowerStatus = parseInt(reply);
                if (this._powerStatus != newPowerStatus) {
                    this._powerStatus = newPowerStatus;
                    this.changed('powerStatus');
                    // also update PJLink base driver power status
                    this._power.updateCurrent((parseInt(reply) & 1) != 0);
                    // updating detailed status
                    var newIsOff = this._powerStatus == 0;
                    var newIsOn = this._powerStatus == 1;
                    var newIsCooling = this._powerStatus == 2;
                    var newIsWarmingUp = this._powerStatus == 3;
                    if (this._isOff != newIsOff) {
                        this._isOff = newIsOff;
                        this.changed('isOff');
                    }
                    if (this._isOn != newIsOn) {
                        this._isOn = newIsOn;
                        this.changed('isOn');
                    }
                    if (this._isCooling != newIsCooling) {
                        this._isCooling = newIsCooling;
                        this.changed('isCooling');
                    }
                    if (this._isWarmingUp != newIsWarmingUp) {
                        this._isWarmingUp = newIsWarmingUp;
                        this.changed('isWarmingUp');
                    }
                }
                break;
            case CMD_INPT:
                if (reply.length == 2) {
                    var oldType = this._inputType;
                    var newType = parseInt(reply[0]);
                    var newSource = reply[1];
                    var typeChanged = false;
                    var sourceChanged = false;
                    if (newType != this._inputType) {
                        this._inputType = newType;
                        typeChanged = true;
                    }
                    if (newSource != this._inputSource) {
                        this._inputSource = newSource;
                        sourceChanged = true;
                    }
                    if (typeChanged) {
                        this.notifyInputTypeChange(oldType);
                    }
                    if (typeChanged || sourceChanged) {
                        this.notifyInputTypeChange(newType);
                    }
                }
                this._input.updateCurrent(reply);
                break;
            case CMD_AVMT:
                this._mute.updateCurrent(parseInt(reply));
                break;
            case CMD_ERST:
                var errorNames = ['Fan', 'Lamp', 'Temperature', 'CoverOpen', 'Filter', 'Other'];
                this._errorStatus = reply;
                if (reply.length == 6) {
                    var list = [0, 0, 0, 0, 0, 0];
                    var warning = false;
                    var error = false;
                    for (let i = 0; i < reply.length; i++) {
                        list[i] = parseInt(reply[i]);
                        error = error || list[i] == 2;
                        warning = warning || list[i] == 1;
						(<any>this)['_errorStatus' + errorNames[i]] = list[i];
                    }
                    if (this._hasError != error) {
                        this._hasError = error;
                        this.changed('hasError');
                        this.changed('hasProblem');
                    }
                    if (this._hasWarning != warning) {
                        this._hasWarning = warning;
                        this.changed('hasWarning');
                        this.changed('hasProblem');
                    }
                }
                break;
            case CMD_LAMP:
                this._hasLamps = true;
                var lampNames = ['One', 'Two', 'Three', 'Four'];
                var lampData = reply.split(' ');
                this._lampCount = lampData.length / 2;
                for (let i = 0; i < this._lampCount; i++) {
                    var newHours = parseInt(lampData[i * 2]);
                    var newActive = parseInt(lampData[i * 2 + 1]) == 1;
                    if ((<any>this)['_lamp' + lampNames[i] + 'Hours'] != newHours) {
						(<any>this)['_lamp' + lampNames[i] + 'Hours'] = newHours;
						(<any>this).changed('lamp' + lampNames[i] + 'Hours');
                    }
                    if ((<any>this)['_lamp' + lampNames[i] + 'Active'] != newActive) {
						(<any>this)['_lamp' + lampNames[i] + 'Active'] = newActive;
                        this.changed('lamp' + lampNames[i] + 'Active');
                    }
                }
                break;
            case CMD_INST:
                this._validInputs = reply.split(' ');
                for (var i = 0; i < this._validInputs.length; i++) {
                    this.addValidInput(this._validInputs[i]);
                }
                break;
            case CMD_NAME:
                var newDeviceName = reply;
                if (this._deviceName != newDeviceName) {
                    this._deviceName = newDeviceName;
                    this.changed('deviceName');
                }
                break;
            case CMD_INF1:
                var newManufactureName = reply;
                if (this._manufactureName != newManufactureName) {
                    this._manufactureName = newManufactureName;
                    this.changed('manufactureName');
                }
                break;
            case CMD_INF2:
                var newProductName = reply;
                if (this._productName != newProductName) {
                    this._productName = newProductName;
                    this.changed('productName');
                }
                break;
            case CMD_INFO:
                var newOtherInformation = reply;
                if (this._otherInformation != newOtherInformation) {
                    this._otherInformation = newOtherInformation;
                    this.changed('otherInformation');
                }
                break;
            case CMD_CLSS:
                this._class = parseInt(reply);
                // skip unsupported parameters (since we now know the PJLink class)
                for (var infoKey in PJLinkPlus.commandInformation) {
                    var info = PJLinkPlus.commandInformation[infoKey];
                    if (info.cmdClass > this._class) {
                        this.addCommandToSkip(infoKey);
                    }
                }
                break;
            case CMD_SNUM:
                var newSerialNumber = reply;
                if (this._serialNumber != newSerialNumber) {
                    this._serialNumber = newSerialNumber;
                    this.changed('serialNumber');
                }
                break;
            case CMD_SVER:
                var newSoftwareVersion = reply;
                if (this._softwareVersion != newSoftwareVersion) {
                    this._softwareVersion = newSoftwareVersion;
                    this.changed('softwareVersion');
                }
                break;
            case CMD_INNM:
                // nothing yet
                break;
            case CMD_IRES:
                var newInputResolution : Resolution;
                if (reply == IRES_NO_SIGNAL) {
                    newInputResolution = new Resolution(-1, -1);
                }
                else if (reply == IRES_UNKNOWN_SIGNAL) {
                    newInputResolution = new Resolution(-1, -1);
                }
                else {
                    newInputResolution = PJLinkPlus.parseResolution(reply);
                }
                if (!this._inputResolution ||
                this._inputResolution.horizontal != newInputResolution.horizontal ||
                this._inputResolution.vertical != newInputResolution.vertical) {
                    this._inputResolution = newInputResolution;
                    this.changed('inputResolution');
                }
                break;
            case CMD_RRES:
                var newRecommendedResolution : Resolution = PJLinkPlus.parseResolution(reply);
                if (!this._recommendedResolution ||
                this._recommendedResolution.horizontal != newRecommendedResolution.horizontal ||
                this._recommendedResolution.vertical != newRecommendedResolution.vertical) {
                    this._recommendedResolution = newRecommendedResolution;
                    this.changed('recommendedResolution');
                }
                break;
            case CMD_FILT:
                var newHasFilter = true;
                var newFilterUsageTime = parseInt(reply);
                if (this._hasFilter != newHasFilter) {
                    this._hasFilter = newHasFilter;
                    this.changed('hasFilter');
                }
                if (this._filterUsageTime != newFilterUsageTime) {
                    this._filterUsageTime = newFilterUsageTime;
                    this.changed('filterUsageTime');
                }
                break;
            case CMD_RLMP:
                // Maximum length of the parameter is 128 bytes.
                // If there are multiple replacement model numbers, they are separated by (SP).
                // empty reply: there is no replacement model number
                var newLampReplacementModelNumber = reply;
                if (this._lampReplacementModelNumber != newLampReplacementModelNumber) {
                    this._lampReplacementModelNumber = newLampReplacementModelNumber;
                    this.changed('lampReplacementModelNumber');
                }
                break;
            case CMD_RFIL:
                // Maximum length of the parameter is 128 bytes.
                // If there are multiple replacement model numbers, they are separated by (SP).
                // empty reply: there is no replacement model number
                var newFilterReplacementModelNumber = reply;
                if (this._filterReplacementModelNumber != newFilterReplacementModelNumber) {
                    this._filterReplacementModelNumber = newFilterReplacementModelNumber;
                    this.changed('filterReplacementModelNumber');
                }
                break;
            case CMD_FREZ:
                // Freeze status ON: 1
                // Freeze status OFF:0
                this._freeze.updateCurrent(parseInt(reply) == 1);
                break;
        }
    }

    notifyInputTypeChange (type: number) {
        switch (type) {
            case INPT_RGB:
                this.changed('inputRGB');
                break;
            case INPT_VIDEO:
                this.changed('inputVideo');
                break;
            case INPT_DIGITAL:
                this.changed('inputDigital');
                break;
            case INPT_STORAGE:
                this.changed('inputStorage');
                break;
            case INPT_NETWORK:
                this.changed('inputNetwork');
                break;
            case INPT_INTERNAL:
                this.changed('inputInternal');
                break;
        }
    }

    addValidInput (inputChars: string) : void {
        if (inputChars.length != 2)
        {
            console.warn('wrong length of input chars: \'' + inputChars + '\'');
            return;
        }
        var type = parseInt(inputChars[0]);
        if (type === undefined ||
            type < INPT_RGB ||
            type > INPT_INTERNAL) {
            console.warn('invalid input type: \'' + inputChars + '\'');
            return;
        }
        var sourceID = inputChars[1];
        this.inputInformation[type].sourceIDs.push(sourceID);
    }

    addCommandToSkip (command : string) {
        if (this.skipDeviceParameters.indexOf(command) == -1) {
            this.skipDeviceParameters.push(command);
        }
    }

	request(question: string, param?: string): Promise<string> {
        var pjClass = PJLinkPlus.determineCommandClass(question);
        if (question == CMD_INPT) {
            pjClass = this._class;
        }
		var toSend = '%' + pjClass + question;
		toSend += ' ';
		toSend += (param === undefined) ? '?' : param;
		this.socket.sendText(this.authenticationSequence + toSend).catch(
			err=>{
                console.log('send failed: ' + err);
                this.sendFailed(err);
            }
		);
		const result = this.startRequest(toSend);
		result.finally(()=> {
			asap(()=> {	// Send further corrections soon, once this cycle settled
				this.sendCorrection();
			});
		});
		return result;
	}
    queryRequest(query: PJLinkQuery): Promise<string> {
        const toSend = query.encode();
        this.socket.sendText(this.authenticationSequence + toSend).catch(
			err=>{
                console.log('send failed: ' + err);
                this.sendFailed(err);
            }
		);
		const result = this.startRequest(toSend);
		result.finally(()=> {
			asap(()=> {	// Send further corrections soon, once this cycle settled
				this.sendCorrection();
			});
		});
		return result;
    }

    protected textReceived(text: string): void {
        // response == proof of healthy connection
        this._lastKnownConnectionDate = new Date();

		if (text.indexOf('PJLINK ') === 0) {	// Initial handshake sent spontaneously by projector
			if (this.unauthenticated = (text.indexOf('PJLINK 1') === 0)) {
                this.randomAuthSequence = text.substr('PJLINK 1'.length + 1);
                const sequence = this.randomAuthSequence + '' + this.pjlinkPassword;
                const md5Sequence = Md5.hashAsciiStr(sequence);
                if (LOG_DEBUG) console.log('\'' + sequence + '\' -> \'' + md5Sequence + '\' (' + md5Sequence.length + ')');
                this.authenticationSequence = md5Sequence as string;
                this.unauthenticated = false;
                this.connected = true;
                // this.errorMsg('PJLink authentication not supported \'' + this.randomAuthSequence + '\'');

            }
            else if (text.indexOf('PJLINK ' + ERR_A) === 0) {
                this.connected = false;
                this.unauthenticated = true;
                console.warn('authentication failed');
                this.requestFailure(text);
            }
			else {
                // this.getInitialState();	// Pick up initial state before doing anything else
                this.connected = true;
            }
			return;	// Initial handshake all done
		}
		// console.info("textReceived", text);

        text = PJLinkPlus.removeLeadingGarbageCharacters(text);

		// If no query in flight - log a warning and ignore data
		let currCmd = this.currCmd;
		if (!currCmd) {
			this.warnMsg("Unsolicited data", text);
			return;
		}

        // const response = PJLinkPlus.parseResponseMessage(text);

		currCmd = currCmd.substring(0, 6);	// Initial part %1XXXX of command
		if (currCmd) {
			const expectedResponse = currCmd + '=';
			if (text.indexOf(expectedResponse) === 0) {
				// Reply on expected command/question
				text = text.substr(expectedResponse.length);	// Trailing text
				var treatAsOk = text.indexOf('ERR') !== 0;
				if (!treatAsOk) {	// Got error from projector
					/*	Some errors are "terminal", meaning there's no reason to
						attempt the command again. For those, just log them then
						resolve the promise (albeit with the error string, not
						"OK". Other errors will cause the promise to be rejected,
						which will NOT accept the value attempting to be set,
						hence re-trying it soon again.
					 */
					switch (text) {
					case ERR_1:	// Undefined command - no need to re-try
						if (LOG_DEBUG) this.warnMsg("Undefined command", this.currCmd);
						treatAsOk = true;
						break;
					case ERR_2:	// Parameter not accepted (e.g., non-existing input)
						if (LOG_DEBUG) this.warnMsg("Bad command parameter", this.currCmd);
						treatAsOk = true;
						break;
                    case ERR_A: // bad authentication
                        this.connected = false;
                        this.unauthenticated = true;
                        this.warnMsg('authentication failed');
                        break;
                    case ERR_3:	// Bad time for this command (usually in standby or not yet awake)
						// console.info("PJLink ERR3");
						this.projectorBusy();
						// Deliberate fallthrough
					default:
						this.warnMsg('PJLink response', currCmd, text);
						break;
                    case ERR_4:
                        // this would mean that the projector is not able to operate properly
                        // this.errorMsg('projector not able to operate properly : ERR4 received');
                        this.abortPollDeviceStatus();
                        break;
					}
					if (!treatAsOk) {
                        this.requestFailure(text);
                    }

				}

				/*	Successful response ('OK' for commands, reply for query),
					or error deemed as "ok" above since there's nothing we can
					do about it anyway, and there's no point in rejecting and
					subsequently re-trying it.
				 */
				if (treatAsOk) {
                    this.requestSuccess(text);
                }
			} else {
                this.requestFailure("Expected reply " + expectedResponse + ", got " + text);
            }
		} else {
            this.warnMsg("Unexpected data", text);
        }

		this.requestFinished();
	}

    private projectorBusy() {
		if (!this.busyHoldoff) {
			this.busyHoldoff = wait(4000);
			this.busyHoldoff.then(() => this.busyHoldoff = undefined);
		}
	}

    static determineCommandClass (command : string) : number {
        if (!this.commandInformation[command]) console.log(command);
        return this.commandInformation[command].cmdClass;
    }
    static isCommandDynamic (command : string) : boolean {
        return this.commandInformation[command].dynamic;
    }
    static commandNeedsPower (command : string) : boolean {
        if (!this.commandInformation[command]) console.log(command);
        return this.commandInformation[command].needsPower;
    }

    private onConnectStateChange () {
        // either just connected or disconnected - in both cases proof of recent connection
        if (this.socket.connected) {
            this._lastKnownConnectionDateSet = true;
        }
        this._lastKnownConnectionDate = new Date();

    }

    @property("custom request response", true)
    public get customRequestResponse () : string {
        return this._customRequestResult;
    }

    @callable("Send custom request")
    public customRequest (question: string, param?: string) : Promise<void> {
        var request = this.request(question, param == "" ? undefined : param).then(
			reply => {
				this._customRequestResult = reply;
                this.changed('customRequestResponse');
			},
			error => {
				this._customRequestResult = "request failed: " + error;
			}
		);
        return request;
    }

    static parseResolution (reply : string) : Resolution | null {
        var parts : string[] = reply.split(RESOLUTION_SPLIT);
        if (parts.length == 2) {
            var resolution : Resolution = new Resolution(
                parseInt(parts[0]),
                parseInt(parts[1])
            );
            return resolution;
        }
        return null;
    }
    /** Strip off any leading garbage characters seen occasionally, up to expected % */
    static removeLeadingGarbageCharacters (text: string) : string {
        const msgStart = text.indexOf('%');
		if (msgStart > 0) {
            return text.substring(msgStart);
        }
        return text;
    }
    static parseResponseMessage (text: string) : PJLinkResponse | null {
        text = this.removeLeadingGarbageCharacters(text);
        if (text.length < 8) return null;
        // verify leading %
        if (text[0] != '%') return null;
        // extract class, command, and separator
        const separator = text.substr(6, 1);
        if (separator != SEPARATOR_RESPONSE) return null;
        const message : PJLinkResponse = new PJLinkResponse (
            parseInt(text[1]),
            text.substr(2, 4),
            text.substr(7)
        );
        return message;
    }
}
class StringState extends State<string> {
	correct(drvr: NetworkProjector): Promise<string> {
		return this.correct2(drvr, this.wanted);
	}
}
interface Dictionary<Group> {
    [label: string]: Group;
}
interface NumDict<Group> {
    [label: number]: Group;
}
interface CommandInfo {
    dynamic: boolean,
    cmdClass: number,
    read: boolean,
    write: boolean,
    needsPower: boolean
}
interface CommandReply {
    reply: string,
}
class PJLinkMessage {
    cmdClass: number;
    command: string;
    separator: string;
    value: string;
    constructor (cmdClass: number, command: string, separator: string, value: string) {
        this.cmdClass = cmdClass;
        this.command = command;
        this.separator = separator;
        this.value = value;
    }
    public encode () : string {
        return '%' + this.cmdClass + this.command + this.separator + this.value;
    }
}
class PJLinkQuery extends PJLinkMessage {
    constructor (cmdClass: number, command: string, value: string = '') {
        super(cmdClass, command, SEPARATOR_QUERY, value);
    }
}
class PJLinkInstruction extends  PJLinkMessage {
    constructor (cmdClass: number, command: string, value: string) {
        super(cmdClass, command, SEPARATOR_INSTRUCTION, value);
    }
}
class PJLinkResponse extends PJLinkMessage {
    constructor (cmdClass: number, command: string, value: string) {
        super(cmdClass, command, SEPARATOR_RESPONSE, value);
    }
}
interface InputTypeInfo {
    label: string,
    sourceIDs: string[]
}
class Resolution {
    public readonly horizontal : number;
    public readonly vertical : number;
    constructor (h: number, v: number) {
        this.horizontal = h;
        this.vertical = v;
    }
    toString () : string {
        return this.horizontal + 'x' + this.vertical;
    }
}
class PJLinkConfiguration {
    public password: string = PJLINK_PASSWORD;
    toJSON () : string {
        const json =
        '{\n' +
        '    "password" : "' + this.password + '"\n' +
        '}';
        return json;
    }
}
