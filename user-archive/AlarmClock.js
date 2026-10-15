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
exports.AlarmClock = void 0;
const Script_1 = require("../system_lib/Script");
const Metadata_1 = require("../system_lib/Metadata");
class AlarmClock extends Script_1.Script {
    mMinute = 0;
    mHour = 0;
    mAlarm = false;
    mTime = 0;
    constructor(env) {
        super(env);
        this.checkAlarmTime();
    }
    get hour() {
        return this.mHour;
    }
    set hour(value) {
        this.mHour = value;
    }
    get minute() {
        return this.mMinute;
    }
    set minute(value) {
        this.mMinute = value;
    }
    get alarm() {
        return this.mAlarm;
    }
    set alarm(value) {
        this.mAlarm = value;
    }
    getTime(unused) {
        return this.mTime;
    }
    checkAlarmTime() {
        wait(9000).then(() => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();
            this.mTime = now.getTime();
            this.alarm = hours === this.mHour && minutes === this.mMinute;
            this.checkAlarmTime();
        });
    }
}
exports.AlarmClock = AlarmClock;
__decorate([
    (0, Metadata_1.property)("Alarm time, hours"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(23),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], AlarmClock.prototype, "hour", null);
__decorate([
    (0, Metadata_1.property)("Alarm time, minutes"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(59),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], AlarmClock.prototype, "minute", null);
__decorate([
    (0, Metadata_1.property)("Alarm ringing", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], AlarmClock.prototype, "alarm", null);
__decorate([
    (0, Metadata_1.resource)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AlarmClock.prototype, "getTime", null);
