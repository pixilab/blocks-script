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
exports.Nexmosphere_XN165 = void 0;
const Metadata_1 = require("../system_lib/Metadata");
const NexmosphereBase_1 = require("../driver/NexmosphereBase");
const kNumInterfaces = 2;
let Nexmosphere_XN165 = class Nexmosphere_XN165 extends NexmosphereBase_1.NexmosphereBase {
    specialInterfaces = [
        ["XT4", 3]
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
exports.Nexmosphere_XN165 = Nexmosphere_XN165;
exports.Nexmosphere_XN165 = Nexmosphere_XN165 = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 4001 }),
    (0, Metadata_1.driver)('SerialPort', { baudRate: 115200 }),
    __metadata("design:paramtypes", [Object])
], Nexmosphere_XN165);
