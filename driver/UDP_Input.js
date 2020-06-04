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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.UDP_Input = void 0;
    var UDP_Input = (function (_super) {
        __extends(UDP_Input, _super);
        function UDP_Input(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mCommand = '';
            socket.subscribe('textReceived', function (sender, message) {
                _this.command = message.text;
            });
            return _this;
        }
        UDP_Input.prototype.sendText = function (toSend) {
            this.socket.sendText(toSend);
        };
        Object.defineProperty(UDP_Input.prototype, "command", {
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
            Metadata_1.callable("Send the text to the destination IP address and UDP port"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], UDP_Input.prototype, "sendText", null);
        __decorate([
            Metadata_1.property("The most recent command", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], UDP_Input.prototype, "command", null);
        UDP_Input = __decorate([
            Metadata_1.driver('NetworkUDP', { port: 4444 }),
            __metadata("design:paramtypes", [Object])
        ], UDP_Input);
        return UDP_Input;
    }(Driver_1.Driver));
    exports.UDP_Input = UDP_Input;
});
