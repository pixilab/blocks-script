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
exports.MailLog = void 0;
const Script_1 = require("../system_lib/Script");
const SimpleMail_1 = require("../system/SimpleMail");
const SimpleProcess_1 = require("../system/SimpleProcess");
const Metadata_1 = require("../system_lib/Metadata");
const SimpleFile_1 = require("../system/SimpleFile");
class MailLog extends Script_1.Script {
    sendLogTo(email) {
        const timeStamp = new Date().toString();
        return SimpleProcess_1.SimpleProcess.start('/usr/bin/zip', [
            '--quiet',
            '--junk-paths',
            SimpleProcess_1.SimpleProcess.blocksRoot + '/temp/latest-log.zip',
            SimpleProcess_1.SimpleProcess.blocksRoot + '/logs/latest.log'
        ]).then(() => SimpleMail_1.SimpleMail.send(email, "Blocks log file", "Here's the PIXILAB Blocks log file from " + timeStamp + "<br>", '/temp/latest-log.zip')).finally(() => SimpleFile_1.SimpleFile.delete('/temp/latest-log.zip')).catch(errorMsg => console.error("Failed emailing log file; " + errorMsg));
    }
}
exports.MailLog = MailLog;
__decorate([
    (0, Metadata_1.callable)("Send the latest.log file to specified email address"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MailLog.prototype, "sendLogTo", null);
