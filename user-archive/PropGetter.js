var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
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
define(["require", "exports", "system_lib/Script", "system/Realm", "system/Spot", "system_lib/Metadata"], function (require, exports, Script_1, Realm_1, Spot_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PropGetter = void 0;
    var PropGetter = (function (_super) {
        __extends(PropGetter, _super);
        function PropGetter(env) {
            return _super.call(this, env) || this;
        }
        PropGetter.prototype.readTaskItem = function (fetchSpec) {
            var realm = Realm_1.Realm[fetchSpec.realmName];
            var result;
            if (fetchSpec.varName)
                result = realm.variable[fetchSpec.varName].value;
            else
                result = realm.group[fetchSpec.groupName][fetchSpec.taskName].running;
            return result;
        };
        PropGetter.prototype.readSpotState = function (fetchSpec) {
            var spotListItem = Spot_1.Spot[fetchSpec.spotPath];
            return spotListItem[fetchSpec.propName];
        };
        __decorate([
            Metadata_1.resource(),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Object]),
            __metadata("design:returntype", Object)
        ], PropGetter.prototype, "readTaskItem", null);
        __decorate([
            Metadata_1.resource(),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Object]),
            __metadata("design:returntype", Object)
        ], PropGetter.prototype, "readSpotState", null);
        return PropGetter;
    }(Script_1.Script));
    exports.PropGetter = PropGetter;
});
