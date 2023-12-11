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
define(["require", "exports", "../system_lib/Script", "../system/Network", "../system_lib/Metadata"], function (require, exports, Script_1, Network_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CheckProjectors = void 0;
    var CheckProjectors = exports.CheckProjectors = (function (_super) {
        __extends(CheckProjectors, _super);
        function CheckProjectors(env) {
            var _this = _super.call(this, env) || this;
            _this.attached = {};
            _this.errors = {};
            _this.attachToAll();
            return _this;
        }
        CheckProjectors.prototype.reattachAll = function () {
            this.detachFromAll();
            this.attachToAll();
        };
        CheckProjectors.prototype.attachToAll = function () {
            var _this = this;
            this.forEachProjector(function (projector, name) {
                return _this.attachTo(projector, name);
            });
            wait(6000).then(function () {
                _this.forEachProjector(function (projector, name) {
                    return _this.connStatus(projector.connected, name, projector);
                });
            });
        };
        CheckProjectors.prototype.detachFromAll = function () {
            for (var name_1 in this.attached)
                this.detachFrom(name_1);
        };
        CheckProjectors.prototype.forEachProjector = function (toCall) {
            for (var deviceName in Network_1.Network) {
                var projector = Network_1.Network[deviceName];
                if (projector.isOfTypeName && projector.isOfTypeName('PJLinkPlus'))
                    toCall(projector, deviceName);
            }
        };
        CheckProjectors.prototype.attachTo = function (projector, name) {
            var _this = this;
            var problemProp = this.getProperty('Network.' + name + '.hasProblem', function (problem) { return _this.problemStatus(name, projector, problem); });
            var connProp = this.getProperty('Network.' + name + '.connected', function (isConnected) { return _this.connStatus(isConnected, name, projector); });
            var finishListener = function () { return _this.lost(name); };
            projector.subscribe('finish', finishListener);
            this.attached[name] = {
                projector: projector,
                hasProblemProp: problemProp,
                connProp: connProp,
                finishListener: finishListener
            };
            if (problemProp.available)
                this.problemStatus(name, projector, problemProp.value);
        };
        CheckProjectors.prototype.detachFrom = function (name) {
            var connDescr = this.attached[name];
            if (connDescr) {
                connDescr.connProp.close();
                connDescr.hasProblemProp.close();
                connDescr.projector.unsubscribe('finish', connDescr.finishListener);
                delete this.attached[name];
            }
            else
                console.warn("detachFrom unknown", name);
        };
        CheckProjectors.prototype.lost = function (projName) {
            var _this = this;
            this.detachFrom(projName);
            wait(2000).then(function () {
                var projector = Network_1.Network[projName];
                if (projector && projector.isOfTypeName && projector.isOfTypeName('PJLinkPlus'))
                    _this.attachTo(projector, projName);
                else
                    console.warn("Projector removed", projName);
            });
        };
        CheckProjectors.prototype.problemStatus = function (projName, projector, problem) {
            this.reportError(projName, problem ? projector.errorStatus : undefined);
        };
        CheckProjectors.prototype.connStatus = function (isConnected, projName, projector) {
            if (!isConnected)
                this.reportError(projName, "disconnected");
            else if (this.errors[projName] === "disconnected")
                this.reportError(projName);
        };
        CheckProjectors.prototype.reportError = function (projName, error) {
            var lastErrorState = this.errors[projName];
            if (lastErrorState !== error) {
                this.errors[projName] = error;
                if (error) {
                    console.warn("Projector problem", projName, error);
                }
            }
        };
        __decorate([
            (0, Metadata_1.callable)("Re-attach to all projectors - useful if set of projectors change"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], CheckProjectors.prototype, "reattachAll", null);
        return CheckProjectors;
    }(Script_1.Script));
});
