var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
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
define(["require", "exports", "system/SimpleHTTP", "system/SimpleFile", "system_lib/Script", "system_lib/Metadata"], function (require, exports, SimpleHTTP_1, SimpleFile_1, Script_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Flock = void 0;
    var Flock = (function (_super) {
        __extends(Flock, _super);
        function Flock(env) {
            var _this = _super.call(this, env) || this;
            _this.accessToken = "";
            SimpleFile_1.SimpleFile.read(Flock.CONFIG_FILE_NAME).then(function (readValue) {
                var settings = JSON.parse(readValue);
                _this.accessToken = settings.access_token;
                if (!_this.accessToken)
                    console.warn("Access token not set", Flock.CONFIG_FILE_NAME);
            }).catch(function (error) {
                return console.error("Can't read file", Flock.CONFIG_FILE_NAME, error);
            });
            return _this;
        }
        Flock.prototype.sendMessage = function (message) {
            return this.sendJSON('{"text":"' + message + '"}');
        };
        Flock.prototype.sendRichMessage = function (richText) {
            return this.sendJSON('{' +
                '  "attachments": [{' +
                '    "views": { "flockml": "<flockml>' + richText + '</flockml>" }' +
                '  }]' +
                '}');
        };
        Flock.prototype.sendJSON = function (jsonContent) {
            var request = SimpleHTTP_1.SimpleHTTP.newRequest(Flock.FLOCK_MSG_URL + this.accessToken);
            return request.post(jsonContent, 'application/json');
        };
        Flock.CONFIG_FILE_NAME = "Flock.config.json";
        Flock.FLOCK_MSG_URL = "https://api.flock.com/hooks/sendMessage/";
        __decorate([
            Metadata_1.callable("Send message to Flock"),
            __param(0, Metadata_1.parameter("Message content")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", Promise)
        ], Flock.prototype, "sendMessage", null);
        __decorate([
            Metadata_1.callable("Send rich text message to Flock"),
            __param(0, Metadata_1.parameter("Rich text version (using FlockML. Supports e.g. <a>, <em>, <i>, <strong>, <b>, <u>, <br>)")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", Promise)
        ], Flock.prototype, "sendRichMessage", null);
        return Flock;
    }(Script_1.Script));
    exports.Flock = Flock;
});
