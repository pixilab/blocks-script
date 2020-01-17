/*
 * Created 2018 by Samuel Walz
 */
import {NetworkTCP} from "system/Network";
import {PJLink} from "driver/PJLink";
import {NumState} from "driver/NetworkProjector";
import * as Meta from "system_lib/Metadata";

/*
 * projector commands
 */
 /* read / write */
/** Power status / control (R/W) */               const CMD_POWR = 'POWR';  // class 1
/** Input switch (R/W) */                         const CMD_INPT = 'INPT';  // class 1
/** Mute / Mute status (R/W)  */                  const CMD_AVMT = 'AVMT';  // class 1
/** Freeze / Freeze status (R/W) */               const CMD_FREZ = 'FREZ';  // since PJLink 2.0 (class 2)
/* read only */
/** Error status (RO) */                          const CMD_ERST = 'ERST';  // class 1
/** Lamp number / lighting hour (RO) */           const CMD_LAMP = 'LAMP';  // class 1
/** Input toggling list (RO) */                   const CMD_INST = 'INST';  // since PJLink 2.0 (class 2)
/** Projector/Display name (RO) */                const CMD_NAME = 'NAME';  // class 1
/** Manufacture name information (RO) */          const CMD_INF1 = 'INF1';  // class 1
/** Product name information (RO) */              const CMD_INF2 = 'INF2';  // class 1
/** Other information (RO) */                     const CMD_INFO = 'INFO';  // class 1
/** Class information (RO) */                     const CMD_CLSS = 'CLSS';  // class 1
/** Serial number (RO) */                         const CMD_SNUM = 'SNUM';  // since PJLink 2.0 (class 2)
/** Software version (RO) */                      const CMD_SVER = 'SVER';  // since PJLink 2.0 (class 2)
/** Input terminal name (RO) */                   const CMD_INNM = 'INNM';  // since PJLink 2.0 (class 2)
/** Input resolution (RO) */                      const CMD_IRES = 'IRES';  // since PJLink 2.0 (class 2)
/** Recommended resolution (RO) */                const CMD_RRES = 'RRES';  // since PJLink 2.0 (class 2)
/** Filter usage time (RO) */                     const CMD_FILT = 'FILT';  // since PJLink 2.0 (class 2)
/** Lamp replacement model number (RO) */         const CMD_RLMP = 'RLMP';  // since PJLink 2.0 (class 2)
/** Filter replacement model number (RO) */       const CMD_RFIL = 'RFIL';  // since PJLink 2.0 (class 2)
/* write only */
/** Speaker volume adjustment (write only) */     const CMD_SVOL = 'SVOL';  // since PJLink 2.0 (class 2)
/** Microphone volume adjustment (write only) */  const CMD_MVOL = 'MVOL';  // since PJLink 2.0 (class 2)
/*
 * projector error codes
 */
/** Not supported / Not installed */              const ERR_1 = 'ERR1';
/** Out of parameter */                           const ERR_2 = 'ERR2';
/** Unavialable time for any reason */            const ERR_3 = 'ERR3';
/** Projector / Display failure */                const ERR_4 = 'ERR4';

/*
 * fixed parameters
 */
/** status poll interval in milliseconds */       const STATUS_POLL_INTERVAL = 20000;

/**
 Manage a PJLink projector, accessed through a provided NetworkTCPDevice connection.
 Extended version.
 */
@Meta.driver('NetworkTCP', { port: 4352 })
export class PJLinkPlus extends PJLink {

    // parameters to request when fetching device info
    private wantedDeviceParameters = [
        { cmd: CMD_POWR, dynamic: true },
        { cmd: CMD_ERST, dynamic: true },
        { cmd: CMD_CLSS, dynamic: false },
        { cmd: CMD_AVMT, dynamic: true },
        { cmd: CMD_LAMP, dynamic: true },
        { cmd: CMD_NAME, dynamic: false },
        { cmd: CMD_INF1, dynamic: false },
        { cmd: CMD_INF2, dynamic: false },
        { cmd: CMD_INFO, dynamic: false },
        { cmd: CMD_FILT, dynamic: true }
    ];
    private skipDeviceParameters: string[] = [];
    // line break for e.g. detailed status report
    private _lineBreak = '\n';

    // parameters to request when polling the device
    private devicePollParameters = [
        { cmd: CMD_POWR, dynamic: true },
        { cmd: CMD_ERST, dynamic: true }
    ];
    private statusPoller: CancelablePromise<void>;

    private fetchingDeviceInfo: Promise<void>;
    private fetchDeviceInfoResolver: (value?: any) => void;
    private delayedDeviceInfoFetch: CancelablePromise<void>;
    private static delayedFetchInterval = 10000;
    private _infoFetchDate : Date;
    private _lastKnownConnectionDate : Date;
    private _lastKnownConnectionDateSet = false;

    // power related
    private _powerStatus = 0;
    private _isOff = false;
    private _isOn = false;
    private _isCooling = false;
    private _isWarmingUp = false;
    // audio / video mute
    private readonly _mute : NumState;
    // various information
    private _deviceName : string;
    private _manufactureName : string;
    private _productName : string;
    private _otherInformation : string;
    private _class : number;
    // lamp information
    private _hasLamps : boolean;
    private _lampCount = 0;
    private _lampOneHours = 0;
    private _lampTwoHours = 0;
    private _lampThreeHours = 0;
    private _lampFourHours = 0;
    private _lampOneActive = false;
    private _lampTwoActive = false;
    private _lampThreeActive = false;
    private _lampFourActive = false;
    // filter information
    private _hasFilter : boolean;
    private _filterUsageTime = 0;
    // error / warning reated
    private _errorStatus = '000000';
    private _errorStatusFan = 0;
    private _errorStatusLamp = 0;
    private _errorStatusTemperature = 0;
    private _errorStatusCoverOpen = 0;
    private _errorStatusFilter = 0;
    private _errorStatusOther = 0;
    private _hasError = false;
    private _hasWarning = false;

    private _currentParameterFetchList: any = [];
    private _currentParameter : {cmd: string, dynamic: boolean};


    private _customRequestResult : string;

    private static kMinMute = 10;
	private static kMaxMute = 31;
	constructor(socket: NetworkTCP) {
		super(socket);
		this._mute = new NumState(
			'AVMT', 'mute',
			PJLinkPlus.kMinMute, PJLinkPlus.kMaxMute
		);
		/*	Set some reasonable default value to not return undefined, as the mute value
			isn't read back from the projector.
		 */
		this._mute.set(PJLinkPlus.kMinMute);
        this.addState(this._mute);
        socket.subscribe('connect', (sender, message)=> {
			this.onConnectStateChange();
		});

        this.pollDeviceStatus();
	}

    /**
	 * Set mute setting
	 */
	@Meta.property("Mute setting. (Video mute on/off: 11/10, Audio mute on/off: 21/20, A/V mute on/off: 31/30)")
	@Meta.min(PJLinkPlus.kMinMute)
	@Meta.max(PJLinkPlus.kMaxMute)
	public set mute(value: number) {
		if (this._mute.set(value))
			this.sendCorrection();
	}
    /**
	 Get current mute setting
	 */
	public get mute(): number {
		return this._mute.get();
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

    /* audio / video mute */
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

    /* various information */
    @Meta.property("Projector/Display name (NAME)")
    public get deviceName () : string {
        return this._deviceName;
    }
    @Meta.property("Manufacture name (INF1)")
    public get manufactureName () : string {
        return this._manufactureName;
    }
    @Meta.property("Product name (INF2)")
    public get productName () : string {
        return this._productName;
    }
    @Meta.property("Other information (INFO)")
    public get otherInformation () : string {
        return this._otherInformation;
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

    /* filter properties */
    @Meta.property("Has filter?")
    public get hasFilter() : boolean {
        return this._hasFilter;
    }
    @Meta.property("Filter usage time (hours)")
    public get filterUsageTime () : number {
        return this._filterUsageTime;
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
            'Other: ' + this.translateErrorCode(this._errorStatusOther) + this._lineBreak +
            (this._lampCount > 0 ? 'Lamp status: ' + this._lineBreak : '') +
            (this._lampCount > 0 ? 'Lamp one: ' + (this._lampOneActive ? 'on' : 'off') + ', ' + this._lampOneHours + ' lighting hours' + this._lineBreak : '') +
            (this._lampCount > 1 ? 'Lamp two: ' + (this._lampTwoActive ? 'on' : 'off') + ', ' + this._lampTwoHours + ' lighting hours' + this._lineBreak : '') +
            (this._lampCount > 2 ? 'Lamp three: ' + (this._lampThreeActive ? 'on' : 'off') + ', ' + this._lampThreeHours + ' lighting hours' + this._lineBreak : '') +
            (this._lampCount > 3 ? 'Lamp four: ' + (this._lampFourActive ? 'on' : 'off') + ', ' + this._lampFourHours + ' lighting hours' + this._lineBreak : '') +
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

    private nextParameterToFetch () : {cmd: string, dynamic: boolean} {
        var parameter : {cmd: string, dynamic: boolean};
        while ((parameter === undefined ||
            this.skipDeviceParameters.indexOf(parameter.cmd) > -1) &&
            this._currentParameterFetchList.length > 0) {
            parameter = this._currentParameterFetchList.pop();
        }
        return parameter;
    }

    private fetchDeviceInformation (wantedInfo : Array<{cmd: string}>) : void {
        this._currentParameterFetchList = wantedInfo.slice();
        this.fetchInfoLoop();
    }
    private fetchInfoLoop () : void {
        this._currentParameter = this.nextParameterToFetch();
        if (this._currentParameter !== undefined) {
            this.request(this._currentParameter.cmd).then(
                reply => {
                    if (reply != ERR_1) {
                        this.processInfoQueryReply(this._currentParameter.cmd, reply);
                        // successful fetch and parameter is not dynamic? skip next time!
                        if (!this._currentParameter.dynamic) {
                            this.skipDeviceParameters.push(this._currentParameter.cmd);
                        }
                    } else {
                        // PJLink perceives ERR_1 and ERR_2 as successful queries
                        this.processInfoQueryError(this._currentParameter.cmd, reply);
                    }
                    this.fetchInfoLoop();
                },
                error => {
                    this.processInfoQueryError(this._currentParameter.cmd, error);
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
                if (this._class == 1) {
                    // skip unsupported parameters (since we now know the PJLink class)
                    this.skipDeviceParameters.push(CMD_INST);
                    this.skipDeviceParameters.push(CMD_SNUM);
                    this.skipDeviceParameters.push(CMD_SVER);
                    this.skipDeviceParameters.push(CMD_INNM);
                    this.skipDeviceParameters.push(CMD_IRES);
                    this.skipDeviceParameters.push(CMD_RRES);
                    this.skipDeviceParameters.push(CMD_FILT);
                    this.skipDeviceParameters.push(CMD_RLMP);
                    this.skipDeviceParameters.push(CMD_RFIL);
                    this.skipDeviceParameters.push(CMD_SVOL);
                    this.skipDeviceParameters.push(CMD_MVOL);
                    this.skipDeviceParameters.push(CMD_FREZ);
                }
                break;
            case CMD_SNUM:
                break;
            case CMD_SVER:
                break;
            case CMD_INNM:
                break;
            case CMD_IRES:
                break;
            case CMD_RRES:
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
                break;
            case CMD_RFIL:
                break;
            case CMD_FREZ:
                break;
        }
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


}
