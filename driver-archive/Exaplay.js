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
exports.Exaplay = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
const ScriptBase_1 = require("../system_lib/ScriptBase");
let Exaplay = class Exaplay extends Driver_1.Driver {
    connection;
    msgQueue = [];
    msgCurrent = null;
    timeOut = null;
    compositions;
    mDiscarded = false;
    kMaxQueue = 20;
    kMinPollingMs = 200;
    constructor(connection) {
        super(connection);
        this.connection = connection;
        connection.autoConnect();
        this.compositions = this.namedAggregateProperty("compositions", Composition);
        connection.subscribe('textReceived', (sender, msg) => {
            this.handleResponse(msg.text);
        });
        connection.subscribe('connect', () => this.flushQueue());
        connection.subscribe('finish', () => this.discard());
    }
    discard() {
        if (this.mDiscarded)
            return;
        this.mDiscarded = true;
        this.flushQueue();
        for (const compName in this.compositions) {
            const comp = this.compositions[compName];
            if (comp)
                comp.discard();
        }
    }
    flushQueue() {
        if (this.timeOut) {
            this.timeOut.cancel();
            this.timeOut = null;
        }
        const current = this.msgCurrent;
        this.msgCurrent = null;
        const queued = this.msgQueue;
        this.msgQueue = [];
        if (current)
            current.reject("cancelled");
        for (const req of queued)
            req.reject("cancelled");
    }
    reInitit() {
        this.reInitialize();
    }
    addComposition(name, id, enablePolling, pollingInterval) {
        const old = this.compositions[name];
        if (old)
            old.discard();
        const interval = Math.max(this.kMinPollingMs, pollingInterval || 500);
        this.compositions[name] = new Composition(this, id, enablePolling || false, interval);
    }
    stopAllCompositions() {
        for (const compName in this.compositions) {
            const comp = this.compositions[compName];
            comp.playState = "STOP";
        }
    }
    sendCommand(command, id, expectResponse = false, value) {
        return new Promise((resolve, reject) => {
            if (this.mDiscarded) {
                reject("cancelled");
                return;
            }
            if (expectResponse) {
                if (!this.connection.connected || this.msgQueue.length >= this.kMaxQueue) {
                    reject("cancelled");
                    return;
                }
            }
            this.msgQueue.push({ command, id, value, resolve, reject, expectResponse });
            this.processNext();
        });
    }
    handleResponse(response) {
        if (!this.msgCurrent) {
            console.warn("Unexpected response:", response);
            return;
        }
        if (this.msgCurrent.command === "get:status") {
            const parts = response.split(",").map(Number);
            if (parts.length < 5 || parts.some(p => isNaN(p))) {
                console.warn("Ignoring non-status reply:", response);
                return;
            }
        }
        if (this.timeOut) {
            this.timeOut.cancel();
            this.timeOut = null;
        }
        this.msgCurrent.resolve(response);
        this.msgCurrent = null;
        this.processNext();
    }
    processNext() {
        if (this.msgCurrent || this.msgQueue.length === 0)
            return;
        this.msgCurrent = this.msgQueue.shift();
        if (this.msgQueue.length > 1)
            console.log("Warning message queue is ", this.msgQueue.length);
        let msg;
        if (this.msgCurrent.value !== undefined) {
            msg = `${this.msgCurrent.command},comp${this.msgCurrent.id},${this.msgCurrent.value}`;
        }
        else {
            msg = `${this.msgCurrent.command},comp${this.msgCurrent.id}`;
        }
        this.connection.sendText(msg);
        if (!this.msgCurrent.expectResponse) {
            this.msgCurrent.resolve();
            this.msgCurrent = null;
            this.processNext();
            return;
        }
        this.timeOut = wait(1000);
        this.timeOut.then(() => {
            if (this.msgCurrent) {
                this.msgCurrent.reject(new Error("Timeout waiting for response"));
                this.msgCurrent = null;
                this.processNext();
            }
        }).catch(err => {
            if (err !== "cancelled") {
                console.error("processNext timeOut error:", err);
            }
        });
    }
};
exports.Exaplay = Exaplay;
__decorate([
    (0, Metadata_1.callable)("Reinitialize and reset the driver"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Exaplay.prototype, "reInitit", null);
__decorate([
    (0, Metadata_1.callable)("Configure a composition"),
    __param(0, (0, Metadata_1.parameter)("Name to use for blocks property")),
    __param(1, (0, Metadata_1.parameter)("ID for the composition as in Exaplay ID")),
    __param(2, (0, Metadata_1.parameter)("Enable polling", true)),
    __param(3, (0, Metadata_1.parameter)("Pooling frequency, use with caution ~500ms recommended", true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Boolean, Number]),
    __metadata("design:returntype", void 0)
], Exaplay.prototype, "addComposition", null);
__decorate([
    (0, Metadata_1.callable)("Configure a composition"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Exaplay.prototype, "stopAllCompositions", null);
exports.Exaplay = Exaplay = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 8100 }),
    __metadata("design:paramtypes", [Object])
], Exaplay);
class Composition extends ScriptBase_1.AggregateElem {
    owner;
    id;
    enablePolling;
    pollingInterval;
    verboseLogging;
    mPlayState = "STOP";
    mVolume = 0;
    mSyncSource = new TimeFlow(0, 0);
    poller = null;
    mDiscarded = false;
    statusPending = false;
    statusRefreshWanted = false;
    currentPlaybackStatus = 0;
    currentStatus = {
        playbackStatus: 0,
        currentTime: 0,
        currentFrame: 0,
        currentClip: 0,
        totalDuration: 0
    };
    driftCount = 0;
    driftThresholdCount = 10;
    driftMs = 100;
    constructor(owner, id, enablePolling, pollingInterval, verboseLogging = false) {
        super();
        this.owner = owner;
        this.id = id;
        this.enablePolling = enablePolling;
        this.pollingInterval = pollingInterval;
        this.verboseLogging = verboseLogging;
        this.poll();
    }
    get playState() { return this.mPlayState; }
    set playState(value) {
        if (value !== this.mPlayState) {
            if (value == "PLAY" || value == "STOP" || value == "PAUSE") {
                switch (value) {
                    case "PLAY":
                        this.owner.sendCommand("play", this.id);
                        break;
                    case "STOP":
                        this.owner.sendCommand("stop", this.id);
                        break;
                    case "PAUSE":
                        this.owner.sendCommand("pause", this.id);
                        break;
                    default:
                        console.log("Unknown playState value:", value);
                }
                this.getStatus();
            }
            this.mPlayState = value;
        }
    }
    get volume() { return this.mVolume; }
    set volume(value) {
        if (value !== this.mVolume) {
            this.owner.sendCommand("set:vol", this.id, false, Math.round(value * 100));
            this.mVolume = value;
        }
    }
    get syncSource() { return this.mSyncSource; }
    set syncSource(data) {
        this.mSyncSource = data;
    }
    gotoCueIndex(index) {
        this.owner.sendCommand("set:cue", this.id, false, index);
        this.getStatus();
    }
    gotoCueTime(time) {
        this.owner.sendCommand("set:cuetime", this.id, false, time);
        this.getStatus();
    }
    poll() {
        if (this.enablePolling && !this.mDiscarded) {
            if (this.poller)
                this.poller.cancel();
            this.poller = wait(this.pollingInterval);
            this.poller.then(() => {
                if (this.mDiscarded)
                    return;
                if (this.owner.connection.connected) {
                    this.getStatus();
                }
                this.poll();
            }).catch(() => { });
        }
    }
    discard() {
        this.mDiscarded = true;
        if (this.poller) {
            this.poller.cancel();
            this.poller = null;
        }
    }
    getStatus() {
        if (this.mDiscarded)
            return;
        if (this.statusPending) {
            this.statusRefreshWanted = true;
            return;
        }
        this.statusPending = true;
        this.owner.sendCommand("get:status", this.id, true).then(data => {
            this.statusDone();
            const strData = String(data);
            const parts = strData.split(",").map(Number);
            const status = {
                playbackStatus: parts[0],
                currentTime: parts[1],
                currentFrame: parts[2],
                currentClip: parts[3],
                totalDuration: parts[4]
            };
            const newState = this.currentPlaybackStatus !== status.playbackStatus;
            if (status.playbackStatus === 0 && newState) {
                this.syncSource = new TimeFlow(status.currentTime * 1000, 0);
                this.mPlayState = "STOP";
            }
            else if (status.playbackStatus === 1) {
                if (newState) {
                    this.syncSource = new TimeFlow(status.currentTime * 1000, 1);
                    this.mPlayState = "PLAY";
                }
                else {
                    this.checkDrift(status);
                }
            }
            else if (status.playbackStatus === 2 && newState) {
                this.syncSource = new TimeFlow(status.currentTime * 1000, 0);
                this.mPlayState = "PAUSE";
            }
            if (newState) {
                this.changed("playState");
            }
            this.currentPlaybackStatus = status.playbackStatus;
            this.currentStatus = status;
        }).catch(err => {
            this.statusDone();
            if (err !== "cancelled") {
                console.error("getStatus error:", err);
            }
        });
    }
    statusDone() {
        this.statusPending = false;
        if (this.statusRefreshWanted) {
            this.statusRefreshWanted = false;
            this.getStatus();
        }
    }
    checkDrift(status) {
        const currentMs = status.currentTime * 1000;
        const drift = Math.abs(this.syncSource.currentTime - currentMs);
        const nearBeginning = status.currentTime < this.pollingInterval / 1000;
        const looped = status.currentTime < this.currentStatus.currentTime;
        if (nearBeginning || looped) {
            this.syncSource = new TimeFlow(currentMs, 1);
            this.log(`TimeFlow reset because playback restarted: ${status.currentTime}s`);
            this.driftCount = 0;
            return;
        }
        const jumpThresholdMs = this.driftMs * 5;
        if (drift > jumpThresholdMs) {
            this.syncSource = new TimeFlow(currentMs, 1);
            this.log(`TimeFlow jump detected, reset immediately: drift=${drift}ms`);
            this.driftCount = 0;
            return;
        }
        if (drift > this.driftMs) {
            this.driftCount++;
            if (this.driftCount >= this.driftThresholdCount) {
                this.syncSource = new TimeFlow(currentMs, 1);
                this.log(`TimeFlow drift corrected after ${this.driftCount} consecutive messages: ${drift}ms`);
                this.driftCount = 0;
            }
        }
        else {
            this.driftCount = 0;
        }
    }
    log(...args) {
        if (this.verboseLogging) {
            console.log(...args);
        }
    }
}
__decorate([
    (0, Metadata_1.property)("Play state, 'PLAY', 'STOP', 'PAUSE' ", false),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], Composition.prototype, "playState", null);
__decorate([
    (0, Metadata_1.property)("Volume ", false),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], Composition.prototype, "volume", null);
__decorate([
    (0, Metadata_1.property)('Time Sync Source', true),
    __metadata("design:type", TimeFlow),
    __metadata("design:paramtypes", [TimeFlow])
], Composition.prototype, "syncSource", null);
__decorate([
    (0, Metadata_1.callable)("Go to cue index 1 based. Integers e.g. 1 or 2"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], Composition.prototype, "gotoCueIndex", null);
__decorate([
    (0, Metadata_1.callable)("Go to cue time in seconds ss.mm"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], Composition.prototype, "gotoCueTime", null);
