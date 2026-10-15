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
exports.WebTask = void 0;
const Script_1 = require("../system_lib/Script");
const Realm_1 = require("../system/Realm");
const SimpleFile_1 = require("../system/SimpleFile");
const Metadata_1 = require("../system_lib/Metadata");
class WebTask extends Script_1.Script {
    config;
    constructor(env) {
        super(env);
        const configFileName = "WebTask.json";
        SimpleFile_1.SimpleFile.readJson(configFileName).then(readConfig => this.config = readConfig).catch(error => console.warn("Configuration not found", configFileName, error, "- using defaults."));
        if (!this.config || !this.config.realm) {
            console.warn("Missing/invalid", configFileName, "using default configuration");
            this.config = {
                realm: "Public",
                group: "Web"
            };
        }
    }
    start(param) {
        const realm = Realm_1.Realm[this.config.realm];
        if (realm) {
            const groupName = this.config.group || param.group;
            const group = realm.group[groupName];
            if (group) {
                const task = group[param.task];
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
    }
}
exports.WebTask = WebTask;
__decorate([
    (0, Metadata_1.resource)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WebTask.prototype, "start", null);
