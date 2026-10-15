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
var UDPTimecode_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UDPTimecode = void 0;
const Metadata_1 = require("../system_lib/Metadata");
const Driver_1 = require("../system_lib/Driver");
let UDPTimecode = class UDPTimecode extends Driver_1.Driver {
    static { UDPTimecode_1 = this; }
    socket;
    static FRAMERATE = 30;
    mTime;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        this.mTime = new TimeFlow(0, 0);
        socket.subscribe('textReceived', (sender, message) => {
            this.timeData(message.text);
        });
    }
    get time() {
        return this.mTime;
    }
    timeData(rawTime) {
        rawTime = rawTime.trim();
        const parts = rawTime.trim().split(' ');
        if (parts.length === 2 && parts[0].length === 8) {
            try {
                const rateStr = parts[1];
                const rate = parseFloat(rateStr);
                if (isNaN(rate) || rate < 0 || rate > 2)
                    throw "Invalid rate: " + rateStr;
                const ms = UDPTimecode_1.timecodeToMillis(parts[0]);
                const newTime = new TimeFlow(ms, rate);
                if (newTime.rate !== this.mTime.rate || newTime.position !== this.mTime.position) {
                    this.mTime = newTime;
                    this.changed('time');
                }
            }
            catch (error) {
                console.error(error, "for source data", rawTime);
            }
        }
        else
            console.warn("Expected 'HHMMSSFF R', but got", rawTime);
    }
    static timecodeToMillis(tc) {
        const ms = UDPTimecode_1.getTwoDigits(tc, 0) * TimeFlow.Hour +
            UDPTimecode_1.getTwoDigits(tc, 2) * TimeFlow.Minute +
            UDPTimecode_1.getTwoDigits(tc, 4) * TimeFlow.Second +
            UDPTimecode_1.getTwoDigits(tc, 6) * (TimeFlow.Second / UDPTimecode_1.FRAMERATE);
        return ms;
    }
    static getTwoDigits(src, offs) {
        const digits = src.substring(offs, offs + 2);
        const num = parseInt(digits);
        if (isNaN(num) || digits.length !== 2)
            throw "Invalid two digit number: " + digits;
        return num;
    }
};
exports.UDPTimecode = UDPTimecode;
__decorate([
    (0, Metadata_1.property)("Time received from external system"),
    __metadata("design:type", TimeFlow),
    __metadata("design:paramtypes", [])
], UDPTimecode.prototype, "time", null);
exports.UDPTimecode = UDPTimecode = UDPTimecode_1 = __decorate([
    (0, Metadata_1.driver)('NetworkUDP', { rcvPort: 9898 }),
    __metadata("design:paramtypes", [Object])
], UDPTimecode);
