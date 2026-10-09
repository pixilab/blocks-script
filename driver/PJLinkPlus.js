"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PJLinkPlus_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PJLinkPlus = void 0;
const NetworkProjector_1 = require("../driver/NetworkProjector");
const Metadata_1 = require("../system_lib/Metadata");
const SimpleFile_1 = require("../system/SimpleFile");
const md5_1 = require("../lib/md5");
const CMD_POWR = 'POWR';
const CMD_INPT = 'INPT';
const CMD_AVMT = 'AVMT';
const CMD_FREZ = 'FREZ';
const CMD_ERST = 'ERST';
const CMD_LAMP = 'LAMP';
const CMD_INST = 'INST';
const CMD_NAME = 'NAME';
const CMD_INF1 = 'INF1';
const CMD_INF2 = 'INF2';
const CMD_INFO = 'INFO';
const CMD_CLSS = 'CLSS';
const CMD_SNUM = 'SNUM';
const CMD_SVER = 'SVER';
const CMD_INNM = 'INNM';
const CMD_IRES = 'IRES';
const CMD_RRES = 'RRES';
const CMD_FILT = 'FILT';
const CMD_RLMP = 'RLMP';
const CMD_RFIL = 'RFIL';
const CMD_SVOL = 'SVOL';
const CMD_MVOL = 'MVOL';
const MSG_LKUP = 'LKUP';
const ERR_1 = 'ERR1';
const ERR_2 = 'ERR2';
const ERR_3 = 'ERR3';
const ERR_4 = 'ERR4';
const ERR_A = 'ERRA';
const STATUS_POLL_INTERVAL = 20000;
const LOG_DEBUG = false;
const PJLINK_PASSWORD = 'JBMIAProjectorLink';
const CREATE_DYNAMIC_PROPERTIES = false;
const MAX_ATTEMPT_CONNECT_DELAY = 180;
const MS_PER_S = 1000;
const MUTE_MIN = 10;
const MUTE_MAX = 31;
const RESOLUTION_SPLIT = 'x';
const IRES_NO_SIGNAL = '-';
const IRES_UNKNOWN_SIGNAL = '*';
const INPT_RGB = 1;
const INPT_VIDEO = 2;
const INPT_DIGITAL = 3;
const INPT_STORAGE = 4;
const INPT_NETWORK = 5;
const INPT_INTERNAL = 6;
const CONFIG_BASE_PATH = 'pjlinkplus.config';
const CACHE_BASE_PATH = 'pjlinkplus.cache';
const SEPARATOR_QUERY = ' ?';
const SEPARATOR_RESPONSE = '=';
const SEPARATOR_INSTRUCTION = ' ';
let PJLinkPlus = class PJLinkPlus extends NetworkProjector_1.NetworkProjector {
    static { PJLinkPlus_1 = this; }
    skipDeviceParameters = [];
    _lineBreak = '\n';
    devicePollParameters = [
        CMD_ERST,
        CMD_POWR,
        CMD_INPT,
        CMD_AVMT,
        CMD_LAMP,
        CMD_IRES,
        CMD_FILT,
    ];
    unauthenticated;
    busyHoldoff;
    pjlinkPassword;
    randomAuthSequence;
    authenticationSequence = '';
    statusPoller;
    keepPollingStatus;
    fetchDeviceInfoResolve = null;
    fetchDeviceInfoReject = null;
    fetchDeviceInfoRejectTimer = null;
    _infoFetchDate;
    _lastKnownConnectionDate;
    _lastKnownConnectionDateSet = false;
    _powerStatus = 0;
    _isOff = false;
    _isOn = false;
    _isCooling = false;
    _isWarmingUp = false;
    _inputType = 0;
    _inputSource = '-';
    _input;
    _validInputs;
    _mute;
    _freeze;
    _inputResolution;
    _recommendedResolution;
    _deviceName;
    _manufactureName;
    _productName;
    _otherInformation;
    _class = 1;
    _serialNumber;
    _softwareVersion;
    _hasLamps;
    _lampCount = 0;
    _lampOneHours = -1;
    _lampTwoHours = -1;
    _lampThreeHours = -1;
    _lampFourHours = -1;
    _lampOneActive = false;
    _lampTwoActive = false;
    _lampThreeActive = false;
    _lampFourActive = false;
    _lampReplacementModelNumber;
    _hasFilter;
    _filterUsageTime = -1;
    _filterReplacementModelNumber;
    _errorStatus = '000000';
    _errorStatusFan = 0;
    _errorStatusLamp = 0;
    _errorStatusTemperature = 0;
    _errorStatusCoverOpen = 0;
    _errorStatusFilter = 0;
    _errorStatusOther = 0;
    _hasError = false;
    _hasWarning = false;
    _currentParameterFetchList = [];
    _currentParameter;
    _customRequestResult;
    static commandInformation = {
        [CMD_POWR]: { dynamic: true, cmdClass: 1, read: true, write: true, needsPower: false },
        [CMD_INPT]: { dynamic: true, cmdClass: 1, read: true, write: true, needsPower: true },
        [CMD_AVMT]: { dynamic: true, cmdClass: 1, read: true, write: true, needsPower: true },
        [CMD_ERST]: { dynamic: true, cmdClass: 1, read: true, write: false, needsPower: false },
        [CMD_LAMP]: { dynamic: true, cmdClass: 1, read: true, write: false, needsPower: false },
        [CMD_INST]: { dynamic: false, cmdClass: 2, read: true, write: false, needsPower: false },
        [CMD_NAME]: { dynamic: false, cmdClass: 1, read: true, write: false, needsPower: false },
        [CMD_INF1]: { dynamic: false, cmdClass: 1, read: true, write: false, needsPower: false },
        [CMD_INF2]: { dynamic: false, cmdClass: 1, read: true, write: false, needsPower: false },
        [CMD_INFO]: { dynamic: false, cmdClass: 1, read: true, write: false, needsPower: false },
        [CMD_CLSS]: { dynamic: false, cmdClass: 1, read: true, write: false, needsPower: false },
        [CMD_SNUM]: { dynamic: false, cmdClass: 2, read: true, write: false, needsPower: false },
        [CMD_SVER]: { dynamic: false, cmdClass: 2, read: true, write: false, needsPower: false },
        [CMD_INNM]: { dynamic: true, cmdClass: 2, read: true, write: false, needsPower: false },
        [CMD_IRES]: { dynamic: true, cmdClass: 2, read: true, write: false, needsPower: true },
        [CMD_RRES]: { dynamic: false, cmdClass: 2, read: true, write: false, needsPower: false },
        [CMD_FILT]: { dynamic: true, cmdClass: 2, read: true, write: false, needsPower: false },
        [CMD_RLMP]: { dynamic: false, cmdClass: 2, read: true, write: false, needsPower: false },
        [CMD_RFIL]: { dynamic: false, cmdClass: 2, read: true, write: false, needsPower: false },
        [CMD_SVOL]: { dynamic: true, cmdClass: 2, read: false, write: true, needsPower: true },
        [CMD_MVOL]: { dynamic: true, cmdClass: 2, read: false, write: true, needsPower: true },
        [CMD_FREZ]: { dynamic: true, cmdClass: 2, read: true, write: true, needsPower: true },
    };
    commandReplyCache = {};
    cacheFilePath;
    currentQuery;
    inputInformation = {
        1: { label: 'RGB', sourceIDs: [] },
        2: { label: 'Video', sourceIDs: [] },
        3: { label: 'Digital', sourceIDs: [] },
        4: { label: 'Storage', sourceIDs: [] },
        5: { label: 'Network', sourceIDs: [] },
        6: { label: 'Internal', sourceIDs: [] },
    };
    configurationFilePath;
    configuration;
    logPrefix;
    gotToKnowDevice;
    authFailCount = 0;
    constructor(socket) {
        super(socket);
        this.logPrefix = '[PJ:' + this.socket.name + ']';
        this.addState(this._power = new NetworkProjector_1.BoolState('POWR', 'power'));
        this.addState(this._input = new StringState(CMD_INPT, 'input', () => this._power.getCurrent()));
        this.addState(this._mute = new NetworkProjector_1.NumState(CMD_AVMT, 'mute', MUTE_MIN, MUTE_MAX, () => this._power.getCurrent()));
        this.addState(this._freeze = new NetworkProjector_1.BoolState(CMD_FREZ, 'freeze', () => this._power.getCurrent()));
        this._mute.set(MUTE_MIN);
        socket.subscribe('connect', (_sender, _message) => {
            this.onConnectStateChange();
        });
        this.cacheFilePath = CACHE_BASE_PATH + '/' + this.socket.name + '.json';
        this.configurationFilePath = CONFIG_BASE_PATH + '/' + this.socket.name + '.cfg.json';
        this.getConfiguration(socket).finally(() => {
            if (this.socket.enabled) {
                this.poll();
                this.attemptConnect();
                this.socket.subscribe('finish', () => {
                    if (this.statusPoller) {
                        this.statusPoller.cancel();
                        this.statusPoller = undefined;
                    }
                });
            }
        });
    }
    async getConfiguration(socket) {
        const options = socket.options.trim();
        if (options !== '') {
            this.configuration = JSON.parse(options);
            this.pjlinkPassword = this.configuration.password;
            this.debugLog('got configuration via socket options');
        }
        else {
            try {
                this.configuration = await SimpleFile_1.SimpleFile.readJson(this.configurationFilePath);
            }
            catch (_error) {
                console.log('creating configuration file for "' + this.socket.name + '" under "' + this.configurationFilePath + '" - please fill out password if needed');
                await this.storePassword(PJLINK_PASSWORD);
            }
        }
        this.pjlinkPassword = this.configuration.password;
    }
    pollStatus() {
        return this.socket.enabled && !this.discarded;
    }
    poll() {
        if (!this.socket.connected && !this.connecting && !this.connectDly) {
            const logMsg = 'connection attempt #' + this.connectionAttemptCount;
            if (this.connectionAttemptCount++)
                this.debugLog(logMsg);
            else
                this.infoMsg(logMsg);
            this.attemptConnect();
        }
        const pollDelay = Math.min((18 + this.connectionAttemptCount * 2), MAX_ATTEMPT_CONNECT_DELAY);
        this.poller = wait(pollDelay * MS_PER_S);
        this.debugLog('poll: waiting ' + pollDelay + ' seconds');
        this.poller.then(() => {
            if (this.pollStatus())
                this.poll();
        });
    }
    isOfTypeName(typeName) {
        return typeName === "PJLinkPlus" ? this : super.isOfTypeName(typeName);
    }
    storePassword(password) {
        if (!this.configuration) {
            this.configuration = new PJLinkConfiguration();
        }
        this.configuration.password = password;
        return this.storeConfiguration(this.configuration);
    }
    storeConfiguration(cfg) {
        if (!cfg)
            cfg = this.configuration;
        return SimpleFile_1.SimpleFile.write(this.configurationFilePath, cfg.toJSON());
    }
    connectionAttemptCount = 0;
    connectStateChanged() {
        this.connecting = false;
        if (!this.socket.connected) {
            if (this.connected)
                this.infoMsg('connection lost');
            this.connected = false;
            if (this.correctionRetry)
                this.correctionRetry.cancel();
            if (this.reqToSend())
                this.connectSoon();
        }
    }
    justConnected() {
        this.connectionAttemptCount = 0;
        this.infoMsg('connection established');
        this.connected = true;
        wait(200).then(() => {
            if (this.unauthenticated) {
                this.warnMsg('not authenticated - potentially wrong password');
                this.connecting = false;
            }
            else {
                if (this.gotToKnowDevice) {
                    this.startPollDeviceStatus();
                }
                else {
                    this.getToKnowDevice().then(_resolve => {
                        this.debugLog('got to know device - starting to poll');
                        this.gotToKnowDevice = true;
                        this.startPollDeviceStatus();
                    }, reject => this.warnMsg('could not get to know device: ' + reject));
                }
            }
        });
    }
    getToKnowDevice() {
        return new Promise((resolveGetToKnow, rejectGetToKnow) => {
            this.debugLog('trying to load from disk');
            this.tryLoadCacheFromDisk().then(_resolve => {
                this.debugLog('trying to get class 1 static info');
                this.tryGetStaticInformation(1).then(_resolve => {
                    if (this._class > 1) {
                        this.debugLog('trying to get class 2 static info');
                        this.tryGetStaticInformation(2).then(_resolve => {
                            if (CREATE_DYNAMIC_PROPERTIES)
                                this.createDynamicInputProperties();
                            resolveGetToKnow();
                        }, reject => {
                            rejectGetToKnow(reject);
                        });
                    }
                    else {
                        resolveGetToKnow();
                    }
                }, reject => {
                    rejectGetToKnow(reject);
                });
            });
        });
    }
    tryLoadCacheFromDisk() {
        return new Promise((resolve, reject) => {
            SimpleFile_1.SimpleFile.read(this.cacheFilePath).then(readValue => {
                this.commandReplyCache = JSON.parse(readValue);
                this.debugLog('successfully loaded command reply cache');
                resolve();
            }).catch(_error => {
                SimpleFile_1.SimpleFile.write(this.cacheFilePath, JSON.stringify(this.commandReplyCache)).then(() => {
                    resolve();
                }).catch(error => { reject(error); });
            });
        });
    }
    cacheCommandReply(command, reply) {
        const existingItem = this.commandReplyCache[command];
        if (existingItem && existingItem.reply == reply)
            return;
        this.commandReplyCache[command] = { reply: reply };
        SimpleFile_1.SimpleFile.write(this.cacheFilePath, JSON.stringify(this.commandReplyCache)).then(_resolve => {
            this.debugLog('updated cache file \'' + this.cacheFilePath + '\' with ' + command + '=\'' + reply + '\'');
        });
    }
    tryGetStaticInformation(cmdClass) {
        return this.fetchDeviceInformation(PJLinkPlus_1.getStaticCommands(cmdClass));
    }
    static getStaticCommands(cmdClass) {
        let commands = [];
        for (const command in this.commandInformation) {
            const info = this.commandInformation[command];
            if (!info.dynamic && info.cmdClass == cmdClass)
                commands.push(command);
        }
        return commands;
    }
    get powerStatus() {
        return this._powerStatus;
    }
    set powerStatus(value) { this._powerStatus = value; }
    get isOff() {
        return this._isOff;
    }
    set isOff(value) { this._isOff = value; }
    get isOn() {
        return this._isOn;
    }
    set isOn(value) { this._isOn = value; }
    get isCooling() {
        return this._isCooling;
    }
    set isCooling(value) { this._isCooling = value; }
    get isWarmingUp() {
        return this._isWarmingUp;
    }
    set isWarmingUp(value) { this._isWarmingUp = value; }
    set input(value) {
        if (value.length != 2)
            return;
        this.setInput(parseInt(value[0]), value[1]);
    }
    get input() {
        return this._input.get();
    }
    createDynamicInputProperties() {
        this.debugLog('trying to create dynamic input properties');
        for (const type in this.inputInformation) {
            const typeNum = parseInt(type);
            const info = this.inputInformation[typeNum];
            if (info.sourceIDs.length > 0) {
                this.debugLog('attempting create input for ' + info.label);
                this.property('input' + info.label, { type: Number, description: 'select ' + info.label + ' input (valid values: ' + info.sourceIDs.join(', ') + ')' }, setValue => {
                    if (setValue !== undefined) {
                        this.setInput(typeNum, setValue + '');
                    }
                    return this._inputType == typeNum ? this._inputSource : '-';
                });
            }
        }
    }
    setInput(type, id) {
        switch (this._class) {
            default:
            case 1:
                return this.setInputClass1(type, parseInt(id));
            case 2:
                return this.setInputClass2(type, id);
        }
    }
    setInputClass1(type, id) {
        if (type < INPT_RGB || type > INPT_NETWORK)
            return false;
        if (isNaN(id)) {
            this.warnMsg('not a valid input id (1-9)');
            return false;
        }
        this._inputType = type;
        this._inputSource = id + '';
        if (this._input.set(type + '' + id)) {
            this.sendCorrection();
        }
    }
    setInputClass2(type, id) {
        if (type < INPT_RGB || type > INPT_INTERNAL)
            return false;
        if (!this.isValidSourceID(id, 2)) {
            this.warnMsg('\'' + id + '\'not a valid input id (1-9 A-Z)');
            return false;
        }
        const inputValue = type + id;
        if (this._validInputs.indexOf(inputValue) === -1) {
            this.warnMsg('not a valid input id - valid input ids: ' + this._validInputs.join(', '));
            return false;
        }
        this._inputType = type;
        this._inputSource = id;
        if (this._input.set(type + id)) {
            this.sendCorrection();
        }
        return true;
    }
    isValidSourceID(sourceID, sourceClass) {
        switch (sourceClass) {
            default:
            case 1:
                return sourceID.length === 1 && sourceID.match(/[1-9]/);
            case 2:
                return sourceID.length === 1 && sourceID.match(/[A-Z1-9]/);
        }
    }
    set mute(value) {
        if (this._mute.set(value)) {
            this.sendCorrection();
        }
    }
    get mute() {
        return this._mute.get();
    }
    set muteAudio(value) {
        this.mute = value ? 21 : 20;
    }
    get muteAudio() {
        const currentValue = this._mute.get();
        return currentValue == 31 || currentValue == 21;
    }
    set muteVideo(value) {
        this.mute = value ? 11 : 10;
    }
    get muteVideo() {
        const currentValue = this._mute.get();
        return currentValue == 31 || currentValue == 11;
    }
    get inputResolution() {
        if (this._inputResolution) {
            return this._inputResolution.toString();
        }
        return 'undefined';
    }
    get recommendedResolution() {
        if (this._recommendedResolution) {
            return this._recommendedResolution.toString();
        }
        return 'undefined';
    }
    get deviceName() { return this._deviceName; }
    set deviceName(value) { this._deviceName = value; }
    get manufactureName() { return this._manufactureName; }
    set manufactureName(value) { this._manufactureName = value; }
    get productName() { return this._productName; }
    set productName(value) { this._productName = value; }
    get otherInformation() { return this._otherInformation; }
    set otherInformation(value) { this._otherInformation = value; }
    get serialNumber() { return this._serialNumber; }
    set serialNumber(value) { this._serialNumber = value; }
    get softwareVersion() { return this._softwareVersion; }
    set softwareVersion(value) { this._softwareVersion = value; }
    get lampCount() {
        return this._lampCount;
    }
    get lampOneHours() {
        return this._lampOneHours;
    }
    get lampTwoHours() {
        return this._lampTwoHours;
    }
    get lampThreeHours() {
        return this._lampThreeHours;
    }
    get lampFourHours() {
        return this._lampFourHours;
    }
    get lampOneActive() {
        return this._lampOneActive;
    }
    get lampTwoActive() {
        return this._lampTwoActive;
    }
    get lampThreeActive() {
        return this._lampThreeActive;
    }
    get lampFourActive() {
        return this._lampFourActive;
    }
    get lampReplacementModelNumber() {
        return this._lampReplacementModelNumber;
    }
    get hasFilter() {
        return this._hasFilter;
    }
    get filterUsageTime() {
        return this._filterUsageTime;
    }
    get filterReplacementModelNumber() {
        return this._filterReplacementModelNumber;
    }
    get errorStatus() {
        return this._errorStatus;
    }
    get hasError() {
        return this._hasError;
    }
    get hasWarning() {
        return this._hasWarning;
    }
    get hasProblem() {
        return this._hasError || this._hasWarning;
    }
    set password(value) {
        this.storePassword(value);
    }
    get password() {
        return this.configuration ? this.configuration.password : PJLINK_PASSWORD;
    }
    get isOnline() {
        const now = new Date();
        if (this.socket.connected) {
            this._lastKnownConnectionDate = now;
            return true;
        }
        if (!this._lastKnownConnectionDateSet) {
            this.warnMsg('last known connection date unknown');
            return false;
        }
        const msSinceLastConnection = now.getTime() - this._lastKnownConnectionDate.getTime();
        return msSinceLastConnection < 42000;
    }
    get detailedStatusReport() {
        if (this._infoFetchDate === undefined) {
            return 'call "fetchDeviceInfo" at least once before requesting "detailedStatusReport"';
        }
        return 'Device: ' + this._manufactureName + ' ' + this._productName + ' ' + this._deviceName + this._lineBreak +
            'Power status: ' + PJLinkPlus_1.translatePowerCode(this._powerStatus) + this._lineBreak +
            'Error status: (' + this._errorStatus + ')' + this._lineBreak +
            '  Fan: ' + PJLinkPlus_1.translateErrorCode(this._errorStatusFan) + this._lineBreak +
            '  Lamp' + (this._lampCount > 1 ? 's' : '') + ': ' + (this._hasLamps !== undefined && this._hasLamps ? PJLinkPlus_1.translateErrorCode(this._errorStatusLamp) : '[no lamps]') + this._lineBreak +
            '  Temperature: ' + PJLinkPlus_1.translateErrorCode(this._errorStatusTemperature) + this._lineBreak +
            '  Cover open: ' + PJLinkPlus_1.translateErrorCode(this._errorStatusCoverOpen) + this._lineBreak +
            '  Filter: ' + (this._hasFilter !== undefined && this._hasFilter ? PJLinkPlus_1.translateErrorCode(this._errorStatusFilter) : '[no filter]') + this._lineBreak +
            '  Other: ' + PJLinkPlus_1.translateErrorCode(this._errorStatusOther) + this._lineBreak +
            (this._lampCount > 0 ? 'Lamp status: ' + this._lineBreak : '') +
            (this._lampCount > 0 ? 'Lamp one: ' + (this._lampOneActive ? 'on' : 'off') + ', ' + this._lampOneHours + ' lighting hours' + this._lineBreak : '') +
            (this._lampCount > 1 ? 'Lamp two: ' + (this._lampTwoActive ? 'on' : 'off') + ', ' + this._lampTwoHours + ' lighting hours' + this._lineBreak : '') +
            (this._lampCount > 2 ? 'Lamp three: ' + (this._lampThreeActive ? 'on' : 'off') + ', ' + this._lampThreeHours + ' lighting hours' + this._lineBreak : '') +
            (this._lampCount > 3 ? 'Lamp four: ' + (this._lampFourActive ? 'on' : 'off') + ', ' + this._lampFourHours + ' lighting hours' + this._lineBreak : '') +
            (this._lampReplacementModelNumber ? 'Lamp replacement model number: ' + this._lampReplacementModelNumber + this._lineBreak : '') +
            (this._hasFilter ? 'Filter usage time: ' + this._filterUsageTime + ' hours' + this._lineBreak : '') +
            (this._filterReplacementModelNumber ? 'Filter replacement model number: ' + this._filterReplacementModelNumber + this._lineBreak : '') +
            (this._validInputs ? 'Inputs: ' + this._validInputs.join(', ') + this._lineBreak : '') +
            (this._serialNumber ? 'SNR: ' + this._serialNumber + this._lineBreak : '') +
            (this._softwareVersion ? 'Software version: ' + this._softwareVersion + this._lineBreak : '') +
            '(class ' + this._class + ', status report last updated ' + this._infoFetchDate + ')';
    }
    static translateErrorCode(code) {
        switch (code) {
            case 0:
                return 'OK';
            case 1:
                return 'Warning';
            case 2:
                return 'Error';
        }
        return 'unknown error code';
    }
    static translatePowerCode(code) {
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
    }
    nextParameterToFetch() {
        while (this._currentParameterFetchList.length > 0) {
            const parameter = this._currentParameterFetchList.pop();
            if (this.skipDeviceParameters.indexOf(parameter) <= -1)
                return parameter;
        }
        return undefined;
    }
    fetchDeviceInformation(wantedInfo) {
        this.debugLog('trying to get info: \'' + wantedInfo.join(', ') + '\'');
        this._currentParameterFetchList = wantedInfo.slice().reverse();
        return new Promise((resolve, reject) => {
            if (this.fetchDeviceInfoResolve) {
                reject('fetch already in progress');
            }
            else {
                this.fetchDeviceInfoResolve = resolve;
                this.fetchInfoLoop();
                this.fetchDeviceInfoReject = reject;
                this.fetchDeviceInfoRejectTimer = wait(2000 * wantedInfo.length);
                this.fetchDeviceInfoRejectTimer.then(() => {
                    this.debugLog('fetchDeviceInformation timed out: reject');
                    delete this.fetchDeviceInfoResolve;
                    reject('fetch timeout');
                });
            }
        });
    }
    fetchInfoLoop() {
        if (!this.keepFetchingInfo())
            return;
        this._currentParameter = this.nextParameterToFetch();
        if (this._currentParameter !== undefined) {
            let pjClass;
            if (this._currentParameter == CMD_INPT) {
                pjClass = this._class;
            }
            else {
                pjClass = PJLinkPlus_1.determineCommandClass(this._currentParameter);
            }
            this.currentQuery = new PJLinkQuery(pjClass, this._currentParameter);
            this.fetchInfo(this.currentQuery).then(reply => {
                this.processInfoQueryReply(this.currentQuery, reply);
            }, error => {
                this.debugLog(error);
            }).finally(() => {
                wait(100).then(() => {
                    this.fetchInfoLoop();
                });
            });
        }
        else {
            this.finishFetchDeviceInformation();
        }
    }
    abortFetchDeviceInformation() {
        if (this.fetchDeviceInfoResolve) {
            this.fetchDeviceInfoReject('fetching device info aborted');
            this.cleanUpFetchingDeviceInformation();
        }
    }
    keepFetchingInfo() {
        return this.fetchDeviceInfoResolve !== undefined;
    }
    finishFetchDeviceInformation() {
        if (this.fetchDeviceInfoResolve) {
            this.fetchDeviceInfoResolve(true);
            this._infoFetchDate = new Date();
            this.cleanUpFetchingDeviceInformation();
        }
    }
    cleanUpFetchingDeviceInformation() {
        delete this.fetchDeviceInfoResolve;
        delete this.fetchDeviceInfoReject;
        this.fetchDeviceInfoRejectTimer.cancel();
        delete this.fetchDeviceInfoRejectTimer;
    }
    fetchInfo(query) {
        return new Promise((resolve, reject) => {
            if ((!this._power || !this._power.getCurrent()) &&
                PJLinkPlus_1.commandNeedsPower(query.command)) {
                reject('device needs to be powered on for command ' + query.command);
                return;
            }
            const cachedReply = this.commandReplyCache[query.command];
            if (cachedReply) {
                this.debugLog('used cached reply for command ' + query.command);
                resolve(cachedReply.reply);
                return;
            }
            this.queryRequest(query).then(reply => {
                if (reply == ERR_1 || reply == ERR_2 || reply == ERR_3) {
                    this.processInfoQueryError(query.command, reply);
                    if (reply == ERR_1)
                        reject('command not available: ' + query.command);
                }
                else {
                    if (!PJLinkPlus_1.isCommandDynamic(query.command)) {
                        this.cacheCommandReply(query.command, reply);
                        this.addCommandToSkip(query.command);
                    }
                    resolve(reply);
                }
            }, error => {
                this.processInfoQueryError(query.command, error);
                this.debugLog('error.. will wait 1s');
                wait(1000).then(() => {
                    this.debugLog('.. now reject');
                    reject('fetchInfo.queryRequest.error: ' + error);
                });
            }).catch(error => { reject('fetchInfo.queryRequest.catch: ' + error); });
        });
    }
    startPollDeviceStatus() {
        if (this.statusPoller) {
            this.warnMsg('status polling already running');
            return;
        }
        this.pollDeviceStatus(true);
    }
    pollDeviceStatus(skipInterval = false) {
        if (!this.connected) {
            this.debugLog('abort poll; connected: ' + this.connected);
            this.abortPollDeviceStatus();
            return;
        }
        this.keepPollingStatus = true;
        let waitDuration = skipInterval ? 7 : Math.floor(STATUS_POLL_INTERVAL + Math.random() * (STATUS_POLL_INTERVAL * 0.1));
        this.statusPoller = wait(waitDuration);
        this.statusPoller.then(() => {
            if (!this.keepPollingStatus)
                return;
            if (this.socket.connected &&
                this.connected) {
                this.fetchDeviceInformation(this.devicePollParameters).then(_resolve => {
                    this.debugLog('poll device status DONE');
                }, reject => {
                    this.debugLog('poll device status error: ' + reject);
                });
            }
            else {
                this.debugLog('no fetch; socket.connected: ' + this.socket.connected + '  connected: ' + this.connected);
            }
        }).finally(() => {
            const detached = this.socket.name === 'DETACHED';
            if (!this.discarded && !detached) {
                this.pollDeviceStatus();
            }
            else {
                this.debugLog('abort poll; discarded: ' + this.discarded + '  detached: ' + detached);
                this.abortPollDeviceStatus();
            }
        });
    }
    abortPollDeviceStatus() {
        this.keepPollingStatus = false;
        this.abortFetchDeviceInformation();
        this.debugLog('aborting polling device status');
        if (this.statusPoller) {
            this.statusPoller.cancel();
            delete this.statusPoller;
        }
    }
    processInfoQueryError(command, error) {
        switch (error) {
            case ERR_1:
                if (command == CMD_LAMP)
                    this._hasLamps = false;
                if (command == CMD_FILT)
                    this._hasFilter = false;
                this.skipDeviceParameters.push(command);
                break;
            case ERR_2:
                break;
            case ERR_3:
                break;
        }
    }
    processInfoQueryReply(query, reply) {
        switch (query.command) {
            case CMD_POWR:
                const newPowerStatus = parseInt(reply);
                if (this._powerStatus != newPowerStatus) {
                    this.powerStatus = newPowerStatus;
                    this.isOff = this._powerStatus == 0;
                    this.isOn = this._powerStatus == 1;
                    this.isCooling = this._powerStatus == 2;
                    this.isWarmingUp = this._powerStatus == 3;
                    this._power.updateCurrent(this.isOn);
                }
                break;
            case CMD_INPT:
                if (reply.length == 2) {
                    const oldType = this._inputType;
                    const newType = parseInt(reply[0]);
                    const newSource = reply[1];
                    let typeChanged = false;
                    let sourceChanged = false;
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
                const errorNames = ['Fan', 'Lamp', 'Temperature', 'CoverOpen', 'Filter', 'Other'];
                this._errorStatus = reply;
                if (reply.length == 6) {
                    const list = [0, 0, 0, 0, 0, 0];
                    let warning = false;
                    let error = false;
                    for (let i = 0; i < reply.length; i++) {
                        list[i] = parseInt(reply[i]);
                        error = error || list[i] == 2;
                        warning = warning || list[i] == 1;
                        this['_errorStatus' + errorNames[i]] = list[i];
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
                const lampNames = ['One', 'Two', 'Three', 'Four'];
                const lampData = reply.split(' ');
                this._lampCount = lampData.length / 2;
                for (let i = 0; i < this._lampCount; i++) {
                    const newHours = parseInt(lampData[i * 2]);
                    const newActive = parseInt(lampData[i * 2 + 1]) == 1;
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
                this._validInputs = reply.split(' ');
                for (let i = 0; i < this._validInputs.length; i++) {
                    this.addValidInput(this._validInputs[i]);
                }
                break;
            case CMD_NAME:
                this.deviceName = reply;
                break;
            case CMD_INF1:
                this.manufactureName = reply;
                break;
            case CMD_INF2:
                this.productName = reply;
                break;
            case CMD_INFO:
                this.otherInformation = reply;
                break;
            case CMD_CLSS:
                this._class = parseInt(reply);
                for (const infoKey in PJLinkPlus_1.commandInformation) {
                    const info = PJLinkPlus_1.commandInformation[infoKey];
                    if (info.cmdClass > this._class) {
                        this.addCommandToSkip(infoKey);
                    }
                }
                break;
            case CMD_SNUM:
                this.serialNumber = reply;
                break;
            case CMD_SVER:
                this.softwareVersion = reply;
                break;
            case CMD_INNM:
                break;
            case CMD_IRES:
                let newInputResolution;
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
                const newRecommendedResolution = PJLinkPlus_1.parseResolution(reply);
                if (!this._recommendedResolution ||
                    this._recommendedResolution.horizontal != newRecommendedResolution.horizontal ||
                    this._recommendedResolution.vertical != newRecommendedResolution.vertical) {
                    this._recommendedResolution = newRecommendedResolution;
                    this.changed('recommendedResolution');
                }
                break;
            case CMD_FILT:
                const newHasFilter = true;
                const newFilterUsageTime = parseInt(reply);
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
                const newLampReplacementModelNumber = reply;
                if (this._lampReplacementModelNumber != newLampReplacementModelNumber) {
                    this._lampReplacementModelNumber = newLampReplacementModelNumber;
                    this.changed('lampReplacementModelNumber');
                }
                break;
            case CMD_RFIL:
                const newFilterReplacementModelNumber = reply;
                if (this._filterReplacementModelNumber != newFilterReplacementModelNumber) {
                    this._filterReplacementModelNumber = newFilterReplacementModelNumber;
                    this.changed('filterReplacementModelNumber');
                }
                break;
            case CMD_FREZ:
                this._freeze.updateCurrent(parseInt(reply) == 1);
                break;
        }
    }
    notifyInputTypeChange(type) {
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
    }
    addValidInput(inputChars) {
        if (inputChars.length != 2) {
            this.warnMsg('wrong length of input chars: \'' + inputChars + '\'');
            return;
        }
        const type = parseInt(inputChars[0]);
        if (type === undefined ||
            type < INPT_RGB ||
            type > INPT_INTERNAL) {
            this.warnMsg('invalid input type: \'' + inputChars + '\'');
            return;
        }
        const sourceID = inputChars[1];
        this.inputInformation[type].sourceIDs.push(sourceID);
    }
    addCommandToSkip(command) {
        if (this.skipDeviceParameters.indexOf(command) == -1) {
            this.skipDeviceParameters.push(command);
        }
    }
    request(question, param) {
        let pjClass = PJLinkPlus_1.determineCommandClass(question);
        if (question == CMD_INPT) {
            pjClass = this._class;
        }
        const toSend = '%' + pjClass + question + ' ' + ((param === undefined) ? '?' : param);
        return this.sendMessageWithAuthentication(toSend);
    }
    queryRequest(query) {
        const toSend = query.encode();
        return this.sendMessageWithAuthentication(toSend);
    }
    sendMessageWithAuthentication(message) {
        return new Promise((resolve, reject) => {
            this.socket.sendText(this.authenticationSequence + message).catch(error => {
                this.sendFailed(error);
            });
            this.startRequest(message).then(result => {
                resolve(result);
            }, error => {
                reject(error);
            }).catch(error => {
                reject(error);
            }).finally(() => {
                asap(() => {
                    this.sendCorrection();
                });
            });
        });
    }
    textReceived(text) {
        this._lastKnownConnectionDate = new Date();
        if (text.indexOf('PJLINK ') === 0) {
            if (text.indexOf('PJLINK 1') === 0) {
                this.randomAuthSequence = text.substr('PJLINK 1'.length + 1);
                const sequence = this.randomAuthSequence + '' + this.pjlinkPassword;
                const md5Sequence = md5_1.Md5.hashAsciiStr(sequence);
                this.debugLog('\'' + sequence + '\' -> \'' + md5Sequence + '\' (' + md5Sequence.length + ')');
                this.authenticationSequence = md5Sequence;
                this.unauthenticated = false;
                this.connected = true;
            }
            else if (text.indexOf('PJLINK ' + ERR_A) === 0) {
                this.authFailCount++;
                this.unauthenticated = true;
                this.connecting = false;
                this.connected = false;
                if (this.socket.connected)
                    this.socket.disconnect();
                this.warnMsg('authentication failed - potentially wrong password [try #' + this.authFailCount + ']');
                this.requestFailure('"' + text + '"');
                const maxAuthFail = 10;
                if (this.authFailCount > maxAuthFail) {
                    this.errorMsg('authentication failed > ' + maxAuthFail + ' times. discarding driver.');
                    this.discard();
                }
            }
            else {
                this.connected = true;
            }
            return;
        }
        text = PJLinkPlus_1.removeLeadingGarbageCharacters(text);
        let currCmd = this.currCmd;
        if (!currCmd) {
            this.warnMsg('Unsolicited data: ' + text);
            return;
        }
        currCmd = currCmd.substring(0, 6);
        if (currCmd) {
            const expectedResponse = currCmd + '=';
            if (text.indexOf(expectedResponse) === 0) {
                text = text.substr(expectedResponse.length);
                let treatAsOk = text.indexOf('ERR') !== 0;
                if (!treatAsOk) {
                    switch (text) {
                        case ERR_1:
                            this.debugWarn('Undefined command: ' + this.currCmd);
                            treatAsOk = true;
                            break;
                        case ERR_2:
                            this.debugWarn('Bad command parameter: ' + this.currCmd);
                            treatAsOk = true;
                            break;
                        case ERR_A:
                            this.connected = false;
                            this.unauthenticated = true;
                            this.authFailCount++;
                            this.warnMsg('authentication failed - potentially wrong password');
                            break;
                        case ERR_3:
                            this.projectorBusy();
                            treatAsOk = true;
                            break;
                        default:
                            this.warnMsg('PJLink response: ' + currCmd + ', ' + text);
                            break;
                        case ERR_4:
                            this.debugLog('abort poll; ERR_4!');
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
                this.requestFailure('Expected reply ' + expectedResponse + ', got ' + text);
            }
        }
        else {
            this.warnMsg('Unexpected data: ' + text);
        }
        this.requestFinished();
    }
    projectorBusy() {
        if (!this.busyHoldoff) {
            this.busyHoldoff = wait(4000);
            this.busyHoldoff.then(() => this.busyHoldoff = undefined);
        }
    }
    static determineCommandClass(command) {
        if (!this.commandInformation[command])
            console.log(command);
        return this.commandInformation[command].cmdClass;
    }
    static isCommandDynamic(command) {
        return this.commandInformation[command].dynamic;
    }
    static commandNeedsPower(command) {
        if (!this.commandInformation[command])
            console.log(command);
        return this.commandInformation[command].needsPower;
    }
    onConnectStateChange() {
        if (this.socket.connected) {
            this._lastKnownConnectionDateSet = true;
        }
        this._lastKnownConnectionDate = new Date();
    }
    get customRequestResponse() {
        return this._customRequestResult;
    }
    customRequest(question, param) {
        return this.request(question, param == "" ? undefined : param).then(reply => {
            this._customRequestResult = reply;
            this.changed('customRequestResponse');
        }, error => {
            this._customRequestResult = "request failed: " + error;
        });
    }
    static parseResolution(reply) {
        const parts = reply.split(RESOLUTION_SPLIT);
        if (parts.length == 2) {
            return new Resolution(parseInt(parts[0]), parseInt(parts[1]));
        }
        return null;
    }
    static removeLeadingGarbageCharacters(text) {
        const msgStart = text.indexOf('%');
        if (msgStart > 0) {
            return text.substring(msgStart);
        }
        return text;
    }
    static parseResponseMessage(text) {
        text = this.removeLeadingGarbageCharacters(text);
        if (text.length < 8)
            return null;
        if (text[0] != '%')
            return null;
        const separator = text.substr(6, 1);
        if (separator != SEPARATOR_RESPONSE)
            return null;
        return new PJLinkResponse(parseInt(text[1]), text.substr(2, 4), text.substr(7));
    }
    debugLog(message) {
        if (LOG_DEBUG)
            console.log(this.logPrefix + ' ' + message);
    }
    debugWarn(message) {
        if (LOG_DEBUG)
            console.warn(this.logPrefix + ' ' + message);
    }
    errorMsg(...messages) {
        console.error(this.logPrefix + ' ' + messages.join(', '));
    }
    infoMsg(...messages) {
        console.log(this.logPrefix + ' ' + messages.join(', '));
    }
    warnMsg(...messages) {
        console.warn(this.logPrefix + ' ' + messages.join(', '));
    }
};
exports.PJLinkPlus = PJLinkPlus;
__decorate([
    (0, Metadata_1.property)("Power status (detailed: 0, 1, 2, 3 -> off, on, cooling, warming)", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], PJLinkPlus.prototype, "powerStatus", null);
__decorate([
    (0, Metadata_1.property)("Is device off?", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], PJLinkPlus.prototype, "isOff", null);
__decorate([
    (0, Metadata_1.property)("Is device on?", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], PJLinkPlus.prototype, "isOn", null);
__decorate([
    (0, Metadata_1.property)("Is device cooling?", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], PJLinkPlus.prototype, "isCooling", null);
__decorate([
    (0, Metadata_1.property)("Is device warming up?", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], PJLinkPlus.prototype, "isWarmingUp", null);
__decorate([
    (0, Metadata_1.property)('current input (class 1: 11-59 / class 2: 11-6Z)'),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], PJLinkPlus.prototype, "input", null);
__decorate([
    (0, Metadata_1.property)("Mute setting. (Video mute on/off: 11/10, Audio mute on/off: 21/20, A/V mute on/off: 31/30)"),
    (0, Metadata_1.min)(MUTE_MIN),
    (0, Metadata_1.max)(MUTE_MAX),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], PJLinkPlus.prototype, "mute", null);
__decorate([
    (0, Metadata_1.property)("Mute audio"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], PJLinkPlus.prototype, "muteAudio", null);
__decorate([
    (0, Metadata_1.property)("Mute video"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], PJLinkPlus.prototype, "muteVideo", null);
__decorate([
    (0, Metadata_1.property)('Input resolution (' + CMD_IRES + ')', true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "inputResolution", null);
__decorate([
    (0, Metadata_1.property)('Recommended resolution (' + CMD_RRES + ')', true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "recommendedResolution", null);
__decorate([
    (0, Metadata_1.property)('Projector/Display name (' + CMD_NAME + ')', true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], PJLinkPlus.prototype, "deviceName", null);
__decorate([
    (0, Metadata_1.property)('Manufacture name (' + CMD_INF1 + ')', true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], PJLinkPlus.prototype, "manufactureName", null);
__decorate([
    (0, Metadata_1.property)('Product name (' + CMD_INF2 + ')', true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], PJLinkPlus.prototype, "productName", null);
__decorate([
    (0, Metadata_1.property)('Other information (' + CMD_INFO + ')', true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], PJLinkPlus.prototype, "otherInformation", null);
__decorate([
    (0, Metadata_1.property)('Serial number (' + CMD_SNUM + ')', true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], PJLinkPlus.prototype, "serialNumber", null);
__decorate([
    (0, Metadata_1.property)('Software version (' + CMD_SVER + ')', true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], PJLinkPlus.prototype, "softwareVersion", null);
__decorate([
    (0, Metadata_1.property)("Lamp count", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "lampCount", null);
__decorate([
    (0, Metadata_1.property)("Lamp one: lighting hours", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "lampOneHours", null);
__decorate([
    (0, Metadata_1.property)("Lamp two: lighting hours", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "lampTwoHours", null);
__decorate([
    (0, Metadata_1.property)("Lamp three: lighting hours", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "lampThreeHours", null);
__decorate([
    (0, Metadata_1.property)("Lamp four: lighting hours", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "lampFourHours", null);
__decorate([
    (0, Metadata_1.property)("Lamp one: active", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "lampOneActive", null);
__decorate([
    (0, Metadata_1.property)("Lamp one: active", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "lampTwoActive", null);
__decorate([
    (0, Metadata_1.property)("Lamp one: active", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "lampThreeActive", null);
__decorate([
    (0, Metadata_1.property)("Lamp one: active", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "lampFourActive", null);
__decorate([
    (0, Metadata_1.property)('Lamp replacement model number (' + CMD_RLMP + ')', true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "lampReplacementModelNumber", null);
__decorate([
    (0, Metadata_1.property)("Has filter?", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "hasFilter", null);
__decorate([
    (0, Metadata_1.property)("Filter usage time (hours)", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "filterUsageTime", null);
__decorate([
    (0, Metadata_1.property)('Filter replacement model number (' + CMD_RFIL + ')', true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "filterReplacementModelNumber", null);
__decorate([
    (0, Metadata_1.property)("Error status (ERST)", true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "errorStatus", null);
__decorate([
    (0, Metadata_1.property)("Error reported?", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "hasError", null);
__decorate([
    (0, Metadata_1.property)("Warning reported?", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "hasWarning", null);
__decorate([
    (0, Metadata_1.property)("Problem reported?", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "hasProblem", null);
__decorate([
    (0, Metadata_1.property)('PJLink password'),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], PJLinkPlus.prototype, "password", null);
__decorate([
    (0, Metadata_1.property)("Is Projector/Display online? (Guesstimate: PJLink connection drops every now and then)", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "isOnline", null);
__decorate([
    (0, Metadata_1.property)("Detailed device status report (human readable)", true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "detailedStatusReport", null);
__decorate([
    (0, Metadata_1.property)("custom request response", true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], PJLinkPlus.prototype, "customRequestResponse", null);
__decorate([
    (0, Metadata_1.callable)("Send custom request"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PJLinkPlus.prototype, "customRequest", null);
exports.PJLinkPlus = PJLinkPlus = PJLinkPlus_1 = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 4352 }),
    __metadata("design:paramtypes", [Object])
], PJLinkPlus);
class StringState extends NetworkProjector_1.State {
    correct(drvr) {
        return this.correct2(drvr, this.wanted);
    }
}
class PJLinkMessage {
    cmdClass;
    command;
    separator;
    value;
    constructor(cmdClass, command, separator, value) {
        this.cmdClass = cmdClass;
        this.command = command;
        this.separator = separator;
        this.value = value;
    }
    encode() {
        return '%' + this.cmdClass + this.command + this.separator + this.value;
    }
}
class PJLinkQuery extends PJLinkMessage {
    constructor(cmdClass, command, value = '') {
        super(cmdClass, command, SEPARATOR_QUERY, value);
    }
}
class PJLinkInstruction extends PJLinkMessage {
    constructor(cmdClass, command, value) {
        super(cmdClass, command, SEPARATOR_INSTRUCTION, value);
    }
}
class PJLinkResponse extends PJLinkMessage {
    constructor(cmdClass, command, value) {
        super(cmdClass, command, SEPARATOR_RESPONSE, value);
    }
}
class Resolution {
    horizontal;
    vertical;
    constructor(h, v) {
        this.horizontal = h;
        this.vertical = v;
    }
    toString() {
        return this.horizontal + 'x' + this.vertical;
    }
}
class PJLinkConfiguration {
    password = PJLINK_PASSWORD;
    toJSON() {
        return '{\n    "password" : "' + this.password + '"\n}';
    }
}
