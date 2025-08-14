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
define(["require", "exports", "../system_lib/Feed", "../system_lib/Metadata", "../system_lib/ScriptBase", "../system/Timeline", "../system/Realm"], function (require, exports, feed, Metadata_1, ScriptBase_1, Timeline_1, Realm_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CueList = void 0;
    var kDefaultRealm = "CueList";
    var CueList = exports.CueList = (function (_super) {
        __extends(CueList, _super);
        function CueList(env) {
            var _this = _super.call(this, env) || this;
            _this.list = env.namedAggregate('list', List);
            return _this;
        }
        CueList.prototype.defineList = function (name, taskRealm, taskGroup, timelineGroup) {
            if (this.list[name]) {
                this.list[name].clear();
            }
            else {
                var list = new List(this, name, taskRealm, taskGroup, timelineGroup);
                this.list[name] = list;
                this.establishFeed(list);
            }
        };
        CueList.prototype.addCue = function (list, name) {
            var addToList = this.list[list];
            if (addToList)
                addToList.addCue(name);
            else
                throw "Cue list " + list + " not found. Use defineList first to create it.";
        };
        __decorate([
            (0, Metadata_1.callable)("Create (or clear content of) named cue list"),
            __param(0, (0, Metadata_1.parameter)("Name of cue list to define or clear")),
            __param(1, (0, Metadata_1.parameter)("Task realm name (defaults to 'CueList'", true)),
            __param(2, (0, Metadata_1.parameter)("Task group name (defaults to name of this list", true)),
            __param(3, (0, Metadata_1.parameter)("Task group name (defaults to name of this list", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, String, String]),
            __metadata("design:returntype", void 0)
        ], CueList.prototype, "defineList", null);
        __decorate([
            (0, Metadata_1.callable)("Append a cue to named list"),
            __param(0, (0, Metadata_1.parameter)("Name of list to add cue to")),
            __param(1, (0, Metadata_1.parameter)("Name of cue (also task and timeline unless overridden)")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String]),
            __metadata("design:returntype", void 0)
        ], CueList.prototype, "addCue", null);
        return CueList;
    }(feed.Feed));
    var List = (function (_super) {
        __extends(List, _super);
        function List(owner, name, taskRealm, taskGroup, timelineGroup) {
            var _this = _super.call(this) || this;
            _this.owner = owner;
            _this.name = name;
            _this.taskRealm = taskRealm;
            _this.taskGroup = taskGroup;
            _this.timelineGroup = timelineGroup;
            _this.listType = Cue;
            _this.itemType = Cue;
            _this.index = 0;
            _this.cues = [];
            _this.refreshTimer = undefined;
            _this.mRunning = false;
            return _this;
        }
        List.prototype.clear = function () {
            if (this.cues.length) {
                if (this.index)
                    this.killCueAt(this.index);
                this.cues.length = 0;
                this.refreshSoon();
            }
        };
        List.prototype.addCue = function (name, task, timeline) {
            this.cues.push(new Cue(name, task, timeline));
            this.refreshSoon();
        };
        List.prototype.refreshSoon = function () {
            var _this = this;
            if (!this.refreshTimer) {
                this.refreshTimer = wait(100);
                this.refreshTimer.then(function () {
                    _this.refreshTimer = undefined;
                    _this.owner.refreshFeed(_this.name);
                });
            }
        };
        List.prototype.getList = function (spec) {
            return Promise.resolve({ items: this.cues });
        };
        Object.defineProperty(List.prototype, "cueIndex", {
            get: function () {
                return this.index;
            },
            set: function (ix) {
                if (ix >= 0 && ix <= this.cues.length) {
                    if (this.index !== ix) {
                        if (this.index)
                            this.killCueAt(this.index);
                        this.index = ix;
                        if (ix)
                            this.triggerCueAt(ix);
                        this.changed('cueName');
                        this.changed('cueNext');
                        this.changed('cuePrevious');
                    }
                }
                else
                    console.error("cueIndex", ix, "out of bounds for list ", this.name);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(List.prototype, "cueName", {
            get: function () {
                var _a;
                return ((_a = this.cues[this.index - 1]) === null || _a === void 0 ? void 0 : _a.name) || '';
            },
            set: function (name) {
                var foundAt = -1;
                this.cues.filter(function (cue, index) {
                    if (cue.name === name && foundAt < 0)
                        foundAt = index;
                });
                if (foundAt >= 0) {
                    this.cueIndex = foundAt + 1;
                }
                else
                    console.error("cueName", name, "not found in list ", this.name);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(List.prototype, "cueNext", {
            get: function () {
                var _a;
                return ((_a = this.cues[this.index]) === null || _a === void 0 ? void 0 : _a.name) || '';
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(List.prototype, "cuePrevious", {
            get: function () {
                var _a;
                return ((_a = this.cues[this.index - 2]) === null || _a === void 0 ? void 0 : _a.name) || '';
            },
            enumerable: false,
            configurable: true
        });
        List.prototype.proceed = function () {
            var cue = this.cues[this.index - 1];
            if (!cue || !cue.proceedWithTimeline(this))
                this.cueIndex = this.index + 1;
        };
        List.prototype.killCueAt = function (cueIx) {
            var cue = this.cues[cueIx - 1];
            if (cue)
                cue.kill(this);
        };
        List.prototype.triggerCueAt = function (cueIx) {
            var cue = this.cues[this.index - 1];
            if (cue)
                cue.trigger(this);
        };
        Object.defineProperty(List.prototype, "running", {
            get: function () {
                return this.mRunning;
            },
            set: function (value) {
                if (value && !this.mRunning)
                    this.proceed();
            },
            enumerable: false,
            configurable: true
        });
        List.prototype.tellRunning = function (running) {
            if (this.mRunning !== running) {
                this.mRunning = running;
                this.changed('running');
            }
        };
        __decorate([
            (0, Metadata_1.property)("Current cue position, where 0 is before first cue"),
            (0, Metadata_1.min)(0),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], List.prototype, "cueIndex", null);
        __decorate([
            (0, Metadata_1.property)("Current cue name (set to jump there)"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], List.prototype, "cueName", null);
        __decorate([
            (0, Metadata_1.property)("Next cue name", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], List.prototype, "cueNext", null);
        __decorate([
            (0, Metadata_1.property)("Previous cue name", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], List.prototype, "cuePrevious", null);
        __decorate([
            (0, Metadata_1.callable)("Proceed with next marker on timeline or cue in list"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], List.prototype, "proceed", null);
        __decorate([
            (0, Metadata_1.property)("True while timeline or task is running"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], List.prototype, "running", null);
        return List;
    }(ScriptBase_1.AggregateElem));
    var Cue = (function () {
        function Cue(name, task, timeline) {
            this.task = task;
            this.timeline = timeline;
            this.name = name;
        }
        Cue.prototype.taskRunningPath = function (list) {
            return "Realm.".concat(list.taskRealm || kDefaultRealm, ".group.").concat(list.taskGroup || list.name, ".").concat(this.task || this.name, ".running");
        };
        Cue.prototype.timelineRunningPath = function (list) {
            return "Timeline.".concat(list.timelineGroup || list.name, ".").concat(this.timeline || this.name, ".playing");
        };
        Cue.prototype.findTask = function (list) {
            var realm = Realm_1.Realm[list.taskRealm || kDefaultRealm];
            if (realm) {
                var group = realm.group[list.taskGroup || list.name];
                if (group)
                    return group[this.task || this.name];
            }
        };
        Cue.prototype.findTimeline = function (list) {
            var timelineGroup = Timeline_1.Timeline[list.timelineGroup || list.name];
            if (timelineGroup)
                return timelineGroup[this.timeline || this.name];
        };
        Cue.prototype.kill = function (list) {
            var _this = this;
            var timeline = this.findTimeline(list);
            if (timeline) {
                this.timelineStopDelay = wait(1000);
                this.timelineStopDelay.then(function () {
                    timeline.stopped = true;
                    _this.timelineStopDelay = undefined;
                });
            }
            var task = this.findTask(list);
            if (task)
                task.running = false;
            if (this.runningPropAccessor) {
                list.tellRunning(false);
                this.runningPropAccessor.close();
                this.runningPropAccessor = undefined;
            }
        };
        Cue.prototype.trigger = function (list) {
            var task = this.findTask(list);
            if (task)
                task.running = true;
            var timeline = this.findTimeline(list);
            if (timeline) {
                if (this.timelineStopDelay) {
                    this.timelineStopDelay.cancel();
                    this.timelineStopDelay = undefined;
                }
                timeline.playing = true;
            }
            if (!task && !timeline)
                console.warn("Neither task nor timeline found for cue", this.name, "of CueList", list.name);
            else {
                var statusChangeHandler = function (running) { return list.tellRunning(running); };
                this.runningPropAccessor = list.owner.getProperty(timeline ?
                    this.timelineRunningPath(list) : this.taskRunningPath(list), statusChangeHandler);
                if (this.runningPropAccessor.available)
                    statusChangeHandler(this.runningPropAccessor.value);
            }
        };
        Cue.prototype.proceedWithTimeline = function (list) {
            var timeline = this.findTimeline(list);
            if (!timeline || timeline.stopped)
                return false;
            timeline.playing = true;
            return true;
        };
        __decorate([
            (0, Metadata_1.field)("Cue name"),
            __metadata("design:type", String)
        ], Cue.prototype, "name", void 0);
        return Cue;
    }());
});
