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
exports.ClassyScript = void 0;
const Script_1 = require("../system_lib/Script");
const Metadata_1 = require("../system_lib/Metadata");
class ClassyScript extends Script_1.Script {
    mConnected = false;
    mDynPropValue = false;
    mLevel = 0;
    constructor(env) {
        super(env);
        console.log("ClassyScript instantiated");
        this.mConnected = false;
        this.property("dynProp1", { type: Boolean }, (sv) => {
            if (sv !== undefined) {
                if (this.mDynPropValue !== sv) {
                    this.mDynPropValue = sv;
                    console.log("dynProp1", sv);
                }
            }
            return this.mDynPropValue;
        });
    }
    set connected(online) {
        this.mConnected = online;
        console.info("Connection state", online, this.internalFunction(40, 2));
        wait(2000).then(() => {
            this.mConnected = false;
            console.log("Connected OFF after delay");
            this.changed('connected');
        });
    }
    get connected() {
        return this.mConnected;
    }
    set level(value) {
        this.mLevel = value;
        console.info("Property level changed to", value);
    }
    get level() {
        return this.mLevel;
    }
    doSomething(aString, aNumber, aBoolean) {
        const result = aString + ' ' + aNumber + ' ' + aBoolean;
        console.info("doSomething", result);
        return result;
    }
    internalFunction(a, b) {
        return a + b;
    }
}
exports.ClassyScript = ClassyScript;
__decorate([
    (0, Metadata_1.property)("Useful textual description"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], ClassyScript.prototype, "connected", null);
__decorate([
    (0, Metadata_1.property)("A numeric value"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(25),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], ClassyScript.prototype, "level", null);
__decorate([
    (0, Metadata_1.callable)("Something to help the user"),
    __param(0, (0, Metadata_1.parameter)("Textual description shown in UI")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Boolean]),
    __metadata("design:returntype", String)
], ClassyScript.prototype, "doSomething", null);
