var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
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
    var Pushover = (function (_super) {
        __extends(Pushover, _super);
        function Pushover(env) {
            var _this = _super.call(this, env) || this;
            SimpleFile_1.SimpleFile.read(Pushover.CONFIG_FILE_NAME).then(function (readValue) {
                var settings = JSON.parse(readValue);
                if (!settings.token || !settings.user)
                    console.warn("Invalid settings", Pushover.CONFIG_FILE_NAME);
                _this.settings = settings;
            }).catch(function (error) {
                return console.error("Can't read settings", Pushover.CONFIG_FILE_NAME, error);
            });
            return _this;
        }
        Pushover.prototype.sendMessage = function (message) {
            var settings = this.settings;
            if (!settings)
                throw ("can't send messsage (no settings)");
            settings.message = message;
            var encodedUrl = Pushover.makeFormUrl(Pushover.MSG_URL, settings);
            var request = SimpleHTTP_1.SimpleHTTP.newRequest(encodedUrl);
            return request.post("", 'application/x-www-form-urlencoded');
        };
        Pushover.makeFormUrl = function (baseUrl, params) {
            var result = baseUrl;
            if (params) {
                var count = 0;
                for (var par in params) {
                    result += count++ ? '&' : '?';
                    result += par + '=' + encodeURIComponent(params[par]);
                }
            }
            return result;
        };
        return Pushover;
    }(Script_1.Script));
    Pushover.CONFIG_FILE_NAME = "Pushover.config.json";
    Pushover.MSG_URL = "https://api.pushover.net/1/messages.json";
    __decorate([
        Metadata_1.callable("Send a message"),
        __param(0, Metadata_1.parameter("Message content")),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String]),
        __metadata("design:returntype", Promise)
    ], Pushover.prototype, "sendMessage", null);
    exports.Pushover = Pushover;
});
