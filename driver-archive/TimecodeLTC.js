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
exports.TimecodeLTC = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
const kTypeMap = {
    "24": { parName: "24", fps: 24 },
    "25": { parName: "25", fps: 25 },
    "29.97_drop": { parName: "df", fps: 29.97 },
    "29.97_nondrop": { parName: "ndf", fps: 29.97 },
    "30": { parName: "30", fps: 30 }
};
let DEBUG = false;
let TimecodeLTC = class TimecodeLTC extends Driver_1.Driver {
    connection;
    mType = "25";
    mTime = new TimeFlow(0, 0);
    mSpeed = 0;
    mVolume = 0;
    mOffset = 0;
    mOffsetMs = 0;
    mResetOnStop = false;
    mUserBits = 0;
    mConnected = false;
    lastDataTime = 0;
    settingsTimer;
    resetOnStopTimer;
    isReset = false;
    toldOldversion;
    constructor(connection) {
        super(connection);
        this.connection = connection;
        if (connection.options) {
            let config = JSON.parse(connection.options);
            DEBUG = !!config.debug;
            if (config.type) {
                const sType = config.type.toString();
                if (kTypeMap[sType])
                    this.mType = sType;
                else
                    console.error("Invalid type in config", sType);
            }
            const offs = config.offset;
            if (offs && typeof offs === "number")
                this.offset = offs;
        }
        const typePropOpts = {
            type: "Enum",
            description: "Expected type of timecode",
            enumValues: [
                "24",
                "25",
                "29.97_drop",
                "29.97_nondrop",
                "30"
            ]
        };
        this.property("type", typePropOpts, newValue => {
            if (this.mType !== newValue && kTypeMap[newValue]) {
                this.mType = newValue;
                this.applySettingsSoon();
            }
            return this.mType;
        });
        connection.subscribe('textReceived', (sender, message) => {
            this.dataReceived(message.text.trim());
        });
        this.applySettingsSoon();
    }
    get time() { return this.mTime; }
    set time(t) { this.mTime = t; }
    get speed() { return this.mSpeed; }
    set speed(value) { this.mSpeed = value; }
    get volume() { return this.mVolume; }
    set volume(value) { this.mVolume = value; }
    get connected() { return this.mConnected; }
    set connected(value) { this.mConnected = value; }
    get offset() { return this.mOffset; }
    set offset(value) {
        this.mOffset = value;
        this.mOffsetMs = Math.round(value * 1000);
    }
    get userBits() { return this.mUserBits; }
    set userBits(value) { this.mUserBits = value; }
    get resetOnStop() { return this.mResetOnStop; }
    set resetOnStop(value) {
        this.mResetOnStop = value;
        if (!value)
            this.isReset = false;
    }
    applySettingsSoon(howSoon = 100) {
        if (this.settingsTimer)
            this.settingsTimer.cancel();
        this.settingsTimer = wait(howSoon);
        this.settingsTimer.then(() => this.applySettings());
    }
    applySettings() {
        const kinterval = 2000;
        var portOpt = "";
        const isSerial = !!this.connection.isOfTypeName("Serial");
        if (!isSerial)
            portOpt = "/p/" + this.connection.listenerPort;
        var settings = "i/" + kinterval +
            "/t/" + kTypeMap[this.mType].parName +
            portOpt +
            "/n/1/c/0/w/150/f/2";
        if (isSerial)
            settings += '\r';
        this.connection.sendText(settings);
        if (this.getMonotonousMillis() - this.lastDataTime >= kinterval * 2)
            this.connected = false;
        this.applySettingsSoon(5000);
    }
    dataReceived(msg) {
        const itemPairs = msg.split('/');
        const pieceCount = itemPairs.length;
        if (pieceCount % 2 || pieceCount < 8)
            console.error("Invalid data from peer", msg);
        const item = {};
        for (var ix = 0; ix < pieceCount; ix += 2)
            item[itemPairs[ix]] = itemPairs[ix + 1];
        const version = parseFloat(item['v']);
        if (version < 1.4) {
            if (!this.toldOldversion) {
                if (version < 1.1)
                    console.error("Requires version 1.1 or later of the timecode-reader program");
                else
                    console.warn("The userBits property requires version 1.4 or later of the timecode-reader program");
                this.toldOldversion = true;
            }
            return;
        }
        this.toldOldversion = false;
        const sigLevel = item['l'];
        if (sigLevel) {
            var val = ((parseFloat(sigLevel) + 64) / 64);
            this.volume = Math.max(0, Math.min(1, val));
        }
        const userBitsStr = item['u'];
        if (userBitsStr)
            this.userBits = parseFloat(userBitsStr);
        const now = this.getMonotonousMillis();
        const frameNum = item['n'];
        if (frameNum) {
            this.updateTime(now, parseFloat(item['s']), parseInt(frameNum), parseInt(item['t']), item['a'] === '1');
        }
        this.connected = true;
        this.lastDataTime = now;
    }
    lastSampleTime;
    lastServerTime;
    updateTime(serverTime, speed, frameNum, sampleTime, abrupt) {
        var millis = Math.round(frameNum / kTypeMap[this.mType].fps * 1000);
        const playing = speed > 0;
        if (!playing && this.isReset)
            return;
        this.isReset = false;
        const playingStateChanged = playing !== !!this.speed;
        if (playingStateChanged)
            abrupt = true;
        var elapsedDelta = 0;
        if (abrupt || !playing) {
            millis += this.mOffsetMs;
            if (this.time.rate !== speed || this.time.position !== millis) {
                this.time = new TimeFlow(millis, speed, undefined, false);
                log("abrupt millis", millis, "speed", speed);
            }
        }
        else {
            const elapsedServerTime = (serverTime - this.lastServerTime) * this.speed;
            const elapsedSampleTime = sampleTime - this.lastSampleTime;
            elapsedDelta = elapsedServerTime - elapsedSampleTime;
            const rawMillis = millis;
            millis += elapsedDelta + this.mOffsetMs;
            if (DEBUG) {
                const extrapolated = this.time.extrapolate(serverTime);
                log("elapsedServerTime", elapsedServerTime, "elapsedSampleTime", elapsedSampleTime, "elapsedDelta", elapsedDelta, "rawMillis", rawMillis, "millis", millis, "extrapolated", extrapolated, "millisExtrDelta", millis - extrapolated, "speed", speed);
            }
            this.time = new TimeFlow(millis, speed, undefined, false);
        }
        if (playingStateChanged) {
            if (!playing) {
                if (this.mResetOnStop) {
                    this.resetOnStopTimer = wait(400);
                    this.resetOnStopTimer.then(() => {
                        this.resetOnStopTimer = undefined;
                        this.time = new TimeFlow(0, 0, undefined, false);
                        this.isReset = true;
                    });
                }
            }
            else if (this.resetOnStopTimer) {
                this.resetOnStopTimer.cancel();
                this.resetOnStopTimer = undefined;
                this.isReset = false;
            }
        }
        this.speed = speed;
        this.lastSampleTime = sampleTime;
        this.lastServerTime = serverTime - elapsedDelta;
    }
};
exports.TimecodeLTC = TimecodeLTC;
__decorate([
    (0, Metadata_1.property)("The current time position", true),
    __metadata("design:type", TimeFlow),
    __metadata("design:paramtypes", [TimeFlow])
], TimecodeLTC.prototype, "time", null);
__decorate([
    (0, Metadata_1.property)("Playback rate, with 1 being normal", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], TimecodeLTC.prototype, "speed", null);
__decorate([
    (0, Metadata_1.property)("Signal volume, with 1 being 'overload'", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], TimecodeLTC.prototype, "volume", null);
__decorate([
    (0, Metadata_1.property)("Received data from peer", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], TimecodeLTC.prototype, "connected", null);
__decorate([
    (0, Metadata_1.property)("Added to time. May be negative. Expressed in seconds of real time."),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], TimecodeLTC.prototype, "offset", null);
__decorate([
    (0, Metadata_1.property)("User bits data, where least significant bit is the first user bit in the timecode frame.", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], TimecodeLTC.prototype, "userBits", null);
__decorate([
    (0, Metadata_1.property)("Auto reset time position to 0 when timecode stops"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], TimecodeLTC.prototype, "resetOnStop", null);
exports.TimecodeLTC = TimecodeLTC = __decorate([
    (0, Metadata_1.driver)('NetworkUDP', { port: 1632, rcvPort: 1633 }),
    (0, Metadata_1.driver)('SerialPort', { baudRate: 115200 }),
    __metadata("design:paramtypes", [Object])
], TimecodeLTC);
function log(...messages) {
    if (DEBUG)
        console.info(messages);
}
