/*
 * Driver for Samsung MDC compatible displays.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
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
    /**	Basic driver for sending keystrokes through a Global Caché iTach
        Ethernet IR sender.
    */
    var SamsungMDC = (function (_super) {
        __extends(SamsungMDC, _super);
        function SamsungMDC(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            socket.enableWakeOnLAN();
            socket.autoConnect(true);
            return _this;
        }
        Object.defineProperty(SamsungMDC.prototype, "power", {
            get: function () {
                return this.mPower;
            },
            set: function (on) {
                this.mPower = on;
                this.sendCommand(0x11, on ? 1 : 0);
                if (on)
                    this.socket.wakeOnLAN();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SamsungMDC.prototype, "input", {
            get: function () {
                return this.mInput;
            },
            set: function (input) {
                this.mInput = input;
                this.sendCommand(0x14, input);
            },
            enumerable: true,
            configurable: true
        });
        /**	Rudimentary command generator and sender, accepting a single
            command byte and an optional single param byte.
        */
        SamsungMDC.prototype.sendCommand = function (cmdByte, paramByte) {
            var cmd = [];
            cmd.push(0xAA); // Start of commanf marker (not part of checksum)
            cmd.push(cmdByte);
            cmd.push(0); // 0 is default. 0xFE targets ALL (can't make that work)
            if (paramByte !== undefined) {
                cmd.push(1);
                cmd.push(paramByte);
            }
            else
                cmd.push(0); // No param
            var checksum = 0;
            var count = cmd.length;
            for (var ix = 1; ix < count; ++ix)
                checksum += cmd[ix];
            cmd.push(checksum & 0xff);
            this.socket.sendBytes(cmd);
            console.log(cmd);
        };
        return SamsungMDC;
    }(Driver_1.Driver));
    __decorate([
        Metadata_1.property("Power on/off"),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], SamsungMDC.prototype, "power", null);
    __decorate([
        Metadata_1.property("Input (source) number. HDMI1=0x21. HDMI2=0x22"),
        Metadata_1.min(0x14), Metadata_1.max(0x40) // Somewhat arbitrary constraints
        ,
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], SamsungMDC.prototype, "input", null);
    SamsungMDC = __decorate([
        Metadata_1.driver('NetworkTCP', { port: 1515 }),
        __metadata("design:paramtypes", [Object])
    ], SamsungMDC);
    exports.SamsungMDC = SamsungMDC;
});
