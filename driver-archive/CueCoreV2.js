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
var CueCoreV2_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CueCoreV2 = void 0;
const Driver_1 = require("../system_lib/Driver");
const Meta = __importStar(require("../system_lib/Metadata"));
let CueCoreV2 = class CueCoreV2 extends Driver_1.Driver {
    static { CueCoreV2_1 = this; }
    socket;
    mConnected = false;
    kChannels = 6;
    mLevel1 = 0;
    mLevel2 = 0;
    mLevel3 = 0;
    mLevel4 = 0;
    mLevel5 = 0;
    mLevel6 = 0;
    mRate1 = 0;
    mRate2 = 0;
    mRate3 = 0;
    mRate4 = 0;
    mRate5 = 0;
    mRate6 = 0;
    mMethods = {};
    mObjects = {};
    static prefix = 'core';
    constructor(socket) {
        super(socket);
        this.socket = socket;
        for (let i = 1; i <= this.kChannels; i++) {
            this.mMethods[`pb-${i}-intensity`] = `PB0${i}Level`;
            this.mObjects[`pb-${i}-intensity`] = `mLevel${i}`;
            this.mMethods[`pb-${i}-rate`] = `PB0${i}Rate`;
            this.mObjects[`pb-${i}-rate`] = `mRate${i}`;
        }
        socket.subscribe("connect", (sender, message) => {
            this.connectStateChanged();
        });
        socket.subscribe("bytesReceived", (sender, msg) => this.bytesReceived(msg.rawData));
        socket.autoConnect(true);
        this.mConnected = socket.connected;
    }
    set connected(online) {
        this.mConnected = online;
    }
    get connected() {
        return this.mConnected;
    }
    set PB01Level(level) {
        this.tell("core-pb-1-intensity=" + level);
        this.mLevel1 = level;
    }
    get PB01Level() {
        return this.mLevel1;
    }
    set PB02Level(level) {
        this.tell("core-pb-2-intensity=" + level);
        this.mLevel2 = level;
    }
    get PB02Level() {
        return this.mLevel2;
    }
    set PB03Level(level) {
        this.tell("core-pb-3-intensity=" + level);
        this.mLevel3 = level;
    }
    get PB03Level() {
        return this.mLevel3;
    }
    set PB04Level(level) {
        this.tell("core-pb-4-intensity=" + level);
        this.mLevel4 = level;
    }
    get PB04Level() {
        return this.mLevel4;
    }
    set PB05Level(level) {
        this.tell("core-pb-5-intensity=" + level);
        this.mLevel5 = level;
    }
    get PB05Level() {
        return this.mLevel5;
    }
    set PB06Level(level) {
        this.tell("core-pb-6-intensity=" + level);
        this.mLevel6 = level;
    }
    get PB06Level() {
        return this.mLevel6;
    }
    set PB01Rate(level) {
        this.tell("core-pb-1-rate=" + level);
        this.mRate1 = level;
    }
    get PB01Rate() {
        return this.mRate1;
    }
    set PB02Rate(level) {
        this.tell("core-pb-2-rate=" + level);
        this.mRate2 = level;
    }
    get PB02Rate() {
        return this.mRate2;
    }
    set PB03Rate(level) {
        this.tell("core-pb-3-rate=" + level);
        this.mRate3 = level;
    }
    get PB03Rate() {
        return this.mRate3;
    }
    set PB04Rate(level) {
        this.tell("core-pb-4-rate=" + level);
        this.mRate4 = level;
    }
    get PB04Rate() {
        return this.mRate4;
    }
    set PB05Rate(level) {
        this.tell("core-pb-5-rate=" + level);
        this.mRate5 = level;
    }
    get PB05Rate() {
        return this.mRate5;
    }
    set PB06Rate(level) {
        this.tell("core-pb-6-rate=" + level);
        this.mRate6 = level;
    }
    get PB06Rate() {
        return this.mRate6;
    }
    connectStateChanged() {
        this.connected = this.socket.connected;
    }
    tell(data) {
        this.socket.sendText(data);
    }
    toString(bytes) {
        let result = '';
        for (let i = 0; i < bytes.length; ++i) {
            const byte = bytes[i];
            const text = byte.toString(16);
            result += (byte < 16 ? '%0' : '%') + text;
        }
        return decodeURIComponent(result);
    }
    static kReplyParser = /(.*)=([+-]?([0-9]*[.])?[0-9]+)/;
    bytesReceived(rawData) {
        let text = this.toString(rawData).replace(`${CueCoreV2_1.prefix}-`, '');
        const pieces = CueCoreV2_1.kReplyParser.exec(text);
        if (pieces && pieces.length > 3) {
            const method = this.mMethods[pieces[1]];
            const object = this.mObjects[pieces[1]];
            const value = pieces[2] * 1;
            if (this.mLevel1 !== value) {
                eval(`this.${object}=${value}`);
                this.changed(method);
            }
        }
        else
            console.warn("Unexpected data", text);
    }
};
exports.CueCoreV2 = CueCoreV2;
__decorate([
    Meta.property("Connected to CueCore", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], CueCoreV2.prototype, "connected", null);
__decorate([
    Meta.property("PB01 Level"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CueCoreV2.prototype, "PB01Level", null);
__decorate([
    Meta.property("PB02 Level"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CueCoreV2.prototype, "PB02Level", null);
__decorate([
    Meta.property("PB03 Level"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CueCoreV2.prototype, "PB03Level", null);
__decorate([
    Meta.property("PB04 Level"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CueCoreV2.prototype, "PB04Level", null);
__decorate([
    Meta.property("PB05 Level"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CueCoreV2.prototype, "PB05Level", null);
__decorate([
    Meta.property("PB06 Level"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CueCoreV2.prototype, "PB06Level", null);
__decorate([
    Meta.property("PB01 Rate"),
    Meta.min(-1),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CueCoreV2.prototype, "PB01Rate", null);
__decorate([
    Meta.property("PB02 Rate"),
    Meta.min(-1),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CueCoreV2.prototype, "PB02Rate", null);
__decorate([
    Meta.property("PB03 Rate"),
    Meta.min(-1),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CueCoreV2.prototype, "PB03Rate", null);
__decorate([
    Meta.property("PB04 Rate"),
    Meta.min(-1),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CueCoreV2.prototype, "PB04Rate", null);
__decorate([
    Meta.property("PB05 Rate"),
    Meta.min(-1),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CueCoreV2.prototype, "PB05Rate", null);
__decorate([
    Meta.property("PB06 Rate"),
    Meta.min(-1),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CueCoreV2.prototype, "PB06Rate", null);
exports.CueCoreV2 = CueCoreV2 = CueCoreV2_1 = __decorate([
    Meta.driver("NetworkTCP", { port: 7000 }),
    __metadata("design:paramtypes", [Object])
], CueCoreV2);
