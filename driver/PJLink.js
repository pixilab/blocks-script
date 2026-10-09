"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PJLink_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PJLink = void 0;
const NetworkProjector_1 = require("../driver/NetworkProjector");
const Meta = __importStar(require("../system_lib/Metadata"));
const Metadata_1 = require("../system_lib/Metadata");
let PJLink = class PJLink extends NetworkProjector_1.NetworkProjector {
    static { PJLink_1 = this; }
    unauthenticated;
    _input;
    _mute;
    static kMinInput = 11;
    static kMaxInput = 59;
    busyHoldoff;
    recentCmdHoldoff;
    constructor(socket) {
        super(socket);
        this.addState(this._power = new NetworkProjector_1.BoolState('POWR', 'power'));
        this.addState(this._mute = new MuteState('AVMT', 'mute'));
        this.addState(this._input = new NetworkProjector_1.NumState('INPT', 'input', PJLink_1.kMinInput, PJLink_1.kMaxInput, () => this._power.getCurrent()));
        this.setKeepAlive(false);
        this.setPollFrequency(60000);
        this.poll();
        this.attemptConnect();
    }
    pollStatus() {
        if (this.okToSendCommand()) {
            this.request('POWR').then(reply => {
                const value = parseInt(reply);
                if (typeof value !== 'number')
                    throw "Invalid POWR query response " + reply;
                const on = (value & 1) != 0;
                if (!this.inCmdHoldoff())
                    this._power.updateCurrent(on);
                if (on && this.okToSendCommand())
                    this.getMiscState1(true);
            }).catch(error => {
                this.warnMsg("pollStatus error", error);
                this.disconnectAndTryAgainSoon(70);
            });
        }
        return true;
    }
    isOfTypeName(typeName) {
        return typeName === "PJLink" ? this : super.isOfTypeName(typeName);
    }
    set input(value) {
        if (this._input.set(value))
            this.sendCorrection();
    }
    get input() {
        return this._input.get();
    }
    set mute(on) {
        if (this._mute.set(on))
            this.sendCorrection();
    }
    get mute() {
        return this._mute.get();
    }
    getInitialState() {
        if (this.keepAlive)
            this.connected = false;
        this.request('POWR').then(reply => {
            if (!this.inCmdHoldoff())
                this._power.updateCurrent((parseInt(reply) & 1) != 0);
            if (this._power.get())
                this.getMiscState1();
            else {
                this.connected = true;
                this.sendCorrection();
            }
        }, error => {
            this.warnMsg("getInitialState POWR error - retrying", error);
            this.disconnectAndTryAgainSoon();
        });
    }
    getMiscState1(ignoreError) {
        this.request('INPT').then(reply => {
            const value = parseInt(reply);
            if (typeof value !== 'number')
                throw "Invalid INPT query response " + reply;
            if (!this.inCmdHoldoff())
                this._input.updateCurrent(value);
            this.getMiscState2();
        }, error => {
            this.warnMsg("INPT query error", error);
            if (ignoreError)
                this.getMiscState2();
            else {
                this.connected = true;
                this.sendCorrection();
            }
        });
    }
    getMiscState2(ignoreError) {
        this.request('AVMT').then(reply => {
            const value = parseInt(reply);
            if (typeof value !== 'number')
                throw "Invalid AVMT query response " + reply;
            if (!this.inCmdHoldoff())
                this._mute.updateCurrent(value === 31);
            this.connected = true;
            this.sendCorrection();
        }, error => {
            this.warnMsg("AVMT query error", error);
            if (!ignoreError) {
                this.connected = true;
                this.sendCorrection();
            }
        });
    }
    sendCorrection() {
        const didSend = super.sendCorrection();
        if (didSend) {
            if (this.recentCmdHoldoff)
                this.recentCmdHoldoff.cancel();
            this.recentCmdHoldoff = wait(5000);
            this.recentCmdHoldoff.then(() => this.recentCmdHoldoff = undefined);
        }
        return didSend;
    }
    inCmdHoldoff() {
        return this.recentCmdHoldoff;
    }
    request(question, param) {
        var toSend = '%1' + question;
        toSend += ' ';
        toSend += (param === undefined) ? '?' : param;
        this.socket.sendText(toSend).catch(err => this.sendFailed(err));
        const result = this.startRequest(toSend);
        result.finally(() => {
            asap(() => {
                this.sendCorrection();
            });
        });
        return result;
    }
    textReceived(text) {
        text = text.toUpperCase();
        if (text.indexOf('PJLINK ') === 0) {
            if (this.unauthenticated = (text.indexOf('PJLINK 1') === 0))
                this.errorMsg("PJLink authentication not supported");
            else
                this.getInitialState();
            return;
        }
        const msgStart = text.indexOf('%');
        if (msgStart > 0)
            text = text.substring(msgStart);
        let currCmd = this.currCmd;
        if (!currCmd) {
            this.warnMsg("Unsolicited data", text);
            return;
        }
        currCmd = currCmd.substring(0, 6);
        if (currCmd) {
            const expectedResponse = currCmd + '=';
            if (text.indexOf(expectedResponse) === 0) {
                text = text.substr(expectedResponse.length);
                var treatAsOk = text.indexOf('ERR') !== 0;
                if (treatAsOk && this.recentCmdHoldoff) {
                    this.recentCmdHoldoff.cancel();
                    this.recentCmdHoldoff = undefined;
                }
                if (!treatAsOk) {
                    switch (text) {
                        case 'ERR1':
                            this.errorMsg("Undefined command", this.currCmd);
                            treatAsOk = true;
                            break;
                        case 'ERR2':
                            this.errorMsg("Bad command parameter", this.currCmd);
                            treatAsOk = true;
                            break;
                        case 'ERR3':
                            treatAsOk = true;
                            this.projectorBusy();
                            this.warnMsg("PJLink projector BUSY", currCmd, text);
                            break;
                        default:
                            this.warnMsg("PJLink unexpected response", currCmd, text);
                            break;
                    }
                    if (!treatAsOk)
                        this.requestFailure(text);
                }
                if (treatAsOk)
                    this.requestSuccess(text);
            }
            else
                this.requestFailure("Expected reply " + expectedResponse + ", got " + text);
        }
        else
            this.warnMsg("Unexpected data", text);
        this.requestFinished();
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
exports.PJLink = PJLink;
__decorate([
    Meta.property("Desired input source number; 11…59"),
    Meta.min(PJLink.kMinInput),
    Meta.max(PJLink.kMaxInput),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], PJLink.prototype, "input", null);
__decorate([
    (0, Metadata_1.property)("A/V Muted"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], PJLink.prototype, "mute", null);
exports.PJLink = PJLink = PJLink_1 = __decorate([
    Meta.driver('NetworkTCP', { port: 4352 }),
    __metadata("design:paramtypes", [Object])
], PJLink);
class MuteState extends NetworkProjector_1.BoolState {
    correct(drvr) {
        return this.correct2(drvr, this.wanted ? '31' : '30');
    }
}
