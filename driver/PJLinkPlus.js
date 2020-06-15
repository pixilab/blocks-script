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
define(["require", "exports", "driver/NetworkProjector", "system_lib/Metadata", "system/SimpleFile", "lib/md5"], function (require, exports, NetworkProjector_1, Metadata_1, SimpleFile_1, md5_1) {
    "use strict";
    var _a;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PJLinkPlus = void 0;
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
    var MSG_LKUP = 'LKUP';
    var ERR_1 = 'ERR1';
    var ERR_2 = 'ERR2';
    var ERR_3 = 'ERR3';
    var ERR_4 = 'ERR4';
    var ERR_A = 'ERRA';
    var STATUS_POLL_INTERVAL = 20000;
    var LOG_DEBUG = false;
    var PJLINK_PASSWORD = 'JBMIAProjectorLink';
    var CREATE_DYNAMIC_PROPERTIES = false;
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
    var CONFIG_BASE_PATH = 'pjlinkplus.config';
    var CACHE_BASE_PATH = 'pjlinkplus.cache';
    var SEPARATOR_QUERY = ' ?';
    var SEPARATOR_RESPONSE = '=';
    var SEPARATOR_INSTRUCTION = ' ';
    var PJLinkPlus = (function (_super) {
        __extends(PJLinkPlus, _super);
        function PJLinkPlus(socket) {
            var _this = _super.call(this, socket) || this;
            _this.skipDeviceParameters = [];
            _this._lineBreak = '\n';
            _this.devicePollParameters = [
                CMD_ERST,
                CMD_POWR,
                CMD_INPT,
                CMD_AVMT,
                CMD_LAMP,
                CMD_IRES,
                CMD_FILT,
            ];
            _this.authenticationSequence = '';
            _this.fetchingDeviceInfo = null;
            _this.fetchDeviceInfoResolve = null;
            _this.fetchDeviceInfoReject = null;
            _this._lastKnownConnectionDateSet = false;
            _this._powerStatus = 0;
            _this._isOff = false;
            _this._isOn = false;
            _this._isCooling = false;
            _this._isWarmingUp = false;
            _this._inputType = 0;
            _this._inputSource = '-';
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
            _this.commandReplyCache = {};
            _this.inputInformation = {
                1: { label: 'RGB', sourceIDs: [] },
                2: { label: 'Video', sourceIDs: [] },
                3: { label: 'Digital', sourceIDs: [] },
                4: { label: 'Storage', sourceIDs: [] },
                5: { label: 'Network', sourceIDs: [] },
                6: { label: 'Internal', sourceIDs: [] },
            };
            _this.addState(_this._power = new NetworkProjector_1.BoolState('POWR', 'power'));
            _this.addState(_this._input = new StringState(CMD_INPT, 'input', function () { return _this._power.getCurrent(); }));
            _this.addState(_this._mute = new NetworkProjector_1.NumState(CMD_AVMT, 'mute', MUTE_MIN, MUTE_MAX, function () { return _this._power.getCurrent(); }));
            _this.addState(_this._freeze = new NetworkProjector_1.BoolState(CMD_FREZ, 'freeze', function () { return _this._power.getCurrent(); }));
            _this._mute.set(MUTE_MIN);
            socket.subscribe('connect', function (_sender, _message) {
                _this.onConnectStateChange();
            });
            _this.cacheFilePath = CACHE_BASE_PATH + '/' + _this.socket.name + '.json';
            _this.configurationFilePath = CONFIG_BASE_PATH + '/' + _this.socket.name + '.cfg.json';
            SimpleFile_1.SimpleFile.read(_this.configurationFilePath).then(function (readValue) {
                _this.configuration = JSON.parse(readValue);
            }).catch(function (_error) {
                console.log('creating configuration file for "' + _this.socket.name + '" under "' + _this.configurationFilePath + '" - please fill out password if needed');
                _this.storePassword(PJLINK_PASSWORD);
            }).finally(function () {
                _this.pjlinkPassword = _this.configuration.password;
                _this.poll();
                _this.attemptConnect();
            });
            return _this;
        }
        PJLinkPlus_1 = PJLinkPlus;
        PJLinkPlus.prototype.storePassword = function (password) {
            if (!this.configuration) {
                this.configuration = new PJLinkConfiguration();
            }
            this.configuration.password = password;
            return this.storeConfiguration(this.configuration);
        };
        PJLinkPlus.prototype.storeConfiguration = function (cfg) {
            if (!cfg)
                cfg = this.configuration;
            return SimpleFile_1.SimpleFile.write(this.configurationFilePath, cfg.toJSON());
        };
        PJLinkPlus.prototype.pollStatus = function () {
            return true;
        };
        PJLinkPlus.prototype.justConnected = function () {
            var _this = this;
            wait(200).then(function () {
                if (_this.unauthenticated) {
                    console.warn('not authenticated');
                }
                else {
                    _this.getToKnowDevice().then(function (_resolve) {
                        if (LOG_DEBUG)
                            console.log('got to know device - starting to poll');
                        _this.startPollDeviceStatus();
                    }, function (_reject) { return console.warn('could not get to know device'); });
                }
            });
        };
        PJLinkPlus.prototype.getToKnowDevice = function () {
            var _this = this;
            return new Promise(function (resolveGetToKnow, rejectGetToKnow) {
                if (LOG_DEBUG)
                    console.log('trying to load from disk');
                _this.tryLoadCacheFromDisk().then(function (_resolve) {
                    if (LOG_DEBUG)
                        console.log('trying to get class 1 static info');
                    _this.tryGetStaticInformation(1).then(function (_resolve) {
                        if (_this._class > 1) {
                            if (LOG_DEBUG)
                                console.log('trying to get class 2 static info');
                            _this.tryGetStaticInformation(2).then(function (_resolve) {
                                if (CREATE_DYNAMIC_PROPERTIES)
                                    _this.createDynamicInputProperties();
                                resolveGetToKnow();
                            }, function (_reject) {
                                rejectGetToKnow();
                            });
                        }
                        else {
                            resolveGetToKnow();
                        }
                    }, function (_reject) {
                        rejectGetToKnow();
                    });
                });
            });
        };
        PJLinkPlus.prototype.tryLoadCacheFromDisk = function () {
            var _this = this;
            return new Promise(function (resolve, _reject) {
                SimpleFile_1.SimpleFile.read(_this.cacheFilePath).then(function (readValue) {
                    _this.commandReplyCache = JSON.parse(readValue);
                    if (LOG_DEBUG)
                        console.log('successfully loaded command reply cache');
                    resolve();
                }).catch(function (_error) {
                    SimpleFile_1.SimpleFile.write(_this.cacheFilePath, JSON.stringify(_this.commandReplyCache));
                    resolve();
                });
            });
        };
        PJLinkPlus.prototype.cacheCommandReply = function (command, reply) {
            var _this = this;
            var existingItem = this.commandReplyCache[command];
            if (existingItem && existingItem.reply == reply)
                return;
            this.commandReplyCache[command] = { reply: reply };
            SimpleFile_1.SimpleFile.write(this.cacheFilePath, JSON.stringify(this.commandReplyCache)).then(function (_resolve) {
                if (LOG_DEBUG)
                    console.log('updated cache file \'' + _this.cacheFilePath + '\' with ' + command + '=\'' + reply + '\'');
            });
        };
        PJLinkPlus.prototype.tryGetStaticInformation = function (cmdClass) {
            var _this = this;
            return new Promise(function (resolveGetStatic, rejectGetStatic) {
                var commands = PJLinkPlus_1.getStaticCommands(cmdClass);
                _this.fetchDeviceInformation(commands).then(function (_resolve) {
                    resolveGetStatic();
                }, function (reject) {
                    rejectGetStatic(reject);
                });
            });
        };
        PJLinkPlus.getStaticCommands = function (cmdClass) {
            var commands = [];
            for (var command in this.commandInformation) {
                var info = this.commandInformation[command];
                if (!info.dynamic && info.cmdClass == cmdClass)
                    commands.push(command);
            }
            return commands;
        };
        Object.defineProperty(PJLinkPlus.prototype, "powerStatus", {
            get: function () {
                return this._powerStatus;
            },
            set: function (_value) { },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "isOff", {
            get: function () {
                return this._isOff;
            },
            set: function (value) { },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "isOn", {
            get: function () {
                return this._isOn;
            },
            set: function (value) { },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "isCooling", {
            get: function () {
                return this._isCooling;
            },
            set: function (value) { },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "isWarmingUp", {
            get: function () {
                return this._isWarmingUp;
            },
            set: function (value) { },
            enumerable: false,
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
            enumerable: false,
            configurable: true
        });
        PJLinkPlus.prototype.createDynamicInputProperties = function () {
            var _this = this;
            if (LOG_DEBUG)
                console.log('trying to create dynamic input properties');
            var _loop_1 = function (type) {
                var typeNum = parseInt(type);
                var info = this_1.inputInformation[typeNum];
                if (info.sourceIDs.length > 0) {
                    if (LOG_DEBUG)
                        console.log('attempting create input for ' + info.label);
                    this_1.property('input' + info.label, { type: Number, description: 'select ' + info.label + ' input (valid values: ' + info.sourceIDs.join(', ') + ')' }, function (setValue) {
                        if (setValue !== undefined) {
                            _this.setInput(typeNum, setValue + '');
                        }
                        return _this._inputType == typeNum ? _this._inputSource : '-';
                    });
                }
            };
            var this_1 = this;
            for (var type in this.inputInformation) {
                _loop_1(type);
            }
        };
        PJLinkPlus.prototype.setInput = function (type, id) {
            switch (this._class) {
                default:
                case 1:
                    return this.setInputClass1(type, parseInt(id));
                case 2:
                    return this.setInputClass2(type, id);
            }
        };
        PJLinkPlus.prototype.setInputClass1 = function (type, id) {
            if (type < INPT_RGB || type > INPT_NETWORK)
                return false;
            if (id === NaN) {
                console.warn('not a valid input id (1-9)');
                return false;
            }
            this._inputType = type;
            this._inputSource = id + '';
            if (this._input.set(type + '' + id)) {
                this.sendCorrection();
            }
        };
        PJLinkPlus.prototype.setInputClass2 = function (type, id) {
            if (type < INPT_RGB || type > INPT_INTERNAL)
                return false;
            if (!this.isValidSourceID(id, 2)) {
                console.warn('\'' + id + '\'not a valid input id (1-9 A-Z)');
                return false;
            }
            var inputValue = type + id;
            if (this._validInputs.indexOf(inputValue) === -1) {
                console.warn('not a valid input id - valid input ids: ' + this._validInputs.join(', '));
                return false;
            }
            this._inputType = type;
            this._inputSource = id;
            if (this._input.set(type + id)) {
                this.sendCorrection();
            }
            return true;
        };
        PJLinkPlus.prototype.isValidSourceID = function (sourceID, sourceClass) {
            switch (sourceClass) {
                default:
                case 1:
                    return sourceID.length === 1 && sourceID.match(/[1-9]/);
                case 2:
                    return sourceID.length === 1 && sourceID.match(/[A-Z1-9]/);
            }
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
            enumerable: false,
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
            enumerable: false,
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
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "inputResolution", {
            get: function () {
                if (this._inputResolution) {
                    return this._inputResolution.toString();
                }
                return 'undefined';
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "recommendedResolution", {
            get: function () {
                if (this._recommendedResolution) {
                    return this._recommendedResolution.toString();
                }
                return 'undefined';
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "deviceName", {
            get: function () {
                return this._deviceName;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "manufactureName", {
            get: function () {
                return this._manufactureName;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "productName", {
            get: function () {
                return this._productName;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "otherInformation", {
            get: function () {
                return this._otherInformation;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "serialNumber", {
            get: function () {
                return this._serialNumber;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "softwareVersion", {
            get: function () {
                return this._softwareVersion;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampCount", {
            get: function () {
                return this._lampCount;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampOneHours", {
            get: function () {
                return this._lampOneHours;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampTwoHours", {
            get: function () {
                return this._lampTwoHours;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampThreeHours", {
            get: function () {
                return this._lampThreeHours;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampFourHours", {
            get: function () {
                return this._lampFourHours;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampOneActive", {
            get: function () {
                return this._lampOneActive;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampTwoActive", {
            get: function () {
                return this._lampTwoActive;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampThreeActive", {
            get: function () {
                return this._lampThreeActive;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampFourActive", {
            get: function () {
                return this._lampFourActive;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampReplacementModelNumber", {
            get: function () {
                return this._lampReplacementModelNumber;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "hasFilter", {
            get: function () {
                return this._hasFilter;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "filterUsageTime", {
            get: function () {
                return this._filterUsageTime;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "filterReplacementModelNumber", {
            get: function () {
                return this._filterReplacementModelNumber;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "errorStatus", {
            get: function () {
                return this._errorStatus;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "hasError", {
            get: function () {
                return this._hasError;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "hasWarning", {
            get: function () {
                return this._hasWarning;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "hasProblem", {
            get: function () {
                return this._hasError || this._hasWarning;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "password", {
            get: function () {
                return this.configuration ? this.configuration.password : PJLINK_PASSWORD;
            },
            set: function (value) {
                this.storePassword(value);
            },
            enumerable: false,
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
            enumerable: false,
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
                    '  Fan: ' + this.translateErrorCode(this._errorStatusFan) + this._lineBreak +
                    '  Lamp' + (this._lampCount > 1 ? 's' : '') + ': ' + (this._hasLamps !== undefined && this._hasLamps ? this.translateErrorCode(this._errorStatusLamp) : '[no lamps]') + this._lineBreak +
                    '  Temperature: ' + this.translateErrorCode(this._errorStatusTemperature) + this._lineBreak +
                    '  Cover open: ' + this.translateErrorCode(this._errorStatusCoverOpen) + this._lineBreak +
                    '  Filter: ' + (this._hasFilter !== undefined && this._hasFilter ? this.translateErrorCode(this._errorStatusFilter) : '[no filter]') + this._lineBreak +
                    '  Other: ' + this.translateErrorCode(this._errorStatusOther) + this._lineBreak +
                    (this._lampCount > 0 ? 'Lamp status: ' + this._lineBreak : '') +
                    (this._lampCount > 0 ? 'Lamp one: ' + (this._lampOneActive ? 'on' : 'off') + ', ' + this._lampOneHours + ' lighting hours' + this._lineBreak : '') +
                    (this._lampCount > 1 ? 'Lamp two: ' + (this._lampTwoActive ? 'on' : 'off') + ', ' + this._lampTwoHours + ' lighting hours' + this._lineBreak : '') +
                    (this._lampCount > 2 ? 'Lamp three: ' + (this._lampThreeActive ? 'on' : 'off') + ', ' + this._lampThreeHours + ' lighting hours' + this._lineBreak : '') +
                    (this._lampCount > 3 ? 'Lamp four: ' + (this._lampFourActive ? 'on' : 'off') + ', ' + this._lampFourHours + ' lighting hours' + this._lineBreak : '') +
                    (this._lampReplacementModelNumber ? 'Lamp replacement model number: ' + this._lampReplacementModelNumber + this._lineBreak : '') +
                    (this._filterUsageTime ? 'Filter usage time: ' + this._filterUsageTime + ' hours' + this._lineBreak : '') +
                    (this._filterReplacementModelNumber ? 'Filter replacement model number: ' + this._filterReplacementModelNumber + this._lineBreak : '') +
                    (this._validInputs ? 'Inputs: ' + this._validInputs.join(', ') + this._lineBreak : '') +
                    (this._serialNumber ? 'SNR: ' + this._serialNumber + this._lineBreak : '') +
                    (this._softwareVersion ? 'Software version: ' + this._softwareVersion + this._lineBreak : '') +
                    '(class ' + this._class + ', status report last updated ' + this._infoFetchDate + ')';
            },
            enumerable: false,
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
            while (parameter === undefined &&
                this._currentParameterFetchList.length > 0) {
                parameter = this._currentParameterFetchList.pop();
                if (this.skipDeviceParameters.indexOf(parameter) > -1)
                    parameter = undefined;
            }
            return parameter;
        };
        PJLinkPlus.prototype.fetchDeviceInformation = function (wantedInfo) {
            var _this = this;
            if (LOG_DEBUG)
                console.log('trying to get info: \'' + wantedInfo.join(', ') + '\'');
            this._currentParameterFetchList = wantedInfo.slice().reverse();
            this.fetchingDeviceInfo = new Promise(function (resolve, reject) {
                if (_this.fetchDeviceInfoResolve) {
                    reject('fetch already in progress');
                }
                else {
                    _this.fetchDeviceInfoResolve = resolve;
                    _this.fetchInfoLoop();
                    _this.fetchDeviceInfoReject = reject;
                    wait(2000 * wantedInfo.length).then(function () {
                        reject('fetch timeout');
                    });
                }
            });
            return this.fetchingDeviceInfo;
        };
        PJLinkPlus.prototype.fetchInfoLoop = function () {
            var _this = this;
            if (!this.keepFetchingInfo())
                return;
            this._currentParameter = this.nextParameterToFetch();
            if (this._currentParameter !== undefined) {
                var pjClass = void 0;
                if (this._currentParameter == CMD_INPT) {
                    pjClass = this._class;
                }
                else {
                    pjClass = PJLinkPlus_1.determineCommandClass(this._currentParameter);
                }
                this.currentQuery = new PJLinkQuery(pjClass, this._currentParameter);
                this.fetchInfo(this.currentQuery).then(function (reply) {
                    _this.processInfoQueryReply(_this.currentQuery, reply);
                    wait(100).then(function () {
                        _this.fetchInfoLoop();
                    });
                }, function (_error) {
                    _this.fetchInfoLoop();
                });
            }
            else {
                this.finishFetchDeviceInformation();
            }
        };
        PJLinkPlus.prototype.abortFetchDeviceInformation = function () {
            if (this.fetchDeviceInfoResolve) {
                this.fetchDeviceInfoReject('fetching device info aborted');
                this.cleanUpFetchingDeviceInformation();
            }
        };
        PJLinkPlus.prototype.keepFetchingInfo = function () {
            return this.fetchDeviceInfoResolve !== undefined;
        };
        PJLinkPlus.prototype.finishFetchDeviceInformation = function () {
            if (this.fetchDeviceInfoResolve) {
                this.fetchDeviceInfoResolve(true);
                this._infoFetchDate = new Date();
                this.cleanUpFetchingDeviceInformation();
            }
        };
        PJLinkPlus.prototype.cleanUpFetchingDeviceInformation = function () {
            delete this.fetchingDeviceInfo;
            delete this.fetchDeviceInfoResolve;
            delete this.fetchDeviceInfoReject;
        };
        PJLinkPlus.prototype.fetchInfo = function (query) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                if ((!_this._power || !_this._power.getCurrent()) &&
                    PJLinkPlus_1.commandNeedsPower(query.command)) {
                    reject('device needs to be powered on for command ' + query.command);
                    return;
                }
                var cachedReply = _this.commandReplyCache[query.command];
                if (cachedReply) {
                    if (LOG_DEBUG)
                        console.log('used cached reply for command ' + query.command);
                    resolve(cachedReply.reply);
                    return;
                }
                _this.queryRequest(query).then(function (reply) {
                    if (reply != ERR_1) {
                        if (LOG_DEBUG)
                            console.log('got reply for \'' + _this._currentParameter + '\':' + reply);
                        if (!PJLinkPlus_1.isCommandDynamic(query.command)) {
                            _this.cacheCommandReply(query.command, reply);
                            _this.addCommandToSkip(query.command);
                        }
                        resolve(reply);
                    }
                    else {
                        _this.processInfoQueryError(query.command, reply);
                        reject('command not available: ' + query.command);
                    }
                }, function (error) {
                    _this.processInfoQueryError(query.command, error);
                    reject(error);
                });
            });
        };
        PJLinkPlus.prototype.startPollDeviceStatus = function () {
            if (this.statusPoller) {
                console.warn('status polling already running');
                return;
            }
            this.pollDeviceStatus(true);
        };
        PJLinkPlus.prototype.pollDeviceStatus = function (skipInterval) {
            var _this = this;
            if (skipInterval === void 0) { skipInterval = false; }
            if (!this.connected) {
                this.abortPollDeviceStatus();
                return;
            }
            this.keepPollingStatus = true;
            var waitDuration = skipInterval ? 7 : STATUS_POLL_INTERVAL - Math.random() * (STATUS_POLL_INTERVAL * 0.1);
            if (LOG_DEBUG)
                console.log('going to wait for ' + waitDuration + ' ms');
            this.statusPoller = wait(waitDuration);
            this.statusPoller.then(function () {
                if (!_this.keepPollingStatus)
                    return;
                if (_this.socket.connected &&
                    _this.connected) {
                    _this.fetchDeviceInformation(_this.devicePollParameters).then(function (_resolve) {
                        if (LOG_DEBUG)
                            console.log('poll device status DONE');
                    }, function (reject) {
                        if (LOG_DEBUG)
                            console.log('poll device status error: ' + reject);
                    });
                }
                if (!_this.discarded) {
                    _this.pollDeviceStatus();
                }
                else {
                    _this.abortPollDeviceStatus();
                }
            });
        };
        PJLinkPlus.prototype.abortPollDeviceStatus = function () {
            this.keepPollingStatus = false;
            this.abortFetchDeviceInformation();
            console.log('aborting polling device status');
            if (this.statusPoller)
                delete this.statusPoller;
        };
        PJLinkPlus.prototype.processInfoQueryError = function (command, error) {
            if (error == ERR_1) {
                if (command == CMD_LAMP)
                    this._hasLamps = false;
                if (command == CMD_FILT)
                    this._hasFilter = false;
                this.skipDeviceParameters.push(command);
            }
        };
        PJLinkPlus.prototype.processInfoQueryReply = function (query, reply) {
            switch (query.command) {
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
                        for (var i_1 = 0; i_1 < reply.length; i_1++) {
                            list[i_1] = parseInt(reply[i_1]);
                            error = error || list[i_1] == 2;
                            warning = warning || list[i_1] == 1;
                            this['_errorStatus' + errorNames[i_1]] = list[i_1];
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
                    for (var i_2 = 0; i_2 < this._lampCount; i_2++) {
                        var newHours = parseInt(lampData[i_2 * 2]);
                        var newActive = parseInt(lampData[i_2 * 2 + 1]) == 1;
                        if (this['_lamp' + lampNames[i_2] + 'Hours'] != newHours) {
                            this['_lamp' + lampNames[i_2] + 'Hours'] = newHours;
                            this.changed('lamp' + lampNames[i_2] + 'Hours');
                        }
                        if (this['_lamp' + lampNames[i_2] + 'Active'] != newActive) {
                            this['_lamp' + lampNames[i_2] + 'Active'] = newActive;
                            this.changed('lamp' + lampNames[i_2] + 'Active');
                        }
                    }
                    break;
                case CMD_INST:
                    this._validInputs = reply.split(' ');
                    for (var i = 0; i < this._validInputs.length; i++) {
                        this.addValidInput(this._validInputs[i]);
                    }
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
        PJLinkPlus.prototype.addValidInput = function (inputChars) {
            if (inputChars.length != 2) {
                console.warn('wrong length of input chars: \'' + inputChars + '\'');
                return;
            }
            var type = parseInt(inputChars[0]);
            if (type === undefined ||
                type < INPT_RGB ||
                type > INPT_INTERNAL) {
                console.warn('invalid input type: \'' + inputChars + '\'');
                return;
            }
            var sourceID = inputChars[1];
            this.inputInformation[type].sourceIDs.push(sourceID);
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
            this.socket.sendText(this.authenticationSequence + toSend).catch(function (err) {
                console.log('send failed: ' + err);
                _this.sendFailed(err);
            });
            var result = this.startRequest(toSend);
            result.finally(function () {
                asap(function () {
                    _this.sendCorrection();
                });
            });
            return result;
        };
        PJLinkPlus.prototype.queryRequest = function (query) {
            var _this = this;
            var toSend = query.encode();
            this.socket.sendText(this.authenticationSequence + toSend).catch(function (err) {
                console.log('send failed: ' + err);
                _this.sendFailed(err);
            });
            var result = this.startRequest(toSend);
            result.finally(function () {
                asap(function () {
                    _this.sendCorrection();
                });
            });
            return result;
        };
        PJLinkPlus.prototype.textReceived = function (text) {
            this._lastKnownConnectionDate = new Date();
            if (text.indexOf('PJLINK ') === 0) {
                if (this.unauthenticated = (text.indexOf('PJLINK 1') === 0)) {
                    this.randomAuthSequence = text.substr('PJLINK 1'.length + 1);
                    var sequence = this.randomAuthSequence + '' + this.pjlinkPassword;
                    var md5Sequence = md5_1.Md5.hashAsciiStr(sequence);
                    if (LOG_DEBUG)
                        console.log('\'' + sequence + '\' -> \'' + md5Sequence + '\' (' + md5Sequence.length + ')');
                    this.authenticationSequence = md5Sequence;
                    this.unauthenticated = false;
                    this.connected = true;
                }
                else if (text.indexOf('PJLINK ' + ERR_A) === 0) {
                    this.connected = false;
                    this.unauthenticated = true;
                    console.warn('authentication failed');
                    this.requestFailure(text);
                }
                else {
                    this.connected = true;
                }
                return;
            }
            text = PJLinkPlus_1.removeLeadingGarbageCharacters(text);
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
                                if (LOG_DEBUG)
                                    this.warnMsg("Undefined command", this.currCmd);
                                treatAsOk = true;
                                break;
                            case ERR_2:
                                if (LOG_DEBUG)
                                    this.warnMsg("Bad command parameter", this.currCmd);
                                treatAsOk = true;
                                break;
                            case ERR_A:
                                this.connected = false;
                                this.unauthenticated = true;
                                this.warnMsg('authentication failed');
                                break;
                            case ERR_3:
                                this.projectorBusy();
                            default:
                                this.warnMsg('PJLink response', currCmd, text);
                                break;
                            case ERR_4:
                                this.abortPollDeviceStatus();
                                break;
                        }
                        if (!treatAsOk) {
                            this.requestFailure(text);
                        }
                    }
                    if (treatAsOk) {
                        this.requestSuccess(text);
                    }
                }
                else {
                    this.requestFailure("Expected reply " + expectedResponse + ", got " + text);
                }
            }
            else {
                this.warnMsg("Unexpected data", text);
            }
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
            enumerable: false,
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
        PJLinkPlus.removeLeadingGarbageCharacters = function (text) {
            var msgStart = text.indexOf('%');
            if (msgStart > 0) {
                return text.substring(msgStart);
            }
            return text;
        };
        PJLinkPlus.parseResponseMessage = function (text) {
            text = this.removeLeadingGarbageCharacters(text);
            if (text.length < 8)
                return null;
            if (text[0] != '%')
                return null;
            var separator = text.substr(6, 1);
            if (separator != SEPARATOR_RESPONSE)
                return null;
            var message = new PJLinkResponse(parseInt(text[1]), text.substr(2, 4), text.substr(7));
            return message;
        };
        var PJLinkPlus_1;
        PJLinkPlus.commandInformation = (_a = {},
            _a[CMD_POWR] = { dynamic: true, cmdClass: 1, read: true, write: true, needsPower: false },
            _a[CMD_INPT] = { dynamic: true, cmdClass: 1, read: true, write: true, needsPower: true },
            _a[CMD_AVMT] = { dynamic: true, cmdClass: 1, read: true, write: true, needsPower: true },
            _a[CMD_ERST] = { dynamic: true, cmdClass: 1, read: true, write: false, needsPower: false },
            _a[CMD_LAMP] = { dynamic: true, cmdClass: 1, read: true, write: false, needsPower: false },
            _a[CMD_INST] = { dynamic: false, cmdClass: 2, read: true, write: false, needsPower: false },
            _a[CMD_NAME] = { dynamic: false, cmdClass: 1, read: true, write: false, needsPower: false },
            _a[CMD_INF1] = { dynamic: false, cmdClass: 1, read: true, write: false, needsPower: false },
            _a[CMD_INF2] = { dynamic: false, cmdClass: 1, read: true, write: false, needsPower: false },
            _a[CMD_INFO] = { dynamic: false, cmdClass: 1, read: true, write: false, needsPower: false },
            _a[CMD_CLSS] = { dynamic: false, cmdClass: 1, read: true, write: false, needsPower: false },
            _a[CMD_SNUM] = { dynamic: false, cmdClass: 2, read: true, write: false, needsPower: false },
            _a[CMD_SVER] = { dynamic: false, cmdClass: 2, read: true, write: false, needsPower: false },
            _a[CMD_INNM] = { dynamic: true, cmdClass: 2, read: true, write: false, needsPower: false },
            _a[CMD_IRES] = { dynamic: true, cmdClass: 2, read: true, write: false, needsPower: true },
            _a[CMD_RRES] = { dynamic: false, cmdClass: 2, read: true, write: false, needsPower: false },
            _a[CMD_FILT] = { dynamic: true, cmdClass: 2, read: true, write: false, needsPower: false },
            _a[CMD_RLMP] = { dynamic: false, cmdClass: 2, read: true, write: false, needsPower: false },
            _a[CMD_RFIL] = { dynamic: false, cmdClass: 2, read: true, write: false, needsPower: false },
            _a[CMD_SVOL] = { dynamic: true, cmdClass: 2, read: false, write: true, needsPower: true },
            _a[CMD_MVOL] = { dynamic: true, cmdClass: 2, read: false, write: true, needsPower: true },
            _a[CMD_FREZ] = { dynamic: true, cmdClass: 2, read: true, write: true, needsPower: true },
            _a);
        __decorate([
            Metadata_1.property("Power status (detailed: 0, 1, 2, 3 -> off, on, cooling, warming)", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], PJLinkPlus.prototype, "powerStatus", null);
        __decorate([
            Metadata_1.property("Is device off?", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], PJLinkPlus.prototype, "isOff", null);
        __decorate([
            Metadata_1.property("Is device on?", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], PJLinkPlus.prototype, "isOn", null);
        __decorate([
            Metadata_1.property("Is device cooling?", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], PJLinkPlus.prototype, "isCooling", null);
        __decorate([
            Metadata_1.property("Is device warming up?", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], PJLinkPlus.prototype, "isWarmingUp", null);
        __decorate([
            Metadata_1.property('current input (class 1: 11-59 / class 2: 11-6Z)'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], PJLinkPlus.prototype, "input", null);
        __decorate([
            Metadata_1.property("Mute setting. (Video mute on/off: 11/10, Audio mute on/off: 21/20, A/V mute on/off: 31/30)"),
            Metadata_1.min(MUTE_MIN),
            Metadata_1.max(MUTE_MAX),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], PJLinkPlus.prototype, "mute", null);
        __decorate([
            Metadata_1.property("Mute audio"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], PJLinkPlus.prototype, "muteAudio", null);
        __decorate([
            Metadata_1.property("Mute video"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], PJLinkPlus.prototype, "muteVideo", null);
        __decorate([
            Metadata_1.property('Input resolution (' + CMD_IRES + ')', true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "inputResolution", null);
        __decorate([
            Metadata_1.property('Recommended resolution (' + CMD_RRES + ')', true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "recommendedResolution", null);
        __decorate([
            Metadata_1.property('Projector/Display name (' + CMD_NAME + ')', true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "deviceName", null);
        __decorate([
            Metadata_1.property('Manufacture name (' + CMD_INF1 + ')', true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "manufactureName", null);
        __decorate([
            Metadata_1.property('Product name (' + CMD_INF2 + ')', true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "productName", null);
        __decorate([
            Metadata_1.property('Other information (' + CMD_INFO + ')', true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "otherInformation", null);
        __decorate([
            Metadata_1.property('Serial number (' + CMD_SNUM + ')', true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "serialNumber", null);
        __decorate([
            Metadata_1.property('Software version (' + CMD_SVER + ')', true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "softwareVersion", null);
        __decorate([
            Metadata_1.property("Lamp count", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampCount", null);
        __decorate([
            Metadata_1.property("Lamp one: lighting hours", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampOneHours", null);
        __decorate([
            Metadata_1.property("Lamp two: lighting hours", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampTwoHours", null);
        __decorate([
            Metadata_1.property("Lamp three: lighting hours", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampThreeHours", null);
        __decorate([
            Metadata_1.property("Lamp four: lighting hours", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampFourHours", null);
        __decorate([
            Metadata_1.property("Lamp one: active", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampOneActive", null);
        __decorate([
            Metadata_1.property("Lamp one: active", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampTwoActive", null);
        __decorate([
            Metadata_1.property("Lamp one: active", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampThreeActive", null);
        __decorate([
            Metadata_1.property("Lamp one: active", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampFourActive", null);
        __decorate([
            Metadata_1.property('Lamp replacement model number (' + CMD_RLMP + ')', true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampReplacementModelNumber", null);
        __decorate([
            Metadata_1.property("Has filter?", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "hasFilter", null);
        __decorate([
            Metadata_1.property("Filter usage time (hours)", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "filterUsageTime", null);
        __decorate([
            Metadata_1.property('Filter replacement model number (' + CMD_RFIL + ')', true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "filterReplacementModelNumber", null);
        __decorate([
            Metadata_1.property("Error status (ERST)", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "errorStatus", null);
        __decorate([
            Metadata_1.property("Error reported?", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "hasError", null);
        __decorate([
            Metadata_1.property("Warning reported?", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "hasWarning", null);
        __decorate([
            Metadata_1.property("Problem reported?", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "hasProblem", null);
        __decorate([
            Metadata_1.property('PJLink password'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], PJLinkPlus.prototype, "password", null);
        __decorate([
            Metadata_1.property("Is Projector/Display online? (Guesstimate: PJLink connection drops every now and then)", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "isOnline", null);
        __decorate([
            Metadata_1.property("Detailed device status report (human readable)", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "detailedStatusReport", null);
        __decorate([
            Metadata_1.property("custom request response", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "customRequestResponse", null);
        __decorate([
            Metadata_1.callable("Send custom request"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String]),
            __metadata("design:returntype", Promise)
        ], PJLinkPlus.prototype, "customRequest", null);
        PJLinkPlus = PJLinkPlus_1 = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 4352 }),
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
    var PJLinkMessage = (function () {
        function PJLinkMessage(cmdClass, command, separator, value) {
            this.cmdClass = cmdClass;
            this.command = command;
            this.separator = separator;
            this.value = value;
        }
        PJLinkMessage.prototype.encode = function () {
            return '%' + this.cmdClass + this.command + this.separator + this.value;
        };
        return PJLinkMessage;
    }());
    var PJLinkQuery = (function (_super) {
        __extends(PJLinkQuery, _super);
        function PJLinkQuery(cmdClass, command, value) {
            if (value === void 0) { value = ''; }
            return _super.call(this, cmdClass, command, SEPARATOR_QUERY, value) || this;
        }
        return PJLinkQuery;
    }(PJLinkMessage));
    var PJLinkInstruction = (function (_super) {
        __extends(PJLinkInstruction, _super);
        function PJLinkInstruction(cmdClass, command, value) {
            return _super.call(this, cmdClass, command, SEPARATOR_INSTRUCTION, value) || this;
        }
        return PJLinkInstruction;
    }(PJLinkMessage));
    var PJLinkResponse = (function (_super) {
        __extends(PJLinkResponse, _super);
        function PJLinkResponse(cmdClass, command, value) {
            return _super.call(this, cmdClass, command, SEPARATOR_RESPONSE, value) || this;
        }
        return PJLinkResponse;
    }(PJLinkMessage));
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
    var PJLinkConfiguration = (function () {
        function PJLinkConfiguration() {
            this.password = PJLINK_PASSWORD;
        }
        PJLinkConfiguration.prototype.toJSON = function () {
            var json = '{\n' +
                '    "password" : "' + this.password + '"\n' +
                '}';
            return json;
        };
        return PJLinkConfiguration;
    }());
});
