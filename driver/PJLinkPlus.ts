/*
 * Created 2018 by Samuel Walz
 */
import {NetworkTCP} from "system/Network";
import {PJLink} from "driver/PJLink";
import {BoolState, NetworkProjector, NumState} from "driver/NetworkProjector";
import * as Meta from "system_lib/Metadata";

/*
 * projector commands
 */
 /* read / write */
/** Power status / control (R/W) */               const CMD_POWR = 'POWR';
/** Input switch (R/W) */                         const CMD_INPT = 'INPT';
/** Mute / Mute status (R/W)  */                  const CMD_AVMT = 'AVMT';
/** Freeze / Freeze status (R/W) */               const CMD_FREZ = 'FREZ';
/* read only */
/** Error status (RO) */                          const CMD_ERST = 'ERST';
/** Lamp number / lighting hour (RO) */           const CMD_LAMP = 'LAMP';
/** Input toggling list (RO) */                   const CMD_INST = 'INST';
/** Projector/Display name (RO) */                const CMD_NAME = 'NAME';
/** Manufacture name information (RO) */          const CMD_INF1 = 'INF1';
/** Product name information (RO) */              const CMD_INF2 = 'INF2';
/** Other information (RO) */                     const CMD_INFO = 'INFO';
/** Class information (RO) */                     const CMD_CLSS = 'CLSS';
/** Serial number (RO) */                         const CMD_SNUM = 'SNUM';
/** Software version (RO) */                      const CMD_SVER = 'SVER';
/** Input terminal name (RO) */                   const CMD_INNM = 'INNM';
/** Input resolution (RO) */                      const CMD_IRES = 'IRES';
/** Recommended resolution (RO) */                const CMD_RRES = 'RRES';
/** Filter usage time (RO) */                     const CMD_FILT = 'FILT';
/** Lamp replacement model number (RO) */         const CMD_RLMP = 'RLMP';
/** Filter replacement model number (RO) */       const CMD_RFIL = 'RFIL';
/* write only */
/** Speaker volume adjustment (write only) */     const CMD_SVOL = 'SVOL';
/** Microphone volume adjustment (write only) */  const CMD_MVOL = 'MVOL';

/**
 Manage a PJLink projector, accessed through a provided NetworkTCPDevice connection.
 Extended version.
 */
@Meta.driver('NetworkTCP', { port: 4352 })
export class PJLinkPlus extends PJLink {

    private wantedDeviceParameters = [
        CMD_POWR,
        CMD_ERST,
        CMD_LAMP,
        CMD_NAME,
        CMD_INF1,
        CMD_INF2,
        CMD_INFO
    ];
    private _lineBreak = '\n';

    private fetchingDeviceInfo: Promise<void>;
    private fetchDeviceInfoResolver: (value?: any) => void;

    // power related
    private _powerStatus = 0;
    private _isOff = false;
    private _isOn = false;
    private _isCooling = false;
    private _isWarmingUp = false;
    // various information
    private _name : string;
    private _manufactureName : string;
    private _productName : string;
    private _otherInformation : string;
    // lamp information
    private _lampCount = 0;
    private _lampOneHours = 0;
    private _lampTwoHours = 0;
    private _lampThreeHours = 0;
    private _lampFourHours = 0;
    private _lampOneActive = false;
    private _lampTwoActive = false;
    private _lampThreeActive = false;
    private _lampFourActive = false;
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

    private _currentParameterFetchList = [];
    private _currentParameter : string;

    private _customRequestResult : string;

	constructor(socket: NetworkTCP) {
		super(socket);
	}

    @Meta.callable("Refresh device information")
    public fetchDeviceInfo () : Promise<void> {
        if (!this.fetchingDeviceInfo) {
            this.fetchingDeviceInfo = new Promise<void>((resolve, reject) => {
                this.fetchDeviceInfoResolver = resolve;
                wait(30000).then(()=> {
                    reject("Timeout");
                    delete this.fetchDeviceInfo;
                    delete this.fetchDeviceInfoResolver;
                });
            });
        }
        this.fetchDeviceInformation(this.wantedDeviceParameters);
        return this.fetchingDeviceInfo;
    }

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

    @Meta.property("Projector/Display name (NAME)")
    public get name () : string {
        return this._name;
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

    @Meta.property("Detailed device status report (human readable)")
    public get detailedStatusReport () : string {
        return 'Device: ' + this._manufactureName + ' ' + this._productName + ' ' +  this._name + this._lineBreak +
            'Power status: ' + this.translatePowerCode(this._powerStatus) + this._lineBreak +
            'Error status: ' + this._lineBreak +
            'Fan: ' + this.translateErrorCode(this._errorStatusFan) + this._lineBreak +
            'Lamp: ' + this.translateErrorCode(this._errorStatusLamp) + this._lineBreak +
            'Temperature: ' + this.translateErrorCode(this._errorStatusTemperature) + this._lineBreak +
            'Cover open: ' + this.translateErrorCode(this._errorStatusCoverOpen) + this._lineBreak +
            'Filter: ' + this.translateErrorCode(this._errorStatusFilter) + this._lineBreak +
            'Other: ' + this.translateErrorCode(this._errorStatusOther) + this._lineBreak +
            (this._lampCount > 0 ? 'Lamp status: ' + this._lineBreak : '') +
            (this._lampCount > 0 ? 'Lamp one: ' + (this._lampOneActive ? 'on' : 'off') + ', ' + this._lampOneHours + ' lighting hours' + this._lineBreak : '') +
            (this._lampCount > 1 ? 'Lamp two: ' + (this._lampTwoActive ? 'on' : 'off') + ', ' + this._lampTwoHours + ' lighting hours' + this._lineBreak : '') +
            (this._lampCount > 2 ? 'Lamp three: ' + (this._lampThreeActive ? 'on' : 'off') + ', ' + this._lampThreeHours + ' lighting hours' + this._lineBreak : '') +
            (this._lampCount > 3 ? 'Lamp four: ' + (this._lampFourActive ? 'on' : 'off') + ', ' + this._lampFourHours + ' lighting hours' + this._lineBreak : '');
    }

    private translateErrorCode (code : number) : string {
        switch (code) {
            case 0:
                return 'No error detected (or not supported)';
            case 1:
                return 'Warning';
            case 3:
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

    private fetchDeviceInformation (wantedInfo : Array<string>) : void {
        this._currentParameterFetchList = wantedInfo.slice();
        this.fetchInfoLoop();
    }
    private fetchInfoLoop () : void {
        if (this._currentParameterFetchList.length > 0) {
            this._currentParameter = this._currentParameterFetchList.pop();

            this.request(this._currentParameter).then(
                reply => {
                    this.processInfoQueryReply(this._currentParameter, reply);
                    this.fetchInfoLoop();
                },
                error => {
                    this.fetchInfoLoop();
                }
            );
        } else {
            this.fetchInfoResolve();
        }
    }
    private processInfoQueryReply (command : string, reply : string) {
        switch (command) {
            case CMD_POWR:
                var newPowerStatus = parseInt(reply);
                if (this._powerStatus != newPowerStatus) {
                    this._powerStatus = newPowerStatus;
                    this.changed('powerStatus');
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
                        this['_errorStatus' + errorNames[0]] = list[i];
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
                var lampNames = ['One', 'Two', 'Three', 'Four'];
                var lampData = reply.split(' ');
                this._lampCount = lampData.length / 2;
                for (let i = 0; i < this._lampCount; i++) {
                    console.warn(i + ' lamp');
                    var newHours = parseInt(lampData[i * 2]);
                    var newActive = parseInt(lampData[i * 2 + 1]) == 1;
                    if (this['_lamp' + lampNames[i] + 'Hours'] != newHours) {
                        this['_lamp' + lampNames[i] + 'Hours'] = newHours;
                        this.changed('lamp' + lampNames[i] + 'Hours');
                    }
                    if (this['_lamp' + lampNames[i] + 'Active'] != newActive) {
                        this['_lamp' + lampNames[i] + 'Active'] = newActive;
                        this.changed('lamp' + lampNames[i] + 'Active');
                    }
                }
                break;
            case CMD_INST:
                break;
            case CMD_NAME:
                this._name = reply;
                break;
            case CMD_INF1:
                this._manufactureName = reply;
                break;
            case CMD_INF2:
                this._productName = reply;
                break;
            case CMD_INFO:
                this._otherInformation = reply;
                break;
            case CMD_CLSS:
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
                break;
            case CMD_RLMP:
                break;
            case CMD_RFIL:
                break;
            case CMD_FREZ:
                break;
        }
    }
    private fetchInfoResolve () : void {
        if (this.fetchDeviceInfoResolver) {
            this.fetchDeviceInfoResolver();
            console.info("got device info");
            delete this.fetchingDeviceInfo;
            delete this.fetchDeviceInfoResolver;
        }
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
			},
			error => {
				this._customRequestResult = "request failed: " + error;
			}
		);
        return request;
    }


}
