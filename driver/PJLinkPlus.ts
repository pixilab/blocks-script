/*
 * Created 2018 by Samuel Walz
 * Version 2.0b
 * - now supports class 2 commands
 */
import {NetworkTCP} from "system/Network";
// import {PJLink} from "driver/PJLink";
import {NetworkProjector, State, BoolState, NumState} from "driver/NetworkProjector";
import * as Meta from "system_lib/Metadata";

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
/** automatically fetch device info on startup */ const FETCH_INFO_ON_STARTUP = true;

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

/**
 Manage a PJLink projector, accessed through a provided NetworkTCPDevice connection.
 Extended version.
 */
@Meta.driver('NetworkTCP', { port: 4352 })
export class PJLinkPlus extends NetworkProjector {

    // parameters to request when fetching device info
    private wantedDeviceParameters : string[] = [
        CMD_POWR,
        CMD_ERST,
        CMD_CLSS,
        CMD_AVMT,
        CMD_LAMP,
        CMD_NAME,
        CMD_INF1,
        CMD_INF2,
        CMD_INFO,
        CMD_SNUM,
        CMD_SVER,
        CMD_RLMP,
        CMD_RFIL,
        CMD_IRES,
        CMD_RRES,
        CMD_FILT,
    ];
    private skipDeviceParameters : string[] = [];
    // line break for e.g. detailed status report
    private _lineBreak : string = '\n';

    // parameters to request when polling the device
    private devicePollParameters : string[] = [
        CMD_CLSS,
        CMD_ERST,
        CMD_POWR,
        CMD_INPT,
    ];

    // from original PJLink implementation by Mike
    private unauthenticated: boolean;	// True if projector requires authentication
    private busyHoldoff?: CancelablePromise<void>;	// See projectorBusy()
    // private recentCmdHoldoff?: CancelablePromise<void>;	// See sentCommand()

    private statusPoller: CancelablePromise<void>;

    private fetchingDeviceInfo: Promise<void>;
    private fetchDeviceInfoResolver: (value?: any) => void;
    private delayedDeviceInfoFetch: CancelablePromise<void>;
    private static delayedFetchInterval: number = 10000;
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
    private _inputSource: string = '1';
    private _input: StringState;
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
        [CMD_ERST] : {dynamic: true,  cmdClass: 1, read: true,  write: false, needsPower: true },
        [CMD_LAMP] : {dynamic: true,  cmdClass: 1, read: true,  write: false, needsPower: false},
        [CMD_INST] : {dynamic: true,  cmdClass: 2, read: true,  write: false, needsPower: false},
        [CMD_NAME] : {dynamic: false, cmdClass: 1, read: true,  write: false, needsPower: false},
        [CMD_INF1] : {dynamic: false, cmdClass: 1, read: true,  write: false, needsPower: false},
        [CMD_INF2] : {dynamic: false, cmdClass: 1, read: true,  write: false, needsPower: false},
        [CMD_INFO] : {dynamic: false, cmdClass: 1, read: true,  write: false, needsPower: false},
        [CMD_CLSS] : {dynamic: false, cmdClass: 1, read: true,  write: false, needsPower: false},
        [CMD_SNUM] : {dynamic: false, cmdClass: 2, read: true,  write: false, needsPower: false},
        [CMD_SVER] : {dynamic: false, cmdClass: 2, read: true,  write: false, needsPower: false},
        [CMD_INNM] : {dynamic: true,  cmdClass: 2, read: true,  write: false, needsPower: false},
        [CMD_IRES] : {dynamic: true,  cmdClass: 2, read: true,  write: false, needsPower: true },
        [CMD_RRES] : {dynamic: true,  cmdClass: 2, read: true,  write: false, needsPower: false},
        [CMD_FILT] : {dynamic: true,  cmdClass: 2, read: true,  write: false, needsPower: false},
        [CMD_RLMP] : {dynamic: false, cmdClass: 2, read: true,  write: false, needsPower: false},
        [CMD_RFIL] : {dynamic: false, cmdClass: 2, read: true,  write: false, needsPower: false},
        [CMD_SVOL] : {dynamic: true,  cmdClass: 2, read: false, write: true,  needsPower: true },
        [CMD_MVOL] : {dynamic: true,  cmdClass: 2, read: false, write: true,  needsPower: true },
        [CMD_FREZ] : {dynamic: true,  cmdClass: 2, read: true,  write: true,  needsPower: true },
    }

	constructor(socket: NetworkTCP) {
		super(socket);
        this.addState(this._power = new BoolState('POWR', 'power'));
        this.addState(this._input = new StringState(CMD_INPT, 'input', () => this._power.getCurrent()));
		this._mute = new NumState(
			CMD_AVMT, 'mute',
			MUTE_MIN, MUTE_MAX,
            () => this._power.getCurrent()
		);
        this.addState(this._freeze = new BoolState(CMD_FREZ, 'freeze', () => this._power.getCurrent()));
		/*	Set some reasonable default value to not return undefined, as the mute value
			isn't read back from the projector.
		 */
        this.addState(this._mute);
		this._mute.set(MUTE_MIN);

        socket.subscribe('connect', (_sender, _message)=> {
			this.onConnectStateChange();
		});

        this.pollDeviceStatus();
        if (FETCH_INFO_ON_STARTUP) {
            wait(3000).then(()=> {
                this.fetchDeviceInfo();
            });
        }
        this.poll();
        this.attemptConnect();
	}



    @Meta.callable("Refresh device information")
    public fetchDeviceInfo () : Promise<void> {
        var delay = this.connected ? 0 : (this.isOnline ? 5000 : 0);
        delay += this.socket.connected ? 0 : (this.isOnline ? 25000 : 0);
        if (!this.fetchingDeviceInfo) {
            this.fetchingDeviceInfo = new Promise<void>((resolve, reject) => {
                this.fetchDeviceInfoResolver = resolve;
                if (this.isOnline) {
                    wait(5000 + delay).then(()=> {
                        reject("Timeout");
                        delete this.fetchingDeviceInfo;
                        delete this.fetchDeviceInfoResolver;
                    });
                } else {
                    wait(100).then(() => {
                        reject('Projector/Display seems offline');
                        delete this.fetchingDeviceInfo;
                        delete this.fetchDeviceInfoResolver;
                    });
                }
            });
        }
        this.delayedInfoFetch(delay);
        return this.fetchingDeviceInfo;
    }
    private delayedInfoFetch (countdown : number) {
        if (this.socket.connected && this.connected) {
            this.fetchDeviceInformation(this.wantedDeviceParameters);
        } else if (countdown < 0) {
            // nothing
        } else {
            this.delayedDeviceInfoFetch = wait(PJLinkPlus.delayedFetchInterval);
            this.delayedDeviceInfoFetch.then(() => {
                this.delayedInfoFetch(countdown - PJLinkPlus.delayedFetchInterval);
            });
        }
    }
    /* power status */
    @Meta.property("Power status (detailed: 0, 1, 2, 3 -> off, on, cooling, warming)")
    public get powerStatus() : number {
        return this._powerStatus;
    }
    @Meta.property("Is device off?")
    public get isOff() : boolean {
        return this._isOff;
    }
    @Meta.property("Is device on?")
    public get isOn() : boolean {
        return this._isOn;
    }
    @Meta.property("Is device cooling?")
    public get isCooling() : boolean {
        return this._isCooling;
    }
    @Meta.property("Is device warming up?")
    public get isWarmingUp() : boolean {
        return this._isWarmingUp;
    }

    /* input */
    @Meta.property('current input')
    public set input(value: string) {
        if (value.length != 2) return;
        this.setInput(parseInt(value[0]), value[1]);
    }
    public get input() : string {
        return this._input.get();
    }
    @Meta.property('select RGB input')
    public set inputRGB(value: string) {
        this.setInput(INPT_RGB, value);
    }
    public get inputRGB() : string {
        return this._inputType == INPT_RGB ? this._inputSource : '-';
    }
    @Meta.property('select VIDEO input')
    public set inputVideo(value: string) {
        this.setInput(INPT_VIDEO, value);
    }
    public get inputVideo () : string {
        return this._inputType == INPT_VIDEO ? this._inputSource : '-';
    }
    @Meta.property('select DIGITAL input')
    public set inputDigital(value: string) {
        this.setInput(INPT_DIGITAL, value);
    }
    public get inputDigital () : string {
        return this._inputType == INPT_DIGITAL ? this._inputSource : '-';
    }
    @Meta.property('select STORAGE input')
    public set inputStorage(value: string) {
        this.setInput(INPT_STORAGE, value);
    }
    public get inputStorage () : string {
        return this._inputType == INPT_STORAGE ? this._inputSource : '-';
    }
    @Meta.property('select NETWORK input')
    public set inputNetwork(value: string) {
        this.setInput(INPT_NETWORK, value);
    }
    public get inputNetwork () : string {
        return this._inputType == INPT_NETWORK ? this._inputSource : '-';
    }
    @Meta.property('select INTERNAL input')
    public set inputInternal(value: string) {
        this.setInput(INPT_INTERNAL, value);
    }
    public get inputInternal () : string {
        return this._inputType == INPT_INTERNAL ? this._inputSource : '-';
    }
    private setInput (type: number, id: string) : boolean {
        if (id.length != 1) return false;
        if (type < INPT_RGB || type > INPT_INTERNAL) return false;
        var nonNumberID = parseInt(id) === NaN;
        if (this._class == 2) {
            if (nonNumberID && !this.isValidLetter(id)) {
                console.log('not a valid letter or number');
                return false;
            }
        }
        else { // class is 1
            console.log('not a valid number');
            if (nonNumberID) return false;
        }
        this._inputType = type;
        this._inputSource = id;
        if (this._input.set(type + id)) {
            this.sendCorrection();
        }
        return true;
    }
    isValidLetter(str : string) {
        return str.length === 1 && str.match(/[A-Z]/);
    }

    /* audio / video mute */
    @Meta.property("Mute setting. (Video mute on/off: 11/10, Audio mute on/off: 21/20, A/V mute on/off: 31/30)")
	@Meta.min(MUTE_MIN)
	@Meta.max(MUTE_MAX)
	public set mute(value: number) {
		if (this._mute.set(value)) {
            this.sendCorrection();
        }
	}
	public get mute(): number {
		return this._mute.get();
	}
    @Meta.property("Mute audio")
    public set muteAudio (value: boolean) {
        this.mute = value ? 21 : 20;
    }
    public get muteAudio () : boolean {
        var currentValue = this._mute.get();
        return currentValue == 31 || currentValue == 21;
    }
    @Meta.property("Mute video")
    public set muteVideo (value: boolean) {
        this.mute = value ? 11 : 10;
    }
    public get muteVideo () : boolean {
        var currentValue = this._mute.get();
        return currentValue == 31 || currentValue == 11;
    }

    /* resolution */
    @Meta.property('Input resolution (' + CMD_IRES + ')')
    public get inputResolution () : string {
        if (this._inputResolution) {
            return this._inputResolution.toString();
        }
        return 'undefined';
    }
    @Meta.property('Recommended resolution (' + CMD_RRES + ')')
    public get recommendedResolution () : string {
        if (this._recommendedResolution) {
            return this._recommendedResolution.toString();
        }
        return 'undefined';
    }

    /* various information */
    @Meta.property('Projector/Display name (' + CMD_NAME + ')')
    public get deviceName () : string {
        return this._deviceName;
    }
    @Meta.property('Manufacture name (' + CMD_INF1 + ')')
    public get manufactureName () : string {
        return this._manufactureName;
    }
    @Meta.property('Product name (' + CMD_INF2 + ')')
    public get productName () : string {
        return this._productName;
    }
    @Meta.property('Other information (' + CMD_INFO + ')')
    public get otherInformation () : string {
        return this._otherInformation;
    }
    @Meta.property('Serial number (' + CMD_SNUM + ')')
    public get serialNumber () : string {
        return this._serialNumber;
    }
    @Meta.property('Software version (' + CMD_SVER + ')')
    public get softwareVersion () : string {
        return this._softwareVersion;
    }

    /* lamp properties */
    @Meta.property("Lamp count")
    public get lampCount (): number {
        return this._lampCount;
    }
    @Meta.property("Lamp one: lighting hours")
    public get lampOneHours (): number {
        return this._lampOneHours;
    }
    @Meta.property("Lamp two: lighting hours")
    public get lampTwoHours (): number {
        return this._lampTwoHours;
    }
    @Meta.property("Lamp three: lighting hours")
    public get lampThreeHours (): number {
        return this._lampThreeHours;
    }
    @Meta.property("Lamp four: lighting hours")
    public get lampFourHours (): number {
        return this._lampFourHours;
    }
    @Meta.property("Lamp one: active")
    public get lampOneActive (): boolean {
        return this._lampOneActive;
    }
    @Meta.property("Lamp one: active")
    public get lampTwoActive (): boolean {
        return this._lampTwoActive;
    }
    @Meta.property("Lamp one: active")
    public get lampThreeActive (): boolean {
        return this._lampThreeActive;
    }
    @Meta.property("Lamp one: active")
    public get lampFourActive (): boolean {
        return this._lampFourActive;
    }
    @Meta.property('Lamp replacement model number (' + CMD_RLMP + ')')
    public get lampReplacementModelNumber () : string {
        return this._lampReplacementModelNumber;
    }

    /* filter properties */
    @Meta.property("Has filter?")
    public get hasFilter() : boolean {
        return this._hasFilter;
    }
    @Meta.property("Filter usage time (hours)")
    public get filterUsageTime () : number {
        return this._filterUsageTime;
    }
    @Meta.property('Filter replacement model number (' + CMD_RFIL + ')')
    public get filterReplacementModelNumber () : string {
        return this._filterReplacementModelNumber;
    }

    /* error properties*/
    @Meta.property("Error status (ERST)")
    public get errorStatus (): string {
        return this._errorStatus;
    }
    @Meta.property("Error reported?")
    public get hasError () : boolean {
        return this._hasError;
    }
    @Meta.property("Warning reported?")
    public get hasWarning () : boolean {
        return this._hasWarning;
    }
    @Meta.property("Problem reported?")
    public get hasProblem () : boolean {
        return this._hasError || this._hasWarning;
    }

    /* special properties */
    @Meta.property("Is Projector/Display online? (Guesstimate: PJLink connection drops every now and then)")
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

    @Meta.property("Detailed device status report (human readable)")
    public get detailedStatusReport () : string {
        if (this._infoFetchDate === undefined) {
            return 'call "fetchDeviceInfo" at least once before requesting "detailedStatusReport"';
        }
        return 'Device: ' + this._manufactureName + ' ' + this._productName + ' ' +  this._deviceName + this._lineBreak +
            'Power status: ' + this.translatePowerCode(this._powerStatus) + this._lineBreak +
            'Error status: (' + this._errorStatus + ')' + this._lineBreak +
            'Fan: ' + this.translateErrorCode(this._errorStatusFan) + this._lineBreak +
            'Lamp' + (this._lampCount > 1 ? 's' : '') + ': ' + (this._hasLamps !== undefined && this._hasLamps ? this.translateErrorCode(this._errorStatusLamp) : '[no lamps]') + this._lineBreak +
            'Temperature: ' + this.translateErrorCode(this._errorStatusTemperature) + this._lineBreak +
            'Cover open: ' + this.translateErrorCode(this._errorStatusCoverOpen) + this._lineBreak +
            'Filter: ' + (this._hasFilter !== undefined && this._hasFilter ? this.translateErrorCode(this._errorStatusFilter) : '[no filter]') + this._lineBreak +
            (this._filterReplacementModelNumber ? 'Filter replacement model number: ' + this._filterReplacementModelNumber + this._lineBreak : '') +
            'Other: ' + this.translateErrorCode(this._errorStatusOther) + this._lineBreak +
            (this._lampCount > 0 ? 'Lamp status: ' + this._lineBreak : '') +
            (this._lampCount > 0 ? 'Lamp one: ' + (this._lampOneActive ? 'on' : 'off') + ', ' + this._lampOneHours + ' lighting hours' + this._lineBreak : '') +
            (this._lampCount > 1 ? 'Lamp two: ' + (this._lampTwoActive ? 'on' : 'off') + ', ' + this._lampTwoHours + ' lighting hours' + this._lineBreak : '') +
            (this._lampCount > 2 ? 'Lamp three: ' + (this._lampThreeActive ? 'on' : 'off') + ', ' + this._lampThreeHours + ' lighting hours' + this._lineBreak : '') +
            (this._lampCount > 3 ? 'Lamp four: ' + (this._lampFourActive ? 'on' : 'off') + ', ' + this._lampFourHours + ' lighting hours' + this._lineBreak : '') +
            (this._lampReplacementModelNumber ? 'Lamp replacement model number: ' + this._lampReplacementModelNumber + this._lineBreak : '') +
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
        while ((parameter === undefined ||
            this.skipDeviceParameters.indexOf(parameter) > -1) &&
            this._currentParameterFetchList.length > 0) {
            parameter = this._currentParameterFetchList.pop();
        }
        return parameter;
    }

    private fetchDeviceInformation (wantedInfo : string[]) : void {
        this._currentParameterFetchList = wantedInfo.slice();
        this.fetchInfoLoop();
    }
    private fetchInfoLoop () : void {
        this._currentParameter = this.nextParameterToFetch();
        if (this._currentParameter !== undefined) {
            if (!this._power.getCurrent() && PJLinkPlus.commandNeedsPower(this._currentParameter))
            {
                this.fetchInfoLoop();
                return;
            }
            this.request(this._currentParameter).then(
                reply => {
                    if (reply != ERR_1) {
                        this.processInfoQueryReply(this._currentParameter, reply);
                        // successful fetch and parameter is not dynamic? skip next time!
                        if (!PJLinkPlus.isCommandDynamic(this._currentParameter)) {
                            this.addCommandToSkip(this._currentParameter);
                        }
                    } else {
                        // PJLink perceives ERR_1 and ERR_2 as successful queries
                        this.processInfoQueryError(this._currentParameter, reply);
                    }
                    this.fetchInfoLoop();
                },
                error => {
                    this.processInfoQueryError(this._currentParameter, error);
                    this.fetchInfoLoop();
                }
            );
        } else {
            this.fetchInfoResolve();
        }
    }
    private fetchInfoResolve () : void {
        if (this.fetchDeviceInfoResolver) {
            this.fetchDeviceInfoResolver(true);
            this._infoFetchDate = new Date();
            // console.info("got device info");
            delete this.fetchingDeviceInfo;
            delete this.fetchDeviceInfoResolver;
        }
    }
    private pollDeviceStatus() {
        // console.warn('pollDeviceStatus');
        // status interval minus up to 10% (to create some variation)
		this.statusPoller = wait(STATUS_POLL_INTERVAL - Math.random() * (STATUS_POLL_INTERVAL * 0.1));
		this.statusPoller.then(()=> {
			if (this.socket.connected &&
                this.connected) {
                this.fetchDeviceInformation(this.devicePollParameters);
			}
			if (!this.discarded) {
                // Keep polling
                this.pollDeviceStatus();
            }
		})
	}

    private processInfoQueryError (command : string, error : string) {
        switch (command) {
            case CMD_LAMP:
                if (error == ERR_1) {
                    this._hasLamps = false;
                    this.skipDeviceParameters.push(CMD_LAMP);
                }
                break;
            case CMD_RLMP:
                if (error == ERR_1) {
                    this.skipDeviceParameters.push(CMD_RLMP);
                }
            case CMD_FILT:
                if (error == ERR_1) {
                    this._hasFilter = false;
                    this.skipDeviceParameters.push(CMD_FILT);
                }
                break;
        }
    }
    private processInfoQueryReply (command : string, reply : string) {
        switch (command) {
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
						(<any>this)['_errorStatus' + errorNames[0]] = list[i];
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
                var receivedInputTerminalName = reply;
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
		this.socket.sendText(toSend).catch(
			err=>this.sendFailed(err)
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
		if (text.indexOf('PJLINK ') === 0) {	// Initial handshake sent spontaneously by projector
			if (this.unauthenticated = (text.indexOf('PJLINK 1') === 0)) {
                this.errorMsg("PJLink authentication not supported");
            }
			else {
                // this.getInitialState();	// Pick up initial state before doing anything else
                this.connected = true;
            }
			return;	// Initial handshake all done
		}

		// console.info("textReceived", text);

		// Strip ogg any leading garbage characters seen occasionally, up to expected %
		const msgStart = text.indexOf('%');
		if (msgStart > 0)
			text = text.substring(msgStart);

		// If no query in flight - log a warning and ignore data
		let currCmd = this.currCmd;
		if (!currCmd) {
			this.warnMsg("Unsolicited data", text);
			return;
		}

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
						this.errorMsg("Undefined command", this.currCmd);
						treatAsOk = true;
						break;
					case ERR_2:	// Parameter not accepted (e.g., non-existing input)
						this.errorMsg("Bad command parameter", this.currCmd);
						treatAsOk = true;
						break;
					case ERR_3:	// Bad time for this command (usually in standby or not yet awake)
						// console.info("PJLink ERR3");
						this.projectorBusy();
						// Deliberate fallthrough
					default:
						this.warnMsg("PJLink response", currCmd, text);
						break;
					}
					if (!treatAsOk)
						this.requestFailure(text);
				}

				/*	Successful response ('OK' for commands, reply for query),
					or error deemed as "ok" above since there's nothing we can
					do about it anyway, and there's no point in rejecting and
					subsequently re-trying it.
				 */
				if (treatAsOk)
					this.requestSuccess(text);
			} else
				this.requestFailure("Expected reply " + expectedResponse + ", got " + text);
		} else
			this.warnMsg("Unexpected data", text);
		this.requestFinished();
	}
    // private getInitialState() {
	// 	this.connected = false;	// Mark me as not yet fully awake, to hold off commands
	// 	this.request('POWR').then(
	// 		reply => {
	// 			if (!this.inCmdHoldoff())
	// 				this._power.updateCurrent((parseInt(reply) & 1) != 0);
	// 			if (this._power.get()) // Power on - proceed quering input
	// 				this.getInputState();
	// 			else {
	// 				this.connected = true;	// Can't query input if off - skip this step
	// 				this.sendCorrection();
	// 			}
	// 		},
	// 		error => {
	// 			this.warnMsg("getInitialState POWR error - retry soon", error);
	// 			this.disconnectAndTryAgainSoon();	// Triggers a new cycle soon
	// 		}
	// 	);
	// }
    // private inCmdHoldoff() {
	// 	return this.recentCmdHoldoff
	// }
    // private getInputState(ignoreError?: boolean) {
	// 	this.request('INPT').then(
	// 		reply => {
	// 			if (!this.inCmdHoldoff())
	// 				this._input.updateCurrent(reply);
	// 			this.connected = true;
	// 			this.sendCorrection();
	// 		},
	// 		error => {
	// 			// May fail for "normal" reasons, eg, during power up/down
	// 			this.warnMsg("getInitialState INPT error", error);
	// 			if (!ignoreError) {
	// 				this.connected = true; // Allow things to proceed anyway
	// 				this.sendCorrection();
	// 			}
	// 		}
	// 	);
	// }

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

    @Meta.property("custom request response")
    public get customRequestResponse () : string {
        return this._customRequestResult;
    }

    @Meta.callable("Send custom request")
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


}
class StringState extends State<string> {
	correct(drvr: NetworkProjector): Promise<string> {
		return this.correct2(drvr, this.wanted);
	}
}
interface Dictionary<Group> {
    [label: string]: Group;
}
interface CommandInfo {
    dynamic: boolean,
    cmdClass: number,
    read: boolean,
    write: boolean,
    needsPower: boolean
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
