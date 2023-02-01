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
define(["require", "exports", "system_lib/Script", "system_lib/Metadata"], function (require, exports, Script_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SimpleHttpInput = void 0;
    var SimpleHttpInput = (function (_super) {
        __extends(SimpleHttpInput, _super);
        function SimpleHttpInput(env) {
            var _this = _super.call(this, env) || this;
            _this.mLastMessage = "";
            return _this;
        }
        SimpleHttpInput.prototype.message = function (body, trailer) {
            this.lastMessage = trailer;
            this.resetSoon();
        };
        SimpleHttpInput.prototype.resetSoon = function () {
            var _this = this;
            if (this.resetTimer)
                this.resetTimer.cancel();
            this.resetTimer = wait(400);
            this.resetTimer.then(function () {
                _this.resetTimer = undefined;
                _this.lastMessage = "";
            });
        };
        Object.defineProperty(SimpleHttpInput.prototype, "lastMessage", {
            get: function () {
                return this.mLastMessage;
            },
            set: function (value) {
                this.mLastMessage = value;
            },
            enumerable: false,
            configurable: true
        });
        __decorate([
            (0, Metadata_1.resource)(undefined, 'GET'),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Object, String]),
            __metadata("design:returntype", void 0)
        ], SimpleHttpInput.prototype, "message", null);
        __decorate([
            (0, Metadata_1.property)("Last message received from client", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], SimpleHttpInput.prototype, "lastMessage", null);
        return SimpleHttpInput;
    }(Script_1.Script));
    exports.SimpleHttpInput = SimpleHttpInput;
});
