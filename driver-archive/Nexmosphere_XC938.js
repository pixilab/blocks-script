var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
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
define(["require", "exports", "../system_lib/Metadata", "./NexmosphereBase"], function (require, exports, Metadata_1, NexmosphereBase_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Nexmosphere_XC938 = void 0;
    var kNumInterfaces = 4;
    var Nexmosphere_XC938 = (function (_super) {
        __extends(Nexmosphere_XC938, _super);
        function Nexmosphere_XC938(port) {
            var _this = _super.call(this, port, kNumInterfaces) || this;
            _this.specialInterfaces = [
                ["RGBW", 5],
                ["Opticalx4", 115]
            ];
            _this.initConnection(port);
            _this.addBuiltInInterfaces(_this.specialInterfaces);
            return _this;
        }
        Nexmosphere_XC938.prototype.considerConnected = function () {
            return this.port.connected;
        };
        Nexmosphere_XC938 = __decorate([
            (0, Metadata_1.driver)('NetworkTCP', { port: 4001 }),
            (0, Metadata_1.driver)('SerialPort', { baudRate: 115200 }),
            __metadata("design:paramtypes", [Object])
        ], Nexmosphere_XC938);
        return Nexmosphere_XC938;
    }(NexmosphereBase_1.NexmosphereBase));
    exports.Nexmosphere_XC938 = Nexmosphere_XC938;
});
