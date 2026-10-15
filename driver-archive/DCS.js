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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DCS = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
const ScriptBase_1 = require("../system_lib/ScriptBase");
let DCS = class DCS extends Driver_1.Driver {
    socket;
    rcvMsg;
    mTimePos = new TimeFlow(0, 0);
    lastTimeReceived;
    mOutputEnabled = false;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.setMaxLineLength(1024);
        socket.autoConnect(true);
        socket.subscribe('bytesReceived', (sender, msg) => {
            this.gotData(msg.rawData);
        });
    }
    newTimePosition(timeInSeconds) {
        log("Timeline position", timeInSeconds);
        if (this.lastTimeReceived != timeInSeconds) {
            this.mTimePos = new TimeFlow(Math.round(timeInSeconds * 1000), this.mOutputEnabled ? 1 : 0);
            this.lastTimeReceived = timeInSeconds;
            this.changed('timePos');
        }
    }
    get timePos() {
        return this.mTimePos;
    }
    setOutputEnabled(ena) {
        if (this.mOutputEnabled != ena) {
            this.mTimePos = new TimeFlow(this.mTimePos.currentTime, ena ? 1 : 0);
            this.mOutputEnabled = ena;
            this.changed('timePos');
            this.changed('outputEnabled');
        }
    }
    get outputEnabled() {
        return this.mOutputEnabled;
    }
    gotData(data) {
        if (!this.rcvMsg) {
            this.rcvMsg = new IncomingMessage(data);
            data = null;
        }
        else {
            this.rcvMsg.appendFrom(data);
            if (!data.length)
                data = null;
        }
        if (this.rcvMsg.isComplete()) {
            this.processCommand(this.rcvMsg);
            this.rcvMsg = undefined;
            if (data)
                console.error("Got leftover data");
        }
    }
    processCommand(msg) {
        if (msg.getMsgType1() != 2) {
            console.error("Unexpected MsgType1", msg.getMsgType1());
            return;
        }
        let request;
        log("Got msg total length", msg.getPacketSize());
        switch (msg.getMsgType2()) {
            case 0:
                request = new AnnounceRequest(msg);
                break;
            case 2:
                request = new GetNewLeaseRequest(msg);
                break;
            case 4:
                request = new GetStatusRequest(msg);
                break;
            case 6:
                request = new SetRplLocationRequest(msg);
                break;
            case 8:
                request = new SetOutputModeRequest(msg);
                break;
            case 10:
                request = new UpdateTimelineRequest(msg);
                break;
            default:
                console.error("Unimplemented MsgType2", msg.getMsgType2());
                return;
        }
        log("Processing", msg.getMsgType2());
        request.process(this);
    }
    send(msg) {
        this.socket.sendBytes(msg.finalize());
    }
};
exports.DCS = DCS;
__decorate([
    (0, Metadata_1.property)("Current time position"),
    __metadata("design:type", TimeFlow),
    __metadata("design:paramtypes", [])
], DCS.prototype, "timePos", null);
__decorate([
    (0, Metadata_1.property)("Data outpout enabled"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [])
], DCS.prototype, "outputEnabled", null);
exports.DCS = DCS = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 4170 }),
    __metadata("design:paramtypes", [Object])
], DCS);
class Request {
    id;
    constructor(id) {
        this.id = id;
    }
}
class UpdateTimelineRequest extends Request {
    playoutId;
    timelinePosition;
    editRate;
    extensions;
    constructor(msg) {
        super(msg.get4bytes());
        this.playoutId = msg.get4bytes();
        this.timelinePosition = msg.get8bytes();
        const rateNum = msg.get8bytes();
        const rateDenom = msg.get8bytes();
        this.editRate = rateNum / rateDenom;
        let numExts = msg.get4bytes();
        if (numExts) {
            this.extensions = [];
            while (numExts--) {
                const extType = msg.get4bytes();
                const extLen = msg.get4bytes();
                this.extensions.push({
                    type: extType,
                    data: msg.getBytes(extLen)
                });
            }
        }
    }
    process(owner) {
        owner.newTimePosition(this.timelinePosition / this.editRate);
        owner.send(new SimpleResponse(this, 11));
    }
}
const DEBUG = true;
function log(...messages) {
    if (DEBUG)
        console.info(messages);
}
class Message {
    static kHdrLength = 16;
    static kMsgStart = this.kHdrLength + 4;
    msg;
    constructor(msg) {
        this.msg = ScriptBase_1.ScriptBase.makeJSArray(msg);
    }
}
class OutgoingMessage extends Message {
    constructor(msgType1, msgType2) {
        const msg = [];
        super(msg);
        msg.push(0x06);
        msg.push(0x0e);
        msg.push(0x2b);
        msg.push(0x34);
        msg.push(0x02);
        msg.push(0x05);
        msg.push(0x01);
        msg.push(0x01);
        msg.push(0x02);
        msg.push(0x07);
        msg.push(0x02);
        msg.push(msgType1);
        msg.push(msgType2);
        msg.push(0, 0, 0);
        msg.push(0, 0, 0, 0);
    }
    push4bytes(value) {
        this.pushNumBytes(value, 4);
    }
    push8bytes(value) {
        this.pushNumBytes(value, 8);
    }
    pushStatusResponse(statusResponseKey = 0, text = "") {
        this.pushByte(statusResponseKey);
        this.pushString(text);
    }
    pushString(str, omitLength) {
        const numChars = str.length;
        if (!omitLength)
            this.push4bytes(numChars);
        for (let cix = 0; cix < numChars; ++cix)
            this.pushByte(str.charCodeAt(cix));
    }
    pushTrailingString(str) {
        this.pushString(str, true);
    }
    pushNumBytes(value, byteCount) {
        let shifts = 8 * (byteCount - 1);
        while (byteCount--) {
            this.msg.push((value >> shifts) & 0xff);
            shifts -= 8;
        }
    }
    pushByte(byte) {
        if (byte < 0 || byte > 0xff)
            throw "Byte out of range";
        this.msg.push(byte);
    }
    setNumBytes(value, byteCount, atOffs) {
        let shifts = 8 * (byteCount - 1);
        while (byteCount--) {
            this.msg[atOffs++] = ((value >> shifts) & 0xff);
            shifts -= 8;
        }
    }
    finalize() {
        this.setNumBytes(0x83, 1, Message.kHdrLength);
        this.setNumBytes(this.msg.length - Message.kHdrLength - 4, 3, Message.kHdrLength + 1);
        return this.msg;
    }
}
class IncomingMessage extends Message {
    readPos = Message.kHdrLength;
    packetSize;
    constructor(msg) {
        super(msg);
    }
    getPacketSize() {
        return this.packetSize;
    }
    getMsgType1() {
        return this.msg[11];
    }
    getMsgType2() {
        return this.msg[12];
    }
    getReadPos() {
        return this.readPos;
    }
    get4bytes() {
        return this.getNum(4);
    }
    getBerLength() {
        return this.get4bytes() & 0xffffff;
    }
    get8bytes() {
        return this.getNum(8);
    }
    getNum(byteCount) {
        let result = 0;
        while (byteCount--) {
            result = result << 8;
            result += this.msg[this.readPos++];
        }
        return result;
    }
    getBytes(numBytes) {
        const bytes = this.msg.slice(this.readPos, this.readPos + numBytes);
        this.readPos += numBytes;
        return bytes;
    }
    getStr(numBytes) {
        if (numBytes) {
            const strBytes = this.getBytes(numBytes);
            return String.fromCharCode(...strBytes);
        }
        return "";
    }
    getTrailingString() {
        return this.getStr(this.getPacketSize() - this.getReadPos());
    }
    getRequiredLength() {
        if (this.msg.length < Message.kHdrLength + 4)
            return 0;
        const pktSize = this.getBerLength();
        this.readPos = Message.kHdrLength;
        const totalLength = pktSize + Message.kHdrLength + 4;
        if (totalLength > 2048)
            throw "Packet too large - perhaps weäre out of sync";
        return totalLength;
    }
    isComplete() {
        const bytesSoFar = this.msg.length;
        const requiredLength = this.getRequiredLength();
        if (requiredLength) {
            if (bytesSoFar === requiredLength) {
                this.packetSize = this.getBerLength() + Message.kHdrLength + 4;
                return true;
            }
            if (bytesSoFar > requiredLength)
                throw "IncomingMessage overflow";
        }
        return false;
    }
    appendFrom(moreData) {
        const requiredLength = this.getRequiredLength();
        if (!requiredLength) {
            this.tryAppend(Message.kHdrLength + 4 - this.msg.length, moreData);
            const requiredLength = this.getRequiredLength();
            if (!requiredLength)
                return;
        }
    }
    tryAppend(count, moreData) {
        const moreDataLen = moreData.length;
        if (count >= moreDataLen) {
            const toAppend = moreData.splice(0, count);
            this.msg = this.msg.concat(toAppend);
        }
    }
}
class SimpleResponse extends OutgoingMessage {
    constructor(req, responseCode) {
        super(2, responseCode);
        this.push4bytes(req.id);
        this.pushStatusResponse();
    }
}
class AnnounceRequest extends Request {
    systemTime;
    dcsDeviceDescription;
    constructor(msg) {
        super(msg.get4bytes());
        this.systemTime = msg.get8bytes();
        this.dcsDeviceDescription = msg.getTrailingString();
    }
    process(owner) {
        owner.send(new AnnounceResponse(this));
    }
}
class AnnounceResponse extends OutgoingMessage {
    static kDescr = "PIXILAB DCS Driver";
    constructor(req) {
        super(2, 1);
        this.push4bytes(req.id);
        this.push8bytes(req.systemTime);
        this.pushString(AnnounceResponse.kDescr);
        this.pushStatusResponse();
    }
}
class GetNewLeaseRequest extends Request {
    duration;
    constructor(msg) {
        super(msg.get4bytes());
        this.duration = msg.get4bytes();
    }
    process(owner) {
        owner.send(new GetNewLeaseResponse(this));
    }
}
class GetNewLeaseResponse extends OutgoingMessage {
    constructor(req) {
        super(2, 3);
        this.push4bytes(req.id);
        this.push4bytes(req.duration);
        this.pushStatusResponse();
    }
}
class GetStatusRequest extends Request {
    constructor(msg) {
        super(msg.get4bytes());
    }
    process(owner) {
        owner.send(new SimpleResponse(this, 5));
    }
}
class SetRplLocationRequest extends Request {
    playoutId;
    resourceUrl;
    constructor(msg) {
        super(msg.get4bytes());
        this.playoutId = msg.get4bytes();
        this.resourceUrl = msg.getTrailingString();
    }
    process(owner) {
        log("Resource URL", this.resourceUrl);
        owner.send(new SimpleResponse(this, 7));
    }
}
class SetOutputModeRequest extends Request {
    enabled;
    constructor(msg) {
        super(msg.get4bytes());
        this.enabled = !!msg.getNum(1);
    }
    process(owner) {
        owner.setOutputEnabled(this.enabled);
        log("SetOutputMode", this.enabled);
        owner.send(new SimpleResponse(this, 9));
    }
}
