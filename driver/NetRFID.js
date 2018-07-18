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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var NetRFID = (function (_super) {
        __extends(NetRFID, _super);
        function NetRFID(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            socket.autoConnect();
            socket.subscribe('textReceived', _this.gotText.bind(_this));
            return _this;
        }
        NetRFID.prototype.gotText = function (sender, message) {
            this.scannedValue = message.text;
        };
        NetRFID.prototype.startResetTimeout = function () {
            this.stopResetTimer();
            this.mResetValuePromise = wait(1000);
            this.mResetValuePromise.then(this.clearScannedValue.bind(this));
        };
        NetRFID.prototype.stopResetTimer = function () {
            if (this.mResetValuePromise) {
                this.mResetValuePromise.cancel();
                this.mResetValuePromise = undefined;
            }
        };
        NetRFID.prototype.clearScannedValue = function () {
            this.scannedValue = "";
        };
        Object.defineProperty(NetRFID.prototype, "scannedValue", {
            get: function () {
                return this.mScannedValue;
            },
            set: function (value) {
                this.mScannedValue = value;
                if (value)
                    this.startResetTimeout();
            },
            enumerable: true,
            configurable: true
        });
        __decorate([
            Metadata_1.property("The scanned value"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], NetRFID.prototype, "scannedValue", null);
        NetRFID = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 50000 }),
            __metadata("design:paramtypes", [Object])
        ], NetRFID);
        return NetRFID;
    }(Driver_1.Driver));
    exports.NetRFID = NetRFID;
});
