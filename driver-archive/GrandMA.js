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
exports.GrandMA = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
let GrandMA = class GrandMA extends Driver_1.Driver {
    socket;
    username = 'blocks';
    password = '';
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.subscribe('connect', (sender, message) => {
            if (message.type === 'Connection')
                this.justConnected();
        });
        socket.subscribe('textReceived', (sender, msg) => this.textReceived(msg.text));
        socket.subscribe('finish', (sender) => this.discard());
        socket.autoConnect();
    }
    isOfTypeName(typeName) {
        return typeName === "GrandMA" ? this : null;
    }
    justConnected() {
        console.log('just connected');
        this.cmdLogin(this.username, this.password);
    }
    textReceived(message) {
    }
    cmdLogin(user, pw) {
        this.socket.sendText('Login "' + user + '" "' + pw + '"');
    }
    startMacro(macroID) {
        this.socket.sendText('Go Macro ' + macroID);
    }
    discard() {
    }
};
exports.GrandMA = GrandMA;
__decorate([
    (0, Metadata_1.callable)('(Go Macro <id>)'),
    __param(0, (0, Metadata_1.parameter)('ID of macro to start')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], GrandMA.prototype, "startMacro", null);
exports.GrandMA = GrandMA = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 30000 }),
    __metadata("design:paramtypes", [Object])
], GrandMA);
