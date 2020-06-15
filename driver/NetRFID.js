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
    exports.NetRFID = void 0;
    var NetRFID = (function (_super) {
        __extends(NetRFID, _super);
        function NetRFID(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            socket.autoConnect();
            socket.subscribe('textReceived', function (sender, message) {
                return _this.scanned = message.text;
            });
            return _this;
        }
        Object.defineProperty(NetRFID.prototype, "scanned", {
            get: function () {
                return this.mScanned;
            },
            set: function (value) {
                this.mScanned = value;
                if (value)
                    this.startResetTimeout();
            },
            enumerable: false,
            configurable: true
        });
        NetRFID.prototype.startResetTimeout = function () {
            var _this = this;
            this.stopResetTimer();
            this.mResetValuePromise = wait(1000);
            this.mResetValuePromise.then(function () { return _this.scanned = ""; });
        };
        NetRFID.prototype.stopResetTimer = function () {
            if (this.mResetValuePromise) {
                this.mResetValuePromise.cancel();
                this.mResetValuePromise = undefined;
            }
        };
        __decorate([
            Metadata_1.property("Last scanned value, or empty string", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], NetRFID.prototype, "scanned", null);
        NetRFID = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 50000 }),
            __metadata("design:paramtypes", [Object])
        ], NetRFID);
        return NetRFID;
    }(Driver_1.Driver));
    exports.NetRFID = NetRFID;
});
