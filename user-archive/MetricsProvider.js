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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsProvider = void 0;
const Spot_1 = require("../system/Spot");
const Script_1 = require("../system_lib/Script");
const SimpleHTTP_1 = require("../system/SimpleHTTP");
const SimpleFile_1 = require("../system/SimpleFile");
const Meta = __importStar(require("../system_lib/Metadata"));
const DEFAULT_SETTINGS = {
    LOGGING_ENABLED: false,
    SYSTEM_NAME: "PIXILAB",
    COUNTRY: "Sweden",
    CITY: "Linkoping",
    TRACKER_URL: "https://yourdomain/matomo.php",
    TRACKED_URL: "http://your_blocks_server",
    ACCESS_TOKEN: "",
    SITE_ID: 1,
    MAX_QUEUE_LENGTH: 50,
    MAX_SEND_INTERVALL: 1000 * 60,
    LANGUAGE_TAG_MAPPING: {
        se: "Swedish",
        en: "English",
        es: "Spanish",
        de: "German"
    }
};
const API_VERSION = 1;
const CONFIG_FILE = "MetricsProviderSettings.json";
var settings = DEFAULT_SETTINGS;
class MetricsProvider extends Script_1.Script {
    messageInterval;
    constructor(env) {
        super(env);
        this.readSettingsFromFile();
    }
    readSettingsFromFile() {
        SimpleFile_1.SimpleFile.readJson(CONFIG_FILE).then(data => {
            try {
                settings = data;
                if (settings)
                    this.getAllSpots(Spot_1.Spot);
            }
            catch (parseError) {
                console.error("Failed parsing JSON data from file", CONFIG_FILE, parseError);
            }
        }).catch(error => {
            console.log(error + " Could not find config, trying to write example file to script/files/ " + CONFIG_FILE);
            SimpleFile_1.SimpleFile.write(CONFIG_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2)).then(() => console.error("MetricsProvider config file missing. Exemple written to", CONFIG_FILE)).catch(error => console.error("Failed writing to", CONFIG_FILE, error));
        });
    }
    messageQueue = {
        requests: [],
        token_auth: settings.ACCESS_TOKEN
    };
    getAllSpots(spotGroup) {
        let spotGroupItems = spotGroup;
        for (let item in spotGroupItems) {
            let spotGroupItem = spotGroupItems[item];
            const displaySpot = spotGroupItem.isOfTypeName("DisplaySpot");
            if (displaySpot) {
                log("Found Display Spot: " + spotGroupItem.fullName);
                new TrackedSpot(spotGroupItem, this);
            }
            else {
                const spotGroup = spotGroupItem.isOfTypeName("SpotGroup");
                if (spotGroup) {
                    log("Found Spot Group: " + spotGroupItem.fullName + " find spots recursive");
                    this.getAllSpots(spotGroupItem);
                }
            }
        }
    }
    recreateTrackedSpot(spotPath) {
        const spotPathWithoutSpot = spotPath.replace(/^Spot\./, '');
        if (Spot_1.Spot[spotPathWithoutSpot]) {
            log("Recreated spot: " + spotPathWithoutSpot);
            new TrackedSpot(Spot_1.Spot[spotPathWithoutSpot], this);
        }
    }
    getCurrentTime() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        return { h: hours, m: minutes, s: seconds };
    }
    createMatomoMsg(actionName, url, id) {
        let time = this.getCurrentTime();
        let message = {
            idsite: settings.SITE_ID,
            rec: 1,
            action_name: actionName,
            url: url,
            cid: id,
            rand: Math.floor(Math.random() * 10000),
            apiv: API_VERSION,
            h: time.h,
            m: time.m,
            s: time.s,
        };
        this.queueMessage(message);
    }
    queueMessage(message) {
        const newMessage = '?' + Object.keys(message)
            .map(key => `${key}=${message[key]}`)
            .join('&');
        this.messageQueue.requests.push(newMessage);
        log("Queued a new message: " + newMessage);
        log("Queue is now: " + this.messageQueue.requests.length);
        if (!this.messageInterval) {
            this.messageInterval = wait(settings.MAX_SEND_INTERVALL);
            this.messageInterval.then(() => {
                this.messageInterval.cancel();
                this.messageInterval = undefined;
                this.sendMessageQueue();
            });
        }
        if (this.messageQueue.requests.length >= settings.MAX_QUEUE_LENGTH) {
            this.sendMessageQueue();
            this.messageQueue.requests = [];
            if (this.messageInterval) {
                this.messageInterval.cancel();
                this.messageInterval = undefined;
            }
        }
    }
    async sendMessageQueue() {
        let tempQueue = { ...this.messageQueue };
        this.messageQueue.requests = [];
        log("Sending outgoing message: " + JSON.stringify(tempQueue));
        const request = SimpleHTTP_1.SimpleHTTP.newRequest(settings.TRACKER_URL);
        return request.post(JSON.stringify(tempQueue), 'application/json')
            .catch((error) => {
            console.error("Matomo connection failed:", error);
        });
    }
    reinit() {
        this.reInitialize();
    }
    getTagMappedFullName(key) {
        const lowercaseKey = key.toLowerCase();
        if (lowercaseKey in settings.LANGUAGE_TAG_MAPPING)
            return settings.LANGUAGE_TAG_MAPPING[lowercaseKey];
        else
            return undefined;
    }
}
exports.MetricsProvider = MetricsProvider;
__decorate([
    Meta.callable("Restart script, reloading its configuration file"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MetricsProvider.prototype, "reinit", null);
function createRandomHexString(length) {
    const characters = '0123456789abcdef';
    let hexString = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        hexString += characters.charAt(randomIndex);
    }
    return hexString;
}
function replaceDoubleSlashWSingle(inputString) {
    const regex = /\/\//g;
    const resultString = inputString.replace(regex, '/');
    return resultString;
}
function log(msg) {
    if (settings.LOGGING_ENABLED)
        console.log(msg);
}
class TrackedSpot {
    trackedSpot;
    owner;
    trackedSpotName = "";
    hasAttractor = false;
    userID = "";
    currentLanguage = "";
    constructor(trackedSpot, owner) {
        this.trackedSpot = trackedSpot;
        this.owner = owner;
        log("Tracked spot created " + this.trackedSpot.fullName);
        this.trackedSpotName = this.trackedSpot.fullName;
        this.hookUpSources();
    }
    onPropChanged(sender, message) {
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
                this.onPropTagSetChanged(sender);
                break;
            default:
                console.error("Unexpected message type: ", message.type);
                break;
        }
    }
    onPropDefaultBlockChanged() {
    }
    onPropPriorityBlockChanged() {
    }
    onPropPlayingBlockChanged() {
        this.hasAttractor = false;
        let trackedPath = settings.TRACKED_URL + "/" + this.trackedSpot.fullName + "/" + this.trackedSpot.playingBlock + "/" + (this.currentLanguage ? this.currentLanguage : "");
        let actionName = this.trackedSpot.playingBlock;
        if (!actionName) {
            actionName = "No_block_playing";
        }
        this.owner.createMatomoMsg(actionName, trackedPath, this.userID);
    }
    onPropInputSourceChanged() {
    }
    onPropVolumeChanged() {
    }
    onPropActiveChanged() {
        if (this.trackedSpot.active) {
            this.hasAttractor = true;
            this.userID = createRandomHexString(16);
            log("New user created: " + this.userID);
        }
    }
    onPropPlayingChanged() {
    }
    onPropTagSetChanged(sender) {
        let tags = sender.tagSet.split(",");
        let foundMatch = false;
        tags.forEach((tag) => {
            let mappedFullName = this.owner.getTagMappedFullName(tag.trim());
            if (mappedFullName !== undefined) {
                foundMatch = true;
                this.currentLanguage = mappedFullName;
            }
            else if (!foundMatch)
                this.currentLanguage = "";
        });
    }
    onNavigation(sender, message) {
        log("Got some navigation data " + message.foundPath);
        let trackedPath = settings.TRACKED_URL + "/" + sender.fullName + "/" + this.trackedSpot.playingBlock + "/" + (this.currentLanguage ? this.currentLanguage : "") + replaceDoubleSlashWSingle(message.foundPath);
        let actionName = this.trackedSpot.playingBlock + replaceDoubleSlashWSingle(message.foundPath);
        this.owner.createMatomoMsg(actionName, trackedPath, this.userID);
    }
    onConnectChanged(sender, message) {
        log("Connection changed");
    }
    trackedSpotFinished() {
        log("Spot finshed: " + this.trackedSpotName);
        this.owner.recreateTrackedSpot(this.trackedSpotName);
    }
    hookUpSources() {
        this.trackedSpot.subscribe('navigation', (sender, message) => this.onNavigation(sender, message));
        this.trackedSpot.subscribe('spot', (sender, message) => this.onPropChanged(sender, message));
        this.trackedSpot.subscribe('connect', (sender, message) => this.onConnectChanged(sender, message));
        this.trackedSpot.subscribe('finish', () => this.trackedSpotFinished());
    }
}
