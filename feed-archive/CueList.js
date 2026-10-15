"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CueList = void 0;
const feed = __importStar(require("../system_lib/Feed"));
const Metadata_1 = require("../system_lib/Metadata");
const ScriptBase_1 = require("../system_lib/ScriptBase");
const Timeline_1 = require("../system/Timeline");
const Realm_1 = require("../system/Realm");
const kDefaultRealm = "CueList";
class CueList extends feed.Feed {
    list;
    constructor(env) {
        super(env);
        this.list = env.namedAggregate('list', List);
    }
    defineList(name, taskRealm, taskGroup, timelineGroup) {
        if (this.list[name]) {
            this.list[name].clear();
        }
        else {
            const list = new List(this, name, taskRealm || kDefaultRealm, taskGroup || name, timelineGroup || name);
            this.list[name] = list;
            this.establishFeed(list);
        }
    }
    addCue(list, name, friendlyName) {
        const addToList = this.list[list];
        if (addToList)
            addToList.addCue(name, friendlyName);
        else
            throw "Cue list " + list + " not found. Use defineList first to create it.";
    }
}
exports.CueList = CueList;
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
class List extends ScriptBase_1.AggregateElem {
    owner;
    name;
    taskRealm;
    taskGroup;
    timelineGroup;
    listType = Cue;
    itemType = Cue;
    index = 0;
    cues = [];
    refreshTimer = undefined;
    mRunning = false;
    mTrack = '';
    constructor(owner, name, taskRealm, taskGroup, timelineGroup) {
        super();
        this.owner = owner;
        this.name = name;
        this.taskRealm = taskRealm;
        this.taskGroup = taskGroup;
        this.timelineGroup = timelineGroup;
    }
    clear() {
        if (this.cues.length) {
            if (this.index)
                this.killCueAt(this.index);
            this.cues.length = 0;
            this.refreshSoon();
        }
    }
    addCue(name, friendlyName) {
        this.cues.push(new Cue(name, friendlyName));
        this.refreshSoon();
    }
    refreshSoon() {
        if (!this.refreshTimer) {
            this.refreshTimer = wait(100);
            this.refreshTimer.then(() => {
                this.refreshTimer = undefined;
                this.owner.refreshFeed(this.name);
            });
        }
    }
    getList(spec) {
        return Promise.resolve({ items: this.cues });
    }
    getTaskGroupName() {
        return this.mTrack || this.taskGroup;
    }
    set track(trackName) {
        this.mTrack = trackName;
    }
    get track() {
        return this.mTrack;
    }
    get cueIndex() {
        return this.index;
    }
    set cueIndex(ix) {
        if (ix >= 0 && ix <= this.cues.length) {
            if (this.index !== ix) {
                let proceedWhen;
                if (this.index)
                    proceedWhen = this.killCueAt(this.index);
                else
                    proceedWhen = Promise.resolve();
                this.index = ix;
                if (ix) {
                    proceedWhen.then(() => this.triggerCueAt(ix));
                }
                this.changed('cueName');
                this.changed('cueNext');
                this.changed('cuePrevious');
            }
        }
        else
            console.error("cueIndex", ix, "out of bounds for list ", this.name);
    }
    get cueName() {
        return this.cues[this.index - 1]?.name || '';
    }
    set cueName(name) {
        let foundAt = -1;
        this.cues.filter((cue, index) => {
            if (cue.name === name && foundAt < 0)
                foundAt = index;
        });
        if (foundAt >= 0) {
            this.cueIndex = foundAt + 1;
        }
        else
            console.error("cueName", name, "not found in list ", this.name);
    }
    get cueNext() {
        return this.cues[this.index]?.name || '';
    }
    get cuePrevious() {
        return this.cues[this.index - 2]?.name || '';
    }
    proceed() {
        const cue = this.cues[this.index - 1];
        if (!cue || !cue.proceedWithTimeline(this))
            this.cueIndex = this.index + 1;
    }
    killCueAt(cueIx) {
        const cue = this.cues[cueIx - 1];
        return cue ? cue.kill(this) : Promise.resolve();
    }
    triggerCueAt(cueIx) {
        const cue = this.cues[this.index - 1];
        if (cue)
            cue.trigger(this);
    }
    set running(value) {
        if (value && !this.mRunning)
            this.proceed();
    }
    get running() {
        return this.mRunning;
    }
    tellRunning(running) {
        if (this.mRunning !== running) {
            this.mRunning = running;
            this.changed('running');
        }
    }
}
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
class Cue {
    runningPropAccessor;
    timelineStopDelay;
    constructor(name, friendlyName) {
        this.name = name;
        this.friendlyName = friendlyName ? friendlyName : name;
    }
    name;
    friendlyName;
    timelineRunningPath(list) {
        return `Timeline.${list.timelineGroup}.${this.name}.playing`;
    }
    taskRunningPath(list, suffix = '') {
        let groupName = list.getTaskGroupName();
        if (!this.findSpecificTask(list, suffix)) {
            groupName = list.taskGroup;
            if (!groupName)
                throw "No corresponding task and Base Track not specified.";
        }
        return `Realm.${list.taskRealm}.group.${groupName}.${this.name}${suffix}.running`;
    }
    findSpecificTask(list, suffix, useBaseGroup) {
        const realm = Realm_1.Realm[list.taskRealm];
        if (realm) {
            const group = realm.group[useBaseGroup ? list.taskGroup : list.getTaskGroupName()];
            if (group) {
                let name = this.name;
                if (suffix)
                    name = name + suffix;
                return group[name];
            }
        }
    }
    findTask(list, suffix) {
        let task = this.findSpecificTask(list, suffix);
        if (!task)
            task = this.findSpecificTask(list, suffix, true);
        return task;
    }
    findTimeline(list) {
        if (Timeline_1.Timeline) {
            const timelineGroup = Timeline_1.Timeline[list.timelineGroup];
            if (timelineGroup)
                return timelineGroup[this.name];
        }
    }
    kill(list) {
        const timeline = this.findTimeline(list);
        if (timeline) {
            this.timelineStopDelay = wait(1000);
            this.timelineStopDelay.then(() => {
                timeline.stopped = true;
                this.timelineStopDelay = undefined;
            });
        }
        let task = this.findTask(list);
        if (task)
            task.running = false;
        let result;
        task = this.findTask(list, "_exit");
        if (task) {
            task.running = true;
            result = new Promise(resolver => {
                const exitPropAccessor = list.owner.getProperty(this.taskRunningPath(list, '_exit'), running => {
                    if (!running) {
                        exitPropAccessor.close();
                        resolver(null);
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
    }
    trigger(list) {
        const task = this.findTask(list);
        if (task)
            task.running = true;
        const timeline = this.findTimeline(list);
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
            const statusChangeHandler = (running) => list.tellRunning(running);
            this.runningPropAccessor = list.owner.getProperty(timeline ?
                this.timelineRunningPath(list) : this.taskRunningPath(list), statusChangeHandler);
            if (this.runningPropAccessor.available)
                statusChangeHandler(this.runningPropAccessor.value);
        }
    }
    proceedWithTimeline(list) {
        const timeline = this.findTimeline(list);
        if (!timeline || timeline.stopped)
            return false;
        timeline.playing = true;
        return true;
    }
}
__decorate([
    (0, Metadata_1.field)("Cue internal name"),
    __metadata("design:type", String)
], Cue.prototype, "name", void 0);
__decorate([
    (0, Metadata_1.field)("Cue name shown in UI"),
    __metadata("design:type", String)
], Cue.prototype, "friendlyName", void 0);
