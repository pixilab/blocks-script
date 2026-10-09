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
exports.Flock = void 0;
const SimpleHTTP_1 = require("../system/SimpleHTTP");
const SimpleFile_1 = require("../system/SimpleFile");
const Script_1 = require("../system_lib/Script");
const Metadata_1 = require("../system_lib/Metadata");
class Flock extends Script_1.Script {
    static CONFIG_FILE_NAME = "Flock.config.json";
    static FLOCK_MSG_URL = "https://api.flock.com/hooks/sendMessage/";
    accessToken = "";
    constructor(env) {
        super(env);
        SimpleFile_1.SimpleFile.read(Flock.CONFIG_FILE_NAME).then(readValue => {
            var settings = JSON.parse(readValue);
            this.accessToken = settings.access_token;
            if (!this.accessToken)
                console.warn("Access token not set", Flock.CONFIG_FILE_NAME);
        }).catch(error => console.error("Can't read file", Flock.CONFIG_FILE_NAME, error));
    }
    sendMessage(message) {
        return this.sendJSON('{"text":"' + message + '"}');
    }
    sendRichMessage(richText) {
        return this.sendJSON('{' +
            '  "attachments": [{' +
            '    "views": { "flockml": "<flockml>' + richText + '</flockml>" }' +
            '  }]' +
            '}');
    }
    sendJSON(jsonContent) {
        var request = SimpleHTTP_1.SimpleHTTP.newRequest(Flock.FLOCK_MSG_URL + this.accessToken);
        return request.post(jsonContent, 'application/json');
    }
}
exports.Flock = Flock;
__decorate([
    (0, Metadata_1.callable)("Send message to Flock"),
    __param(0, (0, Metadata_1.parameter)("Message content")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Flock.prototype, "sendMessage", null);
__decorate([
    (0, Metadata_1.callable)("Send rich text message to Flock"),
    __param(0, (0, Metadata_1.parameter)("Rich text version (using FlockML. Supports e.g. <a>, <em>, <i>, <strong>, <b>, <u>, <br>)")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Flock.prototype, "sendRichMessage", null);
