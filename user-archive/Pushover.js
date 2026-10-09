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
exports.Pushover = void 0;
const SimpleHTTP_1 = require("../system/SimpleHTTP");
const SimpleFile_1 = require("../system/SimpleFile");
const Script_1 = require("../system_lib/Script");
const Metadata_1 = require("../system_lib/Metadata");
class Pushover extends Script_1.Script {
    static CONFIG_FILE_NAME = "Pushover.config.json";
    static MSG_URL = "https://api.pushover.net/1/messages.json";
    settings;
    constructor(env) {
        super(env);
        SimpleFile_1.SimpleFile.read(Pushover.CONFIG_FILE_NAME).then(readValue => {
            const settings = JSON.parse(readValue);
            if (!settings.token || !settings.user)
                console.warn("Invalid settings", Pushover.CONFIG_FILE_NAME);
            this.settings = settings;
        }).catch(error => console.error("Can't read settings", Pushover.CONFIG_FILE_NAME, error));
    }
    sendMessage(message) {
        let settings = this.settings;
        if (!settings)
            throw ("can't send messsage (no settings)");
        settings.message = message;
        const encodedUrl = Pushover.makeFormUrl(Pushover.MSG_URL, settings);
        const request = SimpleHTTP_1.SimpleHTTP.newRequest(encodedUrl);
        return request.post("", 'application/x-www-form-urlencoded');
    }
    static makeFormUrl(baseUrl, params) {
        let result = baseUrl;
        if (params) {
            let count = 0;
            for (const par in params) {
                result += count++ ? '&' : '?';
                result += par + '=' + encodeURIComponent(params[par]);
            }
        }
        return result;
    }
}
exports.Pushover = Pushover;
__decorate([
    (0, Metadata_1.callable)("Send a message"),
    __param(0, (0, Metadata_1.parameter)("Message content")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Pushover.prototype, "sendMessage", null);
