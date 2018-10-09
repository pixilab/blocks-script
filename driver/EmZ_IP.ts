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
const LABEL_LANG = "LANG";
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


/**
 A driver using a UDP socket for communicating with an EmZ-IP device.
 */
@Meta.driver('NetworkUDP', { port: PORT_UNICAST })
export class EmZ_IP extends Driver<NetworkUDP> {


    /**
    * Create me, attached to the network socket I communicate through. When using a
     * driver, the driver replaces the built-in functionality of the network socket
     with the properties and callable functions exposed.
     */
     public constructor(private socket: NetworkUDP) {
        super(socket);


        socket.subscribe('textReceived', (sender, message)=> {
            console.info('text received', message + ' ' + sender);
            this.onMessage(message.text);
        });

        // setup device for unicast to blocks server
        var messageUnicastSetup = new EmZIPUnicastSetup();
        messageUnicastSetup.ValueIDDOM = 0;
        messageUnicastSetup.ValueADR = '10.0.2.10';
        messageUnicastSetup.ValuePORT = socket.listenerPort;
        this.sendMessage(messageUnicastSetup);

    }

    /**
    * Passthrough for sending raw commands frmo tasks and client scripts.
    * Comment out @callable if you don't want to expose sending raw command strings to tasks.
    */
    @Meta.callable("Send raw command to device")
    public sendText(
        @Meta.parameter("What to send") text: string,
    ): void {
        return this.socket.sendText(text);
    }

    sendMessage(message : EmZIPMessage )
    {
        console.info(message.ToString());
        this.socket.sendText(message.ToString() + '\0');
    }

    onMessage(message: string)
    {
        var emZIPMessage = new EmZIPMessage(message);
        switch (emZIPMessage.ValueCDE)
        {
            case EmZIPMessage.MESSAGE_TYPE_REQUEST_FOR_DELAY:
                // nothing yet
                break;
            case EmZIPMessage.MESSAGE_TYPE_DELAY_ANSWER:
                // do nothing
                break;
            case EmZIPMessage.MESSAGE_TYPE_EVENT:
                this.ReactTo(emZIPMessage as EmZIPEvent);
                break;
            default:
                console.log(emZIPMessage.ToString());
                break;
        }
    }

    ReactTo (eventMessage : EmZIPEvent)
    {
        console.info(
            "Event:\n" +
            "EmZ Domain: " + eventMessage.ValueIDDOM + "\n" +
            "Emz ID: " + eventMessage.ValueIDEVT + "\n" +
            "Zone number: " + eventMessage.ValueNUMZONE + "\n" +
            "Player ID: " + eventMessage.ValuePLAYERID + "\n" +
            "Language: " + eventMessage.ValueLANGUE + "\n"
        );

        var simpleControl = new EmZIPSimpleControl();
        simpleControl.ValueIDDOM = eventMessage.ValueIDDOM;
        simpleControl.ValueORDRE = EmZIPSimpleControl.ORDRE_STOP;
        simpleControl.ValueNUMZONE = 0;
        simpleControl.ValueOFFSET = 0;
        this.sendMessage(simpleControl);

        simpleControl = new EmZIPSimpleControl();
        simpleControl.ValueIDDOM = eventMessage.ValueIDDOM;
        simpleControl.ValueORDRE = EmZIPSimpleControl.ORDRE_PLAY_ZONE;
        simpleControl.ValueNUMZONE = 2;
        simpleControl.ValueOFFSET = 0;
        this.sendMessage(simpleControl);
    }

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

    protected _fields: {[label: string]: string;} = {};
    _splitByLinebreak = '\n';
    _splitByEqual = '=';


    public get ValueIDDOM() : number
    {
        return this.GetNumberValue(LABEL_IDDOM);
    }
    public set ValueIDDOM(value: number)
    {
        this.SetNumberValue(LABEL_IDDOM, value);
    }

    public get ValueCDE () : number
    {
        return this.GetNumberValue(LABEL_CDE);
    }

    public constructor (message? : string)
    {
        if (message) this.ParseMessage(message);
    }

    public GetNumberValue(label: string) : number
    {
        var value = this._fields[label];
        return value ? parseInt(value) : -1;
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


    // parses valid message lines into dictionary
    ParseMessage (message : string)
    {
        var fields = message.split(this._splitByLinebreak);
        for (var i = 0; i < fields.length; i++)
        {
            var labelAndValue = fields[i].trim().split(this._splitByEqual);
            if (labelAndValue.length == 2)
            {
                var label = labelAndValue[0].trim();
                var value = labelAndValue[1].trim();
                this._fields[label] = value;
            }
        }
    }

    // renders dictonary entry into valid message line
    protected RenderMessageField(label : string) : string
    {
        return label + "=" + this.GetValue(label) + MESSAGE_LINE_BREAK;
    }

    public static Parse (message : string) : EmZIPMessage
    {
        var emZIPMessage = new EmZIPMessage(message);

        switch (emZIPMessage.ValueCDE)
        {
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
    public set ValueIDEVT( value: number ) { this.SetNumberValue(LABEL_IDEVT, value); }

    public get ValueNUMZONE() : number { return this.GetNumberValue(LABEL_NUMZONE); }
    public set ValueNUMZONE( value: number ) { this.SetNumberValue(LABEL_NUMZONE, value); }

    public get ValuePLAYERID() : number { return this.GetNumberValue(LABEL_PLAYERID); }
    public set ValuePLAYERID( value: number ) { this.SetNumberValue(LABEL_PLAYERID, value); }

    public get ValueLANGUE() : number { return this.GetNumberValue(LABEL_LANGUE); }
    public set ValueLANGUE( value: number ) { this.SetNumberValue(LABEL_LANGUE, value); }

    public get ValueOPT() : number { return this.GetNumberValue(LABEL_OPT); }
    public set ValueOPT( value: number ) { this.SetNumberValue(LABEL_OPT, value); }

    public get ValueOFFSET() : number { return this.GetNumberValue(LABEL_OFFSET); }
    public set ValueOFFSET( value: number ) { this.SetNumberValue(LABEL_OFFSET, value); }

    public constructor (message : string) { super(message); }
}

class EmZIPRequestForDelay extends EmZIPMessage
{
    public get ValueIDSEND() : string { return this._fields[LABEL_IDSEND]; }
    public get ValueIDMSG() : number { return this.GetNumberValue(LABEL_IDMSG); }

    public constructor(message : string) { super(message); }
}

class EmZIPDelayAnswer extends EmZIPMessage
{
    public get ValueIDDEST() : string { return this._fields[LABEL_IDDEST]; }
    public set ValueIDDEST( value: string ) { this._fields[LABEL_IDDEST] = value; }

    public get ValueIDMSG() : number { return this.GetNumberValue(LABEL_IDMSG); }
    public set ValueIDMSG( value: number ) { this.SetNumberValue(LABEL_IDMSG, value); }

    public get ValueTSRXSEC() : number { return this.GetNumberValue(LABEL_TSRXSEC); }
    public set ValueTSRXSEC( value: number ) { this.SetNumberValue(LABEL_TSRXSEC, value); }

    public get ValueTSRXNSEC() : number { return this.GetNumberValue(LABEL_TSRXNSEC); }
    public set ValueTSRXNSEC( value: number ) { this.SetNumberValue(LABEL_TSRXNSEC, value); }

    public get ValueTSTXSEC() : number { return this.GetNumberValue(LABEL_TSTXSEC); }
    public set ValueTSTXSEC( value: number ) { this.SetNumberValue(LABEL_TSTXSEC, value); }

    public get ValueTSTXNSEC() : number { return this.GetNumberValue(LABEL_TSTXNSEC); }
    public set ValueTSTXNSEC( value: number ) { this.SetNumberValue(LABEL_TSTXNSEC, value); }

    public constructor(message? : string)
    {
        super(message);
        if (!message) this.SetValue(LABEL_CDE, EmZIPMessage.MESSAGE_TYPE_DELAY_ANSWER);
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
    public set ValueORDRE( value: number ) { this.SetNumberValue(LABEL_ORDRE, value); }

    public get ValueNUMZONE() : number { return this.GetNumberValue(LABEL_NUMZONE); }
    public set ValueNUMZONE( value: number ) { this.SetNumberValue(LABEL_NUMZONE, value); }

    public get ValueOFFSET() : number { return this.GetNumberValue(LABEL_OFFSET); }
    public set ValueOFFSET( value: number ) { this.SetNumberValue(LABEL_OFFSET, value); }


    public constructor (message? : string)
    {
        super(message);
        if (!message) this.SetValue(LABEL_CDE, EmZIPMessage.MESSAGE_TYPE_SIMPLE_CONTROL);
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
    public constructor (message? : string)
    {
        super(message);
        if (!message) this.SetValue(LABEL_CDE, EmZIPMessage.MESSAGE_TYPE_CONTROL);
    }
}

class EmZIPUnicastSetup extends EmZIPMessage
{
    public static readonly CDEUNICAST_INIT = 1;

    public get ValueUNICAST() : number { return this.GetNumberValue(LABEL_UNICAST); }
    public set ValueUNICAST( value: number ) { this.SetNumberValue(LABEL_UNICAST, value); }

    public get ValueADR() : string { return this.GetValue(LABEL_ADR); }
    public set ValueADR( value: string ) { this.SetValue(LABEL_ADR, value); }

    public get ValuePORT() : number { return this.GetNumberValue(LABEL_PORT); }
    public set ValuePORT( value: number ) { this.SetNumberValue(LABEL_PORT, value); }

    public constructor (message? : string)
    {
        super(message);
        if (!message)
        {
            this.SetValue(LABEL_CDE, EmZIPMessage.MESSAGE_TYPE_UNICAST_SETUP);
            this.ValueUNICAST = EmZIPUnicastSetup.CDEUNICAST_INIT;
        }
    }

	public ToString() : string
	{
        return super.ToString() +
                this.RenderMessageField(LABEL_UNICAST) +
                this.RenderMessageField(LABEL_ADR) +
                this.RenderMessageField(LABEL_PORT) +
                MESSAGE_LINE_BREAK;
	}
}

class EmZIPAcknowledgment extends EmZIPMessage
{
    public constructor (message? : string)
    {
        super(message);
        if (!message) this.SetValue(LABEL_CDE, EmZIPMessage.MESSAGE_TYPE_ACKNOWLEDGMENT);
    }

	public ToString() : string
	{
        return super.ToString() +
                this.RenderMessageField(LABEL_IDCDE) +
                this.RenderMessageField(LABEL_RESULT) +
                this.RenderMessageField(LABEL_ADR) +
                this.RenderMessageField(LABEL_PORT) +
                MESSAGE_LINE_BREAK;
	}
}
