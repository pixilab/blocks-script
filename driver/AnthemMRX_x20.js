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
define(["require", "exports", "system_lib/Metadata", "driver/NetworkProjector"], function (require, exports, Metadata_1, NetworkProjector_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AnthemMRX_x20 = void 0;
    var ZONE_ALL = 'Z0';
    var ZONE_MAIN = 'Z1';
    var ZONE_2 = 'Z2';
    var ZONE_3 = 'Z3';
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
    var VOL_MIN = -90;
    var VOL_MAX = 10;
    var LOG_DEBUG = true;
    var AnthemMRX_x20 = (function (_super) {
        __extends(AnthemMRX_x20, _super);
        function AnthemMRX_x20(socket) {
            var _this = this;
            socket.setReceiveFraming(';');
            _this = _super.call(this, socket) || this;
            _this.staticInfo = {};
            _this.addState(_this._power = new NetworkProjector_1.BoolState(ZONE_MAIN + CMD_POW, 'power'));
            _this.addState(_this._fpb = new NetworkProjector_1.NumState(CMD_FPB, 'frontPanelBrightness', 0, 3));
            _this.addState(_this._mut = new NetworkProjector_1.BoolState(ZONE_MAIN + CMD_MUT, 'mute'));
            _this.addState(_this._sip = new NetworkProjector_1.BoolState(CMD_SIP, 'standbyIPControl'));
            _this.addState(_this._vol = new SignedNumberState(ZONE_MAIN + CMD_VOL, 'volume'));
            _this.poll();
            _this.attemptConnect();
            console.log(_this.socket.fullName);
            return _this;
        }
        Object.defineProperty(AnthemMRX_x20.prototype, "frontPanelBrightness", {
            get: function () {
                var brightness = this._fpb.get();
                return brightness ? brightness : 0;
            },
            set: function (value) {
                if (this._fpb.set(Math.round(value))) {
                    this.sendCorrection();
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AnthemMRX_x20.prototype, "info", {
            get: function () {
                return '' +
                    'model: ' + this.staticInfo[CMD_IDM] + '\n' +
                    'software version: ' + this.staticInfo[CMD_IDS] + '\n' +
                    'region: ' + this.staticInfo[CMD_IDR] + '\n' +
                    'software date: ' + this.staticInfo[CMD_IDB] + '\n' +
                    'hardware version: ' + this.staticInfo[CMD_IDH] + '\n' +
                    'MCU MAC: ' + this.staticInfo[CMD_IDN] + '\n' +
                    '';
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AnthemMRX_x20.prototype, "mute", {
            get: function () {
                var mute = this._mut.get();
                return mute ? mute : false;
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
                return this._powerAll;
            },
            set: function (on) {
                this.power = on;
                if (this._powZone2)
                    this['powerZone2'] = on;
                if (this._powZone3)
                    this['powerZone3'] = on;
                this._powerAll = on;
            },
            enumerable: false,
            configurable: true
        });
        AnthemMRX_x20.prototype.updatePowerAll = function () {
            var mainOn = this._power.get();
            var zone2On = (!this._powZone2 || this._powZone2.get());
            var zone3On = (!this._powZone3 || this._powZone3.get());
            var newValue = mainOn && zone2On && zone3On;
            if (this._powerAll !== newValue) {
                this._powerAll = newValue;
                this.changed('powerAll');
            }
        };
        AnthemMRX_x20.prototype.createDynamicPowerProperty = function (zone) {
            var _this = this;
            if (LOG_DEBUG)
                console.log('trying to create dynamic power property for zone ' + zone);
            var state = this['_powZone' + zone];
            this.property('powerZone' + zone, { type: Boolean, description: 'Power Zone ' + zone + ' on/off)' }, function (setValue) {
                if (setValue !== undefined) {
                    if (state === null || state === void 0 ? void 0 : state.set(setValue))
                        _this.sendCorrection();
                }
                return state === null || state === void 0 ? void 0 : state.get();
            });
        };
        Object.defineProperty(AnthemMRX_x20.prototype, "standbyIPControl", {
            get: function () {
                return this._sip.get();
            },
            set: function (value) {
                if (this._sip.set(value)) {
                    this.sendCorrection();
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AnthemMRX_x20.prototype, "volume", {
            get: function () {
                var volume = this._vol.get();
                return volume === undefined ? 0 : volume;
            },
            set: function (value) {
                if (this._vol.set(value)) {
                    this.sendCorrection();
                }
            },
            enumerable: false,
            configurable: true
        });
        AnthemMRX_x20.prototype.createDynamicVolumeProperty = function (zone) {
            var _this = this;
            if (LOG_DEBUG)
                console.log('trying  to create dynamic volume property for zone ' + zone);
            var state = this['_volZone' + zone];
            this.property('volumeZone' + zone, { type: Number, min: VOL_MIN, max: VOL_MAX, description: 'Volume Zone ' + zone + ')' }, function (setValue) {
                if (setValue !== undefined) {
                    if (state === null || state === void 0 ? void 0 : state.set(setValue))
                        _this.sendCorrection();
                }
                var stateValue = state === null || state === void 0 ? void 0 : state.get();
                return stateValue;
            });
        };
        AnthemMRX_x20.prototype.displayMessage = function (message, row) {
            this.sendText(ZONE_MAIN + CMD_MSG +
                Math.round(row) +
                message.substr(0, 100));
        };
        AnthemMRX_x20.prototype.textReceived = function (text) {
            var result = text;
            var error = undefined;
            var requestActive = this.currCmd !== undefined;
            if (text[0] == '!') {
                var firstTwoChars = text.substr(0, 2);
                error = firstTwoChars;
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
                        break;
                }
                if (failed) {
                    this.requestFailure(text);
                    return;
                }
            }
            else {
            }
            if (requestActive) {
                this.requestSuccess(result);
                this.requestFinished();
            }
            this.processStatusChange(text, error);
        };
        AnthemMRX_x20.prototype.processStatusChange = function (text, error) {
            var firstChar = text.substr(0, 1);
            if (firstChar == 'Z') {
                var zoneID = parseInt(text.substr(1, 1));
                var cmd = text.substr(2, 3);
                var value = text.substr(5);
                switch (cmd) {
                    case CMD_MUT:
                        var newMute = value == '1';
                        if (zoneID == 1)
                            this._mut.updateCurrent(newMute);
                        break;
                    case CMD_POW:
                        var newPower = value == '1';
                        if (zoneID == 1)
                            this._power.updateCurrent(newPower);
                        else if (value !== '?') {
                            var state = this['_powZone' + zoneID];
                            if (!state)
                                state = this.setupStates(zoneID).pow;
                            state.updateCurrent(newPower);
                        }
                        this.updatePowerAll();
                        if (!this.getToKnowRunning && newPower)
                            this.request('Z' + zoneID + CMD_VOL);
                        break;
                    case CMD_VOL:
                        var newVolume = parseInt(value);
                        if (zoneID == 1)
                            this._vol.updateCurrent(newVolume);
                        else if (value !== '?') {
                            var state = this['_volZone' + zoneID];
                            if (!state)
                                state = this.setupStates(zoneID).vol;
                            state.updateCurrent(newVolume);
                        }
                        break;
                }
            }
            else if (text.length > 3) {
                var cmd = text.substr(0, 3);
                var value = text.substr(3);
                switch (cmd) {
                    case CMD_FPB:
                        var newBrightness = parseInt(value);
                        this._fpb.updateCurrent(newBrightness);
                        break;
                    case CMD_IDB:
                    case CMD_IDH:
                    case CMD_IDM:
                    case CMD_IDN:
                    case CMD_IDQ:
                    case CMD_IDR:
                    case CMD_IDS:
                        this.staticInfo[cmd] = value;
                        this.changed('info');
                        break;
                }
            }
        };
        AnthemMRX_x20.prototype.setupStates = function (zone, zoneOff) {
            return {
                pow: this.setupPowerState(zone),
                vol: this.setupVolumeState(zone, zoneOff ? 0 : undefined),
            };
        };
        AnthemMRX_x20.prototype.setupPowerState = function (zone) {
            var state = this['_powZone' + zone] = new NetworkProjector_1.BoolState('Z' + zone + CMD_POW, 'powerZone' + zone);
            this.addState(state);
            this.createDynamicPowerProperty(zone);
            return state;
        };
        AnthemMRX_x20.prototype.setupVolumeState = function (zone, initialVolume) {
            var state = this['_volZone' + zone] = new SignedNumberState('Z' + zone + CMD_VOL, 'volumeZone' + zone);
            if (initialVolume !== undefined)
                state.updateCurrent(initialVolume);
            this.addState(state);
            this.createDynamicVolumeProperty(zone);
            return state;
        };
        AnthemMRX_x20.prototype.justConnected = function () {
            var _this = this;
            console.log('connected');
            this.connected = true;
            this.getToKnowRunning = true;
            this.requestPower().then(function () { return _this.requestVolumes().then(function () { return _this.requestStaticInfo().then(function () { return _this.getToKnowRunning = false; }); }); });
        };
        AnthemMRX_x20.prototype.requestPower = function () {
            return this.requestAllZones(CMD_POW);
        };
        AnthemMRX_x20.prototype.requestVolumes = function () {
            return this.requestAllZones(CMD_VOL);
        };
        AnthemMRX_x20.prototype.requestAllZones = function (cmd) {
            var _this = this;
            return new Promise(function (resolve) {
                _this.request(ZONE_MAIN + cmd).finally(function () { return _this.request(ZONE_2 + cmd).finally(function () { return _this.request(ZONE_3 + cmd).finally(function () { return resolve(); }); }); });
            });
        };
        AnthemMRX_x20.prototype.requestStaticInfo = function () {
            var _this = this;
            return new Promise(function (resolve) {
                _this.request(CMD_IDQ).finally(function () { return _this.request(CMD_IDM).finally(function () { return _this.request(CMD_IDS).finally(function () { return _this.request(CMD_IDR).finally(function () { return _this.request(CMD_IDB).finally(function () { return _this.request(CMD_IDH).finally(function () { return _this.request(CMD_IDN).finally(function () { return resolve(); }); }); }); }); }); }); });
            });
        };
        AnthemMRX_x20.prototype.getDefaultEoln = function () {
            return ';';
        };
        AnthemMRX_x20.prototype.pollStatus = function () {
            var _this = this;
            if (this.okToSendCommand()) {
                this.request(ZONE_MAIN + CMD_POW)
                    .catch(function (error) {
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
            Metadata_1.property('Info'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], AnthemMRX_x20.prototype, "info", null);
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
            Metadata_1.property("Standby IP Control. This must be enabled for the power-on command to operate via IP. Note that anabling this disables ECO mode."),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], AnthemMRX_x20.prototype, "standbyIPControl", null);
        __decorate([
            Metadata_1.property("Volume, Main Zone"),
            Metadata_1.min(VOL_MIN),
            Metadata_1.max(VOL_MAX),
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
            var request = this.correct2(drvr, (this.wanted >= 0 ? '+' : '') + this.wanted.toString());
            return request;
        };
        SignedNumberState.prototype.set = function (v) {
            return _super.prototype.set.call(this, Math.round(v));
        };
        SignedNumberState.prototype.get = function () {
            var result = _super.prototype.get.call(this);
            return result !== undefined ? result : 0;
        };
        return SignedNumberState;
    }(NetworkProjector_1.State));
});
