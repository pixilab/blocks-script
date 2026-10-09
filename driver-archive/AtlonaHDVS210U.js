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
exports.AtlonaHDVS210U = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
let AtlonaHDVS210U = class AtlonaHDVS210U extends Driver_1.Driver {
    socket;
    input;
    autoswitch;
    inputnumber;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.autoConnect();
    }
    set selectInput(inp) {
        this.input = inp;
        this.inputnumber = inp ? 1 : 0;
        const cmd = "x" + (this.inputnumber + 1) + "AVx1";
        this.sendCmd(cmd);
    }
    get selectInput() {
        return this.input;
    }
    set autoSwitch(on) {
        this.autoswitch = on;
        const cmd = "AutoSW " + (on ? "on" : "off");
        this.sendCmd(cmd);
    }
    get autoSwitch() {
        return this.autoswitch;
    }
    sendCmd(cmd) {
        this.socket.sendText(cmd);
    }
};
exports.AtlonaHDVS210U = AtlonaHDVS210U;
__decorate([
    (0, Metadata_1.property)("true = HDMI, false = USB-C"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], AtlonaHDVS210U.prototype, "selectInput", null);
__decorate([
    (0, Metadata_1.property)("Auto-switching mode"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], AtlonaHDVS210U.prototype, "autoSwitch", null);
exports.AtlonaHDVS210U = AtlonaHDVS210U = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 23 }),
    __metadata("design:paramtypes", [Object])
], AtlonaHDVS210U);
