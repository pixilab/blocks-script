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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
define(["require", "exports", "system_lib/Metadata", "system_lib/Driver"], function (require, exports, Metadata_1, Driver_1) {
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
            if (!_this.socket.listenerPort)
                throw "Listening port not specified (e.g, 32331)";
            socket.subscribe('bytesReceived', function (sender, message) {
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
            return _this;
        }
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
                        _this.sendConnectRequest();
                        _this.setState(1);
                        _this.checkStateSoon();
                        break;
                    case 4:
                    case 2:
                        console.error("Response too slow in state " + _this.state);
                    case 1:
                        console.warn("CONNECTING timeout");
                        _this.setState(0);
                        _this.checkStateSoon();
                        break;
                    case 3:
                        _this.sendConnectionStateRequest();
                        break;
                }
            });
        };
        KNXNetIP.prototype.setState = function (state) {
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
            if (this.cmdQueue.length) {
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
                    console.warn("Comand not implemented", command);
                    break;
            }
        };
        KNXNetIP.prototype.gotDisconnectRequest = function (packet) {
            var reqChannelId = packet[6];
            if (reqChannelId === this.channelId)
                this.setState(0);
            var disconnectResponse = [0x06, 0x10, 0x02, 0x0a, 0x00, 0x08, reqChannelId, 0x00];
            this.socket.sendBytes(setLength(disconnectResponse));
        };
        KNXNetIP.prototype.gotConnectionResponse = function (packet) {
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
            this.verifyState(2);
            var error = packet[7];
            if (error)
                throw "Connetion state response error " + error;
            this.setState(3);
        };
        KNXNetIP.prototype.gotTunnelResponse = function (packet) {
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
                handler: this.sendSceneNumber.bind(this),
                destAddr: calcAddr(addr1, addr2, addr3),
                scene: scene
            };
            this.queueCmd(cmd);
        };
        KNXNetIP.prototype.queueCmd = function (cmd) {
            this.cmdQueue.push(cmd);
            if (this.cmdQueue.length > 30) {
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
            var tunReq = [
                0x06, 0x10,
                1056 >> 8, 1056 & 0xff,
                0x00, 0x15,
                0x04,
                this.channelId,
                this.seqCount,
                0,
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
            ];
            this.socket.sendBytes(setLength(tunReq));
            this.seqCount = ((this.seqCount + 1) & 0xff);
        };
        KNXNetIP.prototype.sendSceneNumber = function (cmd) {
            cmd.seqId = this.seqCount;
            var tunReq = [
                0x06, 0x10,
                1056 >> 8, 1056 & 0xff,
                0x00, 0x15,
                0x04,
                this.channelId,
                this.seqCount,
                0,
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
                cmd.scene
            ];
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
        KNXNetIP = __decorate([
            Metadata_1.driver('NetworkUDP', { port: 3671, rcvPort: 32331 }),
            __metadata("design:paramtypes", [Object])
        ], KNXNetIP);
        return KNXNetIP;
    }(Driver_1.Driver));
    exports.KNXNetIP = KNXNetIP;
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
        return pkg;
    }
    function get16bit(rawData, offs) {
        return (rawData[offs] << 8) + rawData[offs + 1];
    }
});
