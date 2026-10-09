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
exports.SMS_46elks = void 0;
const Script_1 = require("../system_lib/Script");
const Metadata_1 = require("../system_lib/Metadata");
const SimpleHTTP_1 = require("../system/SimpleHTTP");
const SimpleFile_1 = require("../system/SimpleFile");
class SMS_46elks extends Script_1.Script {
    mUser = "";
    mPassword = "";
    config;
    constructor(env) {
        super(env);
        SimpleFile_1.SimpleFile.readJson('SMS_46elks.json').then(config => this.config = config);
    }
    send(msg, toNumber, from) {
        const config = this.config;
        if (config || (this.mUser && this.mPassword)) {
            const user = config ? config.user : this.mUser;
            const password = config ? config.password : this.mPassword;
            if (!user || !password)
                throw "Missing user or password";
            const auth = Base64.encode(user + ':' + password);
            let srcData = {
                from: from || "Blocks",
                to: toNumber,
                message: msg
            };
            const url = "https://api.46elks.com/a1/sms";
            const data = formDataEnclode(srcData);
            console.log("URL", url, data);
            SimpleHTTP_1.SimpleHTTP.newRequest(url)
                .header("Authorization", "Basic " + auth)
                .post(data, "application/x-www-form-urlencoded")
                .catch(err => console.error(err));
        }
        else
            throw "Config file or user and password properties must be set to send";
    }
    get user() {
        return this.mUser;
    }
    set user(value) {
        this.mUser = value;
    }
    get password() {
        return this.mPassword;
    }
    set password(value) {
        this.mPassword = value;
    }
}
exports.SMS_46elks = SMS_46elks;
__decorate([
    (0, Metadata_1.callable)("Send SMS to phone number"),
    __param(0, (0, Metadata_1.parameter)("Text message to send")),
    __param(1, (0, Metadata_1.parameter)("Phone number to send it to, with leading + and country code")),
    __param(2, (0, Metadata_1.parameter)("Sender name or number", true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], SMS_46elks.prototype, "send", null);
__decorate([
    (0, Metadata_1.property)("User name send with the API request"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], SMS_46elks.prototype, "user", null);
__decorate([
    (0, Metadata_1.property)("Password send with the API request"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], SMS_46elks.prototype, "password", null);
function formDataEnclode(dict) {
    let result = "";
    let first = true;
    for (const key in dict) {
        result += first ? '' : '&';
        result += key + '=';
        result += encodeURIComponent(dict[key]);
        first = false;
    }
    return result;
}
var Base64 = {
    decode: function (str) {
        return new java.lang.String(java.util.Base64.decoder.decode(str));
    },
    encode: function (str) {
        return java.util.Base64.encoder.encodeToString(str.bytes);
    }
};
