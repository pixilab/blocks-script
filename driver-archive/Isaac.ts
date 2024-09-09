/*	Driver connecting Blocks to Smart Monkeys ISAAC virtualization platform, exposing selected
	tasks and properties  and providing explicit message logging to ISAAC.

	IMPORTANT: You must specify the configuration for this driver using the Custom Options
	field in the driver's settings. This must be specified as JSON-formatted data, corresponding
	to the IsaacConfig interface below.

 	Copyright (c) 2023 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {SimpleHTTP} from "../system/SimpleHTTP";
import {callable, driver} from "../system_lib/Metadata";
import {PropertyAccessor} from "../system_lib/Script";
import {Realm} from "../system/Realm"
import {NetworkTCP} from "../system/Network";
import {Driver} from "../system_lib/Driver";

// Configuration provided as JSON through driver's Custom Options
interface IsaacConfig {
	protocol?: 'http' | 'https'; // Protocol for ISAAC connection (default is http)
	token?: string;			// If specified, passed in an isaac-token header
	heartbeatInterval?: number, // How often to send "heartbeats" to Isaac, in mS
	variables?: string[];	// Full path to properties exposed as Isaac variables
	events?: string[];		// Realm.Group.Name of tasks exposed as Isaac events
	subsystemExternalId?: string;	// ID identifying Blocks to Isaac. Defaults to "blocks".
}


type IsacLogSeverity = 'info' | 'warning' | 'error';

interface LogData {
	severity: IsacLogSeverity;	// "info", possibly others
	key: string;			// Appears in "variable (key)" column
	value: string;	 		// Appears in "Description (value)" column
	createdBy: string;		// Module (aka "subsystem") name, e.g. "blocks"
	createdByType: string;	// "subsystem"
}

type VarValue = string|number|boolean;

// For updating a variable value
interface VarData {
	value: VarValue;
}

// Data passed to PUT /{id}/variables/_available
interface VarsAvailable {
	externalRefs: string[];	// Names of variables to be established on Isaac side
}

interface VarAvailable {
	externalRef: string;	// Name of variable to be established on Isaac side
	subsystemExternalId: string;	//  E.g. "blocks"
}

/**
 * Registration response, from variable and event registrations.
 */
interface RegResponse {
  "_id": string,			// Used to subsequently identify the object
  "displayName": string,
  "description": string,
  "externalRef": string,
}

interface EstabEventData {
	command: string;	// The command to be emitted by Isaac when the event fires
	externalRef: string;	// Some kind of ID - we set command string here too
	description?: string;
	displayName?: string;
	subsystemId?: number;
	subsystemExternalId: string;
	active: boolean;
	availableInSubsystem: boolean
}


// Data passed to PUT /{id}/events/_available
interface TasksAvailable {
  commands: string[];	// Names of variables to be established on Isaac side
  ids?: number[];		// Do we need those at all? What are they for?
}

interface TaskAvailable {
	command: string;
	externalRef: string;
	active: boolean;
	availableInSubsystem: boolean;

	subsystemExternalId?: string;
	description?: string;
	displayName?: string;
	subsystemId?: number;
}

abstract class Talker {
	protected constructor(protected owner: Isaac) {
	}


	/**
	 * Subclass calls me when it has something to say, if it didn't before.
	 */
	protected letsTalk() {
		this.owner.somethingToSay(this);
	}

	// Return true if this talker has anytjing to say
	abstract needsToTalk(): boolean;

	// Returns a "sending data" promise
	abstract saySomething(): Promise<any>;

	// Message to be told next (mainly for logging purposes)
	abstract whatToSay(): string;
}

interface LogMsg {
	message: string;
	severity: IsacLogSeverity;
}

/**
 * Logs messages to Isaac.
 */
class Logger extends Talker {
	private messagesToSend: LogMsg[] = [];

	constructor(owner: Isaac) {
		super(owner);
	}

	logInfo(message: string) {
		this.logMsg({ message: message, severity: 'info'});
	}

	logMsg(message: LogMsg) {
		const wasLogMsgCount = this.messagesToSend.length;
		if (wasLogMsgCount < 100) { // Limits how many messages we'll queue up
			this.messagesToSend.push(message);
			if (!wasLogMsgCount) // Changed my talkiness state - get talking
				this.letsTalk();
		} else
			console.error("Logging can't keep up - dropping messages");

	}

	needsToTalk(): boolean {
		return !!this.messagesToSend.length;
	}

	saySomething() {
		return this.owner.sendLog(this.messagesToSend.shift())
	}

	whatToSay(): string {
		return "log " + this.messagesToSend[0];
	}
}

/**
 * Notifies Isaac of variable changes.
 */
class VarSnitch extends Talker {
	private readonly pending: Dictionary<VarValue>;	// Keyed by prop path, holding curr value
	private readonly order: string[];	// Order in which variables should be sent

	public constructor(owner: Isaac) {
		super(owner);
		this.pending = {};
		this.order = [];
	}

	/**
	 * Tell Isaac abuot new variable value.
	 */
	notify(key: string, value: VarValue) {
		log("notify", key, value);
		if (value === undefined) // Not supposed to happen, so barf on this
			console.warn("Variable undefined", key);
		else {
			const knownProperty = this.pending.hasOwnProperty(key);
			this.pending[key] = value;
			if (!knownProperty) {
				this.order.push(key);
				if (this.order.length === 1)  // Changed my talkiness state
					this.letsTalk();
			}
		}
	}

	needsToTalk(): boolean {
		return !!this.order.length;
	}

	saySomething() {
		const key = this.order.shift();
		const valueToTell = this.pending[key];
		delete this.pending[key];	// Now taken
		const result = this.owner.sendVarChange(key, valueToTell);
		return result;
	}

	whatToSay(): string {
		const key = this.order[0];
		return "variable " + key + ' value ' + this.pending[key];
	}
}

@driver('NetworkTCP', { port: 8099 })
export class Isaac extends Driver<NetworkTCP>  {
	private configuration: IsaacConfig;	// Held here once configured OK
	private origin: string;				// Protocol and address
	private readonly accessors: PropertyAccessor<any>[]; // Open property accessors

	private readonly varSnitch: VarSnitch;
	private readonly logger: Logger;
	private readonly talkers: Talker[];	// All my talkers
	private nextTalkerIx = 0;	// Index into talkers for next msg

	private readonly varIds: Dictionary<string>;	// Maps registered variables to their IDs
	private readonly taskIds: Dictionary<string>;	// Maps registered tasks to their IDs
	private varsSubscribed: boolean;	// To only subscribe to "variable" properties once

	private heartBeatTimer: CancelablePromise<any>;	// For HTTP "I'm still here" pings
	private keepAliveTimer?: CancelablePromise<any>;	// For RPC pings
	private waitingToTalk?: Promise<any>;	// What we're waiting for to talk next

	/**
	 * The socket passed in is used for the RPC connection, while
	 * separate SimpleHTTP requests are used for other messages.
	 */
	constructor(private socket: NetworkTCP) {
		super(socket);
		socket.setMaxLineLength(1024);	// Hopefully long enough (?)
		socket.autoConnect();

		this.varIds = {};
		this.taskIds = {}

		this.talkers = [];
		this.varSnitch = new VarSnitch(this);
		this.talkers.push(this.varSnitch);
		this.logger = new Logger(this);
		this.talkers.push(this.logger);
		this.accessors = [];
		this.init()
			.then(() => log("Started"))
			.catch(error => console.error("Startup failed", error));
	}

	/**
	 * Initialize me and get heartbeat going.
	 */
	private async init(): Promise<any> {
		await this.config();
		if (this.socket.enabled)
			this.heartBeat();
	}

	/**
	 * Explicit logging to Isaac.
	 */
	@callable("Log message to Isaac")
	log(message: string) {
		this.logger.logInfo(message);
	}

	/**
	 * Load my configuration from custom options and hook up subscriptions.
	 */
	private async config() {
		if (!this.socket.options)
			throw "Configuration options not set";
		const config = <IsaacConfig>JSON.parse(this.socket.options);
		if (typeof config === 'object') {
			if (!config.subsystemExternalId) // Apply default ID
				config.subsystemExternalId = "blocks";
			this.configuration = config;
			this.origin = (config.protocol || 'http') + '://' + this.socket.addressString;
			log("Origin", this.origin);
			if (this.socket.enabled) {
				await this.hookupVars(config);
				await this.hookupEvents(config);
			}
		} else
			throw "Invalid configuration";
	}

	/*	Hook up all properties to be exposed as Isaac variables.
	 */
	private async hookupVars(config: IsaacConfig) {
		if (config.variables) {
			const endpoint = '/api/v1/variables';

			// Get list of my variables already in Isaac into a set
			const existingVars = await this
			.newRequest(endpoint + '?subsystemExternalId=' + config.subsystemExternalId)
			.get<RegResponse[]>();
			const setOfKnownVars: Dictionary<string> = {}	// Maps to the _id of the var
			for (const xv of existingVars.interpreted) {
				setOfKnownVars[xv.externalRef] = xv._id;
				this.varIds[xv.externalRef] = xv._id;
				// log("Known var", xv.externalRef);
			}

			// Leave some predefined "internal" Isaac variables alone
			delete setOfKnownVars["last_contacted_at"];
			delete setOfKnownVars["is_alive"];

			const spec: VarAvailable = {
				subsystemExternalId: config.subsystemExternalId,
				externalRef: null	// tbd
			}
			for (let varName of config.variables) {
				spec.externalRef = varName;
				if (setOfKnownVars[varName])
					delete setOfKnownVars[varName];	// Keep only those we ont want there
				else {	// Skip if var already known to Isaac
					const result = await this.newRequest(endpoint).post<RegResponse>(JSON.stringify(spec));
					if (result.status > 299)	// Seems problematic
						console.warn(endpoint, result.status, result.data);
					this.varIds[varName] = result.interpreted._id;
				}
				if (!this.varsSubscribed) // Only do this once
					this.establishVariable(varName);
			}
			this.varsSubscribed = true;

			// Delete unused variables from Isaac
			for (const unwanted in setOfKnownVars) {
				const id = setOfKnownVars[unwanted];
				log("Removing variable", unwanted, "with ID", id);
				await this.newRequest(endpoint + '/' + id).delete();
			}
		}
	}

	/*	Same for my events (i.e. Blocks tasks)
	 */
	private async hookupEvents(config: IsaacConfig) {
		if (config.events) {
			const endpoint = '/api/v1/events';

			const existingVars = await this
			.newRequest(endpoint + '?subsystemExternalId=' + config.subsystemExternalId)
			.get<RegResponse[]>();
			const knownTasks: Dictionary<string> = {}	// Maps to the _id
			for (const xv of existingVars.interpreted) {
				knownTasks[xv.externalRef] = xv._id;
				this.taskIds[xv.externalRef] = xv._id;
				// log("Known task", xv.externalRef);
			}

			const spec: TaskAvailable = {
				subsystemExternalId: config.subsystemExternalId,
				active: true,
				availableInSubsystem: true,
				externalRef: null,	// tbd
				displayName: null,
				command: null
			}
			for (let evtName of config.events) {
				if (knownTasks[evtName])
					delete knownTasks[evtName]; // Keep only those we ont want there
				else {	// Skip if var already known
					spec.externalRef = evtName;
					spec.command = evtName;
					spec.displayName = evtName;
					const result = await this.newRequest(endpoint).post<RegResponse>(JSON.stringify(spec));
					if (result.status > 299)	// Seems problematic
						console.warn(endpoint, result.status, result.data);
					this.taskIds[evtName] = result.interpreted._id;
				}
			}
			this.hookupEventTriggers(config);

			// Delete unused events from Isaac
			for (const unwanted in knownTasks) {
				const id = knownTasks[unwanted];
				log("Removing event", unwanted, "with ID", id);
				await this.newRequest(endpoint + '/' + id).delete();
			}

		}
	}

	/**
	 * In addition to events/_available done above, we also need to post each event separately, one by
	 * one using another API function.
	 */
	private registerEvents(eventPaths: string[], ix = 0) {
		if (eventPaths.length > ix) {
			const path = eventPaths[ix];
			log("registerEvents", path);
			let eventSpec: EstabEventData = {
				command: path,
				displayName: path,
				externalRef: path,
				subsystemExternalId: this.configuration.subsystemExternalId,
				active: true,
				availableInSubsystem: true
			}

			this.newRequest('/api/v1/events')
			.post(JSON.stringify(eventSpec))
			.then(result => {
				if (result.status > 299)	// Seems problematic
					console.warn("/api/v1/events", result.status, result.data);
				else if (++ix < eventPaths.length) // More to send
					this.registerEvents(eventPaths, ix);
			})
			.catch(error => console.error("/api/v1/events failed", error));
		}
	}

	/**
	 * Connect separate JSON RPC backdoor connection to Isaac to learn about events
	 * being triggered from its schedule. Called only if I have any events (aka tasks)
	 * listed as well as rpcConnection specified in my config.
	 */
	private hookupEventTriggers(config: IsaacConfig) {
		const socket = this.socket;

		this.initRpc(socket);	// Try right away in case already connected

		// Also init on later or repeated connection
		socket.subscribe('connect', (sender, message) => {
			if (message.type === 'Connection') {
				if (sender.connected)
					this.initRpc(sender);
				else
					this.rpcConnectionLost();	// Dropped by Isaac, presumably
			}
		});
	}

	/**
	 * If JSON-RPC socked is connected then request notifications and listen for data.
	 * Else do nothing (call again once connected)
	 */
	private initRpc(socket: NetworkTCP) {
		if (socket.connected) {
			log("RPC socket connected");
			const subscribe = {
				"jsonrpc": "2.0",
				"method": "subscriptions.add",
				"params": [
					this.configuration.subsystemExternalId
				],
			};
			const textMsg = JSON.stringify(subscribe);
			socket.sendText(textMsg, '\r\n');
			log("initRpc subscriptions.add", textMsg);

			socket.subscribe('textReceived', (sender, message) => {
				try {
					try {
						log("RPC message", message.text);
						const jsonData = JSON.parse(message.text) as JsonRpcMsg;
						if (jsonData.jsonrpc === '2.0' && jsonData.method) {
							log("JSON-RPC data", message.text);
							this.handleJsonRpcMsg(jsonData);
						} else if (jsonData.result !== undefined)
							log("JSON-RPC response", message.text);
						else
							console.error("JSON-RPC unexpected data", message.text);
					} catch (ex) {
						console.error("JSON-RPC parse error", ex);
					}
				} catch (error) {
					console.error("JSON-RPC parse error", error, "caused by", message.text)
				}
			});

			this.jsonRpcKeepAlive();	// Get keep alive going
		}
	}

	/**
	 * RPC connection lost - stop sending any keep-alive messages
	 */
	private rpcConnectionLost() {
		console.warn("RPC connection lost");
		if (this.keepAliveTimer) {
			this.keepAliveTimer.cancel();
			this.keepAliveTimer = undefined;
		}
	}


	/**
	 * Send a "ping" message at least once per minute to keep connection alive.
	 */
	private jsonRpcKeepAlive() {
		this.keepAliveTimer = wait(1000*59);
		this.keepAliveTimer.then(() => {
			const pingMsg = '{"jsonrpc":"2.0","method":"ping"}';
			log("rpc sent", pingMsg);
			this.socket.sendText(pingMsg, '\r\n');
			if (this.socket.connected)	// Keep sending pings
				this.jsonRpcKeepAlive();
			else
				this.keepAliveTimer = undefined;
		});
	}

	private handleJsonRpcMsg(msg: JsonRpcMsg) {
		if (msg.method === "schedule.item.start" && msg.params && msg.params.command) {
			this.startTask(msg.params.command as string);
		} else
			log("rpc message", msg.method);
	}

	private establishVariable(path: string) {
		log("establishVariable", path);
		const accessor = this.getProperty<VarValue>(path, newValue => {
			this.varSnitch.notify(path, newValue);
		});
		if (accessor.available) // Set initial value if known
			this.varSnitch.notify(path, accessor.value);
		this.accessors.push(accessor);
	}

	/**
	 * Do what needs to be done if this script is shut down.
	 */
	private shutDown() {
		if (this.heartBeatTimer)
			this.heartBeatTimer.cancel();
		if (this.keepAliveTimer)
			this.keepAliveTimer.cancel();
		for (let accessor of this.accessors)
			accessor.close();
	}

	/**
	 * Send heartbeats with some regularity.
	 */
	private heartBeat() {
		this.heartBeatTimer = wait(this.configuration.heartbeatInterval || 9300);
		this.heartBeatTimer.then(() => {
			this.sendHeartBeat();
			this.heartBeat();
		});
	}

	/**
	 * Send a heartbeat message to Isaac
	 */
	private sendHeartBeat() {
		const result = this
			.newRequest(`/api/v1/subsystems/${this.configuration.subsystemExternalId}/heartbeat`)
			.put('');
		result.catch(error => console.warn("Heartbeat failure", error));
		return result;
	}

	/**
	 * Talker has something to say. Make sure he'll be able to do so soon.
	 */
	somethingToSay(talker: Talker) {
		// log("Something to say");
		if (!this.waitingToTalk) // Nothing in progress we're waiting for
			this.talk(); // Get us going right away
	}

	/**
	 * Wait for toWaitFor, then attempt to talk next
	 */
	private waitForNextSaying(toWaitFor: Promise<any>) {
		this.waitingToTalk = toWaitFor;
		this.waitingToTalk
			.then(() => this.talk())
			.catch(() => this.talk());	// Keep going anyway (debatable)
	}

	/**
	 * Keep talking to Isaac as long as I have something to say, then set waitingToTalk
	 * to undefined.
	 */
	private talk() {
		const talker = this.findTalker();
		if (talker) {
			const msg = talker.whatToSay();
			log("Saying", msg);
			const talkPromise = talker.saySomething();
			talkPromise.catch(error => console.warn("Failed telling", msg, error));
			this.waitForNextSaying(talkPromise);
		} else {
			// log("No more talker");
			this.waitingToTalk = undefined;	// No more data in flight
		}
	}

	/**
	 * Find next talker with something to say in a round-robin fashion.
	 * Returns null if no more talker ready to speak up.
	 */
	private findTalker(): Talker|null {
		let ix = this.nextTalkerIx;
		const wasTalkerIx = ix;
		let talker: Talker = null;

		do {
			talker = this.talkers[ix++];
			if (ix >= this.talkers.length)
				ix = 0;
			if (talker.needsToTalk())
				break;
			talker = null;
		} while (wasTalkerIx !== ix);	// Back where we started - give up
		this.nextTalkerIx = ix;
		return talker;
	}

	/**
	 * Send a log message to Isaac.
	 */
	sendLog(message: LogMsg) {
		const toLog: LogData = {
			severity: message.severity,
			key: "general",
			createdByType: "subsystem",
			value: message.message,
			createdBy: this.configuration.subsystemExternalId
		};

		return SimpleHTTP
			.newRequest(`${this.origin}/api/v1/logs`)
			.post(JSON.stringify(toLog));
	}

	/**
	 * Send a variable change message to Isaac.
	 */
	sendVarChange(path: string, value: VarValue) {
		log("sendVarChange", path, value);
		const id = this.varIds[path];
		const varData: VarData = {
			value: value.toString()
		};

		return this.newRequest(`/api/v1/variables/${id}/value`)
			.post(JSON.stringify(varData));
	}

	/**
	 * Make a new request to my origin and specified path. Adds isaac-token if one specified.
	 */
	private newRequest(path: string) {
		const request = SimpleHTTP.newRequest(
			this.origin + path,
			{interpretResponse: true}	// Should be OK for all requests, I guess
		);
		const token = this.configuration.token;
		if (token)
			request.header('isaac-token', token);
		return request;
	}

	/**
	 * Attempt to start the task specified by path, in the form "Realm.Group.Name".
	 */
	startTask(path: string) {
		const parts = path.split('.');
		if (parts.length !== 3)
			throw "Task path not in the form Realm.Group.Name; " + path;
		const realm = Realm[parts[0]];
		if (!realm)
			throw "No Realm " + parts[0];
		const group = realm.group[parts[1]];
		if (!group)
			throw "No Group " + parts[1];
		const task = group[parts[2]];
		if (!task)
			throw "No Task " + parts[2];

		log("Run task", path);
		task.running = true;	// Starts the task (assuming condition allows it to)
	}
}



// A simple typed dictionary type, always using string as key
export interface Dictionary<TElem> {
	[id: string]: TElem;
}

/**
 Log messages, allowing my logging to be easily disabled in one place.
 */
const DEBUG = true;	// Set to false to disable verbose logging
function log(...messages: any[]) {
	if (DEBUG)
		console.info(messages);
}

interface JsonRpcMsg {
	jsonrpc: string;
	method: string;
	result?: any;		// Response only
	params?: Dictionary<string|boolean|number>;	// Command only (?)
	id?: string | number
}
