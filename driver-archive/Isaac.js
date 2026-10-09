"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Isaac = void 0;
const SimpleHTTP_1 = require("../system/SimpleHTTP");
const Metadata_1 = require("../system_lib/Metadata");
const Realm_1 = require("../system/Realm");
const Driver_1 = require("../system_lib/Driver");
const Spot_1 = require("../system/Spot");
const SimpleFile_1 = require("../system/SimpleFile");
const ISAAC_BLOCKGROUP_PATH = "$$isaac/";
class Talker {
    owner;
    constructor(owner) {
        this.owner = owner;
    }
    letsTalk() {
        this.owner.somethingToSay(this);
    }
}
class Logger extends Talker {
    messagesToSend = [];
    constructor(owner) {
        super(owner);
    }
    logInfo(message) {
        this.logMsg({ message: message, severity: 'info' });
    }
    logMsg(message) {
        const wasLogMsgCount = this.messagesToSend.length;
        if (wasLogMsgCount < 100) {
            this.messagesToSend.push(message);
            if (!wasLogMsgCount)
                this.letsTalk();
        }
        else
            console.error("Logging can't keep up - dropping messages");
    }
    needsToTalk() {
        return !!this.messagesToSend.length;
    }
    saySomething() {
        return this.owner.sendLog(this.messagesToSend.shift());
    }
    whatToSay() {
        return "log " + this.messagesToSend[0];
    }
}
class VarSnitch extends Talker {
    pending;
    order;
    constructor(owner) {
        super(owner);
        this.pending = {};
        this.order = [];
    }
    notify(key, value) {
        log("notify", key, value);
        if (value === undefined)
            console.warn("Variable undefined", key);
        else {
            const knownProperty = this.pending.hasOwnProperty(key);
            this.pending[key] = value;
            if (!knownProperty) {
                this.order.push(key);
                if (this.order.length === 1)
                    this.letsTalk();
            }
        }
    }
    needsToTalk() {
        return !!this.order.length;
    }
    saySomething() {
        const key = this.order.shift();
        const valueToTell = this.pending[key];
        delete this.pending[key];
        const result = this.owner.sendVarChange(key, valueToTell);
        return result;
    }
    whatToSay() {
        const key = this.order[0];
        return "variable " + key + ' value ' + this.pending[key];
    }
}
let Isaac = class Isaac extends Driver_1.Driver {
    socket;
    configuration;
    origin;
    accessors;
    varSnitch;
    logger;
    talkers;
    nextTalkerIx = 0;
    varIds;
    taskIds;
    varsSubscribed;
    heartBeatTimer;
    keepAliveTimer;
    waitingToTalk;
    subsystemExternalId;
    spots = [];
    idToSpots = {};
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.setMaxLineLength(3024);
        socket.autoConnect();
        this.varIds = {};
        this.taskIds = {};
        this.talkers = [];
        this.varSnitch = new VarSnitch(this);
        this.talkers.push(this.varSnitch);
        this.logger = new Logger(this);
        this.talkers.push(this.logger);
        this.accessors = [];
        this.checkIfTheresIsaacBlckGroup();
        this.init()
            .then(() => log("Isaac driver initialized."))
            .catch(error => console.error("Startup failed", error));
    }
    async checkIfTheresIsaacBlckGroup() {
        let result = await SimpleFile_1.SimpleFile.exists(ISAAC_BLOCKGROUP_PATH);
        if (result === 0) {
            await SimpleFile_1.SimpleFile.write(ISAAC_BLOCKGROUP_PATH + "README.txt", "This folder/group holds blocks generated for use by ISAAC.");
        }
    }
    async setupWhiteListedSpots() {
        for (let i = 0; i < this.configuration.playersWhiteList.length; i++) {
            let displaySpotPath = this.configuration.playersWhiteList[i].replace("-", ".");
            if (Spot_1.Spot[displaySpotPath] && Spot_1.Spot[displaySpotPath].isOfTypeName('DisplaySpot'))
                this.addPlayer(displaySpotPath);
            else
                console.warn("White listed spot not found: " + displaySpotPath);
        }
    }
    async setupAllSpots() {
        let subSpotGroups = [];
        let blackListExists = false;
        if (this.configuration.playersBlackList && this.configuration.playersBlackList.length !== 0)
            blackListExists = true;
        for (const spotGroupItemName in Spot_1.Spot) {
            if (Spot_1.Spot[spotGroupItemName].isOfTypeName('SpotGroup'))
                subSpotGroups.push(Spot_1.Spot[spotGroupItemName].fullName.substring(5));
            if (Spot_1.Spot[spotGroupItemName].isOfTypeName('DisplaySpot')) {
                if (blackListExists) {
                    if (this.configuration.playersBlackList.indexOf((Spot_1.Spot[spotGroupItemName].fullName).slice(5).replace(/\./g, "-")) === -1) {
                        this.addPlayer(spotGroupItemName);
                    }
                }
                else
                    this.addPlayer(spotGroupItemName);
            }
        }
        this.iterateSpotGroups(subSpotGroups);
    }
    iterateSpotGroups(spotGroupsToSearch) {
        let newSubGroupsToSearch = [];
        if (spotGroupsToSearch && spotGroupsToSearch.length > 0) {
            for (let i = 0; i < spotGroupsToSearch.length; i++) {
                let spotGroup = Spot_1.Spot[spotGroupsToSearch[i]];
                for (const spotGroupItemName in spotGroup) {
                    const displaySpot = spotGroup[spotGroupItemName].isOfTypeName('DisplaySpot');
                    const isSpotGroup = spotGroup[spotGroupItemName].isOfTypeName('SpotGroup');
                    if (displaySpot)
                        this.addPlayer(spotGroupItemName);
                    if (isSpotGroup)
                        newSubGroupsToSearch.push(isSpotGroup.fullName.substring(5));
                }
            }
            this.iterateSpotGroups(newSubGroupsToSearch);
        }
        else {
            log("ISAAC (driver): Finished adding Spots: " + this.spots.length + " added!");
            return true;
        }
    }
    addPlayer(displaySpotPath) {
        let isaacPlayerId = Spot_1.Spot[displaySpotPath].fullName.slice(5).replace(/\./g, "-");
        let player = new Player(isaacPlayerId, Spot_1.Spot[displaySpotPath].name);
        this.spots.push(player);
        this.idToSpots[isaacPlayerId] = this.spots.length - 1;
    }
    async init() {
        await this.config();
        if (this.socket.enabled)
            this.heartBeat();
    }
    log(message) {
        this.logger.logInfo(message);
    }
    async config() {
        if (!this.socket.options)
            throw "Configuration options not set";
        const config = JSON.parse(this.socket.options);
        if (typeof config === 'object') {
            this.configuration = config;
            this.origin = (config.protocol || 'http') + '://' + this.socket.addressString;
            log("Origin", this.origin);
            if (this.configuration.playersWhiteList && this.configuration.playersWhiteList.length !== 0) {
                await this.setupWhiteListedSpots();
            }
            else {
                await this.setupAllSpots();
            }
            await this.obtainSubsystemExternalId();
            if (this.socket.enabled && this.subsystemExternalId) {
                await this.hookupVars(config);
                await this.hookupEvents(config);
            }
        }
        else
            throw "Invalid configuration";
    }
    async obtainSubsystemExternalId() {
        try {
            const containerEndpoint = "/api/v1/players/";
            let containerResponse = await this
                .newRequest(containerEndpoint + this.spots[0].spotIsaacId, false)
                .get();
            let containerId = JSON.parse(containerResponse.data)["container"];
            let subsystemIDEndpoint = "/api/v1/subsystems/";
            let subsystemExternalIdResponse = await this
                .newRequest(subsystemIDEndpoint + containerId, false)
                .get();
            let subsystemID = JSON.parse(subsystemExternalIdResponse.data)["externalId"];
            if (subsystemID)
                this.subsystemExternalId = subsystemID;
        }
        catch (error) {
            console.warn("Error while fetching Blocks subsystem ID!");
        }
    }
    async hookupVars(config) {
        if (config.variables) {
            const endpoint = '/api/v1/variables';
            const existingVars = await this
                .newRequest(endpoint + '?subsystemExternalId=' + this.subsystemExternalId)
                .get();
            const setOfKnownVars = {};
            for (const xv of existingVars.interpreted) {
                setOfKnownVars[xv.externalRef] = xv._id;
                this.varIds[xv.externalRef] = xv._id;
            }
            delete setOfKnownVars["last_contacted_at"];
            delete setOfKnownVars["is_alive"];
            const spec = {
                subsystemExternalId: this.subsystemExternalId,
                externalRef: null
            };
            for (let varName of config.variables) {
                spec.externalRef = varName;
                if (setOfKnownVars[varName])
                    delete setOfKnownVars[varName];
                else {
                    const result = await this.newRequest(endpoint).post(JSON.stringify(spec));
                    if (result.status > 299)
                        console.warn(endpoint, result.status, result.data);
                    this.varIds[varName] = result.interpreted._id;
                }
                if (!this.varsSubscribed)
                    this.establishVariable(varName);
            }
            this.varsSubscribed = true;
            for (const unwanted in setOfKnownVars) {
                const id = setOfKnownVars[unwanted];
                log("Removing variable", unwanted, "with ID", id);
                await this.newRequest(endpoint + '/' + id).delete();
            }
        }
    }
    async hookupEvents(config) {
        if (config.events) {
            const endpoint = '/api/v1/events';
            const existingVars = await this
                .newRequest(endpoint + '?subsystemExternalId=' + this.subsystemExternalId)
                .get();
            const knownTasks = {};
            for (const xv of existingVars.interpreted) {
                knownTasks[xv.externalRef] = xv._id;
                this.taskIds[xv.externalRef] = xv._id;
                log("Known task", xv.externalRef);
            }
            const spec = {
                subsystemExternalId: this.subsystemExternalId,
                active: true,
                availableInSubsystem: true,
                externalRef: null,
                displayName: null,
                command: null
            };
            for (let evtName of config.events) {
                if (knownTasks[evtName])
                    delete knownTasks[evtName];
                else {
                    spec.externalRef = evtName;
                    spec.command = evtName;
                    spec.displayName = evtName;
                    const result = await this.newRequest(endpoint).post(JSON.stringify(spec));
                    if (result.status > 299)
                        console.warn(endpoint, result.status, result.data);
                    this.taskIds[evtName] = result.interpreted._id;
                }
            }
            this.hookupEventTriggers(config);
            for (const unwanted in knownTasks) {
                const id = knownTasks[unwanted];
                log("Removing event", unwanted, "with ID", id);
                await this.newRequest(endpoint + '/' + id).delete();
            }
        }
    }
    registerEvents(eventPaths, ix = 0) {
        if (eventPaths.length > ix) {
            const path = eventPaths[ix];
            log("registerEvents", path);
            let eventSpec = {
                command: path,
                displayName: path,
                externalRef: path,
                subsystemExternalId: this.subsystemExternalId,
                active: true,
                availableInSubsystem: true
            };
            this.newRequest('/api/v1/events')
                .post(JSON.stringify(eventSpec))
                .then(result => {
                if (result.status > 299)
                    console.warn("/api/v1/events", result.status, result.data);
                else if (++ix < eventPaths.length)
                    this.registerEvents(eventPaths, ix);
            })
                .catch(error => console.error("/api/v1/events failed", error));
        }
    }
    hookupEventTriggers(config) {
        const socket = this.socket;
        this.initRpc(socket);
        socket.subscribe('connect', (sender, message) => {
            if (message.type === 'Connection') {
                if (sender.connected)
                    this.initRpc(sender);
                else
                    this.rpcConnectionLost();
            }
        });
    }
    initRpc(socket) {
        if (socket.connected) {
            log("RPC socket connected");
            let paramsArray = [this.subsystemExternalId];
            for (let i = 0; i < this.spots.length; i++) {
                paramsArray.push(this.spots[i].spotIsaacId);
            }
            const subscribe = {
                "jsonrpc": "2.0",
                "method": "subscriptions.add",
                "params": paramsArray,
            };
            const textMsg = JSON.stringify(subscribe);
            socket.sendText(textMsg, '\r\n');
            log("initRpc subscriptions.add", textMsg);
            socket.subscribe('textReceived', (sender, message) => {
                try {
                    try {
                        log("Sender: " + sender.fullName);
                        log("RPC message", message.text);
                        const jsonData = JSON.parse(message.text);
                        log("JSON: " + jsonData.params);
                        if (jsonData.jsonrpc === '2.0' && jsonData.method) {
                            log("JSON-RPC data", message.text);
                            this.handleJsonRpcMsg(jsonData);
                        }
                        else if (jsonData.result !== undefined)
                            log("JSON-RPC response", message.text);
                        else
                            console.error("JSON-RPC unexpected data", message.text);
                    }
                    catch (ex) {
                        console.error("JSON-RPC parse error", ex);
                    }
                }
                catch (error) {
                    console.error("JSON-RPC parse error", error, "caused by", message.text);
                }
            });
            this.jsonRpcKeepAlive();
        }
    }
    rpcConnectionLost() {
        console.warn("RPC connection lost");
        if (this.keepAliveTimer) {
            this.keepAliveTimer.cancel();
            this.keepAliveTimer = undefined;
        }
    }
    jsonRpcKeepAlive() {
        this.keepAliveTimer = wait(1000 * 59);
        this.keepAliveTimer.then(() => {
            const pingMsg = '{"jsonrpc":"2.0","method":"ping"}';
            log("rpc sent", pingMsg);
            this.socket.sendText(pingMsg, '\r\n');
            if (this.socket.connected)
                this.jsonRpcKeepAlive();
            else
                this.keepAliveTimer = undefined;
        });
    }
    handleJsonRpcMsg(msg) {
        if (msg.method === "schedule.item.start" && msg.params && msg.params.command) {
            if (msg.params.itemType === "EVENT")
                this.startTask(msg.params.command);
            else if (msg.params.itemType === "PLAYABLE")
                this.handleScheduleStart(msg.params.subsystemExternalId, msg.params);
        }
        else if (msg.method === "schedule.item.end" && msg.params && msg.params.command) {
            if (msg.params.itemType === "PLAYABLE")
                this.handleScheduleEnd(msg.params.subsystemExternalId, msg.params);
        }
        else
            log("rpc message", msg.method);
    }
    async handleScheduleStart(spotIsaac, params) {
        this.getMediaUrl(params.command, spotIsaac, false);
    }
    async redirectingMediaUrl(mediaResult, spotIsaac, priority) {
        let spotIdx = this.idToSpots[spotIsaac];
        this.spots[spotIdx].handleGettingMediaUrl(mediaResult, priority);
    }
    static async checkIfBlockExists(blockPath, mediaType, localParameter, width, height) {
        let blockDir = "/public/block/" + blockPath + "/";
        let exists = await SimpleFile_1.SimpleFile.exists(blockDir);
        if (exists === 0) {
            await SimpleFile_1.SimpleFile.write(blockDir + "Spec.pixi", getSpecJson(mediaType, localParameter, width, height));
            await SimpleFile_1.SimpleFile.write(blockDir + "Meta.json", getMetaJson(width, height));
        }
        return true;
    }
    handleScheduleEnd(spotIsaac, params) {
        let spotIdx = this.idToSpots[spotIsaac];
        this.spots[spotIdx].scheduleEnd();
    }
    establishVariable(path) {
        log("establishVariable", path);
        const accessor = this.getProperty(path, newValue => {
            this.varSnitch.notify(path, newValue);
        });
        if (accessor.available)
            this.varSnitch.notify(path, accessor.value);
        this.accessors.push(accessor);
    }
    shutDown() {
        if (this.heartBeatTimer)
            this.heartBeatTimer.cancel();
        if (this.keepAliveTimer)
            this.keepAliveTimer.cancel();
        for (let accessor of this.accessors)
            accessor.close();
    }
    heartBeat() {
        this.heartBeatTimer = wait(this.configuration.heartbeatInterval || 9300);
        this.heartBeatTimer.then(() => {
            this.sendHeartBeat();
            this.heartBeat();
        });
    }
    sendHeartBeat() {
        for (let i = 0; i < this.spots.length; i++) {
            let spotName = this.spots[i].spotIsaacId.replace(".", "-");
            let isConnected = Spot_1.Spot[spotName].connected;
            if (isConnected) {
                const result = this
                    .newRequest(`/api/v1/subsystems/${spotName}/heartbeat`, false)
                    .put('');
                result.catch(error => console.warn("Heartbeat failure", error));
                result.then(result => this.handleHearBeatResponse(result.data, this.spots[i].spotIsaacId));
            }
        }
        return false;
    }
    handleHearBeatResponse(response, spotIsaac) {
        let res = JSON.parse(response);
        if (res.message[0]) {
            let payloadStr = JSON.stringify(res.message[0].payload);
            if (payloadStr !== "{}") {
                let playable = res.message[0].payload.playable;
                this.getMediaUrl(playable.command, spotIsaac, true);
            }
            else {
                if (res.message[0].type === "forceStop")
                    Spot_1.Spot[spotIsaac.replace("-", ".")].priorityBlock = "";
            }
        }
    }
    getMediaUrl(request, spotIsaac, priority) {
        let cmd = JSON.parse(request);
        let mediaPath = cmd.data.video.self;
        SimpleHTTP_1.SimpleHTTP.newRequest(`${this.origin}/${mediaPath}`).get().then((result) => this.redirectingMediaUrl(result.data, spotIsaac, priority));
    }
    somethingToSay(talker) {
        if (!this.waitingToTalk)
            this.talk();
    }
    waitForNextSaying(toWaitFor) {
        this.waitingToTalk = toWaitFor;
        this.waitingToTalk
            .then(() => this.talk())
            .catch(() => this.talk());
    }
    talk() {
        const talker = this.findTalker();
        if (talker) {
            const msg = talker.whatToSay();
            log("Saying", msg);
            const talkPromise = talker.saySomething();
            talkPromise.catch(error => console.warn("Failed telling", msg, error));
            this.waitForNextSaying(talkPromise);
        }
        else {
            this.waitingToTalk = undefined;
        }
    }
    findTalker() {
        let ix = this.nextTalkerIx;
        const wasTalkerIx = ix;
        let talker = null;
        do {
            talker = this.talkers[ix++];
            if (ix >= this.talkers.length)
                ix = 0;
            if (talker.needsToTalk())
                break;
            talker = null;
        } while (wasTalkerIx !== ix);
        this.nextTalkerIx = ix;
        return talker;
    }
    sendLog(message) {
        const toLog = {
            severity: message.severity,
            key: "general",
            createdByType: "subsystem",
            value: message.message,
            createdBy: this.subsystemExternalId
        };
        return SimpleHTTP_1.SimpleHTTP
            .newRequest(`${this.origin}/api/v1/logs`)
            .post(JSON.stringify(toLog));
    }
    sendVarChange(path, value) {
        log("sendVarChange", path, value);
        const id = this.varIds[path];
        const varData = {
            value: value.toString()
        };
        return this.newRequest(`/api/v1/variables/${id}/value`)
            .post(JSON.stringify(varData));
    }
    newRequest(path, interpretRes = true) {
        let request;
        if (interpretRes) {
            request = SimpleHTTP_1.SimpleHTTP.newRequest(this.origin + path, { interpretResponse: true });
        }
        else {
            request = SimpleHTTP_1.SimpleHTTP.newRequest(this.origin + path);
        }
        const token = this.configuration.token;
        if (token) {
            request.header("isaac-token", token);
        }
        return request;
    }
    startTask(path) {
        const parts = path.split('.');
        if (parts.length !== 3)
            throw "Task path not in the form Realm.Group.Name; " + path;
        const realm = Realm_1.Realm[parts[0]];
        if (!realm)
            throw "No Realm " + parts[0];
        const group = realm.group[parts[1]];
        if (!group)
            throw "No Group " + parts[1];
        const task = group[parts[2]];
        if (!task)
            throw "No Task " + parts[2];
        log("Run task", path);
        task.running = true;
    }
};
exports.Isaac = Isaac;
__decorate([
    (0, Metadata_1.callable)("Log message to Isaac"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], Isaac.prototype, "log", null);
exports.Isaac = Isaac = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 8099 }),
    __metadata("design:paramtypes", [Object])
], Isaac);
const DEBUG = false;
function log(...messages) {
    if (DEBUG)
        console.info(messages);
}
class Player {
    spotIsaacId;
    spotName;
    blockUrl;
    priorityBlock;
    removeMedia;
    constructor(spotIsaacId, spotName) {
        this.spotIsaacId = spotIsaacId;
        this.spotName = spotName;
    }
    async handleGettingMediaUrl(mediaResult, priority) {
        try {
            let mediaJson = JSON.parse(mediaResult);
            let mediaUrl = mediaJson["_links"]["get"];
            let mediaType = mediaJson["metadata"]["mediaInfo"]["@type"];
            let mediaWidth = mediaJson["metadata"]["mediaInfo"]["width"];
            let mediaHeight = mediaJson["metadata"]["mediaInfo"]["height"];
            let spotRef = this.spotIsaacId.replace("-", ".");
            let parameterName;
            let blockPrefix;
            let blockSuffix = "";
            if (priority) {
                if (Spot_1.Spot[spotRef].priorityBlock !==
                    ISAAC_BLOCKGROUP_PATH + "1-" + mediaType + "-priority-" + mediaWidth + "x" + mediaHeight)
                    blockPrefix = "1-";
                else
                    blockPrefix = "2-";
                parameterName = "priorityMediaUrl";
                blockSuffix += "-priority";
            }
            else {
                if (Spot_1.Spot[spotRef].block !==
                    ISAAC_BLOCKGROUP_PATH + "1-" + mediaType)
                    blockPrefix = "1-";
                else
                    blockPrefix = "2-";
                parameterName = "mediaUrl";
            }
            blockSuffix += "-" + mediaWidth + "x" + mediaHeight;
            let blockPath = ISAAC_BLOCKGROUP_PATH + blockPrefix + mediaType + blockSuffix;
            await Isaac.checkIfBlockExists(blockPath, mediaType.toLowerCase(), parameterName, mediaWidth, mediaHeight);
            this.cancelRemovePromise();
            if (priority)
                Spot_1.Spot[spotRef].priorityBlock = blockPath;
            else
                Spot_1.Spot[spotRef].block = blockPath;
            await wait(100);
            Spot_1.Spot[spotRef].parameter[parameterName] = mediaUrl;
        }
        catch (error) {
            console.error(error);
        }
    }
    scheduleEnd() {
        this.cancelRemovePromise();
        this.removeMedia = wait(2000);
        this.removeMedia.then(() => {
            Spot_1.Spot[this.spotIsaacId.replace("-", ".")].block = "";
        });
    }
    cancelRemovePromise() {
        if (this.removeMedia)
            this.removeMedia.cancel();
    }
}
function getMetaJson(width, height) {
    return `{
		"width": ${width},
		"height": ${height},
		"duration": 0,
		"fingerprint": 1763720504639,
		"poster": {
		"mimeType": "image/png",
		"path": "$_BlkSnap.png",
		"width": ${width},
		"height": ${height},
		"thumbnails": [
		{
			"width": -200,
			"height": -200,
			"@cls": ".Dimensions"
		},
		{
			"width": -100,
			"height": -100,
			"@cls": ".Dimensions"
		}
		],
		"@cls": ".PosterMediaInfo"
		},
		"type": "Layered"
	}`;
}
function getSpecJson(mediaType, localParameter, width, height) {
    return `{
	"width": ${width},
	"height": ${height},
	"root": {
	"cssUrl": "",
	"mNextID": 6,
	"blocks": [
	{
		"containerData": {
		"kAARect": {
		"x": 0,
		"y": 0,
		"width": ${width},
		"height": ${height},
		"@cls": ".AARect"
		}
		},
		"htmlClass": "",
		"behaviors": [],
		"localSync": false,
		"excludeFromSync": false,
		"allowPause": false,
		"autoPlay": true,
		"playInline": true,
		"forceControls": "none",
		"pauseToStopDelay": 900000,
		"fitting": "fill",
		"mediaType": "${mediaType}",
		"imageProp": {
		"propPath": ${mediaType === "image" ? `"Local.parameter.${localParameter}"` : `""`},
		"type": 2,
		"@cls": ".PropSpec"
		},
		"playerProp": {
		"propPath": "Local.parameter.${localParameter}",
		"type": 2,
		"@cls": ".PropSpec"
		},
		"id": 5,
		"loop": true,
		"enclosing": "root",
		"@cls": ".MediaURL"
	}
	],
	"checkerboard": "medium",
	"snapToGrid": true,
	"gridSize": 10,
	"keepInside": true,
	"scale": "auto",
	"autoHideDelay": 4000,
	"enclosing": "",
	"id": 1,
	"afterDelay": 0,
	"timestamp": 1763720504630,
	"bgColor": "",
	"@cls": ".Layered"
	},
	"params": {
	"${localParameter}": {
	"id": 2,
	"name": "${localParameter}",
	"value": "",
	"type": 1,
	"comment": ""
	}
	},
	"@cls": ".RootBlock"
}
`;
}
