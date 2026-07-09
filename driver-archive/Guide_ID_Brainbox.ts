
/**
 * Guide_ID_Brainbox driver
 *
 * Purpose:
 *  - Send guide ID codes and periodic timestamps to a Guide-ID Brainbox  device.
 *
 * Transport:
 *  - Supports `NetworkTCP` (default port 4001) and `SerialPort` (default 115200 baud).
 *
 * Configuration & behavior:
 *  - Spot path is taken from driver options or the serial device address.
 *  - Uses the `GUIDE_ID` Spot parameter to send `brightsign code <id>` when the Spot becomes active.
 *  - Sends timestamp updates as `brightsign timestamp HH:MM:SS:MMM` at intervals controlled
 *    by `sendUpdateIntervalMs` (default 500 ms). Updates are aligned to the interval boundary.
 *  - On connection the driver sends `console video 1` to enable the console output on the device.
 *  - Scheduled updates are cancelled when the connection or Spot finishes.
 *
 * Notes:
 *  - Keep `sendUpdateIntervalMs` in sync with device expectations to avoid flooding.
 * 
 * v.1.0.0  - Initial version
 * v.1.0.1  - Add loopdetection to resend the current video code if time goes backwards, likely due to a loop in the content. 
 *            to ensure that the brainbox will resync to the correct video in case of a loop.
 *          - Requires server version 7.5.2 because of a bug fixed in TimeFlow
 * v.1.0.2  - Add instance debug logging and callable to enable it. Debug logging is disabled by default to avoid performance issues, but can be enabled to troubleshoot and verify the communication with the brainbox.
 * v.1.0.3  - Bugfix debug logging flag now declared in the export class..
 *
 * Copyright (c) 2026 PIXILAB Technologies AB
 * Author: Mattias Andersson
 */


import { SerialPort,NetworkTCP } from "system/Network";
import { Driver } from "system_lib/Driver";
import { callable, driver} from "system_lib/Metadata";
import { DisplaySpot, Spot } from "../system/Spot";



type ConnType = NetworkTCP | SerialPort;

const idParameterName = "GUIDE_ID";
const sendUpdateIntervalMs = 500;



@driver('NetworkTCP', { port: 4001 })
@driver('SerialPort', { baudRate: 115200})

export class Guide_ID_Brainbox extends Driver<ConnType> {
private spotPath: string; //Not the full path, just the spot name and its group 
private mySpot: DisplaySpot;
private paramPropAccessor: any;
private timePropAccessor: any;
private scheduledUpdate:CancelablePromise<void>;
private holdUpdate:CancelablePromise<void>; //to delay loop while waiting if this is also ID change
private lastTime = 0; //Store last time to detect loops
private firstTime = true; //Flag be able to kickstart loop detection until we have looped
private timeRecived:TimeFlow;
private debugLogging = false; // Set to true to enable verbose logging

    public constructor(private connection: ConnType) {
		super(connection);
        connection.autoConnect();
        if (connection.enabled){
         this.spotPath = connection.options || connection.addressString;

        if (!connection.options && isIpOrLocalhost(connection.addressString)) {
            console.error("Missing driver option: Spot path must be specified when address is an IP or localhost");
        } else {
            console.log("Using spot path: " + this.spotPath);
            this.mySpot = Spot[this.spotPath] as DisplaySpot;
            this.connection.subscribe('textReceived', (sender, msg) => {
                this.onData(msg.text);
            });   
            this.connection.subscribe('finish', () => {
            this.scheduledUpdate?.cancel();
            this.scheduledUpdate = undefined;
            }); 
            this.connection.subscribe('connect', (sender, msg) => {
                if (msg){
                    this.log("Guide ID Brainbox connected");
                    this.sendData("\r\n" + "console video 1");  // Initialize B-Box 
                }
            });
            this.hookUpSpotSubs();
            console.log("Guide ID Brainbox driver initialized use spot: " + this.spotPath);
            }
        }
    }
    private hookUpSpotSubs(): void{

        //Track any parameter video ID change.
        this.paramPropAccessor = this.getProperty<string>("Spot." + this.spotPath + ".parameter." + idParameterName, value=>this.onParameterChanged(value))
        this.timePropAccessor = this.getProperty<TimeFlow>("Spot." + this.spotPath + ".time", value=>this.onTimeChange(value))
        this.mySpot.subscribe('connect', (sender, message) => this.onConnectChanged(sender,message));
        this.mySpot.subscribe('finish', () => this.onDisplaySpotFinished());
    } 

    @callable ("Enable debug Logging")debugLogEnable(enable:boolean){
        this.debugLogging = enable;
    }

    private cancelHoldUpdate():void{
        if (this.holdUpdate){
            this.holdUpdate.cancel();
            this.holdUpdate = undefined;
        }
    }


    private onTimeChange(time:TimeFlow):void{
    this.timeRecived = time;
    //If sync source beconmes dead, we should stop sending updates
        if (this.timeRecived.dead){
            this.log("Time flow is dead, stopping sync");
            this.stopSync();
            return;
        }

        //Kickstart the sync 
        this.log("Time changed: " + this.timeRecived.currentTime);
        if (this.firstTime){
        this.startSync()
        this.firstTime = false;
        this.log("firstTime flag is now false, time updates will now be scheduled and loop detection will be active");
        }
        
        //Check if we are looping, we send out the init messages again to make sure the b-box is in right mode.
        if (this.timeRecived.currentTime < this.lastTime){ 
            this.log("Time went backwards, likely due to a  loop. Time: " + this.timeRecived.currentTime + " Last time: " + this.lastTime);
            this.startSync(); 
        }
        this.lastTime = this.timeRecived.currentTime; 
    }

 
    private onDisplaySpotFinished(){
        this.mySpot = Spot[this.spotPath] as DisplaySpot;
         this.hookUpSpotSubs();

    }
    private onParameterChanged(value:string):void{
        this.cancelHoldUpdate();
        this.log("Parameter " + idParameterName + " changed to: " + value);
        this.startSync();
    }

    private onConnectChanged(sender:DisplaySpot,message:any):void{
      
    }
   
    private onData(data: string) {
        this.log("Data received: " + data);
        const splitData = data.split(" ")
        const command = splitData[0];
        const value = splitData[1];
        this.log("Command recieved: " + command + " Value: " + value);
        this.log("Current video id on spot parameter: " + Spot[this.spotPath].parameter[idParameterName]);
        //We must consider the videocode when making, because the Podcasters will broadcast to all brainbox recievers and will make all spots  
        // within active if we only check for the ID, but we only want to activate the one with the matching ID
        if (command === "videocode" && value === Spot[this.spotPath].parameter[idParameterName]){
            const current =  Spot[this.spotPath].active
            if  (current === false) {
            Spot[this.spotPath].active = true
            }
        }   
    }
    startSync(): void {
        this.sendData("\r\n" + "console video 1");
        this.sendData("brightsign code " + Spot[this.spotPath].parameter[idParameterName]);
        this.scheduleTimeUpdate();
    }
    stopSync(): void {
        this.lastTime = 0;
        this.scheduledUpdate?.cancel();
        this.scheduledUpdate = undefined;
        this.sendData("brightsign code 0")
        this.firstTime = true;
        this.log("Sync stopped, firstTime flag set to true");
    }

    sendTimeUpdate(currentTime:number):void{
        const data = "brightsign timestamp " + msToTime(currentTime);
        this.sendData(data);
    }

   private scheduleTimeUpdate(): void {
        if (this.scheduledUpdate)
            this.scheduledUpdate.cancel();
    
        this.sendTimeUpdate(this.timeRecived.currentTime);
        this.scheduledUpdate = wait(sendUpdateIntervalMs);
        this.scheduledUpdate.then(() => {
            if (Spot[this.spotPath].playingBlock !== "") //Only reschedule update if there is still a block assigned
                this.scheduleTimeUpdate();
            });
        } 
    private sendData(data: string) {
        this.log("Sending data: " + data);
        if (this.connection.connected)
            this.connection.sendText(data);
    }

    private log(...messages: any[]) {
    if (this.debugLogging)
        console.log(this.spotPath + " " + messages);
    }
}
 
function isIpOrLocalhost(addr: string): boolean {
    return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(addr) || addr === "localhost";
}

function msToTime(ms: number): string {
        let hours = Math.floor(ms / 3600000);
        ms %= 3600000;

        let minutes = Math.floor(ms / 60000);
        ms %= 60000;

        let seconds = Math.floor(ms / 1000);
        let milliseconds = ms % 1000;

        function pad(num: number, size: number): string {
            let s = String(num);
            while (s.length < size) s = "0" + s;
            return s;
        }

        return pad(hours, 2) + ":" +
               pad(minutes, 2) + ":" +
               pad(seconds, 2) + ":" +
               pad(milliseconds, 3);
    }