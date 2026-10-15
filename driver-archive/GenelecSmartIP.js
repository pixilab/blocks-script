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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenelecSmartIP = void 0;
const SimpleHTTP_1 = require("../system/SimpleHTTP");
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
let GenelecSmartIP = class GenelecSmartIP extends Driver_1.Driver {
    socket;
    _mute = false;
    _volume = 0;
    _profile = 0;
    _connected = false;
    _zone = "";
    _active = false;
    _aoipName = "";
    _enableAoIP01 = false;
    _enableAoIP02 = false;
    _enableAnalog = false;
    _hasAnalog = false;
    auth;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        if (socket.enabled) {
            if (socket.options && socket.options.trim() !== "") {
                this.auth = "Basic " + this.toBase64(socket.options);
            }
            else {
                console.warn("No credentials in driver options, trying default");
                this.auth = "Basic YWRtaW46YWRtaW4=";
            }
            this.initStatus();
        }
    }
    async initStatus() {
        try {
            await this.getPowerStatus();
            await this.getVolumeLevel();
            await this.getProfileList();
            await this.getZone();
            await this.getAOIPName();
            await this.getInputSources();
        }
        catch (error) {
            console.error("Error during initStatus:", error);
        }
    }
    async getVolumeLevel() {
        try {
            const response = await this.sendRequest("audio/volume");
            const data = response.interpreted;
            this._volume = this.dbToNorm(data.level);
            this._mute = data.mute;
            this.changed("volume");
            this.changed("mute");
        }
        catch (err) {
            console.error("Failed to fetch initial volume:", err);
        }
    }
    async getPowerStatus() {
        try {
            const response = await this.sendRequest("device/pwr");
            const data = response.interpreted;
            this._active = data.state === "ACTIVE";
            this.changed("active");
        }
        catch (err) {
            console.error("Failed to fetch initial power:", err);
        }
    }
    async getProfileList() {
        try {
            const response = await this.sendRequest("profile/list");
            const data = response.interpreted;
            this._profile = data.selected;
            this.changed("profile");
        }
        catch (err) {
            console.error("Failed to fetch initial profile:", err);
        }
    }
    async getZone() {
        try {
            const response = await this.sendRequest("network/zone");
            const data = response.interpreted;
            this.zone = data.name;
        }
        catch (err) {
            console.error("Failed to fetch initial zone:", err);
        }
    }
    async getAOIPName() {
        try {
            const response = await this.sendRequest("aoip/dante/identity");
            const data = response.interpreted;
            this.aoipName = data.fname;
        }
        catch (err) {
            console.error("Failed to fetch initial zone:", err);
        }
    }
    async getInputSources() {
        try {
            const response = await this.sendRequest("audio/inputs");
            const data = response.interpreted;
            data.input.forEach((input) => {
                if (input === "A") {
                    this._hasAnalog = true;
                    this._enableAnalog = true;
                }
            });
        }
        catch (err) {
            console.error("Failed to fetch initial zone:", err);
        }
    }
    get connected() {
        return this._connected;
    }
    set connected(value) {
        this._connected = value;
    }
    get mute() {
        return this._mute;
    }
    set mute(value) {
        if (this._mute !== value && this._active) {
            const endPoint = "audio/volume";
            const payload = {
                level: this.normToDb_linearInDb(this._volume),
                mute: value,
            };
            this.sendCommand(endPoint, payload);
            this._mute = value;
        }
    }
    get active() {
        return this._active;
    }
    set active(value) {
        const endPoint = "device/pwr";
        const payload = {
            state: value ? "ACTIVE" : "STANDBY",
        };
        this.sendCommand(endPoint, payload);
        this._active = value;
        this.mute = false;
    }
    get volume() {
        return this._volume;
    }
    set volume(value) {
        if (this._volume !== value && this._active) {
            const endPoint = "audio/volume";
            const payload = {
                level: this.normToDb_linearInDb(value),
                mute: this._mute,
            };
            this.sendCommand(endPoint, payload);
            this._volume = value;
        }
    }
    get profile() {
        return this._profile;
    }
    set profile(value) {
        if (this._profile !== value && this._active) {
            const endPoint = "profile/restore";
            const payload = {
                id: value,
                startup: true,
            };
            this.sendCommand(endPoint, payload);
            this._profile = value;
        }
    }
    get enableAoIP01() {
        return this._enableAoIP01;
    }
    set enableAoIP01(value) {
        if (this._enableAoIP01 !== value && this._active) {
            this._enableAoIP01 = value;
            this.sendInputCommand();
        }
    }
    get enableAoIP02() {
        return this._enableAoIP02;
    }
    set enableAoIP02(value) {
        if (this._enableAoIP02 !== value && this._active) {
            this._enableAoIP02 = value;
            this.sendInputCommand();
        }
    }
    get enableAnalog() {
        return this._enableAnalog;
    }
    set enableAnalog(value) {
        if (this._enableAnalog !== value && this._active && this._hasAnalog) {
            this._enableAnalog = value;
            this.sendInputCommand();
        }
    }
    get zone() {
        return this._zone;
    }
    set zone(value) {
        this._zone = value;
    }
    get aoipName() {
        return this._aoipName;
    }
    set aoipName(value) {
        this._aoipName = value;
    }
    sendInputCommand() {
        const endPoint = "audio/inputs";
        const payload = [];
        if (this._enableAoIP01)
            payload.push("AoIP01");
        if (this._enableAoIP02)
            payload.push("AoIP02");
        if (this._enableAnalog)
            payload.push("A");
        const cmd = { input: payload };
        this.sendCommand(endPoint, cmd);
    }
    async sendCommand(endPoint, payload) {
        if (!this.socket.enabled) {
            this.connected = false;
            return;
        }
        try {
            await SimpleHTTP_1.SimpleHTTP.newRequest(`http://${this.socket.address}:${this.socket.port}/public/v1/${endPoint}`)
                .header("Authorization", this.auth)
                .put(JSON.stringify(payload));
            this.connected = true;
        }
        catch (err) {
            this.connected = false;
        }
    }
    async sendRequest(endPoint) {
        if (!this.socket.enabled) {
            this.connected = false;
            return undefined;
        }
        try {
            const response = await SimpleHTTP_1.SimpleHTTP.newRequest(`http://${this.socket.address}:${this.socket.port}/public/v1/${endPoint}`, { interpretResponse: true })
                .header("Authorization", this.auth)
                .get();
            this.connected = true;
            return response;
        }
        catch (err) {
            console.error("Request failed:", err);
            this.connected = false;
            return undefined;
        }
    }
    normToDb_linearInDb(v) {
        const clamped = Math.min(1, Math.max(0, v));
        const db = -200 + 200 * clamped;
        const quantized = Math.round(db * 10) / 10;
        return Math.min(0, Math.max(-200, quantized));
    }
    dbToNorm(db) {
        const c = Math.min(0, Math.max(-200, db));
        return (c + 200) / 200;
    }
    toBase64(str) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let result = "";
        let i = 0;
        while (i < str.length) {
            const c1 = str.charCodeAt(i++);
            const c2 = str.charCodeAt(i++);
            const c3 = str.charCodeAt(i++);
            const e1 = c1 >> 2;
            const e2 = ((c1 & 3) << 4) | (c2 >> 4);
            const e3 = isNaN(c2) ? 64 : ((c2 & 15) << 2) | (c3 >> 6);
            const e4 = isNaN(c2) || isNaN(c3) ? 64 : c3 & 63;
            result +=
                chars.charAt(e1) +
                    chars.charAt(e2) +
                    (e3 === 64 ? "=" : chars.charAt(e3)) +
                    (e4 === 64 ? "=" : chars.charAt(e4));
        }
        return result;
    }
};
exports.GenelecSmartIP = GenelecSmartIP;
__decorate([
    (0, Metadata_1.property)("Device connected status", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], GenelecSmartIP.prototype, "connected", null);
__decorate([
    (0, Metadata_1.property)("Mute the speaker"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], GenelecSmartIP.prototype, "mute", null);
__decorate([
    (0, Metadata_1.property)("Device Active"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], GenelecSmartIP.prototype, "active", null);
__decorate([
    (0, Metadata_1.property)("Normalized volume"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], GenelecSmartIP.prototype, "volume", null);
__decorate([
    (0, Metadata_1.property)("Speaker profile"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(5),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], GenelecSmartIP.prototype, "profile", null);
__decorate([
    (0, Metadata_1.property)("Enable AoIP01 source"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], GenelecSmartIP.prototype, "enableAoIP01", null);
__decorate([
    (0, Metadata_1.property)("Enable AoIP02 source"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], GenelecSmartIP.prototype, "enableAoIP02", null);
__decorate([
    (0, Metadata_1.property)("Enable Analog source"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], GenelecSmartIP.prototype, "enableAnalog", null);
__decorate([
    (0, Metadata_1.property)("Zone name", true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], GenelecSmartIP.prototype, "zone", null);
__decorate([
    (0, Metadata_1.property)("Speaker AIOP fname", true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], GenelecSmartIP.prototype, "aoipName", null);
exports.GenelecSmartIP = GenelecSmartIP = __decorate([
    (0, Metadata_1.driver)("NetworkTCP", { port: 9000 }),
    __metadata("design:paramtypes", [Object])
], GenelecSmartIP);
