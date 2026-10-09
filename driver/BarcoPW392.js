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
var BarcoPW392_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarcoPW392 = void 0;
const Meta = __importStar(require("../system_lib/Metadata"));
const NetworkProjector_1 = require("../driver/NetworkProjector");
let BarcoPW392 = class BarcoPW392 extends NetworkProjector_1.NetworkProjector {
    static { BarcoPW392_1 = this; }
    static kMinInput = 0;
    static kMaxInput = 25;
    _input;
    static replyParser = /%\d* (\S*) (!?)(\d*)/;
    constructor(socket) {
        super(socket);
        this.addState(this._power = new NetworkProjector_1.BoolState('POWR', 'power'));
        this.addState(this._input = new NetworkProjector_1.NumState('IABS', 'input', BarcoPW392_1.kMinInput, BarcoPW392_1.kMaxInput, () => this._power.getCurrent()));
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
        this.getInitialState();
    }
    getInitialState() {
        this.connected = false;
        this.request('POWR').then(reply => {
            this._power.updateCurrent(!!(parseInt(reply) & 1));
            return this.request('IABS');
        }).then(reply => {
            this._input.updateCurrent(parseInt(reply));
            this.connected = true;
            this.sendCorrection();
        }).catch(error => {
            this.disconnectAndTryAgainSoon();
        });
    }
    request(question, param) {
        this.currCmd = question;
        var toSend = ':' + question;
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
        if (text) {
            const parts = BarcoPW392_1.replyParser.exec(text);
            if (parts && parts[1] === this.currCmd) {
                if (parts[2]) {
                    console.warn("BarcoPW response", text);
                    this.requestFailure(text);
                }
                else
                    this.requestSuccess(parts[3]);
            }
            else
                console.warn("Unexpected data", text);
            this.requestFinished();
        }
    }
};
exports.BarcoPW392 = BarcoPW392;
__decorate([
    Meta.property("Desired input source number"),
    Meta.min(BarcoPW392.kMinInput),
    Meta.max(BarcoPW392.kMaxInput),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], BarcoPW392.prototype, "input", null);
exports.BarcoPW392 = BarcoPW392 = BarcoPW392_1 = __decorate([
    Meta.driver('NetworkTCP', { port: 1025 }),
    __metadata("design:paramtypes", [Object])
], BarcoPW392);
