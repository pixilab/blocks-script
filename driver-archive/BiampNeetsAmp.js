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
var BiampNeetsAmp_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BiampNeetsAmp = void 0;
const Meta = __importStar(require("../system_lib/Metadata"));
const NetworkProjector_1 = require("../driver/NetworkProjector");
let BiampNeetsAmp = class BiampNeetsAmp extends NetworkProjector_1.NetworkProjector {
    static { BiampNeetsAmp_1 = this; }
    started = false;
    _input;
    _volume;
    static kMinInput = 1;
    static kMaxInput = 5;
    static kMinVol = -70;
    static kMaxVol = 12;
    constructor(socket) {
        super(socket);
        this.setPollFrequency(60000 * 2);
        this.setKeepAlive(false);
        this._power = new OnOffState('POWER', 'power');
        this.addState(this._power);
        this._input = new NetworkProjector_1.NumState('INPUT', 'input', BiampNeetsAmp_1.kMinInput, BiampNeetsAmp_1.kMaxInput);
        this.addState(this._input);
        this._volume = new DbState('VOL', 'volume', BiampNeetsAmp_1.kMinVol, BiampNeetsAmp_1.kMaxVol);
        this.addState(this._volume);
        if (socket.enabled) {
            this.attemptConnect();
            this.poll();
        }
    }
    justConnected() {
        super.justConnected();
        if (!this.started) {
            this.connected = false;
            this.pollStatus();
        }
        else
            this.sendCorrection();
    }
    set input(value) {
        if (this._input.set(value)) {
            this.sendCorrection();
        }
    }
    get input() {
        return this._input.get();
    }
    set volume(value) {
        if (this._volume.set(value)) {
            this.sendCorrection();
        }
    }
    get volume() {
        return this._volume.get();
    }
    pollStatus() {
        if (this.okToSendCommand()) {
            this.request('POWER', '?')
                .then(reply => {
                const powered = reply == 'ON';
                this._power.updateCurrent(powered);
                return this.request('INPUT', '?');
            }).then(reply => {
                this._input.updateCurrent(parseInt(reply));
                return this.request('VOL', '?');
            }).then(reply => {
                this._volume.updateCurrent(parseInt(reply));
            }).then(() => {
                if (!this.started) {
                    console.info("Connected (Initial poll complete)");
                    this.connected = this.started = true;
                }
                this.sendCorrection();
            }).catch(error => {
                console.warn("pollStatus error - retrying soon", error);
                this.disconnectAndTryAgainSoon();
            });
        }
        return true;
    }
    request(msg, param) {
        var toSend = "NEUNIT=1," + msg + '=' + param;
        this.socket.sendText(toSend)
            .catch(err => this.sendFailed(err));
        const result = this.startRequest(msg);
        result.finally(() => {
            asap(() => {
                this.sendCorrection();
            });
        });
        return result;
    }
    static kReplyRegex = /NEUNIT=1,(.*)=(.*)/;
    textReceived(text) {
        if (text) {
            if (text === "NEUNIT=1,OK")
                this.requestSuccess("");
            else {
                const parts = BiampNeetsAmp_1.kReplyRegex.exec(text);
                if (parts)
                    this.requestSuccess(parts[2]);
                else
                    console.warn("Unexpected data", text);
            }
        }
    }
};
exports.BiampNeetsAmp = BiampNeetsAmp;
__decorate([
    Meta.property("Desired audio input number"),
    Meta.min(BiampNeetsAmp.kMinInput),
    Meta.max(BiampNeetsAmp.kMaxInput),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], BiampNeetsAmp.prototype, "input", null);
__decorate([
    Meta.property("Desired output volume"),
    Meta.min(BiampNeetsAmp.kMinVol),
    Meta.max(BiampNeetsAmp.kMaxVol),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], BiampNeetsAmp.prototype, "volume", null);
exports.BiampNeetsAmp = BiampNeetsAmp = BiampNeetsAmp_1 = __decorate([
    Meta.driver('NetworkTCP', { port: 5000 }),
    __metadata("design:paramtypes", [Object])
], BiampNeetsAmp);
class DbState extends NetworkProjector_1.NumState {
    set(v) {
        return super.set(Math.round(v));
    }
    correct(drvr) {
        let arg = this.wanted.toString();
        if (this.wanted > 0)
            arg = '+' + arg;
        return this.correct2(drvr, arg);
    }
}
class OnOffState extends NetworkProjector_1.BoolState {
    correct(drvr) {
        return this.correct2(drvr, this.wanted ? 'ON' : 'OFF');
    }
}
