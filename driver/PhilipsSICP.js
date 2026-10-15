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
var PhilipsSICP_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhilipsSICP = void 0;
const Driver_1 = require("../system_lib/Driver");
const Meta = __importStar(require("../system_lib/Metadata"));
let PhilipsSICP = class PhilipsSICP extends Driver_1.Driver {
    static { PhilipsSICP_1 = this; }
    socket;
    static nameToInput = {
        "VIDEO": 0x01,
        "S-VIDEO": 0x02,
        "COMPONENT": 0x03,
        "VGA": 0x05,
        "HDMI": 0x0D,
        "HDMI 1": 0x0D,
        "HDMI 2": 0x06,
        "HDMI 3": 0x0F,
        "DVI-D": 0x0E,
        "BROWSER": 0x10,
        "DISPLAY PORT": 0x0A,
        "DISPLAY PORT 1": 0x0A,
        "DISPLAY PORT 2": 0x07
    };
    mCurrentInput = "BROWSER";
    mPower = true;
    mVolume = 50;
    mDefVolHoldoff;
    mDefVolume;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.autoConnect(true);
    }
    set power(on) {
        this.mPower = on;
        this.sendCommand(0x18, on ? 2 : 1);
    }
    get power() {
        return this.mPower;
    }
    set currentInput(name) {
        const inputNumber = PhilipsSICP_1.nameToInput[name];
        if (inputNumber === undefined)
            throw "Bad input name";
        this.sendCommand(0xAC, inputNumber, 9, 1, 0);
        this.mCurrentInput = name;
    }
    get currentInput() {
        return this.mCurrentInput;
    }
    set volume(value) {
        const devVol = Math.round(value * 100);
        if (devVol !== this.mVolume) {
            this.mVolume = devVol;
            if (this.mDefVolHoldoff)
                this.mDefVolume = true;
            else
                this.sendVolume();
        }
    }
    get volume() {
        return this.mVolume / 100;
    }
    sendVolume() {
        this.sendCommand(0x44, this.mVolume, this.mVolume);
        this.mDefVolHoldoff = wait(200);
        this.mDefVolHoldoff.then(() => {
            this.mDefVolHoldoff = undefined;
            if (this.mDefVolume) {
                this.mDefVolume = false;
                this.sendVolume();
            }
        });
    }
    sendCommand(...commandBytes) {
        const fullCommand = [];
        fullCommand.push(0x00);
        fullCommand.push(0x01);
        fullCommand.push(0x00);
        fullCommand.splice(3, 0, ...commandBytes);
        fullCommand[0] = fullCommand.length + 1;
        this.addChecksum(fullCommand);
        this.socket.sendBytes(fullCommand);
    }
    addChecksum(command) {
        var checksum = 0;
        for (const byte of command)
            checksum ^= byte;
        command.push(checksum);
        return command;
    }
    logCommand(command) {
        var fullMessage = "";
        for (const byte of command)
            fullMessage += byte.toString(16) + ' ';
        console.log(fullMessage);
    }
};
exports.PhilipsSICP = PhilipsSICP;
__decorate([
    Meta.property("Display power"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], PhilipsSICP.prototype, "power", null);
__decorate([
    Meta.property("Input to be displayed, by name"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], PhilipsSICP.prototype, "currentInput", null);
__decorate([
    Meta.property("Audio volume"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], PhilipsSICP.prototype, "volume", null);
exports.PhilipsSICP = PhilipsSICP = PhilipsSICP_1 = __decorate([
    Meta.driver('NetworkTCP', { port: 5000 }),
    __metadata("design:paramtypes", [Object])
], PhilipsSICP);
