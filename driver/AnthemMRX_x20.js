var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
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
define(["require", "exports", "system_lib/Metadata", "driver/NetworkProjector"], function (require, exports, Metadata_1, NetworkProjector_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AnthemMRX_x20 = void 0;
    var ZONE_ALL = 'Z0';
    var ZONE_MAIN = 'Z1';
    var CMD_FPB = 'FPB';
    var CMD_SIP = 'SIP';
    var CMD_MUT = 'MUT';
    var CMD_POW = 'POW';
    var CMD_VOL = 'VOL';
    var CMD_IDQ = 'IDQ';
    var CMD_IDM = 'IDM';
    var CMD_IDS = 'IDS';
    var CMD_IDR = 'IDR';
    var CMD_IDB = 'IDB';
    var CMD_IDH = 'IDH';
    var CMD_IDN = 'IDN';
    var CMD_MSG = 'MSG';
    var ERROR_CANNOT_BE_EXECUTED_PREFIX = '!E';
    var ERROR_OUT_OF_RANGE_PREFIX = '!R';
    var ERROR_INVALID_COMMAND_PREFIX = '!I';
    var ERROR_ZONE_OFF_PREFIX = '!Z';
    var AnthemMRX_x20 = (function (_super) {
        __extends(AnthemMRX_x20, _super);
        function AnthemMRX_x20(socket) {
            var _this = this;
            socket.setReceiveFraming(';');
            _this = _super.call(this, socket) || this;
            _this.addState(_this._power = new NetworkProjector_1.BoolState(ZONE_MAIN + CMD_POW, 'power'));
            _this.addState(_this._powerAll = new NetworkProjector_1.BoolState(ZONE_ALL + CMD_POW, 'powerAll'));
            _this.addState(_this._fpb = new NetworkProjector_1.NumState(CMD_FPB, 'frontPanelBrightness', 0, 3));
            _this.addState(_this._mut = new NetworkProjector_1.BoolState(ZONE_MAIN + CMD_MUT, 'mute'));
            _this.addState(_this._vol = new SignedNumberState(ZONE_MAIN + CMD_VOL, 'volume'));
            _this.poll();
            _this.attemptConnect();
            console.log(_this.socket.fullName);
            return _this;
        }
        Object.defineProperty(AnthemMRX_x20.prototype, "frontPanelBrightness", {
            get: function () {
                return this._fpb.get();
            },
            set: function (value) {
                if (this._fpb.set(Math.round(value))) {
                    this.sendCorrection();
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AnthemMRX_x20.prototype, "mute", {
            get: function () {
                return this._mut.get();
            },
            set: function (value) {
                if (this._mut.set(value)) {
                    this.sendCorrection();
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AnthemMRX_x20.prototype, "powerAll", {
            get: function () {
                return this._power.get();
            },
            set: function (on) {
                if (this._powerAll.set(on))
                    this.sendCorrection();
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AnthemMRX_x20.prototype, "volume", {
            get: function () {
                return this._vol.get();
            },
            set: function (value) {
                if (this._vol.set(value)) {
                    this.sendCorrection();
                }
            },
            enumerable: false,
            configurable: true
        });
        AnthemMRX_x20.prototype.displayMessage = function (message, row) {
            this.sendText(ZONE_MAIN + CMD_MSG +
                Math.round(row) +
                message.substr(0, 100));
        };
        AnthemMRX_x20.prototype.textReceived = function (text) {
            var result = text;
            if (text[0] == '!') {
                var firstTwoChars = text.substr(0, 2);
                var followingChars = text.substr(2);
                var failed = false;
                switch (firstTwoChars) {
                    case ERROR_CANNOT_BE_EXECUTED_PREFIX:
                        console.warn('can not be executed: "' + followingChars + '"');
                        break;
                    case ERROR_OUT_OF_RANGE_PREFIX:
                        console.warn('command out of range: "' + followingChars + '"');
                        break;
                    case ERROR_INVALID_COMMAND_PREFIX:
                        console.error('invalid command: "' + followingChars + '"');
                        break;
                    case ERROR_ZONE_OFF_PREFIX:
                        console.warn('zone is off: "' + followingChars + '"');
                        failed = true;
                        break;
                }
                if (failed) {
                    this.requestFailure(text);
                    return;
                }
            }
            this.requestSuccess(result);
            this.requestFinished();
        };
        AnthemMRX_x20.prototype.justConnected = function () {
            console.log('connected');
            this.connected = true;
        };
        AnthemMRX_x20.prototype.getDefaultEoln = function () {
            return ';';
        };
        AnthemMRX_x20.prototype.pollStatus = function () {
            var _this = this;
            if (this.okToSendCommand()) {
                var powerRequest_1 = ZONE_MAIN + CMD_POW;
                this.request(powerRequest_1).then(function (reply) {
                    if (reply.substr(0, powerRequest_1.length) == powerRequest_1) {
                        var on = (parseInt(reply.substr(powerRequest_1.length)) & 1) != 0;
                        if (!_this.inCmdHoldoff())
                            _this._power.updateCurrent(on);
                    }
                }).catch(function (error) {
                    _this.warnMsg("pollStatus error", error);
                    _this.disconnectAndTryAgainSoon();
                });
            }
            return true;
        };
        AnthemMRX_x20.prototype.request = function (question, param) {
            var _this = this;
            var toSend = question;
            toSend += (param === undefined) ? '?' : param;
            this.socket.sendText(toSend, this.getDefaultEoln()).catch(function (err) { return _this.sendFailed(err); });
            var result = this.startRequest(toSend);
            result.finally(function () {
                asap(function () {
                    _this.sendCorrection();
                });
            });
            return result;
        };
        AnthemMRX_x20.prototype.sendCorrection = function () {
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
        AnthemMRX_x20.prototype.inCmdHoldoff = function () {
            return this.recentCmdHoldoff;
        };
        AnthemMRX_x20.prototype.projectorBusy = function () {
            var _this = this;
            if (!this.busyHoldoff) {
                this.busyHoldoff = wait(4000);
                this.busyHoldoff.then(function () { return _this.busyHoldoff = undefined; });
            }
        };
        AnthemMRX_x20.prototype.okToSendCommand = function () {
            return !this.busyHoldoff && _super.prototype.okToSendCommand.call(this);
        };
        __decorate([
            Metadata_1.property('Front panel brightness: 0=off, 1=low, 2=medium, 3=high'),
            Metadata_1.min(0),
            Metadata_1.max(3),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], AnthemMRX_x20.prototype, "frontPanelBrightness", null);
        __decorate([
            Metadata_1.property("Mute"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], AnthemMRX_x20.prototype, "mute", null);
        __decorate([
            Metadata_1.property('Power All Zones on/off'),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], AnthemMRX_x20.prototype, "powerAll", null);
        __decorate([
            Metadata_1.property("Volume, Main Zone"),
            Metadata_1.min(-90),
            Metadata_1.max(10),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], AnthemMRX_x20.prototype, "volume", null);
        __decorate([
            Metadata_1.callable('Display Message'),
            __param(0, Metadata_1.parameter('message')),
            __param(1, Metadata_1.parameter('row 0-1', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number]),
            __metadata("design:returntype", void 0)
        ], AnthemMRX_x20.prototype, "displayMessage", null);
        AnthemMRX_x20 = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 14999 }),
            __metadata("design:paramtypes", [Object])
        ], AnthemMRX_x20);
        return AnthemMRX_x20;
    }(NetworkProjector_1.NetworkProjector));
    exports.AnthemMRX_x20 = AnthemMRX_x20;
    var StringState = (function (_super) {
        __extends(StringState, _super);
        function StringState() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        StringState.prototype.correct = function (drvr) {
            return this.correct2(drvr, this.wanted);
        };
        return StringState;
    }(NetworkProjector_1.State));
    var SignedNumberState = (function (_super) {
        __extends(SignedNumberState, _super);
        function SignedNumberState() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        SignedNumberState.prototype.correct = function (drvr) {
            return this.correct2(drvr, (this.wanted >= 0 ? '+' : '') + this.wanted.toString());
        };
        SignedNumberState.prototype.set = function (v) {
            return _super.prototype.set.call(this, Math.round(v));
        };
        return SignedNumberState;
    }(NetworkProjector_1.State));
});
