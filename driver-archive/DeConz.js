"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DeConz_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeConz = void 0;
const SimpleFile_1 = require("../system/SimpleFile");
const SimpleHTTP_1 = require("../system/SimpleHTTP");
const Driver_1 = require("../system_lib/Driver");
const Meta = __importStar(require("../system_lib/Metadata"));
const Metadata_1 = require("../system_lib/Metadata");
let DeConz = DeConz_1 = class DeConz extends Driver_1.Driver {
    socket;
    configFileName;
    baseUrl;
    keyedBasedUrl;
    loggedAuthFail;
    mConnected = false;
    mAuthorized = false;
    alive;
    config;
    poller;
    deferredSender;
    cmdInFlight;
    devices;
    groups;
    whenSentlast = new Date();
    kMinTimeBetweenCommands = 160;
    pendingCommands = {};
    constructor(socket) {
        super(socket);
        this.socket = socket;
        this.configFileName = 'DeConzDriver_' + socket.name;
        this.alive = true;
        this.baseUrl = 'http://' + socket.address + ':' + socket.port + '/api';
        SimpleFile_1.SimpleFile.read(this.configFileName).then(rawData => {
            var config = JSON.parse(rawData);
            if (config && config.authCode)
                this.config = config;
        });
        if (socket.enabled) {
            socket.subscribe('finish', sender => {
                this.alive = false;
                if (this.poller)
                    this.poller.cancel();
                if (this.deferredSender)
                    this.deferredSender.cancel();
            });
            this.requestPoll(100);
        }
    }
    get authorized() {
        return this.mAuthorized;
    }
    set authorized(value) {
        if (this.mAuthorized && !value)
            console.warn("Became unauthorized");
        this.mAuthorized = value;
        this.checkReadyToSend();
    }
    get connected() {
        return this.mConnected;
    }
    set connected(value) {
        this.mConnected = value;
        this.checkReadyToSend();
    }
    refresh() {
        if (this.connected && this.authorized) {
            this.getDevices();
            this.getGroups();
        }
    }
    setOn(target, on) {
        this.sendCommandSoon(target).on = on;
    }
    setBrightness(target, brightness, time, cieX, cieY) {
        const state = this.sendCommandSoon(target);
        state.on = brightness > 0;
        state.bri = Math.floor(clip(brightness) * 255);
        this.setTime(state, time, 0);
        if (cieX !== undefined)
            state.xy = [clip(cieX), clip(cieY)];
    }
    setColorTemperature(target, kelvin, time) {
        const kMin = 2000;
        const kMax = 6500;
        var kOutMin = 153;
        var kOutMax = 500;
        kelvin = Math.max(kMin, Math.min(kMax, kelvin));
        var state = this.sendCommandSoon(target);
        var normalized = 1 - (kelvin - kMin) / (kMax - kMin);
        state.ct = Math.floor(normalized * (kOutMax - kOutMin) + kOutMin);
        this.setTime(state, time, 0.1);
    }
    setHueSaturation(target, hue, saturation, time) {
        this.setHueState(target, hue);
        const state = this.setSaturationState(target, saturation);
        this.setTime(state, time, 0.1);
    }
    setHueState(target, normalizedHue) {
        const state = this.sendCommandSoon(target);
        state.hue = Math.floor(clip(normalizedHue) * 65535);
        return state;
    }
    setSaturationState(target, normalizedSat) {
        const state = this.sendCommandSoon(target);
        state.sat = Math.floor(clip(normalizedSat) * 255);
        return state;
    }
    setTime(onState, timeInSeconds, defaultTimeInSeconds = 0) {
        if (timeInSeconds !== undefined)
            onState.transitiontime = Math.floor(Math.max(timeInSeconds, 0) * 10);
        else
            onState.transitiontime = Math.floor(defaultTimeInSeconds * 10);
    }
    requestPoll(howSoon) {
        if (!this.poller && this.alive) {
            this.poller = wait(howSoon);
            this.poller.then(() => {
                this.poller = undefined;
                if (this.config)
                    this.regularPoll();
                else
                    this.authenticationPoll();
                this.requestPoll(3000);
            });
        }
    }
    authenticationPoll() {
        SimpleHTTP_1.SimpleHTTP.newRequest(this.baseUrl).post('{"devicetype": "pixilab-blocks" }').then(response => {
            this.connected = true;
            if (response.status === 200) {
                var authResponse = JSON.parse(response.data);
                if (authResponse && authResponse.length) {
                    if (authResponse[0].success)
                        this.gotAuthCode(authResponse[0].success.username);
                }
            }
            else {
                this.authorized = false;
                if (response.status === 403) {
                    if (!this.loggedAuthFail) {
                        console.error("In Phoscon app, click Settings, Gateway, Advanced, Authenticate app");
                        this.loggedAuthFail = true;
                    }
                }
            }
        }).catch(error => this.requestFailed(error));
    }
    gotAuthCode(authCode) {
        this.config = { authCode: authCode };
        this.keyedBasedUrl = undefined;
        SimpleFile_1.SimpleFile.write(this.configFileName, JSON.stringify(this.config));
        this.authorized = true;
    }
    regularPoll() {
        if (!this.devices)
            this.getDevices();
        else if (!this.groups)
            this.getGroups();
        this.checkReadyToSend();
    }
    checkReadyToSend() {
        if (this.devices && this.groups && this.connected && this.authorized)
            this.sendPendingCommands();
    }
    sendCommandSoon(destination) {
        var result = this.pendingCommands[destination];
        if (!result)
            result = this.pendingCommands[destination] = {};
        if (!this.sendInProgress()) {
            this.sendPendingCommandsSoon();
        }
        return result;
    }
    sendPendingCommandsSoon() {
        if (this.havePendingCommands()) {
            const now = new Date();
            const howLongAgo = now.getTime() - this.whenSentlast.getTime();
            var delay = 50;
            const extraWait = this.kMinTimeBetweenCommands - howLongAgo;
            if (extraWait > 0) {
                delay += extraWait;
            }
            this.deferredSender = wait(delay);
            this.deferredSender.then(() => {
                this.deferredSender = undefined;
                this.sendPendingCommands();
                this.whenSentlast = new Date();
            });
        }
    }
    havePendingCommands() {
        for (var cmd in this.pendingCommands)
            return true;
        return false;
    }
    sendInProgress() {
        return !!this.deferredSender || this.cmdInFlight;
    }
    sendPendingCommands() {
        if (!this.alive) {
            this.pendingCommands = {};
            return;
        }
        for (var dest in this.pendingCommands) {
            if (this.pendingCommands.hasOwnProperty(dest)) {
                const cmd = this.pendingCommands[dest];
                delete this.pendingCommands[dest];
                var typeUrlSeg;
                var cmdUrlSeg;
                var targetItem;
                if (targetItem = this.devices.byName[dest]) {
                    typeUrlSeg = 'lights/';
                    cmdUrlSeg = '/state';
                }
                else if (targetItem = this.groups.byName[dest]) {
                    typeUrlSeg = 'groups/';
                    cmdUrlSeg = '/action';
                }
                else {
                    console.warn("Device/group not found", dest);
                    continue;
                }
                const url = this.getKeyedUrlBase() + typeUrlSeg + targetItem.id + cmdUrlSeg;
                this.cmdInFlight = true;
                const cmdStr = JSON.stringify(cmd);
                SimpleHTTP_1.SimpleHTTP.newRequest(url).put(cmdStr).catch(error => console.warn("Failed sending command", error, url, cmdStr)).finally(() => {
                    this.cmdInFlight = false;
                    this.sendPendingCommandsSoon();
                });
                return;
            }
        }
    }
    getDevices() {
        SimpleHTTP_1.SimpleHTTP.newRequest(this.getKeyedUrlBase() + 'lights').get().then(response => {
            this.connected = true;
            if (response.status === 200) {
                this.authorized = true;
                var devices = JSON.parse(response.data);
                if (devices)
                    this.devices = new NamedItems(devices);
                else
                    console.warn("Missing lights data");
            }
            else {
                console.warn("Lights error response", response.status);
                if (response.status === 403)
                    this.unauthorize();
            }
        }).catch(error => this.requestFailed(error));
    }
    getGroups() {
        SimpleHTTP_1.SimpleHTTP.newRequest(this.getKeyedUrlBase() + 'groups').get().then(response => {
            this.connected = true;
            if (response.status === 200) {
                const oldGroups = this.groups ? this.groups.byName : {};
                var groups = JSON.parse(response.data);
                if (groups) {
                    this.groups = new NamedItems(groups);
                    this.publishGroupPropsForNew(oldGroups);
                }
                else
                    console.warn("Missing group data");
            }
            else {
                console.warn("Groups error response", response.status);
                if (response.status === 403)
                    this.unauthorize();
            }
        }).catch(error => this.requestFailed(error));
    }
    publishGroupPropsForNew(oldGroups) {
        for (const newGroupName in this.groups.byName) {
            if (!oldGroups[newGroupName])
                this.publishGroupProps(newGroupName);
        }
    }
    static grpPropNameBrightness(groupName) {
        return groupName + '_brt';
    }
    static grpPropNameOn(groupName) {
        return groupName + '_on';
    }
    static grpPropNameHue(groupName) {
        return groupName + '_hue';
    }
    static grpPropNameSaturation(groupName) {
        return groupName + '_sat';
    }
    publishGroupProps(newGroupName) {
        var on = true;
        var brightess = 1;
        var hue = 1;
        var saturation = 0;
        this.property(DeConz_1.grpPropNameBrightness(newGroupName), { type: Number, description: "Group Brightness" }, setValue => {
            if (setValue !== undefined) {
                brightess = setValue;
                this.setBrightness(newGroupName, setValue, 0.2);
            }
            return brightess;
        });
        this.property(DeConz_1.grpPropNameOn(newGroupName), { type: Boolean, description: "Group On" }, setValue => {
            if (setValue !== undefined) {
                on = setValue;
                this.setOn(newGroupName, on);
            }
            return on;
        });
        this.property(DeConz_1.grpPropNameHue(newGroupName), { type: Number, description: "Group Hue" }, setValue => {
            if (setValue !== undefined) {
                hue = setValue;
                this.setHueState(newGroupName, setValue);
            }
            return hue;
        });
        this.property(DeConz_1.grpPropNameSaturation(newGroupName), { type: Number, description: "Group Saturation" }, setValue => {
            if (setValue !== undefined) {
                saturation = setValue;
                this.setSaturationState(newGroupName, setValue);
            }
            return saturation;
        });
    }
    unauthorize() {
        this.authorized = false;
        this.config = undefined;
        console.warn("Unauthorized due to 403");
    }
    getKeyedUrlBase() {
        if (!this.keyedBasedUrl && this.config)
            this.keyedBasedUrl = this.baseUrl + '/' + this.config.authCode + '/';
        return this.keyedBasedUrl;
    }
    requestFailed(error) {
        this.connected = false;
        console.warn(error);
    }
};
exports.DeConz = DeConz;
__decorate([
    Meta.property("Authorized to control", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], DeConz.prototype, "authorized", null);
__decorate([
    Meta.property("Connected successfully to device", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], DeConz.prototype, "connected", null);
__decorate([
    (0, Metadata_1.callable)("Refresh device and group info"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DeConz.prototype, "refresh", null);
__decorate([
    (0, Metadata_1.callable)("Turn target on or off"),
    __param(0, (0, Metadata_1.parameter)("device or group name")),
    __param(1, (0, Metadata_1.parameter)("state (false to turn off)")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", void 0)
], DeConz.prototype, "setOn", null);
__decorate([
    (0, Metadata_1.callable)("Set/Fade brightness and (optionally) CIE color"),
    __param(0, (0, Metadata_1.parameter)("device or group name")),
    __param(1, (0, Metadata_1.parameter)("level 0...1")),
    __param(2, (0, Metadata_1.parameter)("transition, in seconds", true)),
    __param(3, (0, Metadata_1.parameter)("0...1", true)),
    __param(4, (0, Metadata_1.parameter)("0...1", true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Number, Number]),
    __metadata("design:returntype", void 0)
], DeConz.prototype, "setBrightness", null);
__decorate([
    (0, Metadata_1.callable)("Set the color temperature"),
    __param(0, (0, Metadata_1.parameter)("device or group name")),
    __param(1, (0, Metadata_1.parameter)("2000...6500")),
    __param(2, (0, Metadata_1.parameter)("transition, in seconds", true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", void 0)
], DeConz.prototype, "setColorTemperature", null);
__decorate([
    (0, Metadata_1.callable)("Set/Fade the Hue and Saturation"),
    __param(0, (0, Metadata_1.parameter)("device or group name")),
    __param(1, (0, Metadata_1.parameter)("0...1")),
    __param(2, (0, Metadata_1.parameter)("0...1")),
    __param(3, (0, Metadata_1.parameter)("transition, in seconds", true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Number]),
    __metadata("design:returntype", void 0)
], DeConz.prototype, "setHueSaturation", null);
exports.DeConz = DeConz = DeConz_1 = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 8080 }),
    __metadata("design:paramtypes", [Object])
], DeConz);
function clip(value) {
    value = value || 0;
    return Math.max(0, Math.min(1, value));
}
class NamedItems {
    byId;
    byName;
    constructor(items) {
        this.byId = items;
        this.byName = {};
        for (var key in items) {
            const item = items[key];
            item.id = key;
            this.byName[item.name] = item;
        }
    }
}
