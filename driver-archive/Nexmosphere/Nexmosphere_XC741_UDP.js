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
exports.Nexmosphere_XC741_UDP = void 0;
const Metadata_1 = require("../system_lib/Metadata");
const NexmosphereBase_1 = require("../driver/NexmosphereBase");
const kNumInterfaces = 4;
let Nexmosphere_XC741_UDP = class Nexmosphere_XC741_UDP extends NexmosphereBase_1.NexmosphereBase {
    specialInterfaces = [
        ["LightMark", 111],
        ["LightMark", 112],
        ["LightMark", 113],
        ["LightMark", 114]
    ];
    constructor(port) {
        super(port, kNumInterfaces);
        if (port.enabled) {
            this.initUdp();
            this.addBuiltInInterfaces(this.specialInterfaces);
            this.numInterfaces = kNumInterfaces;
        }
    }
};
exports.Nexmosphere_XC741_UDP = Nexmosphere_XC741_UDP;
exports.Nexmosphere_XC741_UDP = Nexmosphere_XC741_UDP = __decorate([
    (0, Metadata_1.driver)('NetworkUDP', { port: 5000, rcvPort: 5000 }),
    __metadata("design:paramtypes", [Object])
], Nexmosphere_XC741_UDP);
