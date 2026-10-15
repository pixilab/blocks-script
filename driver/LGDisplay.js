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
var LGDisplay_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LGDisplay = void 0;
const Driver_1 = require("../system_lib/Driver");
const Meta = __importStar(require("../system_lib/Metadata"));
let LGDisplay = class LGDisplay extends Driver_1.Driver {
    static { LGDisplay_1 = this; }
    socket;
    mCurrentInput;
    mPowerIsOn;
    mVolume;
    mBrightness;
    mBacklight;
    mColor;
    static nameToInput = {
        "DTV": 0x00,
        "CADTV": 0x01,
        "ATV": 0x10,
        "CATV": 0x11,
        "AV": 0x20,
        "AV2": 0x21,
        "Component1": 0x40,
        "Component2": 0x41,
        "RGB": 0x60,
        "HDMI1": 0x90,
        "HDMI2": 0x91,
        "HDMI3": 0x92,
        "HDMI4": 0x93
    };
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.enableWakeOnLAN();
        socket.autoConnect(true);
        socket.subscribe("bytesReceived", (sender, message) => {
            console.info("Unexpected data received", message.rawData.length);
        });
    }
    set input(name) {
        const inputNumber = LGDisplay_1.nameToInput[name];
        if (inputNumber === undefined)
            throw "Bad input name";
        this.sendCommand('xb', inputNumber);
        this.mCurrentInput = name;
    }
    get input() {
        return this.mCurrentInput || "DTV";
    }
    set power(desiredState) {
        this.sendCommand('ka', desiredState ? 1 : 0);
        this.mPowerIsOn = desiredState;
        if (desiredState)
            this.socket.wakeOnLAN();
    }
    get power() {
        return this.mPowerIsOn || false;
    }
    set volume(desiredVolume) {
        this.sendCommand('kf', desiredVolume * 100);
        this.mVolume = desiredVolume;
    }
    get volume() {
        return this.mVolume || 0;
    }
    set brightness(desiredBrightness) {
        this.sendCommand('kh', desiredBrightness * 100);
        this.mBrightness = desiredBrightness;
    }
    get brightness() {
        return this.mBrightness || 0.5;
    }
    set backlight(desiredBacklight) {
        this.sendCommand('mg', desiredBacklight * 100);
        this.mBacklight = desiredBacklight;
    }
    get backlight() {
        return this.mBacklight || 0.5;
    }
    set color(desiredColor) {
        this.sendCommand('ki', desiredColor * 100);
        this.mColor = desiredColor;
    }
    get color() {
        return this.mColor || 0.5;
    }
    sendCommand(command, parameter) {
        command = command + ' ' + '00 ';
        var paramStr = Math.round(parameter).toString(16);
        if (paramStr.length < 2)
            paramStr = '0' + paramStr;
        command = command + paramStr;
        this.socket.sendText(command);
    }
};
exports.LGDisplay = LGDisplay;
__decorate([
    Meta.property("Video source to be displayed, by name, such as DTV, AV, AV2, HDMI1 etc."),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], LGDisplay.prototype, "input", null);
__decorate([
    Meta.property("Display power state (WoL must be enabled)"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LGDisplay.prototype, "power", null);
__decorate([
    Meta.property("Volume level"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LGDisplay.prototype, "volume", null);
__decorate([
    Meta.property("Brightness level"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LGDisplay.prototype, "brightness", null);
__decorate([
    Meta.property("Backlight intensity"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LGDisplay.prototype, "backlight", null);
__decorate([
    Meta.property("Color saturation"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LGDisplay.prototype, "color", null);
exports.LGDisplay = LGDisplay = LGDisplay_1 = __decorate([
    Meta.driver('NetworkTCP', { port: 9761 }),
    __metadata("design:paramtypes", [Object])
], LGDisplay);
