"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.KNXNetIP = void 0;
const Metadata_1 = require("../system_lib/Metadata");
const Driver_1 = require("../system_lib/Driver");
const SimpleFile_1 = require("../system/SimpleFile");
let KNXNetIP = class KNXNetIP extends Driver_1.Driver {
    socket;
    state = 0;
    channelId;
    seqCount = 0;
    mConnected = false;
    cmdQueue = [];
    timer;
    errCount = 0;
    dynProps = [];
    connTimeoutWarned = false;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        this.loadConfig();
        if (socket.enabled) {
            if (!this.socket.listenerPort)
                throw "Listening port not specified (e.g, 32331)";
            socket.subscribe('bytesReceived', (sender, message) => {
                debugLog("bytesReceived", message.rawData.length);
                try {
                    this.processReply(message.rawData);
                    this.errCount = 0;
                }
                catch (error) {
                    console.error(error);
                    if (++this.errCount > 5) {
                        this.errCount = 0;
                        this.sendDisconnectRequest();
                    }
                }
            });
            this.checkStateSoon(5);
            this.subscribe('finish', () => {
                debugLog("finish");
                this.cancelTimer();
            });
        }
    }
    loadConfig() {
        const configFile = 'KNXNetIP/' + this.socket.name + '.json';
        SimpleFile_1.SimpleFile.exists(configFile).then(existence => {
            if (existence === 1)
                SimpleFile_1.SimpleFile.readJson(configFile).then(data => this.processConfig(data));
            else
                console.log('No configuration file "' + configFile + '" - providing only generic functionality');
        });
    }
    processConfig(config) {
        if (config.analog) {
            for (const analog of config.analog) {
                if (!analog.type || analog.type === "5.001")
                    this.dynProps.push(new AnalogProp(this, analog));
                else
                    console.warn("Unsupported analog type", analog.type);
            }
        }
        if (config.digital) {
            for (const digital of config.digital) {
                if (!digital.type || digital.type.charAt(0) === "1")
                    this.dynProps.push(new DigitalProp(this, digital));
                else
                    console.warn("Unsupported digital type", digital.type);
            }
        }
    }
    get connected() {
        return this.mConnected;
    }
    set connected(value) {
        this.mConnected = value;
    }
    checkStateSoon(howSoon = 5000) {
        this.cancelTimer();
        if (this.socket.enabled) {
            this.timer = wait(howSoon);
            this.timer.then(() => {
                this.timer = undefined;
                switch (this.state) {
                    case 0:
                        if (this.socket.enabled) {
                            this.sendConnectRequest();
                            this.setState(1);
                            this.checkStateSoon();
                        }
                        break;
                    case 4:
                    case 2:
                        console.error("Response too slow in state " + this.state);
                        this.resetConnection();
                        break;
                    case 1:
                        if (!this.connTimeoutWarned) {
                            console.warn("CONNECTING timeout");
                            this.connTimeoutWarned = true;
                        }
                        this.resetConnection();
                        break;
                    case 3:
                        this.sendConnectionStateRequest();
                        this.connTimeoutWarned = false;
                        break;
                }
            });
        }
    }
    cancelTimer() {
        if (this.timer) {
            this.timer.cancel();
            this.timer = undefined;
        }
    }
    resetConnection() {
        this.setState(0);
        this.checkStateSoon();
    }
    setState(state) {
        debugLog("setState", state);
        this.state = state;
        this.connected = state >= 2 && state <= 4;
        if (state === 3) {
            if (this.cmdQueue.length)
                this.sendQueuedCommand();
            else
                this.checkStateSoon(30000);
        }
    }
    sendQueuedCommand() {
        if (this.cmdQueue.length && this.connected) {
            const toSend = this.cmdQueue[0];
            toSend.handler(toSend);
            this.setState(4);
            this.checkStateSoon();
        }
    }
    processReply(reply) {
        if (reply[0] !== 0x06 || reply[1] !== 0x10)
            throw "Invalid Header";
        const command = get16bit(reply, 2);
        const expectedLength = get16bit(reply, 4);
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
    }
    gotDisconnectRequest(packet) {
        debugLog("gotDisconnectRequest");
        const reqChannelId = packet[6];
        if (reqChannelId === this.channelId)
            this.setState(0);
        const disconnectResponse = [0x06, 0x10, 0x02, 0x0a, 0x00, 0x08, reqChannelId, 0x00];
        this.socket.sendBytes(setLength(disconnectResponse));
    }
    gotConnectionResponse(packet) {
        debugLog("gotConnectionResponse");
        const error = packet[7];
        if (error)
            throw "Connection response error " + error;
        this.verifyState(1);
        this.channelId = packet[6];
        this.sendConnectionStateRequest();
    }
    verifyState(expectedState) {
        if (this.state !== expectedState)
            throw "Packet unexpected in state. Expected " + expectedState + ' had ' + this.state;
    }
    gotConnectionStateResponse(packet) {
        debugLog("gotConnectionStateResponse");
        const error = packet[7];
        if (error)
            throw "Connection state response error " + error;
        this.verifyState(2);
        this.setState(3);
    }
    gotTunnelResponse(packet) {
        debugLog("gotTunnelResponse");
        const error = packet[9];
        if (error)
            throw "Tunnel response error " + error;
        this.verifyState(4);
        const seqId = packet[8];
        const queue = this.cmdQueue;
        if (queue.length && queue[0].seqId === seqId) {
            queue.shift();
            this.setState(3);
        }
    }
    gotTunnelRequest(packet) {
        debugLog("gotTunnelRequest");
        this.sendTunnelAck(packet[7], packet[8]);
    }
    sendConnectRequest() {
        const listenerPort = this.socket.listenerPort;
        const connReq = [
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
    }
    sendConnectionStateRequest() {
        const listenerPort = this.socket.listenerPort;
        const connStateReq = [
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
    }
    sendDisconnectRequest() {
        if (this.channelId) {
            const listenerPort = this.socket.listenerPort;
            debugLog("sendDisconnectRequest");
            const disconnReq = [
                0x06, 0x10,
                521 >> 8, 521 & 0xff,
                0x00, 0x10,
                this.channelId, 0x00,
                0x08,
                0x01,
                0, 0, 0, 0,
                listenerPort >> 8, listenerPort & 0xff
            ];
            this.socket.sendBytes(setLength(disconnReq));
            this.setState(0);
            this.checkStateSoon();
        }
    }
    setOnOff(addr1, addr2, addr3, on) {
        const cmd = {
            handler: this.sendOnOff.bind(this),
            destAddr: calcAddr(addr1, addr2, addr3),
            on: on
        };
        this.queueCmd(cmd);
    }
    setScene(addr1, addr2, addr3, scene) {
        scene = Math.min(Math.max(0, scene), 63);
        const cmd = {
            handler: this.sendSingleByteNumber.bind(this),
            destAddr: calcAddr(addr1, addr2, addr3),
            num: scene
        };
        this.queueCmd(cmd);
    }
    enforceProps() {
        if (this.connected) {
            for (const dynProp of this.dynProps)
                dynProp.sendWantedValue();
        }
    }
    queueCmd(cmd) {
        this.cmdQueue.push(cmd);
        if (this.cmdQueue.length > 50) {
            console.warn("Excessive command buffering - discarding old");
            this.cmdQueue.shift();
        }
        if (this.state === 3)
            this.sendQueuedCommand();
        else if (!this.connected && !this.timer)
            this.checkStateSoon(2);
    }
    sendOnOff(cmd) {
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
    }
    sendSingleByteNumber(cmd) {
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
    }
    sendTunReq(tunReq) {
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
    }
    sendTunnelAck(channelId, seqCount) {
        const tunAck = [
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
    }
};
exports.KNXNetIP = KNXNetIP;
__decorate([
    (0, Metadata_1.property)("Connection established", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], KNXNetIP.prototype, "connected", null);
__decorate([
    (0, Metadata_1.callable)("Send on/off command specified addr1/addr2/addr3"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number, Boolean]),
    __metadata("design:returntype", void 0)
], KNXNetIP.prototype, "setOnOff", null);
__decorate([
    (0, Metadata_1.callable)("Recall scene for addr1/addr2/addr3"),
    __param(3, (0, Metadata_1.parameter)("Scene 0…63 to recall (may be off-by-1)")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number, Number]),
    __metadata("design:returntype", void 0)
], KNXNetIP.prototype, "setScene", null);
__decorate([
    (0, Metadata_1.callable)("Send all my dynamic property values"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], KNXNetIP.prototype, "enforceProps", null);
exports.KNXNetIP = KNXNetIP = __decorate([
    (0, Metadata_1.driver)('NetworkUDP', { port: 3671, rcvPort: 32331 }),
    __metadata("design:paramtypes", [Object])
], KNXNetIP);
class AnalogProp {
    owner;
    analog;
    wantedValue = 0;
    currValue;
    delayedSendTimer;
    constructor(owner, analog) {
        this.owner = owner;
        this.analog = analog;
        owner.property('analog_' + analog.name, {
            type: "Number",
            description: analog.description || "An analog channel value (normalized)",
            min: 0,
            max: 1
        }, setValue => {
            if (setValue !== undefined) {
                setValue = Math.max(0, Math.min(1, setValue));
                this.wantedValue = setValue;
                if (this.currValue !== setValue) {
                    if (!this.delayedSendTimer) {
                        this.delayedSendTimer = wait(150);
                        this.delayedSendTimer.then(() => {
                            this.delayedSendTimer = undefined;
                            this.sendWantedValue();
                            this.currValue = this.wantedValue;
                        });
                    }
                }
            }
            return this.wantedValue;
        });
    }
    sendWantedValue() {
        const anal = this.analog;
        const owner = this.owner;
        const cmd = {
            handler: owner.sendSingleByteNumber.bind(owner),
            destAddr: calcAddr(anal.addr[0], anal.addr[1], anal.addr[2]),
            num: Math.round(this.wantedValue * 255)
        };
        owner.queueCmd(cmd);
    }
}
class DigitalProp {
    owner;
    digital;
    wantedValue = false;
    constructor(owner, digital) {
        this.owner = owner;
        this.digital = digital;
        owner.property('digital_' + digital.name, {
            type: "Boolean",
            description: digital.description || "An digital (on/off) channel value"
        }, setValue => {
            if (setValue !== undefined) {
                this.wantedValue = setValue;
                this.sendWantedValue();
            }
            return this.wantedValue;
        });
    }
    sendWantedValue() {
        const ch = this.digital;
        const owner = this.owner;
        const cmd = {
            handler: owner.sendOnOff.bind(owner),
            destAddr: calcAddr(ch.addr[0], ch.addr[1], ch.addr[2]),
            on: this.wantedValue
        };
        owner.queueCmd(cmd);
    }
}
function calcAddr(addr1, addr2, addr3) {
    addr1 = Math.min(Math.max(0, addr1), 31);
    addr2 = Math.min(Math.max(0, addr2), 7);
    addr3 = Math.min(Math.max(0, addr3), 255);
    return addr1 * 2048 + addr2 * 256 + addr3;
}
function setLength(pkg) {
    const length = pkg.length;
    pkg[4] = length >> 8;
    pkg[5] = length & 0xff;
    debugLog("About to send cmd", pkg[2], pkg[3]);
    return pkg;
}
function get16bit(rawData, offs) {
    return (rawData[offs] << 8) + rawData[offs + 1];
}
function debugLog(...args) {
    console.debug(args);
}
