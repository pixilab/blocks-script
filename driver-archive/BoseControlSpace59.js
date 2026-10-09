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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoseControlSpace59 = void 0;
const Metadata_1 = require("../system_lib/Metadata");
const Driver_1 = require("../system_lib/Driver");
let BoseControlSpace59 = class BoseControlSpace59 extends Driver_1.Driver {
    socket;
    pendingSend;
    toSend;
    mParamSet = 0;
    mStandBy = false;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.autoConnect();
        this.toSend = {};
        this.toSend = {};
        socket.subscribe('connect', (sender, msg) => {
            if (this.pendingSend) {
                this.pendingSend.cancel();
                this.pendingSend = undefined;
            }
            if (sender.connected && Object.keys(this.toSend).length)
                this.sendSoon();
        });
        const rawOpts = socket.options;
        if (rawOpts) {
            try {
                var opts = JSON.parse(rawOpts);
                if (this.validOptions(opts))
                    this.applyOptions(opts);
                else
                    console.error("Invalid options - ignored");
            }
            catch (error) {
                console.error("Invalid driver options", error);
            }
        }
        else
            console.warn("No options specified - will provide basic properties only");
    }
    validOptions(opts) {
        if (opts.gain) {
            const setting1 = opts.gain[0];
            if (setting1.name)
                return true;
        }
        return false;
    }
    applyOptions(opts) {
        for (var gain of opts.gain) {
            new GainLevel(this, gain);
            new GainMute(this, gain);
        }
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
    sendString(toSend) {
        return this.socket.sendText(toSend);
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
            }
            this.socket.sendText(cmdStr).catch(error => {
                console.warn("Failed sending command", error);
                for (let cmdKey in sendNow) {
                    if (!this.toSend[cmdKey])
                        this.toSend[cmdKey] = sendNow[cmdKey];
                }
                this.sendSoon(3000);
            });
        }
    }
};
exports.BoseControlSpace59 = BoseControlSpace59;
__decorate([
    (0, Metadata_1.property)("Standby power mode"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BoseControlSpace59.prototype, "standBy", null);
__decorate([
    (0, Metadata_1.property)("Recall Parameter Set"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(255),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], BoseControlSpace59.prototype, "parameterSet", null);
__decorate([
    (0, Metadata_1.callable)("Send raw command string, automatically terminated by CR"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BoseControlSpace59.prototype, "sendString", null);
exports.BoseControlSpace59 = BoseControlSpace59 = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 10055 }),
    __metadata("design:paramtypes", [Object])
], BoseControlSpace59);
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
class ModuleGainLevel extends Command {
    value;
    static kMin = -60.5;
    static kMax = 12;
    constructor(name, value) {
        super("SA " + '"' + name + '">1=');
        this.value = value;
    }
    getCmdStr() {
        return this.baseCmd + ModuleGainLevel.constrainValue(this.value).toString();
    }
    static constrainValue(value) {
        value = Math.max(ModuleGainLevel.kMin, Math.min(ModuleGainLevel.kMax, value));
        var result = Math.round(value * 2) / 2;
        return result.toString();
    }
}
class GainLevel {
    name;
    value = -20;
    constructor(owner, gain) {
        this.name = gain.name;
        owner.property(gain.name + "_level", {
            type: "Number",
            description: "Gain level, dB",
            min: ModuleGainLevel.kMin,
            max: ModuleGainLevel.kMax
        }, newValue => {
            if (newValue !== undefined) {
                this.value = newValue;
                const cmd = new ModuleGainLevel(this.name, newValue);
                owner.requestSendCmd(cmd);
            }
            return this.value;
        });
    }
}
class ModuleGainMute extends Command {
    value;
    constructor(name, value) {
        super("SA " + '"' + name + '">2=');
        this.value = value;
    }
    getCmdStr() {
        return this.baseCmd + (this.value ? 'O' : 'F');
    }
}
class GainMute {
    name;
    value = false;
    constructor(owner, gain) {
        this.name = gain.name;
        owner.property(gain.name + "_mute", { type: "Boolean", description: "Gain mute", }, newValue => {
            if (newValue !== undefined) {
                this.value = newValue;
                const cmd = new ModuleGainMute(this.name, newValue);
                owner.requestSendCmd(cmd);
            }
            return this.value;
        });
    }
}
function normToGain(norm) {
    const kMin = -60.5;
    const kMax = 12;
    const kRange = kMax - kMin;
    var result = kRange * norm;
    result = Math.round(result * 2) / 2 + kMin;
    return result.toString();
}
