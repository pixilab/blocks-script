var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TCP_Input = void 0;
    var TCP_Input = (function (_super) {
        __extends(TCP_Input, _super);
        function TCP_Input(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mCommand = '';
            socket.subscribe('textReceived', function (sender, message) {
                _this.command = message.text;
            });
            socket.connect();
            return _this;
        }
        TCP_Input.prototype.isOfTypeName = function (typeName) {
            return typeName === "TCP_Input" ? this : null;
        };
        TCP_Input.prototype.sendText = function (toSend) {
            this.socket.sendText(toSend);
        };
        Object.defineProperty(TCP_Input.prototype, "command", {
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
            enumerable: false,
            configurable: true
        });
        __decorate([
            Metadata_1.callable("Send the text to the destination IP address and TCP port"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], TCP_Input.prototype, "sendText", null);
        __decorate([
            Metadata_1.property("The most recent command", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], TCP_Input.prototype, "command", null);
        TCP_Input = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 5555 }),
            __metadata("design:paramtypes", [Object])
        ], TCP_Input);
        return TCP_Input;
    }(Driver_1.Driver));
    exports.TCP_Input = TCP_Input;
});
