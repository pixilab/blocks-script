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
exports.UDP_Bytes_Input = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
let UDP_Bytes_Input = class UDP_Bytes_Input extends Driver_1.Driver {
    socket;
    mCommand = '';
    mClearTimer;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.subscribe('bytesReceived', (sender, message) => {
            this.command = toHexString(message.rawData);
        });
    }
    get command() {
        return this.mCommand;
    }
    set command(cmd) {
        this.mCommand = cmd;
        if (this.mClearTimer) {
            this.mClearTimer.cancel();
            this.mClearTimer = undefined;
        }
        if (cmd) {
            this.mClearTimer = wait(300);
            this.mClearTimer.then(() => {
                this.mClearTimer = undefined;
                this.command = '';
            });
        }
    }
};
exports.UDP_Bytes_Input = UDP_Bytes_Input;
__decorate([
    (0, Metadata_1.property)("The most recent command", true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], UDP_Bytes_Input.prototype, "command", null);
exports.UDP_Bytes_Input = UDP_Bytes_Input = __decorate([
    (0, Metadata_1.driver)('NetworkUDP', { port: 4445 }),
    __metadata("design:paramtypes", [Object])
], UDP_Bytes_Input);
function toHexString(data) {
    var result = "";
    const len = Math.min(data.length, 20);
    for (var ix = 0; ix < len; ++ix) {
        const byte = data[ix];
        if (byte < 16)
            result += '0';
        result += byte.toString(16);
    }
    return result;
}
