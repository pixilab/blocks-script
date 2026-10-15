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
exports.SamsungMDCBasic = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
let SamsungMDCBasic = class SamsungMDCBasic extends Driver_1.Driver {
    socket;
    mId = 0;
    mPower = false;
    mInput = 0x14;
    mVolume = 0.5;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.enableWakeOnLAN();
        socket.autoConnect(true);
    }
    set id(id) {
        this.mId = id;
    }
    get id() {
        return this.mId;
    }
    set power(on) {
        this.mPower = on;
        this.sendCommand(0x11, on ? 1 : 0);
        if (on)
            this.socket.wakeOnLAN();
    }
    get power() {
        return this.mPower;
    }
    set volume(volume) {
        volume = Math.max(0, Math.min(1, volume));
        this.mVolume = volume;
        this.sendCommand(0x12, Math.round(volume * 100));
    }
    get volume() {
        return this.mVolume;
    }
    set input(input) {
        this.mInput = input;
        this.sendCommand(0x14, input);
    }
    get input() {
        return this.mInput;
    }
    sendCommand(cmdByte, paramByte) {
        const cmd = [];
        cmd.push(0xAA);
        cmd.push(cmdByte);
        cmd.push(this.mId);
        if (paramByte !== undefined) {
            cmd.push(1);
            cmd.push(paramByte);
        }
        else
            cmd.push(0);
        let checksum = 0;
        const count = cmd.length;
        for (let ix = 1; ix < count; ++ix)
            checksum += cmd[ix];
        cmd.push(checksum & 0xff);
        this.socket.sendBytes(cmd);
    }
};
exports.SamsungMDCBasic = SamsungMDCBasic;
__decorate([
    (0, Metadata_1.property)("Target display ID (must match dispplay's setting)"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(254),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], SamsungMDCBasic.prototype, "id", null);
__decorate([
    (0, Metadata_1.property)("Power on/off"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SamsungMDCBasic.prototype, "power", null);
__decorate([
    (0, Metadata_1.property)("Volume level, normalized 0...1"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], SamsungMDCBasic.prototype, "volume", null);
__decorate([
    (0, Metadata_1.property)("Input (source) number; HDMI1=33, HDMI2=34, URL=99"),
    (0, Metadata_1.min)(4),
    (0, Metadata_1.max)(99),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], SamsungMDCBasic.prototype, "input", null);
exports.SamsungMDCBasic = SamsungMDCBasic = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 1515 }),
    __metadata("design:paramtypes", [Object])
], SamsungMDCBasic);
