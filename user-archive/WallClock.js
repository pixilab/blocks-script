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
exports.WallClock = void 0;
const Script_1 = require("../system_lib/Script");
const Metadata_1 = require("../system_lib/Metadata");
class WallClock extends Script_1.Script {
    mClockTime = "0:00";
    mYear = 0;
    mMonth = 0;
    mDate = 0;
    mFullDate = "";
    constructor(env) {
        super(env);
        wait(100).then(() => this.updateClock());
    }
    get currentTime() { return this.mClockTime; }
    set currentTime(t) { this.mClockTime = t; }
    get year() { return this.mYear; }
    set year(value) { this.mYear = value; }
    get month() { return this.mMonth; }
    set month(value) { this.mMonth = value; }
    get date() { return this.mDate; }
    set date(value) { this.mDate = value; }
    get fullDate() { return this.mFullDate; }
    set fullDate(value) { this.mFullDate = value; }
    updateClock() {
        const now = new Date();
        const hour = now.getHours().toString();
        const min = now.getMinutes();
        this.currentTime = hour + ':' + padTwoDigits(min);
        var year = now.getFullYear();
        this.year = year;
        var month = now.getMonth() + 1;
        this.month = month;
        var date = now.getDate();
        this.date = date;
        this.fullDate = year + '-' + padTwoDigits(month) + '-' + padTwoDigits(date);
        wait(20 * 1000).then(() => this.updateClock());
    }
}
exports.WallClock = WallClock;
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
function padTwoDigits(val) {
    var result = val.toString();
    if (result.length < 2)
        result = '0' + result;
    return result;
}
