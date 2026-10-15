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
exports.Slack = void 0;
const SimpleHTTP_1 = require("../system/SimpleHTTP");
const SimpleFile_1 = require("../system/SimpleFile");
const Script_1 = require("../system_lib/Script");
const Metadata_1 = require("../system_lib/Metadata");
class Slack extends Script_1.Script {
    static CONFIG_FILE_NAME = "Slack.config.json";
    static SLACK_MSG_URL = "https://hooks.slack.com/services/";
    accessToken = "";
    constructor(env) {
        super(env);
        SimpleFile_1.SimpleFile.read(Slack.CONFIG_FILE_NAME).then(readValue => {
            var settings = JSON.parse(readValue);
            this.accessToken = settings.access_token;
            if (!this.accessToken)
                console.warn("Access token not set", Slack.CONFIG_FILE_NAME);
        }).catch(error => console.error("Can't read file", Slack.CONFIG_FILE_NAME, error));
    }
    sendMessage(message) {
        return this.sendJSON('{"text":"' + message + '"}');
    }
    sendJSON(jsonContent) {
        var request = SimpleHTTP_1.SimpleHTTP.newRequest(Slack.SLACK_MSG_URL + this.accessToken);
        return request.post(jsonContent, 'application/json');
    }
}
exports.Slack = Slack;
__decorate([
    (0, Metadata_1.callable)("Send message to Slack"),
    __param(0, (0, Metadata_1.parameter)("Message content (supports basic formatting e.g. \\n *bold* _italic_)")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Slack.prototype, "sendMessage", null);
