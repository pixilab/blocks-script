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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PanasonicPanTilt = void 0;
const SimpleHTTP_1 = require("../system/SimpleHTTP");
const Driver_1 = require("../system_lib/Driver");
const Meta = __importStar(require("../system_lib/Metadata"));
const Metadata_1 = require("../system_lib/Metadata");
let PanasonicPanTilt = class PanasonicPanTilt extends Driver_1.Driver {
    socket;
    processor;
    panTiltPending;
    mPower = false;
    mPan = 0.5;
    mTilt = 0.5;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        this.processor = new CmdProcessor(socket.address);
    }
    set power(state) {
        this.mPower = state;
        this.sendRawCommand('O' + (state ? '1' : '0'));
    }
    get power() {
        return this.mPower;
    }
    recallPreset(preset) {
        preset = Math.min(100, Math.max(1, preset));
        return this.sendRawCommand('R' + toTwoDec(preset - 1));
    }
    set pan(state) {
        if (this.mPan !== state) {
            this.mPan = state;
            this.sendPanTiltSoon();
        }
    }
    get pan() {
        return this.mPan;
    }
    set tilt(state) {
        if (this.mTilt !== state) {
            this.mTilt = state;
            this.sendPanTiltSoon();
        }
    }
    get tilt() {
        return this.mTilt;
    }
    sendPanTiltSoon() {
        if (!this.panTiltPending) {
            this.panTiltPending = wait(100);
            this.panTiltPending.then(() => {
                const cmd = 'APC' +
                    toFourHex(this.mPan * 0xffff) +
                    toFourHex(this.mTilt * 0xffff);
                this.sendRawCommand(cmd);
                this.panTiltPending = undefined;
            });
        }
    }
    sendRawCommand(rawCommand) {
        const result = this.processor.sendCommand(rawCommand);
        result.then(response => log("Response", response));
        return result;
    }
};
exports.PanasonicPanTilt = PanasonicPanTilt;
__decorate([
    Meta.property("Power control"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], PanasonicPanTilt.prototype, "power", null);
__decorate([
    Meta.callable("Recall memory preset"),
    __param(0, (0, Metadata_1.parameter)("Preset to recall; 1...100")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], PanasonicPanTilt.prototype, "recallPreset", null);
__decorate([
    Meta.property("Camera pan, normalized 0…1"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], PanasonicPanTilt.prototype, "pan", null);
__decorate([
    Meta.property("Camera tilt, normalized 0…1"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], PanasonicPanTilt.prototype, "tilt", null);
__decorate([
    Meta.callable("Send raw command to device"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PanasonicPanTilt.prototype, "sendRawCommand", null);
exports.PanasonicPanTilt = PanasonicPanTilt = __decorate([
    Meta.driver('NetworkTCP', { port: 80 }),
    __metadata("design:paramtypes", [Object])
], PanasonicPanTilt);
class CmdProcessor {
    server;
    currCmd;
    cmdQueue = [];
    static kMillisPerCmd = 130;
    constructor(server) {
        this.server = server;
    }
    sendCommand(command) {
        log("sendCommand", command);
        const cmd = new Cmd(command);
        if (this.cmdQueue.length > 30)
            throw "Command buffer overflow";
        this.cmdQueue.push(cmd);
        this.doNextCommand();
        return cmd.getPromise();
    }
    doNextCommand() {
        if (!this.currCmd && this.cmdQueue.length) {
            const cmd = this.cmdQueue.shift();
            this.currCmd = cmd;
            cmd.getRequest(this.server).get().then(result => {
                cmd.handleResponse(result.data);
                return wait(CmdProcessor.kMillisPerCmd);
            }, error => {
                cmd.fail(error);
                return wait(CmdProcessor.kMillisPerCmd);
            }).finally(() => {
                log("Finally");
                this.currCmd = undefined;
                this.doNextCommand();
            });
        }
    }
}
function log(...toLog) {
}
class Cmd {
    command;
    outcome;
    resolver;
    rejector;
    constructor(command) {
        this.command = command;
        this.outcome = new Promise((resolver, rejector) => {
            this.resolver = resolver;
            this.rejector = rejector;
        });
    }
    getPromise() {
        return this.outcome;
    }
    getRequest(server) {
        const url = 'http://' + server + '/cgi-bin/aw_ptz?cmd=%23' + this.command + '&res=1';
        log("URL", url);
        return SimpleHTTP_1.SimpleHTTP.newRequest(url);
    }
    handleResponse(response) {
        this.resolver(response);
    }
    fail(error) {
        this.rejector(error);
    }
}
function toFourHex(num) {
    num = Math.round(num);
    const hexDigits = num.toString(16).toUpperCase();
    const numDigits = hexDigits.length;
    if (numDigits > 4)
        return 'FFFF';
    return '000'.substr(numDigits - 1) + hexDigits;
}
function toTwoDec(num) {
    num = Math.round(Math.min(99, num));
    let digits = num.toString();
    const numDigits = digits.length;
    if (numDigits < 2)
        digits = '0' + digits;
    return digits;
}
