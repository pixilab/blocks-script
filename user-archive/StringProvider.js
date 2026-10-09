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
exports.StringProvider = void 0;
const Script_1 = require("../system_lib/Script");
const SimpleFile_1 = require("../system/SimpleFile");
const Metadata_1 = require("../system_lib/Metadata");
class StringProvider extends Script_1.Script {
    data;
    mPersistor;
    static kFileName = "StringProvider.json";
    constructor(env) {
        super(env);
        SimpleFile_1.SimpleFile.read(StringProvider.kFileName).then(data => {
            try {
                this.data = JSON.parse(data);
                this.publishProperties();
            }
            catch (parseError) {
                console.error("Failed parsing JSON data from file", StringProvider.kFileName, parseError);
            }
        }).catch(error => {
            console.error("Failed reading file; use initial sample data", StringProvider.kFileName, error);
            this.data = {
                "alpha": "A",
                "beta": "B",
                "numeric": 42,
                "bool": true
            };
            this.publishProperties();
        });
    }
    fetch(fetchSpec) {
        return this.data[fetchSpec.name];
    }
    publishProperties() {
        for (var key in this.data) {
            const propData = this.data[key];
            var typeName = typeof propData;
            if (typeName === 'boolean' ||
                typeName === 'number' ||
                typeName === 'string')
                this.makeProperty(key, typeName);
            else
                console.error("Invalid type of ", key, typeName);
        }
    }
    makeProperty(name, typeName) {
        typeName = typeName.charAt(0).toUpperCase() + typeName.substr(1);
        this.property(name, { type: typeName }, value => {
            if (value !== undefined && value !== this.data[name]) {
                this.data[name] = value;
                this.persistVars();
            }
            return this.data[name];
        });
    }
    persistVars() {
        if (!this.mPersistor) {
            this.mPersistor = wait(200);
            this.mPersistor.then(() => {
                delete this.mPersistor;
                const jsonData = JSON.stringify(this.data, null, 2);
                SimpleFile_1.SimpleFile.write(StringProvider.kFileName, jsonData);
            });
        }
    }
}
exports.StringProvider = StringProvider;
__decorate([
    (0, Metadata_1.resource)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", String)
], StringProvider.prototype, "fetch", null);
