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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
define(["require", "exports", "system_lib/Script", "system_lib/Metadata", "system_lib/ScriptBase"], function (require, exports, Script_1, Metadata_1, ScriptBase_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SyncSourceSwitch = void 0;
    var SyncSourceSwitch = (function (_super) {
        __extends(SyncSourceSwitch, _super);
        function SyncSourceSwitch(env) {
            var _this = _super.call(this, env) || this;
            _this.SyncSourceSwitches = _this.namedAggregateProperty("SyncSourceSwitches", Switch);
            return _this;
        }
        SyncSourceSwitch.prototype.reInitialize = function () {
            console.log("Reinitialize");
            _super.prototype.reInitialize.call(this);
        };
        SyncSourceSwitch.prototype.CreateNewSwitch = function (name, syncSourcePath) {
            var newSwitch = new Switch(this, syncSourcePath);
            this.SyncSourceSwitches[name] = newSwitch;
        };
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
        return SyncSourceSwitch;
    }(Script_1.Script));
    exports.SyncSourceSwitch = SyncSourceSwitch;
    var Switch = (function (_super) {
        __extends(Switch, _super);
        function Switch(owner, sourceProp) {
            var _this = _super.call(this) || this;
            _this.mEnabled = true;
            _this.owner = owner;
            _this.mSyncSource = new TimeFlow(0, 0);
            _this.setupPropAccessor(sourceProp);
            return _this;
        }
        Switch.prototype.setupPropAccessor = function (sourceProp) {
            var _this = this;
            if (this.propAccessor) {
                this.propAccessor.close();
            }
            this.propAccessor = this.owner.getProperty(sourceProp, function (value) {
                _this.disabledTimeValue = value;
                if (_this.mEnabled)
                    _this.syncSource = value;
            });
        };
        Object.defineProperty(Switch.prototype, "syncSource", {
            get: function () {
                return this.mSyncSource;
            },
            set: function (data) {
                this.mSyncSource = data;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Switch.prototype, "enabled", {
            get: function () {
                return this.mEnabled;
            },
            set: function (value) {
                if (this.mEnabled !== value) {
                    this.mEnabled = value;
                    if (value) {
                        if (this.disabledTimeValue)
                            this.syncSource = this.disabledTimeValue;
                    }
                    else
                        this.syncSource = new TimeFlow(0, 0, undefined, true);
                }
            },
            enumerable: false,
            configurable: true
        });
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
        return Switch;
    }(ScriptBase_1.AggregateElem));
});
