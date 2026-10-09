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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarcoE2 = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
let BarcoE2 = class BarcoE2 extends Driver_1.Driver {
    socket;
    mLive = 0;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.autoConnect();
    }
    activatePreset(preset) {
        this.mLive = preset;
        return this.send(preset);
    }
    set live(preset) {
        this.activatePreset(preset);
    }
    get live() {
        return this.mLive;
    }
    send(preset) {
        return this.socket.sendText(`PRESET -a ${preset}`);
    }
};
exports.BarcoE2 = BarcoE2;
__decorate([
    (0, Metadata_1.callable)("Load a preset into Program or Preview"),
    __param(0, (0, Metadata_1.parameter)("Preset number")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], BarcoE2.prototype, "activatePreset", null);
__decorate([
    (0, Metadata_1.property)("Current live preset"),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], BarcoE2.prototype, "live", null);
exports.BarcoE2 = BarcoE2 = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 9878 }),
    __metadata("design:paramtypes", [Object])
], BarcoE2);
