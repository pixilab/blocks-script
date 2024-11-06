/**A user script that allows us to collect various usage aspect of blocks and send that data on to Matomo for analysis
 * Make sure the credentials and settings is provided in a config file in script/files/
 * The script will generate an example config file for your convienience.
*/

import {Spot, DisplaySpot, SpotGroup} from "system/Spot";
import {Script, ScriptEnv} from "system_lib/Script";
import {SimpleHTTP} from "system/SimpleHTTP";
import { SimpleFile} from "system/SimpleFile";
import * as Meta from "system_lib/Metadata";


//Some default settings to use if config has not been provided
const DEFAULT_SETTINGS: MatricsProviderSettings = {
    LOGGING_ENABLED:false, //verbose logging
    SYSTEM_NAME: "PIXILAB",
    COUNTRY:"Sweden",
    CITY:"Linkoping",
    TRACKER_URL:"https://yourdomain/matomo.php",
    TRACKED_URL:"http://your_blocks_server",
    ACCESS_TOKEN:"",
    SITE_ID: 1,
    MAX_QUEUE_LENGTH: 50,  //Messages before sending to Matomo
    MAX_SEND_INTERVALL:1000*60, //After 60 Seconds we send anyway.
    LANGUAGE_TAG_MAPPING:{
        se:"Swedish",
        en:"English",
        es:"Spanish",
        de:"German"
    }
}
const API_VERSION = 1; //Script is targetting v.1 Do not change...
const CONFIG_FILE = "MetricsProviderSettings.json";
var settings:MatricsProviderSettings = DEFAULT_SETTINGS;

export class MetricsProvider extends Script {

    private messageInterval?: CancelablePromise<void>;
    public constructor(env : ScriptEnv) {
        super(env);
        this.readSettingsFromFile(); //Get things going..

    }
    /**Looking for a settings file, if not present we create one from default settings to use as an example. */
    private readSettingsFromFile(){
        SimpleFile.readJson(CONFIG_FILE).then(data => {
			try {
				settings = data;
                if (settings){
				    this.getAllSpots(Spot); //If we got settings we move on
                }
			} catch (parseError) {
				console.error("Failed parsing JSON data from file", CONFIG_FILE, parseError);
			}
		}).catch(	// Failed reading file. Try wo write example file.
			error => {
				console.log(error + " Could not find config, trying to write example file to script/files/ " + CONFIG_FILE)
                SimpleFile.write(CONFIG_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2)) //stringify parameters to prettify the settings file
                .then(() =>
                    console.log("Config file not found. Exemple written to", CONFIG_FILE)
                ).catch(error =>
                    console.error("Failed writing to", CONFIG_FILE, error)
                );
            }
		);
    }
    private messageQueue: MatomoBulkMessage = {
        requests:[],
        token_auth:settings.ACCESS_TOKEN
    };

   /**Finds all assigned spots in the system and start tracking them.
    **/
    private getAllSpots(spotGroup:SpotGroup){
    let spotGroupItems = spotGroup
        for (let item in spotGroupItems) {
            let spotGroupItem = spotGroupItems[item];
            const displaySpot = spotGroupItem.isOfTypeName("DisplaySpot")
            if (displaySpot){
                log("Found displayspot: " + spotGroupItem.fullName)
                new TrackedSpot(spotGroupItem, this);
            } else {
                const spotGroup = spotGroupItem.isOfTypeName("SpotGroup")
                if (spotGroup) {
                    log("Found spotgroup: " + spotGroupItem.fullName + " find spots recursive")
                    this.getAllSpots(spotGroupItem)
                }
            }
        }
    }
    /**Recreate a spot that got the finish event from its previous name i.e. from a setting change.
     **/
    recreateTrackedSpot(spotPath:string){
       const spotPathWithoutSpot = spotPath.replace(/^Spot\./, '');
        if (Spot[spotPathWithoutSpot]){
            log("Recreated spot: " + spotPathWithoutSpot)
            new TrackedSpot(Spot[spotPathWithoutSpot], this);
        }
    }

    /**Return current time in hour minutes seconds as separate parameters
    */
    private  getCurrentTime(): { h: number; m: number; s: number } {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();

            return { h: hours, m: minutes, s: seconds };
        }

    /**Format a tracking message that fit Matomo
    */
    createMatomoMsg(actionName:string, url:string, id:string){
        let time:TimeStamp = this.getCurrentTime()
        let message:MatomoMessage = {
                idsite: settings.SITE_ID,
                rec: 1,
                action_name: actionName,
                url: url,
                cid: id,
                rand: Math.floor(Math.random() * 10000),
                apiv: API_VERSION,
                h: time.h,
                m: time.m,
                s:time.s,
        }
        this.queueMessage(message)
    }

    /**We queue up some messages before we send them on to optimise communication*/
    private queueMessage(message:MatomoMessage){
        const newMessage = '?' + Object.keys(message)
        .map(key => `${key}=${message[key]}`)
        .join('&');
        this.messageQueue.requests.push(newMessage);
        log("Queued a new message: " + newMessage);
        log("Queue is now: " + this.messageQueue.requests.length )
        if (!this.messageInterval) {
            this.messageInterval = wait(settings.MAX_SEND_INTERVALL);
            this.messageInterval.then(()=> {
                this.messageInterval.cancel();
                this.messageInterval = undefined;
                this.sendMessageQueue();
            });
        }
        if (this.messageQueue.requests.length >= settings.MAX_QUEUE_LENGTH){
            this.sendMessageQueue();
            this.messageQueue.requests=[]; //Clear the queue to allow for new data to arrive.
             // Cancel and clear out any existing send timer since we just sent what we had.
            if (this.messageInterval) {
                this.messageInterval.cancel();
                this.messageInterval = undefined;
            }
        }
    }

    async sendMessageQueue () : Promise<any>{
        let tempQueue = {...this.messageQueue}
        this.messageQueue.requests=[] //clear the cue to get ready for any arriving new messages while sending
        log("Sending outgoing message: " + JSON.stringify(tempQueue));
        const request = SimpleHTTP.newRequest(settings.TRACKER_URL);
        return request.post(JSON.stringify(tempQueue), 'application/json')
        .catch((error) => {
            console.error("Connection to the tracker failed:", error);
            //We could consider to write data that could not be sent to file that can be sent later.
        });
    }

    @Meta.callable("Reinitialize script")
    public reinit(){
        this.reInitialize();
    }

    getTagMappedFullName(key: string): string | undefined {
        const lowercaseKey = key.toLowerCase();

        if (lowercaseKey in settings.LANGUAGE_TAG_MAPPING) {
          return settings.LANGUAGE_TAG_MAPPING[lowercaseKey];
        } else {
          return undefined;
        }
      }
}

function createRandomHexString(length:number):string{
    const characters = '0123456789abcdef';
    let hexString = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      hexString += characters.charAt(randomIndex);
    }
    return hexString;
}

function replaceDoubleSlashWSingle(inputString: string): string {
    // Use a regular expression to match two consecutive forward slashes
    const regex = /\/\//g;

    // Replace the first occurrence of two consecutive forward slashes with a single forward slash
    const resultString = inputString.replace(regex, '/');

    return resultString;
  }


function log(msg:any){
    if (settings.LOGGING_ENABLED)
    	console.log(msg)
}

class TrackedSpot {

    private trackedSpotName : string = "";
    private hasAttractor : boolean = false;
    private userID: string = "";
    private currentLanguage:string ="";
    constructor (
        protected readonly trackedSpot : DisplaySpot,
        protected readonly owner : MetricsProvider
    ) {
        log("Tracked spot created " + this.trackedSpot.fullName);
        this.trackedSpotName = this.trackedSpot.fullName
        this.hookUpSources();
    }



    private onPropChanged(sender:DisplaySpot,message:any) {
        switch (message.type) {
            case "DefaultBlock":
                log("Handling DefaultBlock message");
                this.onPropDefaultBlockChanged();
                break;
            case "PriorityBlock":
                log("Handling PriorityBlock message");
                this.onPropPriorityBlockChanged();
                break;
            case "PlayingBlock":
                log("Handling PlayingBlock message");
                this.onPropPlayingBlockChanged();
                break;
            case "InputSource":
                log("Handling InputSource message");
                this.onPropInputSourceChanged();
                break;
            case "Volume":
                log("Handling Volume message");
                this.onPropVolumeChanged();
                break;
            case "Active":
                log("Handling Active message");
                this.onPropActiveChanged();
                break;
            case "Playing":
                log("Handling Playing message");
                this.onPropPlayingChanged();
                break;
            case "TagSet":
                log("Handling TagSet message");
                this.onPropTagSetChanged(sender)
                break;
            default:
                // Handle unexpected message types
                console.error("Unexpected message type: ", message.type);
                break;
        }
    }


    private onPropDefaultBlockChanged(){

    }
    private onPropPriorityBlockChanged(){

    }
    private onPropPlayingBlockChanged(){
    this.hasAttractor = false;
    let trackedPath = settings.TRACKED_URL + "/" + this.trackedSpot.fullName + "/" + this.trackedSpot.playingBlock + "/" + (this.currentLanguage ? this.currentLanguage : "")
    //If we have a language selected we syntesize it into the full path.
    let actionName = this.trackedSpot.playingBlock
    if (!actionName){
        actionName="No_block_playing"
    }
    this.owner.createMatomoMsg(actionName,trackedPath ,this.userID)
    }
    private onPropInputSourceChanged(){

    }
    private onPropVolumeChanged(){

    }
    private onPropActiveChanged(){
        if (this.trackedSpot.active){
            this.hasAttractor = true; //Set the hasAttractor if we ever see aktive=true since last blockchange
            this.userID = createRandomHexString(16);//Since we saw active change we assume a new user.
            log("New user created: " + this.userID);
        }
    }
    private onPropPlayingChanged(){

    }
    private onPropTagSetChanged(sender:DisplaySpot){
    let tags=sender.tagSet.split(",")
    let foundMatch = false
    tags.forEach((tag) => { //look for tags that has been mapped as language tagsin settings. We assume only one language tag at any given time.
        let mappedFullName = this.owner.getTagMappedFullName(tag.trim()) //trim off any leading spaces from the tag and get full name.
        if (mappedFullName !== undefined){
            foundMatch = true
            this.currentLanguage = mappedFullName
        } else if (!foundMatch)
        this.currentLanguage = ""

      });
    }

    private onNavigation(sender: DisplaySpot, message: {foundPath: string}) : void
    { // (sender.fullName ? sender.fullName + "/" : "")
        log("Got some navigation data " + message.foundPath)
        let trackedPath = settings.TRACKED_URL + "/" + sender.fullName + "/" + this.trackedSpot.playingBlock + "/" + (this.currentLanguage ? this.currentLanguage : "") + replaceDoubleSlashWSingle(message.foundPath)
        //If we have a language selected we syntesize it into the full path.
        let actionName = this.trackedSpot.playingBlock + replaceDoubleSlashWSingle(message.foundPath)
        this.owner.createMatomoMsg(actionName,trackedPath , this.userID)
    }

    private onConnectChanged(sender:DisplaySpot,message:any):void{
        log("Connection changed");
    }

    private trackedSpotFinished(){
        log("Spot finshed: " + this.trackedSpotName);
        this.owner.recreateTrackedSpot(this.trackedSpotName);
    }

    private hookUpSources(): void
    {
        this.trackedSpot.subscribe('navigation', (sender, message) => this.onNavigation(sender,message));
        this.trackedSpot.subscribe('spot', (sender, message) => this.onPropChanged(sender,message));
        this.trackedSpot.subscribe('connect', (sender, message) => this.onConnectChanged(sender,message));
        this.trackedSpot.subscribe('finish', () => this.trackedSpotFinished());
    }


}
/**https://developer.matomo.org/api-reference/tracking-api*/
interface MatomoMessage {
idsite?:number
rec?:number
action_name:string
url?:string
_id?:string //hexadecimal string 16 chars
cid?:string //defined the Visitor ID for this request
rand?:number //random number for cache busting
apiv?:number //Set to one (at time of writing)
h:number //hour
m:number //minute
s:number //second
[key: string]: number | string;
}

interface TimeStamp{
    h:number,
    m:number,
    s:number
}

interface MatomoBulkMessage{
    requests: string[];
    token_auth: string;
}

interface MatricsProviderSettings {
    SYSTEM_NAME:string
    COUNTRY:string,
    CITY:string,
    LOGGING_ENABLED: boolean,
    TRACKER_URL:string,
    TRACKED_URL:string
    ACCESS_TOKEN:string,
    SITE_ID:number,
    MAX_QUEUE_LENGTH:number,
    MAX_SEND_INTERVALL:number,
    LANGUAGE_TAG_MAPPING: Record<string, string>;
}
interface Vistor {
    userId:string,
    selectedLanguage:String
}
