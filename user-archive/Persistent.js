"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Persistent = void 0;
const Script_1 = require("../system_lib/Script");
const SimpleFile_1 = require("../system/SimpleFile");
class Persistent extends Script_1.Script {
    data;
    mPersistor;
    static kFileName = "Persistent.json";
    constructor(env) {
        super(env);
        SimpleFile_1.SimpleFile.read(Persistent.kFileName).then(data => {
            try {
                this.data = JSON.parse(data);
                this.publishProperties();
            }
            catch (parseError) {
                console.error("Failed parsing JSON data from file", Persistent.kFileName, parseError);
            }
        }).catch(error => {
            console.error("Failed reading file; using default sample data", Persistent.kFileName, error);
            this.data = {
                "aNumber": 12,
                "aString": "Billy",
                "aBoolean": true
            };
            this.publishProperties();
        });
    }
    publishProperties() {
        for (let key in this.data) {
            const propData = this.data[key];
            let typeName = typeof propData;
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
                this.mPersistor = undefined;
                const jsonData = JSON.stringify(this.data, null, 2);
                SimpleFile_1.SimpleFile.write(Persistent.kFileName, jsonData);
            });
        }
    }
}
exports.Persistent = Persistent;
