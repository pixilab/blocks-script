"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthemMRX_x20 = void 0;
const Metadata_1 = require("../system_lib/Metadata");
const NetworkProjector_1 = require("../driver/NetworkProjector");
const ZONE_ALL = 'Z0';
const ZONE_MAIN = 'Z1';
const ZONE_2 = 'Z2';
const ZONE_3 = 'Z3';
const CMD_FPB = 'FPB';
const CMD_SIP = 'SIP';
const CMD_MUT = 'MUT';
const CMD_POW = 'POW';
const CMD_VOL = 'VOL';
const CMD_IDQ = 'IDQ';
const CMD_IDM = 'IDM';
const CMD_IDS = 'IDS';
const CMD_IDR = 'IDR';
const CMD_IDB = 'IDB';
const CMD_IDH = 'IDH';
const CMD_IDN = 'IDN';
const CMD_MSG = 'MSG';
const ERROR_CANNOT_BE_EXECUTED_PREFIX = '!E';
const ERROR_OUT_OF_RANGE_PREFIX = '!R';
const ERROR_INVALID_COMMAND_PREFIX = '!I';
const ERROR_ZONE_OFF_PREFIX = '!Z';
const VOL_MIN = -90;
const VOL_MAX = 10;
const LOG_DEBUG = true;
let AnthemMRX_x20 = class AnthemMRX_x20 extends NetworkProjector_1.NetworkProjector {
    busyHoldoff;
    recentCmdHoldoff;
    _fpb;
    _mut;
    _powerAll;
    _powZone2;
    _powZone3;
    powerZone2;
    powerZone3;
    _sip;
    _vol;
    staticInfo;
    getToKnowRunning;
    constructor(socket) {
        socket.setReceiveFraming(';');
        super(socket);
        this.staticInfo = {};
        this.addState(this._power = new NetworkProjector_1.BoolState(ZONE_MAIN + CMD_POW, 'power'));
        this.addState(this._fpb = new NetworkProjector_1.NumState(CMD_FPB, 'frontPanelBrightness', 0, 3));
        this.addState(this._mut = new NetworkProjector_1.BoolState(ZONE_MAIN + CMD_MUT, 'mute'));
        this.addState(this._sip = new NetworkProjector_1.BoolState(CMD_SIP, 'standbyIPControl'));
        this.addState(this._vol = new SignedNumberState(ZONE_MAIN + CMD_VOL, 'volume'));
        this.poll();
        this.attemptConnect();
        console.log(this.socket.fullName);
    }
    set frontPanelBrightness(value) {
        if (this._fpb.set(Math.round(value))) {
            this.sendCorrection();
        }
    }
    get frontPanelBrightness() {
        const brightness = this._fpb.get();
        return brightness ? brightness : 0;
    }
    get info() {
        return '' +
            'model: ' + this.staticInfo[CMD_IDM] + '\n' +
            'software version: ' + this.staticInfo[CMD_IDS] + '\n' +
            'region: ' + this.staticInfo[CMD_IDR] + '\n' +
            'software date: ' + this.staticInfo[CMD_IDB] + '\n' +
            'hardware version: ' + this.staticInfo[CMD_IDH] + '\n' +
            'MCU MAC: ' + this.staticInfo[CMD_IDN] + '\n' +
            '';
    }
    set mute(value) {
        if (this._mut.set(value)) {
            this.sendCorrection();
        }
    }
    get mute() {
        const mute = this._mut.get();
        return mute ? mute : false;
    }
    set powerAll(on) {
        this.power = on;
        if (this._powZone2)
            this['powerZone2'] = on;
        if (this._powZone3)
            this['powerZone3'] = on;
        this._powerAll = on;
    }
    get powerAll() {
        return this._powerAll;
    }
    updatePowerAll() {
        const mainOn = this._power.get();
        const zone2On = (!this._powZone2 || this._powZone2.get());
        const zone3On = (!this._powZone3 || this._powZone3.get());
        const newValue = mainOn && zone2On && zone3On;
        if (this._powerAll !== newValue) {
            this._powerAll = newValue;
            this.changed('powerAll');
        }
    }
    createDynamicPowerProperty(zone) {
        if (LOG_DEBUG)
            console.log('trying to create dynamic power property for zone ' + zone);
        const state = this['_powZone' + zone];
        this.property('powerZone' + zone, { type: Boolean, description: 'Power Zone ' + zone + ' on/off)' }, setValue => {
            if (setValue !== undefined) {
                if (state?.set(setValue))
                    this.sendCorrection();
            }
            return state?.get();
        });
    }
    set standbyIPControl(value) {
        if (this._sip.set(value)) {
            this.sendCorrection();
        }
    }
    get standbyIPControl() {
        return this._sip.get();
    }
    set volume(value) {
        if (this._vol.set(value)) {
            this.sendCorrection();
        }
    }
    get volume() {
        const volume = this._vol.get();
        return volume === undefined ? 0 : volume;
    }
    createDynamicVolumeProperty(zone) {
        if (LOG_DEBUG)
            console.log('trying  to create dynamic volume property for zone ' + zone);
        const state = this['_volZone' + zone];
        this.property('volumeZone' + zone, { type: Number, min: VOL_MIN, max: VOL_MAX, description: 'Volume Zone ' + zone + ')' }, setValue => {
            if (setValue !== undefined) {
                if (state?.set(setValue))
                    this.sendCorrection();
            }
            const stateValue = state?.get();
            return stateValue;
        });
    }
    displayMessage(message, row) {
        this.sendText(ZONE_MAIN + CMD_MSG +
            Math.round(row) +
            message.substr(0, 100));
    }
    textReceived(text) {
        let result = text;
        let error = undefined;
        const requestActive = this.currCmd !== undefined;
        if (text[0] == '!') {
            const firstTwoChars = text.substr(0, 2);
            error = firstTwoChars;
            const followingChars = text.substr(2);
            let failed = false;
            switch (firstTwoChars) {
                case ERROR_CANNOT_BE_EXECUTED_PREFIX:
                    console.warn('can not be executed: "' + followingChars + '"');
                    break;
                case ERROR_OUT_OF_RANGE_PREFIX:
                    console.warn('command out of range: "' + followingChars + '"');
                    break;
                case ERROR_INVALID_COMMAND_PREFIX:
                    console.error('invalid command: "' + followingChars + '"');
                    break;
                case ERROR_ZONE_OFF_PREFIX:
                    console.warn('zone is off: "' + followingChars + '"');
                    break;
            }
            if (failed) {
                this.requestFailure(text);
                return;
            }
        }
        else {
        }
        if (requestActive) {
            this.requestSuccess(result);
            this.requestFinished();
        }
        this.processStatusChange(text, error);
    }
    processStatusChange(text, error) {
        const firstChar = text.substr(0, 1);
        if (firstChar == 'Z') {
            const zoneID = parseInt(text.substr(1, 1));
            const cmd = text.substr(2, 3);
            const value = text.substr(5);
            switch (cmd) {
                case CMD_MUT:
                    const newMute = value == '1';
                    if (zoneID == 1)
                        this._mut.updateCurrent(newMute);
                    break;
                case CMD_POW:
                    const newPower = value == '1';
                    if (zoneID == 1)
                        this._power.updateCurrent(newPower);
                    else if (value !== '?') {
                        let state = this['_powZone' + zoneID];
                        if (!state)
                            state = this.setupStates(zoneID).pow;
                        state.updateCurrent(newPower);
                    }
                    this.updatePowerAll();
                    if (!this.getToKnowRunning && newPower)
                        this.request('Z' + zoneID + CMD_VOL);
                    break;
                case CMD_VOL:
                    const newVolume = parseInt(value);
                    if (zoneID == 1)
                        this._vol.updateCurrent(newVolume);
                    else if (value !== '?') {
                        let state = this['_volZone' + zoneID];
                        if (!state)
                            state = this.setupStates(zoneID).vol;
                        state.updateCurrent(newVolume);
                    }
                    break;
            }
        }
        else if (text.length > 3) {
            const cmd = text.substr(0, 3);
            const value = text.substr(3);
            switch (cmd) {
                case CMD_FPB:
                    const newBrightness = parseInt(value);
                    this._fpb.updateCurrent(newBrightness);
                    break;
                case CMD_IDB:
                case CMD_IDH:
                case CMD_IDM:
                case CMD_IDN:
                case CMD_IDQ:
                case CMD_IDR:
                case CMD_IDS:
                    this.staticInfo[cmd] = value;
                    this.changed('info');
                    break;
            }
        }
    }
    setupStates(zone, zoneOff) {
        return {
            pow: this.setupPowerState(zone),
            vol: this.setupVolumeState(zone, zoneOff ? 0 : undefined),
        };
    }
    setupPowerState(zone) {
        const state = this['_powZone' + zone] = new NetworkProjector_1.BoolState('Z' + zone + CMD_POW, 'powerZone' + zone);
        this.addState(state);
        this.createDynamicPowerProperty(zone);
        return state;
    }
    setupVolumeState(zone, initialVolume) {
        const state = this['_volZone' + zone] = new SignedNumberState('Z' + zone + CMD_VOL, 'volumeZone' + zone);
        if (initialVolume !== undefined)
            state.updateCurrent(initialVolume);
        this.addState(state);
        this.createDynamicVolumeProperty(zone);
        return state;
    }
    justConnected() {
        console.log('connected');
        this.connected = true;
        this.getToKnowRunning = true;
        this.requestPower().then(() => this.requestVolumes().then(() => this.requestStaticInfo().then(() => this.getToKnowRunning = false)));
    }
    requestPower() {
        return this.requestAllZones(CMD_POW);
    }
    requestVolumes() {
        return this.requestAllZones(CMD_VOL);
    }
    requestAllZones(cmd) {
        return new Promise((resolve) => {
            this.request(ZONE_MAIN + cmd).finally(() => this.request(ZONE_2 + cmd).finally(() => this.request(ZONE_3 + cmd).finally(() => resolve())));
        });
    }
    requestStaticInfo() {
        return new Promise((resolve) => {
            this.request(CMD_IDQ).finally(() => this.request(CMD_IDM).finally(() => this.request(CMD_IDS).finally(() => this.request(CMD_IDR).finally(() => this.request(CMD_IDB).finally(() => this.request(CMD_IDH).finally(() => this.request(CMD_IDN).finally(() => resolve())))))));
        });
    }
    getDefaultEoln() {
        return ';';
    }
    pollStatus() {
        if (this.okToSendCommand()) {
            this.request(ZONE_MAIN + CMD_POW)
                .catch(error => {
                this.warnMsg("pollStatus error", error);
                this.disconnectAndTryAgainSoon();
            });
        }
        return true;
    }
    request(question, param) {
        var toSend = question;
        toSend += (param === undefined) ? '?' : param;
        this.socket.sendText(toSend, this.getDefaultEoln()).catch(err => this.sendFailed(err));
        const result = this.startRequest(toSend);
        result.finally(() => {
            asap(() => {
                this.sendCorrection();
            });
        });
        return result;
    }
    sendCorrection() {
        const didSend = super.sendCorrection();
        if (didSend) {
            if (this.recentCmdHoldoff)
                this.recentCmdHoldoff.cancel();
            this.recentCmdHoldoff = wait(10000);
            this.recentCmdHoldoff.then(() => this.recentCmdHoldoff = undefined);
        }
        return didSend;
    }
    inCmdHoldoff() {
        return this.recentCmdHoldoff;
    }
    projectorBusy() {
        if (!this.busyHoldoff) {
            this.busyHoldoff = wait(4000);
            this.busyHoldoff.then(() => this.busyHoldoff = undefined);
        }
    }
    okToSendCommand() {
        return !this.busyHoldoff && super.okToSendCommand();
    }
};
exports.AnthemMRX_x20 = AnthemMRX_x20;
__decorate([
    (0, Metadata_1.property)('Front panel brightness: 0=off, 1=low, 2=medium, 3=high'),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(3),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], AnthemMRX_x20.prototype, "frontPanelBrightness", null);
__decorate([
    (0, Metadata_1.property)('Info'),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], AnthemMRX_x20.prototype, "info", null);
__decorate([
    (0, Metadata_1.property)("Mute"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], AnthemMRX_x20.prototype, "mute", null);
__decorate([
    (0, Metadata_1.property)('Power All Zones on/off'),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], AnthemMRX_x20.prototype, "powerAll", null);
__decorate([
    (0, Metadata_1.property)("Standby IP Control. This must be enabled for the power-on command to operate via IP. Note that anabling this disables ECO mode."),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], AnthemMRX_x20.prototype, "standbyIPControl", null);
__decorate([
    (0, Metadata_1.property)("Volume, Main Zone"),
    (0, Metadata_1.min)(VOL_MIN),
    (0, Metadata_1.max)(VOL_MAX),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], AnthemMRX_x20.prototype, "volume", null);
__decorate([
    (0, Metadata_1.callable)('Display Message'),
    __param(0, (0, Metadata_1.parameter)('message')),
    __param(1, (0, Metadata_1.parameter)('row 0-1', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], AnthemMRX_x20.prototype, "displayMessage", null);
exports.AnthemMRX_x20 = AnthemMRX_x20 = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 14999 }),
    __metadata("design:paramtypes", [Object])
], AnthemMRX_x20);
class StringState extends NetworkProjector_1.State {
    correct(drvr) {
        return this.correct2(drvr, this.wanted);
    }
}
class SignedNumberState extends NetworkProjector_1.State {
    correct(drvr) {
        const request = this.correct2(drvr, (this.wanted >= 0 ? '+' : '') + this.wanted.toString());
        return request;
    }
    set(v) {
        return super.set(Math.round(v));
    }
    get() {
        var result = super.get();
        return result !== undefined ? result : 0;
    }
}
