"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Week = void 0;
const Script_1 = require("../system_lib/Script");
const Metadata_1 = require("../system_lib/Metadata");
class Week extends Script_1.Script {
    mWeek = 0;
    mWeekIsEven = false;
    mDayName = "";
    constructor(env) {
        super(env);
        wait(100).then(() => this.update());
    }
    get weekNumber() {
        return this.mWeek;
    }
    set weekNumber(t) {
        this.mWeek = t;
    }
    get weekDay() {
        return this.mDayName;
    }
    set weekDay(t) {
        this.mDayName = t;
    }
    get evenWeekNumber() {
        return this.mWeekIsEven;
    }
    set evenWeekNumber(t) {
        this.mWeekIsEven = t;
    }
    update() {
        let now = new Date();
        let week = this.iso8601WeekNumber(now);
        if (week !== this.mWeek) {
            this.weekNumber = week;
            this.evenWeekNumber = (week % 2 == 0);
        }
        this.weekDay = this.dayNameAsString(now);
        const nowUnixTime = now.valueOf();
        var midnight = new Date(nowUnixTime);
        midnight.setHours(24, 0, 0, 100);
        const msTillMidnight = midnight.valueOf() - now.valueOf();
        wait(msTillMidnight).then(() => this.update());
    }
    dayNameAsString(date) {
        const daysInWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayIx = date.getDay();
        return daysInWeek[dayIx];
    }
    iso8601WeekNumber(date) {
        let tdt = new Date(date.valueOf());
        let dayn = (date.getDay() + 6) % 7;
        tdt.setDate(tdt.getDate() - dayn + 3);
        let firstThursday = tdt.valueOf();
        tdt.setMonth(0, 1);
        if (tdt.getDay() !== 4)
            tdt.setMonth(0, 1 + ((4 - tdt.getDay()) + 7) % 7);
        return 1 + Math.ceil((firstThursday - tdt.valueOf()) / 604800000);
    }
}
exports.Week = Week;
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
