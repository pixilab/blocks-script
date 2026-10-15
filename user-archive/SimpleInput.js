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
exports.SimpleInput = void 0;
const SimpleServer_1 = require("../system/SimpleServer");
const Script_1 = require("../system_lib/Script");
const Metadata_1 = require("../system_lib/Metadata");
class SimpleInput extends Script_1.Script {
    mCommand = '';
    mClearTimer;
    constructor(env) {
        super(env);
        SimpleServer_1.SimpleServer.newTextServer(4004, 5)
            .subscribe('client', (sender, socket) => socket.connection.subscribe('textReceived', (sender, message) => this.command = message.text));
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
}
exports.SimpleInput = SimpleInput;
__decorate([
    (0, Metadata_1.property)("The most recent command", true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], SimpleInput.prototype, "command", null);
