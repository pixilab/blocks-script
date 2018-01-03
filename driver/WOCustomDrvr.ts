import {NetworkTCP} from "system/Network";
import {Driver} from "driver/Driver";
import * as Meta from "system_lib/Metadata";

/**
 A driver using a TCP socket for communicating with a "device".

 This driver talks to WATCHOUT production software, controlling some basic
 functions. It's intended only as an example, as Blocks already has full
 support for controlling WATCHOUT. Using WATCHOUT as an example device
 has some distinct advantages:

 1. Many of you are already familiar with WATCHOUT.
 2. The production software UI clearly shows what's going on.
 3. It's available as a free download, so anyone can use it to play
 	with this example code.

 The port value specified below indicates the default TCP port number,
 selected automatically when chosing this driver. The 'NetworkTCP' string
 specifies that this driver is intended for that type of subsystem, and
 its constructor will accept that type.
 */
@Meta.driver('NetworkTCP', { port: 3040 })
export class WOCustomDrvr extends Driver<NetworkTCP> {
	// IMPORTANT: The class name above MUST match the name of the
	// file (minus its extension).

	private pendingQueries: Dictionary<Query> = {};
	private mAsFeedback = false;	// Set while processing feedback, to only fire events

	private mConnected = false;	// Connected to WATCHOUT
	private mPlaying = false;	// Most recent state (obtained from WO initially)
	private mStandBy = false;
	private mLevel = 0;			// Numeric state of Output

	/**
	 * Create me, attached to the network socket I communicate through. When using a
	 * driver, the driver replaces the built-in functionality of the network socket
	 with the properties and callable functions exposed.
	 */
	public constructor(private socket: NetworkTCP) {
		super(socket);
		socket.subscribe('connect', (sender, message)=> {
			// console.info('connect msg', message.type);
			this.connectStateChanged()
		});
		socket.subscribe('textReceived', (sender, msg)=>
			this.textReceived(msg.text)
		);
		socket.autoConnect();	// Use automatic connection mechanism
		this.mConnected = socket.connected;	// May already be connected
		if (this.mConnected)
			this.getInitialStatus();	// If so, get status right away
	}

	/**
	 Connection status. The @Meta.property annotation publishes the specified
	 value as a property that can be accessed from panels. Note that I *do* define a
	 setter, which is necessary for any state change to be pushed to panels and other
	 clients. The last parameter to the property annotation still specifies that
	 this is a read-only property, since we're using autoConnection, and this can't
	 be changed from the outside.
	 */
	@Meta.property("Connected to WATCHOUT", true)
	public set connected(online: boolean) {
		this.mConnected = online;
		// console.info("Connection state", online)
	}
	public get connected(): boolean {
		return this.mConnected;
	}

	/**
	 * Main timeline playback state. Where both a set and get function are provided,
	 * the value can also be set from a button. It is, however, possible to have a
	 * set implementation while still exposing the property as read-only by
	 * setting the second (optional) parameter of the @Meta.property annotation
	 * to true. This is useful for values you may want to set internally, from
	 * within the driver itself, and that should then update UI bound to the property.
	 */
	@Meta.property("Main timeline playing")
	public set playing(play: boolean) {
		if (!this.mAsFeedback) // Suppress transmission if called only for feedback
			this.tell(play ? "run" : "halt");	// Start/stop main timeline
		this.mPlaying = play;
	}
	public get playing() {
		return this.mPlaying;
	}

	/**
	 * Set and get the standBy mode of the cluster.
	 */
	@Meta.property("Standby mode")
	public set standBy(stby: boolean) {
		if (!this.mAsFeedback) // Suppress transmission if called only for feedback
			this.tell(stby ? "standBy true 1000" : "standBy false 1000");
		this.mStandBy = stby;
	}
	public get standBy() {
		return this.mStandBy;
	}

	/**
	 * An input value, that can be bound to a slider. Here the min and max annotations are
	 * also used to specify the acceptable range of the numeric value.
	 */
	@Meta.property("Generic input level")
	@Meta.min(0)
	@Meta.max(1)
	public set input(level: number) {
		this.tell("setInput In1 " + level);
		this.mLevel = level;
	}
	public get input() {
		return this.mLevel;
	}

	/**
	 * A function that can be called from a Task, supplying multiple parameters.

	   IMPORTANT: If a callable returns a Promise, any task invoking it will
	   stall until the promise is resolved/rejected.
	 */
	@Meta.callable("Play or stop any auxiliary timeline")
	public playAuxTimeline(
		@Meta.parameter("Name of aux timeline to control") name: string,
		@Meta.parameter("Whether to start the timeline") start: boolean
	) {
		this.tell((start ? "run " : "kill ") + name);
	}

	/**
	 Connection state changed. If became connected, poll WO for some initial
	 status. Called as a result of the 'connect' subscription done in the
	 constructor.
	 */
	private connectStateChanged() {
		// console.info("connectStateChanged", this.socket.connected);
		this.connected = this.socket.connected; // Propagate state to clients
		if (this.socket.connected)
			this.getInitialStatus();
		else
			this.discardAllQueries();
	}

	/** Obtain initial state from WATCHOUT as I wake up, to make sure
		we're on the same page.
	*/
	private getInitialStatus() {
		// console.info("getInitialStatus");
		this.ask('getStatus').then(reply => {
			this.mAsFeedback = true; // Calling setters for feedback only
			// See getStatus reply in WO manual for details
			// console.info("getStatus reply", reply);
			const pieces = reply.split(' ');
			if (pieces[4] === 'true') {	// Show is active
				// Go through setters to notify any listeners out there
				this.playing = (pieces[7] === 'true');
				this.standBy = (pieces[9] === 'true');
				// console.info("got initial status", this.playing, this.standBy);
			}
			this.mAsFeedback = false;
		});
	}

	/**
	 * Tell WATCHOUt something through the TCP socket. Funnel most commands through here
	 * to also allow them to be logged, which makes testing easier.
	 */
	private tell(data: string) {
		// console.info('tell', data);
		this.socket.sendText(data);
	}

	// A regex for parsing replies from WO
	private static kReplyParser = /\[([^\]]+)\](\w*)[\s]?(.*)/;

	/**	Got data from WATCHOUT. Parse out any ID and reply, and forward
		to the pending query handler.
	*/
	private textReceived(text: string) {
		// console.info("textReceived", text);
		const pieces = WOCustomDrvr.kReplyParser.exec(text);
		if (pieces && pieces.length > 3) {
			const id = pieces[1];
			const what = pieces[2];
			const query = this.pendingQueries[id];
			if (query) {
				delete this.pendingQueries[id]; // Now taken
				query.handleResult(what, pieces[3]);
			} else // No corresponding query found
				console.warn("Unexpected reply", text);
		} else
			console.warn("Spurious data", text);
	}

	/** Send question to WO, returning a Promise resolved with the reply
		that eventually comes back, or rejected if error.
	*/
	private ask(question: string): Promise<string> {
		if (this.socket.connected) {
			const query = new Query(question);
			this.pendingQueries[query.id] = query;
			// console.info('ask', query.fullCmd);
			this.socket.sendText(query.fullCmd);
			return query.promise;
		} else
			console.error("Can't ask. Not connected");
	}

	/**	Fail all pending queries. Call when connection is lost,
		or other similar catastrophic event that invalidates
		all questions.
	*/
	private discardAllQueries() {
		for (var queryId in this.pendingQueries) {
			this.pendingQueries[queryId].fail("Discarded");
		}
		this.pendingQueries = {};
	}
}

/**	Keeping track of an outstanding query sent to WO, to be resolved
	when corresponding reply arrives.
*/
class Query {
	private static prevId = 0;		// Generate unique query IDs from here

	private mFullCmd: string;		// Includes [id] prefix
	private mId: number;			// ID of this command (key in pendingQueries)
	private mPromise: Promise<string>;	// Resolved/rejected when query finishes

	// Callback functions for mPromise held here until needed
	private resolver : (value?: string | Thenable<string>) => void;
	private rejector: (error?: any) => void;

	/**
	 * Create a query tagged with a unique ID, allowing the reply to be
	 * tied back to the promise awaiting it, once the response arrives.
	 */
	constructor(cmd: string) {
		this.mPromise = new Promise((resolve, reject) => {
			// Stash callbacks for later
			this.resolver = resolve;
			this.rejector = reject;
		});
		let id = ++Query.prevId;
		this.mId = id;
		this.mFullCmd = '[' + id + ']' + cmd;
	}

	// Getters for some read-only fields
	get id() { return this.mId; }
	get fullCmd() { return this.mFullCmd; }
	get promise(): Promise<string> { return this.mPromise; }

	/** A reply to query arrived. Resolve promise if was Reply, reject it
		if anything other than Reply (could be smarter about this, such
		as dealing with Busy replies, but after all, this is just
		example code).
	*/
	handleResult(what: string, remainder: string) {
		if (what === 'Reply')
			this.resolver(remainder);
		else // Consider other types of replies as "errors"
			this.fail(remainder);
	}

	/**	Query failed. Let anyone waiting for it know by rejecting the promise.
	*/
	fail(error?: string) {
		this.rejector(error);
	}
}

// A simple typed dictionary type, using a string as key
export interface Dictionary<TElem> {
	[id: string]: TElem;
}
