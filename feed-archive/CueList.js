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
                var list = new List(this, name, taskRealm || kDefaultRealm, taskGroup || name, timelineGroup || name);
                this.list[name] = list;
                this.establishFeed(list);
            }
        };
        CueList.prototype.addCue = function (list, name, friendlyName) {
            var addToList = this.list[list];
            if (addToList)
                addToList.addCue(name, friendlyName);
            else
                throw "Cue list " + list + " not found. Use defineList first to create it.";
        };
        __decorate([
            (0, Metadata_1.callable)("Create (or clear content of) named cue list"),
            __param(0, (0, Metadata_1.parameter)("Name of cue list to define or clear")),
            __param(1, (0, Metadata_1.parameter)("Task realm name. Default is 'CueList'.", true)),
            __param(2, (0, Metadata_1.parameter)("Task group name. Name of this list unless ovrridden by track property.", true)),
            __param(3, (0, Metadata_1.parameter)("Timeline group name. Default is name of this list.", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, String, String]),
            __metadata("design:returntype", void 0)
        ], CueList.prototype, "defineList", null);
        __decorate([
            (0, Metadata_1.callable)("Append a cue to named list"),
            __param(0, (0, Metadata_1.parameter)("Name of list to add cue to")),
            __param(1, (0, Metadata_1.parameter)("Internal name of cue (also task and/or timeline name)")),
            __param(2, (0, Metadata_1.parameter)("User-friendly name (defaults to name)", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, String]),
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
            _this.mTrack = '';
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
        List.prototype.addCue = function (name, friendlyName) {
            this.cues.push(new Cue(name, friendlyName));
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
        List.prototype.getTaskGroupName = function () {
            return this.mTrack || this.taskGroup;
        };
        Object.defineProperty(List.prototype, "track", {
            get: function () {
                return this.mTrack;
            },
            set: function (trackName) {
                this.mTrack = trackName;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(List.prototype, "cueIndex", {
            get: function () {
                return this.index;
            },
            set: function (ix) {
                var _this = this;
                if (ix >= 0 && ix <= this.cues.length) {
                    if (this.index !== ix) {
                        var proceedWhen = void 0;
                        if (this.index)
                            proceedWhen = this.killCueAt(this.index);
                        else
                            proceedWhen = Promise.resolve();
                        this.index = ix;
                        if (ix) {
                            proceedWhen.then(function () { return _this.triggerCueAt(ix); });
                        }
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
            return cue ? cue.kill(this) : Promise.resolve();
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
            (0, Metadata_1.property)("Track name. Overrides task group name if specified."),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], List.prototype, "track", null);
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
            (0, Metadata_1.property)("True while timeline or task is running"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], List.prototype, "running", null);
        return List;
    }(ScriptBase_1.AggregateElem));
    var Cue = (function () {
        function Cue(name, friendlyName) {
            this.name = name;
            this.friendlyName = friendlyName ? friendlyName : name;
        }
        Cue.prototype.timelineRunningPath = function (list) {
            return "Timeline.".concat(list.timelineGroup, ".").concat(this.name, ".playing");
        };
        Cue.prototype.taskRunningPath = function (list, suffix) {
            if (suffix === void 0) { suffix = ''; }
            var groupName = list.getTaskGroupName();
            if (!this.findSpecificTask(list, suffix)) {
                groupName = list.taskGroup;
                if (!groupName)
                    throw "No corresponding task and Base Track not specified.";
            }
            return "Realm.".concat(list.taskRealm, ".group.").concat(groupName, ".").concat(this.name).concat(suffix, ".running");
        };
        Cue.prototype.findSpecificTask = function (list, suffix, useBaseGroup) {
            var realm = Realm_1.Realm[list.taskRealm];
            if (realm) {
                var group = realm.group[useBaseGroup ? list.taskGroup : list.getTaskGroupName()];
                if (group) {
                    var name_1 = this.name;
                    if (suffix)
                        name_1 = name_1 + suffix;
                    return group[name_1];
                }
            }
        };
        Cue.prototype.findTask = function (list, suffix) {
            var task = this.findSpecificTask(list, suffix);
            if (!task)
                task = this.findSpecificTask(list, suffix, true);
            return task;
        };
        Cue.prototype.findTimeline = function (list) {
            if (Timeline_1.Timeline) {
                var timelineGroup = Timeline_1.Timeline[list.timelineGroup];
                if (timelineGroup)
                    return timelineGroup[this.name];
            }
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
            var result;
            task = this.findTask(list, "_exit");
            if (task) {
                task.running = true;
                result = new Promise(function (resolver) {
                    var exitPropAccessor = list.owner.getProperty(_this.taskRunningPath(list, '_exit'), function (running) {
                        if (!running) {
                            exitPropAccessor.close();
                            resolver();
                        }
                    });
                });
            }
            else
                result = Promise.resolve();
            if (this.runningPropAccessor) {
                list.tellRunning(false);
                this.runningPropAccessor.close();
                this.runningPropAccessor = undefined;
            }
            return result;
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
            (0, Metadata_1.field)("Cue internal name"),
            __metadata("design:type", String)
        ], Cue.prototype, "name", void 0);
        __decorate([
            (0, Metadata_1.field)("Cue name shown in UI"),
            __metadata("design:type", String)
        ], Cue.prototype, "friendlyName", void 0);
        return Cue;
    }());
});
