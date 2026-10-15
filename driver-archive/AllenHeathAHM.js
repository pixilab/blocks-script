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
exports.AllenHeathAHM = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
let AllenHeathAHM = class AllenHeathAHM extends Driver_1.Driver {
    socket;
    isConnected = false;
    activePreset;
    receiveBuffer = [];
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.autoConnect(true);
        socket.subscribe('bytesReceived', (sender, message) => this.onBytesReceived(message.rawData));
        socket.subscribe('connect', (sender, message) => this.connected = socket.connected);
    }
    set preset(presetNumber) {
        this.sendRecallPreset(presetNumber);
    }
    get preset() {
        return this.activePreset;
    }
    get connected() {
        return this.isConnected;
    }
    set connected(isConnected) {
        this.isConnected = isConnected;
    }
    onBytesReceived(bytes) {
        this.receiveBuffer = this.receiveBuffer.concat(bytes);
        while (this.receiveBuffer.length > 4) {
            let presetRecallResponse = this.parsePresetRecallResponse(this.receiveBuffer);
            if (presetRecallResponse !== undefined) {
                this.activePreset = presetRecallResponse;
                this.changed('preset');
                this.receiveBuffer = this.receiveBuffer.slice(5);
            }
            this.receiveBuffer.shift();
        }
    }
    sendRecallPreset(presetNumber) {
        let { bank, preset } = this.toBankAndPreset(presetNumber);
        return this.socket.sendBytes([0xB0, 0x00, bank, 0xC0, preset]);
    }
    parsePresetRecallResponse(bytes) {
        if (bytes[0] == 0xB0 &&
            bytes[1] == 0x00 &&
            bytes[3] == 0xC0)
            return this.toPresetNumber(bytes[2], bytes[4]);
        return undefined;
    }
    toBankAndPreset(presetNumber) {
        const presetIndex = presetNumber - 1;
        const bank = Math.floor(presetIndex / 128);
        const preset = presetIndex % 128;
        return { bank, preset };
    }
    toPresetNumber(bank, preset) {
        const presetIndex = bank * 128 + preset;
        return presetIndex + 1;
    }
};
exports.AllenHeathAHM = AllenHeathAHM;
__decorate([
    (0, Metadata_1.property)("Preset number to recall"),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], AllenHeathAHM.prototype, "preset", null);
__decorate([
    (0, Metadata_1.property)("Successfully connected to device", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], AllenHeathAHM.prototype, "connected", null);
exports.AllenHeathAHM = AllenHeathAHM = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 51325 }),
    __metadata("design:paramtypes", [Object])
], AllenHeathAHM);
