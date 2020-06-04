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
    exports.SamsungMDCBasic = void 0;
    var SamsungMDCBasic = (function (_super) {
        __extends(SamsungMDCBasic, _super);
        function SamsungMDCBasic(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mId = 0;
            _this.mPower = false;
            _this.mInput = 0x14;
            _this.mVolume = 0.5;
            socket.enableWakeOnLAN();
            socket.autoConnect(true);
            return _this;
        }
        Object.defineProperty(SamsungMDCBasic.prototype, "id", {
            get: function () {
                return this.mId;
            },
            set: function (id) {
                this.mId = id;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SamsungMDCBasic.prototype, "power", {
            get: function () {
                return this.mPower;
            },
            set: function (on) {
                this.mPower = on;
                this.sendCommand(0x11, on ? 1 : 0);
                if (on)
                    this.socket.wakeOnLAN();
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SamsungMDCBasic.prototype, "volume", {
            get: function () {
                return this.mVolume;
            },
            set: function (volume) {
                volume = Math.max(0, Math.min(1, volume));
                this.mVolume = volume;
                this.sendCommand(0x12, Math.round(volume * 100));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SamsungMDCBasic.prototype, "input", {
            get: function () {
                return this.mInput;
            },
            set: function (input) {
                this.mInput = input;
                this.sendCommand(0x14, input);
            },
            enumerable: false,
            configurable: true
        });
        SamsungMDCBasic.prototype.sendCommand = function (cmdByte, paramByte) {
            var cmd = [];
            cmd.push(0xAA);
            cmd.push(cmdByte);
            cmd.push(this.mId);
            if (paramByte !== undefined) {
                cmd.push(1);
                cmd.push(paramByte);
            }
            else
                cmd.push(0);
            var checksum = 0;
            var count = cmd.length;
            for (var ix = 1; ix < count; ++ix)
                checksum += cmd[ix];
            cmd.push(checksum & 0xff);
            this.socket.sendBytes(cmd);
            console.log(cmd);
        };
        __decorate([
            Metadata_1.property("The target ID"),
            Metadata_1.min(0),
            Metadata_1.max(254),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], SamsungMDCBasic.prototype, "id", null);
        __decorate([
            Metadata_1.property("Power on/off"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], SamsungMDCBasic.prototype, "power", null);
        __decorate([
            Metadata_1.property("Volume level, normalized 0...1"),
            Metadata_1.min(0),
            Metadata_1.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], SamsungMDCBasic.prototype, "volume", null);
        __decorate([
            Metadata_1.property("Input (source) number. HDMI1=0x21. HDMI2=0x22"),
            Metadata_1.min(0x14),
            Metadata_1.max(0x40),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], SamsungMDCBasic.prototype, "input", null);
        SamsungMDCBasic = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 1515 }),
            __metadata("design:paramtypes", [Object])
        ], SamsungMDCBasic);
        return SamsungMDCBasic;
    }(Driver_1.Driver));
    exports.SamsungMDCBasic = SamsungMDCBasic;
});
