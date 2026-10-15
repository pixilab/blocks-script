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
exports.MailTester = void 0;
const Script_1 = require("../system_lib/Script");
const SimpleMail_1 = require("../system/SimpleMail");
const Metadata_1 = require("../system_lib/Metadata");
class MailTester extends Script_1.Script {
    mailTo(emailAddress, subject, body) {
        const sendResult = SimpleMail_1.SimpleMail.send(emailAddress, subject || "From Blocks MailTester", body || ("Sent to verify working email from Blocks on " + new Date().toString()));
        sendResult.catch(errorMsg => console.error("Failed sending email - check your configuration file; " + errorMsg));
        return sendResult;
    }
}
exports.MailTester = MailTester;
__decorate([
    (0, Metadata_1.callable)("Send an email to the specified address"),
    __param(0, (0, Metadata_1.parameter)("Where to send the email")),
    __param(1, (0, Metadata_1.parameter)("Subject field of the email", true)),
    __param(2, (0, Metadata_1.parameter)("Text content of the email", true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], MailTester.prototype, "mailTo", null);
