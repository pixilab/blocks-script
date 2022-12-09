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
define(["require", "exports", "system_lib/Metadata", "system_lib/Script"], function (require, exports, Metadata_1, Script_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SunAngle = void 0;
    var suncalc = require("lib/suncalc");
    var SunAngle = (function (_super) {
        __extends(SunAngle, _super);
        function SunAngle(env) {
            var _this = _super.call(this, env) || this;
            _this.mLat = 58.41086;
            _this.mLong = 15.62157;
            asap(function () { return _this.update(); });
            return _this;
        }
        SunAngle.prototype.update = function () {
            var _this = this;
            var pos = suncalc.getPosition(new Date(), this.mLat, this.mLong);
            this.altitude = pos.altitude / (Math.PI / 2);
            this.azimuth = pos.azimuth / (Math.PI * 3 / 4);
            wait(SunAngle.kMinuteMillis).then(function () { return _this.update(); });
        };
        Object.defineProperty(SunAngle.prototype, "latitude", {
            get: function () {
                return this.mLat;
            },
            set: function (value) {
                this.mLat = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SunAngle.prototype, "longitude", {
            get: function () {
                return this.mLong;
            },
            set: function (value) {
                this.mLong = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SunAngle.prototype, "altitude", {
            get: function () {
                return this.mAltitude;
            },
            set: function (value) {
                this.mAltitude = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SunAngle.prototype, "azimuth", {
            get: function () {
                return this.mAzimuth;
            },
            set: function (value) {
                this.mAzimuth = value;
            },
            enumerable: false,
            configurable: true
        });
        SunAngle.kMinuteMillis = 1000 * 60;
        __decorate([
            (0, Metadata_1.property)("World location latitude"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], SunAngle.prototype, "latitude", null);
        __decorate([
            (0, Metadata_1.property)("World location longitude"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], SunAngle.prototype, "longitude", null);
        __decorate([
            (0, Metadata_1.property)("Normalized sun altitude", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], SunAngle.prototype, "altitude", null);
        __decorate([
            (0, Metadata_1.property)("Normalized sun azimuth", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], SunAngle.prototype, "azimuth", null);
        return SunAngle;
    }(Script_1.Script));
    exports.SunAngle = SunAngle;
});
