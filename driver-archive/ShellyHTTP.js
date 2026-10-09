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
exports.ShellyHTTP = void 0;
const SimpleHTTP_1 = require("../system/SimpleHTTP");
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
let ShellyHTTP = class ShellyHTTP extends Driver_1.Driver {
    socket;
    _relay1 = false;
    _relay2 = false;
    _relay3 = false;
    _relay4 = false;
    constructor(socket) {
        super(socket);
        this.socket = socket;
    }
    get relay1() {
        return this._relay1;
    }
    set relay1(on) {
        this.makeRelayRequest(0, on);
        this._relay1 = on;
    }
    get relay2() {
        return this._relay2;
    }
    set relay2(on) {
        this.makeRelayRequest(1, on);
        this._relay2 = on;
    }
    get relay3() {
        return this._relay3;
    }
    set relay3(on) {
        this.makeRelayRequest(2, on);
        this._relay3 = on;
    }
    get relay4() {
        return this._relay4;
    }
    set relay4(on) {
        this.makeRelayRequest(3, on);
        this._relay4 = on;
    }
    async makeRelayRequest(relayIndex, on) {
        let state = on ? 'on' : 'off';
        return SimpleHTTP_1.SimpleHTTP.newRequest(`http://${this.socket.address}/relay/${relayIndex}?turn=${state}`).get();
    }
};
exports.ShellyHTTP = ShellyHTTP;
__decorate([
    (0, Metadata_1.property)("Relay 1"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], ShellyHTTP.prototype, "relay1", null);
__decorate([
    (0, Metadata_1.property)("Relay 2"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], ShellyHTTP.prototype, "relay2", null);
__decorate([
    (0, Metadata_1.property)("Relay 3"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], ShellyHTTP.prototype, "relay3", null);
__decorate([
    (0, Metadata_1.property)("Relay 4"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], ShellyHTTP.prototype, "relay4", null);
exports.ShellyHTTP = ShellyHTTP = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 80 }),
    __metadata("design:paramtypes", [Object])
], ShellyHTTP);
