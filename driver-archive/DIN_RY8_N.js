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
exports.DIN_RY8_N = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
let DIN_RY8_N = class DIN_RY8_N extends Driver_1.Driver {
    connection;
    relays;
    _unitId = 1;
    myOptions = { numberOfRelays: 8 };
    constructor(connection) {
        super(connection);
        this.connection = connection;
        if (connection.options)
            this.myOptions = JSON.parse(connection.options);
        this.relays = this.indexedProperty("relays", Relay);
        for (let rc = 0; rc < this.myOptions.numberOfRelays; ++rc)
            this.relays.push(new Relay(this, rc));
        connection.autoConnect(true, { usbVendorId: 0x04d8, usbProductId: 0x000a });
        connection.subscribe('bytesReceived', (sender, message) => console.log(byteArrayToString(message.rawData)));
    }
    get unitId() {
        return this._unitId;
    }
    set unitId(value) {
        this._unitId = value;
    }
    testSend() {
        this.connection.sendBytes([0xf2, 0x01, 0xf3]);
        this.connection.sendBytes(stringToByteArray("TRLYSET"));
        this.connection.sendBytes([0xf4]);
        this.connection.sendBytes(stringToByteArray("P01:" + '1'));
        this.connection.sendBytes([0xF5, 0xF5]);
    }
};
exports.DIN_RY8_N = DIN_RY8_N;
__decorate([
    (0, Metadata_1.property)("Relay box ID number"),
    (0, Metadata_1.min)(1),
    (0, Metadata_1.max)(99),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], DIN_RY8_N.prototype, "unitId", null);
exports.DIN_RY8_N = DIN_RY8_N = __decorate([
    (0, Metadata_1.driver)('SerialPort', { baudRate: 115200 }),
    __metadata("design:paramtypes", [Object])
], DIN_RY8_N);
class Relay {
    owner;
    relayNumber;
    m_on = false;
    constructor(owner, relayNumber) {
        this.owner = owner;
        this.relayNumber = relayNumber;
    }
    get on() {
        return this.m_on;
    }
    set on(on) {
        if (this.m_on !== on) {
            this.m_on = on;
            this.owner.connection.sendBytes([0xf2, this.owner._unitId, 0xf3]);
            this.owner.connection.sendBytes(stringToByteArray("TRLYSET"));
            this.owner.connection.sendBytes([0xf4]);
            const cmdString = "P0" + (this.relayNumber + 1) + ':' + (on ? '1' : '0');
            this.owner.connection.sendBytes(stringToByteArray(cmdString));
            this.owner.connection.sendBytes([0xF5, 0xF5]);
        }
    }
}
__decorate([
    (0, Metadata_1.property)("True if the relay is on"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], Relay.prototype, "on", null);
function stringToByteArray(str) {
    const len = str.length;
    const bytes = [];
    for (var ix = 0; ix < len; ++ix)
        bytes.push(str.charCodeAt(ix));
    return bytes;
}
function byteArrayToString(bytes) {
    let result = "";
    for (let ix = 0; ix < bytes.length; ++ix)
        result += ' 0x' + bytes[ix].toString(16);
    return result;
}
