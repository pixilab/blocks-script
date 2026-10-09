"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeuzeBPS8 = void 0;
const Driver_1 = require("../system_lib/Driver");
const Meta = __importStar(require("../system_lib/Metadata"));
const POLL_INTERVAL = 200;
const TIMEOUT = 2000;
const DEFAULT_PORT = 4001;
let LeuzeBPS8 = class LeuzeBPS8 extends Driver_1.Driver {
    socket;
    mConnected = false;
    mPosition = 0;
    mInternalError = false;
    mTapeError = false;
    mDiagnosticDataExist = false;
    mMarkerBarCodePresent = false;
    mStandbyState = false;
    mReadQuality = 3;
    mReadQualityString = '';
    mReadTimeout = false;
    pollTimer;
    timeoutTimer;
    set connected(val) { this.mConnected = val; }
    get connected() { return this.mConnected; }
    set position(val) { this.mPosition = val; }
    get position() { return this.mPosition; }
    set internalError(val) { this.mInternalError = val; }
    get internalError() { return this.mInternalError; }
    set tapeError(val) { this.mTapeError = val; }
    get tapeError() { return this.mTapeError; }
    set diagnosticDataExist(val) { this.mDiagnosticDataExist = val; }
    get diagnosticDataExist() { return this.mDiagnosticDataExist; }
    set markerBarCodePresent(val) { this.mMarkerBarCodePresent = val; }
    get markerBarCodePresent() { return this.mMarkerBarCodePresent; }
    set standbyState(val) { this.mStandbyState = val; }
    get standbyState() { return this.mStandbyState; }
    set readQuality(val) { this.mReadQuality = val; }
    get readQuality() { return this.mReadQuality; }
    set readQualityString(val) { this.mReadQualityString = val; }
    get readQualityString() { return this.mReadQualityString; }
    set readTimeout(val) { this.mReadTimeout = val; }
    get readTimeout() { return this.mReadTimeout; }
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.subscribe('connect', () => this.connectStateChanged());
        socket.subscribe('bytesReceived', (_, msg) => this.bytesReceived(msg.rawData));
        socket.subscribe('finish', () => this.tearDownConnection());
        socket.autoConnect(true);
        this.connected = socket.connected;
        if (this.connected) {
            this.setupConnection();
        }
    }
    setupConnection() {
        if (this.pollTimer) {
            this.pollTimer.cancel();
        }
        this.runPollLoop();
        if (this.timeoutTimer) {
            this.timeoutTimer.cancel();
        }
        this.runTimeoutLoop();
    }
    tearDownConnection() {
        if (this.pollTimer) {
            this.pollTimer.cancel();
            this.pollTimer = undefined;
        }
        if (this.timeoutTimer) {
            this.timeoutTimer.cancel();
            this.timeoutTimer = undefined;
        }
    }
    runPollLoop() {
        this.leuzeSendPoll();
        this.pollTimer = wait(POLL_INTERVAL);
        this.pollTimer.then(() => this.runPollLoop());
    }
    runTimeoutLoop() {
        this.timeoutTimer = wait(TIMEOUT);
        this.timeoutTimer.then(() => {
            if (!this.readTimeout) {
                this.readTimeout = true;
                console.warn(`Timeout, no data received from device in ${TIMEOUT} ms`);
            }
            if (this.pollTimer) {
                this.pollTimer.cancel();
                this.pollTimer = undefined;
            }
            this.leuzeSendPoll();
            this.runTimeoutLoop();
        });
    }
    bytesReceived(bytes) {
        this.leuzeProcessData(bytes);
        if (this.timeoutTimer) {
            this.timeoutTimer.cancel();
        }
        this.runTimeoutLoop();
        if (this.readTimeout) {
            this.readTimeout = false;
            console.warn('Cleared timeout condition');
        }
        if (!this.pollTimer) {
            this.runPollLoop();
        }
    }
    connectStateChanged() {
        console.info("Connect state changed to", this.socket.connected);
        this.connected = this.socket.connected;
        if (this.socket.connected) {
            this.setupConnection();
        }
        else {
            this.tearDownConnection();
        }
    }
    send(data) {
        this.socket.sendBytes(data);
    }
    toBinary(input) {
        const padToOctet = (s) => ('00000000' + s).substring(s.length);
        const output = [];
        for (var i = 0; i < input.length; i++) {
            output.push(padToOctet(input[i].toString(2)));
        }
        return output.join(' ');
    }
    leuzeSendPoll() {
        this.send([0x08, 0x08]);
    }
    leuzeProcessData(data) {
        const NUM_OCTETS = 6;
        const ERR = 0x01;
        const OUT = 0x02;
        const D = 0x04;
        const MM = 0x08;
        const SLEEP = 0x10;
        const Q = 0x60;
        const readQualityStrings = { 0: '> 75%', 1: '50% - 75%', 2: '25% - 50%', 3: '< 25%' };
        if (data.length != NUM_OCTETS) {
            console.warn(`Discarded reply with incorrect length: expected ${NUM_OCTETS} bytes, received ${data.length}`);
            return;
        }
        const [s, d1, d2, d3, d4, c] = data;
        if ((s ^ d1 ^ d2 ^ d3 ^ d4) != c) {
            console.warn('Discarded reply with incorrect checksum');
            return;
        }
        this.internalError = !!(s & ERR);
        this.tapeError = !!(s & OUT);
        this.diagnosticDataExist = !!(s & D);
        this.markerBarCodePresent = !!(s & MM);
        this.standbyState = !!(s & SLEEP);
        const readQuality = ((s & Q) >> 5);
        this.readQuality = readQuality;
        this.readQualityString = readQualityStrings[readQuality];
        this.position = new Int32Array([(d1 << 24) + (d2 << 16) + (d3 << 8) + d4])[0];
    }
};
exports.LeuzeBPS8 = LeuzeBPS8;
__decorate([
    Meta.property("Connected to TCP server", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LeuzeBPS8.prototype, "connected", null);
__decorate([
    Meta.property("Sensor position (in mm)", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LeuzeBPS8.prototype, "position", null);
__decorate([
    Meta.property("Leuze indicates internal error", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LeuzeBPS8.prototype, "internalError", null);
__decorate([
    Meta.property("Leuze indicates tape error", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LeuzeBPS8.prototype, "tapeError", null);
__decorate([
    Meta.property("Leuze indicates diagnostic data logged", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LeuzeBPS8.prototype, "diagnosticDataExist", null);
__decorate([
    Meta.property("Leuze indicates marker bar code in memory", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LeuzeBPS8.prototype, "markerBarCodePresent", null);
__decorate([
    Meta.property("Leuze indicates device in standby state", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LeuzeBPS8.prototype, "standbyState", null);
__decorate([
    Meta.property("Read quality", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LeuzeBPS8.prototype, "readQuality", null);
__decorate([
    Meta.property("Read quality string", true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], LeuzeBPS8.prototype, "readQualityString", null);
__decorate([
    Meta.property("Read timeout", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LeuzeBPS8.prototype, "readTimeout", null);
exports.LeuzeBPS8 = LeuzeBPS8 = __decorate([
    Meta.driver('NetworkTCP', { port: DEFAULT_PORT }),
    __metadata("design:paramtypes", [Object])
], LeuzeBPS8);
