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
exports.Nexmosphere_XC181 = void 0;
const Metadata_1 = require("system_lib/Metadata");
const NexmosphereBase_1 = require("driver/NexmosphereBase");
const kNumInterfaces = 8;
let Nexmosphere_XC181 = class Nexmosphere_XC181 extends NexmosphereBase_1.NexmosphereBase {
    specialInterfaces = [
        ["WIRELESSPICKUP", 111],
        ["WIRELESSPICKUP", 112],
        ["WIRELESSPICKUP", 113],
        ["WIRELESSPICKUP", 114],
        ["WIRELESSPICKUP", 115],
        ["WIRELESSPICKUP", 116],
        ["WIRELESSPICKUP", 117],
        ["WIRELESSPICKUP", 118]
    ];
    constructor(port, numInterfaces) {
        super(port, numInterfaces);
        this.initConnection(port);
        this.addBuiltInInterfaces(this.specialInterfaces);
    }
    considerConnected() {
        return this.port.connected;
    }
};
exports.Nexmosphere_XC181 = Nexmosphere_XC181;
exports.Nexmosphere_XC181 = Nexmosphere_XC181 = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 4001 }),
    (0, Metadata_1.driver)('SerialPort', { baudRate: 115200 }),
    __metadata("design:paramtypes", [Object, Number])
], Nexmosphere_XC181);
