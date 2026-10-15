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
var NetRFID_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetRFID = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
let NetRFID = NetRFID_1 = class NetRFID extends Driver_1.Driver {
    socket;
    mScanned;
    mResetValuePromise;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.autoConnect();
        socket.subscribe('textReceived', (sender, message) => {
            let scanned = message.text;
            if (scanned.indexOf('v') === 0)
                scanned = scanned.substring(4);
            this.scanned = NetRFID_1.removeControls(scanned);
        });
    }
    static removeControls(scanned) {
        let result = '';
        const len = scanned.length;
        for (let ix = 0; ix < len; ++ix) {
            if (scanned.charCodeAt(ix) > 0x20)
                result += scanned.charAt(ix);
        }
        return result;
    }
    set scanned(value) {
        this.mScanned = value;
        if (value)
            this.startResetTimeout();
    }
    get scanned() {
        return this.mScanned;
    }
    startResetTimeout() {
        this.stopResetTimer();
        this.mResetValuePromise = wait(500);
        this.mResetValuePromise.then(() => this.scanned = "");
    }
    stopResetTimer() {
        if (this.mResetValuePromise) {
            this.mResetValuePromise.cancel();
            this.mResetValuePromise = undefined;
        }
    }
};
exports.NetRFID = NetRFID;
__decorate([
    (0, Metadata_1.property)("Last scanned value, or empty string", true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], NetRFID.prototype, "scanned", null);
exports.NetRFID = NetRFID = NetRFID_1 = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 50000 }),
    __metadata("design:paramtypes", [Object])
], NetRFID);
