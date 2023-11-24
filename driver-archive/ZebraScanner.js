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
define(["require", "exports", "../system_lib/Driver", "../system_lib/Metadata", "../system_lib/Metadata"], function (require, exports, Driver_1, Meta, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ZebraScanner = void 0;
    var ZebraScanner = exports.ZebraScanner = (function (_super) {
        __extends(ZebraScanner, _super);
        function ZebraScanner(socket) {
            var _this = _super.call(this, socket) || this;
            _this.mCode = '';
            socket.setMaxLineLength(1024);
            socket.autoConnect();
            socket.subscribe('textReceived', function (sender, msg) {
                return _this.scannedCode = msg.text;
            });
            return _this;
        }
        Object.defineProperty(ZebraScanner.prototype, "scannedCode", {
            get: function () {
                return this.mCode;
            },
            set: function (cmd) {
                var _this = this;
                this.mCode = cmd;
                if (this.mClearTimer) {
                    this.mClearTimer.cancel();
                    this.mClearTimer = undefined;
                }
                if (cmd) {
                    this.mClearTimer = wait(500);
                    this.mClearTimer.then(function () {
                        _this.mClearTimer = undefined;
                        _this.scannedCode = '';
                    });
                }
            },
            enumerable: false,
            configurable: true
        });
        __decorate([
            (0, Metadata_1.property)("The most recent code scanned", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], ZebraScanner.prototype, "scannedCode", null);
        ZebraScanner = __decorate([
            Meta.driver('NetworkTCP', { port: 4001 }),
            __metadata("design:paramtypes", [Object])
        ], ZebraScanner);
        return ZebraScanner;
    }(Driver_1.Driver));
});
