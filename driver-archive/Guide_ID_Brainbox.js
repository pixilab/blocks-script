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
exports.Guide_ID_Brainbox = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
const Spot_1 = require("../system/Spot");
const idParameterName = "GUIDE_ID";
const sendUpdateIntervalMs = 500;
let Guide_ID_Brainbox = class Guide_ID_Brainbox extends Driver_1.Driver {
    connection;
    spotPath;
    mySpot;
    paramPropAccessor;
    timePropAccessor;
    scheduledUpdate;
    holdUpdate;
    lastTime = 0;
    firstTime = true;
    timeRecived;
    debugLogging = false;
    constructor(connection) {
        super(connection);
        this.connection = connection;
        connection.autoConnect();
        if (connection.enabled) {
            this.spotPath = connection.options || connection.addressString;
            if (!connection.options && isIpOrLocalhost(connection.addressString)) {
                console.error("Missing driver option: Spot path must be specified when address is an IP or localhost");
            }
            else {
                console.log("Using spot path: " + this.spotPath);
                this.mySpot = Spot_1.Spot[this.spotPath];
                this.connection.subscribe('textReceived', (sender, msg) => {
                    this.onData(msg.text);
                });
                this.connection.subscribe('finish', () => {
                    this.scheduledUpdate?.cancel();
                    this.scheduledUpdate = undefined;
                });
                this.connection.subscribe('connect', (sender, msg) => {
                    if (msg) {
                        this.log("Guide ID Brainbox connected");
                        this.sendData("\r\n" + "console video 1");
                    }
                });
                this.hookUpSpotSubs();
                console.log("Guide ID Brainbox driver initialized use spot: " + this.spotPath);
            }
        }
    }
    hookUpSpotSubs() {
        this.paramPropAccessor = this.getProperty("Spot." + this.spotPath + ".parameter." + idParameterName, value => this.onParameterChanged(value));
        this.timePropAccessor = this.getProperty("Spot." + this.spotPath + ".time", value => this.onTimeChange(value));
        this.mySpot.subscribe('connect', (sender, message) => this.onConnectChanged(sender, message));
        this.mySpot.subscribe('finish', () => this.onDisplaySpotFinished());
    }
    debugLogEnable(enable) {
        this.debugLogging = enable;
    }
    cancelHoldUpdate() {
        if (this.holdUpdate) {
            this.holdUpdate.cancel();
            this.holdUpdate = undefined;
        }
    }
    onTimeChange(time) {
        this.timeRecived = time;
        if (this.timeRecived.dead) {
            this.log("Time flow is dead, stopping sync");
            this.stopSync();
            return;
        }
        this.log("Time changed: " + this.timeRecived.currentTime);
        if (this.firstTime) {
            this.startSync();
            this.firstTime = false;
            this.log("firstTime flag is now false, time updates will now be scheduled and loop detection will be active");
        }
        if (this.timeRecived.currentTime < this.lastTime) {
            this.log("Time went backwards, likely due to a  loop. Time: " + this.timeRecived.currentTime + " Last time: " + this.lastTime);
            this.startSync();
        }
        this.lastTime = this.timeRecived.currentTime;
    }
    onDisplaySpotFinished() {
        this.mySpot = Spot_1.Spot[this.spotPath];
        this.hookUpSpotSubs();
    }
    onParameterChanged(value) {
        this.cancelHoldUpdate();
        this.log("Parameter " + idParameterName + " changed to: " + value);
        this.startSync();
    }
    onConnectChanged(sender, message) {
    }
    onData(data) {
        this.log("Data received: " + data);
        const splitData = data.split(" ");
        const command = splitData[0];
        const value = splitData[1];
        this.log("Command recieved: " + command + " Value: " + value);
        this.log("Current video id on spot parameter: " + Spot_1.Spot[this.spotPath].parameter[idParameterName]);
        if (command === "videocode" && value === Spot_1.Spot[this.spotPath].parameter[idParameterName]) {
            const current = Spot_1.Spot[this.spotPath].active;
            if (current === false) {
                Spot_1.Spot[this.spotPath].active = true;
            }
        }
    }
    startSync() {
        this.sendData("\r\n" + "console video 1");
        this.sendData("brightsign code " + Spot_1.Spot[this.spotPath].parameter[idParameterName]);
        this.scheduleTimeUpdate();
    }
    stopSync() {
        this.lastTime = 0;
        this.scheduledUpdate?.cancel();
        this.scheduledUpdate = undefined;
        this.sendData("brightsign code 0");
        this.firstTime = true;
        this.log("Sync stopped, firstTime flag set to true");
    }
    sendTimeUpdate(currentTime) {
        const data = "brightsign timestamp " + msToTime(currentTime);
        this.sendData(data);
    }
    scheduleTimeUpdate() {
        if (this.scheduledUpdate)
            this.scheduledUpdate.cancel();
        this.sendTimeUpdate(this.timeRecived.currentTime);
        this.scheduledUpdate = wait(sendUpdateIntervalMs);
        this.scheduledUpdate.then(() => {
            if (Spot_1.Spot[this.spotPath].playingBlock !== "")
                this.scheduleTimeUpdate();
        });
    }
    sendData(data) {
        this.log("Sending data: " + data);
        if (this.connection.connected)
            this.connection.sendText(data);
    }
    log(...messages) {
        if (this.debugLogging)
            console.log(this.spotPath + " " + messages);
    }
};
exports.Guide_ID_Brainbox = Guide_ID_Brainbox;
__decorate([
    (0, Metadata_1.callable)("Enable debug Logging"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", void 0)
], Guide_ID_Brainbox.prototype, "debugLogEnable", null);
exports.Guide_ID_Brainbox = Guide_ID_Brainbox = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 4001 }),
    (0, Metadata_1.driver)('SerialPort', { baudRate: 115200 }),
    __metadata("design:paramtypes", [Object])
], Guide_ID_Brainbox);
function isIpOrLocalhost(addr) {
    return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(addr) || addr === "localhost";
}
function msToTime(ms) {
    let hours = Math.floor(ms / 3600000);
    ms %= 3600000;
    let minutes = Math.floor(ms / 60000);
    ms %= 60000;
    let seconds = Math.floor(ms / 1000);
    let milliseconds = ms % 1000;
    function pad(num, size) {
        let s = String(num);
        while (s.length < size)
            s = "0" + s;
        return s;
    }
    return pad(hours, 2) + ":" +
        pad(minutes, 2) + ":" +
        pad(seconds, 2) + ":" +
        pad(milliseconds, 3);
}
