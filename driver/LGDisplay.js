var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LGDisplay = void 0;
    var LGDisplay = (function (_super) {
        __extends(LGDisplay, _super);
        function LGDisplay(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            socket.enableWakeOnLAN();
            socket.autoConnect(true);
            socket.subscribe("textReceived", function (sender, message) {
                console.info("Data received", message.text);
            });
            return _this;
        }
        LGDisplay_1 = LGDisplay;
        Object.defineProperty(LGDisplay.prototype, "input", {
            get: function () {
                return this.mCurrentInput || "DTV";
            },
            set: function (name) {
                var inputNumber = LGDisplay_1.nameToInput[name];
                if (inputNumber === undefined)
                    throw "Bad input name";
                this.sendCommand('xb', inputNumber);
                this.mCurrentInput = name;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LGDisplay.prototype, "power", {
            get: function () {
                return this.mPowerIsOn || false;
            },
            set: function (desiredState) {
                this.sendCommand('ka', desiredState ? 1 : 0);
                this.mPowerIsOn = desiredState;
                if (desiredState)
                    this.socket.wakeOnLAN();
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LGDisplay.prototype, "volume", {
            get: function () {
                return this.mVolume || 0;
            },
            set: function (desiredVolume) {
                this.sendCommand('kf', desiredVolume * 100);
                this.mVolume = desiredVolume;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LGDisplay.prototype, "brightness", {
            get: function () {
                return this.mBrightness || 0.5;
            },
            set: function (desiredBrightness) {
                this.sendCommand('kh', desiredBrightness * 100);
                this.mBrightness = desiredBrightness;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LGDisplay.prototype, "backlight", {
            get: function () {
                return this.mBacklight || 0.5;
            },
            set: function (desiredBacklight) {
                this.sendCommand('mg', desiredBacklight * 100);
                this.mBacklight = desiredBacklight;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LGDisplay.prototype, "color", {
            get: function () {
                return this.mColor || 0.5;
            },
            set: function (desiredColor) {
                this.sendCommand('ki', desiredColor * 100);
                this.mColor = desiredColor;
            },
            enumerable: false,
            configurable: true
        });
        LGDisplay.prototype.sendCommand = function (command, parameter) {
            command = command + ' ' + '00 ';
            var paramStr = Math.round(parameter).toString(16);
            if (paramStr.length < 2)
                paramStr = '0' + paramStr;
            command = command + paramStr;
            this.socket.sendText(command);
        };
        var LGDisplay_1;
        LGDisplay.nameToInput = {
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
        LGDisplay = LGDisplay_1 = __decorate([
            Meta.driver('NetworkTCP', { port: 9761 }),
            __metadata("design:paramtypes", [Object])
        ], LGDisplay);
        return LGDisplay;
    }(Driver_1.Driver));
    exports.LGDisplay = LGDisplay;
});
