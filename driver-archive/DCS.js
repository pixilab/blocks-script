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
define(["require", "exports", "../system_lib/Driver", "../system_lib/Metadata", "../system_lib/ScriptBase"], function (require, exports, Driver_1, Metadata_1, ScriptBase_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DCS = void 0;
    var DCS = exports.DCS = (function (_super) {
        __extends(DCS, _super);
        function DCS(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mTimePos = new TimeFlow(0, 0);
            _this.mOutputEnabled = false;
            socket.setMaxLineLength(1024);
            socket.autoConnect(true);
            socket.subscribe('bytesReceived', function (sender, msg) {
                _this.gotData(msg.rawData);
            });
            return _this;
        }
        DCS.prototype.newTimePosition = function (timeInSeconds) {
            log("Timeline position", timeInSeconds);
            if (this.lastTimeReceived != timeInSeconds) {
                this.mTimePos = new TimeFlow(Math.round(timeInSeconds * 1000), this.mOutputEnabled ? 1 : 0);
                this.lastTimeReceived = timeInSeconds;
                this.changed('timePos');
            }
        };
        Object.defineProperty(DCS.prototype, "timePos", {
            get: function () {
                return this.mTimePos;
            },
            enumerable: false,
            configurable: true
        });
        DCS.prototype.setOutputEnabled = function (ena) {
            if (this.mOutputEnabled != ena) {
                this.mTimePos = new TimeFlow(this.mTimePos.currentTime, ena ? 1 : 0);
                this.mOutputEnabled = ena;
                this.changed('timePos');
                this.changed('outputEnabled');
            }
        };
        Object.defineProperty(DCS.prototype, "outputEnabled", {
            get: function () {
                return this.mOutputEnabled;
            },
            enumerable: false,
            configurable: true
        });
        DCS.prototype.gotData = function (data) {
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
        };
        DCS.prototype.processCommand = function (msg) {
            if (msg.getMsgType1() != 2) {
                console.error("Unexpected MsgType1", msg.getMsgType1());
                return;
            }
            var request;
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
        };
        DCS.prototype.send = function (msg) {
            this.socket.sendBytes(msg.finalize());
        };
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
        DCS = __decorate([
            (0, Metadata_1.driver)('NetworkTCP', { port: 4170 }),
            __metadata("design:paramtypes", [Object])
        ], DCS);
        return DCS;
    }(Driver_1.Driver));
    var Request = (function () {
        function Request(id) {
            this.id = id;
        }
        return Request;
    }());
    var UpdateTimelineRequest = (function (_super) {
        __extends(UpdateTimelineRequest, _super);
        function UpdateTimelineRequest(msg) {
            var _this = _super.call(this, msg.get4bytes()) || this;
            _this.playoutId = msg.get4bytes();
            _this.timelinePosition = msg.get8bytes();
            var rateNum = msg.get8bytes();
            var rateDenom = msg.get8bytes();
            _this.editRate = rateNum / rateDenom;
            var numExts = msg.get4bytes();
            if (numExts) {
                _this.extensions = [];
                while (numExts--) {
                    var extType = msg.get4bytes();
                    var extLen = msg.get4bytes();
                    _this.extensions.push({
                        type: extType,
                        data: msg.getBytes(extLen)
                    });
                }
            }
            return _this;
        }
        UpdateTimelineRequest.prototype.process = function (owner) {
            owner.newTimePosition(this.timelinePosition / this.editRate);
            owner.send(new SimpleResponse(this, 11));
        };
        return UpdateTimelineRequest;
    }(Request));
    var DEBUG = true;
    function log() {
        var messages = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            messages[_i] = arguments[_i];
        }
        if (DEBUG)
            console.info(messages);
    }
    var Message = (function () {
        function Message(msg) {
            this.msg = ScriptBase_1.ScriptBase.makeJSArray(msg);
        }
        var _a;
        _a = Message;
        Message.kHdrLength = 16;
        Message.kMsgStart = _a.kHdrLength + 4;
        return Message;
    }());
    var OutgoingMessage = (function (_super) {
        __extends(OutgoingMessage, _super);
        function OutgoingMessage(msgType1, msgType2) {
            var _this = this;
            var msg = [];
            _this = _super.call(this, msg) || this;
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
            return _this;
        }
        OutgoingMessage.prototype.push4bytes = function (value) {
            this.pushNumBytes(value, 4);
        };
        OutgoingMessage.prototype.push8bytes = function (value) {
            this.pushNumBytes(value, 8);
        };
        OutgoingMessage.prototype.pushStatusResponse = function (statusResponseKey, text) {
            if (statusResponseKey === void 0) { statusResponseKey = 0; }
            if (text === void 0) { text = ""; }
            this.pushByte(statusResponseKey);
            this.pushString(text);
        };
        OutgoingMessage.prototype.pushString = function (str, omitLength) {
            var numChars = str.length;
            if (!omitLength)
                this.push4bytes(numChars);
            for (var cix = 0; cix < numChars; ++cix)
                this.pushByte(str.charCodeAt(cix));
        };
        OutgoingMessage.prototype.pushTrailingString = function (str) {
            this.pushString(str, true);
        };
        OutgoingMessage.prototype.pushNumBytes = function (value, byteCount) {
            var shifts = 8 * (byteCount - 1);
            while (byteCount--) {
                this.msg.push((value >> shifts) & 0xff);
                shifts -= 8;
            }
        };
        OutgoingMessage.prototype.pushByte = function (byte) {
            if (byte < 0 || byte > 0xff)
                throw "Byte out of range";
            this.msg.push(byte);
        };
        OutgoingMessage.prototype.setNumBytes = function (value, byteCount, atOffs) {
            var shifts = 8 * (byteCount - 1);
            while (byteCount--) {
                this.msg[atOffs++] = ((value >> shifts) & 0xff);
                shifts -= 8;
            }
        };
        OutgoingMessage.prototype.finalize = function () {
            this.setNumBytes(0x83, 1, Message.kHdrLength);
            this.setNumBytes(this.msg.length - Message.kHdrLength - 4, 3, Message.kHdrLength + 1);
            return this.msg;
        };
        return OutgoingMessage;
    }(Message));
    var IncomingMessage = (function (_super) {
        __extends(IncomingMessage, _super);
        function IncomingMessage(msg) {
            var _this = _super.call(this, msg) || this;
            _this.readPos = Message.kHdrLength;
            return _this;
        }
        IncomingMessage.prototype.getPacketSize = function () {
            return this.packetSize;
        };
        IncomingMessage.prototype.getMsgType1 = function () {
            return this.msg[11];
        };
        IncomingMessage.prototype.getMsgType2 = function () {
            return this.msg[12];
        };
        IncomingMessage.prototype.getReadPos = function () {
            return this.readPos;
        };
        IncomingMessage.prototype.get4bytes = function () {
            return this.getNum(4);
        };
        IncomingMessage.prototype.getBerLength = function () {
            return this.get4bytes() & 0xffffff;
        };
        IncomingMessage.prototype.get8bytes = function () {
            return this.getNum(8);
        };
        IncomingMessage.prototype.getNum = function (byteCount) {
            var result = 0;
            while (byteCount--) {
                result = result << 8;
                result += this.msg[this.readPos++];
            }
            return result;
        };
        IncomingMessage.prototype.getBytes = function (numBytes) {
            var bytes = this.msg.slice(this.readPos, this.readPos + numBytes);
            this.readPos += numBytes;
            return bytes;
        };
        IncomingMessage.prototype.getStr = function (numBytes) {
            if (numBytes) {
                var strBytes = this.getBytes(numBytes);
                return String.fromCharCode.apply(String, strBytes);
            }
            return "";
        };
        IncomingMessage.prototype.getTrailingString = function () {
            return this.getStr(this.getPacketSize() - this.getReadPos());
        };
        IncomingMessage.prototype.getRequiredLength = function () {
            if (this.msg.length < Message.kHdrLength + 4)
                return 0;
            var pktSize = this.getBerLength();
            this.readPos = Message.kHdrLength;
            var totalLength = pktSize + Message.kHdrLength + 4;
            if (totalLength > 2048)
                throw "Packet too large - perhaps weäre out of sync";
            return totalLength;
        };
        IncomingMessage.prototype.isComplete = function () {
            var bytesSoFar = this.msg.length;
            var requiredLength = this.getRequiredLength();
            if (requiredLength) {
                if (bytesSoFar === requiredLength) {
                    this.packetSize = this.getBerLength() + Message.kHdrLength + 4;
                    return true;
                }
                if (bytesSoFar > requiredLength)
                    throw "IncomingMessage overflow";
            }
            return false;
        };
        IncomingMessage.prototype.appendFrom = function (moreData) {
            var requiredLength = this.getRequiredLength();
            if (!requiredLength) {
                this.tryAppend(Message.kHdrLength + 4 - this.msg.length, moreData);
                var requiredLength_1 = this.getRequiredLength();
                if (!requiredLength_1)
                    return;
            }
        };
        IncomingMessage.prototype.tryAppend = function (count, moreData) {
            var moreDataLen = moreData.length;
            if (count >= moreDataLen) {
                var toAppend = moreData.splice(0, count);
                this.msg = this.msg.concat(toAppend);
            }
        };
        return IncomingMessage;
    }(Message));
    var SimpleResponse = (function (_super) {
        __extends(SimpleResponse, _super);
        function SimpleResponse(req, responseCode) {
            var _this = _super.call(this, 2, responseCode) || this;
            _this.push4bytes(req.id);
            _this.pushStatusResponse();
            return _this;
        }
        return SimpleResponse;
    }(OutgoingMessage));
    var AnnounceRequest = (function (_super) {
        __extends(AnnounceRequest, _super);
        function AnnounceRequest(msg) {
            var _this = _super.call(this, msg.get4bytes()) || this;
            _this.systemTime = msg.get8bytes();
            _this.dcsDeviceDescription = msg.getTrailingString();
            return _this;
        }
        AnnounceRequest.prototype.process = function (owner) {
            owner.send(new AnnounceResponse(this));
        };
        return AnnounceRequest;
    }(Request));
    var AnnounceResponse = (function (_super) {
        __extends(AnnounceResponse, _super);
        function AnnounceResponse(req) {
            var _this = _super.call(this, 2, 1) || this;
            _this.push4bytes(req.id);
            _this.push8bytes(req.systemTime);
            _this.pushString(AnnounceResponse.kDescr);
            _this.pushStatusResponse();
            return _this;
        }
        AnnounceResponse.kDescr = "PIXILAB DCS Driver";
        return AnnounceResponse;
    }(OutgoingMessage));
    var GetNewLeaseRequest = (function (_super) {
        __extends(GetNewLeaseRequest, _super);
        function GetNewLeaseRequest(msg) {
            var _this = _super.call(this, msg.get4bytes()) || this;
            _this.duration = msg.get4bytes();
            return _this;
        }
        GetNewLeaseRequest.prototype.process = function (owner) {
            owner.send(new GetNewLeaseResponse(this));
        };
        return GetNewLeaseRequest;
    }(Request));
    var GetNewLeaseResponse = (function (_super) {
        __extends(GetNewLeaseResponse, _super);
        function GetNewLeaseResponse(req) {
            var _this = _super.call(this, 2, 3) || this;
            _this.push4bytes(req.id);
            _this.push4bytes(req.duration);
            _this.pushStatusResponse();
            return _this;
        }
        return GetNewLeaseResponse;
    }(OutgoingMessage));
    var GetStatusRequest = (function (_super) {
        __extends(GetStatusRequest, _super);
        function GetStatusRequest(msg) {
            return _super.call(this, msg.get4bytes()) || this;
        }
        GetStatusRequest.prototype.process = function (owner) {
            owner.send(new SimpleResponse(this, 5));
        };
        return GetStatusRequest;
    }(Request));
    var SetRplLocationRequest = (function (_super) {
        __extends(SetRplLocationRequest, _super);
        function SetRplLocationRequest(msg) {
            var _this = _super.call(this, msg.get4bytes()) || this;
            _this.playoutId = msg.get4bytes();
            _this.resourceUrl = msg.getTrailingString();
            return _this;
        }
        SetRplLocationRequest.prototype.process = function (owner) {
            log("Resource URL", this.resourceUrl);
            owner.send(new SimpleResponse(this, 7));
        };
        return SetRplLocationRequest;
    }(Request));
    var SetOutputModeRequest = (function (_super) {
        __extends(SetOutputModeRequest, _super);
        function SetOutputModeRequest(msg) {
            var _this = _super.call(this, msg.get4bytes()) || this;
            _this.enabled = !!msg.getNum(1);
            return _this;
        }
        SetOutputModeRequest.prototype.process = function (owner) {
            owner.setOutputEnabled(this.enabled);
            log("SetOutputMode", this.enabled);
            owner.send(new SimpleResponse(this, 9));
        };
        return SetOutputModeRequest;
    }(Request));
});
