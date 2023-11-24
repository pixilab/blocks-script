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
define(["require", "exports", "system_lib/Script", "system_lib/Metadata", "../system/SimpleProcess"], function (require, exports, Script_1, Metadata_1, SimpleProcess_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Reachable = void 0;
    var Reachable = exports.Reachable = (function (_super) {
        __extends(Reachable, _super);
        function Reachable(env) {
            var _this = _super.call(this, env) || this;
            _this.targets = [];
            _this.nextPing = 0;
            return _this;
        }
        Reachable.prototype.addTarget = function (name, address) {
            var firstOne = this.targets.length === 0;
            this.targets.push(new Target(this, name, address));
            if (firstOne)
                this.startNext();
        };
        Reachable.prototype.reset = function () {
            this.reInitialize();
        };
        Reachable.prototype.startNext = function () {
            var _this = this;
            this.targets[this.nextPing].poll().finally(function () {
                wait(1000).then(function () { return _this.startNext(); });
            });
            this.nextPing++;
            if (this.nextPing >= this.targets.length)
                this.nextPing = 0;
        };
        __decorate([
            (0, Metadata_1.callable)("Add a target to ping, to be exposed as a property"),
            __param(0, (0, Metadata_1.parameter)("Name of device to poll and exposed property name")),
            __param(1, (0, Metadata_1.parameter)("IP address or resolvable doman name of device")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String]),
            __metadata("design:returntype", void 0)
        ], Reachable.prototype, "addTarget", null);
        __decorate([
            (0, Metadata_1.callable)("Clear out all targers, allowing you to start anew"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], Reachable.prototype, "reset", null);
        return Reachable;
    }(Script_1.Script));
    var Target = (function () {
        function Target(owner, name, addr) {
            var _this = this;
            this.owner = owner;
            this.addr = addr;
            this.mSuccess = false;
            this.name = name.replace(/\./g, '_');
            owner.property(this.name, { type: "Boolean", readOnly: true, description: "Device was reachable on network" }, function (unused) { return _this.mSuccess; });
        }
        Target.prototype.poll = function () {
            var _this = this;
            var pb = SimpleProcess_1.SimpleProcess.create("ping");
            pb.addArgument("-q");
            pb.addArgument("-c");
            pb.addArgument("1");
            pb.addArgument("-w");
            pb.addArgument("1");
            pb.addArgument(this.addr);
            pb.setTimeout(2000);
            var resultPromise = pb.start().promise;
            resultPromise.then(function (success) { return _this.setSuccess(true); }, function (failure) { return _this.setSuccess(false); });
            return resultPromise;
        };
        Target.prototype.setSuccess = function (isOk) {
            if (this.mSuccess !== isOk) {
                this.mSuccess = isOk;
                this.owner.changed(this.name);
            }
        };
        return Target;
    }());
});
