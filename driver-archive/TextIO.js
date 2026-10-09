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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextIO = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
let TextIO = class TextIO extends Driver_1.Driver {
    connection;
    mRecievedText = '';
    mAutoClear = true;
    mAlwaysFireChange = false;
    mClearTimer;
    constructor(connection) {
        super(connection);
        this.connection = connection;
        connection.autoConnect();
        connection.subscribe('textReceived', (sender, msg) => {
            this.recievedText = msg.text;
            log("Received: " + msg.text);
        });
    }
    sendText(rawData, termination) {
        if (termination === undefined)
            this.connection.sendText(rawData);
        else
            this.connection.sendText(rawData, termination);
        log("Sent: " + rawData);
    }
    get recievedText() {
        return this.mRecievedText;
    }
    set recievedText(msg) {
        const oldData = this.mRecievedText;
        this.mRecievedText = msg;
        if (this.mAlwaysFireChange && oldData === msg)
            this.changed('recievedText');
        if (this.mClearTimer) {
            this.mClearTimer.cancel();
            this.mClearTimer = undefined;
        }
        if (msg && this.mAutoClear) {
            this.mClearTimer = wait(300);
            this.mClearTimer.then(() => {
                this.mClearTimer = undefined;
                if (this.mAutoClear)
                    this.recievedText = '';
            });
        }
    }
    get autoClear() {
        return this.mAutoClear;
    }
    set autoClear(cmd) {
        this.mAutoClear = cmd;
    }
    get alwaysFireChange() {
        return this.mAlwaysFireChange;
    }
    set alwaysFireChange(value) {
        this.mAlwaysFireChange = value;
    }
};
exports.TextIO = TextIO;
__decorate([
    (0, Metadata_1.callable)("Sends rawData to the device"),
    __param(1, (0, Metadata_1.parameter)('Line termination. Default is a carriage return. Pass null for none.', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TextIO.prototype, "sendText", null);
__decorate([
    (0, Metadata_1.property)("The most recently received text message"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], TextIO.prototype, "recievedText", null);
__decorate([
    (0, Metadata_1.property)("Clear recievedText automatically after 300 mS"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], TextIO.prototype, "autoClear", null);
__decorate([
    (0, Metadata_1.property)("Fire change on data received even if recievedText didn't change"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], TextIO.prototype, "alwaysFireChange", null);
exports.TextIO = TextIO = __decorate([
    (0, Metadata_1.driver)('NetworkTCP'),
    (0, Metadata_1.driver)('SerialPort'),
    __metadata("design:paramtypes", [Object])
], TextIO);
const DEBUG = false;
function log(...messages) {
    if (DEBUG)
        console.info(messages);
}
