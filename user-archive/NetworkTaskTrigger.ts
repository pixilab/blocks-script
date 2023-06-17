/*	Allows tasks to be triggered by sending the name of the task to a network port on your
	Blocks server.

	Before you can use this method to trigger tasks, you MUST call the whiteList function
	(e.g., from a Task) to specify which tasks that may be triggered. There are three ways
	in which this may be specified:

	1.	Specify individual tasks, by including realm, group and task. If you use
		this method, only specified tasks may be triggered. Call repeatedly to specify
		multiple tasks. This is the most restrictive method.

	2.	Specify Realm and Group. This allows ALL tasks within that Group to be triggered.
		If you specify only a single Realm and Group, you then need only to specify the
		Task name to be triggered. If you specify multiple Groups (by calling
		whiteList repeatedly with different group names) you must then always include
		the Group name in trigger calls. Likewise, if you specify multiple Realms,
		you must then always include the Realm and Group name in all trigger calls.

	3.	Specify only a Realm. This allows ALL tasks within that Realm to be triggered.
		When triggering, you must then specify Realm.Group.Task or Group.Task to be
		triggered. Specifying just Group.Task is allowed only if just a single
		Realm has been white-listed.

	Copyright (c) 2023 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {Script, ScriptEnv} from "../system_lib/Script";
import {callable, parameter} from "../system_lib/Metadata";
import {Connection, SimpleServer} from "../system/SimpleServer";
import {Realm} from "../system/Realm";

const PORT = 3042;	// Port this script listens on
const DEBUG = false; // Enables verbose logging and passes errors back to client

export class NetworkTaskTrigger extends Script {

	/*	A dictionary of white-listed realms, each entry containing its white-listed
		groups containing set of white-listed tasks.
	 */
	private readonly whiteRealms: Dictionary<Dictionary<Dictionary<true>>>;
	private clients: Client[];		// Holds all connected clients
	private discarded = false;		// I've began shutting myself down
	private inited = false;			// Only do so once

	public constructor(env : ScriptEnv) {
		super(env);
		this.whiteRealms = {};
		this.clients = [];

		// Handle "script shut-down" by discarding all connections
		env.subscribe('finish', () => this.discard());
	}

	/**
	 * White-list specified realm, realm.group or real.group.task (see block
	 * comment at top of script for detals). You MUST call this at least
	 * once to enable the TCP socket.
	 */
	@callable("Allow Tasks to be triggered from outside")
	public whiteList(
		@parameter("Name of Realm containing tasks") realm: string,
		@parameter("Optional name of Group containing tasks", true) group?:string,
		@parameter("Optional name of Task that may be triggered", true) task?: string
	) {
		if (!realm)
			throw "Realm not specified";
		const rd = this.whiteRealms[realm] || (this.whiteRealms[realm] = {});
		if (group) {
			const gd = rd[group] || (rd[group] = {});
			if (task) {
				if (!gd[task])
					gd[task] = true;
			}
		}
		this.init();
	}

	/**
	 * Initiate socket listening for commands. Done once something has been white-listed.
	 */
	private init() {
		if (!this.inited) {	// Do this only once
			this.inited = true;
			const listener = SimpleServer.newTextServer(PORT, 3);
			listener.subscribe('client', (sender, message) => {
				if (!this.discarded) // Disregard any incoming requests if I'm shutting down
					this.clients.push(new Client(this, message.connection))
			});
		}
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

	/**
	 * Handle message arrived from client. This is assumed to be a string consisting
	 * of Realm.Group.Task, Group.Task (if only a single realm is white-listed)
	 * or just Task (if only a single group is white listed).
	 */
	handleMessage(message: string) {
		const pieces = message.split('.').reverse(); // Task name first
		const numPieces = pieces.length;
		if (numPieces > 3 || numPieces < 1)
			throw "Wrong number of items specified";

		const taskName = pieces[0];
		let realmName = pieces[2];
		if (!realmName) {	 // No realm specified - infer from whitelist
			realmName = getSingleEntry(this.whiteRealms);
			if (!realmName)
				throw "realm unspecified and can't be inferred";
		}
		let groupName = pieces[1];
		if (!groupName) {	 // No group specified - infer from whitelist
			groupName = getSingleEntry(this.whiteRealms[realmName]);
			if (!groupName)
				throw "group unspecified and can't be inferred";
		}
		if (!this.approved(realmName, groupName, taskName))
			throw "not white-listed";

		const realm = Realm[realmName];
		if (!realm) throw "realm doesn't exist";
		const group = realm.group[groupName];
		if (!group) throw "group doesn't exist";
		const task = group[taskName];
		if (!task) throw "task doesn't exist";

		log("Starting task", realmName, groupName, taskName);
		task.running = true;	// Runs task (if allowed by any condition)
	}

	/**
	 * Check white-list, returning false if not approved.
	 */
	private approved(realm: string, group: string, task: string): boolean {
		const groupDict = this.whiteRealms[realm];
		if (!groupDict) return false; 				// Realm not whitelisted
		if (!hasAnyEntry(groupDict)) return true;	// Anything goes in realm
		const taskDict = groupDict[group];
		if (!taskDict) return false; 				// Group not whitelisted
		if (!hasAnyEntry(taskDict)) return true;	// Anything goes in group
		return taskDict[task];	// True if task whitelisted in group
	}
}

/**
 * If dict contains a single item then return its key, else return null.
 */
function getSingleEntry(dict: Dictionary<any>) {
	var item: string = null;
	for (const key in dict) {
		if (dict.hasOwnProperty(key)) { // Ignore any possibly inherited keys
			if (item)
				return null;
			item = key;
		}
	}
	return item;
}

/**
 * Return true if dict contains at least one entry.
 */
function hasAnyEntry(dict: Dictionary<any>) {
	for (const key in dict) {
		if (dict.hasOwnProperty(key)) // Ignore any possibly inherited keys
			return true;
	}
	return false;
}

/**
 * A handler is created for each connected client.
 */
class Client {
	constructor(private owner: NetworkTaskTrigger, private connection: Connection) {
		connection.subscribe('finish', connection => this.shutDown());
		connection.subscribe('textReceived', (sender, message) => {
			try {
				this.owner.handleMessage(message.text);
			} catch(error) {
				console.error("Failed message", message.text, "due to", error);
				if (DEBUG) // Also send error message back to client in DEBUG mode
					this.connection.sendText("Error: " + error);
			}
		});
		log("Client connected");
	}

	/**
	 * Shut down this connection. Used when script is being shut down as well as when the
	 * connection is closed by its peer.
	 */
	shutDown(disconnect?: boolean) {
		if (disconnect)
			this.connection.disconnect();
		this.owner.lostClient(this);
		log("Client gone");
	}
}

/**
 Log messages, allowing my logging to be easily disabled in one place.
 */
function log(...messages: any[]) {
	if (DEBUG)
		console.info(messages);
}


/**
 * 	A basic, map-like type
 */
export interface Dictionary<TElem> { [id: string]: TElem; }
