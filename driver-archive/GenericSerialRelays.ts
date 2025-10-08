
/*
 * Generic Serial/USB Relay Board Driver
 *
 * This driver controls low-cost, generic Chinese relay/switch boards that
 * communicate over a virtual serial (COM) port via USB or serial server on ethernet (i.e Moxa nPort). These boards typically
 * use a simple fixed-length binary protocol for switching relays on and off.
 *
 * Example protocol frames (hex bytes):
 *   Open the first relay:  A0 02 00 A2
 *   Close the first relay: A0 01 00 A1
 *   Data (1) – Start ID (standard is 0xA0)
 *   Data (2) – Switch address code (0x01 and 0x02 represent the first and second switch, respectively)
 *   Data (3) – Operation data (0x00 is off, 0x01 is on)
 *   Data (4) – Checksum / Control code (sum of all preceding bytes modulo 256.)
 *
 * The driver handles:
 *   - Opening the serial port at the correct baud rate (often 9600 8N1)
 *   - Sending on/off commands to specific relay channels
 *   - Optionally reading board responses (if supported)
 *   - Abstracting raw hex protocol into simple function calls
 *
 * Compatible with many unbranded boards sold online (e.g., USB relay modules
 * with 1–8 channels).
 * 
 * Specify a the number of relays on the board in the driver options field. i.e 8
 * 
 * WARNING: the relay will always be reset at driver/player/server restart as there is no way to query current state.
 * 
 * version 1.0
 * 
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2021 by Mattias Andersson.
 */


import { NetworkTCP, SerialPort } from "system/Network";
import { Driver } from "system_lib/Driver";
import { callable, driver,property } from "system_lib/Metadata";
import { IndexedProperty, Dictionary} from 'system_lib/ScriptBase';


type ConnType = NetworkTCP | SerialPort;

@driver('NetworkTCP', { port: 4001 })
@driver('SerialPort', { baudRate: 9600 })

export class GenericSerialRelays extends Driver<ConnType> {
    public relays: IndexedProperty<Relay>;  
    public aggregateRelays: Dictionary<Relay>

    public constructor(private connection: ConnType) {
		super(connection);
        connection.autoConnect(true);
        this.relays = this.indexedProperty("relays", Relay);

       /*  let  numInterfaces :number = 1; */

        /* if (this.isNumeric(connection.options)) {
            const options = parseInt(connection.options);
            numInterfaces = options;
            for (let i = 1; i <= numInterfaces; i++) { //1 based to id numbering.
                const relay = new Relay(i, this);
                this.relays.push(relay);
                
            }
            }else{
                const relay = new Relay(1, this); //No options given, go ahead and create a single relay
                this.relays.push(relay);    
		    } */
    }

    @callable("Configure Relay")
    configureRelay(name:string){
    const relay = new Relay(this.relays.length +1 , this,name);
                this.relays.push(relay);
   }

    sendCommand(relayNumber: number, state: boolean) {
        const START = 0xA0;
        const relay = relayNumber & 0xFF;
        const st = state ? 0x01 : 0x00;
        const checksum = (START + relay + st) & 0xFF;
        this.connection.sendBytes([START, relay, st, checksum])
        
    }

    isNumeric(str:string) {
    return typeof str === "string" && str.trim() !== "" && !isNaN(Number(str));
    }
}
    
class Relay {

	private id: number;
    private mRelay:boolean
    private mName:string
    private owner:GenericSerialRelays
	constructor(ix:number,owner:GenericSerialRelays, name:string)
    {
        this.id = ix
        this.owner = owner
        this.mRelay = false 
        this.mName = name
        //asap(() => this.owner.sendCommand(this.id, false))  //Reset the relay in case it is on
    }
    
	@property("Controls the relay", false)
	get relay(): boolean { return this.mRelay; }
	set relay(value: boolean) { 
        if (value != this.mRelay)
            this.owner.sendCommand(this.id, value) 
            this.mRelay = value; }
    
    
	@property("RelayName", true)
	get name(): string { return this.mName; }
	
}

