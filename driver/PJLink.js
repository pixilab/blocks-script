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
define(["require", "exports", "driver/NetworkProjector", "system_lib/Metadata", "system_lib/Metadata"], function (require, exports, NetworkProjector_1, Meta, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PJLink = void 0;
    var PJLink = exports.PJLink = (function (_super) {
        __extends(PJLink, _super);
        function PJLink(socket) {
            var _this = _super.call(this, socket) || this;
            _this.addState(_this._power = new NetworkProjector_1.BoolState('POWR', 'power'));
            _this.addState(_this._mute = new MuteState('AVMT', 'mute'));
            _this.addState(_this._input = new NetworkProjector_1.NumState('INPT', 'input', PJLink_1.kMinInput, PJLink_1.kMaxInput, function () { return _this._power.getCurrent(); }));
            _this.setKeepAlive(false);
            _this.setPollFrequency(60000);
            _this.poll();
            _this.attemptConnect();
            return _this;
        }
        PJLink_1 = PJLink;
        PJLink.prototype.pollStatus = function () {
            var _this = this;
            if (this.okToSendCommand()) {
                this.request('POWR').then(function (reply) {
                    var value = parseInt(reply);
                    if (typeof value !== 'number')
                        throw "Invalid POWR query response " + reply;
                    var on = (value & 1) != 0;
                    if (!_this.inCmdHoldoff())
                        _this._power.updateCurrent(on);
                    if (on && _this.okToSendCommand())
                        _this.getMiscState1(true);
                }).catch(function (error) {
                    _this.warnMsg("pollStatus error", error);
                    _this.disconnectAndTryAgainSoon(70);
                });
            }
            return true;
        };
        PJLink.prototype.isOfTypeName = function (typeName) {
            return typeName === "PJLink" ? this : _super.prototype.isOfTypeName.call(this, typeName);
        };
        Object.defineProperty(PJLink.prototype, "input", {
            get: function () {
                return this._input.get();
            },
            set: function (value) {
                if (this._input.set(value))
                    this.sendCorrection();
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLink.prototype, "mute", {
            get: function () {
                return this._mute.get();
            },
            set: function (on) {
                if (this._mute.set(on))
                    this.sendCorrection();
            },
            enumerable: false,
            configurable: true
        });
        PJLink.prototype.getInitialState = function () {
            var _this = this;
            if (this.keepAlive)
                this.connected = false;
            this.request('POWR').then(function (reply) {
                if (!_this.inCmdHoldoff())
                    _this._power.updateCurrent((parseInt(reply) & 1) != 0);
                if (_this._power.get())
                    _this.getMiscState1();
                else {
                    _this.connected = true;
                    _this.sendCorrection();
                }
            }, function (error) {
                _this.warnMsg("getInitialState POWR error - retrying", error);
                _this.disconnectAndTryAgainSoon();
            });
        };
        PJLink.prototype.getMiscState1 = function (ignoreError) {
            var _this = this;
            this.request('INPT').then(function (reply) {
                var value = parseInt(reply);
                if (typeof value !== 'number')
                    throw "Invalid INPT query response " + reply;
                if (!_this.inCmdHoldoff())
                    _this._input.updateCurrent(value);
                _this.getMiscState2();
            }, function (error) {
                _this.warnMsg("INPT query error", error);
                if (ignoreError)
                    _this.getMiscState2();
                else {
                    _this.connected = true;
                    _this.sendCorrection();
                }
            });
        };
        PJLink.prototype.getMiscState2 = function (ignoreError) {
            var _this = this;
            this.request('AVMT').then(function (reply) {
                var value = parseInt(reply);
                if (typeof value !== 'number')
                    throw "Invalid AVMT query response " + reply;
                if (!_this.inCmdHoldoff())
                    _this._mute.updateCurrent(value === 31);
                _this.connected = true;
                _this.sendCorrection();
            }, function (error) {
                _this.warnMsg("AVMT query error", error);
                if (!ignoreError) {
                    _this.connected = true;
                    _this.sendCorrection();
                }
            });
        };
        PJLink.prototype.sendCorrection = function () {
            var _this = this;
            var didSend = _super.prototype.sendCorrection.call(this);
            if (didSend) {
                if (this.recentCmdHoldoff)
                    this.recentCmdHoldoff.cancel();
                this.recentCmdHoldoff = wait(5000);
                this.recentCmdHoldoff.then(function () { return _this.recentCmdHoldoff = undefined; });
            }
            return didSend;
        };
        PJLink.prototype.inCmdHoldoff = function () {
            return this.recentCmdHoldoff;
        };
        PJLink.prototype.request = function (question, param) {
            var _this = this;
            var toSend = '%1' + question;
            toSend += ' ';
            toSend += (param === undefined) ? '?' : param;
            this.socket.sendText(toSend).catch(function (err) { return _this.sendFailed(err); });
            var result = this.startRequest(toSend);
            result.finally(function () {
                asap(function () {
                    _this.sendCorrection();
                });
            });
            return result;
        };
        PJLink.prototype.textReceived = function (text) {
            text = text.toUpperCase();
            if (text.indexOf('PJLINK ') === 0) {
                if (this.unauthenticated = (text.indexOf('PJLINK 1') === 0))
                    this.errorMsg("PJLink authentication not supported");
                else
                    this.getInitialState();
                return;
            }
            var msgStart = text.indexOf('%');
            if (msgStart > 0)
                text = text.substring(msgStart);
            var currCmd = this.currCmd;
            if (!currCmd) {
                this.warnMsg("Unsolicited data", text);
                return;
            }
            currCmd = currCmd.substring(0, 6);
            if (currCmd) {
                var expectedResponse = currCmd + '=';
                if (text.indexOf(expectedResponse) === 0) {
                    text = text.substr(expectedResponse.length);
                    var treatAsOk = text.indexOf('ERR') !== 0;
                    if (treatAsOk && this.recentCmdHoldoff) {
                        this.recentCmdHoldoff.cancel();
                        this.recentCmdHoldoff = undefined;
                    }
                    if (!treatAsOk) {
                        switch (text) {
                            case 'ERR1':
                                this.errorMsg("Undefined command", this.currCmd);
                                treatAsOk = true;
                                break;
                            case 'ERR2':
                                this.errorMsg("Bad command parameter", this.currCmd);
                                treatAsOk = true;
                                break;
                            case 'ERR3':
                                treatAsOk = true;
                                this.projectorBusy();
                                this.warnMsg("PJLink projector BUSY", currCmd, text);
                                break;
                            default:
                                this.warnMsg("PJLink unexpected response", currCmd, text);
                                break;
                        }
                        if (!treatAsOk)
                            this.requestFailure(text);
                    }
                    if (treatAsOk)
                        this.requestSuccess(text);
                }
                else
                    this.requestFailure("Expected reply " + expectedResponse + ", got " + text);
            }
            else
                this.warnMsg("Unexpected data", text);
            this.requestFinished();
        };
        PJLink.prototype.projectorBusy = function () {
            var _this = this;
            if (!this.busyHoldoff) {
                this.busyHoldoff = wait(4000);
                this.busyHoldoff.then(function () { return _this.busyHoldoff = undefined; });
            }
        };
        PJLink.prototype.okToSendCommand = function () {
            return !this.busyHoldoff && _super.prototype.okToSendCommand.call(this);
        };
        var PJLink_1;
        PJLink.kMinInput = 11;
        PJLink.kMaxInput = 59;
        __decorate([
            Meta.property("Desired input source number; 11…59"),
            Meta.min(PJLink_1.kMinInput),
            Meta.max(PJLink_1.kMaxInput),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], PJLink.prototype, "input", null);
        __decorate([
            (0, Metadata_1.property)("A/V Muted"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], PJLink.prototype, "mute", null);
        PJLink = PJLink_1 = __decorate([
            Meta.driver('NetworkTCP', { port: 4352 }),
            __metadata("design:paramtypes", [Object])
        ], PJLink);
        return PJLink;
    }(NetworkProjector_1.NetworkProjector));
    var MuteState = (function (_super) {
        __extends(MuteState, _super);
        function MuteState() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        MuteState.prototype.correct = function (drvr) {
            return this.correct2(drvr, this.wanted ? '31' : '30');
        };
        return MuteState;
    }(NetworkProjector_1.BoolState));
});
