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
define(["require", "exports", "system_lib/Script", "system_lib/Metadata"], function (require, exports, Script_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WallClock = void 0;
    var WallClock = exports.WallClock = (function (_super) {
        __extends(WallClock, _super);
        function WallClock(env) {
            var _this = _super.call(this, env) || this;
            _this.mClockTime = "0:00";
            _this.mYear = 0;
            _this.mMonth = 0;
            _this.mDate = 0;
            _this.mFullDate = "";
            wait(100).then(function () { return _this.updateClock(); });
            return _this;
        }
        Object.defineProperty(WallClock.prototype, "currentTime", {
            get: function () { return this.mClockTime; },
            set: function (t) { this.mClockTime = t; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(WallClock.prototype, "year", {
            get: function () { return this.mYear; },
            set: function (value) { this.mYear = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(WallClock.prototype, "month", {
            get: function () { return this.mMonth; },
            set: function (value) { this.mMonth = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(WallClock.prototype, "date", {
            get: function () { return this.mDate; },
            set: function (value) { this.mDate = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(WallClock.prototype, "fullDate", {
            get: function () { return this.mFullDate; },
            set: function (value) { this.mFullDate = value; },
            enumerable: false,
            configurable: true
        });
        WallClock.prototype.updateClock = function () {
            var _this = this;
            var now = new Date();
            var hour = now.getHours().toString();
            var min = now.getMinutes();
            this.currentTime = hour + ':' + padTwoDigits(min);
            var year = now.getFullYear();
            this.year = year;
            var month = now.getMonth() + 1;
            this.month = month;
            var date = now.getDate();
            this.date = date;
            this.fullDate = year + '-' + padTwoDigits(month) + '-' + padTwoDigits(date);
            wait(20 * 1000).then(function () { return _this.updateClock(); });
        };
        __decorate([
            (0, Metadata_1.property)("Time of day, as H:MM", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], WallClock.prototype, "currentTime", null);
        __decorate([
            (0, Metadata_1.property)("Year; e.g. 2024", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], WallClock.prototype, "year", null);
        __decorate([
            (0, Metadata_1.property)("Month, 1-based", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], WallClock.prototype, "month", null);
        __decorate([
            (0, Metadata_1.property)("Day of month, 1-based", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], WallClock.prototype, "date", null);
        __decorate([
            (0, Metadata_1.property)("Full date, in ISO format, e.g. 2024-05-23", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], WallClock.prototype, "fullDate", null);
        return WallClock;
    }(Script_1.Script));
    function padTwoDigits(val) {
        var result = val.toString();
        if (result.length < 2)
            result = '0' + result;
        return result;
    }
});
