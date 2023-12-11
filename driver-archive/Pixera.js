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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata", "../system_lib/ScriptBase"], function (require, exports, Driver_1, Metadata_1, ScriptBase_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Pixera = void 0;
    var TimelineAggregateElem = (function (_super) {
        __extends(TimelineAggregateElem, _super);
        function TimelineAggregateElem(driver, handle, name, index, fps, speedFactor, mode, frame) {
            var _this = _super.call(this) || this;
            _this.handle = handle;
            _this.name = name;
            _this.index = index;
            _this._driver = driver;
            _this._fps = fps;
            _this._mode = mode;
            _this._frame = frame;
            _this._speedFactor = speedFactor;
            _this._timeFlow = new TimeFlow(_this.convertFrameToMilliseconds(), _this.getTimeFlowRate());
            return _this;
        }
        Object.defineProperty(TimelineAggregateElem.prototype, "frame", {
            get: function () {
                return this._frame;
            },
            set: function (value) {
                this._frame = value;
                this.updateTime(this.convertFrameToMilliseconds());
            },
            enumerable: false,
            configurable: true
        });
        TimelineAggregateElem.prototype.updateTime = function (millis, forceChange) {
            var oldPos = this._timeFlow.currentTime;
            this._timeFlow = new TimeFlow(millis, this.getTimeFlowRate());
            if (forceChange || this._timeFlow.currentTime !== oldPos) {
                this.changed("time");
            }
        };
        Object.defineProperty(TimelineAggregateElem.prototype, "mode", {
            set: function (newMode) {
                var wasStopped = this.isStopped();
                var wasPlaying = this.isPlaying();
                var wasTime = this._timeFlow.currentTime;
                this._mode = newMode;
                log("mode set", wasPlaying, this.isPlaying());
                if (wasStopped !== this.isStopped()) {
                    this.changed("stopped");
                }
                if (wasPlaying !== this.isPlaying()) {
                    this.updateTime(wasTime, true);
                    this.changed("playing");
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimelineAggregateElem.prototype, "playing", {
            get: function () {
                return this._mode === 1;
            },
            set: function (play) {
                if (play !== this.isPlaying()) {
                    var wasStopped = this.isStopped();
                    var wasPlaying = this.isPlaying();
                    this._driver.queryHandler.tell(play ?
                        "Timelines.Timeline.play" :
                        "Timelines.Timeline.pause", { "handle": this.handle });
                    this.mode = play ? 1 : 2;
                    if (!play && wasPlaying)
                        this.updateTime(this._timeFlow.currentTime);
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimelineAggregateElem.prototype, "stopped", {
            get: function () {
                return this._mode === 3;
            },
            set: function (newState) {
                if (newState !== this.isStopped()) {
                    var wasPlaying = this.isPlaying();
                    this._driver.queryHandler.tell(newState ? "Timelines.Timeline.stop" : "Timelines.Timeline.play", { "handle": this.handle });
                    this.mode = newState ? 3 : 2;
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimelineAggregateElem.prototype, "time", {
            get: function () {
                return this._timeFlow;
            },
            set: function (pos) {
                var frame = this.convertMillisecondsToFrame(pos.position);
                this.frame = frame;
                this._driver.queryHandler.tell("Timelines.Timeline.setCurrentTime", { "handle": this.handle, "time": frame });
            },
            enumerable: false,
            configurable: true
        });
        TimelineAggregateElem.prototype.isPlaying = function () {
            return this._mode === 1;
        };
        TimelineAggregateElem.prototype.isStopped = function () {
            return this._mode === 3;
        };
        TimelineAggregateElem.prototype.getTimeFlowRate = function () {
            return this.isPlaying() ? this._speedFactor : 0;
        };
        TimelineAggregateElem.prototype.convertFrameToMilliseconds = function () {
            return (this._frame / this._fps) * TimeFlow.Second;
        };
        TimelineAggregateElem.prototype.convertMillisecondsToFrame = function (ms) {
            return (ms / TimeFlow.Second) * this._fps;
        };
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
        return TimelineAggregateElem;
    }(ScriptBase_1.AggregateElem));
    var Pixera = exports.Pixera = (function (_super) {
        __extends(Pixera, _super);
        function Pixera(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.timelineHandles = {};
            socket.setReceiveFraming(Pixera_1.kJsonPacketFraming);
            socket.setMaxLineLength(1024 * 10);
            socket.autoConnect();
            _this.queries = new QueryHandler(_this);
            _this.timelines = _this.namedAggregateProperty("timelines", TimelineAggregateElem);
            if (socket.connected)
                wait(10).then(function () { return _this.init(); });
            socket.subscribe('connect', function (emitter, message) {
                if (message.type === "Connection" && socket.connected)
                    _this.init();
            });
            return _this;
        }
        Pixera_1 = Pixera;
        Pixera.prototype.update = function () {
            this.reInitialize();
        };
        Object.defineProperty(Pixera.prototype, "queryHandler", {
            get: function () {
                return this.queries;
            },
            enumerable: false,
            configurable: true
        });
        Pixera.prototype.init = function () {
            var _this = this;
            log("Init");
            this.timelineHandles = {};
            this.queries.ask("Timelines.getTimelines").then(function (handles) {
                var toAwait = [];
                for (var _i = 0, handles_1 = handles; _i < handles_1.length; _i++) {
                    var handle = handles_1[_i];
                    toAwait.push(_this.addTimelineAsync(handle));
                }
                Promise.all(toAwait).finally(function () {
                    _this.poll(true);
                });
            });
            this.queries.tell("Utility.setMonitoringHasDelimiter", { "hasDelimiter": true });
            this.queries.tell("Utility.setMonitoringEventMode", { "mode": "onlyDiscrete" });
        };
        Pixera.prototype.addTimelineAsync = function (handle) {
            return __awaiter(this, void 0, void 0, function () {
                var attrs, speedFactor, frame, timeline;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            log("addTimelineAsync");
                            return [4, this.fetchTimelineAttributesAsync(handle)];
                        case 1:
                            attrs = _a.sent();
                            return [4, this.fetchTimelineSpeedFactorAsync(handle)];
                        case 2:
                            speedFactor = _a.sent();
                            return [4, this.fetchTimelineFrameAsync(handle)];
                        case 3:
                            frame = _a.sent();
                            timeline = new TimelineAggregateElem(this, handle, attrs.name, attrs.index, attrs.fps, speedFactor, attrs.mode, frame);
                            this.timelineHandles[handle] = timeline;
                            this.timelines[timeline.name] = timeline;
                            return [2];
                    }
                });
            });
        };
        Pixera.prototype.handleMonitorMsg = function (msg) {
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
        };
        Pixera.prototype.handleTimelineTransportMsg = function (msg) {
            for (var _i = 0, _a = msg.entries; _i < _a.length; _i++) {
                var evt = _a[_i];
                this.timelineHandles[evt.handle].mode = evt.value;
            }
        };
        Pixera.prototype.handleTimelinePositionMsg = function (msg) {
            for (var _i = 0, _a = msg.entries; _i < _a.length; _i++) {
                var evt = _a[_i];
                this.timelineHandles[evt.handle].frame = evt.value;
            }
        };
        Pixera.prototype.poll = function (updateAll) {
            var _this = this;
            if (this.pollinterval) {
                this.pollinterval.cancel();
                this.pollinterval = null;
            }
            if (this.socket.connected)
                this.updateTimelines(updateAll);
            if (Pixera_1.kPollInterval) {
                this.pollinterval = wait(Pixera_1.kPollInterval);
                this.pollinterval.then(function () {
                    _this.pollinterval = null;
                    _this.poll(false);
                });
            }
        };
        Pixera.prototype.updateTimelines = function (doAll) {
            log("updateTimelines");
            for (var handle in this.timelineHandles) {
                if (doAll || this.timelineHandles[handle].playing)
                    this.updateTimelineAsync(parseInt(handle));
            }
        };
        Pixera.prototype.updateTimelineAsync = function (handle) {
            return __awaiter(this, void 0, void 0, function () {
                var timeline, attrs, frame;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            timeline = this.timelineHandles[handle];
                            log("updateTimeline", timeline.name);
                            return [4, this.fetchTimelineAttributesAsync(handle)];
                        case 1:
                            attrs = _a.sent();
                            return [4, this.fetchTimelineFrameAsync(handle)];
                        case 2:
                            frame = _a.sent();
                            timeline.mode = attrs.mode;
                            timeline.frame = frame;
                            return [2];
                    }
                });
            });
        };
        Pixera.prototype.fetchTimelineAttributesAsync = function (handle) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, this.queries.ask("Timelines.Timeline.getAttributes", { handle: handle })];
                        case 1: return [2, _a.sent()];
                    }
                });
            });
        };
        Pixera.prototype.fetchTimelineFrameAsync = function (handle) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, this.queries.ask("Timelines.Timeline.getCurrentTime", { handle: handle })];
                        case 1: return [2, _a.sent()];
                    }
                });
            });
        };
        Pixera.prototype.fetchTimelineSpeedFactorAsync = function (handle) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, this.queries.ask("Timelines.Timeline.getSpeedFactor", { handle: handle })];
                        case 1: return [2, _a.sent()];
                    }
                });
            });
        };
        var Pixera_1;
        Pixera.kJsonPacketFraming = '0xPX';
        Pixera.kPollInterval = 5000;
        __decorate([
            (0, Metadata_1.callable)("Call to update the set of PIXERA timelines known to Blocks"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], Pixera.prototype, "update", null);
        Pixera = Pixera_1 = __decorate([
            (0, Metadata_1.driver)('NetworkTCP', { port: 1400 }),
            __metadata("design:paramtypes", [Object])
        ], Pixera);
        return Pixera;
    }(Driver_1.Driver));
    var QueryHandler = (function () {
        function QueryHandler(owner) {
            var _this = this;
            this.owner = owner;
            this.pendingQueries = {};
            this.whenLastCheckdStale = 0;
            owner.socket.subscribe('textReceived', function (sender, message) {
                log("textReceived", message.text);
                try {
                    _this.handleMsgFromPixera(JSON.parse(message.text));
                }
                catch (error) {
                    console.error("parsing data from Pixera", error);
                }
            });
        }
        QueryHandler.prototype.ask = function (method, params) {
            var _this = this;
            var now = this.owner.getMonotonousMillis();
            var result = new Promise(function (resolve, reject) {
                var query = new Query(method, params, resolve, reject);
                var sendParams = query.aboutToSend(now);
                var cmd = {
                    jsonrpc: "2.0",
                    id: QueryHandler.nextId++,
                    method: "Pixera." + query.method
                };
                if (sendParams)
                    cmd.params = sendParams;
                _this.pendingQueries[cmd.id] = query;
                var cmdStr = JSON.stringify(cmd);
                _this.owner.socket.sendText(cmdStr + Pixera.kJsonPacketFraming);
                log("ask", cmdStr);
            });
            if (!this.whenLastCheckdStale)
                this.whenLastCheckdStale = now;
            else if (now - this.whenLastCheckdStale >= QueryHandler.kStaleCheckInterval) {
                this.checkStaleQueries(now);
                this.whenLastCheckdStale = now;
            }
            return result;
        };
        QueryHandler.prototype.tell = function (method, params) {
            var cmd = {
                jsonrpc: "2.0",
                id: QueryHandler.NO_QUERY,
                method: "Pixera." + method
            };
            if (params)
                cmd.params = params;
            var cmdStr = JSON.stringify(cmd);
            this.owner.socket.sendText(cmdStr + Pixera.kJsonPacketFraming);
            log("tell", cmdStr);
        };
        QueryHandler.prototype.handleMsgFromPixera = function (msg) {
            if (msg.id === -1)
                this.owner.handleMonitorMsg(msg);
            else if (msg.id !== QueryHandler.NO_QUERY) {
                var query = this.pendingQueries[msg.id];
                if (query) {
                    delete this.pendingQueries[msg.id];
                    query.handleResult(msg);
                }
                else
                    console.warn("spurious data", JSON.stringify(msg));
            }
        };
        QueryHandler.prototype.checkStaleQueries = function (now) {
            for (var id in this.pendingQueries) {
                var query = this.pendingQueries[id];
                if (now - query.getWhenAsked() > QueryHandler.kMaxAge) {
                    delete this.pendingQueries[id];
                    console.error("Query timed out", query.method, "id", id);
                    query.fail("Timeout");
                }
            }
        };
        QueryHandler.nextId = 1;
        QueryHandler.NO_QUERY = '-';
        QueryHandler.kMaxAge = 200;
        QueryHandler.kStaleCheckInterval = 1000;
        return QueryHandler;
    }());
    var Query = (function () {
        function Query(method, params, resolver, rejector) {
            this.method = method;
            this.params = params;
            this.resolver = resolver;
            this.rejector = rejector;
        }
        Query.prototype.aboutToSend = function (timeNow) {
            this.whenAsked = timeNow;
            return this.params;
        };
        Query.prototype.getWhenAsked = function () {
            return this.whenAsked;
        };
        Query.prototype.handleResult = function (resultMsg) {
            if (resultMsg.error) {
                log("rejected query id", resultMsg.id);
                this.rejector(resultMsg.error.message || ("Code: " + resultMsg.error.code));
            }
            else {
                this.resolver(resultMsg.result);
            }
        };
        Query.prototype.fail = function (error) {
            this.rejector(error);
        };
        return Query;
    }());
    var DEBUG = false;
    function log() {
        var messages = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            messages[_i] = arguments[_i];
        }
        if (DEBUG)
            console.info(messages);
    }
});
