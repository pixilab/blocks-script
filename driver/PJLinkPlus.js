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
define(["require", "exports", "driver/PJLink", "system_lib/Metadata"], function (require, exports, PJLink_1, Meta) {
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
    var PJLinkPlus = (function (_super) {
        __extends(PJLinkPlus, _super);
        function PJLinkPlus(socket) {
            var _this = _super.call(this, socket) || this;
            _this.wantedDeviceParameters = [
                CMD_POWR,
                CMD_ERST,
                CMD_LAMP,
                CMD_NAME,
                CMD_INF1,
                CMD_INF2,
                CMD_INFO
            ];
            _this._lineBreak = '\n';
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
            return _this;
        }
        PJLinkPlus.prototype.fetchDeviceInfo = function () {
            var _this = this;
            if (!this.fetchingDeviceInfo) {
                this.fetchingDeviceInfo = new Promise(function (resolve, reject) {
                    _this.fetchDeviceInfoResolver = resolve;
                    wait(30000).then(function () {
                        reject("Timeout");
                        delete _this.fetchDeviceInfo;
                        delete _this.fetchDeviceInfoResolver;
                    });
                });
            }
            this.fetchDeviceInformation(this.wantedDeviceParameters);
            return this.fetchingDeviceInfo;
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
        Object.defineProperty(PJLinkPlus.prototype, "name", {
            get: function () {
                return this._name;
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
        Object.defineProperty(PJLinkPlus.prototype, "detailedStatusReport", {
            get: function () {
                return 'Device: ' + this._manufactureName + ' ' + this._productName + ' ' + this._name + this._lineBreak +
                    'Power status: ' + this.translatePowerCode(this._powerStatus) + this._lineBreak +
                    'Error status: ' + this._lineBreak +
                    'Fan: ' + this.translateErrorCode(this._errorStatusFan) + this._lineBreak +
                    'Lamp: ' + this.translateErrorCode(this._errorStatusLamp) + this._lineBreak +
                    'Temperature: ' + this.translateErrorCode(this._errorStatusTemperature) + this._lineBreak +
                    'Cover open: ' + this.translateErrorCode(this._errorStatusCoverOpen) + this._lineBreak +
                    'Filter: ' + this.translateErrorCode(this._errorStatusFilter) + this._lineBreak +
                    'Other: ' + this.translateErrorCode(this._errorStatusOther) + this._lineBreak +
                    (this._lampCount > 0 ? 'Lamp status: ' + this._lineBreak : '') +
                    (this._lampCount > 0 ? 'Lamp one: ' + (this._lampOneActive ? 'on' : 'off') + ', ' + this._lampOneHours + ' lighting hours' + this._lineBreak : '') +
                    (this._lampCount > 1 ? 'Lamp two: ' + (this._lampTwoActive ? 'on' : 'off') + ', ' + this._lampTwoHours + ' lighting hours' + this._lineBreak : '') +
                    (this._lampCount > 2 ? 'Lamp three: ' + (this._lampThreeActive ? 'on' : 'off') + ', ' + this._lampThreeHours + ' lighting hours' + this._lineBreak : '') +
                    (this._lampCount > 3 ? 'Lamp four: ' + (this._lampFourActive ? 'on' : 'off') + ', ' + this._lampFourHours + ' lighting hours' + this._lineBreak : '');
            },
            enumerable: true,
            configurable: true
        });
        PJLinkPlus.prototype.translateErrorCode = function (code) {
            switch (code) {
                case 0:
                    return 'No error detected (or not supported)';
                case 1:
                    return 'Warning';
                case 3:
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
        PJLinkPlus.prototype.fetchDeviceInformation = function (wantedInfo) {
            this._currentParameterFetchList = wantedInfo.slice();
            this.fetchInfoLoop();
        };
        PJLinkPlus.prototype.fetchInfoLoop = function () {
            var _this = this;
            if (this._currentParameterFetchList.length > 0) {
                this._currentParameter = this._currentParameterFetchList.pop();
                this.request(this._currentParameter).then(function (reply) {
                    _this.processInfoQueryReply(_this._currentParameter, reply);
                    _this.fetchInfoLoop();
                }, function (error) {
                    _this.fetchInfoLoop();
                });
            }
            else {
                this.fetchInfoResolve();
            }
        };
        PJLinkPlus.prototype.processInfoQueryReply = function (command, reply) {
            switch (command) {
                case CMD_POWR:
                    var newPowerStatus = parseInt(reply);
                    if (this._powerStatus != newPowerStatus) {
                        this._powerStatus = newPowerStatus;
                        this.changed('powerStatus');
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
                    var lampNames = ['One', 'Two', 'Three', 'Four'];
                    var lampData = reply.split(' ');
                    this._lampCount = lampData.length / 2;
                    for (var i = 0; i < this._lampCount; i++) {
                        console.warn(i + ' lamp');
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
                    this._name = reply;
                    break;
                case CMD_INF1:
                    this._manufactureName = reply;
                    break;
                case CMD_INF2:
                    this._productName = reply;
                    break;
                case CMD_INFO:
                    this._otherInformation = reply;
                    break;
                case CMD_CLSS:
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
                    break;
                case CMD_RLMP:
                    break;
                case CMD_RFIL:
                    break;
                case CMD_FREZ:
                    break;
            }
        };
        PJLinkPlus.prototype.fetchInfoResolve = function () {
            if (this.fetchDeviceInfoResolver) {
                this.fetchDeviceInfoResolver();
                console.info("got device info");
                delete this.fetchingDeviceInfo;
                delete this.fetchDeviceInfoResolver;
            }
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
            }, function (error) {
                _this._customRequestResult = "request failed: " + error;
            });
            return request;
        };
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
            Meta.property("Projector/Display name (NAME)"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "name", null);
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
        PJLinkPlus = __decorate([
            Meta.driver('NetworkTCP', { port: 4352 }),
            __metadata("design:paramtypes", [Object])
        ], PJLinkPlus);
        return PJLinkPlus;
    }(PJLink_1.PJLink));
    exports.PJLinkPlus = PJLinkPlus;
});
