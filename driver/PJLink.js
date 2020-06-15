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
define(["require", "exports", "driver/NetworkProjector", "system_lib/Metadata"], function (require, exports, NetworkProjector_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PJLink = void 0;
    var PJLink = (function (_super) {
        __extends(PJLink, _super);
        function PJLink(socket) {
            var _this = _super.call(this, socket) || this;
            _this.addState(_this._power = new NetworkProjector_1.BoolState('POWR', 'power'));
            _this.addState(_this._input = new NetworkProjector_1.NumState('INPT', 'input', PJLink_1.kMinInput, PJLink_1.kMaxInput, function () { return _this._power.getCurrent(); }));
            _this.poll();
            _this.attemptConnect();
            return _this;
        }
        PJLink_1 = PJLink;
        PJLink.prototype.pollStatus = function () {
            var _this = this;
            if (this.okToSendCommand()) {
                this.request('POWR').then(function (reply) {
                    var on = (parseInt(reply) & 1) != 0;
                    if (!_this.inCmdHoldoff())
                        _this._power.updateCurrent(on);
                    if (on && _this.okToSendCommand())
                        _this.getInputState(true);
                }).catch(function (error) {
                    _this.warnMsg("pollStatus error", error);
                    _this.disconnectAndTryAgainSoon();
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
        PJLink.prototype.getInitialState = function () {
            var _this = this;
            this.connected = false;
            this.request('POWR').then(function (reply) {
                if (!_this.inCmdHoldoff())
                    _this._power.updateCurrent((parseInt(reply) & 1) != 0);
                if (_this._power.get())
                    _this.getInputState();
                else {
                    _this.connected = true;
                    _this.sendCorrection();
                }
            }, function (error) {
                _this.warnMsg("getInitialState POWR error - retry soon", error);
                _this.disconnectAndTryAgainSoon();
            });
        };
        PJLink.prototype.getInputState = function (ignoreError) {
            var _this = this;
            this.request('INPT').then(function (reply) {
                if (!_this.inCmdHoldoff())
                    _this._input.updateCurrent(parseInt(reply));
                _this.connected = true;
                _this.sendCorrection();
            }, function (error) {
                _this.warnMsg("getInitialState INPT error", error);
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
                this.recentCmdHoldoff = wait(10000);
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
                                this.projectorBusy();
                            default:
                                this.warnMsg("PJLink response", currCmd, text);
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
            Meta.property("Desired input source number"),
            Meta.min(PJLink_1.kMinInput),
            Meta.max(PJLink_1.kMaxInput),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], PJLink.prototype, "input", null);
        PJLink = PJLink_1 = __decorate([
            Meta.driver('NetworkTCP', { port: 4352 }),
            __metadata("design:paramtypes", [Object])
        ], PJLink);
        return PJLink;
    }(NetworkProjector_1.NetworkProjector));
    exports.PJLink = PJLink;
});
