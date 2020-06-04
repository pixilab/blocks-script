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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ThreeM_Touch = void 0;
    var ThreeM_Touch = (function (_super) {
        __extends(ThreeM_Touch, _super);
        function ThreeM_Touch(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            socket.autoConnect(true);
            return _this;
        }
        ThreeM_Touch_1 = ThreeM_Touch;
        Object.defineProperty(ThreeM_Touch.prototype, "power", {
            get: function () {
                return this.powered;
            },
            set: function (on) {
                this.powered = on;
                this.sendCommand(ThreeM_Touch_1.kCommands.POWER, on ? 1 : 0);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ThreeM_Touch.prototype, "brightness", {
            get: function () {
                return this.howBrite;
            },
            set: function (value) {
                this.howBrite = value;
                this.sendCommand(ThreeM_Touch_1.kCommands.BRIGHTNESS, value);
            },
            enumerable: false,
            configurable: true
        });
        ThreeM_Touch.prototype.sendCommand = function (cd, param) {
            param = Math.min(cd.paramMax, Math.max(0, param));
            var cmd = buildCommand(cd.page, cd.code, param);
            return this.socket.sendBytes(cmd);
        };
        var ThreeM_Touch_1;
        ThreeM_Touch.kCommands = {
            BRIGHTNESS: {
                page: 0x01,
                code: 0x10,
                paramMax: 100
            },
            CONTRAST: {
                page: 0x01,
                code: 0x12,
                paramMax: 100
            },
            COLOR_TEMP: {
                page: 0x02,
                code: 0x54,
                paramMax: 2
            },
            VOLUME: {
                page: 0x0,
                code: 0x62,
                paramMax: 30
            },
            MUTE: {
                page: 0x0,
                code: 0x8D,
                paramMax: 1
            },
            INPUT: {
                page: 0x02,
                code: 0xCB,
                paramMax: 3
            },
            POWER: {
                page: 0x0,
                code: 0x03,
                paramMax: 1
            }
        };
        __decorate([
            Metadata_1.property("Display power"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], ThreeM_Touch.prototype, "power", null);
        __decorate([
            Metadata_1.property("Display brightness"),
            Metadata_1.min(0),
            Metadata_1.max(80),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], ThreeM_Touch.prototype, "brightness", null);
        ThreeM_Touch = ThreeM_Touch_1 = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 4001 }),
            __metadata("design:paramtypes", [Object])
        ], ThreeM_Touch);
        return ThreeM_Touch;
    }(Driver_1.Driver));
    exports.ThreeM_Touch = ThreeM_Touch;
    function buildCommand(opcodePage, opcode, param) {
        var data = [];
        data.push(1);
        data.push(0x30);
        data.push(0x2A);
        data.push(0x30);
        data.push(0x45);
        var lengthPos = data.length;
        data.push(0x30);
        data.push(0x30);
        var headerLength = data.length;
        data.push(2);
        appendHex(data, opcodePage, 2);
        appendHex(data, opcode, 2);
        appendHex(data, param, 4);
        data.push(3);
        var cmdLength = data.length - headerLength;
        var cmdLenHex = toHex(cmdLength, 2);
        data[lengthPos] = cmdLenHex.charCodeAt(0);
        data[lengthPos + 1] = cmdLenHex.charCodeAt(1);
        var checksum = 0;
        for (var ix = 1; ix < data.length; ++ix)
            checksum = checksum ^ data[ix];
        data.push(checksum);
        data.push(0x0d);
        return data;
    }
    function appendHex(dataArray, num, numDigits) {
        var chars = toHex(num, numDigits);
        for (var ci = 0; ci < numDigits; ++ci)
            dataArray.push(chars.charCodeAt(ci));
    }
    function toHex(num, numDigits) {
        return ('0000' + num.toString(16).toUpperCase()).slice(-numDigits);
    }
});
