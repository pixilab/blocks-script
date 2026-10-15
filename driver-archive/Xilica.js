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
exports.Xilica = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
let Xilica = class Xilica extends Driver_1.Driver {
    socket;
    keepAliver;
    outputs;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        this.outputs = [];
        for (var ix = 1; ix <= 4; ++ix)
            this.outputs.push(new Output(this, ix));
        if (socket.enabled) {
            socket.autoConnect();
            this.keepAliver = new KeepAliver(this);
            socket.subscribe('finish', () => this.keepAliver.discard());
            socket.subscribe('textReceived', (sender, message) => this.gotData(message.text));
            socket.subscribe('connect', (sender, message) => {
                if (message.type === 'Connection') {
                    if (!socket.connected)
                        console.error("Connection dropped unexpectedly");
                }
                else
                    console.error(message.type);
            });
        }
    }
    gotData(data) {
        if (data.indexOf('ERROR') === 0)
            console.error(data);
    }
    sendSetCommand(target, value) {
        if (this.socket.connected) {
            var cmd = 'SET ' + target + ' ';
            const parType = typeof value;
            switch (parType) {
                case 'string':
                    cmd += '"' + value + '"';
                    break;
                case 'boolean':
                    cmd += value ? 'TRUE' : 'FALSE';
                    break;
                default:
                    cmd += value;
                    break;
            }
            this.socket.sendText(cmd);
        }
    }
    sendText(cmd) {
        this.socket.sendText(cmd);
    }
    set gain1(gain) {
        this.outputs[0].setGain(gain);
    }
    get gain1() {
        return this.outputs[0].gain;
    }
    set input1(input) {
        this.outputs[0].setInput(input);
    }
    get input1() {
        return this.outputs[0].input;
    }
    set gain2(gain) {
        this.outputs[1].setGain(gain);
    }
    get gain2() {
        return this.outputs[1].gain;
    }
    set input2(input) {
        this.outputs[1].setInput(input);
    }
    get input2() {
        return this.outputs[1].input;
    }
    set gain3(gain) {
        this.outputs[2].setGain(gain);
    }
    get gain3() {
        return this.outputs[2].gain;
    }
    set input3(input) {
        this.outputs[2].setInput(input);
    }
    get input3() {
        return this.outputs[2].input;
    }
    set gain4(gain) {
        this.outputs[3].setGain(gain);
    }
    get gain4() {
        return this.outputs[3].gain;
    }
    set input4(input) {
        this.outputs[3].setInput(input);
    }
    get input4() {
        return this.outputs[3].input;
    }
};
exports.Xilica = Xilica;
__decorate([
    (0, Metadata_1.callable)("Send a single SET command"),
    __param(0, (0, Metadata_1.parameter)("Target function")),
    __param(1, (0, Metadata_1.parameter)("Value")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], Xilica.prototype, "sendSetCommand", null);
__decorate([
    (0, Metadata_1.callable)("Send a command"),
    __param(0, (0, Metadata_1.parameter)("Command to send")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], Xilica.prototype, "sendText", null);
__decorate([
    (0, Metadata_1.property)("Channel 1 gain"),
    (0, Metadata_1.min)(-100),
    (0, Metadata_1.max)(15),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], Xilica.prototype, "gain1", null);
__decorate([
    (0, Metadata_1.property)("Channel 1 input"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(4),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], Xilica.prototype, "input1", null);
__decorate([
    (0, Metadata_1.property)("Channel 2 gain"),
    (0, Metadata_1.min)(-100),
    (0, Metadata_1.max)(15),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], Xilica.prototype, "gain2", null);
__decorate([
    (0, Metadata_1.property)("Channel 2 input"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(4),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], Xilica.prototype, "input2", null);
__decorate([
    (0, Metadata_1.property)("Channel 3 gain"),
    (0, Metadata_1.min)(-100),
    (0, Metadata_1.max)(15),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], Xilica.prototype, "gain3", null);
__decorate([
    (0, Metadata_1.property)("Channel 3 input"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(4),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], Xilica.prototype, "input3", null);
__decorate([
    (0, Metadata_1.property)("Channel 4 gain"),
    (0, Metadata_1.min)(-100),
    (0, Metadata_1.max)(15),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], Xilica.prototype, "gain4", null);
__decorate([
    (0, Metadata_1.property)("Channel 4 input"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(4),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], Xilica.prototype, "input4", null);
exports.Xilica = Xilica = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 10007 }),
    __metadata("design:paramtypes", [Object])
], Xilica);
class Output {
    xilica;
    channel;
    input = 0;
    gain = -100;
    constructor(xilica, channel) {
        this.xilica = xilica;
        this.channel = channel;
        this.setInput(this.input);
        this.setGain(this.gain);
    }
    setInput(input) {
        this.xilica.sendSetCommand('out' + this.channel, input);
        this.input = input;
    }
    setGain(gain) {
        this.xilica.sendSetCommand('gain' + this.channel, gain);
        this.gain = gain;
    }
}
class KeepAliver {
    xilica;
    pending;
    constructor(xilica) {
        this.xilica = xilica;
        this.saySomethingInAWhile();
    }
    discard() {
        if (this.pending) {
            this.pending.cancel();
            this.pending = undefined;
        }
    }
    saySomethingInAWhile() {
        this.pending = wait(9000);
        this.pending.then(() => {
            this.sayNow();
            this.saySomethingInAWhile();
        });
    }
    sayNow() {
        const sock = this.xilica.socket;
        if (sock.connected)
            sock.sendText("GET gain1");
    }
}
