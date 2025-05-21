var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
define(["require", "exports", "../system_lib/Script", "../system_lib/Metadata", "../system/SimpleHTTP", "../system/SimpleFile"], function (require, exports, Script_1, Metadata_1, SimpleHTTP_1, SimpleFile_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SMS_46elks = void 0;
    var SMS_46elks = exports.SMS_46elks = (function (_super) {
        __extends(SMS_46elks, _super);
        function SMS_46elks(env) {
            var _this = _super.call(this, env) || this;
            _this.mUser = "";
            _this.mPassword = "";
            SimpleFile_1.SimpleFile.readJson('SMS_46elks.json').then(function (config) { return _this.config = config; });
            return _this;
        }
        SMS_46elks.prototype.send = function (msg, toNumber, from) {
            var config = this.config;
            if (config || (this.mUser && this.mPassword)) {
                var user = config ? config.user : this.mUser;
                var password = config ? config.password : this.mPassword;
                if (!user || !password)
                    throw "Missing user or password";
                var auth = Base64.encode(user + ':' + password);
                var srcData = {
                    from: from || "Blocks",
                    to: toNumber,
                    message: msg
                };
                var url = "https://api.46elks.com/a1/sms";
                var data = formDataEnclode(srcData);
                console.log("URL", url, data);
                SimpleHTTP_1.SimpleHTTP.newRequest(url)
                    .header("Authorization", "Basic " + auth)
                    .post(data, "application/x-www-form-urlencoded")
                    .catch(function (err) { return console.error(err); });
            }
            else
                throw "Config file or user and password properties must be set to send";
        };
        Object.defineProperty(SMS_46elks.prototype, "user", {
            get: function () {
                return this.mUser;
            },
            set: function (value) {
                this.mUser = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SMS_46elks.prototype, "password", {
            get: function () {
                return this.mPassword;
            },
            set: function (value) {
                this.mPassword = value;
            },
            enumerable: false,
            configurable: true
        });
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
        return SMS_46elks;
    }(Script_1.Script));
    function formDataEnclode(dict) {
        var result = "";
        var first = true;
        for (var key in dict) {
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
});
