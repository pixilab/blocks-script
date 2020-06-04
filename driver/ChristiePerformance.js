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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ChristiePerformance = void 0;
    var ChristiePerformance = (function (_super) {
        __extends(ChristiePerformance, _super);
        function ChristiePerformance(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            socket.enableWakeOnLAN();
            socket.autoConnect(true);
            socket.subscribe('connect', function (sender, message) {
                _this.connectStateChanged();
            });
            socket.subscribe('bytesReceived', function (sender, msg) {
                return _this.bytesReceived(msg.rawData);
            });
            return _this;
        }
        ChristiePerformance_1 = ChristiePerformance;
        ChristiePerformance.prototype.isOfTypeName = function (typeName) {
            return typeName === "ChristiePerformance" ? this : null;
        };
        ChristiePerformance.prototype.connectStateChanged = function () {
            var _this = this;
            if (this.socket.connected) {
                if (this.powerUpResolver) {
                    this.powerUpResolver(wait(15000));
                    this.poweringUp.then(function () {
                        return _this.nowPowered();
                    });
                    delete this.powerUpResolver;
                    delete this.poweringUp;
                }
                else
                    this.nowPowered();
            }
        };
        ChristiePerformance.prototype.nowPowered = function () {
            if (this.powerState === undefined)
                this.powerState = true;
            if (!this.powerState)
                this.powerDown();
            else {
                if (this.inputNum !== undefined)
                    this.input = this.inputNum;
                else {
                    var cmd = this.makeCmd(0xAD);
                    this.appendChecksum(cmd);
                    this.socket.sendBytes(cmd);
                }
            }
        };
        ChristiePerformance.prototype.bytesReceived = function (data) {
            var sd = "";
            for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
                var n = data_1[_i];
                sd += n.toString() + ' ';
            }
        };
        Object.defineProperty(ChristiePerformance.prototype, "power", {
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
            enumerable: false,
            configurable: true
        });
        ChristiePerformance.prototype.powerUp = function () {
            if (!this.powerState) {
                this.powerState = true;
                this.changed('power');
            }
            return this.powerUp2();
        };
        ChristiePerformance.prototype.powerUp2 = function () {
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
        ChristiePerformance.prototype.powerDown = function () {
            var cmd = this.makeCmd(0x18);
            cmd.push(1);
            this.appendChecksum(cmd);
            this.socket.sendBytes(cmd);
        };
        Object.defineProperty(ChristiePerformance.prototype, "input", {
            get: function () {
                return this.inputNum;
            },
            set: function (value) {
                this.inputNum = value;
                var cmd = this.makeCmd(0xAC);
                cmd.push(value);
                cmd.push(1);
                this.appendChecksum(cmd);
                this.socket.sendBytes(cmd);
            },
            enumerable: false,
            configurable: true
        });
        ChristiePerformance.prototype.makeCmd = function (cmd) {
            var cmdBuf = [];
            cmdBuf.push(0xa6, 1, 0, 0, 0, 0, 1, cmd);
            return cmdBuf;
        };
        ChristiePerformance.prototype.appendChecksum = function (cmdBuf) {
            var checksum = 0;
            cmdBuf[ChristiePerformance_1.kLengthIx] = cmdBuf.length + 1
                - ChristiePerformance_1.kLengthIx;
            for (var _i = 0, cmdBuf_1 = cmdBuf; _i < cmdBuf_1.length; _i++) {
                var byte = cmdBuf_1[_i];
                checksum ^= byte;
            }
            cmdBuf.push(checksum);
        };
        var ChristiePerformance_1;
        ChristiePerformance.kMinInput = 1;
        ChristiePerformance.kMaxInput = 16;
        ChristiePerformance.kLengthIx = 5;
        __decorate([
            Meta.property("Power on/off"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], ChristiePerformance.prototype, "power", null);
        __decorate([
            Meta.callable("Power up using wake-on-LAN"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", Promise)
        ], ChristiePerformance.prototype, "powerUp", null);
        __decorate([
            Meta.property("Desired input source number"),
            Meta.min(ChristiePerformance_1.kMinInput),
            Meta.max(ChristiePerformance_1.kMaxInput),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], ChristiePerformance.prototype, "input", null);
        ChristiePerformance = ChristiePerformance_1 = __decorate([
            Meta.driver('NetworkTCP', { port: 5000 }),
            __metadata("design:paramtypes", [Object])
        ], ChristiePerformance);
        return ChristiePerformance;
    }(Driver_1.Driver));
    exports.ChristiePerformance = ChristiePerformance;
});
