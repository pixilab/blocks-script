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
var ChristieAccess_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PowerState = exports.ChristieAccess = void 0;
const NetworkProjector_1 = require("../driver/NetworkProjector");
const Meta = __importStar(require("../system_lib/Metadata"));
let ChristieAccess = class ChristieAccess extends NetworkProjector_1.NetworkProjector {
    static { ChristieAccess_1 = this; }
    static replyParser = /.* (.*)$/;
    static kMinInput = 5;
    static kMaxInput = 20;
    static kInputNameToNum = {
        "FAV": 5,
        "HDMI1": 7,
        "HDMI2": 8,
        "YPbPr": 11,
        "VGA": 12,
        "DVI": 18,
        "DP": 19,
        "OPS": 20
    };
    _input;
    constructor(socket) {
        super(socket);
        this._power = new PowerState('SETQUICKSTANDBY', 'power');
        this.addState(this._power);
        this._input = new NetworkProjector_1.NumState('SELECTSOURCE', 'input', ChristieAccess_1.kMinInput, ChristieAccess_1.kMaxInput);
        this.addState(this._input);
        this.setKeepAlive(false);
        this.setPollFrequency(60000);
        this.poll();
        this.attemptConnect();
    }
    set input(value) {
        if (this._input.set(value))
            this.sendCorrection();
    }
    get input() {
        return this._input.get();
    }
    justConnected() {
        super.justConnected();
        this.getState();
    }
    getState() {
        if (this.keepAlive)
            this.connected = false;
        this.request('GETQUICKSTANDBY').then(reply => {
            log("getState GETQUICKSTANDBY", reply);
            if (reply)
                this._power.updateCurrent(reply === 'off');
            return this.request('GETSOURCE');
        }).then(reply => {
            log("getState GETSOURCE", reply);
            if (reply) {
                const inputNum = ChristieAccess_1.kInputNameToNum[reply];
                if (inputNum)
                    this._input.updateCurrent(inputNum);
            }
            this.connected = true;
            this.sendCorrection();
        }).catch(error => {
            console.error("getState error - retry soon", error);
            this.disconnectAndTryAgainSoon();
        });
    }
    request(question, param) {
        var toSend = question;
        if (param !== undefined)
            toSend += ' ' + param;
        this.socket.sendText(toSend, this.getDefaultEoln())
            .catch(err => this.sendFailed(err));
        const result = this.startRequest(question);
        result.finally(() => {
            wait(600).then(() => {
                this.sendCorrection();
            });
        });
        return result;
    }
    getDefaultEoln() {
        return '\r\n';
    }
    textReceived(text) {
        if (text) {
            const parts = ChristieAccess_1.replyParser.exec(text);
            if (parts)
                this.requestSuccess(parts[1]);
            else
                this.warnMsg("Unexpected data", text);
            this.requestFinished();
        }
    }
};
exports.ChristieAccess = ChristieAccess;
__decorate([
    Meta.property("Desired input source number"),
    Meta.min(ChristieAccess.kMinInput),
    Meta.max(ChristieAccess.kMaxInput),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], ChristieAccess.prototype, "input", null);
exports.ChristieAccess = ChristieAccess = ChristieAccess_1 = __decorate([
    Meta.driver('NetworkTCP', { port: 1986 }),
    __metadata("design:paramtypes", [Object])
], ChristieAccess);
class PowerState extends NetworkProjector_1.State {
    correct(drvr) {
        return this.correct2(drvr, this.wanted ? 'off' : 'on');
    }
}
exports.PowerState = PowerState;
const DEBUG = false;
function log(...messages) {
    if (DEBUG)
        console.info(messages);
}
