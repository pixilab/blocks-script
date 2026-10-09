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
exports.UpAndDownTimer = void 0;
const Script_1 = require("../system_lib/Script");
const Metadata_1 = require("../system_lib/Metadata");
class UpAndDownTimer extends Script_1.Script {
    mMinutes = 0;
    mSeconds = 0;
    mTenths = 0;
    mRunning = true;
    tickTimer;
    tickDown = true;
    mToMinutes = 0;
    mToSeconds = 0;
    mToTenths = 0;
    mTimerStarted = 0;
    mCountTicks = 0;
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
    get tenths() {
        return this.mTenths.toString();
    }
    get time() {
        return this.minutes + ":" + padTwoDigits(this.seconds) + "." + this.tenths;
    }
    get ticks() {
        return this.mCountTicks;
    }
    set ticks(val) {
        this.mCountTicks = val;
    }
    get done() {
        if (this.tickDown)
            return this.mMinutes === 0 && this.mSeconds === 0 && this.mTenths === 0;
        else
            return this.mMinutes === this.mToMinutes && this.mSeconds === this.mToSeconds && this.mTenths === this.mToTenths;
    }
    get running() {
        return this.mRunning;
    }
    set running(state) {
        if (this.mRunning !== state) {
            console.log("Timer running: " + state);
            this.mRunning = state;
            if (this.mRunning) {
                this.mTimerStarted = Date.now() - this.ticks * 100;
            }
            this.manageTicking();
        }
    }
    shouldRunClock() {
        return this.mRunning && !this.done;
    }
    startDown(minutes, seconds, tenths) {
        this.tickDown = true;
        this.mTimerStarted = Date.now();
        this.ticks = 0;
        this.setSeconds(Math.max(0, Math.min(59, Math.round(seconds))));
        this.setMinutes(Math.max(0, Math.min(60, Math.round(minutes))));
        this.setTenths(Math.max(0, Math.min(9, Math.round(tenths))));
        this.changed("done");
        this.running = true;
        this.manageTicking();
    }
    startUp(minutes, seconds, tenths) {
        this.tickDown = false;
        this.mTimerStarted = Date.now();
        this.ticks = 0;
        this.mToMinutes = Math.max(0, Math.min(60, Math.round(minutes)));
        this.mToSeconds = Math.max(0, Math.min(59, Math.round(seconds)));
        this.mToTenths = Math.max(0, Math.min(9, Math.round(tenths)));
        this.setMinutes(0);
        this.setSeconds(0);
        this.setTenths(0);
        this.changed("done");
        this.running = true;
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
    setTenths(val) {
        if (this.mTenths !== val) {
            this.mTenths = val;
            this.changed("tenths");
            this.changed("time");
        }
        return val;
    }
    notifyDone(wasDone) {
        const isDone = this.done;
        if (wasDone !== isDone) {
            if (this.done) {
                console.log("Timer done! " + this.ticks + " ticks");
                console.log(((Date.now() - this.mTimerStarted) / this.ticks) + " ms/tick");
                console.log("total diff: " + (Date.now() - this.mTimerStarted - this.ticks * 100) + "ms");
            }
            this.changed("done");
        }
        return isDone;
    }
    manageTicking() {
        if (this.tickTimer) {
            this.tickTimer.cancel();
            this.tickTimer = undefined;
        }
        if (this.shouldRunClock()) {
            this.tickTimer = wait(this.getWaitTime());
            this.ticks++;
            if (this.tickDown)
                this.tickTimer.then(() => this.nextTickDown());
            else
                this.tickTimer.then(() => this.nextTickUp());
        }
    }
    getWaitTime() {
        let timeNow = Date.now();
        let totalMilliseconds = timeNow - this.mTimerStarted;
        let shouldHaveMilliseconds = this.ticks * 100;
        let timeDiff = totalMilliseconds - shouldHaveMilliseconds;
        timeDiff = Math.min(100, Math.max(0, timeDiff));
        return 100 - timeDiff;
    }
    nextTickDown() {
        this.tickTimer = undefined;
        var seconds = this.mSeconds;
        var minutes = this.mMinutes;
        var tenths = this.mTenths;
        if (--tenths === -1) {
            tenths = 9;
            if (--seconds === -1) {
                seconds = 59;
                if (--minutes === -1) {
                    seconds = minutes = tenths = 0;
                }
            }
            else {
            }
        }
        this.setSeconds(seconds);
        this.setMinutes(minutes);
        this.setTenths(tenths);
        this.notifyDone(false);
        this.manageTicking();
    }
    nextTickUp() {
        this.tickTimer = undefined;
        var seconds = this.mSeconds;
        var minutes = this.mMinutes;
        var tenths = this.mTenths;
        if (++tenths === 10) {
            tenths = 0;
            if (++seconds === 60) {
                seconds = 0;
                ++minutes;
            }
        }
        this.setSeconds(seconds);
        this.setMinutes(minutes);
        this.setTenths(tenths);
        this.notifyDone(false);
        this.manageTicking();
    }
}
exports.UpAndDownTimer = UpAndDownTimer;
__decorate([
    (0, Metadata_1.property)("Number of minutes remaining (always 2 digits)"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], UpAndDownTimer.prototype, "minutes", null);
__decorate([
    (0, Metadata_1.property)("Number of seconds remaining (always 2 digits)"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], UpAndDownTimer.prototype, "seconds", null);
__decorate([
    (0, Metadata_1.property)("Number of tenths remaining (always 1 digit)"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], UpAndDownTimer.prototype, "tenths", null);
__decorate([
    (0, Metadata_1.property)("Current time as a string in format m:ss.t"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], UpAndDownTimer.prototype, "time", null);
__decorate([
    (0, Metadata_1.property)("Number of ticks", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], UpAndDownTimer.prototype, "ticks", null);
__decorate([
    (0, Metadata_1.property)("True when the timer is at time done"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [])
], UpAndDownTimer.prototype, "done", null);
__decorate([
    (0, Metadata_1.property)("Countdown is running (true) or paused (false)"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], UpAndDownTimer.prototype, "running", null);
__decorate([
    (0, Metadata_1.callable)("Start countdown from specified time"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number]),
    __metadata("design:returntype", void 0)
], UpAndDownTimer.prototype, "startDown", null);
__decorate([
    (0, Metadata_1.callable)("Start upcount from specified time"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number]),
    __metadata("design:returntype", void 0)
], UpAndDownTimer.prototype, "startUp", null);
function padTwoDigits(val) {
    var result = val.toString();
    if (result.length < 2)
        result = '0' + result;
    return result;
}
