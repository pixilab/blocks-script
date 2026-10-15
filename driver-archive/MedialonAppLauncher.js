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
exports.MedialonAppLauncher = void 0;
const NetworkDriver_1 = require("../system_lib/NetworkDriver");
const Meta = __importStar(require("../system_lib/Metadata"));
const CMD_SHUTDOWN = [0xff, 0x16, 0x01, 0x30, 0x30, 0x30, 0x31, 0x32, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xfe];
const CMD_RESTART_COMPUTER = [0xff, 0x16, 0x01, 0x30, 0x30, 0x30, 0x31, 0x31, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xfe];
const CMD_RESTART_WINDOWS = [0xff, 0x16, 0x01, 0x30, 0x30, 0x30, 0x31, 0x30, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xfe];
let MedialonAppLauncher = class MedialonAppLauncher extends NetworkDriver_1.NetworkDriver {
    socket;
    _socket;
    _power;
    _shuttingDown;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        this._socket = socket;
        socket.enableWakeOnLAN();
        socket.autoConnect(true);
        socket.subscribe("bytesReceived", (sender, message) => {
            console.info("Unexpected data received", message.rawData.length);
        });
        socket.subscribe('connect', ((sender, message) => {
            if (this._shuttingDown)
                return;
            switch (message.type) {
                case "Connection":
                    this.setPowerState(true);
                    break;
                case "ConnectionFailed":
                    this.setPowerState(false);
                    break;
            }
        }));
    }
    isOfTypeName(typeName) { return typeName === "MedialonAppLauncher" ? this : null; }
    set power(on) {
        this._power = on;
        if (on)
            this.sendWakeOnLAN();
        else {
            this._shuttingDown = true;
            this.shutdown().finally(() => {
                wait(1000).then(() => {
                    this._shuttingDown = false;
                });
            });
        }
    }
    get power() {
        return this._power;
    }
    setPowerState(on) {
        if (this._power != on) {
            this._power = on;
            this.changed('power');
        }
    }
    restartWindows() {
        return this._socket.sendBytes(CMD_RESTART_WINDOWS);
    }
    restart() {
        return this._socket.sendBytes(CMD_RESTART_COMPUTER);
    }
    shutdown() {
        return this._socket.sendBytes(CMD_SHUTDOWN);
    }
    sendWakeOnLAN() {
        this._socket.wakeOnLAN();
    }
};
exports.MedialonAppLauncher = MedialonAppLauncher;
__decorate([
    Meta.property('Power on/off'),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], MedialonAppLauncher.prototype, "power", null);
__decorate([
    Meta.callable('Restart Windows'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MedialonAppLauncher.prototype, "restartWindows", null);
__decorate([
    Meta.callable('Restart PC'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MedialonAppLauncher.prototype, "restart", null);
__decorate([
    Meta.callable('Shutdown PC'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MedialonAppLauncher.prototype, "shutdown", null);
__decorate([
    Meta.callable('Send WakeOnLAN'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MedialonAppLauncher.prototype, "sendWakeOnLAN", null);
exports.MedialonAppLauncher = MedialonAppLauncher = __decorate([
    Meta.driver('NetworkTCP', { port: 4550 }),
    __metadata("design:paramtypes", [Object])
], MedialonAppLauncher);
