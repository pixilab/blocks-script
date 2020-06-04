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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.EmZ_IP = void 0;
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
    var SERVER_IP = '10.0.2.10';
    var MAX_WAIT_FOR_ACKNOWLEDGEMENT = 500;
    var LOG_DEBUG = false;
    var EmZ_IP = (function (_super) {
        __extends(EmZ_IP, _super);
        function EmZ_IP(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this._lastEventID = 0;
            _this._lastEventPlayerID = -1;
            _this._idDom = 0;
            _this.messageQueue = [];
            _this.currentSentMessage = null;
            _this.sendResolver = null;
            socket.subscribe('textReceived', function (_sender, message) {
                _this.onMessage(message.text);
            });
            var messageUnicastSetup = new EmZIPUnicastSetup(_this._idDom, SERVER_IP, socket.listenerPort);
            _this.queueMessage(messageUnicastSetup);
            return _this;
        }
        EmZ_IP.prototype.playZone = function (zone) {
            var simpleControl = new EmZIPSimpleControl(this._idDom, EmZIPSimpleControl.ORDRE_STOP);
            this.queueMessage(simpleControl);
            simpleControl = new EmZIPSimpleControl(this._idDom, EmZIPSimpleControl.ORDRE_PLAY_ZONE, zone);
            this.queueMessage(simpleControl);
        };
        EmZ_IP.prototype.sendText = function (text) {
            return this.socket.sendText(text);
        };
        Object.defineProperty(EmZ_IP.prototype, "lastEventID", {
            get: function () {
                return this._lastEventID;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(EmZ_IP.prototype, "lastEventPlayerID", {
            get: function () {
                return this._lastEventPlayerID;
            },
            enumerable: false,
            configurable: true
        });
        EmZ_IP.prototype.sendMessage = function (message) {
            var _this = this;
            if (LOG_DEBUG)
                console.info(this.socket.name + ': sending ' + EmZIPMessage.CDEToEnglish(message.ValueCDE));
            this.socket.sendText(message.ToString() + '\0');
            this.currentSentMessage = message;
            return new Promise(function (resolve, reject) {
                _this.sendResolver = resolve;
                wait(MAX_WAIT_FOR_ACKNOWLEDGEMENT).then(function () {
                    reject('send timed out');
                });
            });
        };
        EmZ_IP.prototype.queueMessage = function (message) {
            this.messageQueue.push(message);
            this.workMessageQueue();
        };
        EmZ_IP.prototype.workMessageQueue = function () {
            var _this = this;
            if (this.messageQueue.length > 0 &&
                this.currentSentMessage == null) {
                this.sendMessage(this.messageQueue.shift()).then(function () {
                    _this.workMessageQueue();
                }).catch(function (error) {
                    console.warn(error);
                });
            }
        };
        EmZ_IP.prototype.onMessage = function (message) {
            var emZIPMessage = EmZIPMessage.Parse(message);
            switch (emZIPMessage.ValueCDE) {
                case EmZIPMessage.MESSAGE_TYPE_ACKNOWLEDGMENT:
                    this.ProcessAcknowledgement(emZIPMessage);
                    break;
                case EmZIPMessage.MESSAGE_TYPE_DELAY_ANSWER:
                    break;
                case EmZIPMessage.MESSAGE_TYPE_EVENT:
                    this.ProcessEvent(emZIPMessage);
                    break;
                case EmZIPMessage.MESSAGE_TYPE_REQUEST_FOR_DELAY:
                    break;
                default:
                    console.info("received unsupported message type: " + emZIPMessage.ToString());
                    break;
            }
        };
        EmZ_IP.prototype.ProcessEvent = function (eventMessage) {
            if (LOG_DEBUG)
                console.log('received event: event id : ' + eventMessage.ValueIDEVT + ' language: ' + eventMessage.ValueLANGUE + ' opt: ' + eventMessage.ValueOPT);
            this._lastEventID++;
            this._lastEventPlayerID = eventMessage.ValuePLAYERID;
            this.changed("lastEventID");
            this.changed("lastEventPlayerID");
        };
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
        return EmZ_IP;
    }(Driver_1.Driver));
    exports.EmZ_IP = EmZ_IP;
    var EmZIPMessage = (function () {
        function EmZIPMessage(iddom, cde) {
            this._fields = {};
            this.SetNumberValue(LABEL_IDDOM, iddom);
            this.SetNumberValue(LABEL_CDE, cde);
        }
        Object.defineProperty(EmZIPMessage.prototype, "ValueIDDOM", {
            get: function () {
                return this.GetNumberValue(LABEL_IDDOM);
            },
            set: function (value) {
                this.SetNumberValue(LABEL_IDDOM, value);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(EmZIPMessage.prototype, "ValueCDE", {
            get: function () {
                return this.GetNumberValue(LABEL_CDE);
            },
            enumerable: false,
            configurable: true
        });
        EmZIPMessage.prototype.GetNumberValue = function (label) {
            return EmZIPMessage.GetNumber(label, this._fields);
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
        EmZIPMessage.CDEToEnglish = function (cde) {
            switch (cde) {
                case EmZIPMessage.MESSAGE_TYPE_EVENT:
                    return 'event';
                case EmZIPMessage.MESSAGE_TYPE_REQUEST_FOR_DELAY:
                    return 'request for delay';
                case EmZIPMessage.MESSAGE_TYPE_DELAY_ANSWER:
                    return 'delay answer';
                case EmZIPMessage.MESSAGE_TYPE_CONTROL:
                    return 'control';
                case EmZIPMessage.MESSAGE_TYPE_SIMPLE_CONTROL:
                    return 'simple control';
                case EmZIPMessage.MESSAGE_TYPE_UNICAST_SETUP:
                    return 'unicast setup';
                case EmZIPMessage.MESSAGE_TYPE_ACKNOWLEDGMENT:
                    return 'acknowledgement';
            }
            return 'unknown';
        };
        EmZIPMessage.GetNumber = function (label, dict) {
            var value = dict[label];
            return value ? parseInt(value) : -1;
        };
        EmZIPMessage.GetString = function (label, dict) {
            return dict[label];
        };
        EmZIPMessage.prototype.ParseMessage = function (message) {
            this._fields = EmZIPMessage.ParseMessageIntoDict(message);
        };
        EmZIPMessage.ParseMessageIntoDict = function (message) {
            var dict = {};
            var fields = message.split(EmZIPMessage.splitByLinebreak);
            for (var i = 0; i < fields.length; i++) {
                var labelAndValue = fields[i].trim().split(EmZIPMessage.splitByEqual);
                if (labelAndValue.length == 2) {
                    var label = labelAndValue[0].trim();
                    var value = labelAndValue[1].trim();
                    dict[label] = value;
                }
            }
            return dict;
        };
        EmZIPMessage.prototype.RenderMessageField = function (label) {
            return label + "=" + this.GetValue(label) + MESSAGE_LINE_BREAK;
        };
        EmZIPMessage.Parse = function (message) {
            var dict = this.ParseMessageIntoDict(message);
            var iddom = this.GetNumber(LABEL_IDDOM, dict);
            var cde = this.GetNumber(LABEL_CDE, dict);
            switch (cde) {
                case EmZIPMessage.MESSAGE_TYPE_EVENT:
                    return new EmZIPEvent(iddom, this.GetNumber(LABEL_IDEVT, dict), this.GetNumber(LABEL_NUMZONE, dict), this.GetNumber(LABEL_PLAYERID, dict), this.GetNumber(LABEL_LANGUE, dict), this.GetNumber(LABEL_OPT, dict), this.GetNumber(LABEL_OFFSET, dict));
                case EmZIPMessage.MESSAGE_TYPE_REQUEST_FOR_DELAY:
                    return new EmZIPRequestForDelay(iddom, this.GetString(LABEL_IDSEND, dict), this.GetNumber(LABEL_IDMSG, dict));
                case EmZIPMessage.MESSAGE_TYPE_DELAY_ANSWER:
                    return new EmZIPDelayAnswer(iddom, this.GetString(LABEL_IDDEST, dict), this.GetNumber(LABEL_IDMSG, dict), this.GetNumber(LABEL_TSRXSEC, dict), this.GetNumber(LABEL_TSRXNSEC, dict), this.GetNumber(LABEL_TSTXSEC, dict), this.GetNumber(LABEL_TSTXNSEC, dict));
                case EmZIPMessage.MESSAGE_TYPE_CONTROL:
                    return new EmZIPControl(iddom, this.GetNumber(LABEL_TSSEC, dict), this.GetNumber(LABEL_TSNSEC, dict), this.GetString(LABEL_MSTSTATUS, dict), this.GetString(LABEL_IDSSDOM, dict), this.GetNumber(LABEL_NUMDIFF, dict), this.GetNumber(LABEL_RELTMPS, dict), this.GetNumber(LABEL_RELTMPNS, dict));
                case EmZIPMessage.MESSAGE_TYPE_SIMPLE_CONTROL:
                    return new EmZIPSimpleControl(iddom, this.GetNumber(LABEL_ORDRE, dict), this.GetNumber(LABEL_NUMZONE, dict), this.GetNumber(LABEL_OFFSET, dict));
                case EmZIPMessage.MESSAGE_TYPE_UNICAST_SETUP:
                    return new EmZIPUnicastSetup(iddom, this.GetString(LABEL_ADR, dict), this.GetNumber(LABEL_PORT, dict));
                case EmZIPMessage.MESSAGE_TYPE_ACKNOWLEDGMENT:
                    return new EmZIPAcknowledgment(iddom, this.GetNumber(LABEL_IDCDE, dict), this.GetNumber(LABEL_RESULT, dict), this.GetString(LABEL_ADR, dict), this.GetNumber(LABEL_PORT, dict));
            }
            return new EmZIPMessage(iddom, cde);
        };
        EmZIPMessage.prototype.ToString = function () {
            return PROTOCOL_VERSION + MESSAGE_LINE_BREAK +
                this.RenderMessageField(LABEL_IDDOM) +
                this.RenderMessageField(LABEL_CDE);
        };
        EmZIPMessage.MESSAGE_TYPE_REQUEST_FOR_DELAY = 1;
        EmZIPMessage.MESSAGE_TYPE_CONTROL = 4;
        EmZIPMessage.MESSAGE_TYPE_SIMPLE_CONTROL = 5;
        EmZIPMessage.MESSAGE_TYPE_EVENT = 8;
        EmZIPMessage.MESSAGE_TYPE_DELAY_ANSWER = 9;
        EmZIPMessage.MESSAGE_TYPE_UNICAST_SETUP = 32;
        EmZIPMessage.MESSAGE_TYPE_ACKNOWLEDGMENT = 64;
        return EmZIPMessage;
    }());
    var EmZIPEvent = (function (_super) {
        __extends(EmZIPEvent, _super);
        function EmZIPEvent(iddom, idevt, numzone, playerid, langue, opt, offset) {
            var _this = _super.call(this, iddom, EmZIPMessage.MESSAGE_TYPE_EVENT) || this;
            _this.SetNumberValue(LABEL_IDEVT, idevt);
            _this.SetNumberValue(LABEL_NUMZONE, numzone);
            _this.SetNumberValue(LABEL_PLAYERID, playerid);
            _this.SetNumberValue(LABEL_LANGUE, langue);
            _this.SetNumberValue(LABEL_OPT, opt);
            _this.SetNumberValue(LABEL_OFFSET, offset);
            return _this;
        }
        Object.defineProperty(EmZIPEvent.prototype, "ValueIDEVT", {
            get: function () { return this.GetNumberValue(LABEL_IDEVT); },
            set: function (value) { this.SetNumberValue(LABEL_IDEVT, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(EmZIPEvent.prototype, "ValueNUMZONE", {
            get: function () { return this.GetNumberValue(LABEL_NUMZONE); },
            set: function (value) { this.SetNumberValue(LABEL_NUMZONE, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(EmZIPEvent.prototype, "ValuePLAYERID", {
            get: function () { return this.GetNumberValue(LABEL_PLAYERID); },
            set: function (value) { this.SetNumberValue(LABEL_PLAYERID, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(EmZIPEvent.prototype, "ValueLANGUE", {
            get: function () { return this.GetNumberValue(LABEL_LANGUE); },
            set: function (value) { this.SetNumberValue(LABEL_LANGUE, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(EmZIPEvent.prototype, "ValueOPT", {
            get: function () { return this.GetNumberValue(LABEL_OPT); },
            set: function (value) { this.SetNumberValue(LABEL_OPT, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(EmZIPEvent.prototype, "ValueOFFSET", {
            get: function () { return this.GetNumberValue(LABEL_OFFSET); },
            set: function (value) { this.SetNumberValue(LABEL_OFFSET, value); },
            enumerable: false,
            configurable: true
        });
        return EmZIPEvent;
    }(EmZIPMessage));
    var EmZIPRequestForDelay = (function (_super) {
        __extends(EmZIPRequestForDelay, _super);
        function EmZIPRequestForDelay(iddom, idsend, idmsg) {
            var _this = _super.call(this, iddom, EmZIPMessage.MESSAGE_TYPE_REQUEST_FOR_DELAY) || this;
            _this.SetValue(LABEL_IDSEND, idsend);
            _this.SetNumberValue(LABEL_IDMSG, idmsg);
            return _this;
        }
        Object.defineProperty(EmZIPRequestForDelay.prototype, "ValueIDSEND", {
            get: function () { return this._fields[LABEL_IDSEND]; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(EmZIPRequestForDelay.prototype, "ValueIDMSG", {
            get: function () { return this.GetNumberValue(LABEL_IDMSG); },
            enumerable: false,
            configurable: true
        });
        return EmZIPRequestForDelay;
    }(EmZIPMessage));
    var EmZIPDelayAnswer = (function (_super) {
        __extends(EmZIPDelayAnswer, _super);
        function EmZIPDelayAnswer(iddom, iddest, idmsg, tsrxsec, tsrxnsec, tstxsec, tstxnsec) {
            var _this = _super.call(this, iddom, EmZIPMessage.MESSAGE_TYPE_DELAY_ANSWER) || this;
            _this.SetValue(LABEL_IDDEST, iddest);
            _this.SetNumberValue(LABEL_IDMSG, idmsg);
            _this.SetNumberValue(LABEL_TSRXSEC, tsrxsec);
            _this.SetNumberValue(LABEL_TSRXNSEC, tsrxnsec);
            _this.SetNumberValue(LABEL_TSTXSEC, tstxsec);
            _this.SetNumberValue(LABEL_TSTXNSEC, tstxnsec);
            return _this;
        }
        Object.defineProperty(EmZIPDelayAnswer.prototype, "ValueIDDEST", {
            get: function () { return this._fields[LABEL_IDDEST]; },
            set: function (value) { this._fields[LABEL_IDDEST] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(EmZIPDelayAnswer.prototype, "ValueIDMSG", {
            get: function () { return this.GetNumberValue(LABEL_IDMSG); },
            set: function (value) { this.SetNumberValue(LABEL_IDMSG, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(EmZIPDelayAnswer.prototype, "ValueTSRXSEC", {
            get: function () { return this.GetNumberValue(LABEL_TSRXSEC); },
            set: function (value) { this.SetNumberValue(LABEL_TSRXSEC, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(EmZIPDelayAnswer.prototype, "ValueTSRXNSEC", {
            get: function () { return this.GetNumberValue(LABEL_TSRXNSEC); },
            set: function (value) { this.SetNumberValue(LABEL_TSRXNSEC, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(EmZIPDelayAnswer.prototype, "ValueTSTXSEC", {
            get: function () { return this.GetNumberValue(LABEL_TSTXSEC); },
            set: function (value) { this.SetNumberValue(LABEL_TSTXSEC, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(EmZIPDelayAnswer.prototype, "ValueTSTXNSEC", {
            get: function () { return this.GetNumberValue(LABEL_TSTXNSEC); },
            set: function (value) { this.SetNumberValue(LABEL_TSTXNSEC, value); },
            enumerable: false,
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
        function EmZIPSimpleControl(iddom, ordre, numzone, offset) {
            if (numzone === void 0) { numzone = 0; }
            if (offset === void 0) { offset = 0; }
            var _this = _super.call(this, iddom, EmZIPMessage.MESSAGE_TYPE_SIMPLE_CONTROL) || this;
            _this.SetNumberValue(LABEL_ORDRE, ordre);
            _this.SetNumberValue(LABEL_NUMZONE, numzone);
            _this.SetNumberValue(LABEL_OFFSET, offset);
            return _this;
        }
        Object.defineProperty(EmZIPSimpleControl.prototype, "ValueORDRE", {
            get: function () { return this.GetNumberValue(LABEL_ORDRE); },
            set: function (value) { this.SetNumberValue(LABEL_ORDRE, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(EmZIPSimpleControl.prototype, "ValueNUMZONE", {
            get: function () { return this.GetNumberValue(LABEL_NUMZONE); },
            set: function (value) { this.SetNumberValue(LABEL_NUMZONE, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(EmZIPSimpleControl.prototype, "ValueOFFSET", {
            get: function () { return this.GetNumberValue(LABEL_OFFSET); },
            set: function (value) { this.SetNumberValue(LABEL_OFFSET, value); },
            enumerable: false,
            configurable: true
        });
        EmZIPSimpleControl.prototype.ToString = function () {
            return _super.prototype.ToString.call(this) +
                this.RenderMessageField(LABEL_ORDRE) +
                this.RenderMessageField(LABEL_NUMZONE) +
                this.RenderMessageField(LABEL_OFFSET) +
                MESSAGE_LINE_BREAK;
        };
        EmZIPSimpleControl.ORDRE_STOP = 1;
        EmZIPSimpleControl.ORDRE_PLAY_CURRENT = 2;
        EmZIPSimpleControl.ORDRE_PLAY_ZONE = 3;
        EmZIPSimpleControl.ORDRE_SET_ZONE = 4;
        EmZIPSimpleControl.ORDRE_SYNC_ZONE = 5;
        return EmZIPSimpleControl;
    }(EmZIPMessage));
    var EmZIPControl = (function (_super) {
        __extends(EmZIPControl, _super);
        function EmZIPControl(iddom, tssec, tsnsec, msstatus, idssdom, numdiff, reltmps, reltmpns) {
            var _this = _super.call(this, iddom, EmZIPMessage.MESSAGE_TYPE_CONTROL) || this;
            _this.SetNumberValue(LABEL_TSSEC, tssec);
            _this.SetNumberValue(LABEL_TSNSEC, tsnsec);
            _this.SetValue(LABEL_MSTSTATUS, msstatus);
            _this.SetValue(LABEL_IDSSDOM, idssdom);
            _this.SetNumberValue(LABEL_NUMDIFF, numdiff);
            _this.SetNumberValue(LABEL_RELTMPS, reltmps);
            _this.SetNumberValue(LABEL_RELTMPNS, reltmpns);
            return _this;
        }
        Object.defineProperty(EmZIPControl.prototype, "ValueTSSEC", {
            get: function () { return this.GetNumberValue(LABEL_TSSEC); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPControl.prototype, "ValueTSNSEC", {
            get: function () { return this.GetNumberValue(LABEL_TSNSEC); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPControl.prototype, "ValueMSSTATUS", {
            get: function () { return this.GetValue(LABEL_MSTSTATUS); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPControl.prototype, "ValueIDSSDOM", {
            get: function () { return this.GetValue(LABEL_IDSSDOM); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPControl.prototype, "ValueRELTMPS", {
            get: function () { return this.GetNumberValue(LABEL_RELTMPS); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPControl.prototype, "ValueRELTMPNS", {
            get: function () { return this.GetNumberValue(LABEL_RELTMPNS); },
            enumerable: true,
            configurable: true
        });
        EmZIPControl.prototype.ToString = function () {
            return _super.prototype.ToString.call(this) +
                this.RenderMessageField(LABEL_TSSEC) +
                this.RenderMessageField(LABEL_TSNSEC) +
                this.RenderMessageField(LABEL_MSTSTATUS) +
                this.RenderMessageField(LABEL_IDSSDOM) +
                this.RenderMessageField(LABEL_NUMDIFF) +
                this.RenderMessageField(LABEL_RELTMPS) +
                this.RenderMessageField(LABEL_RELTMPNS) +
                MESSAGE_LINE_BREAK;
        };
        EmZIPControl.MSSTATUS_PLAY = 'PLAY';
        EmZIPControl.MSSTATUS_STOP = 'STOP';
        EmZIPControl.MSSTATUS_PAUSE = 'PAUSE';
        return EmZIPControl;
    }(EmZIPMessage));
    var EmZIPUnicastSetup = (function (_super) {
        __extends(EmZIPUnicastSetup, _super);
        function EmZIPUnicastSetup(iddom, adr, port) {
            var _this = _super.call(this, iddom, EmZIPMessage.MESSAGE_TYPE_UNICAST_SETUP) || this;
            _this.SetNumberValue(LABEL_UNICAST, EmZIPUnicastSetup.CDEUNICAST_INIT);
            _this.SetValue(LABEL_ADR, adr);
            _this.SetNumberValue(LABEL_PORT, port);
            return _this;
        }
        Object.defineProperty(EmZIPUnicastSetup.prototype, "ValueUNICAST", {
            get: function () { return this.GetNumberValue(LABEL_UNICAST); },
            set: function (value) { this.SetNumberValue(LABEL_UNICAST, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(EmZIPUnicastSetup.prototype, "ValueADR", {
            get: function () { return this.GetValue(LABEL_ADR); },
            set: function (value) { this.SetValue(LABEL_ADR, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(EmZIPUnicastSetup.prototype, "ValuePORT", {
            get: function () { return this.GetNumberValue(LABEL_PORT); },
            set: function (value) { this.SetNumberValue(LABEL_PORT, value); },
            enumerable: false,
            configurable: true
        });
        EmZIPUnicastSetup.prototype.ToString = function () {
            return _super.prototype.ToString.call(this) +
                this.RenderMessageField(LABEL_UNICAST) +
                this.RenderMessageField(LABEL_ADR) +
                this.RenderMessageField(LABEL_PORT) +
                MESSAGE_LINE_BREAK;
        };
        EmZIPUnicastSetup.CDEUNICAST_INIT = 1;
        return EmZIPUnicastSetup;
    }(EmZIPMessage));
    var EmZIPAcknowledgment = (function (_super) {
        __extends(EmZIPAcknowledgment, _super);
        function EmZIPAcknowledgment(iddom, idcde, result, adr, port) {
            var _this = _super.call(this, iddom, EmZIPMessage.MESSAGE_TYPE_ACKNOWLEDGMENT) || this;
            _this.SetNumberValue(LABEL_IDCDE, idcde);
            _this.SetNumberValue(LABEL_RESULT, result);
            _this.SetValue(LABEL_ADR, adr);
            _this.SetNumberValue(LABEL_PORT, port);
            return _this;
        }
        Object.defineProperty(EmZIPAcknowledgment.prototype, "ValueIDCDE", {
            get: function () { return this.GetNumberValue(LABEL_IDCDE); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPAcknowledgment.prototype, "ValueRESULT", {
            get: function () { return this.GetNumberValue(LABEL_RESULT); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPAcknowledgment.prototype, "ValueADR", {
            get: function () { return this._fields[LABEL_ADR]; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EmZIPAcknowledgment.prototype, "ValuePORT", {
            get: function () { return this.GetNumberValue(LABEL_PORT); },
            enumerable: true,
            configurable: true
        });
        EmZIPAcknowledgment.prototype.ToString = function () {
            return _super.prototype.ToString.call(this) +
                this.RenderMessageField(LABEL_IDCDE) +
                this.RenderMessageField(LABEL_RESULT) +
                this.RenderMessageField(LABEL_ADR) +
                this.RenderMessageField(LABEL_PORT) +
                MESSAGE_LINE_BREAK;
        };
        EmZIPAcknowledgment.RESULT_OKAY = 6;
        EmZIPAcknowledgment.RESULT_ERROR = 21;
        return EmZIPAcknowledgment;
    }(EmZIPMessage));
});
