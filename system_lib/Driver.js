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
define(["require", "exports", "system_lib/ScriptBase", "system_lib/Metadata"], function (require, exports, ScriptBase_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Driver = void 0;
    var Driver = (function (_super) {
        __extends(Driver, _super);
        function Driver(scriptFacade) {
            var _this = _super.call(this, scriptFacade) || this;
            if (scriptFacade.isOfTypeName("NetworkTCP")) {
                scriptFacade.subscribe('connect', function (sender, message) {
                    if (message.type === 'Connection')
                        _this.__scriptFacade.firePropChanged('connected');
                });
            }
            return _this;
        }
        Object.defineProperty(Driver.prototype, "connected", {
            get: function () {
                return this.__scriptFacade.connected ? true : false;
            },
            enumerable: false,
            configurable: true
        });
        __decorate([
            Meta.property("Connected to peer"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], Driver.prototype, "connected", null);
        return Driver;
    }(ScriptBase_1.ScriptBase));
    exports.Driver = Driver;
});
