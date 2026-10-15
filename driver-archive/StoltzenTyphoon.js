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
exports.StoltzenTyphoon = void 0;
const Metadata_1 = require("../system_lib/Metadata");
const Driver_1 = require("../system_lib/Driver");
let StoltzenTyphoon = class StoltzenTyphoon extends Driver_1.Driver {
    socket;
    toSend;
    pendingSend;
    micMuteState;
    micVolumeState;
    mParamSet = 0;
    mStandBy = false;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        this.toSend = {};
        this.micMuteState = {};
        this.micVolumeState = {};
    }
    set muteInput01(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#0', mute));
    }
    get muteInput01() {
        return this.getMicMuteState('Input#mute#0');
    }
    set volumeInput01(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#0', volume));
    }
    get volumeInput01() {
        return this.getMicVolumeState('Input#gain#0');
    }
    set muteInput02(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#1', mute));
    }
    get muteInput02() {
        return this.getMicMuteState('Input#mute#1');
    }
    set volumeInput02(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#1', volume));
    }
    get volumeInput02() {
        return this.getMicVolumeState('Input#gain#1');
    }
    set muteInput03(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#2', mute));
    }
    get muteInput03() {
        return this.getMicMuteState('Input#mute#2');
    }
    set volumeInput03(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#2', volume));
    }
    get volumeInput03() {
        return this.getMicVolumeState('Input#gain#2');
    }
    set muteInput04(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#3', mute));
    }
    get muteInput04() {
        return this.getMicMuteState('Input#mute#3');
    }
    set volumeInput04(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#3', volume));
    }
    get volumeInput04() {
        return this.getMicVolumeState('Input#gain#3');
    }
    set muteInput05(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#4', mute));
    }
    get muteInput05() {
        return this.getMicMuteState('Input#mute#4');
    }
    set volumeInput05(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#4', volume));
    }
    get volumeInput05() {
        return this.getMicVolumeState('Input#gain#4');
    }
    set muteInput06(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#5', mute));
    }
    get muteInput06() {
        return this.getMicMuteState('Input#mute#5');
    }
    set volumeInput06(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#5', volume));
    }
    get volumeInput06() {
        return this.getMicVolumeState('Input#gain#5');
    }
    set muteInput07(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#6', mute));
    }
    get muteInput07() {
        return this.getMicMuteState('Input#mute#6');
    }
    set volumeInput07(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#6', volume));
    }
    get volumeInput07() {
        return this.getMicVolumeState('Input#gain#6');
    }
    set muteInput08(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#7', mute));
    }
    get muteInput08() {
        return this.getMicMuteState('Input#mute#7');
    }
    set volumeInput08(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#7', volume));
    }
    get volumeInput08() {
        return this.getMicVolumeState('Input#gain#7');
    }
    set muteInput09(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#8', mute));
    }
    get muteInput09() {
        return this.getMicMuteState('Input#mute#8');
    }
    set volumeInput09(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#8', volume));
    }
    get volumeInput09() {
        return this.getMicVolumeState('Input#gain#8');
    }
    set muteInput10(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#9', mute));
    }
    get muteInput10() {
        return this.getMicMuteState('Input#mute#9');
    }
    set volumeInput10(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#9', volume));
    }
    get volumeInput10() {
        return this.getMicVolumeState('Input#gain#9');
    }
    set muteInput11(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#10', mute));
    }
    get muteInput11() {
        return this.getMicMuteState('Input#mute#10');
    }
    set volumeInput11(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#10', volume));
    }
    get volumeInput11() {
        return this.getMicVolumeState('Input#gain#10');
    }
    set muteInput12(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#11', mute));
    }
    get muteInput12() {
        return this.getMicMuteState('Input#mute#11');
    }
    set volumeInput12(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#11', volume));
    }
    get volumeInput12() {
        return this.getMicVolumeState('Input#gain#11');
    }
    set muteOutput01(mute) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#0', mute));
    }
    get muteOutput01() {
        return this.getMicMuteState('output#mute#0');
    }
    set volumeOutput01(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#0', volume));
    }
    get volumeOutput01() {
        return this.getMicVolumeState('output#gain#0');
    }
    set muteOutput02(mute) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#1', mute));
    }
    get muteOutput02() {
        return this.getMicMuteState('output#mute#1');
    }
    set volumeOutput02(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#1', volume));
    }
    get volumeOutput02() {
        return this.getMicVolumeState('output#gain#1');
    }
    set muteOutput03(mute) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#2', mute));
    }
    get muteOutput03() {
        return this.getMicMuteState('output#mute#2');
    }
    set volumeOutput03(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#2', volume));
    }
    get volumeOutput03() {
        return this.getMicVolumeState('output#gain#2');
    }
    set muteOutput04(mute) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#3', mute));
    }
    get muteOutput04() {
        return this.getMicMuteState('output#mute#3');
    }
    set volumeOutput04(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#3', volume));
    }
    get volumeOutput04() {
        return this.getMicVolumeState('output#gain#3');
    }
    set muteOutput05(mute) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#4', mute));
    }
    get muteOutput05() {
        return this.getMicMuteState('output#mute#4');
    }
    set volumeOutput05(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#4', volume));
    }
    get volumeOutput05() {
        return this.getMicVolumeState('output#gain#4');
    }
    set muteOutput06(mute) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#5', mute));
    }
    get muteOutput06() {
        return this.getMicMuteState('output#mute#5');
    }
    set volumeOutput06(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#5', volume));
    }
    get volumeOutput06() {
        return this.getMicVolumeState('output#gain#5');
    }
    set muteOutput07(mute) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#6', mute));
    }
    get muteOutput07() {
        return this.getMicMuteState('output#mute#6');
    }
    set volumeOutput07(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#6', volume));
    }
    get volumeOutput07() {
        return this.getMicVolumeState('output#gain#6');
    }
    set muteOutput08(mute) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#7', mute));
    }
    get muteOutput08() {
        return this.getMicMuteState('output#mute#7');
    }
    set volumeOutput08(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#7', volume));
    }
    get volumeOutput08() {
        return this.getMicVolumeState('output#gain#7');
    }
    set muteOutput09(mute) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#8', mute));
    }
    get muteOutput09() {
        return this.getMicMuteState('output#mute#8');
    }
    set volumeOutput09(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#8', volume));
    }
    get volumeOutput09() {
        return this.getMicVolumeState('output#gain#8');
    }
    set muteOutput10(mute) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#9', mute));
    }
    get muteOutput10() {
        return this.getMicMuteState('output#mute#9');
    }
    set volumeOutput10(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#9', volume));
    }
    get volumeOutput10() {
        return this.getMicVolumeState('output#gain#9');
    }
    set muteOutput11(mute) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#10', mute));
    }
    get muteOutput11() {
        return this.getMicMuteState('output#mute#10');
    }
    set volumeOutput11(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#10', volume));
    }
    get volumeOutput11() {
        return this.getMicVolumeState('output#gain#10');
    }
    set muteOutput12(mute) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#11', mute));
    }
    get muteOutput12() {
        return this.getMicMuteState('output#mute#11');
    }
    set volumeOutput12(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#11', volume));
    }
    get volumeOutput12() {
        return this.getMicVolumeState('output#gain#11');
    }
    getMicMuteCmd(name, mute) {
        this.micMuteState[name] = mute;
        return new MicMute(name, mute);
    }
    getMicMuteState(name) {
        return this.micMuteState[name] || false;
    }
    getMicVolumeCmd(name, volume) {
        volume = Math.round(volume);
        const oldState = this.micVolumeState[name];
        if (volume !== oldState) {
            this.micVolumeState[name] = volume;
            return new MicVolume(name, volume);
        }
    }
    getMicVolumeState(name) {
        return this.micVolumeState[name] || 0;
    }
    sendString(toSend) {
        return this.socket.sendText(toSend);
    }
    RecallPreset(toSend) {
        return this.socket.sendText("scene: toggle #" + (toSend - 1));
    }
    SavePreset(toSend) {
        return this.socket.sendText("scene:save#" + (toSend - 1));
    }
    setGain(channel, gain) {
        return this.socket.sendText("set:input#sens#" + (channel - 1) + "#" + gain);
    }
    requestSendCmd(cmd) {
        if (cmd) {
            if (Object.keys(this.toSend).length === 0)
                this.sendSoon();
            this.toSend[cmd.getKey()] = cmd;
        }
    }
    sendSoon(howSoonMillis = 10) {
        if (!this.pendingSend) {
            this.pendingSend = wait(howSoonMillis);
            this.pendingSend.then(() => {
                this.pendingSend = undefined;
                this.sendNow();
            });
        }
    }
    sendNow() {
        const sendNow = this.toSend;
        if (Object.keys(sendNow).length > 0) {
            this.toSend = {};
            var cmdStr = '';
            for (let cmdKey in sendNow) {
                var cmd = sendNow[cmdKey].getCmdStr();
                ;
                cmdStr += cmd;
            }
            this.socket.sendText(cmdStr);
        }
    }
};
exports.StoltzenTyphoon = StoltzenTyphoon;
__decorate([
    (0, Metadata_1.property)("Mute Input01"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteInput01", null);
__decorate([
    (0, Metadata_1.property)("Volume Input01"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeInput01", null);
__decorate([
    (0, Metadata_1.property)("Mute Input02"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteInput02", null);
__decorate([
    (0, Metadata_1.property)("Volume Input02"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeInput02", null);
__decorate([
    (0, Metadata_1.property)("Mute Input03"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteInput03", null);
__decorate([
    (0, Metadata_1.property)("Volume Input03"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeInput03", null);
__decorate([
    (0, Metadata_1.property)("Mute Input04"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteInput04", null);
__decorate([
    (0, Metadata_1.property)("Volume Input04"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeInput04", null);
__decorate([
    (0, Metadata_1.property)("Mute Input05"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteInput05", null);
__decorate([
    (0, Metadata_1.property)("Volume Input05"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeInput05", null);
__decorate([
    (0, Metadata_1.property)("Mute Input06"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteInput06", null);
__decorate([
    (0, Metadata_1.property)("Volume Input06"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeInput06", null);
__decorate([
    (0, Metadata_1.property)("Mute Input07"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteInput07", null);
__decorate([
    (0, Metadata_1.property)("Volume Input07"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeInput07", null);
__decorate([
    (0, Metadata_1.property)("Mute Input08"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteInput08", null);
__decorate([
    (0, Metadata_1.property)("Volume Input08"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeInput08", null);
__decorate([
    (0, Metadata_1.property)("Mute Input09"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteInput09", null);
__decorate([
    (0, Metadata_1.property)("Volume Input09"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeInput09", null);
__decorate([
    (0, Metadata_1.property)("Mute Input10"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteInput10", null);
__decorate([
    (0, Metadata_1.property)("Volume Input10"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeInput10", null);
__decorate([
    (0, Metadata_1.property)("Mute Input11"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteInput11", null);
__decorate([
    (0, Metadata_1.property)("Volume Input11"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeInput11", null);
__decorate([
    (0, Metadata_1.property)("Mute Input12"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteInput12", null);
__decorate([
    (0, Metadata_1.property)("Volume Input12"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeInput12", null);
__decorate([
    (0, Metadata_1.property)("Mute Output01"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteOutput01", null);
__decorate([
    (0, Metadata_1.property)("Volume Output01"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeOutput01", null);
__decorate([
    (0, Metadata_1.property)("Mute Output02"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteOutput02", null);
__decorate([
    (0, Metadata_1.property)("Volume Output02"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeOutput02", null);
__decorate([
    (0, Metadata_1.property)("Mute Output03"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteOutput03", null);
__decorate([
    (0, Metadata_1.property)("Volume Output03"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeOutput03", null);
__decorate([
    (0, Metadata_1.property)("Mute Output04"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteOutput04", null);
__decorate([
    (0, Metadata_1.property)("Volume Output04"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeOutput04", null);
__decorate([
    (0, Metadata_1.property)("Mute Output05"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteOutput05", null);
__decorate([
    (0, Metadata_1.property)("Volume Output05"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeOutput05", null);
__decorate([
    (0, Metadata_1.property)("Mute Output06"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteOutput06", null);
__decorate([
    (0, Metadata_1.property)("Volume Output06"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeOutput06", null);
__decorate([
    (0, Metadata_1.property)("Mute Output07"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteOutput07", null);
__decorate([
    (0, Metadata_1.property)("Volume Output07"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeOutput07", null);
__decorate([
    (0, Metadata_1.property)("Mute Output08"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteOutput08", null);
__decorate([
    (0, Metadata_1.property)("Volume Output08"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeOutput08", null);
__decorate([
    (0, Metadata_1.property)("Mute Output09"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteOutput09", null);
__decorate([
    (0, Metadata_1.property)("Volume Output09"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeOutput09", null);
__decorate([
    (0, Metadata_1.property)("Mute Output10"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteOutput10", null);
__decorate([
    (0, Metadata_1.property)("Volume Output10"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeOutput10", null);
__decorate([
    (0, Metadata_1.property)("Mute Output11"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteOutput11", null);
__decorate([
    (0, Metadata_1.property)("Volume Output11"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeOutput11", null);
__decorate([
    (0, Metadata_1.property)("Mute Output12"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], StoltzenTyphoon.prototype, "muteOutput12", null);
__decorate([
    (0, Metadata_1.property)("Volume Output12"),
    (0, Metadata_1.min)(-72),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], StoltzenTyphoon.prototype, "volumeOutput12", null);
__decorate([
    (0, Metadata_1.callable)("Send raw command string"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StoltzenTyphoon.prototype, "sendString", null);
__decorate([
    (0, Metadata_1.callable)("Recall preset number (slot 1 to 16)"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], StoltzenTyphoon.prototype, "RecallPreset", null);
__decorate([
    (0, Metadata_1.callable)("Save setting as preset number 1 to 16"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], StoltzenTyphoon.prototype, "SavePreset", null);
__decorate([
    (0, Metadata_1.callable)("Set input gain ch.1-12, value 0-16. 3dB step pr. value. Must save preset to remember"),
    __param(0, (0, Metadata_1.parameter)("Channel to set 1-12")),
    __param(1, (0, Metadata_1.parameter)("Gain to set value 0-16")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], StoltzenTyphoon.prototype, "setGain", null);
exports.StoltzenTyphoon = StoltzenTyphoon = __decorate([
    (0, Metadata_1.driver)('NetworkUDP', { port: 50000 }),
    __metadata("design:paramtypes", [Object])
], StoltzenTyphoon);
class Command {
    baseCmd;
    constructor(baseCmd) {
        this.baseCmd = baseCmd;
    }
    getKey() {
        return this.baseCmd;
    }
}
class MicVolume extends Command {
    value;
    constructor(name, value) {
        super('set:' + name + '#');
        this.value = value;
    }
    getCmdStr() {
        return this.baseCmd + this.value.toFixed(0);
    }
}
class MicMute extends Command {
    mute;
    constructor(name, mute) {
        super('set:' + name + '#');
        this.mute = mute;
    }
    getCmdStr() {
        return this.baseCmd + (this.mute ? '1' : '0');
    }
}
function normVolume(normValue) {
    const value = Math.round(normValue * 120);
    return Math.max(0, Math.min(value, 144));
}
