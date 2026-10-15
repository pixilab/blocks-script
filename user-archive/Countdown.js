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
exports.Countdown = void 0;
const Script_1 = require("../system_lib/Script");
const Metadata_1 = require("../system_lib/Metadata");
class Countdown extends Script_1.Script {
    mMinutes = 0;
    mSeconds = 0;
    mRunning = true;
    tickTimer;
    constructor(env) {
        super(env);
        env.subscribe('finish', () => {
            if (this.tickTimer)
                this.tickTimer.cancel();
        });
    }
    get minutes() {
        return padTwoDigits(this.mMinutes);
    }
    get seconds() {
        return padTwoDigits(this.mSeconds);
    }
    get zero() {
        return this.mMinutes === 0 && this.mSeconds === 0;
    }
    get running() {
        return this.mRunning;
    }
    set running(state) {
        if (this.mRunning !== state) {
            this.mRunning = state;
            this.manageTicking();
        }
    }
    shouldRunClock() {
        return this.mRunning && !this.zero;
    }
    start(minutes, seconds) {
        const wasZero = this.zero;
        this.setSeconds(Math.max(0, Math.min(59, Math.round(seconds))));
        this.setMinutes(Math.max(0, Math.min(60, Math.round(minutes))));
        this.notifyZero(wasZero);
        this.manageTicking();
    }
    setMinutes(val) {
        if (this.mMinutes !== val) {
            this.mMinutes = val;
            this.changed("minutes");
        }
        return val;
    }
    setSeconds(val) {
        if (this.mSeconds !== val) {
            this.mSeconds = val;
            this.changed("seconds");
        }
        return val;
    }
    notifyZero(wasZero) {
        const isZero = this.zero;
        if (wasZero !== isZero)
            this.changed("zero");
        return isZero;
    }
    manageTicking() {
        if (this.tickTimer) {
            this.tickTimer.cancel();
            this.tickTimer = undefined;
        }
        if (this.shouldRunClock()) {
            this.tickTimer = wait(1000);
            this.tickTimer.then(() => this.nextTick());
        }
    }
    nextTick() {
        this.tickTimer = undefined;
        var seconds = this.mSeconds;
        var minutes = this.mMinutes;
        if (--seconds === -1) {
            if (--minutes === -1)
                seconds = minutes = 0;
            else
                seconds = 59;
        }
        this.setSeconds(seconds);
        this.setMinutes(minutes);
        this.notifyZero(false);
        this.manageTicking();
    }
}
exports.Countdown = Countdown;
__decorate([
    (0, Metadata_1.property)("Number of minutes remaining (always 2 digits)"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], Countdown.prototype, "minutes", null);
__decorate([
    (0, Metadata_1.property)("Number of seconds remaining (always 2 digits)"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], Countdown.prototype, "seconds", null);
__decorate([
    (0, Metadata_1.property)("True when the timer is at time zero"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [])
], Countdown.prototype, "zero", null);
__decorate([
    (0, Metadata_1.property)("Countdown is running (true) or paused (false)"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], Countdown.prototype, "running", null);
__decorate([
    (0, Metadata_1.callable)("Start countdown from specified time"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], Countdown.prototype, "start", null);
function padTwoDigits(val) {
    var result = val.toString();
    if (result.length < 2)
        result = '0' + result;
    return result;
}
