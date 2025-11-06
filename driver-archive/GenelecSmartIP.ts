/**
 * Driver to control Genelec Smart IP speaker series (api v1)
 * 
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2025 by Mattias Andersson.
 * The driver does not support automatic ISS (Intelligent Signal Sensing) sleep power saving feature
 * please set sleep delay to 0 to disable this in Smart IP manager.
 * The driver will always make any profile it sets also the selected startup profile.
 * At Blocks server restart the current settings will be read back from the speaker.
 * Credential is added as a driver options e.g. admin:admin
 * @version 1.01
 * 
 */

import { NetworkTCP } from "../system/Network";
import { SimpleHTTP } from "../system/SimpleHTTP";
import { Driver } from "../system_lib/Driver";
import { driver, min,max, property } from "../system_lib/Metadata";


@driver('NetworkTCP', { port:9000 })
export class GenelecSmartIP extends Driver<NetworkTCP> {
    
    private _mute:boolean = false
    private _volume: number = 0
    private _profile: number = 0
    private _connected:boolean = false
    private _zone:string = ""
    private _active:boolean = false
    private _aoipName:string = ""
    private _enableAoIP01 = false
    private _enableAoIP02 = false
    private _enableAnalog = false
    private _hasAnalog = false
    private auth:string
    


    public constructor(
        private socket: NetworkTCP
    ){
            super(socket)
            
     if (socket.enabled) {
        if (socket.options && socket.options.trim() !== "") {
            // Always include a space after "Basic"
            this.auth = "Basic " + this.toBase64(socket.options);
        } else {
            console.warn("No credentials in driver options, trying default");
            // Make sure to include the space after "Basic"
            this.auth = "Basic YWRtaW46YWRtaW4="; // default admin:admin
        }


        this.initStatus();  
        
        }
    }
    /* Read back current settings from the speaker at driver/server startup */
    private async initStatus() {
    try {
        await this.getPowerStatus();
        await this.getVolumeLevel();
        await this.getProfileList();
        await this.getZone();
        await this.getAOIPName();
        await this.getInputSources()

    } catch (error) {
        console.error("Error during initStatus:", error);
        
    }
}
    private async getVolumeLevel(){
        try {
            const response  = await this.sendRequest("audio/volume") ;
            const data = response.interpreted as AudioStatus;
            this.volume = this.dbToNorm(data.level)
            this.mute = data.mute
        } catch (err) {
            console.error("Failed to fetch initial volume:", err);
        }
    }

    private async getPowerStatus() {
        try {
            const response  = await this.sendRequest("device/pwr") ;
            const data = response.interpreted as DevicePowerStatus;
            this.active = (data.state === "ACTIVE") 
        } catch (err) {
            console.error("Failed to fetch initial power:", err);
        }
    }
  
    private async getProfileList() {
        try {
            const response  = await this.sendRequest("profile/list") ;
            const data = response.interpreted as ProfileStatus;
            this.profile = data.selected
        } catch (err) {
            console.error("Failed to fetch initial profile:", err);
        }
    }  

    private async getZone() {
        try {
            const response  = await this.sendRequest("network/zone") ;
            const data = response.interpreted as Zone;
            this.zone = data.name
        } catch (err) {
            console.error("Failed to fetch initial zone:", err);
        }
    } 

    private async getAOIPName() {
        try {
            const response  = await this.sendRequest("aoip/dante/identity") ;
            const data = response.interpreted as AoipIdentity;
            this.aoipName = data.fname
        } catch (err) {
            console.error("Failed to fetch initial zone:", err);
        }
    }

    private async getInputSources() {
        try {
            const response  = await this.sendRequest("audio/inputs") ;
            const data = response.interpreted as Inputs;
            data.input.forEach(input => {
                if (input === "A") { //Can we do analog in this one?
                    this._hasAnalog = true;
                    this._enableAnalog = true;
                }
            });
        } catch (err) {
            console.error("Failed to fetch initial zone:", err);
        }
    }   

    @property("Device connected status", true)
        get connected(): boolean {
            return this._connected;
        }
        set connected(value: boolean) {
            this._connected = value;
        }

    @property("Mute the speaker")
        get mute(): boolean {
            return this._mute
        }
        set mute(value: boolean) {
            if (this._mute !== value && this._active){
            const endPoint  = "audio/volume"
            const payload  = {
            level: this._volume,   
            mute: value
             };
            this.sendCommand(endPoint,payload)   
            this._mute = value
        }
    }

    @property("Device Active")
        get active(): boolean {
            return this._active
        }
        set active(value: boolean) {
            const endPoint = "device/pwr"
            const payload  = {
            state: value ? "ACTIVE" : "STANDBY"  
             };
            this.sendCommand(endPoint,payload)   
            this._active = value
            this.mute = false
            
        }    

    @property("Normalized volume") @min(0) @max(1)
        get volume(): number {
            return this._volume
        }
        set volume(value: number) {
            if (this._volume !== value && this._active ){
                const endPoint = "audio/volume"
                const payload  = {
                level: this.normToDb_linearInDb(value),   
                mute: this._mute 
                }; 
                this.sendCommand(endPoint,payload)
                this._volume = value
            }
        }
    @property("Speaker profile") @min(0) @max(5)
        get profile(): number {
            return this._profile
        }
        set profile(value: number) {
            if (this._profile !== value && this._active){
                const endPoint = "profile/restore"
                const payload  = {
                id: value,
                startup: true   //Driver always set as startup profile
                };
                this.sendCommand(endPoint,payload)
                this._profile = value
            }
        }
    @property("Enable AoIP01 source")
        get enableAoIP01(): boolean {
            return this._enableAoIP01
        }
        set enableAoIP01(value: boolean) {
            if (this._enableAoIP01 !== value && this._active){
                this._enableAoIP01 = value
                this.sendInputCommand()
            }
        }

    @property("Enable AoIP02 source") 
        get enableAoIP02(): boolean {
            return this._enableAoIP02
        }
        set enableAoIP02(value: boolean) {
            if (this._enableAoIP02 !== value && this._active){
                this._enableAoIP02 = value
                this.sendInputCommand()
            }
        }

    @property("Enable Analog source") 
        get enableAnalog(): boolean {
            return this._enableAnalog
        }
        set enableAnalog(value: boolean) {
            if (this._enableAnalog !== value && this._active && this._hasAnalog){
                this._enableAnalog = value
                this.sendInputCommand()
            }
        }

    @property("Zone name",true) 
        get zone(): string {
            return this._zone
        }
        set zone(value:string){
            this._zone = value
        }
        
        
    @property("Speaker AIOP fname",true) 
        get aoipName(): string {
            return this._aoipName
        }
        set aoipName(value:string){
            this._aoipName = value
        }
    
    
private sendInputCommand() {
  const endPoint = "audio/inputs";
  const payload = [];

  if (this._enableAoIP01) payload.push("AoIP01");
  if (this._enableAoIP02) payload.push("AoIP02");
  if (this._enableAnalog) payload.push("A");

  const cmd = { input: payload };
  this.sendCommand(endPoint, cmd);
}

private async sendCommand(endPoint: string, payload: Record<string, unknown>) {
  if (!this.socket.enabled) {
    this.connected = false;
    return;
  }

  try {
    const response = await SimpleHTTP
      .newRequest(`http://${this.socket.address}:${this.socket.port}/public/v1/${endPoint}`)
      .header("Authorization", this.auth)
      .put(JSON.stringify(payload));

    this.connected = true

    return response;
    } catch (err) {     
        this.connected = false
    }
}


private async sendRequest(endPoint: string) {
  if (!this.socket.enabled) {
    this.connected = false;
    return;
  }

  try {
    const response = await SimpleHTTP
      .newRequest(`http://${this.socket.address}:${this.socket.port}/public/v1/${endPoint}`, { interpretResponse: true })
      .header("Authorization", this.auth)
      .get();

     this.connected = true

    return response;
  } catch (err) {
    console.error("Request failed:", err);
    this.connected = false
  }
}
    

   /*  Utility methods */

    private normToDb_linearInDb(v: number): number {
        const clamped = Math.min(1, Math.max(0, v));
        const db = -200 + 200 * clamped;          // map to [-200, 0]
        const quantized = Math.round(db * 10) / 10; // 0.1 dB steps
        return Math.min(0, Math.max(-200, quantized));
    }
    
    private dbToNorm(db: number): number {
        const c = Math.min(0, Math.max(-200, db));
        return (c + 200) / 200;
        }

    private toBase64(str: string): string {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let result = "";
        let i = 0;

        while (i < str.length) {
            const c1 = str.charCodeAt(i++);
            const c2 = str.charCodeAt(i++);
            const c3 = str.charCodeAt(i++);

            const e1 = c1 >> 2;
            const e2 = ((c1 & 3) << 4) | (c2 >> 4);
            const e3 = isNaN(c2) ? 64 : ((c2 & 15) << 2) | (c3 >> 6);
            const e4 = isNaN(c2) || isNaN(c3) ? 64 : (c3 & 63);

            result += chars.charAt(e1) + chars.charAt(e2) + (e3 === 64 ? "=" : chars.charAt(e3)) + (e4 === 64 ? "=" : chars.charAt(e4));
        }
        return result;
    }    
}


/* GET device/pwr */
interface DevicePowerStatus {
  state: "ACTIVE" | "STANDBY"|"ISS_SLEEP" | "PWR_FAIL" 
  poeAllocatedPwr: number;
  poePd15W: boolean;
}

/* GET audio/volume */
interface AudioStatus {
  level: number;   // in dB? (since it's negative)
  mute: boolean;
}

/* GET device/led */
interface LedStatus {
  ledIntensity: number; // 0–100
  rj45Leds: boolean;
  hideClip: boolean;
}

/* GET profile/list  */
interface Profile {
  id: number;
  name: string;
}

interface ProfileStatus {
  selected: number;
  startup: number;
  list: Profile[];
}
/* GET network/zone */
interface Zone {
  zone: number;
  name: string;
}
/* GET aoip identity */
interface AoipIdentity{
    id:string;
    name:string;
    fname:string;
    mac: string;
    locked: boolean;
}
/* GET Input sources available */
interface Inputs {
  input: ("AoIP01" | "AoIP02" | "A")[];
}