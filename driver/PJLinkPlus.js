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
define(["require", "exports", "driver/PJLink", "driver/NetworkProjector", "system_lib/Metadata"], function (require, exports, PJLink_1, NetworkProjector_1, Meta) {
    "use strict";
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
    var STATUS_POLL_INTERVAL = 20000;
    var PJLinkPlus = PJLinkPlus_1 = (function (_super) {
        __extends(PJLinkPlus, _super);
        function PJLinkPlus(socket) {
            var _this = _super.call(this, socket) || this;
            _this.wantedDeviceParameters = [
                { cmd: CMD_POWR, dynamic: true },
                { cmd: CMD_ERST, dynamic: true },
                { cmd: CMD_CLSS, dynamic: false },
                { cmd: CMD_AVMT, dynamic: true },
                { cmd: CMD_LAMP, dynamic: true },
                { cmd: CMD_NAME, dynamic: false },
                { cmd: CMD_INF1, dynamic: false },
                { cmd: CMD_INF2, dynamic: false },
                { cmd: CMD_INFO, dynamic: false },
                { cmd: CMD_FILT, dynamic: true }
            ];
            _this.skipDeviceParameters = [];
            _this._lineBreak = '\n';
            _this.devicePollParameters = [
                { cmd: CMD_POWR, dynamic: true },
                { cmd: CMD_ERST, dynamic: true }
            ];
            _this._lastKnownConnectionDateSet = false;
            _this._powerStatus = 0;
            _this._isOff = false;
            _this._isOn = false;
            _this._isCooling = false;
            _this._isWarmingUp = false;
            _this._lampCount = 0;
            _this._lampOneHours = 0;
            _this._lampTwoHours = 0;
            _this._lampThreeHours = 0;
            _this._lampFourHours = 0;
            _this._lampOneActive = false;
            _this._lampTwoActive = false;
            _this._lampThreeActive = false;
            _this._lampFourActive = false;
            _this._filterUsageTime = 0;
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
            _this._mute = new NetworkProjector_1.NumState('AVMT', 'mute', PJLinkPlus_1.kMinMute, PJLinkPlus_1.kMaxMute);
            _this._mute.set(PJLinkPlus_1.kMinMute);
            _this.addState(_this._mute);
            socket.subscribe('connect', function (sender, message) {
                _this.onConnectStateChange();
            });
            _this.pollDeviceStatus();
            return _this;
        }
        Object.defineProperty(PJLinkPlus.prototype, "mute", {
            get: function () {
                return this._mute.get();
            },
            set: function (value) {
                if (this._mute.set(value))
                    this.sendCorrection();
            },
            enumerable: true,
            configurable: true
        });
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
                    'Other: ' + this.translateErrorCode(this._errorStatusOther) + this._lineBreak +
                    (this._lampCount > 0 ? 'Lamp status: ' + this._lineBreak : '') +
                    (this._lampCount > 0 ? 'Lamp one: ' + (this._lampOneActive ? 'on' : 'off') + ', ' + this._lampOneHours + ' lighting hours' + this._lineBreak : '') +
                    (this._lampCount > 1 ? 'Lamp two: ' + (this._lampTwoActive ? 'on' : 'off') + ', ' + this._lampTwoHours + ' lighting hours' + this._lineBreak : '') +
                    (this._lampCount > 2 ? 'Lamp three: ' + (this._lampThreeActive ? 'on' : 'off') + ', ' + this._lampThreeHours + ' lighting hours' + this._lineBreak : '') +
                    (this._lampCount > 3 ? 'Lamp four: ' + (this._lampFourActive ? 'on' : 'off') + ', ' + this._lampFourHours + ' lighting hours' + this._lineBreak : '') +
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
                this.skipDeviceParameters.indexOf(parameter.cmd) > -1) &&
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
                this.request(this._currentParameter.cmd).then(function (reply) {
                    if (reply != ERR_1) {
                        _this.processInfoQueryReply(_this._currentParameter.cmd, reply);
                        if (!_this._currentParameter.dynamic) {
                            _this.skipDeviceParameters.push(_this._currentParameter.cmd);
                        }
                    }
                    else {
                        _this.processInfoQueryError(_this._currentParameter.cmd, reply);
                    }
                    _this.fetchInfoLoop();
                }, function (error) {
                    _this.processInfoQueryError(_this._currentParameter.cmd, error);
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
                    if (this._class == 1) {
                        this.skipDeviceParameters.push(CMD_INST);
                        this.skipDeviceParameters.push(CMD_SNUM);
                        this.skipDeviceParameters.push(CMD_SVER);
                        this.skipDeviceParameters.push(CMD_INNM);
                        this.skipDeviceParameters.push(CMD_IRES);
                        this.skipDeviceParameters.push(CMD_RRES);
                        this.skipDeviceParameters.push(CMD_FILT);
                        this.skipDeviceParameters.push(CMD_RLMP);
                        this.skipDeviceParameters.push(CMD_RFIL);
                        this.skipDeviceParameters.push(CMD_SVOL);
                        this.skipDeviceParameters.push(CMD_MVOL);
                        this.skipDeviceParameters.push(CMD_FREZ);
                    }
                    break;
                case CMD_SNUM:
                    break;
                case CMD_SVER:
                    break;
                case CMD_INNM:
                    break;
                case CMD_IRES:
                    break;
                case CMD_RRES:
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
                    break;
                case CMD_RFIL:
                    break;
                case CMD_FREZ:
                    break;
            }
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
        return PJLinkPlus;
    }(PJLink_1.PJLink));
    PJLinkPlus.delayedFetchInterval = 10000;
    PJLinkPlus.kMinMute = 10;
    PJLinkPlus.kMaxMute = 31;
    __decorate([
        Meta.property("Mute setting. (Video mute on/off: 11/10, Audio mute on/off: 21/20, A/V mute on/off: 31/30)"),
        Meta.min(PJLinkPlus_1.kMinMute),
        Meta.max(PJLinkPlus_1.kMaxMute),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], PJLinkPlus.prototype, "mute", null);
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
        Meta.property("Projector/Display name (NAME)"),
        __metadata("design:type", String),
        __metadata("design:paramtypes", [])
    ], PJLinkPlus.prototype, "deviceName", null);
    __decorate([
        Meta.property("Manufacture name (INF1)"),
        __metadata("design:type", String),
        __metadata("design:paramtypes", [])
    ], PJLinkPlus.prototype, "manufactureName", null);
    __decorate([
        Meta.property("Product name (INF2)"),
        __metadata("design:type", String),
        __metadata("design:paramtypes", [])
    ], PJLinkPlus.prototype, "productName", null);
    __decorate([
        Meta.property("Other information (INFO)"),
        __metadata("design:type", String),
        __metadata("design:paramtypes", [])
    ], PJLinkPlus.prototype, "otherInformation", null);
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
    exports.PJLinkPlus = PJLinkPlus;
    var PJLinkPlus_1;
});
