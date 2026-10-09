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
exports.PropGetter = void 0;
const Script_1 = require("../system_lib/Script");
const Realm_1 = require("../system/Realm");
const Spot_1 = require("../system/Spot");
const Metadata_1 = require("../system_lib/Metadata");
class PropGetter extends Script_1.Script {
    constructor(env) {
        super(env);
    }
    readTaskItem(fetchSpec) {
        const realm = Realm_1.Realm[fetchSpec.realmName];
        var result;
        if (fetchSpec.varName)
            result = realm.variable[fetchSpec.varName].value;
        else
            result = realm.group[fetchSpec.groupName][fetchSpec.taskName].running;
        return result;
    }
    readSpotState(fetchSpec) {
        const spotListItem = Spot_1.Spot[fetchSpec.spotPath];
        return spotListItem[fetchSpec.propName];
    }
}
exports.PropGetter = PropGetter;
__decorate([
    (0, Metadata_1.resource)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Object)
], PropGetter.prototype, "readTaskItem", null);
__decorate([
    (0, Metadata_1.resource)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Object)
], PropGetter.prototype, "readSpotState", null);
