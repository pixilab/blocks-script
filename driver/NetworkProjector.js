var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
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
define(["require", "exports", "system_lib/Metadata", "system_lib/Driver"], function (require, exports, Metadata_1, Driver_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NumState = exports.BoolState = exports.State = exports.NetworkProjector = void 0;
    var REQUEST_TIMEOUT = 8000;
    var NetworkProjector = (function (_super) {
        __extends(NetworkProjector, _super);
        function NetworkProjector(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.propList = [];
            socket.subscribe('connect', function (sender, message) {
                if (message.type === 'Connection')
                    _this.connectStateChanged();
            });
            socket.subscribe('textReceived', function (sender, msg) {
                return _this.textReceived(msg.text);
            });
            socket.subscribe('finish', function (sender) {
                return _this.discard();
            });
            return _this;
        }
        NetworkProjector.prototype.addState = function (state) {
            this.propList.push(state);
            state.setDriver(this);
        };
        NetworkProjector.prototype.isOfTypeName = function (typeName) {
            return typeName === "NetworkProjector" ? this : null;
        };
        Object.defineProperty(NetworkProjector.prototype, "power", {
            get: function () {
                return this._power.get();
            },
            set: function (on) {
                if (this._power.set(on))
                    this.sendCorrection();
            },
            enumerable: false,
            configurable: true
        });
        NetworkProjector.prototype.sendText = function (text) {
            return this.socket.sendText(text, this.getDefaultEoln());
        };
        NetworkProjector.prototype.getDefaultEoln = function () {
            return undefined;
        };
        Object.defineProperty(NetworkProjector.prototype, "connected", {
            get: function () {
                return this.awake;
            },
            set: function (conn) {
                this.awake = conn;
            },
            enumerable: false,
            configurable: true
        });
        NetworkProjector.prototype.discard = function () {
            this.discarded = true;
            if (this.poller)
                this.poller.cancel();
            if (this.correctionRetry)
                this.correctionRetry.cancel();
            delete this.poller;
        };
        NetworkProjector.prototype.errorMsg = function () {
            var messages = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                messages[_i] = arguments[_i];
            }
            messages.unshift(this.socket.fullName);
            console.error(messages);
        };
        NetworkProjector.prototype.warnMsg = function () {
            var messages = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                messages[_i] = arguments[_i];
            }
            messages.unshift(this.socket.fullName);
            console.warn(messages);
        };
        NetworkProjector.prototype.reqToSend = function () {
            for (var _i = 0, _a = this.propList; _i < _a.length; _i++) {
                var p = _a[_i];
                if (p.needsCorrection())
                    return p;
            }
        };
        NetworkProjector.prototype.okToSendCommand = function () {
            return !this.currCmd;
        };
        NetworkProjector.prototype.sendCorrection = function () {
            var _this = this;
            if (!this.okToSendCommand() || !this.awake) {
                return false;
            }
            var req = this.reqToSend();
            if (req) {
                if (!this.socket.connected) {
                    if (!this.connectDly)
                        this.attemptConnect();
                }
                else {
                    req.correct(this)
                        .then(function () { return _this.sendFailedReported = false; }, function () {
                        if (_this.reqToSend())
                            _this.retryCorrectionSoon();
                    });
                    return true;
                }
            }
            return false;
        };
        NetworkProjector.prototype.retryCorrectionSoon = function () {
            var _this = this;
            if (!this.correctionRetry) {
                this.correctionRetry = wait(20000);
                this.correctionRetry.then(function () {
                    _this.correctionRetry = undefined;
                    _this.sendCorrection();
                });
            }
        };
        NetworkProjector.prototype.attemptConnect = function () {
            var _this = this;
            if (!this.socket.connected && !this.connecting && this.socket.enabled) {
                this.socket.connect().then(function () { return _this.justConnected(); }, function (error) { return _this.connectStateChanged(); });
                this.connecting = true;
            }
        };
        NetworkProjector.prototype.justConnected = function () {
        };
        NetworkProjector.prototype.connectStateChanged = function () {
            this.connecting = false;
            if (!this.socket.connected) {
                this.connected = false;
                if (this.correctionRetry)
                    this.correctionRetry.cancel();
                if (this.reqToSend())
                    this.connectSoon();
            }
        };
        NetworkProjector.prototype.disconnectAndTryAgainSoon = function () {
            if (this.socket.connected)
                this.socket.disconnect();
            this.connectSoon();
        };
        NetworkProjector.prototype.connectSoon = function () {
            var _this = this;
            if (!this.connectDly) {
                this.connectDly = wait(8000);
                this.connectDly.then(function () {
                    _this.connectDly = undefined;
                    _this.attemptConnect();
                });
            }
        };
        NetworkProjector.prototype.poll = function () {
            var _this = this;
            this.poller = wait(21333);
            this.poller.then(function () {
                var continuePolling = true;
                if (!_this.socket.connected) {
                    if (!_this.connecting && !_this.connectDly)
                        _this.attemptConnect();
                }
                else
                    continuePolling = _this.pollStatus();
                if (continuePolling && !_this.discarded)
                    _this.poll();
            });
        };
        NetworkProjector.prototype.pollStatus = function () {
            return false;
        };
        NetworkProjector.prototype.sendFailed = function (err) {
            if (!this.sendFailedReported) {
                this.warnMsg("Failed sending command", this.currCmd, err);
                this.sendFailedReported = true;
            }
            var rejector = this.currRejector;
            if (rejector)
                rejector("Send failed with " + err + ", for " + this.currCmd);
            this.requestFinished();
            if (!rejector)
                this.sendCorrection();
        };
        NetworkProjector.prototype.startRequest = function (cmd) {
            var _this = this;
            this.currCmd = cmd;
            var result = new Promise(function (resolve, reject) {
                _this.currResolver = resolve;
                _this.currRejector = reject;
            });
            this.cmdTimeout = wait(REQUEST_TIMEOUT);
            this.cmdTimeout.then(function () {
                return _this.requestFailure("Timeout for " + cmd);
            });
            return result;
        };
        NetworkProjector.prototype.requestSuccess = function (result) {
            if (this.currResolver)
                this.currResolver(result);
            this.requestClear();
        };
        NetworkProjector.prototype.requestFailure = function (msg) {
            if (this.power)
                this.warnMsg("Request failed", msg);
            var rejector = this.currRejector;
            this.requestClear();
            if (rejector)
                rejector(msg);
        };
        NetworkProjector.prototype.requestFinished = function () {
            if (this.currRejector)
                this.requestFailure("Request failed for unspecific reason");
        };
        NetworkProjector.prototype.requestClear = function () {
            if (this.cmdTimeout)
                this.cmdTimeout.cancel();
            delete this.cmdTimeout;
            delete this.currCmd;
            delete this.currRejector;
            delete this.currResolver;
        };
        __decorate([
            Metadata_1.property("Power on/off"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], NetworkProjector.prototype, "power", null);
        __decorate([
            Metadata_1.callable("Send raw command string to device"),
            __param(0, Metadata_1.parameter("What to send")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", Promise)
        ], NetworkProjector.prototype, "sendText", null);
        __decorate([
            Metadata_1.property("True if projector is online", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], NetworkProjector.prototype, "connected", null);
        return NetworkProjector;
    }(Driver_1.Driver));
    exports.NetworkProjector = NetworkProjector;
    var State = (function () {
        function State(baseCmd, propName, correctionApprover) {
            this.baseCmd = baseCmd;
            this.propName = propName;
            this.correctionApprover = correctionApprover;
        }
        State.prototype.setDriver = function (driver) {
            this.driver = driver;
        };
        State.prototype.get = function () {
            return this.wanted != undefined ? this.wanted : this.current;
        };
        State.prototype.set = function (state) {
            var news = this.wanted !== state;
            this.wanted = state;
            return news;
        };
        State.prototype.updateCurrent = function (newState) {
            var lastCurrent = this.current;
            this.current = newState;
            if (lastCurrent !== newState && newState !== undefined) {
                if (lastCurrent === this.wanted) {
                    this.wanted = newState;
                    this.notifyListeners();
                }
                else if (this.wanted === undefined)
                    this.notifyListeners();
            }
        };
        State.prototype.getCurrent = function () {
            return this.current;
        };
        State.prototype.notifyListeners = function () {
            if (this.driver && this.propName)
                this.driver.changed(this.propName);
        };
        State.prototype.needsCorrection = function () {
            return this.wanted !== undefined &&
                this.current !== this.wanted &&
                (!this.correctionApprover || this.correctionApprover());
        };
        State.prototype.correct2 = function (drvr, arg) {
            var _this = this;
            var wanted = this.wanted;
            var result = drvr.request(this.baseCmd, arg);
            result.then(function () {
                _this.current = wanted;
            });
            return result;
        };
        return State;
    }());
    exports.State = State;
    var BoolState = (function (_super) {
        __extends(BoolState, _super);
        function BoolState() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        BoolState.prototype.correct = function (drvr) {
            return this.correct2(drvr, this.wanted ? '1' : '0');
        };
        return BoolState;
    }(State));
    exports.BoolState = BoolState;
    var NumState = (function (_super) {
        __extends(NumState, _super);
        function NumState(baseCmd, propName, min, max, correctionApprover) {
            var _this = _super.call(this, baseCmd, propName, correctionApprover) || this;
            _this.baseCmd = baseCmd;
            _this.min = min;
            _this.max = max;
            return _this;
        }
        NumState.prototype.correct = function (drvr) {
            return this.correct2(drvr, this.wanted.toString());
        };
        NumState.prototype.set = function (v) {
            if (v < this.min || v > this.max) {
                console.error("Value out of range for", this.baseCmd, v);
                return false;
            }
            return _super.prototype.set.call(this, v);
        };
        NumState.prototype.get = function () {
            var result = _super.prototype.get.call(this);
            if (typeof result !== 'number') {
                console.error("Value invalid for", this.baseCmd, result);
                result = this.min || 0;
            }
            return result;
        };
        return NumState;
    }(State));
    exports.NumState = NumState;
});
