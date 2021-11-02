/*
 * Created 2018 by Sam Walz (sw@noparking.dk)
 */

import {NetworkUDP} from "system/Network";
import {Driver} from "system_lib/Driver";
import * as Meta from "system_lib/Metadata";

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
// const LABEL_LANG = "LANG";
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

/** max wait time for acknowledgement in ms */
const MAX_WAIT_FOR_ACKNOWLEDGEMENT = 500;

const LOG_DEBUG = false;
/**
 A driver using a UDP socket for communicating with an EmZ-IP device.
 */
@Meta.driver('NetworkUDP', { port: PORT_UNICAST })
export class EmZ_IP extends Driver<NetworkUDP> {

    _lastEventID : number = 0;
    _lastEventPlayerID : number = -1;

    _idDom : number = 0;

    messageQueue : EmZIPMessage[] = [];
    currentSentMessage : EmZIPMessage = null;
    sendResolver: (value?: void | Thenable<void>) => void = null;

    public constructor(private socket: NetworkUDP) {
        super(socket);

        socket.subscribe('textReceived', (_sender, message)=> {
            this.onMessage(message.text);
        });

        // setup device for unicast to blocks server
        var messageUnicastSetup = new EmZIPUnicastSetup(
            this._idDom,
            SERVER_IP,
            socket.listenerPort
        );
        this.queueMessage(messageUnicastSetup);

    }

    @Meta.callable("Play Zone")
    public playZone(
        @Meta.parameter("Zone to play") zone : number
    ) : void
    {
        var simpleControl = new EmZIPSimpleControl(
            this._idDom,
            EmZIPSimpleControl.ORDRE_STOP
        );
        this.queueMessage(simpleControl);

        simpleControl = new EmZIPSimpleControl(
            this._idDom,
            EmZIPSimpleControl.ORDRE_PLAY_ZONE,
            zone
        );
        this.queueMessage(simpleControl);
    }

    /**
    * Passthrough for sending raw commands frmo tasks and client scripts.
    * Comment out @callable if you don't want to expose sending raw command strings to tasks.
    */
    @Meta.callable("Send raw command to device")
    public sendText(
        @Meta.parameter("What to send") text: string,
    ): void
    {
        return this.socket.sendText(text);
    }

    @Meta.property("ID of last received event. (Also: counter for received events)")
    public get lastEventID () : number
    {
        return this._lastEventID;
    }

    @Meta.property("ID of player triggering last received event")
    public get lastEventPlayerID () : number
    {
        return this._lastEventPlayerID;
    }

    sendMessage(message : EmZIPMessage ) : Promise<void>
    {
        if (LOG_DEBUG) console.info(this.socket.name + ': sending ' + EmZIPMessage.CDEToEnglish(message.ValueCDE));
        this.socket.sendText(message.ToString() + '\0');
        this.currentSentMessage = message;
        return new Promise<void>((resolve, reject) => {
            this.sendResolver = resolve;
            wait(MAX_WAIT_FOR_ACKNOWLEDGEMENT).then(() => {
                reject('send timed out');
            });
        });
    }

    queueMessage(message : EmZIPMessage)
    {
        this.messageQueue.push(message);
        this.workMessageQueue();
    }

    workMessageQueue()
    {
        if (this.messageQueue.length > 0 &&
            this.currentSentMessage == null)
        {
            this.sendMessage(this.messageQueue.shift()).then(() => {
                this.workMessageQueue();
            }).catch(error => {
                console.warn(error);
            });
        }
    }

    onMessage(message: string)
    {
        var emZIPMessage = EmZIPMessage.Parse(message);
        switch (emZIPMessage.ValueCDE)
        {
            case EmZIPMessage.MESSAGE_TYPE_ACKNOWLEDGMENT:
                this.ProcessAcknowledgement(emZIPMessage as EmZIPAcknowledgment);
                break;
            case EmZIPMessage.MESSAGE_TYPE_DELAY_ANSWER:
                // do nothing
                break;
            case EmZIPMessage.MESSAGE_TYPE_EVENT:
                this.ProcessEvent(emZIPMessage as EmZIPEvent);
                break;
            case EmZIPMessage.MESSAGE_TYPE_REQUEST_FOR_DELAY:
                // nothing yet
                break;
            default:
                console.info("received unsupported message type: " + emZIPMessage.ToString());
                break;
        }
    }

    ProcessEvent (eventMessage : EmZIPEvent)
    {
        if (LOG_DEBUG) console.log('received event: event id : ' + eventMessage.ValueIDEVT  + ' language: ' + eventMessage.ValueLANGUE + ' opt: ' + eventMessage.ValueOPT);
        this._lastEventID++;
        this._lastEventPlayerID = eventMessage.ValuePLAYERID;
        this.changed("lastEventID");
        this.changed("lastEventPlayerID");
    }

    ProcessAcknowledgement (acknowledgeMessage : EmZIPAcknowledgment)
    {
        var cde = acknowledgeMessage.ValueIDCDE;
        // var result = acknowledgeMessage.ValueRESULT;

        if (this.currentSentMessage.ValueCDE == cde)
        {
            if (this.sendResolver != null)
            {
                this.sendResolver();
                this.sendResolver = null;
            }
            this.currentSentMessage = null;
        }

        switch (acknowledgeMessage.ValueIDCDE)
        {
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

    LogAcknowledgement (logPrefix : string, acknowledgement : EmZIPAcknowledgment)
    {
        if (acknowledgement.ValueRESULT == EmZIPAcknowledgment.RESULT_OKAY)
        {
            if (LOG_DEBUG) console.log(this.socket.name + ': ' + logPrefix + ' accepted (sender: ' +  acknowledgement.ValueADR + ':' + acknowledgement.ValuePORT + ')');
        }
        else
        {
            console.warn(logPrefix + ' rejected');
        }
    }


}

interface Dictionary<Group> {
    [label: string]: Group;
}

class EmZIPMessage
{
    public static readonly MESSAGE_TYPE_REQUEST_FOR_DELAY = 1;
    public static readonly MESSAGE_TYPE_CONTROL = 4;
    public static readonly MESSAGE_TYPE_SIMPLE_CONTROL = 5;
    public static readonly MESSAGE_TYPE_EVENT = 8;
    public static readonly MESSAGE_TYPE_DELAY_ANSWER = 9;
    public static readonly MESSAGE_TYPE_UNICAST_SETUP = 32;
    public static readonly MESSAGE_TYPE_ACKNOWLEDGMENT = 64;

    protected _fields: Dictionary<string> = {};
    static splitByLinebreak = '\n';
    static splitByEqual = '=';

    public get ValueIDDOM() : number { return this.GetNumberValue(LABEL_IDDOM); }
    public get ValueCDE () : number { return this.GetNumberValue(LABEL_CDE); }

    public constructor (iddom : number, cde : number)
    {
        this.SetNumberValue(LABEL_IDDOM, iddom);
        this.SetNumberValue(LABEL_CDE, cde);
    }

    public GetNumberValue(label: string) : number
    {
        return EmZIPMessage.GetNumber(label, this._fields);
    }
    public SetNumberValue (label: string, value: number)
    {
        var valueString = value;
        this._fields[label] = String(valueString);
    }

    public GetValue (label: string): string
    {
        return this._fields[label];
    }
    public SetValue(label : string, value : string | number)
    {
        this._fields[label] = String(value);
    }

    public static CDEToEnglish (cde : number) : string {
        switch (cde)
        {
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

    private static GetNumber (label : string, dict : Dictionary<string>) : number
    {
        var value = dict[label];
        return value ? parseInt(value) : -1;
    }
    private static GetString (label : string, dict : Dictionary<string>) : string
    {
        return dict[label];
    }



    // parses valid message lines into dictionary
    ParseMessage (message : string)
    {
        this._fields = EmZIPMessage.ParseMessageIntoDict(message);
    }

    static ParseMessageIntoDict (message : string) : Dictionary<string>
    {
        var dict: Dictionary<string> = {};
        var fields = message.split(EmZIPMessage.splitByLinebreak);
        for (var i = 0; i < fields.length; i++)
        {
            var labelAndValue = fields[i].trim().split(EmZIPMessage.splitByEqual);
            if (labelAndValue.length == 2)
            {
                var label = labelAndValue[0].trim();
                var value = labelAndValue[1].trim();
                dict[label] = value;
            }
        }
        return dict;
    }

    // renders dictonary entry into valid message line
    protected RenderMessageField(label : string) : string
    {
        return label + "=" + this.GetValue(label) + MESSAGE_LINE_BREAK;
    }

    public static Parse (message : string) : EmZIPMessage
    {
        var dict = this.ParseMessageIntoDict(message);
        var iddom = this.GetNumber(LABEL_IDDOM, dict);
        var cde = this.GetNumber(LABEL_CDE, dict);
        switch (cde)
        {
            case EmZIPMessage.MESSAGE_TYPE_EVENT:
                return new EmZIPEvent(
                    iddom,
                    this.GetNumber(LABEL_IDEVT, dict),
                    this.GetNumber(LABEL_NUMZONE, dict),
                    this.GetNumber(LABEL_PLAYERID, dict),
                    this.GetNumber(LABEL_LANGUE, dict),
                    this.GetNumber(LABEL_OPT, dict),
                    this.GetNumber(LABEL_OFFSET, dict)
                );
            case EmZIPMessage.MESSAGE_TYPE_REQUEST_FOR_DELAY:
                return new EmZIPRequestForDelay(
                    iddom,
                    this.GetString(LABEL_IDSEND, dict),
                    this.GetNumber(LABEL_IDMSG, dict),
                );
            case EmZIPMessage.MESSAGE_TYPE_DELAY_ANSWER:
                return new EmZIPDelayAnswer(
                    iddom,
                    this.GetString(LABEL_IDDEST, dict),
                    this.GetNumber(LABEL_IDMSG, dict),
                    this.GetNumber(LABEL_TSRXSEC, dict),
                    this.GetNumber(LABEL_TSRXNSEC, dict),
                    this.GetNumber(LABEL_TSTXSEC, dict),
                    this.GetNumber(LABEL_TSTXNSEC, dict)
                );
            case EmZIPMessage.MESSAGE_TYPE_CONTROL:
                return new EmZIPControl(
                    iddom,
                    this.GetNumber(LABEL_TSSEC, dict),
                    this.GetNumber(LABEL_TSNSEC, dict),
                    this.GetString(LABEL_MSTSTATUS, dict),
                    this.GetString(LABEL_IDSSDOM, dict),
                    this.GetNumber(LABEL_NUMDIFF, dict),
                    this.GetNumber(LABEL_RELTMPS, dict),
                    this.GetNumber(LABEL_RELTMPNS, dict)
                );
            case EmZIPMessage.MESSAGE_TYPE_SIMPLE_CONTROL:
                return new EmZIPSimpleControl(
                    iddom,
                    this.GetNumber(LABEL_ORDRE, dict),
                    this.GetNumber(LABEL_NUMZONE, dict),
                    this.GetNumber(LABEL_OFFSET, dict)
                );
            case EmZIPMessage.MESSAGE_TYPE_UNICAST_SETUP:
                return new EmZIPUnicastSetup(
                    iddom,
                    this.GetString(LABEL_ADR, dict),
                    this.GetNumber(LABEL_PORT, dict)
                );
            case EmZIPMessage.MESSAGE_TYPE_ACKNOWLEDGMENT:
                return new EmZIPAcknowledgment(
                    iddom,
                    this.GetNumber(LABEL_IDCDE, dict),
                    this.GetNumber(LABEL_RESULT, dict),
                    this.GetString(LABEL_ADR, dict),
                    this.GetNumber(LABEL_PORT, dict)
                );
        }
        return new EmZIPMessage(iddom, cde);
    }

	public ToString() : string
	{
        return PROTOCOL_VERSION + MESSAGE_LINE_BREAK +
            this.RenderMessageField(LABEL_IDDOM) +
            this.RenderMessageField(LABEL_CDE);
	}
}

class EmZIPEvent extends EmZIPMessage
{
    public get ValueIDEVT() : number { return this.GetNumberValue(LABEL_IDEVT); }
    public get ValueNUMZONE() : number { return this.GetNumberValue(LABEL_NUMZONE); }
    public get ValuePLAYERID() : number { return this.GetNumberValue(LABEL_PLAYERID); }
    public get ValueLANGUE() : number { return this.GetNumberValue(LABEL_LANGUE); }
    public get ValueOPT() : number { return this.GetNumberValue(LABEL_OPT); }
    public get ValueOFFSET() : number { return this.GetNumberValue(LABEL_OFFSET); }

    public constructor (iddom: number, idevt: number, numzone: number, playerid: number, langue: number, opt: number, offset: number) {
        super(iddom, EmZIPMessage.MESSAGE_TYPE_EVENT);
        this.SetNumberValue(LABEL_IDEVT, idevt);
        this.SetNumberValue(LABEL_NUMZONE, numzone);
        this.SetNumberValue(LABEL_PLAYERID, playerid);
        this.SetNumberValue(LABEL_LANGUE, langue);
        this.SetNumberValue(LABEL_OPT, opt);
        this.SetNumberValue(LABEL_OFFSET, offset);
    }
}

class EmZIPRequestForDelay extends EmZIPMessage
{
    public get ValueIDSEND() : string { return this._fields[LABEL_IDSEND]; }
    public get ValueIDMSG() : number { return this.GetNumberValue(LABEL_IDMSG); }

    public constructor(iddom: number, idsend: string, idmsg: number) {
        super(iddom, EmZIPMessage.MESSAGE_TYPE_REQUEST_FOR_DELAY);
        this.SetValue(LABEL_IDSEND, idsend);
        this.SetNumberValue(LABEL_IDMSG, idmsg);
    }
}

class EmZIPDelayAnswer extends EmZIPMessage
{
    public get ValueIDDEST() : string { return this._fields[LABEL_IDDEST]; }
    public get ValueIDMSG() : number { return this.GetNumberValue(LABEL_IDMSG); }
    public get ValueTSRXSEC() : number { return this.GetNumberValue(LABEL_TSRXSEC); }
    public get ValueTSRXNSEC() : number { return this.GetNumberValue(LABEL_TSRXNSEC); }
    public get ValueTSTXSEC() : number { return this.GetNumberValue(LABEL_TSTXSEC); }
    public get ValueTSTXNSEC() : number { return this.GetNumberValue(LABEL_TSTXNSEC); }

    public constructor(iddom : number, iddest: string, idmsg: number,
        tsrxsec: number, tsrxnsec: number, tstxsec: number, tstxnsec: number)
    {
        super(iddom, EmZIPMessage.MESSAGE_TYPE_DELAY_ANSWER);
        this.SetValue(LABEL_IDDEST, iddest);
        this.SetNumberValue(LABEL_IDMSG, idmsg);
        this.SetNumberValue(LABEL_TSRXSEC, tsrxsec);
        this.SetNumberValue(LABEL_TSRXNSEC, tsrxnsec);
        this.SetNumberValue(LABEL_TSTXSEC, tstxsec);
        this.SetNumberValue(LABEL_TSTXNSEC, tstxnsec);
    }

	public ToString() : string
	{
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

class EmZIPSimpleControl extends EmZIPMessage
{
    public static readonly ORDRE_STOP = 1;
    public static readonly ORDRE_PLAY_CURRENT = 2;
    public static readonly ORDRE_PLAY_ZONE = 3;
    public static readonly ORDRE_SET_ZONE = 4;
    public static readonly ORDRE_SYNC_ZONE = 5;

    public get ValueORDRE() : number { return this.GetNumberValue(LABEL_ORDRE); }
    public get ValueNUMZONE() : number { return this.GetNumberValue(LABEL_NUMZONE); }
    public get ValueOFFSET() : number { return this.GetNumberValue(LABEL_OFFSET); }

    public constructor (iddom : number, ordre: number, numzone: number = 0, offset : number = 0)
    {
        super(iddom, EmZIPMessage.MESSAGE_TYPE_SIMPLE_CONTROL);
        this.SetNumberValue(LABEL_ORDRE, ordre);
        this.SetNumberValue(LABEL_NUMZONE, numzone);
        this.SetNumberValue(LABEL_OFFSET, offset);
    }

	public ToString() : string
	{
        return super.ToString() +
                this.RenderMessageField(LABEL_ORDRE) +
                this.RenderMessageField(LABEL_NUMZONE) +
                this.RenderMessageField(LABEL_OFFSET) +
                MESSAGE_LINE_BREAK;
	}
}

class EmZIPControl extends EmZIPMessage
{
    public static readonly MSSTATUS_PLAY = 'PLAY';
    public static readonly MSSTATUS_STOP = 'STOP';
    public static readonly MSSTATUS_PAUSE = 'PAUSE';

    public get ValueTSSEC() : number { return this.GetNumberValue(LABEL_TSSEC); }
    public get ValueTSNSEC() : number { return this.GetNumberValue(LABEL_TSNSEC); }
    public get ValueMSSTATUS() : string { return this.GetValue(LABEL_MSTSTATUS); }
    public get ValueIDSSDOM() : string { return this.GetValue(LABEL_IDSSDOM); }
    public get ValueRELTMPS() : number { return this.GetNumberValue(LABEL_RELTMPS); }
    public get ValueRELTMPNS() : number { return this.GetNumberValue(LABEL_RELTMPNS); }

    public constructor (iddom : number, tssec: number, tsnsec: number, msstatus: string, idssdom: string,
        numdiff: number, reltmps: number, reltmpns: number)
    {
        super(iddom, EmZIPMessage.MESSAGE_TYPE_CONTROL);
        this.SetNumberValue(LABEL_TSSEC, tssec);
        this.SetNumberValue(LABEL_TSNSEC, tsnsec);
        this.SetValue(LABEL_MSTSTATUS, msstatus);
        this.SetValue(LABEL_IDSSDOM, idssdom);
        this.SetNumberValue(LABEL_NUMDIFF, numdiff);
        this.SetNumberValue(LABEL_RELTMPS, reltmps);
        this.SetNumberValue(LABEL_RELTMPNS, reltmpns);
    }

    public ToString() : string
	{
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

class EmZIPUnicastSetup extends EmZIPMessage
{
    public static readonly CDEUNICAST_INIT = 1;

    public get ValueUNICAST() : number { return this.GetNumberValue(LABEL_UNICAST); }
    public get ValueADR() : string { return this.GetValue(LABEL_ADR); }
    public get ValuePORT() : number { return this.GetNumberValue(LABEL_PORT); }

    public constructor (iddom : number, adr : string, port: number) {
        super(iddom, EmZIPMessage.MESSAGE_TYPE_UNICAST_SETUP);
        this.SetNumberValue(LABEL_UNICAST, EmZIPUnicastSetup.CDEUNICAST_INIT);
        this.SetValue(LABEL_ADR, adr);
        this.SetNumberValue(LABEL_PORT, port);
    }

	public ToString() : string {
        return super.ToString() +
                this.RenderMessageField(LABEL_UNICAST) +
                this.RenderMessageField(LABEL_ADR) +
                this.RenderMessageField(LABEL_PORT) +
                MESSAGE_LINE_BREAK;
	}
}

class EmZIPAcknowledgment extends EmZIPMessage
{
    public static readonly RESULT_OKAY = 6;
    public static readonly RESULT_ERROR = 21;

    public get ValueIDCDE() : number { return this.GetNumberValue(LABEL_IDCDE); }
    public get ValueRESULT() : number { return this.GetNumberValue(LABEL_RESULT); }
    public get ValueADR() : string { return this._fields[LABEL_ADR]; }
    public get ValuePORT() : number { return this.GetNumberValue(LABEL_PORT); }

    public constructor (iddom : number, idcde: number, result: number, adr: string, port: number) {
        super(iddom, EmZIPMessage.MESSAGE_TYPE_ACKNOWLEDGMENT);
        this.SetNumberValue(LABEL_IDCDE, idcde);
        this.SetNumberValue(LABEL_RESULT, result);
        this.SetValue(LABEL_ADR, adr);
        this.SetNumberValue(LABEL_PORT, port);
    }

	public ToString() : string {
        return super.ToString() +
                this.RenderMessageField(LABEL_IDCDE) +
                this.RenderMessageField(LABEL_RESULT) +
                this.RenderMessageField(LABEL_ADR) +
                this.RenderMessageField(LABEL_PORT) +
                MESSAGE_LINE_BREAK;
	}
}
