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
define(["require", "exports", "system_lib/Script", "system/SimpleMail", "system/SimpleProcess", "system_lib/Metadata", "system/SimpleFile"], function (require, exports, Script_1, SimpleMail_1, SimpleProcess_1, Metadata_1, SimpleFile_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MailLog = void 0;
    var MailLog = exports.MailLog = (function (_super) {
        __extends(MailLog, _super);
        function MailLog() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        MailLog.prototype.sendLogTo = function (email) {
            var timeStamp = new Date().toString();
            return SimpleProcess_1.SimpleProcess.start('/usr/bin/zip', [
                '--quiet',
                '--junk-paths',
                SimpleProcess_1.SimpleProcess.blocksRoot + '/temp/latest-log.zip',
                SimpleProcess_1.SimpleProcess.blocksRoot + '/logs/latest.log'
            ]).then(function () {
                return SimpleMail_1.SimpleMail.send(email, "Blocks log file", "Here's the PIXILAB Blocks log file from " + timeStamp + "<br>", '/temp/latest-log.zip');
            }).finally(function () {
                return SimpleFile_1.SimpleFile.delete('/temp/latest-log.zip');
            }).catch(function (errorMsg) {
                return console.error("Failed emailing log file; " + errorMsg);
            });
        };
        __decorate([
            (0, Metadata_1.callable)("Send the latest.log file to specified email address"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], MailLog.prototype, "sendLogTo", null);
        return MailLog;
    }(Script_1.Script));
});
