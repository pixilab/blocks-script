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
exports.NamedMultiTimer = void 0;
const Script_1 = require("../system_lib/Script");
const ScriptBase_1 = require("../system_lib/ScriptBase");
const Metadata_1 = require("../system_lib/Metadata");
class NamedMultiTimer extends Script_1.Script {
    timers;
    constructor(scriptFacade) {
        super(scriptFacade);
        this.timers = this.namedAggregateProperty('timers', Timer);
    }
    addTimer(name, countBackwards, startTime) {
        if (this.timers[name] !== undefined)
            this.timers[name].discard();
        if (typeof startTime === 'string')
            startTime = TimeFlow.stringToMillis(startTime);
        if (countBackwards && (!startTime || startTime <= 0))
            throw "startTime must be > 0 when running countBackwards";
        if (!startTime || startTime < 0)
            startTime = 0;
        this.timers[name] = new Timer(name, countBackwards, startTime);
    }
    reinit() {
        this.reInitialize();
    }
}
exports.NamedMultiTimer = NamedMultiTimer;
__decorate([
    (0, Metadata_1.callable)("Append a new timer to 'timers'"),
    __param(0, (0, Metadata_1.parameter)("Name of the timer.")),
    __param(1, (0, Metadata_1.parameter)("Initial direction Defaults to false for count up.", true)),
    __param(2, (0, Metadata_1.parameter)("Initial time in milliseconds as number, timeflow or string (hh:mm:ss). Must be > 0 for a countdown timer.", true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean, Number]),
    __metadata("design:returntype", void 0)
], NamedMultiTimer.prototype, "addTimer", null);
__decorate([
    (0, Metadata_1.callable)("Reinit script"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NamedMultiTimer.prototype, "reinit", null);
class Timer extends ScriptBase_1.AggregateElem {
    name;
    startTimeMs;
    runRate;
    mTime;
    mRun = false;
    mReset = false;
    stopTimer;
    constructor(name, backwards, startTimeMs = 0) {
        super();
        this.name = name;
        this.startTimeMs = startTimeMs;
        this.runRate = backwards ? -1 : 1;
        this.mTime = new TimeFlow(startTimeMs, 0);
    }
    get timerName() {
        return this.name;
    }
    get countdown() {
        return this.runRate < 0;
    }
    set countdown(value) {
        const newRate = value ? -1 : 1;
        if (newRate !== this.runRate) {
            let currentRunState = this.run;
            if (currentRunState)
                this.run = false;
            this.runRate = newRate;
            this.run = currentRunState;
        }
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
    (0, Metadata_1.property)("Timer name"),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [])
], Timer.prototype, "timerName", null);
__decorate([
    (0, Metadata_1.property)("Timer count backwards, false = countup"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], Timer.prototype, "countdown", null);
__decorate([
    (0, Metadata_1.property)("Set momentarily to reset the time to initial value"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], Timer.prototype, "reset", null);
__decorate([
    (0, Metadata_1.property)("The current time position (as a TimeFlow, number in millis or string e.g. 'm:ss.t')"),
    __metadata("design:type", TimeFlow),
    __metadata("design:paramtypes", [TimeFlow])
], Timer.prototype, "time", null);
__decorate([
    (0, Metadata_1.property)("Time is runnung (vs paused)"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], Timer.prototype, "run", null);
