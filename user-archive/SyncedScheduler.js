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
exports.SyncedScheduler = void 0;
const Script_1 = require("../system_lib/Script");
const Metadata_1 = require("../system_lib/Metadata");
const Realm_1 = require("../system/Realm");
class SyncedScheduler extends Script_1.Script {
    targetRealm = "";
    targetGroup = "";
    cues = [];
    nextCueIx = 0;
    nextCueWait;
    timePropAccessor;
    lastTime;
    constructor(env) {
        super(env);
        this.lastTime = new TimeFlow(0, 0);
    }
    initialize(realm, group, timeProp) {
        if (!Realm_1.Realm[realm].group[group])
            throw "No such realm/group name";
        this.targetRealm = realm;
        this.targetGroup = group;
        this.cues = [];
        this.cancelNextCue();
        if (this.timePropAccessor)
            this.timePropAccessor.close();
        this.timePropAccessor = this.getProperty(timeProp, newValue => this.handleTimeUpdate(newValue));
    }
    schedule(time, taskName) {
        const prevTime = this.cues.length ? this.cues[0].time : 0;
        const added = new Cue(time, taskName);
        this.cues.push(added);
        if (added.time < prevTime)
            this.cues.sort((lhs, rhs) => lhs.time - rhs.time);
        if (this.lastTime.rate > 0)
            this.scheduleCue();
    }
    get time() { return this.lastTime; }
    set time(newTime) { this.lastTime = newTime; }
    handleTimeUpdate(newTime) {
        const newRunning = newTime.rate > 0;
        const newTimeTime = newTime.currentTime;
        const last = this.lastTime;
        if (newRunning !== (last.rate > 0)) {
            if (!newRunning)
                this.cancelNextCue();
            else
                this.scheduleCue(newTime);
        }
        else if (newRunning) {
            if (newTime.position < last.position)
                this.scheduleCue(newTime);
            else {
                const nextCueAt = this.nextCueTime();
                if (nextCueAt !== undefined && (newTimeTime - nextCueAt) > 1500)
                    this.scheduleCue(newTime);
                else {
                    const absDelta = Math.abs(newTimeTime - last.currentTime);
                    if (absDelta > 80) {
                        console.warn("Time glitched", absDelta);
                        this.scheduleCue(newTime);
                    }
                }
            }
        }
        this.time = new TimeFlow(newTimeTime, newTime.rate, newTime.end, newTime.dead);
    }
    scheduleCue(timeFlow) {
        this.cancelNextCue();
        timeFlow = timeFlow || this.lastTime;
        const timeNow = timeFlow.currentTime;
        var pos = bSearch(this.cues, "time", timeNow);
        if (pos >= 0)
            this.nextCueIx = pos;
        else
            this.nextCueIx = ~pos;
        this.scheduleNextCue(timeNow, timeFlow);
    }
    scheduleNextCue(timeNow, flow) {
        const atTime = this.nextCueTime();
        if (atTime !== undefined) {
            const toWait = Math.max(10, atTime - timeNow * (1 / flow.rate) + 10);
            this.nextCueWait = wait(toWait);
            this.nextCueWait.then(() => this.runCues(this.lastTime.currentTime));
        }
        this.nextCueWait = undefined;
    }
    runCues(timeNow) {
        while (this.moreCues() && this.nextCueTime() < timeNow) {
            const cue = this.cues[this.nextCueIx++];
            Realm_1.Realm[this.targetRealm].group[this.targetGroup][cue.taskName].running = true;
        }
        this.scheduleNextCue(timeNow, this.lastTime);
    }
    cancelNextCue() {
        if (this.nextCueWait) {
            this.nextCueWait.cancel();
            this.nextCueWait = undefined;
        }
    }
    nextCueTime() {
        const cue = this.cues[this.nextCueIx];
        return cue ? cue.time : undefined;
    }
    moreCues() {
        return this.nextCueIx < this.cues.length;
    }
}
exports.SyncedScheduler = SyncedScheduler;
__decorate([
    (0, Metadata_1.callable)("Specify target realm and group and clear all cues"),
    __param(0, (0, Metadata_1.parameter)("Name of Realm in which tasks to trigger is found")),
    __param(1, (0, Metadata_1.parameter)("Name of Group in which tasks to trigger is found")),
    __param(2, (0, Metadata_1.parameter)("Full path to time property used as sync source")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], SyncedScheduler.prototype, "initialize", null);
__decorate([
    (0, Metadata_1.callable)("Specify a Task to run and when to start it relative to my synch source"),
    __param(0, (0, Metadata_1.parameter)('The time position, as a string, e.g., "3:12.533"')),
    __param(1, (0, Metadata_1.parameter)("Name of the Task to trigger at that time")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SyncedScheduler.prototype, "schedule", null);
__decorate([
    (0, Metadata_1.property)("Current time of synchronization source", true),
    __metadata("design:type", TimeFlow),
    __metadata("design:paramtypes", [TimeFlow])
], SyncedScheduler.prototype, "time", null);
class Cue {
    time;
    taskName;
    constructor(timeStr, taskName) {
        this.time = TimeFlow.stringToMillis(timeStr);
        this.taskName = taskName;
    }
}
function bSearch(arr, compOrProp, sought) {
    var minIndex = 0;
    var maxIndex = arr.length - 1;
    var ix;
    const propName = compOrProp;
    if (compOrProp === undefined)
        compOrProp = 'name';
    const compFun = (typeof compOrProp === 'function') ? compOrProp : defaultCompFun;
    while (minIndex <= maxIndex) {
        ix = (minIndex + maxIndex) / 2 | 0;
        var compResult = compFun(arr[ix]);
        if (compResult < 0)
            minIndex = ix + 1;
        else if (compResult > 0)
            maxIndex = ix - 1;
        else
            return ix;
    }
    return ~Math.max(minIndex, maxIndex);
    function defaultCompFun(lhs) {
        const item = lhs[propName];
        if (item < sought)
            return -1;
        else if (item > sought)
            return 1;
        return 0;
    }
}
