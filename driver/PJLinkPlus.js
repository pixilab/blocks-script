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
    var _a;
    Object.defineProperty(exports, "__esModule", { value: true });
    var CMD_POWR = 'POWR';
    var CMD_INPT = 'INPT';
    var CMD_AVMT = 'AVMT';
    var CMD_FREZ = 'FREZ';
    var CMD_ERST = 'ERST';
    var CMD_LAMP = 'LAMP';
    var CMD_INST = 'INST';
    var CMD_NAME = 'NAME';
    var CMD_INF1 = 'INF1';
    var CMD_INF2 = 'INF2';
    var CMD_INFO = 'INFO';
    var CMD_CLSS = 'CLSS';
    var CMD_SNUM = 'SNUM';
    var CMD_SVER = 'SVER';
    var CMD_INNM = 'INNM';
    var CMD_IRES = 'IRES';
    var CMD_RRES = 'RRES';
    var CMD_FILT = 'FILT';
    var CMD_RLMP = 'RLMP';
    var CMD_RFIL = 'RFIL';
    var CMD_SVOL = 'SVOL';
    var CMD_MVOL = 'MVOL';
    var ERR_1 = 'ERR1';
    var ERR_2 = 'ERR2';
    var ERR_3 = 'ERR3';
    var ERR_4 = 'ERR4';
    var ERR_A = 'ERRA';
    var STATUS_POLL_INTERVAL = 20000;
    var FETCH_INFO_ON_STARTUP = true;
    var MUTE_MIN = 10;
    var MUTE_MAX = 31;
    var RESOLUTION_SPLIT = 'x';
    var IRES_NO_SIGNAL = '-';
    var IRES_UNKNOWN_SIGNAL = '*';
    var INPT_RGB = 1;
    var INPT_VIDEO = 2;
    var INPT_DIGITAL = 3;
    var INPT_STORAGE = 4;
    var INPT_NETWORK = 5;
    var INPT_INTERNAL = 6;
    var PJLinkPlus = (function (_super) {
        __extends(PJLinkPlus, _super);
        function PJLinkPlus(socket) {
            var _this = _super.call(this, socket) || this;
            _this.wantedDeviceParameters = [
                CMD_POWR,
                CMD_ERST,
                CMD_CLSS,
                CMD_AVMT,
                CMD_LAMP,
                CMD_NAME,
                CMD_INF1,
                CMD_INF2,
                CMD_INFO,
                CMD_SNUM,
                CMD_SVER,
                CMD_RLMP,
                CMD_RFIL,
                CMD_IRES,
                CMD_RRES,
                CMD_FILT,
            ];
            _this.skipDeviceParameters = [];
            _this._lineBreak = '\n';
            _this.devicePollParameters = [
                CMD_CLSS,
                CMD_ERST,
                CMD_POWR,
                CMD_INPT,
            ];
            _this._lastKnownConnectionDateSet = false;
            _this._powerStatus = 0;
            _this._isOff = false;
            _this._isOn = false;
            _this._isCooling = false;
            _this._isWarmingUp = false;
            _this._inputType = 0;
            _this._inputSource = '1';
            _this._lampCount = 0;
            _this._lampOneHours = -1;
            _this._lampTwoHours = -1;
            _this._lampThreeHours = -1;
            _this._lampFourHours = -1;
            _this._lampOneActive = false;
            _this._lampTwoActive = false;
            _this._lampThreeActive = false;
            _this._lampFourActive = false;
            _this._filterUsageTime = -1;
            _this._errorStatus = '000000';
            _this._errorStatusFan = 0;
            _this._errorStatusLamp = 0;
            _this._errorStatusTemperature = 0;
            _this._errorStatusCoverOpen = 0;
            _this._errorStatusFilter = 0;
            _this._errorStatusOther = 0;
            _this._hasError = false;
            _this._hasWarning = false;
            _this._currentParameterFetchList = [];
            _this.addState(_this._power = new NetworkProjector_1.BoolState('POWR', 'power'));
            _this.addState(_this._input = new StringState(CMD_INPT, 'input', function () { return _this._power.getCurrent(); }));
            _this._mute = new NetworkProjector_1.NumState(CMD_AVMT, 'mute', MUTE_MIN, MUTE_MAX, function () { return _this._power.getCurrent(); });
            _this.addState(_this._freeze = new NetworkProjector_1.BoolState(CMD_FREZ, 'freeze', function () { return _this._power.getCurrent(); }));
            _this.addState(_this._mute);
            _this._mute.set(MUTE_MIN);
            socket.subscribe('connect', function (_sender, _message) {
                _this.onConnectStateChange();
            });
            _this.pollDeviceStatus();
            if (FETCH_INFO_ON_STARTUP) {
                wait(3000).then(function () {
                    _this.fetchDeviceInfo();
                });
            }
            _this.poll();
            _this.attemptConnect();
            return _this;
        }
        PJLinkPlus_1 = PJLinkPlus;
        PJLinkPlus.prototype.fetchDeviceInfo = function () {
            var _this = this;
            var delay = this.connected ? 0 : (this.isOnline ? 5000 : 0);
            delay += this.socket.connected ? 0 : (this.isOnline ? 25000 : 0);
            if (!this.fetchingDeviceInfo) {
                this.fetchingDeviceInfo = new Promise(function (resolve, reject) {
                    _this.fetchDeviceInfoResolver = resolve;
                    if (_this.isOnline) {
                        wait(5000 + delay).then(function () {
                            reject("Timeout");
                            delete _this.fetchingDeviceInfo;
                            delete _this.fetchDeviceInfoResolver;
                        });
                    }
                    else {
                        wait(100).then(function () {
                            reject('Projector/Display seems offline');
                            delete _this.fetchingDeviceInfo;
                            delete _this.fetchDeviceInfoResolver;
                        });
                    }
                });
            }
            this.delayedInfoFetch(delay);
            return this.fetchingDeviceInfo;
        };
        PJLinkPlus.prototype.delayedInfoFetch = function (countdown) {
            var _this = this;
            if (this.socket.connected && this.connected) {
                this.fetchDeviceInformation(this.wantedDeviceParameters);
            }
            else if (countdown < 0) {
            }
            else {
                this.delayedDeviceInfoFetch = wait(PJLinkPlus_1.delayedFetchInterval);
                this.delayedDeviceInfoFetch.then(function () {
                    _this.delayedInfoFetch(countdown - PJLinkPlus_1.delayedFetchInterval);
                });
            }
        };
        Object.defineProperty(PJLinkPlus.prototype, "powerStatus", {
            get: function () {
                return this._powerStatus;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "isOff", {
            get: function () {
                return this._isOff;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "isOn", {
            get: function () {
                return this._isOn;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "isCooling", {
            get: function () {
                return this._isCooling;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "isWarmingUp", {
            get: function () {
                return this._isWarmingUp;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "input", {
            get: function () {
                return this._input.get();
            },
            set: function (value) {
                if (value.length != 2)
                    return;
                this.setInput(parseInt(value[0]), value[1]);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "inputRGB", {
            get: function () {
                return this._inputType == INPT_RGB ? this._inputSource : '-';
            },
            set: function (value) {
                this.setInput(INPT_RGB, value);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "inputVideo", {
            get: function () {
                return this._inputType == INPT_VIDEO ? this._inputSource : '-';
            },
            set: function (value) {
                this.setInput(INPT_VIDEO, value);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "inputDigital", {
            get: function () {
                return this._inputType == INPT_DIGITAL ? this._inputSource : '-';
            },
            set: function (value) {
                this.setInput(INPT_DIGITAL, value);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "inputStorage", {
            get: function () {
                return this._inputType == INPT_STORAGE ? this._inputSource : '-';
            },
            set: function (value) {
                this.setInput(INPT_STORAGE, value);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "inputNetwork", {
            get: function () {
                return this._inputType == INPT_NETWORK ? this._inputSource : '-';
            },
            set: function (value) {
                this.setInput(INPT_NETWORK, value);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "inputInternal", {
            get: function () {
                return this._inputType == INPT_INTERNAL ? this._inputSource : '-';
            },
            set: function (value) {
                this.setInput(INPT_INTERNAL, value);
            },
            enumerable: true,
            configurable: true
        });
        PJLinkPlus.prototype.setInput = function (type, id) {
            if (id.length != 1)
                return false;
            if (type < INPT_RGB || type > INPT_INTERNAL)
                return false;
            var nonNumberID = parseInt(id) === NaN;
            if (this._class == 2) {
                if (nonNumberID && !this.isValidLetter(id)) {
                    console.log('not a valid letter or number');
                    return false;
                }
            }
            else {
                console.log('not a valid number');
                if (nonNumberID)
                    return false;
            }
            this._inputType = type;
            this._inputSource = id;
            if (this._input.set(type + id)) {
                this.sendCorrection();
            }
            return true;
        };
        PJLinkPlus.prototype.isValidLetter = function (str) {
            return str.length === 1 && str.match(/[A-Z]/);
        };
        Object.defineProperty(PJLinkPlus.prototype, "mute", {
            get: function () {
                return this._mute.get();
            },
            set: function (value) {
                if (this._mute.set(value)) {
                    this.sendCorrection();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "muteAudio", {
            get: function () {
                var currentValue = this._mute.get();
                return currentValue == 31 || currentValue == 21;
            },
            set: function (value) {
                this.mute = value ? 21 : 20;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "muteVideo", {
            get: function () {
                var currentValue = this._mute.get();
                return currentValue == 31 || currentValue == 11;
            },
            set: function (value) {
                this.mute = value ? 11 : 10;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "inputResolution", {
            get: function () {
                if (this._inputResolution) {
                    return this._inputResolution.toString();
                }
                return 'undefined';
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "recommendedResolution", {
            get: function () {
                if (this._recommendedResolution) {
                    return this._recommendedResolution.toString();
                }
                return 'undefined';
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "deviceName", {
            get: function () {
                return this._deviceName;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "manufactureName", {
            get: function () {
                return this._manufactureName;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "productName", {
            get: function () {
                return this._productName;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "otherInformation", {
            get: function () {
                return this._otherInformation;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "serialNumber", {
            get: function () {
                return this._serialNumber;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "softwareVersion", {
            get: function () {
                return this._softwareVersion;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampCount", {
            get: function () {
                return this._lampCount;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampOneHours", {
            get: function () {
                return this._lampOneHours;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampTwoHours", {
            get: function () {
                return this._lampTwoHours;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampThreeHours", {
            get: function () {
                return this._lampThreeHours;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampFourHours", {
            get: function () {
                return this._lampFourHours;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampOneActive", {
            get: function () {
                return this._lampOneActive;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampTwoActive", {
            get: function () {
                return this._lampTwoActive;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampThreeActive", {
            get: function () {
                return this._lampThreeActive;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampFourActive", {
            get: function () {
                return this._lampFourActive;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampReplacementModelNumber", {
            get: function () {
                return this._lampReplacementModelNumber;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "hasFilter", {
            get: function () {
                return this._hasFilter;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "filterUsageTime", {
            get: function () {
                return this._filterUsageTime;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "filterReplacementModelNumber", {
            get: function () {
                return this._filterReplacementModelNumber;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "errorStatus", {
            get: function () {
                return this._errorStatus;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "hasError", {
            get: function () {
                return this._hasError;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "hasWarning", {
            get: function () {
                return this._hasWarning;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "hasProblem", {
            get: function () {
                return this._hasError || this._hasWarning;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "isOnline", {
            get: function () {
                var now = new Date();
                if (this.socket.connected) {
                    this._lastKnownConnectionDate = now;
                    return true;
                }
                if (!this._lastKnownConnectionDateSet) {
                    console.warn('last known connection date unknown');
                    return false;
                }
                var msSinceLastConnection = now.getTime() - this._lastKnownConnectionDate.getTime();
                return msSinceLastConnection < 42000;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "detailedStatusReport", {
            get: function () {
                if (this._infoFetchDate === undefined) {
                    return 'call "fetchDeviceInfo" at least once before requesting "detailedStatusReport"';
                }
                return 'Device: ' + this._manufactureName + ' ' + this._productName + ' ' + this._deviceName + this._lineBreak +
                    'Power status: ' + this.translatePowerCode(this._powerStatus) + this._lineBreak +
                    'Error status: (' + this._errorStatus + ')' + this._lineBreak +
                    'Fan: ' + this.translateErrorCode(this._errorStatusFan) + this._lineBreak +
                    'Lamp' + (this._lampCount > 1 ? 's' : '') + ': ' + (this._hasLamps !== undefined && this._hasLamps ? this.translateErrorCode(this._errorStatusLamp) : '[no lamps]') + this._lineBreak +
                    'Temperature: ' + this.translateErrorCode(this._errorStatusTemperature) + this._lineBreak +
                    'Cover open: ' + this.translateErrorCode(this._errorStatusCoverOpen) + this._lineBreak +
                    'Filter: ' + (this._hasFilter !== undefined && this._hasFilter ? this.translateErrorCode(this._errorStatusFilter) : '[no filter]') + this._lineBreak +
                    (this._filterReplacementModelNumber ? 'Filter replacement model number: ' + this._filterReplacementModelNumber + this._lineBreak : '') +
                    'Other: ' + this.translateErrorCode(this._errorStatusOther) + this._lineBreak +
                    (this._lampCount > 0 ? 'Lamp status: ' + this._lineBreak : '') +
                    (this._lampCount > 0 ? 'Lamp one: ' + (this._lampOneActive ? 'on' : 'off') + ', ' + this._lampOneHours + ' lighting hours' + this._lineBreak : '') +
                    (this._lampCount > 1 ? 'Lamp two: ' + (this._lampTwoActive ? 'on' : 'off') + ', ' + this._lampTwoHours + ' lighting hours' + this._lineBreak : '') +
                    (this._lampCount > 2 ? 'Lamp three: ' + (this._lampThreeActive ? 'on' : 'off') + ', ' + this._lampThreeHours + ' lighting hours' + this._lineBreak : '') +
                    (this._lampCount > 3 ? 'Lamp four: ' + (this._lampFourActive ? 'on' : 'off') + ', ' + this._lampFourHours + ' lighting hours' + this._lineBreak : '') +
                    (this._lampReplacementModelNumber ? 'Lamp replacement model number: ' + this._lampReplacementModelNumber + this._lineBreak : '') +
                    (this._serialNumber ? 'SNR: ' + this._serialNumber + this._lineBreak : '') +
                    (this._softwareVersion ? 'Software version: ' + this._softwareVersion + this._lineBreak : '') +
                    '(class ' + this._class + ', status report last updated ' + this._infoFetchDate + ')';
            },
            enumerable: true,
            configurable: true
        });
        PJLinkPlus.prototype.translateErrorCode = function (code) {
            switch (code) {
                case 0:
                    return 'OK';
                case 1:
                    return 'Warning';
                case 2:
                    return 'Error';
            }
            return 'unknown error code';
        };
        PJLinkPlus.prototype.translatePowerCode = function (code) {
            switch (code) {
                case 0:
                    return 'Off';
                case 1:
                    return 'On';
                case 2:
                    return 'Cooling';
                case 3:
                    return 'Warming Up';
            }
            return 'unknown power code';
        };
        PJLinkPlus.prototype.nextParameterToFetch = function () {
            var parameter;
            while ((parameter === undefined ||
                this.skipDeviceParameters.indexOf(parameter) > -1) &&
                this._currentParameterFetchList.length > 0) {
                parameter = this._currentParameterFetchList.pop();
            }
            return parameter;
        };
        PJLinkPlus.prototype.fetchDeviceInformation = function (wantedInfo) {
            this._currentParameterFetchList = wantedInfo.slice();
            this.fetchInfoLoop();
        };
        PJLinkPlus.prototype.fetchInfoLoop = function () {
            var _this = this;
            this._currentParameter = this.nextParameterToFetch();
            if (this._currentParameter !== undefined) {
                if (!this._power.getCurrent() && PJLinkPlus_1.commandNeedsPower(this._currentParameter)) {
                    this.fetchInfoLoop();
                    return;
                }
                this.request(this._currentParameter).then(function (reply) {
                    if (reply != ERR_1) {
                        _this.processInfoQueryReply(_this._currentParameter, reply);
                        if (!PJLinkPlus_1.isCommandDynamic(_this._currentParameter)) {
                            _this.addCommandToSkip(_this._currentParameter);
                        }
                    }
                    else {
                        _this.processInfoQueryError(_this._currentParameter, reply);
                    }
                    _this.fetchInfoLoop();
                }, function (error) {
                    _this.processInfoQueryError(_this._currentParameter, error);
                    _this.fetchInfoLoop();
                });
            }
            else {
                this.fetchInfoResolve();
            }
        };
        PJLinkPlus.prototype.fetchInfoResolve = function () {
            if (this.fetchDeviceInfoResolver) {
                this.fetchDeviceInfoResolver(true);
                this._infoFetchDate = new Date();
                delete this.fetchingDeviceInfo;
                delete this.fetchDeviceInfoResolver;
            }
        };
        PJLinkPlus.prototype.pollDeviceStatus = function () {
            var _this = this;
            this.statusPoller = wait(STATUS_POLL_INTERVAL - Math.random() * (STATUS_POLL_INTERVAL * 0.1));
            this.statusPoller.then(function () {
                if (_this.socket.connected &&
                    _this.connected) {
                    _this.fetchDeviceInformation(_this.devicePollParameters);
                }
                if (!_this.discarded) {
                    _this.pollDeviceStatus();
                }
            });
        };
        PJLinkPlus.prototype.processInfoQueryError = function (command, error) {
            switch (command) {
                case CMD_LAMP:
                    if (error == ERR_1) {
                        this._hasLamps = false;
                        this.skipDeviceParameters.push(CMD_LAMP);
                    }
                    break;
                case CMD_RLMP:
                    if (error == ERR_1) {
                        this.skipDeviceParameters.push(CMD_RLMP);
                    }
                case CMD_FILT:
                    if (error == ERR_1) {
                        this._hasFilter = false;
                        this.skipDeviceParameters.push(CMD_FILT);
                    }
                    break;
            }
        };
        PJLinkPlus.prototype.processInfoQueryReply = function (command, reply) {
            switch (command) {
                case CMD_POWR:
                    var newPowerStatus = parseInt(reply);
                    if (this._powerStatus != newPowerStatus) {
                        this._powerStatus = newPowerStatus;
                        this.changed('powerStatus');
                        this._power.updateCurrent((parseInt(reply) & 1) != 0);
                        var newIsOff = this._powerStatus == 0;
                        var newIsOn = this._powerStatus == 1;
                        var newIsCooling = this._powerStatus == 2;
                        var newIsWarmingUp = this._powerStatus == 3;
                        if (this._isOff != newIsOff) {
                            this._isOff = newIsOff;
                            this.changed('isOff');
                        }
                        if (this._isOn != newIsOn) {
                            this._isOn = newIsOn;
                            this.changed('isOn');
                        }
                        if (this._isCooling != newIsCooling) {
                            this._isCooling = newIsCooling;
                            this.changed('isCooling');
                        }
                        if (this._isWarmingUp != newIsWarmingUp) {
                            this._isWarmingUp = newIsWarmingUp;
                            this.changed('isWarmingUp');
                        }
                    }
                    break;
                case CMD_INPT:
                    if (reply.length == 2) {
                        var oldType = this._inputType;
                        var newType = parseInt(reply[0]);
                        var newSource = reply[1];
                        var typeChanged = false;
                        var sourceChanged = false;
                        if (newType != this._inputType) {
                            this._inputType = newType;
                            typeChanged = true;
                        }
                        if (newSource != this._inputSource) {
                            this._inputSource = newSource;
                            sourceChanged = true;
                        }
                        if (typeChanged) {
                            this.notifyInputTypeChange(oldType);
                        }
                        if (typeChanged || sourceChanged) {
                            this.notifyInputTypeChange(newType);
                        }
                    }
                    this._input.updateCurrent(reply);
                    break;
                case CMD_AVMT:
                    this._mute.updateCurrent(parseInt(reply));
                    break;
                case CMD_ERST:
                    var errorNames = ['Fan', 'Lamp', 'Temperature', 'CoverOpen', 'Filter', 'Other'];
                    this._errorStatus = reply;
                    if (reply.length == 6) {
                        var list = [0, 0, 0, 0, 0, 0];
                        var warning = false;
                        var error = false;
                        for (var i = 0; i < reply.length; i++) {
                            list[i] = parseInt(reply[i]);
                            error = error || list[i] == 2;
                            warning = warning || list[i] == 1;
                            this['_errorStatus' + errorNames[0]] = list[i];
                        }
                        if (this._hasError != error) {
                            this._hasError = error;
                            this.changed('hasError');
                            this.changed('hasProblem');
                        }
                        if (this._hasWarning != warning) {
                            this._hasWarning = warning;
                            this.changed('hasWarning');
                            this.changed('hasProblem');
                        }
                    }
                    break;
                case CMD_LAMP:
                    this._hasLamps = true;
                    var lampNames = ['One', 'Two', 'Three', 'Four'];
                    var lampData = reply.split(' ');
                    this._lampCount = lampData.length / 2;
                    for (var i = 0; i < this._lampCount; i++) {
                        var newHours = parseInt(lampData[i * 2]);
                        var newActive = parseInt(lampData[i * 2 + 1]) == 1;
                        if (this['_lamp' + lampNames[i] + 'Hours'] != newHours) {
                            this['_lamp' + lampNames[i] + 'Hours'] = newHours;
                            this.changed('lamp' + lampNames[i] + 'Hours');
                        }
                        if (this['_lamp' + lampNames[i] + 'Active'] != newActive) {
                            this['_lamp' + lampNames[i] + 'Active'] = newActive;
                            this.changed('lamp' + lampNames[i] + 'Active');
                        }
                    }
                    break;
                case CMD_INST:
                    break;
                case CMD_NAME:
                    var newDeviceName = reply;
                    if (this._deviceName != newDeviceName) {
                        this._deviceName = newDeviceName;
                        this.changed('deviceName');
                    }
                    break;
                case CMD_INF1:
                    var newManufactureName = reply;
                    if (this._manufactureName != newManufactureName) {
                        this._manufactureName = newManufactureName;
                        this.changed('manufactureName');
                    }
                    break;
                case CMD_INF2:
                    var newProductName = reply;
                    if (this._productName != newProductName) {
                        this._productName = newProductName;
                        this.changed('productName');
                    }
                    break;
                case CMD_INFO:
                    var newOtherInformation = reply;
                    if (this._otherInformation != newOtherInformation) {
                        this._otherInformation = newOtherInformation;
                        this.changed('otherInformation');
                    }
                    break;
                case CMD_CLSS:
                    this._class = parseInt(reply);
                    for (var infoKey in PJLinkPlus_1.commandInformation) {
                        var info = PJLinkPlus_1.commandInformation[infoKey];
                        if (info.cmdClass > this._class) {
                            this.addCommandToSkip(infoKey);
                        }
                    }
                    break;
                case CMD_SNUM:
                    var newSerialNumber = reply;
                    if (this._serialNumber != newSerialNumber) {
                        this._serialNumber = newSerialNumber;
                        this.changed('serialNumber');
                    }
                    break;
                case CMD_SVER:
                    var newSoftwareVersion = reply;
                    if (this._softwareVersion != newSoftwareVersion) {
                        this._softwareVersion = newSoftwareVersion;
                        this.changed('softwareVersion');
                    }
                    break;
                case CMD_INNM:
                    var receivedInputTerminalName = reply;
                    break;
                case CMD_IRES:
                    var newInputResolution;
                    if (reply == IRES_NO_SIGNAL) {
                        newInputResolution = new Resolution(-1, -1);
                    }
                    else if (reply == IRES_UNKNOWN_SIGNAL) {
                        newInputResolution = new Resolution(-1, -1);
                    }
                    else {
                        newInputResolution = PJLinkPlus_1.parseResolution(reply);
                    }
                    if (!this._inputResolution ||
                        this._inputResolution.horizontal != newInputResolution.horizontal ||
                        this._inputResolution.vertical != newInputResolution.vertical) {
                        this._inputResolution = newInputResolution;
                        this.changed('inputResolution');
                    }
                    break;
                case CMD_RRES:
                    var newRecommendedResolution = PJLinkPlus_1.parseResolution(reply);
                    if (!this._recommendedResolution ||
                        this._recommendedResolution.horizontal != newRecommendedResolution.horizontal ||
                        this._recommendedResolution.vertical != newRecommendedResolution.vertical) {
                        this._recommendedResolution = newRecommendedResolution;
                        this.changed('recommendedResolution');
                    }
                    break;
                case CMD_FILT:
                    var newHasFilter = true;
                    var newFilterUsageTime = parseInt(reply);
                    if (this._hasFilter != newHasFilter) {
                        this._hasFilter = newHasFilter;
                        this.changed('hasFilter');
                    }
                    if (this._filterUsageTime != newFilterUsageTime) {
                        this._filterUsageTime = newFilterUsageTime;
                        this.changed('filterUsageTime');
                    }
                    break;
                case CMD_RLMP:
                    var newLampReplacementModelNumber = reply;
                    if (this._lampReplacementModelNumber != newLampReplacementModelNumber) {
                        this._lampReplacementModelNumber = newLampReplacementModelNumber;
                        this.changed('lampReplacementModelNumber');
                    }
                    break;
                case CMD_RFIL:
                    var newFilterReplacementModelNumber = reply;
                    if (this._filterReplacementModelNumber != newFilterReplacementModelNumber) {
                        this._filterReplacementModelNumber = newFilterReplacementModelNumber;
                        this.changed('filterReplacementModelNumber');
                    }
                    break;
                case CMD_FREZ:
                    this._freeze.updateCurrent(parseInt(reply) == 1);
                    break;
            }
        };
        PJLinkPlus.prototype.notifyInputTypeChange = function (type) {
            switch (type) {
                case INPT_RGB:
                    this.changed('inputRGB');
                    break;
                case INPT_VIDEO:
                    this.changed('inputVideo');
                    break;
                case INPT_DIGITAL:
                    this.changed('inputDigital');
                    break;
                case INPT_STORAGE:
                    this.changed('inputStorage');
                    break;
                case INPT_NETWORK:
                    this.changed('inputNetwork');
                    break;
                case INPT_INTERNAL:
                    this.changed('inputInternal');
                    break;
            }
        };
        PJLinkPlus.prototype.addCommandToSkip = function (command) {
            if (this.skipDeviceParameters.indexOf(command) == -1) {
                this.skipDeviceParameters.push(command);
            }
        };
        PJLinkPlus.prototype.request = function (question, param) {
            var _this = this;
            var pjClass = PJLinkPlus_1.determineCommandClass(question);
            if (question == CMD_INPT) {
                pjClass = this._class;
            }
            var toSend = '%' + pjClass + question;
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
        PJLinkPlus.prototype.textReceived = function (text) {
            if (text.indexOf('PJLINK ') === 0) {
                if (this.unauthenticated = (text.indexOf('PJLINK 1') === 0)) {
                    this.errorMsg("PJLink authentication not supported");
                }
                else {
                    this.connected = true;
                }
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
                            case ERR_1:
                                this.errorMsg("Undefined command", this.currCmd);
                                treatAsOk = true;
                                break;
                            case ERR_2:
                                this.errorMsg("Bad command parameter", this.currCmd);
                                treatAsOk = true;
                                break;
                            case ERR_3:
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
        PJLinkPlus.prototype.projectorBusy = function () {
            var _this = this;
            if (!this.busyHoldoff) {
                this.busyHoldoff = wait(4000);
                this.busyHoldoff.then(function () { return _this.busyHoldoff = undefined; });
            }
        };
        PJLinkPlus.determineCommandClass = function (command) {
            if (!this.commandInformation[command])
                console.log(command);
            return this.commandInformation[command].cmdClass;
        };
        PJLinkPlus.isCommandDynamic = function (command) {
            return this.commandInformation[command].dynamic;
        };
        PJLinkPlus.commandNeedsPower = function (command) {
            if (!this.commandInformation[command])
                console.log(command);
            return this.commandInformation[command].needsPower;
        };
        PJLinkPlus.prototype.onConnectStateChange = function () {
            if (this.socket.connected) {
                this._lastKnownConnectionDateSet = true;
            }
            this._lastKnownConnectionDate = new Date();
        };
        Object.defineProperty(PJLinkPlus.prototype, "customRequestResponse", {
            get: function () {
                return this._customRequestResult;
            },
            enumerable: true,
            configurable: true
        });
        PJLinkPlus.prototype.customRequest = function (question, param) {
            var _this = this;
            var request = this.request(question, param == "" ? undefined : param).then(function (reply) {
                _this._customRequestResult = reply;
                _this.changed('customRequestResponse');
            }, function (error) {
                _this._customRequestResult = "request failed: " + error;
            });
            return request;
        };
        PJLinkPlus.parseResolution = function (reply) {
            var parts = reply.split(RESOLUTION_SPLIT);
            if (parts.length == 2) {
                var resolution = new Resolution(parseInt(parts[0]), parseInt(parts[1]));
                return resolution;
            }
            return null;
        };
        var PJLinkPlus_1;
        PJLinkPlus.delayedFetchInterval = 10000;
        PJLinkPlus.commandInformation = (_a = {},
            _a[CMD_POWR] = { dynamic: true, cmdClass: 1, read: true, write: true, needsPower: false },
            _a[CMD_INPT] = { dynamic: true, cmdClass: 1, read: true, write: true, needsPower: true },
            _a[CMD_AVMT] = { dynamic: true, cmdClass: 1, read: true, write: true, needsPower: true },
            _a[CMD_ERST] = { dynamic: true, cmdClass: 1, read: true, write: false, needsPower: true },
            _a[CMD_LAMP] = { dynamic: true, cmdClass: 1, read: true, write: false, needsPower: false },
            _a[CMD_INST] = { dynamic: true, cmdClass: 2, read: true, write: false, needsPower: false },
            _a[CMD_NAME] = { dynamic: false, cmdClass: 1, read: true, write: false, needsPower: false },
            _a[CMD_INF1] = { dynamic: false, cmdClass: 1, read: true, write: false, needsPower: false },
            _a[CMD_INF2] = { dynamic: false, cmdClass: 1, read: true, write: false, needsPower: false },
            _a[CMD_INFO] = { dynamic: false, cmdClass: 1, read: true, write: false, needsPower: false },
            _a[CMD_CLSS] = { dynamic: false, cmdClass: 1, read: true, write: false, needsPower: false },
            _a[CMD_SNUM] = { dynamic: false, cmdClass: 2, read: true, write: false, needsPower: false },
            _a[CMD_SVER] = { dynamic: false, cmdClass: 2, read: true, write: false, needsPower: false },
            _a[CMD_INNM] = { dynamic: true, cmdClass: 2, read: true, write: false, needsPower: false },
            _a[CMD_IRES] = { dynamic: true, cmdClass: 2, read: true, write: false, needsPower: true },
            _a[CMD_RRES] = { dynamic: true, cmdClass: 2, read: true, write: false, needsPower: false },
            _a[CMD_FILT] = { dynamic: true, cmdClass: 2, read: true, write: false, needsPower: false },
            _a[CMD_RLMP] = { dynamic: false, cmdClass: 2, read: true, write: false, needsPower: false },
            _a[CMD_RFIL] = { dynamic: false, cmdClass: 2, read: true, write: false, needsPower: false },
            _a[CMD_SVOL] = { dynamic: true, cmdClass: 2, read: false, write: true, needsPower: true },
            _a[CMD_MVOL] = { dynamic: true, cmdClass: 2, read: false, write: true, needsPower: true },
            _a[CMD_FREZ] = { dynamic: true, cmdClass: 2, read: true, write: true, needsPower: true },
            _a);
        __decorate([
            Meta.callable("Refresh device information"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", Promise)
        ], PJLinkPlus.prototype, "fetchDeviceInfo", null);
        __decorate([
            Meta.property("Power status (detailed: 0, 1, 2, 3 -> off, on, cooling, warming)"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "powerStatus", null);
        __decorate([
            Meta.property("Is device off?"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "isOff", null);
        __decorate([
            Meta.property("Is device on?"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "isOn", null);
        __decorate([
            Meta.property("Is device cooling?"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "isCooling", null);
        __decorate([
            Meta.property("Is device warming up?"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "isWarmingUp", null);
        __decorate([
            Meta.property('current input'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], PJLinkPlus.prototype, "input", null);
        __decorate([
            Meta.property('select RGB input'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], PJLinkPlus.prototype, "inputRGB", null);
        __decorate([
            Meta.property('select VIDEO input'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], PJLinkPlus.prototype, "inputVideo", null);
        __decorate([
            Meta.property('select DIGITAL input'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], PJLinkPlus.prototype, "inputDigital", null);
        __decorate([
            Meta.property('select STORAGE input'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], PJLinkPlus.prototype, "inputStorage", null);
        __decorate([
            Meta.property('select NETWORK input'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], PJLinkPlus.prototype, "inputNetwork", null);
        __decorate([
            Meta.property('select INTERNAL input'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], PJLinkPlus.prototype, "inputInternal", null);
        __decorate([
            Meta.property("Mute setting. (Video mute on/off: 11/10, Audio mute on/off: 21/20, A/V mute on/off: 31/30)"),
            Meta.min(MUTE_MIN),
            Meta.max(MUTE_MAX),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], PJLinkPlus.prototype, "mute", null);
        __decorate([
            Meta.property("Mute audio"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], PJLinkPlus.prototype, "muteAudio", null);
        __decorate([
            Meta.property("Mute video"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], PJLinkPlus.prototype, "muteVideo", null);
        __decorate([
            Meta.property('Input resolution (' + CMD_IRES + ')'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "inputResolution", null);
        __decorate([
            Meta.property('Recommended resolution (' + CMD_RRES + ')'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "recommendedResolution", null);
        __decorate([
            Meta.property('Projector/Display name (' + CMD_NAME + ')'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "deviceName", null);
        __decorate([
            Meta.property('Manufacture name (' + CMD_INF1 + ')'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "manufactureName", null);
        __decorate([
            Meta.property('Product name (' + CMD_INF2 + ')'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "productName", null);
        __decorate([
            Meta.property('Other information (' + CMD_INFO + ')'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "otherInformation", null);
        __decorate([
            Meta.property('Serial number (' + CMD_SNUM + ')'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "serialNumber", null);
        __decorate([
            Meta.property('Software version (' + CMD_SVER + ')'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "softwareVersion", null);
        __decorate([
            Meta.property("Lamp count"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampCount", null);
        __decorate([
            Meta.property("Lamp one: lighting hours"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampOneHours", null);
        __decorate([
            Meta.property("Lamp two: lighting hours"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampTwoHours", null);
        __decorate([
            Meta.property("Lamp three: lighting hours"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampThreeHours", null);
        __decorate([
            Meta.property("Lamp four: lighting hours"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampFourHours", null);
        __decorate([
            Meta.property("Lamp one: active"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampOneActive", null);
        __decorate([
            Meta.property("Lamp one: active"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampTwoActive", null);
        __decorate([
            Meta.property("Lamp one: active"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampThreeActive", null);
        __decorate([
            Meta.property("Lamp one: active"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampFourActive", null);
        __decorate([
            Meta.property('Lamp replacement model number (' + CMD_RLMP + ')'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampReplacementModelNumber", null);
        __decorate([
            Meta.property("Has filter?"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "hasFilter", null);
        __decorate([
            Meta.property("Filter usage time (hours)"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "filterUsageTime", null);
        __decorate([
            Meta.property('Filter replacement model number (' + CMD_RFIL + ')'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "filterReplacementModelNumber", null);
        __decorate([
            Meta.property("Error status (ERST)"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "errorStatus", null);
        __decorate([
            Meta.property("Error reported?"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "hasError", null);
        __decorate([
            Meta.property("Warning reported?"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "hasWarning", null);
        __decorate([
            Meta.property("Problem reported?"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "hasProblem", null);
        __decorate([
            Meta.property("Is Projector/Display online? (Guesstimate: PJLink connection drops every now and then)"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "isOnline", null);
        __decorate([
            Meta.property("Detailed device status report (human readable)"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "detailedStatusReport", null);
        __decorate([
            Meta.property("custom request response"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "customRequestResponse", null);
        __decorate([
            Meta.callable("Send custom request"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String]),
            __metadata("design:returntype", Promise)
        ], PJLinkPlus.prototype, "customRequest", null);
        PJLinkPlus = PJLinkPlus_1 = __decorate([
            Meta.driver('NetworkTCP', { port: 4352 }),
            __metadata("design:paramtypes", [Object])
        ], PJLinkPlus);
        return PJLinkPlus;
    }(NetworkProjector_1.NetworkProjector));
    exports.PJLinkPlus = PJLinkPlus;
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
    var Resolution = (function () {
        function Resolution(h, v) {
            this.horizontal = h;
            this.vertical = v;
        }
        Resolution.prototype.toString = function () {
            return this.horizontal + 'x' + this.vertical;
        };
        return Resolution;
    }());
});
