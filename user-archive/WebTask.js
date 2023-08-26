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
define(["require", "exports", "system_lib/Script", "system/Realm", "system/SimpleFile", "system_lib/Metadata"], function (require, exports, Script_1, Realm_1, SimpleFile_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WebTask = void 0;
    var WebTask = (function (_super) {
        __extends(WebTask, _super);
        function WebTask(env) {
            var _this = _super.call(this, env) || this;
            var configFileName = "WebTask.json";
            SimpleFile_1.SimpleFile.readJson(configFileName).then(function (readConfig) { return _this.config = readConfig; }).catch(function (error) {
                return console.warn("Configuration not found", configFileName, error, "- using defaults.");
            });
            if (!_this.config || !_this.config.realm) {
                console.warn("Missing/invalid", configFileName, "using default configuration");
                _this.config = {
                    realm: "Public",
                    group: "Web"
                };
            }
            return _this;
        }
        WebTask.prototype.start = function (param) {
            var realm = Realm_1.Realm[this.config.realm];
            if (realm) {
                var groupName = this.config.group || param.group;
                var group = realm.group[groupName];
                if (group) {
                    var task = group[param.task];
                    if (task)
                        task.running = true;
                    else
                        throw ("No task named " + param.task);
                }
                else
                    throw ("No group named " + groupName);
            }
            else
                throw ("No realm named " + this.config.realm);
        };
        __decorate([
            (0, Metadata_1.resource)(),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Object]),
            __metadata("design:returntype", void 0)
        ], WebTask.prototype, "start", null);
        return WebTask;
    }(Script_1.Script));
    exports.WebTask = WebTask;
});
