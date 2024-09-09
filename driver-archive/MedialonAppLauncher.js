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
define(["require", "exports", "system_lib/NetworkDriver", "system_lib/Metadata"], function (require, exports, NetworkDriver_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MedialonAppLauncher = void 0;
    var CMD_SHUTDOWN = [0xff, 0x16, 0x01, 0x30, 0x30, 0x30, 0x31, 0x32, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xfe];
    var CMD_RESTART_COMPUTER = [0xff, 0x16, 0x01, 0x30, 0x30, 0x30, 0x31, 0x31, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xfe];
    var CMD_RESTART_WINDOWS = [0xff, 0x16, 0x01, 0x30, 0x30, 0x30, 0x31, 0x30, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xfe];
    var MedialonAppLauncher = exports.MedialonAppLauncher = (function (_super) {
        __extends(MedialonAppLauncher, _super);
        function MedialonAppLauncher(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this._socket = socket;
            socket.enableWakeOnLAN();
            socket.autoConnect(true);
            socket.subscribe("textReceived", function (sender, message) {
                console.info("Data received", message.text);
            });
            socket.subscribe('connect', (function (sender, message) {
                if (_this._shuttingDown)
                    return;
                switch (message.type) {
                    case "Connection":
                        _this.setPowerState(true);
                        break;
                    case "ConnectionFailed":
                        _this.setPowerState(false);
                        break;
                }
            }));
            return _this;
        }
        MedialonAppLauncher.prototype.isOfTypeName = function (typeName) { return typeName === "MedialonAppLauncher" ? this : null; };
        Object.defineProperty(MedialonAppLauncher.prototype, "power", {
            get: function () {
                return this._power;
            },
            set: function (on) {
                var _this = this;
                this._power = on;
                if (on)
                    this.sendWakeOnLAN();
                else {
                    this._shuttingDown = true;
                    this.shutdown().finally(function () {
                        wait(1000).then(function () {
                            _this._shuttingDown = false;
                        });
                    });
                }
            },
            enumerable: false,
            configurable: true
        });
        MedialonAppLauncher.prototype.setPowerState = function (on) {
            if (this._power != on) {
                this._power = on;
                this.changed('power');
            }
        };
        MedialonAppLauncher.prototype.restartWindows = function () {
            return this._socket.sendBytes(CMD_RESTART_WINDOWS);
        };
        MedialonAppLauncher.prototype.restart = function () {
            return this._socket.sendBytes(CMD_RESTART_COMPUTER);
        };
        MedialonAppLauncher.prototype.shutdown = function () {
            return this._socket.sendBytes(CMD_SHUTDOWN);
        };
        MedialonAppLauncher.prototype.sendWakeOnLAN = function () {
            this._socket.wakeOnLAN();
        };
        __decorate([
            Meta.property('Power on/off'),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], MedialonAppLauncher.prototype, "power", null);
        __decorate([
            Meta.callable('Restart Windows'),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", Promise)
        ], MedialonAppLauncher.prototype, "restartWindows", null);
        __decorate([
            Meta.callable('Restart PC'),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", Promise)
        ], MedialonAppLauncher.prototype, "restart", null);
        __decorate([
            Meta.callable('Shutdown PC'),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", Promise)
        ], MedialonAppLauncher.prototype, "shutdown", null);
        __decorate([
            Meta.callable('Send WakeOnLAN'),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], MedialonAppLauncher.prototype, "sendWakeOnLAN", null);
        MedialonAppLauncher = __decorate([
            Meta.driver('NetworkTCP', { port: 4550 }),
            __metadata("design:paramtypes", [Object])
        ], MedialonAppLauncher);
        return MedialonAppLauncher;
    }(NetworkDriver_1.NetworkDriver));
});
