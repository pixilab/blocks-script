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
exports.BoseControlSpace = void 0;
const Metadata_1 = require("../system_lib/Metadata");
const Driver_1 = require("../system_lib/Driver");
let BoseControlSpace = class BoseControlSpace extends Driver_1.Driver {
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
        socket.autoConnect();
        this.toSend = {};
        this.micMuteState = {};
        this.micVolumeState = {};
        socket.subscribe('connect', (sender, msg) => {
            if (this.pendingSend) {
                this.pendingSend.cancel();
                this.pendingSend = undefined;
            }
            if (sender.connected && Object.keys(this.toSend).length)
                this.sendSoon();
        });
    }
    set standBy(stby) {
        this.mStandBy = stby;
        this.requestSendCmd(new StbyCmd(stby));
    }
    get standBy() {
        return this.mStandBy;
    }
    set parameterSet(setNum) {
        setNum = Math.round(setNum);
        this.mParamSet = setNum;
        this.requestSendCmd(new ParamSetCmd(setNum));
    }
    get parameterSet() {
        return this.mParamSet;
    }
    set muteMic1(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Mic1', mute));
    }
    get muteMic1() {
        return this.getMicMuteState('Mic1');
    }
    set volumeMic1(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Mic1', volume));
    }
    get volumeMic1() {
        return this.getMicVolumeState('Mic1');
    }
    set muteMic2(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Mic2', mute));
    }
    get muteMic2() {
        return this.getMicMuteState('Mic2');
    }
    set volumeMic2(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Mic2', volume));
    }
    get volumeMic2() {
        return this.getMicVolumeState('Mic2');
    }
    set muteMic3(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Mic3', mute));
    }
    get muteMic3() {
        return this.getMicMuteState('Mic3');
    }
    set volumeMic3(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Mic3', volume));
    }
    get volumeMic3() {
        return this.getMicVolumeState('Mic3');
    }
    set muteMic4(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Mic4', mute));
    }
    get muteMic4() {
        return this.getMicMuteState('Mic4');
    }
    set volumeMic4(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Mic4', volume));
    }
    get volumeMic4() {
        return this.getMicVolumeState('Mic4');
    }
    set muteMic5(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Mic5', mute));
    }
    get muteMic5() {
        return this.getMicMuteState('Mic5');
    }
    set volumeMic5(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Mic5', volume));
    }
    get volumeMic5() {
        return this.getMicVolumeState('Mic5');
    }
    set muteMic6(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Mic6', mute));
    }
    get muteMic6() {
        return this.getMicMuteState('Mic6');
    }
    set volumeMic6(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Mic6', volume));
    }
    get volumeMic6() {
        return this.getMicVolumeState('Mic6');
    }
    set muteMic7(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Mic7', mute));
    }
    get muteMic7() {
        return this.getMicMuteState('Mic7');
    }
    set volumeMic7(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Mic7', volume));
    }
    get volumeMic7() {
        return this.getMicVolumeState('Mic7');
    }
    set muteMic8(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Mic8', mute));
    }
    get muteMic8() {
        return this.getMicMuteState('Mic8');
    }
    set volumeMic8(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Mic8', volume));
    }
    get volumeMic8() {
        return this.getMicVolumeState('Mic8');
    }
    set muteMic9(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Mic9', mute));
    }
    get muteMic9() {
        return this.getMicMuteState('Mic9');
    }
    set volumeMic9(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Mic9', volume));
    }
    get volumeMic9() {
        return this.getMicVolumeState('Mic9');
    }
    set muteMic10(mute) {
        this.requestSendCmd(this.getMicMuteCmd('Mic10', mute));
    }
    get muteMic10() {
        return this.getMicMuteState('Mic10');
    }
    set volumeMic10(volume) {
        this.requestSendCmd(this.getMicVolumeCmd('Mic10', volume));
    }
    get volumeMic10() {
        return this.getMicVolumeState('Mic10');
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
    setVolume(slot, channel, normValue) {
        this.requestSendCmd(new VolumeCmd(slot, channel, normVolume(normValue)));
    }
    setGroupLevel(group, normValue) {
        group = Math.max(1, Math.min(group, 64));
        this.requestSendCmd(new GroupLevelCmd(group, normVolume(normValue)));
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
                if (this.socket.connected)
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
                cmdStr += '\r';
            }
            this.socket.sendText(cmdStr, null).catch(error => {
                console.warn("Error send command", error);
                for (let cmdKey in sendNow) {
                    if (!this.toSend[cmdKey])
                        this.toSend[cmdKey] = sendNow[cmdKey];
                }
                this.sendSoon(3000);
            });
        }
    }
};
exports.BoseControlSpace = BoseControlSpace;
__decorate([
    (0, Metadata_1.property)("Standby power mode"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BoseControlSpace.prototype, "standBy", null);
__decorate([
    (0, Metadata_1.property)("Parameter set"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(255),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], BoseControlSpace.prototype, "parameterSet", null);
__decorate([
    (0, Metadata_1.property)("Mute Mic1"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BoseControlSpace.prototype, "muteMic1", null);
__decorate([
    (0, Metadata_1.property)("Volume Mic1"),
    (0, Metadata_1.min)(-60),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], BoseControlSpace.prototype, "volumeMic1", null);
__decorate([
    (0, Metadata_1.property)("Mute Mic2"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BoseControlSpace.prototype, "muteMic2", null);
__decorate([
    (0, Metadata_1.property)("Volume Mic2"),
    (0, Metadata_1.min)(-60),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], BoseControlSpace.prototype, "volumeMic2", null);
__decorate([
    (0, Metadata_1.property)("Mute Mic3"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BoseControlSpace.prototype, "muteMic3", null);
__decorate([
    (0, Metadata_1.property)("Volume Mic3"),
    (0, Metadata_1.min)(-60),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], BoseControlSpace.prototype, "volumeMic3", null);
__decorate([
    (0, Metadata_1.property)("Mute Mic4"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BoseControlSpace.prototype, "muteMic4", null);
__decorate([
    (0, Metadata_1.property)("Volume Mic4"),
    (0, Metadata_1.min)(-60),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], BoseControlSpace.prototype, "volumeMic4", null);
__decorate([
    (0, Metadata_1.property)("Mute Mic5"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BoseControlSpace.prototype, "muteMic5", null);
__decorate([
    (0, Metadata_1.property)("Volume Mic5"),
    (0, Metadata_1.min)(-60),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], BoseControlSpace.prototype, "volumeMic5", null);
__decorate([
    (0, Metadata_1.property)("Mute Mic6"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BoseControlSpace.prototype, "muteMic6", null);
__decorate([
    (0, Metadata_1.property)("Volume Mic6"),
    (0, Metadata_1.min)(-60),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], BoseControlSpace.prototype, "volumeMic6", null);
__decorate([
    (0, Metadata_1.property)("Mute Mic7"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BoseControlSpace.prototype, "muteMic7", null);
__decorate([
    (0, Metadata_1.property)("Volume Mic7"),
    (0, Metadata_1.min)(-60),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], BoseControlSpace.prototype, "volumeMic7", null);
__decorate([
    (0, Metadata_1.property)("Mute Mic8"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BoseControlSpace.prototype, "muteMic8", null);
__decorate([
    (0, Metadata_1.property)("Volume Mic8"),
    (0, Metadata_1.min)(-60),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], BoseControlSpace.prototype, "volumeMic8", null);
__decorate([
    (0, Metadata_1.property)("Mute Mic9"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BoseControlSpace.prototype, "muteMic9", null);
__decorate([
    (0, Metadata_1.property)("Volume Mic9"),
    (0, Metadata_1.min)(-60),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], BoseControlSpace.prototype, "volumeMic9", null);
__decorate([
    (0, Metadata_1.property)("Mute Mic10"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BoseControlSpace.prototype, "muteMic10", null);
__decorate([
    (0, Metadata_1.property)("Volume Mic10"),
    (0, Metadata_1.min)(-60),
    (0, Metadata_1.max)(12),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], BoseControlSpace.prototype, "volumeMic10", null);
__decorate([
    (0, Metadata_1.callable)("Send raw command string, automatically terminated by CR"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BoseControlSpace.prototype, "sendString", null);
__decorate([
    (0, Metadata_1.callable)("Set the volume of slot and channel to normalized value"),
    __param(0, (0, Metadata_1.parameter)("Slot to set")),
    __param(1, (0, Metadata_1.parameter)("Channel to set")),
    __param(2, (0, Metadata_1.parameter)("Value (0…1.2)")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number]),
    __metadata("design:returntype", void 0)
], BoseControlSpace.prototype, "setVolume", null);
__decorate([
    (0, Metadata_1.callable)("Set the level of specified group to normalized value"),
    __param(0, (0, Metadata_1.parameter)("Group to set (1…64)")),
    __param(1, (0, Metadata_1.parameter)("Value (0…1.2)")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], BoseControlSpace.prototype, "setGroupLevel", null);
exports.BoseControlSpace = BoseControlSpace = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 10055 }),
    __metadata("design:paramtypes", [Object])
], BoseControlSpace);
class Command {
    baseCmd;
    constructor(baseCmd) {
        this.baseCmd = baseCmd;
    }
    getKey() {
        return this.baseCmd;
    }
}
class StbyCmd extends Command {
    stby;
    constructor(stby) {
        super("SY ");
        this.stby = stby;
    }
    getCmdStr() {
        return this.baseCmd + (this.stby ? 'S' : 'N');
    }
}
class ParamSetCmd extends Command {
    value;
    constructor(value) {
        super("SS ");
        this.value = value;
    }
    getCmdStr() {
        return this.baseCmd + this.value.toString(16);
    }
}
class GroupLevelCmd extends Command {
    value;
    constructor(channel, value) {
        super("SG " + channel.toString(16) + ',');
        this.value = value;
    }
    getCmdStr() {
        return this.baseCmd + this.value.toString(16);
    }
}
class VolumeCmd extends Command {
    value;
    constructor(slot, channel, value) {
        super("SV " + slot.toString(16) + ',' + channel.toString(16));
        this.value = value;
    }
    getCmdStr() {
        return this.baseCmd + ',' + this.value.toString(16);
    }
}
class MicVolume extends Command {
    value;
    constructor(name, value) {
        super('SA"' + name + '">1=');
        this.value = value;
    }
    getCmdStr() {
        return this.baseCmd + this.value.toFixed(1);
    }
}
class MicMute extends Command {
    mute;
    constructor(name, mute) {
        super('SA"' + name + '">2=');
        this.mute = mute;
    }
    getCmdStr() {
        return this.baseCmd + (this.mute ? 'O' : 'F');
    }
}
function normVolume(normValue) {
    const value = Math.round(normValue * 120);
    return Math.max(0, Math.min(value, 144));
}
