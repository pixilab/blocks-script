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
    exports.AtlonaHDVS210U = void 0;
    var AtlonaHDVS210U = (function (_super) {
        __extends(AtlonaHDVS210U, _super);
        function AtlonaHDVS210U(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            socket.autoConnect();
            return _this;
        }
        Object.defineProperty(AtlonaHDVS210U.prototype, "selectInput", {
            get: function () {
                return this.input;
            },
            set: function (inp) {
                this.input = inp;
                this.inputnumber = inp ? 1 : 0;
                var cmd = "x" + (this.inputnumber + 1) + "AVx1";
                this.sendCmd(cmd);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AtlonaHDVS210U.prototype, "autoSwitch", {
            get: function () {
                return this.autoswitch;
            },
            set: function (on) {
                this.autoswitch = on;
                var cmd = "AutoSW " + (on ? "on" : "off");
                this.sendCmd(cmd);
            },
            enumerable: false,
            configurable: true
        });
        AtlonaHDVS210U.prototype.sendCmd = function (cmd) {
            this.socket.sendText(cmd);
        };
        __decorate([
            Metadata_1.property("true = HDMI, false = USB-C"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], AtlonaHDVS210U.prototype, "selectInput", null);
        __decorate([
            Metadata_1.property("Auto-switching mode"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], AtlonaHDVS210U.prototype, "autoSwitch", null);
        AtlonaHDVS210U = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 23 }),
            __metadata("design:paramtypes", [Object])
        ], AtlonaHDVS210U);
        return AtlonaHDVS210U;
    }(Driver_1.Driver));
    exports.AtlonaHDVS210U = AtlonaHDVS210U;
});
