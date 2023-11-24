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
    exports.Week = void 0;
    var Week = exports.Week = (function (_super) {
        __extends(Week, _super);
        function Week(env) {
            var _this = _super.call(this, env) || this;
            _this.mWeek = 0;
            _this.mWeekIsEven = false;
            _this.mDayName = "";
            wait(100).then(function () { return _this.update(); });
            return _this;
        }
        Object.defineProperty(Week.prototype, "weekNumber", {
            get: function () {
                return this.mWeek;
            },
            set: function (t) {
                this.mWeek = t;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Week.prototype, "weekDay", {
            get: function () {
                return this.mDayName;
            },
            set: function (t) {
                this.mDayName = t;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Week.prototype, "evenWeekNumber", {
            get: function () {
                return this.mWeekIsEven;
            },
            set: function (t) {
                this.mWeekIsEven = t;
            },
            enumerable: false,
            configurable: true
        });
        Week.prototype.update = function () {
            var _this = this;
            var now = new Date();
            var week = this.iso8601WeekNumber(now);
            if (week !== this.mWeek) {
                this.weekNumber = week;
                this.evenWeekNumber = (week % 2 == 0);
            }
            this.weekDay = this.dayNameAsString(now);
            var nowUnixTime = now.valueOf();
            var midnight = new Date(nowUnixTime);
            midnight.setHours(24, 0, 0, 100);
            var msTillMidnight = midnight.valueOf() - now.valueOf();
            wait(msTillMidnight).then(function () { return _this.update(); });
        };
        Week.prototype.dayNameAsString = function (date) {
            var daysInWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            var dayIx = date.getDay();
            return daysInWeek[dayIx];
        };
        Week.prototype.iso8601WeekNumber = function (date) {
            var tdt = new Date(date.valueOf());
            var dayn = (date.getDay() + 6) % 7;
            tdt.setDate(tdt.getDate() - dayn + 3);
            var firstThursday = tdt.valueOf();
            tdt.setMonth(0, 1);
            if (tdt.getDay() !== 4)
                tdt.setMonth(0, 1 + ((4 - tdt.getDay()) + 7) % 7);
            return 1 + Math.ceil((firstThursday - tdt.valueOf()) / 604800000);
        };
        __decorate([
            (0, Metadata_1.property)("Current ISO8601 week number as number", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], Week.prototype, "weekNumber", null);
        __decorate([
            (0, Metadata_1.property)("Current day as string", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], Week.prototype, "weekDay", null);
        __decorate([
            (0, Metadata_1.property)("Current ISO8601 week is even", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], Week.prototype, "evenWeekNumber", null);
        return Week;
    }(Script_1.Script));
});
