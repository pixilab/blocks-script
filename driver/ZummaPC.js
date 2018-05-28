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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ZummaPC = (function (_super) {
        __extends(ZummaPC, _super);
        function ZummaPC(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            socket.enableWakeOnLAN();
            return _this;
        }
        ZummaPC.prototype.tell = function (data) {
            this.socket.sendText(data);
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
        ZummaPC.prototype.powerUp = function () {
            if (!this.powerState) {
                this.powerState = true;
                this.changed('power');
            }
            return this.powerUp2();
        };
        ZummaPC.prototype.shutDown = function () {
            this.powerDown();
        };
        ZummaPC.prototype.powerUp2 = function () {
            var _this = this;
            if (!this.poweringUp) {
                this.socket.wakeOnLAN();
                this.poweringUp = new Promise(function (resolver, rejector) {
                    _this.powerUpResolver = resolver;
                    wait(40000).then(function () {
                        rejector("Timeout");
                        delete _this.poweringUp;
                        delete _this.powerUpResolver;
                    });
                });
            }
            return this.poweringUp;
        };
        ZummaPC.prototype.powerDown = function () {
            this.tell("stop");
        };
        __decorate([
            Meta.property("Power on/off"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], ZummaPC.prototype, "power", null);
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
            __metadata("design:returntype", void 0)
        ], ZummaPC.prototype, "shutDown", null);
        ZummaPC = __decorate([
            Meta.driver('NetworkUDP', { port: 32400 }),
            __metadata("design:paramtypes", [Object])
        ], ZummaPC);
        return ZummaPC;
    }(Driver_1.Driver));
    exports.ZummaPC = ZummaPC;
});
