var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BarcoE2 = void 0;
    var BarcoE2 = (function (_super) {
        __extends(BarcoE2, _super);
        function BarcoE2(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mLive = 0;
            socket.autoConnect();
            return _this;
        }
        BarcoE2.prototype.activatePreset = function (preset) {
            this.mLive = preset;
            return this.send(preset);
        };
        Object.defineProperty(BarcoE2.prototype, "live", {
            get: function () {
                return this.mLive;
            },
            set: function (preset) {
                this.activatePreset(preset);
            },
            enumerable: false,
            configurable: true
        });
        BarcoE2.prototype.send = function (preset) {
            return this.socket.sendText("PRESET -a " + preset);
        };
        __decorate([
            Metadata_1.callable("Load a preset into Program or Preview"),
            __param(0, Metadata_1.parameter("Preset number")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], BarcoE2.prototype, "activatePreset", null);
        __decorate([
            Metadata_1.property("Current live preset"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], BarcoE2.prototype, "live", null);
        BarcoE2 = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 9878 }),
            __metadata("design:paramtypes", [Object])
        ], BarcoE2);
        return BarcoE2;
    }(Driver_1.Driver));
    exports.BarcoE2 = BarcoE2;
});
