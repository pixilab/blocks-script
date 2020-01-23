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
    var PROTOCOL_VERSION = 'ProfilNetV2.0';
    var MESSAGE_LINE_BREAK = '\r\n';
    var LABEL_ADR = "ADR";
    var LABEL_CDE = "CDE";
    var LABEL_IDCDE = "IDCDE";
    var LABEL_IDDEST = "IDDEST";
    var LABEL_IDDOM = "IDDOM";
    var LABEL_IDSSDOM = "IDSSDOM";
    var LABEL_IDEVT = "IDEVT";
    var LABEL_IDMSG = "IDMSG";
    var LABEL_IDSEND = "IDSEND";
    var LABEL_LANG = "LANG";
    var LABEL_LANGUE = "LANGUE";
    var LABEL_MSTSTATUS = "MSTSTATUS";
    var LABEL_NUMDIFF = "NUMDIFF";
    var LABEL_NUMZONE = "NUMZONE";
    var LABEL_OFFSET = "OFFSET";
    var LABEL_OPT = "OPT";
    var LABEL_ORDRE = "ORDRE";
    var LABEL_PLAYERID = "PLAYERID";
    var LABEL_PORT = "PORT";
    var LABEL_RELTMPS = "RELTMPS";
    var LABEL_RELTMPNS = "RELTMPNS";
    var LABEL_RESULT = "RESULT";
    var LABEL_TSSEC = "TSSEC";
    var LABEL_TSNSEC = "TSNSEC";
    var LABEL_TSRXSEC = "TSRXSEC";
    var LABEL_TSRXNSEC = "TSRXNSEC";
    var LABEL_TSTXSEC = "TSTXSEC";
    var LABEL_TSTXNSEC = "TSTXNSEC";
    var LABEL_UNICAST = "UNICAST";
    var PORT_UNICAST = 5023;
    var EmZ_IP = (function (_super) {
        __extends(EmZ_IP, _super);
        function EmZ_IP(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this._lastEventID = 0;
            _this._idDom = 0;
            socket.subscribe('textReceived', function (sender, message) {
                _this.onMessage(message.text);
            });
            var messageUnicastSetup = new EmZIPUnicastSetup();
            messageUnicastSetup.ValueIDDOM = _this._idDom;
            messageUnicastSetup.ValueADR = '192.168.1.10';
            messageUnicastSetup.ValuePORT = socket.listenerPort;
            _this.sendMessage(messageUnicastSetup);
            return _this;
        }
        EmZ_IP.prototype.playZone = function (zone) {
            var simpleControl = new EmZIPSimpleControl();
            simpleControl.ValueIDDOM = this._idDom;
            simpleControl.ValueORDRE = EmZIPSimpleControl.ORDRE_STOP;
            simpleControl.ValueNUMZONE = 0;
            simpleControl.ValueOFFSET = 0;
            this.sendMessage(simpleControl);
            simpleControl = new EmZIPSimpleControl();
            simpleControl.ValueIDDOM = this._idDom;
            simpleControl.ValueORDRE = EmZIPSimpleControl.ORDRE_PLAY_ZONE;
            simpleControl.ValueNUMZONE = zone;
            simpleControl.ValueOFFSET = 0;
            this.sendMessage(simpleControl);
        };
        EmZ_IP.prototype.sendText = function (text) {
            return this.socket.sendText(text);
        };
        Object.defineProperty(EmZ_IP.prototype, "lastEventID", {
            get: function () {
                return this._lastEventID;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZ_IP.prototype, "lastEventPlayerID", {
            get: function () {
                return this._lastEventPlayerID;
            },
            enumerable: true,
            configurable: true
        });
        EmZ_IP.prototype.sendMessage = function (message) {
            this.socket.sendText(message.ToString() + '\0');
        };
        EmZ_IP.prototype.onMessage = function (message) {
            var emZIPMessage = EmZIPMessage.Parse(message);
            switch (emZIPMessage.ValueCDE) {
                case EmZIPMessage.MESSAGE_TYPE_REQUEST_FOR_DELAY:
                    break;
                case EmZIPMessage.MESSAGE_TYPE_DELAY_ANSWER:
                    break;
                case EmZIPMessage.MESSAGE_TYPE_EVENT:
                    this.ProcessEvent(emZIPMessage);
                    break;
                case EmZIPMessage.MESSAGE_TYPE_ACKNOWLEDGMENT:
                    break;
                default:
                    console.info("received unsupported message type: " + emZIPMessage.ToString());
                    break;
            }
        };
        EmZ_IP.prototype.ProcessEvent = function (eventMessage) {
            this._lastEventID++;
            this._lastEventPlayerID = eventMessage.ValuePLAYERID;
            this.changed("lastEventID");
            this.changed("lastEventPlayerID");
        };
        return EmZ_IP;
    }(Driver_1.Driver));
    __decorate([
        Meta.callable("Play Zone"),
        __param(0, Meta.parameter("Zone to play")),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number]),
        __metadata("design:returntype", void 0)
    ], EmZ_IP.prototype, "playZone", null);
    __decorate([
        Meta.callable("Send raw command to device"),
        __param(0, Meta.parameter("What to send")),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String]),
        __metadata("design:returntype", void 0)
    ], EmZ_IP.prototype, "sendText", null);
    __decorate([
        Meta.property("ID of last received event. (Also: counter for received events)"),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [])
    ], EmZ_IP.prototype, "lastEventID", null);
    __decorate([
        Meta.property("ID of player triggering last received event"),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [])
    ], EmZ_IP.prototype, "lastEventPlayerID", null);
    EmZ_IP = __decorate([
        Meta.driver('NetworkUDP', { port: PORT_UNICAST }),
        __metadata("design:paramtypes", [Object])
    ], EmZ_IP);
    exports.EmZ_IP = EmZ_IP;
    var EmZIPMessage = (function () {
        function EmZIPMessage(message) {
            this._fields = {};
            this._splitByLinebreak = '\n';
            this._splitByEqual = '=';
            if (message)
                this.ParseMessage(message);
        }
        Object.defineProperty(EmZIPMessage.prototype, "ValueIDDOM", {
            get: function () {
                return this.GetNumberValue(LABEL_IDDOM);
            },
            set: function (value) {
                this.SetNumberValue(LABEL_IDDOM, value);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPMessage.prototype, "ValueCDE", {
            get: function () {
                return this.GetNumberValue(LABEL_CDE);
            },
            enumerable: true,
            configurable: true
        });
        EmZIPMessage.prototype.GetNumberValue = function (label) {
            var value = this._fields[label];
            return value ? parseInt(value) : -1;
        };
        EmZIPMessage.prototype.SetNumberValue = function (label, value) {
            var valueString = value;
            this._fields[label] = String(valueString);
        };
        EmZIPMessage.prototype.GetValue = function (label) {
            return this._fields[label];
        };
        EmZIPMessage.prototype.SetValue = function (label, value) {
            this._fields[label] = String(value);
        };
        EmZIPMessage.prototype.ParseMessage = function (message) {
            var fields = message.split(this._splitByLinebreak);
            for (var i = 0; i < fields.length; i++) {
                var labelAndValue = fields[i].trim().split(this._splitByEqual);
                if (labelAndValue.length == 2) {
                    var label = labelAndValue[0].trim();
                    var value = labelAndValue[1].trim();
                    this._fields[label] = value;
                }
            }
        };
        EmZIPMessage.prototype.RenderMessageField = function (label) {
            return label + "=" + this.GetValue(label) + MESSAGE_LINE_BREAK;
        };
        EmZIPMessage.Parse = function (message) {
            var emZIPMessage = new EmZIPMessage(message);
            switch (emZIPMessage.ValueCDE) {
                case EmZIPMessage.MESSAGE_TYPE_EVENT:
                    return new EmZIPEvent(message);
                case EmZIPMessage.MESSAGE_TYPE_REQUEST_FOR_DELAY:
                    return new EmZIPRequestForDelay(message);
                case EmZIPMessage.MESSAGE_TYPE_DELAY_ANSWER:
                    return new EmZIPDelayAnswer(message);
                case EmZIPMessage.MESSAGE_TYPE_CONTROL:
                    return new EmZIPControl(message);
                case EmZIPMessage.MESSAGE_TYPE_SIMPLE_CONTROL:
                    return new EmZIPSimpleControl(message);
                case EmZIPMessage.MESSAGE_TYPE_UNICAST_SETUP:
                    return new EmZIPUnicastSetup(message);
                case EmZIPMessage.MESSAGE_TYPE_ACKNOWLEDGMENT:
                    return new EmZIPAcknowledgment(message);
            }
            return emZIPMessage;
        };
        EmZIPMessage.prototype.ToString = function () {
            return PROTOCOL_VERSION + MESSAGE_LINE_BREAK +
                this.RenderMessageField(LABEL_IDDOM) +
                this.RenderMessageField(LABEL_CDE);
        };
        return EmZIPMessage;
    }());
    EmZIPMessage.MESSAGE_TYPE_REQUEST_FOR_DELAY = 1;
    EmZIPMessage.MESSAGE_TYPE_CONTROL = 4;
    EmZIPMessage.MESSAGE_TYPE_SIMPLE_CONTROL = 5;
    EmZIPMessage.MESSAGE_TYPE_EVENT = 8;
    EmZIPMessage.MESSAGE_TYPE_DELAY_ANSWER = 9;
    EmZIPMessage.MESSAGE_TYPE_UNICAST_SETUP = 32;
    EmZIPMessage.MESSAGE_TYPE_ACKNOWLEDGMENT = 64;
    var EmZIPEvent = (function (_super) {
        __extends(EmZIPEvent, _super);
        function EmZIPEvent(message) {
            return _super.call(this, message) || this;
        }
        Object.defineProperty(EmZIPEvent.prototype, "ValueIDEVT", {
            get: function () { return this.GetNumberValue(LABEL_IDEVT); },
            set: function (value) { this.SetNumberValue(LABEL_IDEVT, value); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPEvent.prototype, "ValueNUMZONE", {
            get: function () { return this.GetNumberValue(LABEL_NUMZONE); },
            set: function (value) { this.SetNumberValue(LABEL_NUMZONE, value); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPEvent.prototype, "ValuePLAYERID", {
            get: function () { return this.GetNumberValue(LABEL_PLAYERID); },
            set: function (value) { this.SetNumberValue(LABEL_PLAYERID, value); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPEvent.prototype, "ValueLANGUE", {
            get: function () { return this.GetNumberValue(LABEL_LANGUE); },
            set: function (value) { this.SetNumberValue(LABEL_LANGUE, value); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPEvent.prototype, "ValueOPT", {
            get: function () { return this.GetNumberValue(LABEL_OPT); },
            set: function (value) { this.SetNumberValue(LABEL_OPT, value); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPEvent.prototype, "ValueOFFSET", {
            get: function () { return this.GetNumberValue(LABEL_OFFSET); },
            set: function (value) { this.SetNumberValue(LABEL_OFFSET, value); },
            enumerable: true,
            configurable: true
        });
        return EmZIPEvent;
    }(EmZIPMessage));
    var EmZIPRequestForDelay = (function (_super) {
        __extends(EmZIPRequestForDelay, _super);
        function EmZIPRequestForDelay(message) {
            return _super.call(this, message) || this;
        }
        Object.defineProperty(EmZIPRequestForDelay.prototype, "ValueIDSEND", {
            get: function () { return this._fields[LABEL_IDSEND]; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPRequestForDelay.prototype, "ValueIDMSG", {
            get: function () { return this.GetNumberValue(LABEL_IDMSG); },
            enumerable: true,
            configurable: true
        });
        return EmZIPRequestForDelay;
    }(EmZIPMessage));
    var EmZIPDelayAnswer = (function (_super) {
        __extends(EmZIPDelayAnswer, _super);
        function EmZIPDelayAnswer(message) {
            var _this = _super.call(this, message) || this;
            if (!message)
                _this.SetValue(LABEL_CDE, EmZIPMessage.MESSAGE_TYPE_DELAY_ANSWER);
            return _this;
        }
        Object.defineProperty(EmZIPDelayAnswer.prototype, "ValueIDDEST", {
            get: function () { return this._fields[LABEL_IDDEST]; },
            set: function (value) { this._fields[LABEL_IDDEST] = value; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPDelayAnswer.prototype, "ValueIDMSG", {
            get: function () { return this.GetNumberValue(LABEL_IDMSG); },
            set: function (value) { this.SetNumberValue(LABEL_IDMSG, value); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPDelayAnswer.prototype, "ValueTSRXSEC", {
            get: function () { return this.GetNumberValue(LABEL_TSRXSEC); },
            set: function (value) { this.SetNumberValue(LABEL_TSRXSEC, value); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPDelayAnswer.prototype, "ValueTSRXNSEC", {
            get: function () { return this.GetNumberValue(LABEL_TSRXNSEC); },
            set: function (value) { this.SetNumberValue(LABEL_TSRXNSEC, value); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPDelayAnswer.prototype, "ValueTSTXSEC", {
            get: function () { return this.GetNumberValue(LABEL_TSTXSEC); },
            set: function (value) { this.SetNumberValue(LABEL_TSTXSEC, value); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPDelayAnswer.prototype, "ValueTSTXNSEC", {
            get: function () { return this.GetNumberValue(LABEL_TSTXNSEC); },
            set: function (value) { this.SetNumberValue(LABEL_TSTXNSEC, value); },
            enumerable: true,
            configurable: true
        });
        EmZIPDelayAnswer.prototype.ToString = function () {
            return _super.prototype.ToString.call(this) +
                this.RenderMessageField(LABEL_IDDEST) +
                this.RenderMessageField(LABEL_IDMSG) +
                this.RenderMessageField(LABEL_TSRXSEC) +
                this.RenderMessageField(LABEL_TSRXNSEC) +
                this.RenderMessageField(LABEL_TSTXSEC) +
                this.RenderMessageField(LABEL_TSTXNSEC) +
                MESSAGE_LINE_BREAK;
        };
        return EmZIPDelayAnswer;
    }(EmZIPMessage));
    var EmZIPSimpleControl = (function (_super) {
        __extends(EmZIPSimpleControl, _super);
        function EmZIPSimpleControl(message) {
            var _this = _super.call(this, message) || this;
            if (!message)
                _this.SetValue(LABEL_CDE, EmZIPMessage.MESSAGE_TYPE_SIMPLE_CONTROL);
            return _this;
        }
        Object.defineProperty(EmZIPSimpleControl.prototype, "ValueORDRE", {
            get: function () { return this.GetNumberValue(LABEL_ORDRE); },
            set: function (value) { this.SetNumberValue(LABEL_ORDRE, value); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPSimpleControl.prototype, "ValueNUMZONE", {
            get: function () { return this.GetNumberValue(LABEL_NUMZONE); },
            set: function (value) { this.SetNumberValue(LABEL_NUMZONE, value); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPSimpleControl.prototype, "ValueOFFSET", {
            get: function () { return this.GetNumberValue(LABEL_OFFSET); },
            set: function (value) { this.SetNumberValue(LABEL_OFFSET, value); },
            enumerable: true,
            configurable: true
        });
        EmZIPSimpleControl.prototype.ToString = function () {
            return _super.prototype.ToString.call(this) +
                this.RenderMessageField(LABEL_ORDRE) +
                this.RenderMessageField(LABEL_NUMZONE) +
                this.RenderMessageField(LABEL_OFFSET) +
                MESSAGE_LINE_BREAK;
        };
        return EmZIPSimpleControl;
    }(EmZIPMessage));
    EmZIPSimpleControl.ORDRE_STOP = 1;
    EmZIPSimpleControl.ORDRE_PLAY_CURRENT = 2;
    EmZIPSimpleControl.ORDRE_PLAY_ZONE = 3;
    EmZIPSimpleControl.ORDRE_SET_ZONE = 4;
    EmZIPSimpleControl.ORDRE_SYNC_ZONE = 5;
    var EmZIPControl = (function (_super) {
        __extends(EmZIPControl, _super);
        function EmZIPControl(message) {
            var _this = _super.call(this, message) || this;
            if (!message)
                _this.SetValue(LABEL_CDE, EmZIPMessage.MESSAGE_TYPE_CONTROL);
            return _this;
        }
        return EmZIPControl;
    }(EmZIPMessage));
    var EmZIPUnicastSetup = (function (_super) {
        __extends(EmZIPUnicastSetup, _super);
        function EmZIPUnicastSetup(message) {
            var _this = _super.call(this, message) || this;
            if (!message) {
                _this.SetValue(LABEL_CDE, EmZIPMessage.MESSAGE_TYPE_UNICAST_SETUP);
                _this.ValueUNICAST = EmZIPUnicastSetup.CDEUNICAST_INIT;
            }
            return _this;
        }
        Object.defineProperty(EmZIPUnicastSetup.prototype, "ValueUNICAST", {
            get: function () { return this.GetNumberValue(LABEL_UNICAST); },
            set: function (value) { this.SetNumberValue(LABEL_UNICAST, value); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPUnicastSetup.prototype, "ValueADR", {
            get: function () { return this.GetValue(LABEL_ADR); },
            set: function (value) { this.SetValue(LABEL_ADR, value); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPUnicastSetup.prototype, "ValuePORT", {
            get: function () { return this.GetNumberValue(LABEL_PORT); },
            set: function (value) { this.SetNumberValue(LABEL_PORT, value); },
            enumerable: true,
            configurable: true
        });
        EmZIPUnicastSetup.prototype.ToString = function () {
            return _super.prototype.ToString.call(this) +
                this.RenderMessageField(LABEL_UNICAST) +
                this.RenderMessageField(LABEL_ADR) +
                this.RenderMessageField(LABEL_PORT) +
                MESSAGE_LINE_BREAK;
        };
        return EmZIPUnicastSetup;
    }(EmZIPMessage));
    EmZIPUnicastSetup.CDEUNICAST_INIT = 1;
    var EmZIPAcknowledgment = (function (_super) {
        __extends(EmZIPAcknowledgment, _super);
        function EmZIPAcknowledgment(message) {
            var _this = _super.call(this, message) || this;
            if (!message)
                _this.SetValue(LABEL_CDE, EmZIPMessage.MESSAGE_TYPE_ACKNOWLEDGMENT);
            return _this;
        }
        EmZIPAcknowledgment.prototype.ToString = function () {
            return _super.prototype.ToString.call(this) +
                this.RenderMessageField(LABEL_IDCDE) +
                this.RenderMessageField(LABEL_RESULT) +
                this.RenderMessageField(LABEL_ADR) +
                this.RenderMessageField(LABEL_PORT) +
                MESSAGE_LINE_BREAK;
        };
        return EmZIPAcknowledgment;
    }(EmZIPMessage));
});
