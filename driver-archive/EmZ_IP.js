"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmZ_IP = void 0;
const Driver_1 = require("../system_lib/Driver");
const Meta = __importStar(require("../system_lib/Metadata"));
const PROTOCOL_VERSION = 'ProfilNetV2.0';
const MESSAGE_LINE_BREAK = '\r\n';
const LABEL_ADR = "ADR";
const LABEL_CDE = "CDE";
const LABEL_IDCDE = "IDCDE";
const LABEL_IDDEST = "IDDEST";
const LABEL_IDDOM = "IDDOM";
const LABEL_IDSSDOM = "IDSSDOM";
const LABEL_IDEVT = "IDEVT";
const LABEL_IDMSG = "IDMSG";
const LABEL_IDSEND = "IDSEND";
const LABEL_LANGUE = "LANGUE";
const LABEL_MSTSTATUS = "MSTSTATUS";
const LABEL_NUMDIFF = "NUMDIFF";
const LABEL_NUMZONE = "NUMZONE";
const LABEL_OFFSET = "OFFSET";
const LABEL_OPT = "OPT";
const LABEL_ORDRE = "ORDRE";
const LABEL_PLAYERID = "PLAYERID";
const LABEL_PORT = "PORT";
const LABEL_RELTMPS = "RELTMPS";
const LABEL_RELTMPNS = "RELTMPNS";
const LABEL_RESULT = "RESULT";
const LABEL_TSSEC = "TSSEC";
const LABEL_TSNSEC = "TSNSEC";
const LABEL_TSRXSEC = "TSRXSEC";
const LABEL_TSRXNSEC = "TSRXNSEC";
const LABEL_TSTXSEC = "TSTXSEC";
const LABEL_TSTXNSEC = "TSTXNSEC";
const LABEL_UNICAST = "UNICAST";
const PORT_UNICAST = 5023;
const SERVER_IP = '10.0.2.10';
const MAX_WAIT_FOR_ACKNOWLEDGEMENT = 500;
const LOG_DEBUG = false;
let EmZ_IP = class EmZ_IP extends Driver_1.Driver {
    socket;
    _lastEventID = 0;
    _lastEventPlayerID = -1;
    _idDom = 0;
    messageQueue = [];
    currentSentMessage = null;
    sendResolver = null;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.subscribe('textReceived', (_sender, message) => {
            this.onMessage(message.text);
        });
        var messageUnicastSetup = new EmZIPUnicastSetup(this._idDom, SERVER_IP, socket.listenerPort);
        this.queueMessage(messageUnicastSetup);
    }
    playZone(zone) {
        var simpleControl = new EmZIPSimpleControl(this._idDom, EmZIPSimpleControl.ORDRE_STOP);
        this.queueMessage(simpleControl);
        simpleControl = new EmZIPSimpleControl(this._idDom, EmZIPSimpleControl.ORDRE_PLAY_ZONE, zone);
        this.queueMessage(simpleControl);
    }
    sendText(text) {
        return this.socket.sendText(text);
    }
    get lastEventID() {
        return this._lastEventID;
    }
    get lastEventPlayerID() {
        return this._lastEventPlayerID;
    }
    sendMessage(message) {
        if (LOG_DEBUG)
            console.info(this.socket.name + ': sending ' + EmZIPMessage.CDEToEnglish(message.ValueCDE));
        this.socket.sendText(message.ToString() + '\0');
        this.currentSentMessage = message;
        return new Promise((resolve, reject) => {
            this.sendResolver = resolve;
            wait(MAX_WAIT_FOR_ACKNOWLEDGEMENT).then(() => {
                reject('send timed out');
            });
        });
    }
    queueMessage(message) {
        this.messageQueue.push(message);
        this.workMessageQueue();
    }
    workMessageQueue() {
        if (this.messageQueue.length > 0 &&
            this.currentSentMessage == null) {
            this.sendMessage(this.messageQueue.shift()).then(() => {
                this.workMessageQueue();
            }).catch(error => {
                console.warn(error);
            });
        }
    }
    onMessage(message) {
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
    }
    ProcessEvent(eventMessage) {
        if (LOG_DEBUG)
            console.log('received event: event id : ' + eventMessage.ValueIDEVT + ' language: ' + eventMessage.ValueLANGUE + ' opt: ' + eventMessage.ValueOPT);
        this._lastEventID++;
        this._lastEventPlayerID = eventMessage.ValuePLAYERID;
        this.changed("lastEventID");
        this.changed("lastEventPlayerID");
    }
    ProcessAcknowledgement(acknowledgeMessage) {
        var cde = acknowledgeMessage.ValueIDCDE;
        if (this.currentSentMessage.ValueCDE == cde) {
            if (this.sendResolver != null) {
                this.sendResolver();
                this.sendResolver = null;
            }
            this.currentSentMessage = null;
        }
        switch (acknowledgeMessage.ValueIDCDE) {
            case EmZIPMessage.MESSAGE_TYPE_SIMPLE_CONTROL:
                this.LogAcknowledgement('simple control', acknowledgeMessage);
                break;
            case EmZIPMessage.MESSAGE_TYPE_UNICAST_SETUP:
                this.LogAcknowledgement('unicast setup', acknowledgeMessage);
                break;
            default:
                this.LogAcknowledgement(EmZIPMessage.CDEToEnglish(cde), acknowledgeMessage);
                break;
        }
    }
    LogAcknowledgement(logPrefix, acknowledgement) {
        if (acknowledgement.ValueRESULT == EmZIPAcknowledgment.RESULT_OKAY) {
            if (LOG_DEBUG)
                console.log(this.socket.name + ': ' + logPrefix + ' accepted (sender: ' + acknowledgement.ValueADR + ':' + acknowledgement.ValuePORT + ')');
        }
        else {
            console.warn(logPrefix + ' rejected');
        }
    }
};
exports.EmZ_IP = EmZ_IP;
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
exports.EmZ_IP = EmZ_IP = __decorate([
    Meta.driver('NetworkUDP', { port: PORT_UNICAST }),
    __metadata("design:paramtypes", [Object])
], EmZ_IP);
class EmZIPMessage {
    static MESSAGE_TYPE_REQUEST_FOR_DELAY = 1;
    static MESSAGE_TYPE_CONTROL = 4;
    static MESSAGE_TYPE_SIMPLE_CONTROL = 5;
    static MESSAGE_TYPE_EVENT = 8;
    static MESSAGE_TYPE_DELAY_ANSWER = 9;
    static MESSAGE_TYPE_UNICAST_SETUP = 32;
    static MESSAGE_TYPE_ACKNOWLEDGMENT = 64;
    _fields = {};
    static splitByLinebreak = '\n';
    static splitByEqual = '=';
    get ValueIDDOM() { return this.GetNumberValue(LABEL_IDDOM); }
    get ValueCDE() { return this.GetNumberValue(LABEL_CDE); }
    constructor(iddom, cde) {
        this.SetNumberValue(LABEL_IDDOM, iddom);
        this.SetNumberValue(LABEL_CDE, cde);
    }
    GetNumberValue(label) {
        return EmZIPMessage.GetNumber(label, this._fields);
    }
    SetNumberValue(label, value) {
        var valueString = value;
        this._fields[label] = String(valueString);
    }
    GetValue(label) {
        return this._fields[label];
    }
    SetValue(label, value) {
        this._fields[label] = String(value);
    }
    static CDEToEnglish(cde) {
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
    }
    static GetNumber(label, dict) {
        var value = dict[label];
        return value ? parseInt(value) : -1;
    }
    static GetString(label, dict) {
        return dict[label];
    }
    ParseMessage(message) {
        this._fields = EmZIPMessage.ParseMessageIntoDict(message);
    }
    static ParseMessageIntoDict(message) {
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
    }
    RenderMessageField(label) {
        return label + "=" + this.GetValue(label) + MESSAGE_LINE_BREAK;
    }
    static Parse(message) {
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
    }
    ToString() {
        return PROTOCOL_VERSION + MESSAGE_LINE_BREAK +
            this.RenderMessageField(LABEL_IDDOM) +
            this.RenderMessageField(LABEL_CDE);
    }
}
class EmZIPEvent extends EmZIPMessage {
    get ValueIDEVT() { return this.GetNumberValue(LABEL_IDEVT); }
    get ValueNUMZONE() { return this.GetNumberValue(LABEL_NUMZONE); }
    get ValuePLAYERID() { return this.GetNumberValue(LABEL_PLAYERID); }
    get ValueLANGUE() { return this.GetNumberValue(LABEL_LANGUE); }
    get ValueOPT() { return this.GetNumberValue(LABEL_OPT); }
    get ValueOFFSET() { return this.GetNumberValue(LABEL_OFFSET); }
    constructor(iddom, idevt, numzone, playerid, langue, opt, offset) {
        super(iddom, EmZIPMessage.MESSAGE_TYPE_EVENT);
        this.SetNumberValue(LABEL_IDEVT, idevt);
        this.SetNumberValue(LABEL_NUMZONE, numzone);
        this.SetNumberValue(LABEL_PLAYERID, playerid);
        this.SetNumberValue(LABEL_LANGUE, langue);
        this.SetNumberValue(LABEL_OPT, opt);
        this.SetNumberValue(LABEL_OFFSET, offset);
    }
}
class EmZIPRequestForDelay extends EmZIPMessage {
    get ValueIDSEND() { return this._fields[LABEL_IDSEND]; }
    get ValueIDMSG() { return this.GetNumberValue(LABEL_IDMSG); }
    constructor(iddom, idsend, idmsg) {
        super(iddom, EmZIPMessage.MESSAGE_TYPE_REQUEST_FOR_DELAY);
        this.SetValue(LABEL_IDSEND, idsend);
        this.SetNumberValue(LABEL_IDMSG, idmsg);
    }
}
class EmZIPDelayAnswer extends EmZIPMessage {
    get ValueIDDEST() { return this._fields[LABEL_IDDEST]; }
    get ValueIDMSG() { return this.GetNumberValue(LABEL_IDMSG); }
    get ValueTSRXSEC() { return this.GetNumberValue(LABEL_TSRXSEC); }
    get ValueTSRXNSEC() { return this.GetNumberValue(LABEL_TSRXNSEC); }
    get ValueTSTXSEC() { return this.GetNumberValue(LABEL_TSTXSEC); }
    get ValueTSTXNSEC() { return this.GetNumberValue(LABEL_TSTXNSEC); }
    constructor(iddom, iddest, idmsg, tsrxsec, tsrxnsec, tstxsec, tstxnsec) {
        super(iddom, EmZIPMessage.MESSAGE_TYPE_DELAY_ANSWER);
        this.SetValue(LABEL_IDDEST, iddest);
        this.SetNumberValue(LABEL_IDMSG, idmsg);
        this.SetNumberValue(LABEL_TSRXSEC, tsrxsec);
        this.SetNumberValue(LABEL_TSRXNSEC, tsrxnsec);
        this.SetNumberValue(LABEL_TSTXSEC, tstxsec);
        this.SetNumberValue(LABEL_TSTXNSEC, tstxnsec);
    }
    ToString() {
        return super.ToString() +
            this.RenderMessageField(LABEL_IDDEST) +
            this.RenderMessageField(LABEL_IDMSG) +
            this.RenderMessageField(LABEL_TSRXSEC) +
            this.RenderMessageField(LABEL_TSRXNSEC) +
            this.RenderMessageField(LABEL_TSTXSEC) +
            this.RenderMessageField(LABEL_TSTXNSEC) +
            MESSAGE_LINE_BREAK;
    }
}
class EmZIPSimpleControl extends EmZIPMessage {
    static ORDRE_STOP = 1;
    static ORDRE_PLAY_CURRENT = 2;
    static ORDRE_PLAY_ZONE = 3;
    static ORDRE_SET_ZONE = 4;
    static ORDRE_SYNC_ZONE = 5;
    get ValueORDRE() { return this.GetNumberValue(LABEL_ORDRE); }
    get ValueNUMZONE() { return this.GetNumberValue(LABEL_NUMZONE); }
    get ValueOFFSET() { return this.GetNumberValue(LABEL_OFFSET); }
    constructor(iddom, ordre, numzone = 0, offset = 0) {
        super(iddom, EmZIPMessage.MESSAGE_TYPE_SIMPLE_CONTROL);
        this.SetNumberValue(LABEL_ORDRE, ordre);
        this.SetNumberValue(LABEL_NUMZONE, numzone);
        this.SetNumberValue(LABEL_OFFSET, offset);
    }
    ToString() {
        return super.ToString() +
            this.RenderMessageField(LABEL_ORDRE) +
            this.RenderMessageField(LABEL_NUMZONE) +
            this.RenderMessageField(LABEL_OFFSET) +
            MESSAGE_LINE_BREAK;
    }
}
class EmZIPControl extends EmZIPMessage {
    static MSSTATUS_PLAY = 'PLAY';
    static MSSTATUS_STOP = 'STOP';
    static MSSTATUS_PAUSE = 'PAUSE';
    get ValueTSSEC() { return this.GetNumberValue(LABEL_TSSEC); }
    get ValueTSNSEC() { return this.GetNumberValue(LABEL_TSNSEC); }
    get ValueMSSTATUS() { return this.GetValue(LABEL_MSTSTATUS); }
    get ValueIDSSDOM() { return this.GetValue(LABEL_IDSSDOM); }
    get ValueRELTMPS() { return this.GetNumberValue(LABEL_RELTMPS); }
    get ValueRELTMPNS() { return this.GetNumberValue(LABEL_RELTMPNS); }
    constructor(iddom, tssec, tsnsec, msstatus, idssdom, numdiff, reltmps, reltmpns) {
        super(iddom, EmZIPMessage.MESSAGE_TYPE_CONTROL);
        this.SetNumberValue(LABEL_TSSEC, tssec);
        this.SetNumberValue(LABEL_TSNSEC, tsnsec);
        this.SetValue(LABEL_MSTSTATUS, msstatus);
        this.SetValue(LABEL_IDSSDOM, idssdom);
        this.SetNumberValue(LABEL_NUMDIFF, numdiff);
        this.SetNumberValue(LABEL_RELTMPS, reltmps);
        this.SetNumberValue(LABEL_RELTMPNS, reltmpns);
    }
    ToString() {
        return super.ToString() +
            this.RenderMessageField(LABEL_TSSEC) +
            this.RenderMessageField(LABEL_TSNSEC) +
            this.RenderMessageField(LABEL_MSTSTATUS) +
            this.RenderMessageField(LABEL_IDSSDOM) +
            this.RenderMessageField(LABEL_NUMDIFF) +
            this.RenderMessageField(LABEL_RELTMPS) +
            this.RenderMessageField(LABEL_RELTMPNS) +
            MESSAGE_LINE_BREAK;
    }
}
class EmZIPUnicastSetup extends EmZIPMessage {
    static CDEUNICAST_INIT = 1;
    get ValueUNICAST() { return this.GetNumberValue(LABEL_UNICAST); }
    get ValueADR() { return this.GetValue(LABEL_ADR); }
    get ValuePORT() { return this.GetNumberValue(LABEL_PORT); }
    constructor(iddom, adr, port) {
        super(iddom, EmZIPMessage.MESSAGE_TYPE_UNICAST_SETUP);
        this.SetNumberValue(LABEL_UNICAST, EmZIPUnicastSetup.CDEUNICAST_INIT);
        this.SetValue(LABEL_ADR, adr);
        this.SetNumberValue(LABEL_PORT, port);
    }
    ToString() {
        return super.ToString() +
            this.RenderMessageField(LABEL_UNICAST) +
            this.RenderMessageField(LABEL_ADR) +
            this.RenderMessageField(LABEL_PORT) +
            MESSAGE_LINE_BREAK;
    }
}
class EmZIPAcknowledgment extends EmZIPMessage {
    static RESULT_OKAY = 6;
    static RESULT_ERROR = 21;
    get ValueIDCDE() { return this.GetNumberValue(LABEL_IDCDE); }
    get ValueRESULT() { return this.GetNumberValue(LABEL_RESULT); }
    get ValueADR() { return this._fields[LABEL_ADR]; }
    get ValuePORT() { return this.GetNumberValue(LABEL_PORT); }
    constructor(iddom, idcde, result, adr, port) {
        super(iddom, EmZIPMessage.MESSAGE_TYPE_ACKNOWLEDGMENT);
        this.SetNumberValue(LABEL_IDCDE, idcde);
        this.SetNumberValue(LABEL_RESULT, result);
        this.SetValue(LABEL_ADR, adr);
        this.SetNumberValue(LABEL_PORT, port);
    }
    ToString() {
        return super.ToString() +
            this.RenderMessageField(LABEL_IDCDE) +
            this.RenderMessageField(LABEL_RESULT) +
            this.RenderMessageField(LABEL_ADR) +
            this.RenderMessageField(LABEL_PORT) +
            MESSAGE_LINE_BREAK;
    }
}
