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
exports.SimpleHttpInput = void 0;
const Script_1 = require("../system_lib/Script");
const Metadata_1 = require("../system_lib/Metadata");
class SimpleHttpInput extends Script_1.Script {
    mLastMessage = "";
    resetTimer;
    constructor(env) {
        super(env);
    }
    message(body, trailer) {
        this.lastMessage = trailer;
        this.resetSoon();
    }
    resetSoon() {
        if (this.resetTimer)
            this.resetTimer.cancel();
        this.resetTimer = wait(400);
        this.resetTimer.then(() => {
            this.resetTimer = undefined;
            this.lastMessage = "";
        });
    }
    get lastMessage() {
        return this.mLastMessage;
    }
    set lastMessage(value) {
        this.mLastMessage = value;
    }
}
exports.SimpleHttpInput = SimpleHttpInput;
__decorate([
    (0, Metadata_1.resource)(undefined, 'GET'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SimpleHttpInput.prototype, "message", null);
__decorate([
    (0, Metadata_1.property)("Last message received from client", true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], SimpleHttpInput.prototype, "lastMessage", null);
