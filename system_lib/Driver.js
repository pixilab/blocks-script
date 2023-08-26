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
define(["require", "exports", "system_lib/ScriptBase", "system_lib/Metadata"], function (require, exports, ScriptBase_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Driver = void 0;
    var Driver = (function (_super) {
        __extends(Driver, _super);
        function Driver(scriptFacade) {
            var _this = _super.call(this, scriptFacade) || this;
            if (!scriptFacade.isOfTypeName("NetworkUDP")) {
                _this.__scriptFacade.subscribe('connect', function (sender, message) {
                    if (message.type === 'Connection')
                        _this.changed('connected');
                });
            }
            return _this;
        }
        Object.defineProperty(Driver.prototype, "connected", {
            get: function () {
                return !!this.__scriptFacade.connected;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Driver.prototype, "name", {
            get: function () { return this.__scriptFacade.name; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Driver.prototype, "fullName", {
            get: function () { return this.__scriptFacade.fullName; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Driver.prototype, "driverName", {
            get: function () { return this.__scriptFacade.driverName; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Driver.prototype, "deviceType", {
            get: function () {
                return this.__scriptFacade.deviceType;
            },
            enumerable: false,
            configurable: true
        });
        Driver.prototype.subscribe = function (name, listener) {
            this.__scriptFacade.subscribe(name, listener);
        };
        __decorate([
            Meta.property("Connected to peer"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], Driver.prototype, "connected", null);
        __decorate([
            Meta.property("Leaf name of this object"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], Driver.prototype, "name", null);
        __decorate([
            Meta.property("Full, dot-separated path to this object"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], Driver.prototype, "fullName", null);
        __decorate([
            Meta.property("Name of associated Device Driver"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], Driver.prototype, "driverName", null);
        __decorate([
            Meta.property("Type of low level driver"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], Driver.prototype, "deviceType", null);
        return Driver;
    }(ScriptBase_1.ScriptBase));
    exports.Driver = Driver;
});
