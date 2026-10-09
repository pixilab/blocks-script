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
exports.PersistentRealms = void 0;
const Realm_1 = require("../system/Realm");
const Script_1 = require("../system_lib/Script");
const Metadata_1 = require("../system_lib/Metadata");
const SimpleFile_1 = require("../system/SimpleFile");
const BASE_PATH = 'PersistentRealms/';
const BASE_SAVE_PATH = BASE_PATH + 'saves/';
const DEFAULT_SAVE_NAME = 'default';
class PersistentRealms extends Script_1.Script {
    constructor(env) {
        super(env);
    }
    save(saveName, realmsToSave) {
        if (typeof realmsToSave == "string")
            realmsToSave = [realmsToSave];
        let realmsSet = null;
        if (realmsToSave) {
            realmsSet = {};
            for (let realmName of realmsToSave)
                realmsSet[realmName] = true;
        }
        return PersistentRealms.processRealms(saveName || DEFAULT_SAVE_NAME, PersistentRealms.saveRealm, realmsSet);
    }
    load(saveName) {
        return PersistentRealms.processRealms(saveName || DEFAULT_SAVE_NAME, PersistentRealms.loadRealm);
    }
    static async processRealms(dirName, action, desiredSet) {
        const basePath = `${BASE_SAVE_PATH}${dirName}/`;
        for (let realmName in Realm_1.Realm) {
            if (!desiredSet || desiredSet[realmName]) {
                const path = `${basePath}${realmName}`;
                const realm = Realm_1.Realm[realmName];
                await action(path, realm);
            }
        }
    }
    static saveRealm(path, realm) {
        const dict = {};
        for (let varName in realm.variable)
            dict[varName] = realm.variable[varName].value;
        const json = JSON.stringify(dict);
        return SimpleFile_1.SimpleFile.write(path, json);
    }
    static async loadRealm(path, realm) {
        const fileExists = await SimpleFile_1.SimpleFile.exists(path);
        if (fileExists) {
            const json = await SimpleFile_1.SimpleFile.read(path);
            const dict = JSON.parse(json);
            for (let varName in realm.variable) {
                const value = dict[varName];
                if (value !== undefined)
                    realm.variable[varName].value = value;
            }
        }
    }
}
exports.PersistentRealms = PersistentRealms;
__decorate([
    (0, Metadata_1.callable)('save all Realm variables'),
    __param(0, (0, Metadata_1.parameter)(`Directory name to save into (defaults to "${DEFAULT_SAVE_NAME}")`, true)),
    __param(1, (0, Metadata_1.parameter)("Realms to save, as an array of realm names (defualts to all)", true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PersistentRealms.prototype, "save", null);
__decorate([
    (0, Metadata_1.callable)('load all Realm variables saved in specified directory'),
    __param(0, (0, Metadata_1.parameter)(`save name (defaults to "${DEFAULT_SAVE_NAME}")`, true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PersistentRealms.prototype, "load", null);
