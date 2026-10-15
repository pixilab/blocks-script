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
exports.KNXNetIP_Bidirectional = void 0;
const Metadata_1 = require("../system_lib/Metadata");
const Driver_1 = require("../system_lib/Driver");
const SimpleFile_1 = require("../system/SimpleFile");
let debugLoggingEnabled = false;
let KNXNetIP_Bidirectional = class KNXNetIP_Bidirectional extends Driver_1.Driver {
    socket;
    state = 0;
    channelId;
    seqCount = 0;
    mConnected = false;
    connectAttempts = 0;
    cmdQueue = [];
    timer;
    errCount = 0;
    dynProps = [];
    statusProps = {};
    connTimeoutWarned = false;
    pendingStartupReads = false;
    responseTimeout = 5000;
    startupReadIntervalMs = 200;
    debugLastDisconnectRequest;
    persistedDisconnectFile;
    probeTimer;
    probeInterval = 30000;
    probeMaxFailures = 2;
    probeFailures = 0;
    lastProbeInitiated = false;
    disconnectAttempts = 0;
    disconnectTimer;
    MAX_DISCONNECT_ATTEMPTS = 3;
    orphanedChannels = [];
    pendingValidationChannelId;
    pendingValidationSeqCount = 0;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        this.persistedDisconnectFile = 'KNXNetIP/lastDisconnect_' + this.socket.name + '.json';
        this.loadConfig();
        this.startProbe();
        if (socket.enabled) {
            console.log("KNXNetIP driver starting up for device", socket.name, "on port", socket.listenerPort);
            if (!this.socket.listenerPort)
                throw "Listening port not specified (e.g, 32331)";
            SimpleFile_1.SimpleFile.exists(this.persistedDisconnectFile).then(exists => {
                if (exists === 1) {
                    SimpleFile_1.SimpleFile.readJson(this.persistedDisconnectFile).then((data) => {
                        if (data && data.channelId) {
                            debugLog('Found persisted channelId', data.channelId, '- probing gateway to validate/reuse');
                            this.pendingValidationChannelId = data.channelId;
                            this.pendingValidationSeqCount = data.seqCount || 0;
                            this.sendConnectionStateFor(data.channelId);
                            wait(this.responseTimeout).then(() => {
                                if (this.pendingValidationChannelId === data.channelId) {
                                    debugLog('Channel validation timed out for channel', data.channelId, '- starting fresh');
                                    this.pendingValidationChannelId = undefined;
                                    this.sendDisconnectFor(data.channelId);
                                    SimpleFile_1.SimpleFile.delete(this.persistedDisconnectFile).catch(() => { });
                                    this.checkStateSoon(0);
                                }
                            });
                            return;
                        }
                        this.checkStateSoon(0);
                    }).catch(() => {
                        this.checkStateSoon(0);
                    });
                }
                else {
                    this.checkStateSoon(0);
                }
            }).catch(() => {
                this.checkStateSoon(0);
            });
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
            socket.subscribe('finish', () => {
                debugLog("finish - driver shutting down, persisting channelID and sequence for next instance to try to reuse");
                this.connected = false;
                try {
                    if (this.channelId) {
                        SimpleFile_1.SimpleFile.write(this.persistedDisconnectFile, JSON.stringify({ channelId: this.channelId, seqCount: this.seqCount, when: Date.now(), reconnect: false })).catch(() => { });
                    }
                }
                catch (e) {
                    console.error('Error while sending disconnect on finish', e);
                }
                this.cancelTimer();
                if (this.probeTimer) {
                    this.probeTimer.cancel();
                    this.probeTimer = undefined;
                }
            });
        }
    }
    startProbe() {
        if (this.probeTimer)
            return;
        this.probeTimer = wait(this.probeInterval);
        this.probeTimer.then(() => {
            this.probeTimer = undefined;
            try {
                if (!this.socket)
                    return;
                if (this.socket.enabled && this.state === 0) {
                    this.lastProbeInitiated = true;
                    this.checkStateSoon(0);
                }
            }
            catch (e) {
                console.error('Error in probe tick', e);
            }
            this.startProbe();
        });
    }
    loadConfig() {
        try {
            const opts = this.socket.options;
            if (opts) {
                let cfg = opts;
                if (typeof cfg === 'string')
                    cfg = JSON.parse(cfg);
                this.processConfig(cfg);
            }
        }
        catch (err) {
            console.error('Invalid socket.options for KNXNetIP driver', err);
        }
    }
    processConfig(config) {
        if (config.responseTimeout !== undefined)
            this.responseTimeout = Math.max(500, config.responseTimeout);
        if (config.connectTestIntervalMs !== undefined)
            this.probeInterval = Math.max(1000, config.connectTestIntervalMs);
        if (config.maxFailedConnectAttempts !== undefined)
            this.probeMaxFailures = Math.max(1, config.maxFailedConnectAttempts);
        if (config.startupReadIntervalMs !== undefined)
            this.startupReadIntervalMs = Math.max(0, config.startupReadIntervalMs);
        debugLoggingEnabled = !!config.debugLogging;
        if (config.analog) {
            for (const analog of config.analog) {
                if (isSupportedAnalogType(analog.type)) {
                    const prop = new AnalogProp(this, analog);
                    this.dynProps.push(prop);
                    this.registerStatusProp(prop);
                }
                else
                    debugLog("Unsupported analog type", analog.type);
            }
        }
        if (config.digital) {
            for (const digital of config.digital) {
                if (!digital.type || digital.type.charAt(0) === "1") {
                    const prop = new DigitalProp(this, digital);
                    this.dynProps.push(prop);
                    this.registerStatusProp(prop);
                }
                else
                    debugLog("Unsupported digital type", digital.type);
            }
        }
        if (config.scenes) {
            for (const scene of config.scenes) {
                const prop = new SceneProp(this, scene);
                this.dynProps.push(prop);
                this.registerStatusProp(prop);
            }
        }
        if (this.connected)
            this.requestInitialStatuses();
    }
    registerStatusProp(prop) {
        const statusAddr = prop.getStatusAddr();
        if (statusAddr !== undefined)
            this.statusProps[statusAddr] = prop;
    }
    get connected() {
        return this.mConnected;
    }
    set connected(value) {
        if (value === this.mConnected)
            return;
        this.mConnected = value;
    }
    checkStateSoon(howSoon = this.responseTimeout) {
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
                        const queued = this.cmdQueue[0];
                        console.error("Response too slow in state " + this.state, queued ? queued.debugLabel : "no queued command", queued && queued.seqId !== undefined ? queued.seqId : "no seqId");
                        this.resetConnection("response timeout in state " + this.state);
                        break;
                    case 1:
                        if (!this.connTimeoutWarned) {
                            console.warn("CONNECTING timeout");
                            this.connTimeoutWarned = true;
                        }
                        this.resetConnection("connecting timeout");
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
    resetConnection(reason = "unspecified") {
        debugLog("resetConnection", reason, "state", this.state, "channelId", this.channelId || 0, "queueHead", this.cmdQueue.length ? this.cmdQueue[0].debugLabel : "empty");
        if (this.lastProbeInitiated) {
            this.lastProbeInitiated = false;
            this.probeFailures = (this.probeFailures || 0) + 1;
            debugLog('probe: connection attempt failed, failures:', this.probeFailures);
            if (this.probeFailures >= this.probeMaxFailures) {
                this.probeFailures = 0;
                debugLog('probe: max failures exceeded');
            }
        }
        if (this.state === 1 && !this.channelId) {
            this.connectAttempts = (this.connectAttempts || 0) + 1;
            const backoff = Math.min(60000, this.connectAttempts * 5000);
            debugLog('connect attempt failed, backing off', backoff, 'ms (attempts)', this.connectAttempts);
            this.setState(0);
            this.checkStateSoon(backoff);
            return;
        }
        if (this.channelId) {
            this.sendDisconnectFor(this.channelId);
            this.channelId = 0;
        }
        this.setState(0);
        if (this.socket && this.socket.enabled)
            this.checkStateSoon();
    }
    setState(state) {
        debugLog("setState", state);
        this.state = state;
        this.connected = state >= 2 && state <= 4;
        if (state === 3) {
            if (this.pendingStartupReads)
                this.requestInitialStatuses();
            if (this.cmdQueue.length && this.state === 3)
                this.sendQueuedCommand();
            if (this.state === 3)
                this.checkStateSoon(30000);
        }
    }
    requestInitialStatuses() {
        this.pendingStartupReads = false;
        debugLog('requestInitialStatuses: dynProps count', this.dynProps.length);
        if (this.startupReadIntervalMs > 0) {
            let delay = 0;
            for (const dynProp of this.dynProps) {
                try {
                    const addr = dynProp.getStatusAddr();
                    debugLog('requestInitialStatuses: requesting status for', formatAddr(addr), delay ? '(delay ' + delay + 'ms)' : '');
                }
                catch (e) { }
                if (delay === 0) {
                    dynProp.requestCurrentValue();
                }
                else {
                    const dp = dynProp;
                    wait(delay).then(() => dp.requestCurrentValue());
                }
                delay += this.startupReadIntervalMs;
            }
        }
        else {
            for (const dynProp of this.dynProps) {
                try {
                    const addr = dynProp.getStatusAddr();
                    debugLog('requestInitialStatuses: requesting status for', formatAddr(addr));
                }
                catch (e) {
                    debugLog('requestInitialStatuses: dynProp has no status addr');
                }
                dynProp.requestCurrentValue();
            }
        }
    }
    sendQueuedCommand() {
        if (this.cmdQueue.length && this.mConnected) {
            const toSend = this.cmdQueue[0];
            debugLog("sendQueuedCommand", toSend.debugLabel || "unnamed");
            if (toSend.seqId !== undefined) {
                debugLog("sendQueuedCommand: command already sent, skipping", toSend.debugLabel || "unnamed", "seq", toSend.seqId);
                return;
            }
            toSend.handler(toSend);
            this.setState(4);
            this.checkStateSoon();
        }
    }
    processReply(reply) {
        if (!reply || reply.length < 6)
            return;
        if (reply[0] !== 0x06 || reply[1] !== 0x10)
            throw "Invalid Header";
        const command = get16bit(reply, 2);
        const expectedLength = get16bit(reply, 4);
        if (expectedLength !== reply.length)
            throw "Invalid reply expectedLength, expected " + expectedLength + ' got ' + reply.length;
        const pktChannel = (command === 1056 || command === 1057)
            ? reply[7] : reply[6];
        const chMismatch = this.channelId && pktChannel !== this.channelId ? ' *** CHANNEL MISMATCH ***' : '';
        debugLog("Cmd from gateway", describeKnxNetIpCommand(command), 'pktCh:', pktChannel, 'ourCh:', this.channelId || 0, chMismatch);
        if (this.channelId && pktChannel !== this.channelId && pktChannel > 0) {
            if (this.orphanedChannels.indexOf(pktChannel) < 0) {
                this.orphanedChannels.push(pktChannel);
                console.warn('KNXNetIP: orphaned channel', pktChannel, '- sending disconnect to free slot (ourCh:', this.channelId, ')');
                this.sendDisconnectFor(pktChannel);
            }
        }
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
            case 522:
                this.gotDisconnectResponse(reply);
                break;
            default:
                debugLog("Unknown msg from gateway", command, describeKnxNetIpCommand(command), reply);
                break;
        }
    }
    gotDisconnectRequest(packet) {
        const reqChannelId = packet[6];
        debugLog("gotDisconnectRequest", 'pktCh:', reqChannelId, 'ourCh:', this.channelId || 0);
        if (reqChannelId === this.channelId)
            this.setState(0);
        const disconnectResponse = [0x06, 0x10, 0x02, 0x0a, 0x00, 0x08, reqChannelId, 0x00];
        this.socket.sendBytes(setLength(disconnectResponse));
    }
    gotDisconnectResponse(packet) {
        const reqChannelId = packet[6];
        const error = packet[7];
        debugLog("gotDisconnectResponse", { reqChannelId, error, errorText: describeKnxNetIpError(error) });
        if (reqChannelId === this.channelId) {
            debugLog("Disconnect acknowledged for channel", this.channelId);
            this.channelId = 0;
            this.disconnectAttempts = 0;
            if (this.disconnectTimer) {
                this.disconnectTimer.cancel();
                this.disconnectTimer = undefined;
            }
            this.setState(0);
            SimpleFile_1.SimpleFile.delete(this.persistedDisconnectFile).catch(() => { });
        }
        if (this.debugLastDisconnectRequest)
            debugLog("lastDisconnectRequest", this.debugLastDisconnectRequest);
    }
    gotConnectionResponse(packet) {
        const error = packet[7];
        if (error)
            throw "Connection response error " + error + ' (' + describeKnxNetIpError(error) + ')';
        this.verifyState(1);
        const prevChannelId = this.channelId || 0;
        this.channelId = packet[6];
        debugLog("gotConnectionResponse: new channelId", this.channelId, prevChannelId ? '(was ' + prevChannelId + ')' : '');
        if (this.lastProbeInitiated) {
            debugLog('probe: connection response received');
            this.probeFailures = 0;
            this.lastProbeInitiated = false;
        }
        this.pendingStartupReads = true;
        this.sendConnectionStateRequest();
    }
    verifyState(expectedState) {
        if (this.state !== expectedState)
            throw "Packet unexpected in state. Expected " + expectedState + ' had ' + this.state;
    }
    gotConnectionStateResponse(packet) {
        const pktChannel = packet[6];
        const error = packet[7];
        debugLog("gotConnectionStateResponse", 'pktCh:', pktChannel, 'ourCh:', this.channelId || 0, error ? 'err:' + describeKnxNetIpError(error) : 'ok');
        if (this.pendingValidationChannelId && pktChannel === this.pendingValidationChannelId) {
            this.pendingValidationChannelId = undefined;
            SimpleFile_1.SimpleFile.delete(this.persistedDisconnectFile).catch(() => { });
            if (!error) {
                console.log('KNXNetIP: reusing persisted channel', pktChannel, 'seqCount', this.pendingValidationSeqCount);
                this.channelId = pktChannel;
                this.seqCount = this.pendingValidationSeqCount;
                this.pendingStartupReads = true;
                this.setState(3);
            }
            else {
                debugLog('Persisted channel', pktChannel, 'no longer valid:', describeKnxNetIpError(error), '- connecting fresh');
                this.sendDisconnectFor(pktChannel);
                this.checkStateSoon(0);
            }
            return;
        }
        if (error)
            throw "Connection state response error " + error + ' (' + describeKnxNetIpError(error) + ')';
        this.verifyState(2);
        this.setState(3);
    }
    gotTunnelResponse(packet) {
        const pktChannel = packet[7];
        const seqId = packet[8];
        const error = packet[9];
        const queue = this.cmdQueue;
        debugLog("gotTunnelResponse", 'pktCh:', pktChannel, 'ourCh:', this.channelId || 0, 'seq:', seqId, queue.length ? queue[0].debugLabel : 'empty queue');
        if (error)
            throw "Tunnel response error " + error + ' (' + describeKnxNetIpError(error) + ')';
        this.verifyState(4);
        if (queue.length && queue[0].seqId === seqId) {
            queue.shift();
            this.setState(3);
        }
    }
    gotTunnelRequest(packet) {
        const pktChannel = packet[7];
        const pktSeq = packet[8];
        debugLog("gotTunnelRequest", 'pktCh:', pktChannel, 'ourCh:', this.channelId || 0, 'seq:', pktSeq);
        this.processInboundTunnelRequest(packet);
        this.sendTunnelAck(pktChannel, pktSeq);
    }
    processInboundTunnelRequest(packet) {
        const cemiStart = 10;
        if (packet.length <= cemiStart + 1)
            return;
        const messageCode = packet[cemiStart];
        if (messageCode !== 0x29) {
            debugLog('gotTunnelRequest: ignoring messageCode', '0x' + messageCode.toString(16));
            return;
        }
        const addInfoLength = packet[cemiStart + 1];
        const frameStart = cemiStart + 2 + addInfoLength;
        if (packet.length <= frameStart + 7)
            return;
        const destAddr = get16bit(packet, frameStart + 4);
        const dataLength = packet[frameStart + 6];
        const apduOffset = frameStart + 7;
        if (packet.length <= apduOffset + 1)
            return;
        const apduFirst = packet[apduOffset];
        const apduSecond = packet[apduOffset + 1];
        const apci = ((apduFirst & 0x03) << 2) | ((apduSecond >> 6) & 0x03);
        debugLog("gotTunnelRequest apci", apci, formatAddr(destAddr));
        if (apci !== 1 && apci !== 2) {
            debugLog('gotTunnelRequest: ignoring apci', apci, '(not GroupValueResponse/Write) for', formatAddr(destAddr));
            return;
        }
        const dynProp = this.statusProps[destAddr];
        if (!dynProp) {
            debugLog('No status prop for address', formatAddr(destAddr));
            return;
        }
        let payload;
        if (dataLength <= 1)
            payload = [apduSecond & 0x3f];
        else {
            if (packet.length <= apduOffset + dataLength)
                return;
            payload = copyBytes(packet, apduOffset + 2, apduOffset + dataLength + 1);
        }
        debugLog('Inbound status payload for', formatAddr(destAddr), payload);
        dynProp.updateCurrentValue(payload);
        debugLog('GroupValue', formatAddr(destAddr), '=', dynProp.getCurrentValue());
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
        this.connectAttempts = 0;
    }
    sendConnectionStateRequest() {
        this.sendConnectionStateFor(this.channelId);
        this.setState(2);
        this.checkStateSoon();
    }
    sendConnectionStateFor(channelId) {
        if (!channelId)
            return;
        const listenerPort = this.socket.listenerPort;
        const connStateReq = [
            0x06, 0x10,
            519 >> 8, 519 & 0xff,
            0x00, 0x10,
            channelId, 0x00,
            0x08, 0x01,
            0, 0, 0, 0,
            listenerPort >> 8, listenerPort & 0xff
        ];
        this.socket.sendBytes(setLength(connStateReq));
    }
    sendDisconnectRequest(reconnect = true, persist = false) {
        if (!this.channelId)
            return;
        const listenerPort = this.socket.listenerPort;
        debugLog("sendDisconnectRequest attempt", this.disconnectAttempts + 1, "for channel", this.channelId);
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
        this.debugLastDisconnectRequest = { when: Date.now(), reconnect };
        if (persist) {
            SimpleFile_1.SimpleFile.write(this.persistedDisconnectFile, JSON.stringify({ channelId: this.channelId, when: this.debugLastDisconnectRequest.when, reconnect })).catch(() => { });
        }
        this.disconnectAttempts = (this.disconnectAttempts || 0) + 1;
        if (this.disconnectTimer)
            this.disconnectTimer.cancel();
        const timer = wait(this.responseTimeout);
        this.disconnectTimer = timer;
        timer.then(() => {
            this.disconnectTimer = undefined;
            if (!this.channelId) {
                this.disconnectAttempts = 0;
                return;
            }
            if (this.disconnectAttempts < this.MAX_DISCONNECT_ATTEMPTS) {
                debugLog("Disconnect not acknowledged, retrying", this.disconnectAttempts + 1);
                this.sendDisconnectRequest(reconnect);
            }
            else {
                debugLog("Disconnect not acknowledged after max attempts, clearing channel and moving to DISCONNECTED", "channel", this.channelId);
                this.channelId = 0;
                this.disconnectAttempts = 0;
                this.setState(0);
            }
        });
        if (reconnect)
            this.checkStateSoon();
    }
    sendDisconnectFor(channelId) {
        if (!channelId)
            return;
        const listenerPort = this.socket.listenerPort;
        const disconnReq = [
            0x06, 0x10,
            521 >> 8, 521 & 0xff,
            0x00, 0x10,
            channelId, 0x00,
            0x08, 0x01,
            0, 0, 0, 0,
            listenerPort >> 8, listenerPort & 0xff
        ];
        try {
            this.socket.sendBytes(setLength(disconnReq));
            debugLog('sendDisconnectFor channel', channelId);
        }
        catch (e) {
            debugLog('sendDisconnectFor: error sending for channel', channelId, e);
        }
    }
    setOnOff(addr1, addr2, addr3, on) {
        const cmd = {
            handler: this.sendOnOff.bind(this),
            destAddr: calcAddr(addr1, addr2, addr3),
            debugLabel: 'setOnOff ' + addr1 + '/' + addr2 + '/' + addr3,
            on: on
        };
        this.queueCmd(cmd);
    }
    setScene(addr1, addr2, addr3, scene) {
        scene = Math.min(Math.max(0, scene), 63);
        const cmd = {
            handler: this.sendGroupValueWrite.bind(this),
            destAddr: calcAddr(addr1, addr2, addr3),
            debugLabel: 'setScene ' + addr1 + '/' + addr2 + '/' + addr3,
            payload: [scene]
        };
        this.queueCmd(cmd);
    }
    requestGroupRead(addr) {
        debugLog('requestGroupRead', formatAddr(addr));
        const cmd = {
            handler: this.sendGroupRead.bind(this),
            destAddr: addr,
            debugLabel: 'GroupValueRead ' + formatAddr(addr),
            isRead: true
        };
        this.queueCmd(cmd);
    }
    sendGroupValueRead(addr1, addr2, addr3) {
        const addr = calcAddr(addr1, addr2, addr3);
        this.requestGroupRead(addr);
    }
    sendGroupRead(cmd) {
        debugLog('sendGroupRead', formatAddr(cmd.destAddr));
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
            0x00
        ]);
    }
    enforceProps() {
        if (this.connected) {
            for (const dynProp of this.dynProps)
                dynProp.sendWantedValue();
        }
    }
    queueCmd(cmd) {
        if (cmd.isRead) {
            const dest = cmd.destAddr;
            for (let i = 0; i < this.cmdQueue.length; ++i) {
                const existing = this.cmdQueue[i];
                if (existing && existing.isRead && existing.destAddr === dest) {
                    debugLog('Duplicate read already queued, skipping', formatAddr(dest));
                    return;
                }
            }
            this.cmdQueue.push(cmd);
        }
        else {
            let insertAt = this.cmdQueue.length;
            while (insertAt > 0 && this.cmdQueue[insertAt - 1].isRead)
                --insertAt;
            this.cmdQueue.splice(insertAt, 0, cmd);
        }
        if (this.cmdQueue.length > 50) {
            debugLog("Excessive command buffering - discarding old");
            this.cmdQueue.shift();
        }
        if (this.state === 3)
            this.sendQueuedCommand();
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
    sendGroupValueWrite(cmd) {
        cmd.seqId = this.seqCount;
        const payload = cmd.payload;
        this.sendTunReq([
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0x11,
            0x00,
            0xbc,
            0xe0,
            0x00,
            0x00,
            cmd.destAddr >> 8, cmd.destAddr & 0xff,
            payload.length + 0x01,
            0x00,
            0x80,
            ...payload
        ]);
    }
    sendTunReq(tunReq) {
        if (!this.socket.enabled) {
            debugLog('socket disabled; dropping tunnel request');
            return;
        }
        if (!this.channelId) {
            debugLog('no channel established; dropping tunnel request');
            return;
        }
        tunReq[0] = 0x06;
        tunReq[1] = 0x10;
        tunReq[2] = 1056 >> 8;
        tunReq[3] = 1056 & 0xff;
        tunReq[6] = 4;
        tunReq[7] = this.channelId;
        tunReq[8] = this.seqCount;
        tunReq[9] = 0;
        debugLog('sendTunReq channel', this.channelId, 'seq', this.seqCount);
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
exports.KNXNetIP_Bidirectional = KNXNetIP_Bidirectional;
__decorate([
    (0, Metadata_1.property)("Connection established", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], KNXNetIP_Bidirectional.prototype, "connected", null);
__decorate([
    (0, Metadata_1.callable)("Send on/off command specified addr1/addr2/addr3"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number, Boolean]),
    __metadata("design:returntype", void 0)
], KNXNetIP_Bidirectional.prototype, "setOnOff", null);
__decorate([
    (0, Metadata_1.callable)("Recall scene for addr1/addr2/addr3"),
    __param(3, (0, Metadata_1.parameter)("Scene 0…63 to recall (may be off-by-1)")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number, Number]),
    __metadata("design:returntype", void 0)
], KNXNetIP_Bidirectional.prototype, "setScene", null);
__decorate([
    (0, Metadata_1.callable)("Send a KNX GroupValueRead to addr1/addr2/addr3 for debugging"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number]),
    __metadata("design:returntype", void 0)
], KNXNetIP_Bidirectional.prototype, "sendGroupValueRead", null);
__decorate([
    (0, Metadata_1.callable)("Send all my dynamic property values"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], KNXNetIP_Bidirectional.prototype, "enforceProps", null);
exports.KNXNetIP_Bidirectional = KNXNetIP_Bidirectional = __decorate([
    (0, Metadata_1.driver)('NetworkUDP', { port: 3671, rcvPort: 32331 }),
    __metadata("design:paramtypes", [Object])
], KNXNetIP_Bidirectional);
class AnalogProp {
    owner;
    analog;
    wantedValue = 0;
    currValue;
    delayedSendTimer;
    cmdAddr;
    statusAddr;
    propName;
    valueCodec;
    constructor(owner, analog) {
        this.owner = owner;
        this.analog = analog;
        this.propName = 'analog_' + analog.name;
        this.cmdAddr = calcAddr(analog.addr[0], analog.addr[1], analog.addr[2]);
        this.statusAddr = calcOptionalAddr(analog.statusAddr);
        this.valueCodec = getAnalogValueCodec(analog.type);
        owner.property(this.propName, {
            type: "Number",
            description: analog.description || this.valueCodec.description,
            min: this.valueCodec.min,
            max: this.valueCodec.max
        }, setValue => {
            if (setValue !== undefined) {
                setValue = clamp(setValue, this.valueCodec.min, this.valueCodec.max);
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
    requestCurrentValue() {
        this.owner.requestGroupRead(this.getStatusAddr());
    }
    getStatusAddr() {
        return this.statusAddr !== undefined ? this.statusAddr : this.cmdAddr;
    }
    updateCurrentValue(rawValue) {
        if (rawValue.length !== this.valueCodec.byteLength)
            return;
        const decoded = this.valueCodec.decode(rawValue);
        this.wantedValue = decoded;
        this.currValue = decoded;
        if (this.delayedSendTimer) {
            this.delayedSendTimer.cancel();
            this.delayedSendTimer = undefined;
        }
        this.owner.changed(this.propName);
    }
    getCurrentValue() { return this.wantedValue; }
    sendWantedValue() {
        const owner = this.owner;
        const cmd = {
            handler: owner.sendGroupValueWrite.bind(owner),
            destAddr: this.cmdAddr,
            debugLabel: this.propName,
            payload: this.valueCodec.encode(this.wantedValue)
        };
        owner.queueCmd(cmd);
    }
}
class DigitalProp {
    owner;
    digital;
    wantedValue = false;
    cmdAddr;
    statusAddr;
    propName;
    constructor(owner, digital) {
        this.owner = owner;
        this.digital = digital;
        this.propName = 'digital_' + digital.name;
        this.cmdAddr = calcAddr(digital.addr[0], digital.addr[1], digital.addr[2]);
        this.statusAddr = calcOptionalAddr(digital.statusAddr);
        owner.property(this.propName, {
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
    requestCurrentValue() {
        this.owner.requestGroupRead(this.getStatusAddr());
    }
    getStatusAddr() {
        return this.statusAddr !== undefined ? this.statusAddr : this.cmdAddr;
    }
    updateCurrentValue(rawValue) {
        this.wantedValue = !!((rawValue[0] || 0) & 0x01);
        this.owner.changed(this.propName);
    }
    getCurrentValue() { return this.wantedValue; }
    sendWantedValue() {
        const owner = this.owner;
        const cmd = {
            handler: owner.sendOnOff.bind(owner),
            destAddr: this.cmdAddr,
            debugLabel: this.propName,
            on: this.wantedValue
        };
        owner.queueCmd(cmd);
    }
}
class SceneProp {
    owner;
    scene;
    wantedValue = 0;
    cmdAddr;
    statusAddr;
    propName;
    maxScene;
    constructor(owner, scene) {
        this.owner = owner;
        this.scene = scene;
        this.propName = 'scene_' + scene.name;
        this.cmdAddr = calcAddr(scene.addr[0], scene.addr[1], scene.addr[2]);
        this.statusAddr = calcOptionalAddr(scene.statusAddr);
        this.maxScene = scene.maxScene !== undefined ? Math.max(1, scene.maxScene) : 63;
        owner.property(this.propName, {
            type: "Number",
            description: scene.description || "Scene recall property",
            min: 0,
            max: this.maxScene
        }, setValue => {
            if (setValue !== undefined) {
                const v = Math.min(Math.max(0, Math.floor(setValue)), this.maxScene);
                this.wantedValue = v;
                const cmd = {
                    handler: this.owner.sendGroupValueWrite.bind(this.owner),
                    destAddr: this.cmdAddr,
                    debugLabel: this.propName,
                    payload: [v]
                };
                this.owner.queueCmd(cmd);
            }
            return this.wantedValue;
        });
    }
    requestCurrentValue() {
        if (this.statusAddr === undefined)
            return;
        this.owner.requestGroupRead(this.getStatusAddr());
    }
    getStatusAddr() {
        return this.statusAddr !== undefined ? this.statusAddr : this.cmdAddr;
    }
    updateCurrentValue(rawValue) {
        if (!rawValue || rawValue.length < 1)
            return;
        this.wantedValue = rawValue[0] & 0x3f;
        this.owner.changed(this.propName);
    }
    getCurrentValue() { return this.wantedValue; }
    sendWantedValue() {
        const cmd = {
            handler: this.owner.sendGroupValueWrite.bind(this.owner),
            destAddr: this.cmdAddr,
            debugLabel: this.propName,
            payload: [this.wantedValue]
        };
        this.owner.queueCmd(cmd);
    }
}
function calcAddr(addr1, addr2, addr3) {
    addr1 = Math.min(Math.max(0, addr1), 31);
    addr2 = Math.min(Math.max(0, addr2), 7);
    addr3 = Math.min(Math.max(0, addr3), 255);
    return addr1 * 2048 + addr2 * 256 + addr3;
}
function calcOptionalAddr(addr) {
    if (!addr || addr.length !== 3)
        return undefined;
    return calcAddr(addr[0], addr[1], addr[2]);
}
function describeKnxNetIpError(error) {
    switch (error) {
        case 0x00: return 'No error';
        case 0x21: return 'Host protocol type not supported';
        case 0x22: return 'Version not supported';
        case 0x23: return 'Sequence number out of order';
        case 0x24: return 'No more connections';
        case 0x25: return 'No more unique connections';
        case 0x26: return 'Data connection error';
        case 0x27: return 'KNX connection error';
        case 0x28: return 'Tunnelling layer not supported';
        case 0x29: return 'Connection type not supported';
        case 0x2d: return 'Connection option not supported';
        case 0x2e: return 'No more tunnelling addresses';
        case 0x2f: return 'Connection request error';
        default: return 'Unknown KNXnet/IP error';
    }
}
function describeKnxNetIpCommand(command) {
    switch (command) {
        case 513: return 'SEARCH_REQUEST';
        case 514: return 'SEARCH_RESPONSE';
        case 515: return 'DESCRIPTION_REQUEST';
        case 516: return 'DESCRIPTION_RESPONSE';
        case 517: return 'CONNECTION_REQUEST';
        case 518: return 'CONNECTION_RESPONSE';
        case 519: return 'CONNECTIONSTATE_REQUEST';
        case 520: return 'CONNECTIONSTATE_RESPONSE';
        case 521: return 'DISCONNECT_REQUEST';
        case 522: return 'DISCONNECT_RESPONSE';
        case 1056: return 'TUNNEL_REQUEST';
        case 1057: return 'TUNNEL_RESPONSE';
        case 784: return 'DEVICE_CONFIGURATION_REQUEST';
        case 785: return 'DEVICE_CONFIGURATION_ACK';
        case 1328: return 'ROUTING_INDICATION';
        default: return 'UNKNOWN_COMMAND';
    }
}
function copyBytes(packet, start, end) {
    const result = [];
    for (let ix = start; ix < end; ++ix)
        result.push(packet[ix]);
    return result;
}
function formatAddr(addr) {
    const addr1 = Math.floor(addr / 2048);
    const addr2 = Math.floor((addr % 2048) / 256);
    const addr3 = addr % 256;
    return addr1 + '/' + addr2 + '/' + addr3;
}
function isSupportedAnalogType(type) {
    const mainType = getMainType(type);
    return mainType === undefined || mainType === 5 || mainType === 6 || mainType === 7 ||
        mainType === 8 || mainType === 9 || mainType === 12 || mainType === 13 || mainType === 14;
}
function getAnalogValueCodec(type) {
    const mainType = getMainType(type);
    switch (mainType) {
        case undefined:
            return {
                byteLength: 1,
                min: 0,
                max: 1,
                description: "An analog channel value (normalized)",
                encode: value => [Math.round(clamp(value, 0, 1) * 255)],
                decode: rawValue => clamp(firstByte(rawValue), 0, 255) / 255
            };
        case 5:
            if (type === "5.001") {
                return {
                    byteLength: 1,
                    min: 0,
                    max: 1,
                    description: "An analog channel value (normalized)",
                    encode: value => [Math.round(clamp(value, 0, 1) * 255)],
                    decode: rawValue => clamp(firstByte(rawValue), 0, 255) / 255
                };
            }
            if (type === "5.003") {
                return {
                    byteLength: 1,
                    min: 0,
                    max: 360,
                    description: "An angle value in degrees",
                    encode: value => [Math.round(clamp(value, 0, 360) * 255 / 360)],
                    decode: rawValue => clamp(firstByte(rawValue), 0, 255) * 360 / 255
                };
            }
            return {
                byteLength: 1,
                min: 0,
                max: 255,
                description: "An unsigned 1-byte analog KNX value",
                encode: value => [Math.round(clamp(value, 0, 255))],
                decode: rawValue => clamp(firstByte(rawValue), 0, 255)
            };
        case 6:
            return {
                byteLength: 1,
                min: -128,
                max: 127,
                description: "A signed 1-byte analog KNX value",
                encode: value => [toUint8(Math.round(clamp(value, -128, 127)))],
                decode: rawValue => toInt8(firstByte(rawValue))
            };
        case 7:
            return makeUnsignedIntCodec(2, "An unsigned 2-byte KNX value");
        case 8:
            return makeSignedIntCodec(2, "A signed 2-byte KNX value");
        case 9:
            return {
                byteLength: 2,
                min: -670760.96,
                max: 670760.96,
                description: "A 2-byte KNX floating-point value",
                encode: value => encodeKnxFloat16(clamp(value, -670760.96, 670760.96)),
                decode: rawValue => decodeKnxFloat16(rawValue)
            };
        case 12:
            return makeUnsignedIntCodec(4, "An unsigned 4-byte KNX value");
        case 13:
            return makeSignedIntCodec(4, "A signed 4-byte KNX value");
        case 14:
            return {
                byteLength: 4,
                min: -3.40282347e+38,
                max: 3.40282347e+38,
                description: "A 4-byte KNX floating-point value",
                encode: value => encodeFloat32(clamp(value, -3.40282347e+38, 3.40282347e+38)),
                decode: rawValue => decodeFloat32(rawValue)
            };
        default:
            return {
                byteLength: 1,
                min: 0,
                max: 255,
                description: "An unsigned 1-byte analog KNX value",
                encode: value => [Math.round(clamp(value, 0, 255))],
                decode: rawValue => clamp(firstByte(rawValue), 0, 255)
            };
    }
}
function getMainType(type) {
    if (!type)
        return undefined;
    return Number(type.split('.')[0]);
}
function makeUnsignedIntCodec(byteLength, description) {
    const bits = byteLength * 8;
    const max = Math.pow(2, bits) - 1;
    return {
        byteLength: byteLength,
        min: 0,
        max: max,
        description: description,
        encode: value => encodeUnsignedBytes(Math.round(clamp(value, 0, max)), byteLength),
        decode: rawValue => decodeUnsignedBytes(rawValue, byteLength)
    };
}
function makeSignedIntCodec(byteLength, description) {
    const bits = byteLength * 8;
    const min = -Math.pow(2, bits - 1);
    const max = Math.pow(2, bits - 1) - 1;
    return {
        byteLength: byteLength,
        min: min,
        max: max,
        description: description,
        encode: value => encodeSignedBytes(Math.round(clamp(value, min, max)), byteLength),
        decode: rawValue => decodeSignedBytes(rawValue, byteLength)
    };
}
function firstByte(rawValue) {
    return rawValue.length ? rawValue[0] : 0;
}
function encodeUnsignedBytes(value, byteLength) {
    const result = [];
    for (let byteIx = byteLength - 1; byteIx >= 0; --byteIx) {
        result[byteIx] = value & 0xff;
        value = Math.floor(value / 256);
    }
    return result;
}
function decodeUnsignedBytes(rawValue, byteLength) {
    let result = 0;
    for (let ix = 0; ix < byteLength; ++ix)
        result = result * 256 + (rawValue[ix] || 0);
    return result;
}
function encodeSignedBytes(value, byteLength) {
    const bits = byteLength * 8;
    if (value < 0)
        value += Math.pow(2, bits);
    return encodeUnsignedBytes(value, byteLength);
}
function decodeSignedBytes(rawValue, byteLength) {
    const bits = byteLength * 8;
    const unsignedValue = decodeUnsignedBytes(rawValue, byteLength);
    const signBit = Math.pow(2, bits - 1);
    return unsignedValue >= signBit ? unsignedValue - Math.pow(2, bits) : unsignedValue;
}
function encodeKnxFloat16(value) {
    if (!value)
        return [0, 0];
    const sign = value < 0 ? 1 : 0;
    let mantissa = Math.round(Math.abs(value) * 100);
    let exponent = 0;
    while (mantissa > 2047 && exponent < 15) {
        mantissa = Math.round(mantissa / 2);
        ++exponent;
    }
    if (sign)
        mantissa = (2048 - mantissa) & 0x07ff;
    const encoded = (sign << 15) | (exponent << 11) | mantissa;
    return [encoded >> 8, encoded & 0xff];
}
function decodeKnxFloat16(rawValue) {
    const data = decodeUnsignedBytes(rawValue, 2);
    const exponent = (data >> 11) & 0x0f;
    let mantissa = data & 0x07ff;
    if (mantissa & 0x0400)
        mantissa -= 0x0800;
    return 0.01 * mantissa * Math.pow(2, exponent);
}
function encodeFloat32(value) {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setFloat32(0, value, false);
    return [view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)];
}
function decodeFloat32(rawValue) {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    for (let ix = 0; ix < 4; ++ix)
        view.setUint8(ix, rawValue[ix] || 0);
    return view.getFloat32(0, false);
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function toUint8(value) {
    return value & 0xff;
}
function toInt8(value) {
    return value > 127 ? value - 256 : value;
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
    if (!debugLoggingEnabled)
        return;
    const parts = [];
    for (let i = 0; i < args.length; ++i)
        parts.push(String(args[i]));
    console.log(parts.join(' '));
}
