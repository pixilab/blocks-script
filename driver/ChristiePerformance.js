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
    /*
     Manage a Christie PERFORMANCE display, accessed through a provided
     NetworkTCP connection.
     */
    var ChristiePerformance = ChristiePerformance_1 = (function (_super) {
        __extends(ChristiePerformance, _super);
        function ChristiePerformance(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            socket.enableWakeOnLAN();
            socket.autoConnect(true);
            socket.subscribe('connect', function (sender, message) {
                // console.info('connect msg', message.type);
                _this.connectStateChanged();
            });
            socket.subscribe('bytesReceived', function (sender, msg) {
                return _this.bytesReceived(msg.rawData);
            });
            return _this;
        }
        /**
         * Allow clients to check for my type, just as in some system object classes
         */
        ChristiePerformance.prototype.isOfTypeName = function (typeName) {
            return typeName === "ChristiePerformance" ? this : null;
        };
        ChristiePerformance.prototype.connectStateChanged = function () {
            var _this = this;
            if (this.socket.connected) {
                if (this.powerUpResolver) {
                    // Consider powered SOON, but not immediately - display is SLOOOW!
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
            // console.log("connected", this.socket.connected);
        };
        ChristiePerformance.prototype.nowPowered = function () {
            if (this.powerState === undefined)
                this.powerState = true; // Consider power to be on now
            if (!this.powerState)
                this.powerDown();
            else {
                if (this.inputNum !== undefined)
                    this.input = this.inputNum; // Enforce selected input
                else {
                    var cmd = this.makeCmd(0xAD); // Query input state
                    this.appendChecksum(cmd);
                    this.socket.sendBytes(cmd);
                }
            }
        };
        /**
         * Got some bytes from display. Look out for reply to "Query input state"
         * command sent when connected above with no desired input specified, in
         * which case it makes sense to pull the input from the device instead.
         *
         * ToDo: Not finished yet, and the docs is unclear/wrong on the input
         * numbers. Later...
         */
        ChristiePerformance.prototype.bytesReceived = function (data) {
            var sd = "";
            for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
                var n = data_1[_i];
                sd += n.toString() + ' ';
            }
            // console.log("bytesReceived", data.length, sd);
        };
        Object.defineProperty(ChristiePerformance.prototype, "power", {
            /**
             Get current power state, if known, else undefined.
             */
            get: function () {
                return this.powerState;
            },
            /**
             Turn power on/off. Turning off is instant. Turning on takes quite a
             while, and is implemented through WoL, since the stupid display
             turns off its network interface when switched off, even though
             the manual describes a command to turn it on. Go figure...
        
             As an alternative to setting power to true, call powerUp()
             and await its returned promise.
             */
            set: function (on) {
                if (this.powerState != on) {
                    this.powerState = on;
                    if (on)
                        this.powerUp2(); // This takes a while
                    else
                        this.powerDown();
                }
                // console.log("Sent", cmd);
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Power up using wake-on-LAN. Returned promise resolved
         * once connected.
         */
        ChristiePerformance.prototype.powerUp = function () {
            if (!this.powerState) {
                this.powerState = true; // Indicates desired state
                this.changed('power');
            }
            return this.powerUp2();
        };
        /**
         * Send wake-on-LAN, unless one is already in progress.
         * Return promise resolved once powered up.
         */
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
        // Send command to turn power off
        ChristiePerformance.prototype.powerDown = function () {
            var cmd = this.makeCmd(0x18);
            cmd.push(1);
            this.appendChecksum(cmd);
            this.socket.sendBytes(cmd);
        };
        Object.defineProperty(ChristiePerformance.prototype, "input", {
            /*
             Get current input, if known, else undefined.
             */
            get: function () {
                return this.inputNum;
            },
            /*
             Set desired input source.
             */
            set: function (value) {
                this.inputNum = value;
                var cmd = this.makeCmd(0xAC);
                cmd.push(value);
                cmd.push(1);
                this.appendChecksum(cmd);
                this.socket.sendBytes(cmd);
                // console.log("Input", value);
            },
            enumerable: true,
            configurable: true
        });
        ChristiePerformance.prototype.makeCmd = function (cmd) {
            var cmdBuf = [];
            // Byte kLengthIx is length of remaining Metadata
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
        return ChristiePerformance;
    }(Driver_1.Driver));
    ChristiePerformance.kMinInput = 1; // Allowable input range
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
        Meta.min(ChristiePerformance_1.kMinInput), Meta.max(ChristiePerformance_1.kMaxInput),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], ChristiePerformance.prototype, "input", null);
    ChristiePerformance = ChristiePerformance_1 = __decorate([
        Meta.driver('NetworkTCP', { port: 5000 }),
        __metadata("design:paramtypes", [Object])
    ], ChristiePerformance);
    exports.ChristiePerformance = ChristiePerformance;
    var ChristiePerformance_1;
});
