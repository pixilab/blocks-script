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
exports.SyncSourceSwitch = void 0;
const Script_1 = require("../system_lib/Script");
const Metadata_1 = require("../system_lib/Metadata");
const ScriptBase_1 = require("../system_lib/ScriptBase");
class SyncSourceSwitch extends Script_1.Script {
    SyncSourceSwitches;
    constructor(env) {
        super(env);
        this.SyncSourceSwitches = this.namedAggregateProperty("SyncSourceSwitches", Switch);
    }
    reInitialize() {
        console.log("Reinitialize");
        super.reInitialize();
    }
    CreateNewSwitch(name, syncSourcePath) {
        const newSwitch = new Switch(this, syncSourcePath);
        this.SyncSourceSwitches[name] = newSwitch;
    }
}
exports.SyncSourceSwitch = SyncSourceSwitch;
__decorate([
    (0, Metadata_1.callable)("Re-initialize the script, run to reset feed config"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SyncSourceSwitch.prototype, "reInitialize", null);
__decorate([
    (0, Metadata_1.callable)("Configure a new switch"),
    __param(0, (0, Metadata_1.parameter)("Name of this switch")),
    __param(1, (0, Metadata_1.parameter)("Source sync property i.e timeline or spots time property")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SyncSourceSwitch.prototype, "CreateNewSwitch", null);
class Switch extends ScriptBase_1.AggregateElem {
    mSyncSource;
    disabledTimeValue;
    owner;
    propAccessor;
    mEnabled = true;
    constructor(owner, sourceProp) {
        super();
        this.owner = owner;
        this.mSyncSource = new TimeFlow(0, 0);
        this.setupPropAccessor(sourceProp);
    }
    setupPropAccessor(sourceProp) {
        if (this.propAccessor) {
            this.propAccessor.close();
        }
        this.propAccessor = this.owner.getProperty(sourceProp, value => {
            this.disabledTimeValue = value;
            if (this.mEnabled)
                this.syncSource = value;
        });
    }
    get syncSource() {
        return this.mSyncSource;
    }
    set syncSource(data) {
        this.mSyncSource = data;
    }
    get enabled() {
        return this.mEnabled;
    }
    set enabled(value) {
        if (this.mEnabled !== value) {
            this.mEnabled = value;
            if (value) {
                if (this.disabledTimeValue)
                    this.syncSource = this.disabledTimeValue;
            }
            else
                this.syncSource = new TimeFlow(0, 0, undefined, true);
        }
    }
}
__decorate([
    (0, Metadata_1.property)('Time Source, property path to a time (timeFlow) property', true),
    __metadata("design:type", TimeFlow),
    __metadata("design:paramtypes", [TimeFlow])
], Switch.prototype, "syncSource", null);
__decorate([
    (0, Metadata_1.property)('Time passthrough'),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], Switch.prototype, "enabled", null);
