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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
define(["require", "exports", "../system_lib/Script", "../system_lib/Metadata", "../system/Realm"], function (require, exports, Script_1, Metadata_1, Realm_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SyncedScheduler = void 0;
    var SyncedScheduler = exports.SyncedScheduler = (function (_super) {
        __extends(SyncedScheduler, _super);
        function SyncedScheduler(env) {
            var _this = _super.call(this, env) || this;
            _this.targetRealm = "";
            _this.targetGroup = "";
            _this.cues = [];
            _this.nextCueIx = 0;
            _this.lastTime = new TimeFlow(0, 0);
            return _this;
        }
        SyncedScheduler.prototype.initialize = function (realm, group, timeProp) {
            var _this = this;
            if (!Realm_1.Realm[realm].group[group])
                throw "No such realm/group name";
            this.targetRealm = realm;
            this.targetGroup = group;
            this.cues = [];
            this.cancelNextCue();
            if (this.timePropAccessor)
                this.timePropAccessor.close();
            this.timePropAccessor = this.getProperty(timeProp, function (newValue) {
                return _this.handleTimeUpdate(newValue);
            });
        };
        SyncedScheduler.prototype.schedule = function (time, taskName) {
            var prevTime = this.cues.length ? this.cues[0].time : 0;
            var added = new Cue(time, taskName);
            this.cues.push(added);
            if (added.time < prevTime)
                this.cues.sort(function (lhs, rhs) { return lhs.time - rhs.time; });
            if (this.lastTime.rate > 0)
                this.scheduleCue();
        };
        Object.defineProperty(SyncedScheduler.prototype, "time", {
            get: function () { return this.lastTime; },
            set: function (newTime) { this.lastTime = newTime; },
            enumerable: false,
            configurable: true
        });
        SyncedScheduler.prototype.handleTimeUpdate = function (newTime) {
            var newRunning = newTime.rate > 0;
            var newTimeTime = newTime.currentTime;
            var last = this.lastTime;
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
                    var nextCueAt = this.nextCueTime();
                    if (nextCueAt !== undefined && (newTimeTime - nextCueAt) > 1500)
                        this.scheduleCue(newTime);
                    else {
                        var absDelta = Math.abs(newTimeTime - last.currentTime);
                        if (absDelta > 80) {
                            console.warn("Time glitched", absDelta);
                            this.scheduleCue(newTime);
                        }
                    }
                }
            }
            this.time = new TimeFlow(newTimeTime, newTime.rate, newTime.end, newTime.dead);
        };
        SyncedScheduler.prototype.scheduleCue = function (timeFlow) {
            this.cancelNextCue();
            timeFlow = timeFlow || this.lastTime;
            var timeNow = timeFlow.currentTime;
            var pos = bSearch(this.cues, "time", timeNow);
            if (pos >= 0)
                this.nextCueIx = pos;
            else
                this.nextCueIx = ~pos;
            this.scheduleNextCue(timeNow, timeFlow);
        };
        SyncedScheduler.prototype.scheduleNextCue = function (timeNow, flow) {
            var _this = this;
            var atTime = this.nextCueTime();
            if (atTime !== undefined) {
                var toWait = Math.max(10, atTime - timeNow * (1 / flow.rate) + 10);
                this.nextCueWait = wait(toWait);
                this.nextCueWait.then(function () { return _this.runCues(_this.lastTime.currentTime); });
            }
            this.nextCueWait = undefined;
        };
        SyncedScheduler.prototype.runCues = function (timeNow) {
            while (this.moreCues() && this.nextCueTime() < timeNow) {
                var cue = this.cues[this.nextCueIx++];
                Realm_1.Realm[this.targetRealm].group[this.targetGroup][cue.taskName].running = true;
            }
            this.scheduleNextCue(timeNow, this.lastTime);
        };
        SyncedScheduler.prototype.cancelNextCue = function () {
            if (this.nextCueWait) {
                this.nextCueWait.cancel();
                this.nextCueWait = undefined;
            }
        };
        SyncedScheduler.prototype.nextCueTime = function () {
            var cue = this.cues[this.nextCueIx];
            return cue ? cue.time : undefined;
        };
        SyncedScheduler.prototype.moreCues = function () {
            return this.nextCueIx < this.cues.length;
        };
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
        return SyncedScheduler;
    }(Script_1.Script));
    var Cue = (function () {
        function Cue(timeStr, taskName) {
            this.time = TimeFlow.stringToMillis(timeStr);
            this.taskName = taskName;
        }
        return Cue;
    }());
    function bSearch(arr, compOrProp, sought) {
        var minIndex = 0;
        var maxIndex = arr.length - 1;
        var ix;
        var propName = compOrProp;
        if (compOrProp === undefined)
            compOrProp = 'name';
        var compFun = (typeof compOrProp === 'function') ? compOrProp : defaultCompFun;
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
            var item = lhs[propName];
            if (item < sought)
                return -1;
            else if (item > sought)
                return 1;
            return 0;
        }
    }
});
