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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiTimer = void 0;
const Script_1 = require("../system_lib/Script");
const ScriptBase_1 = require("../system_lib/ScriptBase");
const Metadata_1 = require("../system_lib/Metadata");
class MultiTimer extends Script_1.Script {
    timer;
    constructor(scriptFacade) {
        super(scriptFacade);
        this.timer = this.indexedProperty('timer', Timer);
    }
    addTimer(countBackwards, startTime) {
        if (typeof startTime === 'string')
            startTime = TimeFlow.stringToMillis(startTime);
        if (countBackwards && (!startTime || startTime <= 0))
            throw "startTime must be > 0 when running countBackwards";
        if (!startTime || startTime < 0)
            startTime = 0;
        this.timer.push(new Timer(countBackwards, startTime));
    }
    clear() {
        for (var ix = 0; ix < this.timer.length; ++ix)
            this.timer[ix].discard();
        this.timer.remove(0, this.timer.length);
    }
}
exports.MultiTimer = MultiTimer;
__decorate([
    (0, Metadata_1.callable)("Append a timer to my list"),
    __param(0, (0, Metadata_1.parameter)("Creates a countdown timer if true.")),
    __param(1, (0, Metadata_1.parameter)("Milliseconds. Must be > 0 for a countdown timer.", true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean, Number]),
    __metadata("design:returntype", void 0)
], MultiTimer.prototype, "addTimer", null);
__decorate([
    (0, Metadata_1.callable)("Removes all timers, letting you start over with new addTimer calls"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MultiTimer.prototype, "clear", null);
class Timer extends ScriptBase_1.AggregateElem {
    startTimeMs;
    runRate;
    mTime;
    mRun = false;
    mReset = false;
    stopTimer;
    constructor(backwards, startTimeMs = 0) {
        super();
        this.startTimeMs = startTimeMs;
        this.runRate = backwards ? -1 : 1;
        this.mTime = new TimeFlow(startTimeMs, 0);
    }
    get countdown() {
        return this.runRate < 0;
    }
    get reset() { return this.mReset; }
    set reset(value) {
        this.run = false;
        this.mReset = value;
        if (value)
            this.time = new TimeFlow(this.startTimeMs, 0);
    }
    get time() { return this.mTime; }
    set time(value) {
        if (typeof value === 'string')
            value = new TimeFlow(TimeFlow.stringToMillis(value), 0);
        else if (typeof value === 'number')
            value = new TimeFlow(value, 0);
        if (!value.rate && this.mRun)
            this.run = false;
        this.mTime = value;
    }
    get run() { return this.mRun; }
    set run(doRun) {
        if (this.mRun !== doRun) {
            const currTime = this.mTime.currentTime;
            if (doRun) {
                if (this.runRate < 0) {
                    if (currTime <= 0)
                        throw "Timer already at zero";
                    if (this.runRate < 0) {
                        this.cancelStopTimer();
                        this.stopTimer = wait(currTime);
                        this.stopTimer.then(() => {
                            this.run = false;
                            this.time = new TimeFlow(0, 0);
                        });
                    }
                }
            }
            else
                this.cancelStopTimer();
            this.mTime = new TimeFlow(currTime, doRun ? this.runRate : 0);
            this.changed('time');
            this.mRun = doRun;
        }
    }
    cancelStopTimer() {
        if (this.stopTimer) {
            this.stopTimer.cancel();
            this.stopTimer = undefined;
        }
    }
    discard() {
        this.cancelStopTimer();
    }
}
__decorate([
    (0, Metadata_1.property)("Timer count backwards"),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [])
], Timer.prototype, "countdown", null);
__decorate([
    (0, Metadata_1.property)("Set momentarily to reset the time to initial value"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], Timer.prototype, "reset", null);
__decorate([
    (0, Metadata_1.property)("The current time position"),
    __metadata("design:type", TimeFlow),
    __metadata("design:paramtypes", [TimeFlow])
], Timer.prototype, "time", null);
__decorate([
    (0, Metadata_1.property)("Time is runnung (vs paused)"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], Timer.prototype, "run", null);
