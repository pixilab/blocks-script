/**
 * PIXILAB Blocks driver for the Nexmosphere controller in file name using TCP or Serial transport.
 * Documentation in ./NexmosphereBase.ts
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * version 1.0
 */

import { callable, driver,parameter,property } from "system_lib/Metadata";
import { NexmosphereBase,ConnType, log,Dictionary,padVal,normalize } from "./NexmosphereBase";
import { AggregateElem } from "system_lib/ScriptBase";



const kNumInterfaces: number = 4;	// Number of X-talk interface ports on this device
const kNumOutputs: number = 4;	// Number of relay outputs on this device

@driver('NetworkTCP', { port: 4001 })
@driver('SerialPort', { baudRate: 115200 })
export class Nexmosphere_NEO extends NexmosphereBase<ConnType> {
   
    protected neo: Dictionary<NeoBaseClass>;
    protected outstandingModelQuery: CancelablePromise<void>;

    constructor(port: ConnType) {
        super(port, kNumInterfaces);
        this.initConnection(port)
        this.neo = this.namedAggregateProperty("neo",NeoOutput || NeoDevice || NeoRuntime || NeoDiagnostic || NeoSoftfuse || NeoWatchdog || NeoSchedule || NeoPwrXtalk || NeoSensmi);
        this.initNeo();
    }
    
    initNeo(){
        this.setTime();
        if (this.port.enabled){
            //this.setupOutputs(kNumOutputs); //TODO: move later to after model query response.
        this.send("P000B[MODEL?]"); //Query model to setup outputs correctly.
          if (this.outstandingModelQuery) {
                try { this.outstandingModelQuery.cancel(); } catch(_) {}
                this.outstandingModelQuery = undefined;
            }
            this.outstandingModelQuery = wait(500);
            this.outstandingModelQuery
                .then(() => {
                    log("Model query timed out, setting up default outputs");
                    this.handleControllerMessage("MODEL=NEO640"); //Default to NEO520
            })  .catch(() => {
                // cancelled — normal flow, nothing to do
            });
        this.neo['input'] = new NeoDevice(this);//THey all have this feature
        }
    }

    protected considerConnected(): boolean {
        return this.port.connected;
    }

    protected setupOutputs(noOutputs:number): void {
          for (let i = 0; i < noOutputs; i++) {
            this.neo[`output${i + 1}`] = new NeoOutput(this,i+1,);
        }
    }

    protected setTime(now?:Date): void {
        // S000B[TIME=HH.MM.SS-DD/MM/YYYY]
        if (!now) now = new Date();
        const timeStr = padVal(now.getHours(),2) + "." +
            padVal(now.getMinutes(),2) + "." +
            padVal(now.getSeconds(),2) + "-" +
            padVal(now.getDate(),2) + "/" +
            padVal((now.getMonth() + 1),2) + "/" +
            padVal(now.getFullYear(),4);
            log("Setting Neo time to servertime:", timeStr);
        this.send("S000B[TIME=" + timeStr + "]");  
    }


    private handlers: { [key: string]: (s: string) => void } = {
    /* Handle data for outputs */ 
    'OUTPUT': (s: string) => { 
        log('handle OUTPUT', s);
        // Get the character immediately after "OUTPUT"
        const ix = "OUTPUT".length
        const numChar = s.charAt(ix); // e.g. "1", "2", "3", "4"
        const num = parseInt(numChar, 10);
        //Make sure expected num is valid
        if (num != num || num < 1 || num > kNumOutputs) {
            console.warn('Unexpected number after OUTPUT:', numChar);
            return;
        }
        // Keep everything after the address character as relevant data
        const data = s.slice(ix+1);
        //Find the right NeoOutput instance
        const key = `output${num}`;
        this.messageRouter(key, data);
        
    },
    'TIME': (s: string) => { log('handle TIME=', s); },
    'FWVERSION=': (s: string) => { log('FWVERSION=', s); },
    'WATCHDOG': (s: string) => { log('WATCHDOG', s); },
    'DEVICE': (s: string) => { log('DEVICEUSAGE=', s); },
    'INPUT': (s: string) => {
        log('handle INPUT=', s);
        this.messageRouter('input', s);},
    'SCHED': (s: string) => { log('SCHED', s); },
    'RUNTIME': (s: string) => { log('RUNTIME', s); },
    'OPERATIONTIME': (s: string) => { log('OPERATIONTIME', s); },
    'MODEL': (s: string) => { 
        log('MODEL', s);
        //Cancel any pending model query timeout
        if (this.outstandingModelQuery) {
            try { this.outstandingModelQuery.cancel(); } catch(_) {}
            this.outstandingModelQuery = undefined;}
        //Extract model code    
        let command = s.split('=')[1]
        //Find handler for model
        for (const key in this.modelHandlers) {
            if (key === command) {
                this.modelHandlers[key](); 
                return; // explicitly return void
            }
        }
    }
}
  /* Handle specifics for various models */
  private modelHandlers: { [key: string]: () => void } = {
    'NEO320': () => { 
        log('handle NEO320');
        this.setupOutputs(2);},
    'NEO520': () => {
        log('handle NEO520');
        this.setupOutputs(2);},
    'NEO620': () => { 
        log('handle NEO620');
        this.setupOutputs(2);
        this.neo['sensmi'] = new NeoSensmi(this);
    },

    'NEO340': () => {
        log('handle NEO340');
        this.setupOutputs(4);},
    'NEO540': () => {
        log('handle NEO540');
        this.setupOutputs(4);},
    'NEO640': () => {
        log('handle NEO640');
        this.setupOutputs(4);
        this.neo['sensmi'] = new NeoSensmi(this);},
  }
  protected handleControllerMessage(str: string): void {
    for (const key in this.handlers) {
      if (str.indexOf(key) === 0) {
        this.handlers[key](str); 
        return; // explicitly return void
      }
    }
  }
  private messageRouter(key: string,data:string): void {
    const neoEntry = this.neo[key];
    if (neoEntry) {
        neoEntry.recieveData(data);
    } else {
        console.warn("No Neo output registered for", key);
    }
  }
    @callable("Enable continious updates of output metrics")
    setContOutputMetrix(
        @parameter("Enable continious update at interval 0 or no value for off", true)timeInSeconds:number = 0
    ) {
        if (timeInSeconds > 0) {
            /* this.owner.send("P000B[AUTOSEND=OUTPUT" + this.mIx +":ALL:" + padVal(timeInSeconds,4) + "]"); */
            this.send("P000B[AUTOSEND=OUTPUTS:ALL:" + padVal(timeInSeconds,4) + "]");
        } else {
            /* this.owner.send("P000B[AUTOSEND=OUTPUT" + this.mIx +":ALL:OFF]"); */
    this.send("P000B[AUTOSEND=OUTPUTS:ALL:OFF]");
        }
    }
      @callable("Enable continious updates of input metrics")
    setContInputMetrix(
        @parameter("Enable continious update at interval 0 or no value for off", true)timeInSeconds:number = 0
    ) {
        if (timeInSeconds > 0) {
            /* this.owner.send("P000B[AUTOSEND=OUTPUT" + this.mIx +":ALL:" + padVal(timeInSeconds,4) + "]"); */
            this.send("P000B[AUTOSEND=INPUT:ALL:" + padVal(timeInSeconds,4) + "]");
        } else {
            /* this.owner.send("P000B[AUTOSEND=OUTPUT" + this.mIx +":ALL:OFF]"); */
    this.send("P000B[AUTOSEND=INPUT:ALL:OFF]");
        }
    }
}



class NeoBaseClass extends AggregateElem  {
    protected index: number = 0;
    protected driver: NexmosphereBase<ConnType>;
    constructor(driver: NexmosphereBase<ConnType>,ix?:number) {
            super();
            this.driver = driver;
            if (ix !== undefined) this.index = ix;
        }

    // Declare handlers here so base class code can use subclass handlers safely
    protected handlers: { [key: string]: (s: string) => void } = {};

    protected sendData(data: string) { 
            this.driver.send(data);
        }
    recieveData(str: string): void {
        log("Data received in NeoBaseClass reviceData:", str);

        const keyValuePair = str.split("=");
        const keyInStr = keyValuePair[0] || "EMPTY";
        log("Parsed key:", keyInStr);
        const value = keyValuePair[1];

        for (const key in this.handlers) {
            if (keyInStr.indexOf(key) === 0) {
                this.handlers[keyInStr](value);
                return; // stop after first match
            }
        }

        console.warn("No matching output handler for:", str);
    }
}
class NeoDevice extends NeoBaseClass  {
	
	private _voltage = 0
	private _current = 0
	private _power = 0
    private _usage = 0
	

 	constructor(owner: NexmosphereBase<ConnType>,ix?:number) {
		super(owner,ix);
	}	

    protected handlers: { [key: string]: (s: string) => void } = {
    'INPUTCURRENT': (s: string) => {
        log('handle INPUTCURRENT=', s);
        this.inputCurrent = parseFloat(s.replace(",", "."));}, //Replace comma is not neccesary in production devices.
    'INPUTVOLTAGE': (s: string) => {
        log('handle INPUTVOLTAGE=', s);
        this.inputVoltage = parseFloat(s.replace(",", "."));},
    'INPUTPOWER': (s: string) => {
        log('handle INPUTPOWER=', s);
        this.inputPower = parseFloat(s.replace(",", "."));},
    'INPUTUSAGE': (s: string) => {
        log('handle INPUTUSAGE=', s);
        this.inputUsage = parseFloat(s.replace(",", "."));}
    };

    @callable("Update input measurements")
    updateInputMeasurements(): void {
        this.sendData("P000B[INPUTVOLTAGE?]")
        this.sendData("P000B[INPUTCURRENT?]")
        this.sendData("P000B[INPUTPOWER?]")
        this.sendData("P000B[INPUTUSAGE?]")
    }

    @callable("Reset input usage to zero")
    resetInputUsage(): void {
        this.sendData("P000B[INPUT=USAGERESET]")
    }

    @property("Input Voltage", true)
    get inputVoltage(): number { return this._voltage; }
    set inputVoltage(value: number) { 
        if (value != this._voltage)
            this._voltage = value; }
    @property("Input Current", true)
    get inputCurrent(): number { return this._current; }
    set inputCurrent(value: number) { 

    log("Setting input current to:", value);
        if (value != this._current)
            this._current = value;
        }
    @property("Input Power", true)
    get inputPower(): number { return this._power;} 
    set inputPower(value: number) { 
        if (value != this._power)
            this._power = value;        
    }
    @property("Input Energy Usage", true)
    get inputUsage(): number { return this._power; }
    set inputUsage(value: number) { 
        if (value != this._usage)
            this._usage = value;
    }
}

class NeoRuntime extends NeoBaseClass   {


}

class NeoDiagnostic extends NeoBaseClass  {


}
class NeoSoftfuse extends NeoBaseClass  {


}

class NeoWatchdog extends NeoBaseClass  {


}

class NeoSchedule extends NeoBaseClass  {


}
class NeoPwrXtalk extends NeoBaseClass  {


}
class NeoSensmi extends NeoBaseClass  {
    @callable("Configure SensMI connection")
    configureSensmi(
        @parameter("Device Name")deviceName:string,
        @parameter("CUID, customer user id")cuid:string,
        @parameter("Country",true)country:string,
        @parameter("Area",true)area:string,
        @parameter("City",true)city:string
    ){
        this.sendData("SENSMI[PROV=ON]");
        this.sendData("SENSMI[DEVICENAME=" + deviceName + "]");
        this.sendData("SENSMI[CUID=" + cuid + "]");
        if (country)
            this.sendData("SENSMI[COUNTRY=" + country + "]");
        if (area)
            this.sendData("SENSMI[AREA=" + area + "]");     
        if (city)
            this.sendData("SENSMI[CITY=" + city + "]");
        this.sendData("SENSMI[PROV=SAVE]");
        this.sendData("SENSMI[PROV=OFF]");
    }
}


class NeoOutput extends NeoBaseClass  {
    private owner:Nexmosphere_NEO
    private mIx = 0 
    private mRelay =  true
    private mCurrent = 0
    private mPower = 0
    private mUsage = 0  
    private mVoltage = 0
    
 

    constructor(owner:Nexmosphere_NEO, ix: number) {
        super(owner,ix);
        this.mIx = ix;
        this.owner = owner;
    }

    protected handlers: { [key: string]: (s: string) => void } = {
    /* Handle data for outputs */ 
       
        'EMPTY': (s: string) => { //Handle the case of no data after OUTPUTn
            log('handle status (EMPTY)', s);
            this.mRelay = s === "ON";
            this.changed("relay"); 
        },
        'USAGE': (s: string) => { 
            log('handle USAGE', s);
            this.usage = parseFloat(s.replace(",", "."));
        },    
        'POWER': (s: string) => { 
            log('handle POWER', s);
            this.power = parseFloat(s.replace(",", "."));
        },
        'CURRENT': (s: string) => { 
            log('handle CURRENT', s);
            this.current = parseFloat(s.replace(",", "."));
        },
        'VOLTAGE': (s: string) => { 
            log('handle VOLTAGE', s);
            this.voltage = parseFloat(s.replace(",", "."));
        }
      
    };



    @property("Output relay", false)
    get relay(): boolean { return this.mRelay; }
    set relay(value: boolean) {
        if (this.mRelay === value) return;
        this.mRelay = value;
        //P000B[OUTPUT1=ON]
        this.owner.send("P000B[OUTPUT" + + this.mIx + "=" + (value ? "ON" : "OFF") + "]");
    }
    @property("Output voltage", true)
    get voltage(): number { return this.mVoltage; }
    set voltage(value: number) { 
        if (value != this.mVoltage)
            this.mVoltage = value;}
    @property("Output current", true)
    get current(): number { return this.mCurrent; }
    set current(value: number) {
        if (value != this.mCurrent)
            this.mCurrent = value; }

    @property("Output power", true)
    get power(): number { return this.mPower; }
    set power(value: number) { 
        if (value != this.mPower)
            this.mPower = value; }

    @property("Output energy usage", true)
    get usage(): number { return this.mUsage; }
    set usage(value: number) { 
        if (value != this.mUsage)
            this.mUsage = value; }

    @callable("Reset energy usage to zero")
    resetUsage() {
        this.usage = 0;
        this.sendData("P000B[OUTPUT" + this.mIx +"USAGERESET]")
        
    }
    @callable("Update output metrics properties")
    updateMetrics(
       
    ) {
            this.sendData("P000B[OUTPUT" + this.mIx +"CURRENT?]")
            this.sendData("P000B[OUTPUT" + this.mIx +"POWER?]")
            this.sendData("P000B[OUTPUT" + this.mIx +"USAGE?]")
            this.sendData("P000B[OUTPUT" + this.mIx +"VOLTAGE?]")
    }

}  
       
    
