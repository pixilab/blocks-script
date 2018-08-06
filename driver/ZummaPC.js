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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ZummaPC = (function (_super) {
        __extends(ZummaPC, _super);
        function ZummaPC(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            socket.enableWakeOnLAN();
            socket.autoConnect(false);
            socket.subscribe('connect', function (sender, message) {
                _this.connectStateChanged();
            });
            return _this;
        }
        Object.defineProperty(ZummaPC.prototype, "connected", {
            get: function () {
                return this.connectedToZumma;
            },
            set: function (online) {
                this.connectedToZumma = online;
            },
            enumerable: true,
            configurable: true
        });
        ZummaPC.prototype.sendText = function (text) {
            return this.socket.sendText(text, null);
        };
        ZummaPC.prototype.tell = function (data) {
            this.socket.sendText(data, null);
        };
        Object.defineProperty(ZummaPC.prototype, "power", {
            get: function () {
                return this.powerState;
            },
            set: function (on) {
                if (this.powerState != on) {
                    this.powerState = on;
                    if (on)
                        this.powerUp2();
                    else
                        this.powerDown();
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ZummaPC.prototype, "online", {
            get: function () {
                return this.socket.connected;
            },
            enumerable: true,
            configurable: true
        });
        ZummaPC.prototype.powerUp = function () {
            if (!this.powerState) {
                this.powerState = true;
                this.changed('power');
            }
            return this.powerUp2();
        };
        ZummaPC.prototype.shutDown = function () {
            if (this.powerState) {
                this.powerState = false;
                this.changed('power');
            }
            return this.powerDown();
        };
        ZummaPC.prototype.powerUp2 = function () {
            var _this = this;
            if (!this.socket.connected &&
                !this.poweringUp) {
                this.socket.wakeOnLAN();
                this.poweringUp = new Promise(function (resolve, reject) {
                    _this.powerUpResolver = resolve;
                    wait(90000).then(function () {
                        reject("Timeout");
                        delete _this.poweringUp;
                        delete _this.powerUpResolver;
                    });
                });
            }
            return this.poweringUp;
        };
        ZummaPC.prototype.powerDown = function () {
            var _this = this;
            if (this.socket.connected &&
                !this.shuttingDown) {
                this.tell("stop");
                this.shuttingDown = new Promise(function (resolve, reject) {
                    _this.shutDownResolver = resolve;
                    wait(35000).then(function () {
                        reject("Timeout");
                        delete _this.shuttingDown;
                        delete _this.shutDownResolver;
                    });
                });
            }
            return this.shuttingDown;
        };
        ZummaPC.prototype.connectStateChanged = function () {
            var _this = this;
            if (this.socket.connected) {
                if (this.powerUpResolver) {
                    this.poweringUp.then(function () {
                        return _this.nowPowered();
                    });
                    this.powerUpResolver(true);
                    console.log("ZummaPC powered up successfully");
                    delete this.powerUpResolver;
                    delete this.poweringUp;
                }
                else
                    this.nowPowered();
            }
            else {
                if (this.shutDownResolver) {
                    this.shutDownResolver(wait(25000));
                    this.shuttingDown.then(function () {
                        _this.nowPowerless();
                    });
                    delete this.shutDownResolver;
                    delete this.shuttingDown;
                }
                else {
                    this.nowPowerless();
                }
            }
            this.connected = this.socket.connected;
        };
        ZummaPC.prototype.nowPowered = function () {
            if (this.powerState === undefined)
                this.powerState = true;
        };
        ZummaPC.prototype.nowPowerless = function () {
            if (this.powerState === undefined)
                this.powerState = false;
            if (this.powerState)
                this.powerUp();
        };
        __decorate([
            Meta.property("Connected to Zumma", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], ZummaPC.prototype, "connected", null);
        __decorate([
            Meta.callable("Send raw command string to device"),
            __param(0, Meta.parameter("What to send")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", Promise)
        ], ZummaPC.prototype, "sendText", null);
        __decorate([
            Meta.property("Power on/off"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], ZummaPC.prototype, "power", null);
        __decorate([
            Meta.property("Is device online?"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], ZummaPC.prototype, "online", null);
        __decorate([
            Meta.callable("Power up using wake-on-LAN"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", Promise)
        ], ZummaPC.prototype, "powerUp", null);
        __decorate([
            Meta.callable("Shut down using Zumma"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", Promise)
        ], ZummaPC.prototype, "shutDown", null);
        ZummaPC = __decorate([
            Meta.driver('NetworkTCP', { port: 32401 }),
            __metadata("design:paramtypes", [Object])
        ], ZummaPC);
        return ZummaPC;
    }(Driver_1.Driver));
    exports.ZummaPC = ZummaPC;
});
