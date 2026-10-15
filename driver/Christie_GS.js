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
var Christie_GS_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Christie_GS = void 0;
const NetworkProjector_1 = require("../driver/NetworkProjector");
const Meta = __importStar(require("../system_lib/Metadata"));
let Christie_GS = class Christie_GS extends NetworkProjector_1.NetworkProjector {
    static { Christie_GS_1 = this; }
    static replyParser = /\(\D+(\d+)\D/;
    static kMinInput = 1;
    static kMaxInput = 12;
    _input;
    constructor(socket) {
        super(socket);
        this._power = new NetworkProjector_1.BoolState('PWR', 'power');
        this.addState(this._power);
        this._input = new NetworkProjector_1.NumState('SIN+MAIN', 'input', Christie_GS_1.kMinInput, Christie_GS_1.kMaxInput);
        this.addState(this._input);
        socket.setReceiveFraming(")", true);
        this.poll();
        this.attemptConnect();
    }
    set input(value) {
        if (this._input.set(value)) {
            this.sendCorrection();
        }
    }
    get input() {
        return this._input.get();
    }
    justConnected() {
        super.justConnected();
        this.connected = false;
        this.pollStatus();
    }
    pollStatus() {
        this.request('PWR?').then(reply => {
            const powered = reply == '1';
            this._power.updateCurrent(powered);
            if (powered)
                return this.request('SIN+MAIN?');
            else {
                this.connected = true;
                this.sendCorrection();
            }
        }).then(reply => {
            if (reply !== undefined) {
                const selInput = parseInt(reply);
                if (!isNaN(selInput))
                    this._input.updateCurrent(selInput);
            }
            this.connected = true;
            this.sendCorrection();
        }).catch(error => {
            this.disconnectAndTryAgainSoon();
        });
        return true;
    }
    request(question, param) {
        var toSend = question.indexOf('?') < 0 ? '#' + question : question;
        if (param !== undefined)
            toSend += param;
        toSend = '(' + toSend + ')';
        this.socket.sendText(toSend)
            .catch(err => this.sendFailed(err));
        const result = this.startRequest(question);
        result.finally(() => {
            asap(() => {
                this.sendCorrection();
            });
        });
        return result;
    }
    textReceived(text) {
        if (text) {
            const parts = Christie_GS_1.replyParser.exec(text);
            if (parts)
                this.requestSuccess(parts[1]);
            else
                console.warn("Unexpected data", text);
        }
    }
};
exports.Christie_GS = Christie_GS;
__decorate([
    Meta.property("Desired input source number"),
    Meta.min(Christie_GS.kMinInput),
    Meta.max(Christie_GS.kMaxInput),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], Christie_GS.prototype, "input", null);
exports.Christie_GS = Christie_GS = Christie_GS_1 = __decorate([
    Meta.driver('NetworkTCP', { port: 3002 }),
    __metadata("design:paramtypes", [Object])
], Christie_GS);
