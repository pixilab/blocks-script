/*	This user script adds a basic TCP-based control protocol to Blocks, suitable for use from
	external control systems (Crestron, AMX, etc) where a plain TCP connection is the preferred
	means of communication. It provides direct access to all properties in Blocks using the same
	property paths as used inside Blocks itself (e.g., in a button binding). Properties can be
	set or subscribed to, so you'll be notified when the property's value changes.

	To use, simply connect to port 3041 on your Blocks server and send a command. Try it out
	using a telnet client like this:

		telnet 10.1.0.10 3041

	Replace the IP address above with the correct IP address of your Blocks server.
	Commands are specified using JSON syntax. To set a value of a property, type the
	following into your telnet session:

	{ "type": "set", "path": "Artnet.aurora.Red.value", "value": 0.2}

	To add a value to a property (pass a negative value to subtract):

	{ "type": "add", "path": "Artnet.aurora.Red.value", "value": 0.2}

	Valid message types are "set", "add" "subscribe" (for subscription) and "unsubscribe" (to
	end a subscription). Multiple commands can be sent together by wrapping them in a JSON
	array. For example, to subscribe to two properties, do this:

	[{ "type": "subscribe", "path": "Artnet.aurora.Red.value"},{ "type": "subscribe", "path": "Artnet.aurora.Green.value"}]

	The entire command must be entered as a single string, with a newline ONLY at the end. Do not
	put newlines inside the string. The maximum length of such a string is 4096 characters. Split
	commands into multiple strings to send more.

	Since a plain TCP connection provides no security, a while/black-list mechanism is provided,
	allowing you to explicitly state which properties that may (or may not) be set through
	the protocol. This mechanism does not currently limit which properties can be subscribed to.
	Specify this as a JSON file located at script/files/TCPProtocol.json, containing data
	as described by the TCPProtocolConfig interface below. If no configuration file is provided,
	this protocol provides unfettered access to ALL properties (which will be indicated by a
	log message).

	Copyright (c) 2022 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */


import {Script, ScriptEnv, PropertyAccessor} from "system_lib/Script";
import {SimpleServer, Connection} from "system/SimpleServer";
import {SimpleFile} from "system/SimpleFile";
import {callable} from "../system_lib/Metadata";

/**
 * Content of my configuration file (at script/files/TCPProtocol.json).
 * The blacklist specifies which paths that can (or can not) be SET
 * through this protocol. It does not limit subscriptions to paths.
 */
interface TCPProtocolConfig {
	type: 'blacklist'|'whitelist';	// Type of listing
	paths: string[];	// Paths being black/white-listed
}

/**
 * Commands sent to me consist of a single or an array of BaseMessage sub-types, as
 * indicated by the "type" field.
 */
interface BaseMessage {
	type: string;	// Indicates type of message (see below)
}

/**
 * Message used to set or add a property. Also used for data sent back to
 * property subscriber (with a 'prop' type.
 */
interface PropertyMessage extends BaseMessage {
	type: 'set' | 'add' | 'prop';
	path: string;	// Dot-separated property path
	value: any;		// Value appropriate for property type
}

/**
 * Message used to subscribe or unsubscribe to property. Once subscribed,
 * the client will be notified using a list of Property messages when
 * subscribed-to properties change. Such feedback messages are always
 * sent as a list, even if there's only a single property to advertize.
 */
interface SubscribeUnsubscribeMessage extends BaseMessage {
	type: 'subscribe' | 'unsubscribe';
	path: string;	// Dot-separated property path
}

export class TCPProtocol extends Script {
	private clients: Client[];		// Holds all connected clients
	private discarded = false;		// I've began shutting myself down
	pathApprover: WhiteBlackList;

	public constructor(env: ScriptEnv) {
		super(env);
		this.clients = [];

		this.clearConfig();
		this.reload();	// Load configuration file

		/*	Listen for new connections on my port. I allow for fairly large messages
			since I accept multiple commands as JSON array, so this may be useful.
			I limit the max number of connections somewhat arbitrarily to a
			smaller-than-default value, since I expect in the vast majority of
			cases I'm really expected to handle a single connection only.
		 */
		SimpleServer.newTextServer(3041, 10, 4096)
		.subscribe('client', (sender, message) => {
			if (!this.discarded)
				this.clients.push(new Client(this, message.connection))
		});

		// Handle "script shut-down" by discarding all connections
		env.subscribe('finish', () => this.discard());
	}

	@callable("Re-load configuration data")
	public reload() {
		SimpleFile.readJson('TCPProtocol.json')
		.then(config => this.applyConfig(config))
		.catch(error=>this.configError("reading file", error));
	}

	/**
	 * Apply configuration data if valid.
	 */
	private applyConfig(config: TCPProtocolConfig) {
		try {
			if (config.paths && config.paths.length) {
				this.pathApprover = new WhiteBlackList(
					config.paths,
					config.type === 'whitelist'
				);
			} else
				throw "Configuration has no paths";
		} catch (error) {
			this.configError("bad data", error);
		}
	}

	/**
	 * Configuration error. Log error message and reset configuration.
	 */
	private configError(message: string, error: string) {
		console.error("Configuration failed -", message, error, "No security is applied!");
		this.clearConfig();
	}

	/**
	 * Clear configuration as if no config file existed.
	 */
	private clearConfig() {
		this.pathApprover = new WhiteBlackList();
	}

	/**
	 * I'm being discarded. Close all my connections.
	 */
	private discard() {
		this.discarded = true;
		this.clients.forEach(connection => connection.shutDown(true))
	}

	/**
	 * Callback from client when he goes away, to let me know.
	 */
	lostClient(client: Client) {
		const ix = this.clients.indexOf(client);
		if (ix >= 0)
			this.clients.splice(ix, 1);
	}
}

/**
 * Manage the white/black-listing of paths.
 */
class WhiteBlackList {
	private readonly whiteList: boolean;		// listedPaths is whiteList (vs blackList)
	private readonly listedPaths: Dictionary<true>;

	constructor(paths?: string[], isWhiteList?: boolean) {
		this.listedPaths = {};
		if (!paths)
			this.whiteList = false;
		else {
			this.whiteList = !!isWhiteList;
			for (var path of paths) {
				if (typeof path === 'string')
					this.listedPaths[path] = true;
				else
					throw "White/black list path invalid"
			}
		}
	}

	/**
	 * Return true if path is approved according to my settings.
	 */
	isApprovedPath(path: string): boolean {
		const isListed = !!this.listedPaths[path];
		return this.whiteList ? isListed : !isListed;
	}
}

/**
 * Represents and manages a single client connection.
 */
class Client {
	private readonly openProps: Dictionary<PropertyAccessor<any>>;	// Open property accessors
	private readonly subscribedProps: Dictionary<true>;	// Subscribed-to property paths
	private readonly sendProps: Dictionary<any>;	// Values to send to client
	private pendingSend: CancelablePromise<any>;	// Pending prop value transmission

	constructor(
		private owner: TCPProtocol,
		private connection: Connection
	) {
		this.openProps = {};
		this.subscribedProps = {};
		this.sendProps = {};
		connection.subscribe('textReceived', (connection, message) =>
			this.handleMessage(message.text)
		);
		connection.subscribe('finish', connection => this.shutDown());
	}

	/**
	 * Shut down this connection. Used when script is being shut down as well as when the
	 * connection is closed by its peer.
	 */
	shutDown(disconnect?: boolean) {
		if (disconnect)
			this.connection.disconnect();
		if (this.pendingSend)
			this.pendingSend.cancel();
		for (const key in this.openProps)	// Terminate all open subscriptions
			this.openProps[key].close();
		this.owner.lostClient(this);
	}

	/**
	 * Process raw message string, presumably in JSON format
	 */
	handleMessage(rawMessage: string) {
		var msg: BaseMessage | BaseMessage[]
		try {
			msg = JSON.parse(rawMessage);
		} catch (exception) {
			console.warn("Message not valid JSON", rawMessage);
			return;
		}
		if (Array.isArray(msg))	// Multiple messages - apply to each
			msg.forEach(cmd => this.handleCommand(cmd))
		else
			this.handleCommand(msg);
	}

	/**
	 * Handle a single message, based on its type.
	 */
	private handleCommand(msg: BaseMessage) {
		switch (msg.type) {
		case 'set':
		case 'prop':	// For backward compatibility
			this.handleSet(<PropertyMessage>msg);
			break;
		case 'add':	// For backward compatibility
			this.handleAdd(<PropertyMessage>msg);
			break;
		case 'subscribe':
		case 'sub':	// For backward compatibility
			this.handleSubscribe(<SubscribeUnsubscribeMessage>msg);
			break;
		case 'unsubscribe':
		case 'unsub': // For backward compatibility
			this.handleUnsubscribe(<SubscribeUnsubscribeMessage>msg);
			break;
		default:
			console.warn("Unexpected message type", msg.type)
			break;
		}
	}

	/**
	 * Set property to specified value.
	 */
	private handleSet(cmd: PropertyMessage) {
		if (this.owner.pathApprover.isApprovedPath(cmd.path))
			this.getProp(cmd.path).value = cmd.value;
		else
			console.warn("Permission denied for path", cmd.path);
	}

	/**
	 * Add value property. Pass a negative value to subtract. For String property
	 * this performs concatenation. Not supported for boolean property type.
	 */
	private handleAdd(cmd: PropertyMessage) {
		if (this.owner.pathApprover.isApprovedPath(cmd.path)) {
			const accessor = this.getProp(cmd.path);
			if (accessor.available) {
				const typeName = typeof accessor.value;
				const addValueType = typeof cmd.value;
				if (addValueType === typeName) {
					switch (typeName) {
					case "number":
					case "string":
						accessor.value += cmd.value;
						break;
					default:
						console.warn("Unsupported type for 'add'", typeName, "for path", cmd.path);
						break;
					}
				} else
					console.warn("Incompatible value type",  addValueType, "for path", cmd.path);
			} else
				console.warn("Can't add to unavailable property", cmd.path);
		} else
			console.warn("Permission denied for path", cmd.path);
	}

	/**
	 * Hook up a suscription to property so that client will be notified by
	 * the property's value. This notification will happen once initially
	 * as soon as the value is available, and then whenever it changes.
	 */
	private handleSubscribe(cmd: SubscribeUnsubscribeMessage) {
		if (!this.subscribedProps[cmd.path]) {
			this.subscribedProps[cmd.path] = true;
			const accessor = this.getProp(cmd.path);
			if (accessor.available) // Available right away - send it
				this.tellPropValue(cmd.path, accessor.value);
		}
	}

	/**
	 * Stop telling client about changes to specified property.
	 */
	private handleUnsubscribe(cmd: SubscribeUnsubscribeMessage) {
		const path = cmd.path;
		this.getProp(path).close();
		delete this.openProps[path];
		delete this.sendProps[path];
		delete this.subscribedProps[path];
	}

	/**
	 * Get property accessor, caching it in openProps if not already known.
	 * I always register a change handler, which is potentially
	 * somewhat wasteful (in case client only sets the property), but
	 * that's essentially what happens under the hood anyway, so never
	 * mind.
	 */
	private getProp(path: string): PropertyAccessor<any> {
		let result: PropertyAccessor<any> = this.openProps[path];
		if (!result) {
			this.openProps[path] = result = this.owner.getProperty(path, change => {
				if (this.subscribedProps[path])
					this.tellPropValue(path, change);
			});
		}
		return result;
	}

	/**
	 * Register value for property path to be sent soon.
	 */
	private tellPropValue(path: string, value: any) {
		this.sendProps[path] = value;
		this.sendValuesSoon();
	}

	/**
	 * Set up a timer (if not already one pending) to send values soonish.
	 */
	private sendValuesSoon() {
		if (!this.pendingSend) {
			this.pendingSend = wait(50);
			this.pendingSend.then(() => {
				this.pendingSend = undefined;
				this.sendValuesNow();
			});
		}
	}

	/**
	 * Send any values in sendProps now, as a JSON array of PropertyMessages.
	 */
	private sendValuesNow() {
		let toSend: PropertyMessage[] = [];

		const sendProps = this.sendProps;
		for (let key in sendProps) {
			const value = sendProps[key];
			delete sendProps[key];
			toSend.push({type: "prop", path: key, value: value});
			if (toSend.length >= 20) {
				// Send at most this many values per batch
				this.sendValuesSoon();	// Send remaining values soon
				break;
			}
		}
		if (toSend.length)
			this.connection.sendText(JSON.stringify(toSend));
	}
}

export interface Dictionary<TElem> {
	[id: string]: TElem;
}
