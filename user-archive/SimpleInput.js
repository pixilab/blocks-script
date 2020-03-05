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
define(["require", "exports", "system/SimpleServer", "system_lib/Script", "system_lib/Metadata"], function (require, exports, SimpleServer_1, Script_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var SimpleInput = (function (_super) {
        __extends(SimpleInput, _super);
        function SimpleInput(env) {
            var _this = _super.call(this, env) || this;
            _this.mCommand = '';
            SimpleServer_1.SimpleServer.newTextServer(4004, 5)
                .subscribe('client', function (sender, socket) {
                return socket.connection.subscribe('textReceived', function (sender, message) {
                    return _this.command = message.text;
                });
            });
            return _this;
        }
        Object.defineProperty(SimpleInput.prototype, "command", {
            get: function () {
                return this.mCommand;
            },
            set: function (cmd) {
                var _this = this;
                this.mCommand = cmd;
                if (this.mClearTimer) {
                    this.mClearTimer.cancel();
                    this.mClearTimer = undefined;
                }
                if (cmd) {
                    this.mClearTimer = wait(300);
                    this.mClearTimer.then(function () {
                        _this.mClearTimer = undefined;
                        _this.command = '';
                    });
                }
            },
            enumerable: true,
            configurable: true
        });
        return SimpleInput;
    }(Script_1.Script));
    __decorate([
        Metadata_1.property("The most recent command", true),
        __metadata("design:type", String),
        __metadata("design:paramtypes", [String])
    ], SimpleInput.prototype, "command", null);
    exports.SimpleInput = SimpleInput;
});
