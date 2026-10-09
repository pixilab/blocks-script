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
exports.GenericSerialRelays = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
let GenericSerialRelays = class GenericSerialRelays extends Driver_1.Driver {
    connection;
    relays;
    aggregateRelays;
    constructor(connection) {
        super(connection);
        this.connection = connection;
        connection.autoConnect(true);
        this.relays = this.indexedProperty("relays", Relay);
    }
    configureRelay(name) {
        const relay = new Relay(this.relays.length + 1, this, name);
        this.relays.push(relay);
    }
    sendCommand(relayNumber, state) {
        const START = 0xA0;
        const relay = relayNumber & 0xFF;
        const st = state ? 0x01 : 0x00;
        const checksum = (START + relay + st) & 0xFF;
        this.connection.sendBytes([START, relay, st, checksum]);
    }
    isNumeric(str) {
        return typeof str === "string" && str.trim() !== "" && !isNaN(Number(str));
    }
};
exports.GenericSerialRelays = GenericSerialRelays;
__decorate([
    (0, Metadata_1.callable)("Configure Relay"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GenericSerialRelays.prototype, "configureRelay", null);
exports.GenericSerialRelays = GenericSerialRelays = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 4001 }),
    (0, Metadata_1.driver)('SerialPort', { baudRate: 9600 }),
    __metadata("design:paramtypes", [Object])
], GenericSerialRelays);
class Relay {
    id;
    mRelay;
    mName;
    owner;
    constructor(ix, owner, name) {
        this.id = ix;
        this.owner = owner;
        this.mRelay = false;
        this.mName = name;
    }
    get relay() { return this.mRelay; }
    set relay(value) {
        if (value != this.mRelay)
            this.owner.sendCommand(this.id, value);
        this.mRelay = value;
    }
    get name() { return this.mName; }
}
__decorate([
    (0, Metadata_1.property)("Controls the relay", false),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], Relay.prototype, "relay", null);
__decorate([
    (0, Metadata_1.property)("RelayName", true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], Relay.prototype, "name", null);
