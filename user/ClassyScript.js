/*
 * Created 2018 by Mike Fahl.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
define(["require", "exports", "system_lib/Script", "system_lib/Metadata"], function (require, exports, Script_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ClassyScript = (function (_super) {
        __extends(ClassyScript, _super);
        function ClassyScript(env) {
            var _this = _super.call(this, env) || this;
            console.log("ClassyScript instantiated");
            _this.mConnected = false;
            /*	Example of how to add a property programmatically. Useful for
                properties that may not be known until runtime.
             */
            _this.property("dynProp1", { type: Boolean }, function (sv) {
                if (sv !== undefined) {
                    if (_this.mDynPropValue !== sv) {
                        _this.mDynPropValue = sv;
                        console.log("dynProp1", sv);
                    }
                }
                return _this.mDynPropValue;
            });
            return _this;
        }
        Object.defineProperty(ClassyScript.prototype, "connected", {
            get: function () {
                return this.mConnected;
            },
            /**
             * A fake "connected" property, just logging the connection state.
             */
            set: function (online) {
                var _this = this;
                this.mConnected = online;
                console.info("Connection state", online, this.internalFunction(40, 2));
                wait(2000).then(function () {
                    _this.mConnected = false;
                    console.log("Connected OFF after delay");
                    /*	Notify others if state change internally. This is NOT required
                        when changed through the setter, as using the setter automatically
                        notifies others of changes. But in some cases, it may be desirable
                        to maintain and update state *without* going through the setter,
                        and then you can use the explicit method.
                     */
                    _this.changed('connected');
                });
            },
            enumerable: true,
            configurable: true
        });
        ClassyScript.prototype.doSomething = function (aString, aNumber, aBoolean) {
            var result = aString + ' ' + aNumber + ' ' + aBoolean;
            console.info("doSomething", result);
            return result;
        };
        ClassyScript.prototype.internalFunction = function (a, b) {
            return a + b;
        };
        return ClassyScript;
    }(Script_1.Script));
    __decorate([
        Metadata_1.property("Useful textual description"),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], ClassyScript.prototype, "connected", null);
    __decorate([
        Metadata_1.callable("Something to help the user"),
        __param(0, Metadata_1.parameter("Textual description shown in UI")),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Number, Boolean]),
        __metadata("design:returntype", String)
    ], ClassyScript.prototype, "doSomething", null);
    exports.ClassyScript = ClassyScript;
});
