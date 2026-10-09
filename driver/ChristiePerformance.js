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
var ChristiePerformance_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChristiePerformance = void 0;
const Driver_1 = require("../system_lib/Driver");
const Meta = __importStar(require("../system_lib/Metadata"));
let ChristiePerformance = class ChristiePerformance extends Driver_1.Driver {
    static { ChristiePerformance_1 = this; }
    socket;
    static kMinInput = 1;
    static kMaxInput = 16;
    powerState;
    inputNum;
    poweringUp;
    powerUpResolver;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.enableWakeOnLAN();
        socket.autoConnect(true);
        socket.subscribe('connect', (sender, message) => {
            this.connectStateChanged();
        });
        socket.subscribe('bytesReceived', (sender, msg) => this.bytesReceived(msg.rawData));
    }
    isOfTypeName(typeName) {
        return typeName === "ChristiePerformance" ? this : null;
    }
    connectStateChanged() {
        if (this.socket.connected) {
            if (this.powerUpResolver) {
                this.powerUpResolver(wait(15000));
                this.poweringUp.then(() => this.nowPowered());
                delete this.powerUpResolver;
                delete this.poweringUp;
            }
            else
                this.nowPowered();
        }
    }
    nowPowered() {
        if (this.powerState === undefined)
            this.powerState = true;
        if (!this.powerState)
            this.powerDown();
        else {
            if (this.inputNum !== undefined)
                this.input = this.inputNum;
            else {
                const cmd = this.makeCmd(0xAD);
                this.appendChecksum(cmd);
                this.socket.sendBytes(cmd);
            }
        }
    }
    bytesReceived(data) {
        var sd = "";
        for (var n of data)
            sd += n.toString() + ' ';
    }
    set power(on) {
        if (this.powerState != on) {
            this.powerState = on;
            if (on)
                this.powerUp2();
            else
                this.powerDown();
        }
    }
    get power() {
        return this.powerState;
    }
    powerUp() {
        if (!this.powerState) {
            this.powerState = true;
            this.changed('power');
        }
        return this.powerUp2();
    }
    powerUp2() {
        if (!this.poweringUp) {
            this.socket.wakeOnLAN();
            this.poweringUp = new Promise((resolver, rejector) => {
                this.powerUpResolver = resolver;
                wait(40000).then(() => {
                    rejector("Timeout");
                    delete this.poweringUp;
                    delete this.powerUpResolver;
                });
            });
        }
        return this.poweringUp;
    }
    powerDown() {
        const cmd = this.makeCmd(0x18);
        cmd.push(1);
        this.appendChecksum(cmd);
        this.socket.sendBytes(cmd);
    }
    set input(value) {
        this.inputNum = value;
        const cmd = this.makeCmd(0xAC);
        cmd.push(value);
        cmd.push(1);
        this.appendChecksum(cmd);
        this.socket.sendBytes(cmd);
    }
    get input() {
        return this.inputNum;
    }
    static kLengthIx = 5;
    makeCmd(cmd) {
        const cmdBuf = [];
        cmdBuf.push(0xa6, 1, 0, 0, 0, 0, 1, cmd);
        return cmdBuf;
    }
    appendChecksum(cmdBuf) {
        var checksum = 0;
        cmdBuf[ChristiePerformance_1.kLengthIx] = cmdBuf.length + 1
            - ChristiePerformance_1.kLengthIx;
        for (var byte of cmdBuf)
            checksum ^= byte;
        cmdBuf.push(checksum);
    }
};
exports.ChristiePerformance = ChristiePerformance;
__decorate([
    Meta.property("Power on/off"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], ChristiePerformance.prototype, "power", null);
__decorate([
    Meta.callable("Power up using wake-on-LAN"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChristiePerformance.prototype, "powerUp", null);
__decorate([
    Meta.property("Desired input source number"),
    Meta.min(ChristiePerformance.kMinInput),
    Meta.max(ChristiePerformance.kMaxInput),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], ChristiePerformance.prototype, "input", null);
exports.ChristiePerformance = ChristiePerformance = ChristiePerformance_1 = __decorate([
    Meta.driver('NetworkTCP', { port: 5000 }),
    __metadata("design:paramtypes", [Object])
], ChristiePerformance);
