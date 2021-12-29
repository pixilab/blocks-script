var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
define(["require", "exports", "system_lib/Metadata", "system_lib/Driver", "system/SimpleFile"], function (require, exports, Metadata_1, Driver_1, SimpleFile_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.KNXNetIP = void 0;
    var KNXNetIP = (function (_super) {
        __extends(KNXNetIP, _super);
        function KNXNetIP(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.state = 0;
            _this.seqCount = 0;
            _this.mConnected = false;
            _this.cmdQueue = [];
            _this.errCount = 0;
            _this.dynProps = [];
            _this.connTimeoutWarned = false;
            _this.loadConfig();
            if (socket.enabled) {
                if (!_this.socket.listenerPort)
                    throw "Listening port not specified (e.g, 32331)";
                socket.subscribe('finish', function () {
                    if (_this.timer) {
                        _this.timer.cancel();
                        _this.timer = undefined;
                    }
                });
                socket.subscribe('bytesReceived', function (sender, message) {
                    debugLog("bytesReceived", message.rawData.length);
                    try {
                        _this.processReply(message.rawData);
                        _this.errCount = 0;
                    }
                    catch (error) {
                        console.error(error);
                        if (++_this.errCount > 5) {
                            _this.errCount = 0;
                            _this.setState(0);
                            _this.checkStateSoon();
                        }
                    }
                });
                _this.checkStateSoon(5);
            }
            return _this;
        }
        KNXNetIP.prototype.loadConfig = function () {
            var _this = this;
            var configFile = 'KNXNetIP/' + this.socket.name + '.json';
            SimpleFile_1.SimpleFile.exists(configFile).then(function (existence) {
                if (existence === 1)
                    SimpleFile_1.SimpleFile.readJson(configFile).then(function (data) { return _this.processConfig(data); });
                else
                    console.log('No configuration file "' + configFile + '" - providing only generic functionality');
            });
        };
        KNXNetIP.prototype.processConfig = function (config) {
            if (config.analog) {
                for (var _i = 0, _a = config.analog; _i < _a.length; _i++) {
                    var analog = _a[_i];
                    if (!analog.type || analog.type === "5.001")
                        this.dynProps.push(new AnalogProp(this, analog));
                    else
                        console.warn("Unsupported analog type", analog.type);
                }
            }
            if (config.digital) {
                for (var _b = 0, _c = config.digital; _b < _c.length; _b++) {
                    var digital = _c[_b];
                    if (!digital.type || digital.type.charAt(0) === "1")
                        this.dynProps.push(new DigitalProp(this, digital));
                    else
                        console.warn("Unsupported digital type", digital.type);
                }
            }
        };
        Object.defineProperty(KNXNetIP.prototype, "connected", {
            get: function () {
                return this.mConnected;
            },
            set: function (value) {
                this.mConnected = value;
            },
            enumerable: false,
            configurable: true
        });
        KNXNetIP.prototype.checkStateSoon = function (howSoon) {
            var _this = this;
            if (howSoon === void 0) { howSoon = 5000; }
            if (this.timer)
                this.timer.cancel();
            this.timer = wait(howSoon);
            this.timer.then(function () {
                _this.timer = undefined;
                switch (_this.state) {
                    case 0:
                        if (_this.socket.enabled) {
                            _this.sendConnectRequest();
                            _this.setState(1);
                            _this.checkStateSoon();
                        }
                        break;
                    case 4:
                    case 2:
                        console.error("Response too slow in state " + _this.state);
                        _this.resetConnection();
                        break;
                    case 1:
                        if (!_this.connTimeoutWarned) {
                            console.warn("CONNECTING timeout");
                            _this.connTimeoutWarned = true;
                        }
                        _this.resetConnection();
                        break;
                    case 3:
                        _this.sendConnectionStateRequest();
                        _this.connTimeoutWarned = false;
                        break;
                }
            });
        };
        KNXNetIP.prototype.resetConnection = function () {
            this.setState(0);
            this.checkStateSoon();
        };
        KNXNetIP.prototype.setState = function (state) {
            debugLog("setState", state);
            this.state = state;
            this.connected = state >= 2 && state <= 4;
            if (state === 3) {
                if (this.cmdQueue.length)
                    this.sendQueuedCommand();
                else
                    this.checkStateSoon(6000);
            }
        };
        KNXNetIP.prototype.sendQueuedCommand = function () {
            if (this.cmdQueue.length && this.connected) {
                var toSend = this.cmdQueue[0];
                toSend.handler(toSend);
                this.setState(4);
                this.checkStateSoon();
            }
        };
        KNXNetIP.prototype.processReply = function (reply) {
            if (reply[0] !== 0x06 || reply[1] !== 0x10)
                throw "Invalid Header";
            var command = get16bit(reply, 2);
            var expectedLength = get16bit(reply, 4);
            if (expectedLength !== reply.length)
                throw "Invalid reply expectedLength, expected " + expectedLength + ' got ' + reply.length;
            switch (command) {
                case 518:
                    this.gotConnectionResponse(reply);
                    break;
                case 520:
                    this.gotConnectionStateResponse(reply);
                    this.connTimeoutWarned = false;
                    break;
                case 1057:
                    this.gotTunnelResponse(reply);
                    break;
                case 1056:
                    this.gotTunnelRequest(reply);
                    break;
                case 521:
                    this.gotDisconnectRequest(reply);
                    break;
                default:
                    console.warn("Unknown msg from gateway", command);
                    break;
            }
        };
        KNXNetIP.prototype.gotDisconnectRequest = function (packet) {
            debugLog("gotDisconnectRequest");
            var reqChannelId = packet[6];
            if (reqChannelId === this.channelId)
                this.setState(0);
            var disconnectResponse = [0x06, 0x10, 0x02, 0x0a, 0x00, 0x08, reqChannelId, 0x00];
            this.socket.sendBytes(setLength(disconnectResponse));
        };
        KNXNetIP.prototype.gotConnectionResponse = function (packet) {
            debugLog("gotConnectionResponse");
            this.verifyState(1);
            var error = packet[7];
            if (error)
                throw "Connetion response error " + error;
            this.channelId = packet[6];
            this.sendConnectionStateRequest();
        };
        KNXNetIP.prototype.verifyState = function (expectedState) {
            if (this.state !== expectedState)
                throw "Packet unexpected in state. Expected " + expectedState + ' had ' + this.state;
        };
        KNXNetIP.prototype.gotConnectionStateResponse = function (packet) {
            debugLog("gotConnectionStateResponse");
            this.verifyState(2);
            var error = packet[7];
            if (error)
                throw "Connetion state response error " + error;
            this.setState(3);
        };
        KNXNetIP.prototype.gotTunnelResponse = function (packet) {
            debugLog("gotTunnelResponse");
            this.verifyState(4);
            var error = packet[9];
            if (error)
                throw "Tunnel response error " + error;
            var seqId = packet[8];
            var queue = this.cmdQueue;
            if (queue.length && queue[0].seqId === seqId) {
                queue.shift();
                this.setState(3);
            }
        };
        KNXNetIP.prototype.gotTunnelRequest = function (packet) {
            debugLog("gotTunnelRequest");
            this.sendTunnelAck(packet[7], packet[8]);
        };
        KNXNetIP.prototype.sendConnectRequest = function () {
            var listenerPort = this.socket.listenerPort;
            var connReq = [
                0x06, 0x10,
                517 >> 8, 517 & 0xff,
                0x00, 0x1a,
                0x08, 0x01,
                0, 0, 0, 0,
                listenerPort >> 8, listenerPort & 0xff,
                0x08, 0x01,
                0, 0, 0, 0,
                listenerPort >> 8, listenerPort & 0xff,
                0x04, 0x04, 0x02, 0x00
            ];
            this.socket.sendBytes(setLength(connReq));
            this.seqCount = 0;
            this.errCount = 0;
        };
        KNXNetIP.prototype.sendConnectionStateRequest = function () {
            var listenerPort = this.socket.listenerPort;
            var connStateReq = [
                0x06, 0x10,
                519 >> 8, 519 & 0xff,
                0x00, 0x10,
                this.channelId, 0x00,
                0x08,
                0x01,
                0, 0, 0, 0,
                listenerPort >> 8, listenerPort & 0xff
            ];
            this.socket.sendBytes(setLength(connStateReq));
            this.setState(2);
            this.checkStateSoon();
        };
        KNXNetIP.prototype.setOnOff = function (addr1, addr2, addr3, on) {
            var cmd = {
                handler: this.sendOnOff.bind(this),
                destAddr: calcAddr(addr1, addr2, addr3),
                on: on
            };
            this.queueCmd(cmd);
        };
        KNXNetIP.prototype.setScene = function (addr1, addr2, addr3, scene) {
            scene = Math.min(Math.max(0, scene), 63);
            var cmd = {
                handler: this.sendSingleByteNumber.bind(this),
                destAddr: calcAddr(addr1, addr2, addr3),
                num: scene
            };
            this.queueCmd(cmd);
        };
        KNXNetIP.prototype.enforceProps = function () {
            if (this.connected) {
                for (var _i = 0, _a = this.dynProps; _i < _a.length; _i++) {
                    var dynProp = _a[_i];
                    dynProp.sendWantedValue();
                }
            }
        };
        KNXNetIP.prototype.queueCmd = function (cmd) {
            this.cmdQueue.push(cmd);
            if (this.cmdQueue.length > 50) {
                console.warn("Excessive command buffering - discarding old");
                this.cmdQueue.shift();
            }
            if (this.state === 3)
                this.sendQueuedCommand();
            else if (!this.connected && !this.timer)
                this.checkStateSoon(2);
        };
        KNXNetIP.prototype.sendOnOff = function (cmd) {
            cmd.seqId = this.seqCount;
            this.sendTunReq([
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0x11,
                0x00,
                0xbc,
                0xe0,
                0x00,
                0x00,
                cmd.destAddr >> 8, cmd.destAddr & 0xff,
                0x01,
                0x00,
                cmd.on ? 0x81 : 0x80
            ]);
        };
        KNXNetIP.prototype.sendSingleByteNumber = function (cmd) {
            cmd.seqId = this.seqCount;
            this.sendTunReq([
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0x11,
                0x00,
                0xbc,
                0xe0,
                0x00,
                0x00,
                cmd.destAddr >> 8, cmd.destAddr & 0xff,
                0x02,
                0x00,
                0x80,
                cmd.num
            ]);
        };
        KNXNetIP.prototype.sendTunReq = function (tunReq) {
            tunReq[0] = 0x06;
            tunReq[1] = 0x10;
            tunReq[2] = 1056 >> 8;
            tunReq[3] = 1056 & 0xff;
            tunReq[6] = 4;
            tunReq[7] = this.channelId;
            tunReq[8] = this.seqCount;
            tunReq[9] = 0;
            this.socket.sendBytes(setLength(tunReq));
            this.seqCount = ((this.seqCount + 1) & 0xff);
        };
        KNXNetIP.prototype.sendTunnelAck = function (channelId, seqCount) {
            var tunAck = [
                0x06,
                0x10,
                1057 >> 8, 1057 & 0xff,
                0x00,
                0x0A,
                0x04,
                channelId,
                seqCount,
                0x00
            ];
            this.socket.sendBytes(setLength(tunAck));
        };
        __decorate([
            Metadata_1.property("Connection established", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], KNXNetIP.prototype, "connected", null);
        __decorate([
            Metadata_1.callable("Send on/off command specified addr1/addr2/addr3"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number, Boolean]),
            __metadata("design:returntype", void 0)
        ], KNXNetIP.prototype, "setOnOff", null);
        __decorate([
            Metadata_1.callable("Recall scene for addr1/addr2/addr3"),
            __param(3, Metadata_1.parameter("Scene 0…63 to recall (may be off-by-1)")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], KNXNetIP.prototype, "setScene", null);
        __decorate([
            Metadata_1.callable("Send all my dynamic property values"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], KNXNetIP.prototype, "enforceProps", null);
        KNXNetIP = __decorate([
            Metadata_1.driver('NetworkUDP', { port: 3671, rcvPort: 32331 }),
            __metadata("design:paramtypes", [Object])
        ], KNXNetIP);
        return KNXNetIP;
    }(Driver_1.Driver));
    exports.KNXNetIP = KNXNetIP;
    var AnalogProp = (function () {
        function AnalogProp(owner, analog) {
            var _this = this;
            this.owner = owner;
            this.analog = analog;
            this.wantedValue = 0;
            owner.property('analog_' + analog.name, {
                type: "Number",
                description: analog.description || "An analog channel value (normalized)",
                min: 0,
                max: 1
            }, function (setValue) {
                if (setValue !== undefined) {
                    setValue = Math.max(0, Math.min(1, setValue));
                    _this.wantedValue = setValue;
                    if (_this.currValue !== setValue) {
                        if (!_this.delayedSendTimer) {
                            _this.delayedSendTimer = wait(150);
                            _this.delayedSendTimer.then(function () {
                                _this.delayedSendTimer = undefined;
                                _this.sendWantedValue();
                                _this.currValue = _this.wantedValue;
                            });
                        }
                    }
                }
                return _this.wantedValue;
            });
        }
        AnalogProp.prototype.sendWantedValue = function () {
            var anal = this.analog;
            var owner = this.owner;
            var cmd = {
                handler: owner.sendSingleByteNumber.bind(owner),
                destAddr: calcAddr(anal.addr[0], anal.addr[1], anal.addr[2]),
                num: Math.round(this.wantedValue * 255)
            };
            owner.queueCmd(cmd);
        };
        return AnalogProp;
    }());
    var DigitalProp = (function () {
        function DigitalProp(owner, digital) {
            var _this = this;
            this.owner = owner;
            this.digital = digital;
            this.wantedValue = false;
            owner.property('digital_' + digital.name, {
                type: "Boolean",
                description: digital.description || "An digital (on/off) channel value"
            }, function (setValue) {
                if (setValue !== undefined) {
                    _this.wantedValue = setValue;
                    _this.sendWantedValue();
                }
                return _this.wantedValue;
            });
        }
        DigitalProp.prototype.sendWantedValue = function () {
            var ch = this.digital;
            var owner = this.owner;
            var cmd = {
                handler: owner.sendOnOff.bind(owner),
                destAddr: calcAddr(ch.addr[0], ch.addr[1], ch.addr[2]),
                on: this.wantedValue
            };
            owner.queueCmd(cmd);
        };
        return DigitalProp;
    }());
    function calcAddr(addr1, addr2, addr3) {
        addr1 = Math.min(Math.max(0, addr1), 31);
        addr2 = Math.min(Math.max(0, addr2), 7);
        addr3 = Math.min(Math.max(0, addr3), 255);
        return addr1 * 2048 + addr2 * 256 + addr3;
    }
    function setLength(pkg) {
        var length = pkg.length;
        pkg[4] = length >> 8;
        pkg[5] = length & 0xff;
        debugLog("About to send cmd", pkg[2], pkg[3]);
        return pkg;
    }
    function get16bit(rawData, offs) {
        return (rawData[offs] << 8) + rawData[offs + 1];
    }
    function debugLog() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.debug(args);
    }
});
