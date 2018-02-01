/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2018 by Mike Fahl.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
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
define(["require", "exports", "system_lib/Metadata", "system_lib/Driver"], function (require, exports, Metadata_1, Driver_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     Common functionality needed by projectors controlled over the network.
     */
    var NetworkProjector = /** @class */ (function (_super) {
        __extends(NetworkProjector, _super);
        function NetworkProjector(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.propList = [];
            socket.subscribe('connect', function (sender, message) {
                // console.info('connect msg', message.type);
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
        Object.defineProperty(NetworkProjector.prototype, "power", {
            /**
             Get current power state, if known, else undefined.
             */
            get: function () {
                return this._power.get();
            },
            /**
             Turn power on/off.
             */
            set: function (on) {
                if (this._power.set(on))
                    this.sendCorrection();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(NetworkProjector.prototype, "connected", {
            /**
             Return true if I'm currently online to the projector. Note that
             this may change at any time, as the projector disconnects 30 seconds
             after last command. You don't need to connect explicitly before
             calling one of the public setXxx to change the state, as I connect
             on demand.
             */
            get: function () {
                return this.awake;
            },
            set: function (conn) {
                this.awake = conn;
            },
            enumerable: true,
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
        /**
         Log an error message, incriminating my network connection's name
         */
        NetworkProjector.prototype.errorMsg = function () {
            var messages = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                messages[_i] = arguments[_i];
            }
            messages.unshift(this.socket.fullName); // Provide some context
            console.error(messages);
        };
        /**
         Log a warning message, incriminating my network connection's name
         */
        NetworkProjector.prototype.warnMsg = function () {
            var messages = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                messages[_i] = arguments[_i];
            }
            messages.unshift(this.socket.fullName);
            console.warn(messages);
        };
        /*	Get first state that wants to send a request, else undefined.
         */
        NetworkProjector.prototype.reqToSend = function () {
            for (var _i = 0, _a = this.propList; _i < _a.length; _i++) {
                var p = _a[_i];
                if (p.needsCorrection())
                    return p;
            }
        };
        /**
         If at all possible, and any pending, attempt to send a single correction command.
         */
        NetworkProjector.prototype.sendCorrection = function () {
            var _this = this;
            // Don't even try if there's any command in flight or we're not yet fully awake
            if (this.currCmd || !this.awake) {
                // console.info("sendCorrection NOT", this.currCmd, this.awake);
                return; // No can do
            }
            var req = this.reqToSend(); // Get pending request, if any
            if (req) {
                if (!this.socket.connected) {
                    if (!this.connectDly)
                        this.attemptConnect();
                    // Else a commection attempt will happen after delay
                }
                else {
                    // console.info("req", req.current, req.get());
                    req.correct(this)
                        .then(function () { return _this.sendFailedReported = false; }, function () {
                        if (_this.reqToSend())
                            _this.retryCorrectionSoon(); // Re-try in a while
                    });
                }
            }
        };
        /**
         Correction attempt above failed. Re-try again after som delay.
         */
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
        /**
         Attempt to connect now.
         */
        NetworkProjector.prototype.attemptConnect = function () {
            var _this = this;
            if (!this.connecting && this.socket.enabled) {
                // console.info("attemptConnect");
                this.socket.connect().then(function () { return _this.justConnected(); }, function (error) { return _this.connectStateChanged(); });
                this.connecting = true;
            }
        };
        /**
         Override if you want to do something once connection has been established
         successfully.
         */
        NetworkProjector.prototype.justConnected = function () {
        };
        /**
         Connection attempt finished (successfully or not), or was disconnected.
         */
        NetworkProjector.prototype.connectStateChanged = function () {
            this.connecting = false;
            // console.info("connectStateChanged", this.socket.isConnected());
            if (!this.socket.connected) {
                this.connected = false; // Tell clients connection dropped
                if (this.correctionRetry)
                    this.correctionRetry.cancel();
                if (this.reqToSend())
                    this.connectSoon(); // Got data to send - attempt to re-connect soon
            }
        };
        /**
         Some comms error happened. Disconnect and re-try from the start soon.
         */
        NetworkProjector.prototype.disconnectAndTryAgainSoon = function () {
            if (this.socket.connected)
                this.socket.disconnect();
            this.connectSoon();
        };
        /**
         Arrange to attempt to connect soon.
         */
        NetworkProjector.prototype.connectSoon = function () {
            var _this = this;
            if (!this.connectDly) {
                // console.info("connectSoon");
                this.connectDly = wait(8000);
                this.connectDly.then(function () {
                    _this.connectDly = undefined;
                    _this.attemptConnect();
                });
            }
        };
        /**
         Poll the projector's status with some regularity, to not get out
         of sync if status changed behind our back.
         */
        NetworkProjector.prototype.poll = function () {
            var _this = this;
            this.poller = wait(60000);
            this.poller.then(function () {
                if (!_this.connecting && !_this.connectDly)
                    _this.attemptConnect(); // Status retrieved once connected
                if (!_this.discarded)
                    _this.poll();
            });
        };
        /**
         Failed sending command. Assume socket is down, and initiate connection
         attempt.
         */
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
            // Else assume done through rejector
        };
        /**
         End of current request (whether successful or failed). Clear out associated state.
         */
        NetworkProjector.prototype.requestFinished = function () {
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
            Metadata_1.property("True if projector is online", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], NetworkProjector.prototype, "connected", null);
        return NetworkProjector;
    }(Driver_1.Driver));
    exports.NetworkProjector = NetworkProjector;
    /**
     Property state for a single property, with current and wanted values, allowing
     for desired-state-tracking behavior in the driver, rather than command queueing.
     */
    var State = /** @class */ (function () {
        function State(baseCmd) {
            this.baseCmd = baseCmd;
        }
        /**
         Return wanted state, if any, else current, else undefined.
         */
        State.prototype.get = function () {
            return this.wanted != undefined ? this.wanted : this.current;
        };
        /**
        Set desired state, returning true if this was news compared to previously
        known state.
         */
        State.prototype.set = function (state) {
            var news = this.wanted !== state;
            this.wanted = state;
            return news;
        };
        /**
         A "current state" update received from the device. Store it as current. Also,
         let the tail wag the dog under the right circumstances. Without this mechanism,
         you may not be able to control the device if it has changed state "behind our
         back". E.g., if the projector has powered itself down due to "no signal", we
         would still thing it is ON if that's the last state set, and since there's then
         no change in the "wanted" value when attempting to turn it on, it won't send the
         command, and the projector can not be turned on from the user's point of view.
    
         Note that for this to work with changes done "behind our back", someone must
         poll the projector with some regularity to learn about its actual status, and
         then call this function with the result.
         */
        State.prototype.updateCurrent = function (newState) {
            var lastCurrent = this.current;
            this.current = newState;
            // console.info("updateCurrent", this.baseCmd, newState);
            if (lastCurrent !== newState && newState !== undefined) {
                // Got a new, defined, current state
                if (lastCurrent === this.wanted) {
                    this.wanted = newState; // Let the tail wag the dog
                    // console.info("updateCurrent wag dog", this.baseCmd, newState);
                }
            }
        };
        /**
         Return true if I have pending correction to send.
         */
        State.prototype.needsCorrection = function () {
            return this.wanted !== undefined && this.current !== this.wanted;
        };
        State.prototype.correct2 = function (drvr, arg) {
            var _this = this;
            // Hold on to wanted in case it changes before reply
            var wanted = this.wanted;
            var result = drvr.request(this.baseCmd, arg);
            result.then(function () {
                _this.current = wanted; // Now consider set
                // console.info("correct2 succeeded", this.baseCmd, wanted);
            });
            return result;
        };
        return State;
    }());
    exports.State = State;
    /**
     Manage a boolean state.
     */
    var BoolState = /** @class */ (function (_super) {
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
    /**
     Manage a numeric state, including limits.
     */
    var NumState = /** @class */ (function (_super) {
        __extends(NumState, _super);
        function NumState(baseCmd, min, max) {
            var _this = _super.call(this, baseCmd) || this;
            _this.baseCmd = baseCmd;
            _this.min = min;
            _this.max = max;
            return _this;
        }
        NumState.prototype.correct = function (drvr) {
            return this.correct2(drvr, this.wanted.toString());
        };
        /**
         Override to validate in range.
         */
        NumState.prototype.set = function (v) {
            if (v < this.min || v > this.max) {
                console.error("Value out of range for", this.baseCmd, v);
                return false;
            }
            return _super.prototype.set.call(this, v);
        };
        return NumState;
    }(State));
    exports.NumState = NumState;
});
