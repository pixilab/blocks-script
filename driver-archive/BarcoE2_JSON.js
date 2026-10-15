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
exports.BarcoE2_JSON = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
let BarcoE2_JSON = class BarcoE2_JSON extends Driver_1.Driver {
    socket;
    mPreview = 0;
    mLive = 0;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.autoConnect();
    }
    activatePreset(preset, preview) {
        if (preview)
            this.mPreview = preset;
        else
            this.mLive = preset;
        return this.send(new Command("activatePreset", { id: preset, type: preview ? 0 : 1 }));
    }
    set preview(preset) {
        this.activatePreset(preset, true);
    }
    get preview() {
        return this.mPreview;
    }
    set live(preset) {
        this.activatePreset(preset, false);
    }
    get live() {
        return this.mLive;
    }
    send(cmd) {
        const cmdJson = JSON.stringify(cmd);
        return this.socket.sendText(cmdJson);
    }
};
exports.BarcoE2_JSON = BarcoE2_JSON;
__decorate([
    (0, Metadata_1.callable)("Load a preset into Live or Preview"),
    __param(0, (0, Metadata_1.parameter)("Preset number")),
    __param(1, (0, Metadata_1.parameter)("Load into Preview", true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Boolean]),
    __metadata("design:returntype", void 0)
], BarcoE2_JSON.prototype, "activatePreset", null);
__decorate([
    (0, Metadata_1.property)("Current preview preset"),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], BarcoE2_JSON.prototype, "preview", null);
__decorate([
    (0, Metadata_1.property)("Current live preset"),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], BarcoE2_JSON.prototype, "live", null);
exports.BarcoE2_JSON = BarcoE2_JSON = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 9999 }),
    __metadata("design:paramtypes", [Object])
], BarcoE2_JSON);
class Command {
    id;
    jsonrpc;
    method;
    params;
    static nextId = 1;
    constructor(method, params) {
        this.method = method;
        this.jsonrpc = "2.0";
        this.id = Command.nextId++;
        this.params = params;
    }
}
