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
define(["require", "exports", "../system_lib/Metadata", "../system_lib/Driver"], function (require, exports, Metadata_1, Driver_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.VaddioVideoBridge = void 0;
    var VaddioVideoBridge = (function (_super) {
        __extends(VaddioVideoBridge, _super);
        function VaddioVideoBridge(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mInput = 1;
            socket.autoConnect();
            var rawOpts = socket.options;
            if (rawOpts) {
                try {
                    var opts = JSON.parse(rawOpts);
                    if (opts.name && opts.password) {
                        _this.options = opts;
                        console.log("Options set");
                        socket.subscribe('textReceived', function (sender, msg) {
                            _this.dataFromDevice(msg.text);
                        });
                    }
                    else
                        console.error("Invalid driver options (must have name and password)");
                }
                catch (error) {
                    console.error("Bad driver options format", error);
                }
            }
            else
                console.warn("No options specified");
            return _this;
        }
        VaddioVideoBridge_1 = VaddioVideoBridge;
        Object.defineProperty(VaddioVideoBridge.prototype, "input", {
            get: function () {
                return this.mInput;
            },
            set: function (value) {
                this.mInput = value;
                this.sendInputSelect();
            },
            enumerable: false,
            configurable: true
        });
        VaddioVideoBridge.prototype.sendInputSelect = function () {
            if (this.socket.connected)
                this.socket.sendText("video program source set input" + this.mInput);
        };
        VaddioVideoBridge.prototype.dataFromDevice = function (msg) {
            var _this = this;
            if (msg.match(VaddioVideoBridge_1.userNameReq)) {
                wait(500).then(function () {
                    _this.socket.sendText(_this.options.name);
                    return wait(500);
                }).then(function () {
                    _this.socket.sendText(_this.options.password);
                    console.log("Provided login name and password");
                });
            }
            else if (msg.match(VaddioVideoBridge_1.loginAccepted)) {
                console.log("Login successful");
                this.init();
            }
        };
        VaddioVideoBridge.prototype.init = function () {
            this.sendInputSelect();
        };
        var VaddioVideoBridge_1;
        VaddioVideoBridge.userNameReq = /.+vaddio-av-bridge-2x1[0-9,A-F-]+/;
        VaddioVideoBridge.loginAccepted = /.+Vaddio Interactive Shell.+/;
        __decorate([
            (0, Metadata_1.property)("Selected input number"),
            (0, Metadata_1.min)(1),
            (0, Metadata_1.max)(2),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], VaddioVideoBridge.prototype, "input", null);
        VaddioVideoBridge = VaddioVideoBridge_1 = __decorate([
            (0, Metadata_1.driver)('NetworkTCP', { port: 23 }),
            __metadata("design:paramtypes", [Object])
        ], VaddioVideoBridge);
        return VaddioVideoBridge;
    }(Driver_1.Driver));
    exports.VaddioVideoBridge = VaddioVideoBridge;
});
