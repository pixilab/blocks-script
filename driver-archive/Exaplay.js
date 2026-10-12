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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata", "../system_lib/ScriptBase"], function (require, exports, Driver_1, Metadata_1, ScriptBase_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Exaplay = void 0;
    var Exaplay = (function (_super) {
        __extends(Exaplay, _super);
        function Exaplay(connection) {
            var _this = _super.call(this, connection) || this;
            _this.connection = connection;
            _this.msgQueue = [];
            _this.msgCurrent = null;
            _this.timeOut = null;
            _this.mDiscarded = false;
            _this.kMaxQueue = 20;
            _this.kMinPollingMs = 200;
            connection.autoConnect();
            _this.compositions = _this.namedAggregateProperty("compositions", Composition);
            connection.subscribe('textReceived', function (sender, msg) {
                _this.handleResponse(msg.text);
            });
            connection.subscribe('connect', function () { return _this.flushQueue(); });
            connection.subscribe('finish', function () { return _this.discard(); });
            return _this;
        }
        Exaplay.prototype.discard = function () {
            if (this.mDiscarded)
                return;
            this.mDiscarded = true;
            this.flushQueue();
            for (var compName in this.compositions) {
                var comp = this.compositions[compName];
                if (comp)
                    comp.discard();
            }
        };
        Exaplay.prototype.flushQueue = function () {
            if (this.timeOut) {
                this.timeOut.cancel();
                this.timeOut = null;
            }
            var current = this.msgCurrent;
            this.msgCurrent = null;
            var queued = this.msgQueue;
            this.msgQueue = [];
            if (current)
                current.reject("cancelled");
            for (var _i = 0, queued_1 = queued; _i < queued_1.length; _i++) {
                var req = queued_1[_i];
                req.reject("cancelled");
            }
        };
        Exaplay.prototype.reInitit = function () {
            this.reInitialize();
        };
        Exaplay.prototype.addComposition = function (name, id, enablePolling, pollingInterval) {
            var old = this.compositions[name];
            if (old)
                old.discard();
            var interval = Math.max(this.kMinPollingMs, pollingInterval || 500);
            this.compositions[name] = new Composition(this, id, enablePolling || false, interval);
        };
        Exaplay.prototype.stopAllCompositions = function () {
            for (var compName in this.compositions) {
                var comp = this.compositions[compName];
                comp.playState = "STOP";
            }
        };
        Exaplay.prototype.sendCommand = function (command, id, expectResponse, value) {
            var _this = this;
            if (expectResponse === void 0) { expectResponse = false; }
            return new Promise(function (resolve, reject) {
                if (_this.mDiscarded) {
                    reject("cancelled");
                    return;
                }
                if (expectResponse) {
                    if (!_this.connection.connected || _this.msgQueue.length >= _this.kMaxQueue) {
                        reject("cancelled");
                        return;
                    }
                }
                _this.msgQueue.push({ command: command, id: id, value: value, resolve: resolve, reject: reject, expectResponse: expectResponse });
                _this.processNext();
            });
        };
        Exaplay.prototype.handleResponse = function (response) {
            if (!this.msgCurrent) {
                console.warn("Unexpected response:", response);
                return;
            }
            if (this.msgCurrent.command === "get:status") {
                var parts = response.split(",").map(Number);
                if (parts.length < 5 || parts.some(function (p) { return isNaN(p); })) {
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
        };
        Exaplay.prototype.processNext = function () {
            var _this = this;
            if (this.msgCurrent || this.msgQueue.length === 0)
                return;
            this.msgCurrent = this.msgQueue.shift();
            if (this.msgQueue.length > 1)
                console.log("Warning message queue is ", this.msgQueue.length);
            var msg;
            if (this.msgCurrent.value !== undefined) {
                msg = "".concat(this.msgCurrent.command, ",comp").concat(this.msgCurrent.id, ",").concat(this.msgCurrent.value);
            }
            else {
                msg = "".concat(this.msgCurrent.command, ",comp").concat(this.msgCurrent.id);
            }
            this.connection.sendText(msg);
            if (!this.msgCurrent.expectResponse) {
                this.msgCurrent.resolve();
                this.msgCurrent = null;
                this.processNext();
                return;
            }
            this.timeOut = wait(1000);
            this.timeOut.then(function () {
                if (_this.msgCurrent) {
                    _this.msgCurrent.reject(new Error("Timeout waiting for response"));
                    _this.msgCurrent = null;
                    _this.processNext();
                }
            }).catch(function (err) {
                if (err !== "cancelled") {
                    console.error("processNext timeOut error:", err);
                }
            });
        };
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
        Exaplay = __decorate([
            (0, Metadata_1.driver)('NetworkTCP', { port: 8100 }),
            __metadata("design:paramtypes", [Object])
        ], Exaplay);
        return Exaplay;
    }(Driver_1.Driver));
    exports.Exaplay = Exaplay;
    var Composition = (function (_super) {
        __extends(Composition, _super);
        function Composition(owner, id, enablePolling, pollingInterval, verboseLogging) {
            if (verboseLogging === void 0) { verboseLogging = false; }
            var _this = _super.call(this) || this;
            _this.owner = owner;
            _this.id = id;
            _this.enablePolling = enablePolling;
            _this.pollingInterval = pollingInterval;
            _this.verboseLogging = verboseLogging;
            _this.mPlayState = "STOP";
            _this.mVolume = 0;
            _this.mSyncSource = new TimeFlow(0, 0);
            _this.poller = null;
            _this.mDiscarded = false;
            _this.statusPending = false;
            _this.statusRefreshWanted = false;
            _this.currentPlaybackStatus = 0;
            _this.currentStatus = {
                playbackStatus: 0,
                currentTime: 0,
                currentFrame: 0,
                currentClip: 0,
                totalDuration: 0
            };
            _this.driftCount = 0;
            _this.driftThresholdCount = 10;
            _this.driftMs = 100;
            _this.poll();
            return _this;
        }
        Object.defineProperty(Composition.prototype, "playState", {
            get: function () { return this.mPlayState; },
            set: function (value) {
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
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Composition.prototype, "volume", {
            get: function () { return this.mVolume; },
            set: function (value) {
                if (value !== this.mVolume) {
                    this.owner.sendCommand("set:vol", this.id, false, Math.round(value * 100));
                    this.mVolume = value;
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Composition.prototype, "syncSource", {
            get: function () { return this.mSyncSource; },
            set: function (data) {
                this.mSyncSource = data;
            },
            enumerable: false,
            configurable: true
        });
        Composition.prototype.gotoCueIndex = function (index) {
            this.owner.sendCommand("set:cue", this.id, false, index);
            this.getStatus();
        };
        Composition.prototype.gotoCueTime = function (time) {
            this.owner.sendCommand("set:cuetime", this.id, false, time);
            this.getStatus();
        };
        Composition.prototype.poll = function () {
            var _this = this;
            if (this.enablePolling && !this.mDiscarded) {
                if (this.poller)
                    this.poller.cancel();
                this.poller = wait(this.pollingInterval);
                this.poller.then(function () {
                    if (_this.mDiscarded)
                        return;
                    if (_this.owner.connection.connected) {
                        _this.getStatus();
                    }
                    _this.poll();
                }).catch(function () { });
            }
        };
        Composition.prototype.discard = function () {
            this.mDiscarded = true;
            if (this.poller) {
                this.poller.cancel();
                this.poller = null;
            }
        };
        Composition.prototype.getStatus = function () {
            var _this = this;
            if (this.mDiscarded)
                return;
            if (this.statusPending) {
                this.statusRefreshWanted = true;
                return;
            }
            this.statusPending = true;
            this.owner.sendCommand("get:status", this.id, true).then(function (data) {
                _this.statusDone();
                var strData = String(data);
                var parts = strData.split(",").map(Number);
                var status = {
                    playbackStatus: parts[0],
                    currentTime: parts[1],
                    currentFrame: parts[2],
                    currentClip: parts[3],
                    totalDuration: parts[4]
                };
                var newState = _this.currentPlaybackStatus !== status.playbackStatus;
                if (status.playbackStatus === 0 && newState) {
                    _this.syncSource = new TimeFlow(status.currentTime * 1000, 0);
                    _this.mPlayState = "STOP";
                }
                else if (status.playbackStatus === 1) {
                    if (newState) {
                        _this.syncSource = new TimeFlow(status.currentTime * 1000, 1);
                        _this.mPlayState = "PLAY";
                    }
                    else {
                        _this.checkDrift(status);
                    }
                }
                else if (status.playbackStatus === 2 && newState) {
                    _this.syncSource = new TimeFlow(status.currentTime * 1000, 0);
                    _this.mPlayState = "PAUSE";
                }
                if (newState) {
                    _this.changed("playState");
                }
                _this.currentPlaybackStatus = status.playbackStatus;
                _this.currentStatus = status;
            }).catch(function (err) {
                _this.statusDone();
                if (err !== "cancelled") {
                    console.error("getStatus error:", err);
                }
            });
        };
        Composition.prototype.statusDone = function () {
            this.statusPending = false;
            if (this.statusRefreshWanted) {
                this.statusRefreshWanted = false;
                this.getStatus();
            }
        };
        Composition.prototype.checkDrift = function (status) {
            var currentMs = status.currentTime * 1000;
            var drift = Math.abs(this.syncSource.currentTime - currentMs);
            var nearBeginning = status.currentTime < this.pollingInterval / 1000;
            var looped = status.currentTime < this.currentStatus.currentTime;
            if (nearBeginning || looped) {
                this.syncSource = new TimeFlow(currentMs, 1);
                this.log("TimeFlow reset because playback restarted: ".concat(status.currentTime, "s"));
                this.driftCount = 0;
                return;
            }
            var jumpThresholdMs = this.driftMs * 5;
            if (drift > jumpThresholdMs) {
                this.syncSource = new TimeFlow(currentMs, 1);
                this.log("TimeFlow jump detected, reset immediately: drift=".concat(drift, "ms"));
                this.driftCount = 0;
                return;
            }
            if (drift > this.driftMs) {
                this.driftCount++;
                if (this.driftCount >= this.driftThresholdCount) {
                    this.syncSource = new TimeFlow(currentMs, 1);
                    this.log("TimeFlow drift corrected after ".concat(this.driftCount, " consecutive messages: ").concat(drift, "ms"));
                    this.driftCount = 0;
                }
            }
            else {
                this.driftCount = 0;
            }
        };
        Composition.prototype.log = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            if (this.verboseLogging) {
                console.log.apply(console, args);
            }
        };
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
        return Composition;
    }(ScriptBase_1.AggregateElem));
});
