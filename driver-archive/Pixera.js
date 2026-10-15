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
var Pixera_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pixera = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
const ScriptBase_1 = require("../system_lib/ScriptBase");
class TimelineAggregateElem extends ScriptBase_1.AggregateElem {
    handle;
    name;
    index;
    _driver;
    _fps;
    _speedFactor;
    _mode;
    _frame;
    _timeFlow;
    constructor(driver, handle, name, index, fps, speedFactor, mode, frame) {
        super();
        this.handle = handle;
        this.name = name;
        this.index = index;
        this._driver = driver;
        this._fps = fps;
        this._mode = mode;
        this._frame = frame;
        this._speedFactor = speedFactor;
        this._timeFlow = new TimeFlow(this.convertFrameToMilliseconds(), this.getTimeFlowRate());
    }
    get frame() {
        return this._frame;
    }
    set frame(value) {
        this._frame = value;
        this.updateTime(this.convertFrameToMilliseconds());
    }
    updateTime(millis, forceChange) {
        const oldPos = this._timeFlow.currentTime;
        this._timeFlow = new TimeFlow(millis, this.getTimeFlowRate());
        if (forceChange || this._timeFlow.currentTime !== oldPos) {
            this.changed("time");
        }
    }
    set mode(newMode) {
        const wasStopped = this.isStopped();
        const wasPlaying = this.isPlaying();
        const wasTime = this._timeFlow.currentTime;
        this._mode = newMode;
        log("mode set", wasPlaying, this.isPlaying());
        if (wasStopped !== this.isStopped()) {
            this.changed("stopped");
        }
        if (wasPlaying !== this.isPlaying()) {
            this.updateTime(wasTime, true);
            this.changed("playing");
        }
    }
    set playing(play) {
        if (play !== this.isPlaying()) {
            const wasStopped = this.isStopped();
            const wasPlaying = this.isPlaying();
            this._driver.queryHandler.tell(play ?
                "Timelines.Timeline.play" :
                "Timelines.Timeline.pause", { "handle": this.handle });
            this.mode = play ? 1 : 2;
            if (!play && wasPlaying)
                this.updateTime(this._timeFlow.currentTime);
        }
    }
    get playing() {
        return this._mode === 1;
    }
    set stopped(newState) {
        if (newState !== this.isStopped()) {
            const wasPlaying = this.isPlaying();
            this._driver.queryHandler.tell(newState ? "Timelines.Timeline.stop" : "Timelines.Timeline.play", { "handle": this.handle });
            this.mode = newState ? 3 : 2;
        }
    }
    get stopped() {
        return this._mode === 3;
    }
    get time() {
        return this._timeFlow;
    }
    set time(timeFlow) {
        let frame = this.convertMillisecondsToFrame(timeFlow.position);
        this.frame = frame;
        this._driver.queryHandler.tell("Timelines.Timeline.setCurrentTime", { "handle": this.handle, "time": frame });
        this.playing = (timeFlow.rate > 0);
    }
    isPlaying() {
        return this._mode === 1;
    }
    isStopped() {
        return this._mode === 3;
    }
    getTimeFlowRate() {
        return this.isPlaying() ? this._speedFactor : 0;
    }
    convertFrameToMilliseconds() {
        return (this._frame / this._fps) * TimeFlow.Second;
    }
    convertMillisecondsToFrame(ms) {
        return (ms / TimeFlow.Second) * this._fps;
    }
}
__decorate([
    (0, Metadata_1.property)("Timeline is playing", false),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], TimelineAggregateElem.prototype, "playing", null);
__decorate([
    (0, Metadata_1.property)("Timeline is stopped", false),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], TimelineAggregateElem.prototype, "stopped", null);
__decorate([
    (0, Metadata_1.property)("Current time position"),
    __metadata("design:type", TimeFlow),
    __metadata("design:paramtypes", [TimeFlow])
], TimelineAggregateElem.prototype, "time", null);
let Pixera = class Pixera extends Driver_1.Driver {
    static { Pixera_1 = this; }
    socket;
    static kJsonPacketFraming = '0xPX';
    static kPollInterval = 5000;
    queries;
    timelines;
    timelineHandles = {};
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.setReceiveFraming(Pixera_1.kJsonPacketFraming);
        socket.setMaxLineLength(1024 * 10);
        socket.autoConnect();
        this.queries = new QueryHandler(this);
        this.timelines = this.namedAggregateProperty("timelines", TimelineAggregateElem);
        if (socket.connected)
            wait(10).then(() => this.init());
        socket.subscribe('connect', (emitter, message) => {
            if (message.type === "Connection" && socket.connected)
                this.init();
        });
    }
    update() {
        this.reInitialize();
    }
    get queryHandler() {
        return this.queries;
    }
    init() {
        log("Init");
        this.timelineHandles = {};
        this.queries.ask("Timelines.getTimelines").then(handles => {
            let toAwait = [];
            for (const handle of handles)
                toAwait.push(this.addTimelineAsync(handle));
            Promise.all(toAwait).finally(() => {
                this.poll(true);
            });
        });
        this.queries.tell("Utility.setMonitoringHasDelimiter", { "hasDelimiter": true });
        this.queries.tell("Utility.setMonitoringEventMode", { "mode": "onlyDiscrete" });
    }
    async addTimelineAsync(handle) {
        log("addTimelineAsync");
        let attrs = await this.fetchTimelineAttributesAsync(handle);
        let speedFactor = await this.fetchTimelineSpeedFactorAsync(handle);
        let frame = await this.fetchTimelineFrameAsync(handle);
        let timeline = new TimelineAggregateElem(this, handle, attrs.name, attrs.index, attrs.fps, speedFactor, attrs.mode, frame);
        this.timelineHandles[handle] = timeline;
        this.timelines[timeline.name] = timeline;
    }
    handleMonitorMsg(msg) {
        if (msg.type === "monEvent") {
            switch (msg.name) {
                case "timelineTransport":
                    this.handleTimelineTransportMsg(msg);
                    break;
                case "timelinePositionChangedManually":
                    this.handleTimelinePositionMsg(msg);
                    break;
                case "cueApplied":
                    break;
                case "projectOpened":
                    this.init();
                    break;
                default:
                    log("Unexpected monEvent", JSON.stringify(msg));
                    break;
            }
        }
        else
            log("Unexpected message", JSON.stringify(msg));
    }
    handleTimelineTransportMsg(msg) {
        for (const evt of msg.entries) {
            this.timelineHandles[evt.handle].mode = evt.value;
        }
    }
    handleTimelinePositionMsg(msg) {
        for (const evt of msg.entries) {
            this.timelineHandles[evt.handle].frame = evt.value;
        }
    }
    poll(updateAll) {
        if (this.pollinterval) {
            this.pollinterval.cancel();
            this.pollinterval = null;
        }
        if (this.socket.connected)
            this.updateTimelines(updateAll);
        if (Pixera_1.kPollInterval) {
            this.pollinterval = wait(Pixera_1.kPollInterval);
            this.pollinterval.then(() => {
                this.pollinterval = null;
                this.poll(false);
            });
        }
    }
    pollinterval;
    updateTimelines(doAll) {
        log("updateTimelines");
        for (const handle in this.timelineHandles) {
            if (doAll || this.timelineHandles[handle].playing)
                this.updateTimelineAsync(parseInt(handle));
        }
    }
    async updateTimelineAsync(handle) {
        let timeline = this.timelineHandles[handle];
        log("updateTimeline", timeline.name);
        let attrs = await this.fetchTimelineAttributesAsync(handle);
        let frame = await this.fetchTimelineFrameAsync(handle);
        timeline.mode = attrs.mode;
        timeline.frame = frame;
    }
    async fetchTimelineAttributesAsync(handle) {
        return await this.queries.ask("Timelines.Timeline.getAttributes", { handle: handle });
    }
    async fetchTimelineFrameAsync(handle) {
        return await this.queries.ask("Timelines.Timeline.getCurrentTime", { handle: handle });
    }
    async fetchTimelineSpeedFactorAsync(handle) {
        return await this.queries.ask("Timelines.Timeline.getSpeedFactor", { handle: handle });
    }
};
exports.Pixera = Pixera;
__decorate([
    (0, Metadata_1.callable)("Call to update the set of PIXERA timelines known to Blocks"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Pixera.prototype, "update", null);
exports.Pixera = Pixera = Pixera_1 = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 1400 }),
    __metadata("design:paramtypes", [Object])
], Pixera);
class QueryHandler {
    owner;
    static nextId = 1;
    static NO_QUERY = '-';
    pendingQueries = {};
    static kMaxAge = 200;
    static kStaleCheckInterval = 1000;
    whenLastCheckdStale = 0;
    constructor(owner) {
        this.owner = owner;
        owner.socket.subscribe('textReceived', (sender, message) => {
            log("textReceived", message.text);
            try {
                this.handleMsgFromPixera(JSON.parse(message.text));
            }
            catch (error) {
                console.error("parsing data from Pixera", error);
            }
        });
    }
    ask(method, params) {
        const now = this.owner.getMonotonousMillis();
        const result = new Promise((resolve, reject) => {
            const query = new Query(method, params, resolve, reject);
            const sendParams = query.aboutToSend(now);
            const cmd = {
                jsonrpc: "2.0",
                id: QueryHandler.nextId++,
                method: "Pixera." + query.method
            };
            if (sendParams)
                cmd.params = sendParams;
            this.pendingQueries[cmd.id] = query;
            const cmdStr = JSON.stringify(cmd);
            this.owner.socket.sendText(cmdStr + Pixera.kJsonPacketFraming);
            log("ask", cmdStr);
        });
        if (!this.whenLastCheckdStale)
            this.whenLastCheckdStale = now;
        else if (now - this.whenLastCheckdStale >= QueryHandler.kStaleCheckInterval) {
            this.checkStaleQueries(now);
            this.whenLastCheckdStale = now;
        }
        return result;
    }
    tell(method, params) {
        const cmd = {
            jsonrpc: "2.0",
            id: QueryHandler.NO_QUERY,
            method: "Pixera." + method
        };
        if (params)
            cmd.params = params;
        const cmdStr = JSON.stringify(cmd);
        this.owner.socket.sendText(cmdStr + Pixera.kJsonPacketFraming);
        log("tell", cmdStr);
    }
    handleMsgFromPixera(msg) {
        if (msg.id === -1)
            this.owner.handleMonitorMsg(msg);
        else if (msg.id !== QueryHandler.NO_QUERY) {
            const query = this.pendingQueries[msg.id];
            if (query) {
                delete this.pendingQueries[msg.id];
                query.handleResult(msg);
            }
            else
                console.warn("spurious data", JSON.stringify(msg));
        }
    }
    checkStaleQueries(now) {
        for (const id in this.pendingQueries) {
            const query = this.pendingQueries[id];
            if (now - query.getWhenAsked() > QueryHandler.kMaxAge) {
                delete this.pendingQueries[id];
                console.error("Query timed out", query.method, "id", id);
                query.fail("Timeout");
            }
        }
    }
}
class Query {
    method;
    params;
    resolver;
    rejector;
    whenAsked;
    constructor(method, params, resolver, rejector) {
        this.method = method;
        this.params = params;
        this.resolver = resolver;
        this.rejector = rejector;
    }
    aboutToSend(timeNow) {
        this.whenAsked = timeNow;
        return this.params;
    }
    getWhenAsked() {
        return this.whenAsked;
    }
    handleResult(resultMsg) {
        if (resultMsg.error) {
            log("rejected query id", resultMsg.id);
            this.rejector(resultMsg.error.message || ("Code: " + resultMsg.error.code));
        }
        else {
            this.resolver(resultMsg.result);
        }
    }
    fail(error) {
        this.rejector(error);
    }
}
const DEBUG = false;
function log(...messages) {
    if (DEBUG)
        console.info(messages);
}
