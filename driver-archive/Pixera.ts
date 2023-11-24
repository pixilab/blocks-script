/*	Driver for controlling AvStumpfl PIXERA timelines, as well as providing timing information
	from those timelines so Blocks can synchronize to them.

	Copyright (c) 2023 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */


import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {callable, driver, property} from "system_lib/Metadata";
import {AggregateElem} from "../system_lib/ScriptBase";

const enum TimelineMode {
	Play = 1, Pause = 2, Stop = 3
}

type HandleList = number[];

interface TimelineAttrs {
	"fps": number;
	"index": number;
	"mode": TimelineMode;
	"name": string;
}

interface JsonMsg {
	jsonrpc: "2.0";
	id: number|string;
}

// Messages sent TO Pixera
interface JsonCmd extends JsonMsg {
	method: string;		// Only for messages sent TO pixera
	params?: any;			// Only if there are any params
}

// Replies received FROM Pixera
interface JsonReply extends JsonMsg {
	error?: {code: number, message: string};	// If error occurred
	result?: any;			// Only if there's any result (FROM Pixera)
}

interface MonitorJsonMsg extends JsonMsg{
	id: -1;				// Always the case for such messages
	type:	"monEvent"	// Always the case for me
	name: string;		// Name of "thing" being monitored
}

interface TimelineTransportMsg extends MonitorJsonMsg {
	name: "timelineTransport",	// Always the case for me
	entries:[{
		handle: number,		// Timeline handle
		value: TimelineMode	// Transport mode
	}]
}

interface TimelinePositionMsg extends MonitorJsonMsg {
	name: "timelinePositionChangedManually",	// Always the case for me
	entries:[{
		handle: number,		// Timeline handle
		value: number		// Time position (frames)
	}]
}

/**
 * AggregateElem for timelines.
 */
class TimelineAggregateElem extends AggregateElem {
	public readonly handle: number;
	public readonly name: string;
	private index: number;

	private readonly _driver: Pixera;
	private readonly _fps: number;
	private readonly _speedFactor: number;
	private _mode: TimelineMode;
	private _frame: number;
	private _timeFlow: TimeFlow;

	constructor(
		driver: Pixera,
		handle: number,
		name: string,
		index: number,
		fps: number,
		speedFactor: number,
		mode: TimelineMode,
		frame: number
	) {
		super();
		this.handle = handle;
		this.name = name;
		this.index = index;
		this._driver = driver;
		this._fps = fps;
		this._mode = mode;
		this._frame = frame;
		this._speedFactor = speedFactor;
		this._timeFlow = new TimeFlow(this.convertFrameToMilliseconds(), this.getTimeFlowRate());
	}

	get frame() {
		return this._frame;
	}

	// Set frame internally
	set frame(value: number) {
		this._frame = value;
		this.updateTime(this.convertFrameToMilliseconds());
	}

	/**
	 * Update the current time position to millis, firing change
	 * notification if this is news or explicitly requested.
	 */
	private updateTime(millis: number, forceChange?: boolean) {
		const oldPos = this._timeFlow.currentTime;
		this._timeFlow = new TimeFlow(millis, this.getTimeFlowRate());
		if (forceChange || this._timeFlow.currentTime !== oldPos) {	// Is news
			this.changed("time");
		}
		// log("time changed", this._timeFlow.currentTime, forceChange, this._timeFlow.rate, this._mode); // +++
	}

	// Set mode internally, updates published played/stopped state
	set mode(newMode: TimelineMode) {
		const wasStopped = this.isStopped();
		const wasPlaying = this.isPlaying();
		const wasTime = this._timeFlow.currentTime;

		this._mode = newMode;
		log("mode set", wasPlaying, this.isPlaying());
		if (wasStopped !== this.isStopped()) {
			this.changed("stopped");
		}
		if (wasPlaying !== this.isPlaying()) {
			this.updateTime(wasTime, true);
			this.changed("playing");
		}
	}

	@property("Timeline is playing", false)
	set playing(play: boolean) {
		if (play !== this.isPlaying()) {
			const wasStopped = this.isStopped();
			const wasPlaying = this.isPlaying();

			this._driver.queryHandler.tell(play ?
				"Timelines.Timeline.play" :
				"Timelines.Timeline.pause",
				{"handle": this.handle}
			);
			this.mode = play ? TimelineMode.Play : TimelineMode.Pause;
			if (!play && wasPlaying) // Make time position stop where we are until we know better
				this.updateTime(this._timeFlow.currentTime);
		}
	}

	get playing() {
		return this._mode === TimelineMode.Play;
	}

	@property("Timeline is stopped", false)
	set stopped(newState: boolean) {
		if (newState !== this.isStopped()) {
			const wasPlaying = this.isPlaying();

			this._driver.queryHandler.tell(newState ? "Timelines.Timeline.stop" : "Timelines.Timeline.play", {"handle": this.handle});
			this.mode = newState ? TimelineMode.Stop : TimelineMode.Pause;

		}
	}

	get stopped() {
		return this._mode === TimelineMode.Stop;
	}

	@property("Current time position")
	get time(): TimeFlow {
		return this._timeFlow;
	}
	set time(pos: TimeFlow) {
		let frame = this.convertMillisecondsToFrame(pos.position);

		this.frame = frame;
		this._driver.queryHandler.tell("Timelines.Timeline.setCurrentTime", {"handle": this.handle, "time": frame });
	}

	private isPlaying(): boolean {
		return this._mode === TimelineMode.Play;
	}

	private isStopped(): boolean {
		return this._mode === TimelineMode.Stop;
	}

	private getTimeFlowRate(): number {
		return this.isPlaying() ? this._speedFactor : 0;
	}

	private convertFrameToMilliseconds(): number {
		return (this._frame / this._fps) * TimeFlow.Second;
	}

	private convertMillisecondsToFrame(ms: number): number {
		return (ms / TimeFlow.Second) * this._fps;
	}
}


@driver('NetworkTCP', { port: 1400 })
export class Pixera extends Driver<NetworkTCP> {
	static readonly kJsonPacketFraming = '0xPX';	// Delimiter between JSON packages
	static readonly kPollInterval = 5000; 			// milliseconds between poll, or 0 to disable
	private readonly queries: QueryHandler;

	private readonly timelines: Dictionary<TimelineAggregateElem>;
	private timelineHandles: Dictionary<TimelineAggregateElem> = {};

	public constructor(public socket: NetworkTCP) {
		super(socket);
		socket.setReceiveFraming(Pixera.kJsonPacketFraming);
		socket.setMaxLineLength(1024*10);	// Reasonable maximum message size (?)
		socket.autoConnect();
		this.queries = new QueryHandler(this);
		this.timelines = this.namedAggregateProperty("timelines", TimelineAggregateElem);

		// Further initlization in init(), either if connected right of the bat or once it connects
		if (socket.connected)
			wait(10).then(() => this.init());
		socket.subscribe('connect', (emitter, message) => {
			if (message.type === "Connection" && socket.connected) // Just became connected
				this.init()
		});
	}

	@callable("Call to update the set of PIXERA timelines known to Blocks")
	public update() {
		this.reInitialize();
	}

	get queryHandler(): QueryHandler {
		return this.queries;
	}

	/**
	 * Get all timelines and expose them as individual properties by name to
	 * play/pause, etc.
	 */
	private init() {
		log("Init");

		// Remove all timelines, in case this isn't the first call to init.
		this.timelineHandles = {};

		// Fetch available timelines and add them.
		this.queries.ask<HandleList>("Timelines.getTimelines").then(handles => {
			let toAwait: Promise<any>[] = []
			for (const handle of handles)
				toAwait.push(this.addTimelineAsync(handle))
			// Wait for all timeline data to be known
			Promise.all(toAwait).finally(() => {
				this.poll(true)
			})
		});

		// Make subscribed-to status include tailing delimiter.
		this.queries.tell("Utility.setMonitoringHasDelimiter", {"hasDelimiter":true});
		// Only get discrete values as events.
		this.queries.tell("Utility.setMonitoringEventMode", {"mode":"onlyDiscrete"});
	}

	/**
	 * Fetches info about a timeline using this.fetchTimelineInfoAsync, then
	 * adds it.
	 */
	private async addTimelineAsync(handle: number) {
		log("addTimelineAsync");

		let attrs = await this.fetchTimelineAttributesAsync(handle);
		let speedFactor = await this.fetchTimelineSpeedFactorAsync(handle);
		let frame = await this.fetchTimelineFrameAsync(handle);
		let timeline = new TimelineAggregateElem(this, handle, attrs.name, attrs.index, attrs.fps, speedFactor, attrs.mode, frame);

		this.timelineHandles[handle] = timeline;
		this.timelines[timeline.name] = timeline;
	}

	/**
	 * Got some status monitoring message. Forward to the correct handler
	 * depending on name.
	 */
	handleMonitorMsg(msg: MonitorJsonMsg) {
		if (msg.type === "monEvent") {
			switch (msg.name) {
			case "timelineTransport":
				this.handleTimelineTransportMsg(<TimelineTransportMsg>msg);
				break;
			case "timelinePositionChangedManually":
				this.handleTimelinePositionMsg(<TimelinePositionMsg>msg);
				break;
			case "cueApplied":
				// log("cueApplied");
				// Cue has "been applied". Must update status of all timelines.
				// +++ this.updateTimelines(true);
				break;
			case "projectOpened": // <-- Kan vara användbart, men är ej dokumenterat i API-dokumentationen...
				this.init();
				break;
			default:
				log("Unexpected monEvent", JSON.stringify(msg));
				break;
			}
		} else
			log("Unexpected message", JSON.stringify(msg));
	}

	/**
	 * Timeline transport monitoring message. Update timeline's status.
	 */
	private handleTimelineTransportMsg(msg: TimelineTransportMsg) {
		for (const evt of msg.entries) {
			this.timelineHandles[evt.handle].mode = evt.value;
			// +++ this.updateTimelineAsync(evt.handle); // fire and forget
		}
	}

	private handleTimelinePositionMsg(msg: TimelinePositionMsg) {
		for (const evt of msg.entries) {
			this.timelineHandles[evt.handle].frame = evt.value;
		}
	}

	/**
	 * Initial and subsequent polling, keeping timeline status up to date.
	 */
	private poll(updateAll: boolean) {
		if (this.pollinterval) {	// Make sure only one pending poll
			this.pollinterval.cancel();
			this.pollinterval = null;
		}
		if (this.socket.connected)
			this.updateTimelines(updateAll);
		if (Pixera.kPollInterval) {	// Repeated polling desired
			this.pollinterval = wait(Pixera.kPollInterval);
			this.pollinterval.then(() => {
				this.pollinterval = null;
				this.poll(false);
			});
		}
	}
	private pollinterval: CancelablePromise<any>;

	/**
	 * Fetch information and update each (playing) timeline in this.timelines.
	 * Mainly to keep time positions up to date while playing. But also
	 * used when "cueApplied" and other system-wide events where
	 * we need to update the states of all timelines.
	 */
	private updateTimelines(doAll?: boolean) {
		log("updateTimelines");
		for (const handle in this.timelineHandles) {
			if (doAll || this.timelineHandles[handle].playing)
				this.updateTimelineAsync(parseInt(handle));
		}
	}

	/**
	 * Update the state of timeline specified by handle by fetching all relevant
	 * data.
	 */
	private async updateTimelineAsync(handle: number) {
		let timeline = this.timelineHandles[handle];
		log("updateTimeline", timeline.name);
		let attrs = await this.fetchTimelineAttributesAsync(handle);
		let frame = await this.fetchTimelineFrameAsync(handle);

		timeline.mode = attrs.mode;
		timeline.frame = frame;
	}

	private async fetchTimelineAttributesAsync(handle: number): Promise<TimelineAttrs> {
		return await this.queries.ask<TimelineAttrs>("Timelines.Timeline.getAttributes", {handle: handle});
	}

	private async fetchTimelineFrameAsync(handle: number): Promise<number> {
		return await this.queries.ask<number>("Timelines.Timeline.getCurrentTime", {handle: handle});
	}

	private async fetchTimelineSpeedFactorAsync(handle: number): Promise<number> {
		return await this.queries.ask<number>("Timelines.Timeline.getSpeedFactor", {handle: handle});
	}
}

/**
 * Send commands and questions to PIXERA. Handle questions return a promise resolved once the result arrives.
 */
class QueryHandler {
	private static nextId = 1;
	private static readonly NO_QUERY = '-';	// Indicates "not a question"
	private pendingQueries: Dictionary<Query<any>> = {};

	// Times below in milliseconds, referencing getMonotonousMillis
	private static readonly kMaxAge = 200;	// How long we'll wait for reply
	private static readonly kStaleCheckInterval = 1000;
	private whenLastCheckdStale: number = 0;	// Time when we last checked for stale requests

	constructor(private owner: Pixera) {
		owner.socket.subscribe('textReceived', (sender, message) => {
			log("textReceived", message.text);
			try {
				this.handleMsgFromPixera(JSON.parse(message.text))
			} catch (error) {
				console.error("parsing data from Pixera", error);
			}
		});
	}

	/**
	 * Ask a question, as defined by method, with optional params. Returns a promise
	 * resolved when reply arrives, or rejected if error or timeout. Also used to send
	 * commands in cases where we're not interested in any reply.
	 */
	ask<T>(
		method: string,	// Method name (excluding 'Pixera.' prefix)
		params?: object
	): Promise<T> {
		const now = this.owner.getMonotonousMillis();

		const result = new Promise<T>((resolve, reject) => {
			const query = new Query(method, params, resolve, reject);
			const sendParams = query.aboutToSend(now);
			const cmd: JsonCmd = {
				jsonrpc: "2.0",
				id: QueryHandler.nextId++,
				method: "Pixera." + query.method
			}
			if (sendParams)
				cmd.params = sendParams;
			this.pendingQueries[cmd.id] = query;
			const cmdStr = JSON.stringify(cmd);
			this.owner.socket.sendText(cmdStr+ Pixera.kJsonPacketFraming);
			log("ask", cmdStr);
		});

		if (!this.whenLastCheckdStale)
			this.whenLastCheckdStale = now;
		else if (now - this.whenLastCheckdStale >= QueryHandler.kStaleCheckInterval) {
			this.checkStaleQueries(now);
			this.whenLastCheckdStale = now;
		}
		return result;
	}

	/**
	 * Similar to ask, but used for command for which we're not interested in the response.
	 */
	tell(
		method: string,	// Method name (excluding 'Pixera.' prefix)
		params?: object
	) {
		const cmd: JsonCmd = {
			jsonrpc: "2.0",
			id: QueryHandler.NO_QUERY,
			method: "Pixera." + method
		}
		if (params)
			cmd.params = params;
		const cmdStr = JSON.stringify(cmd);
		this.owner.socket.sendText(cmdStr+ Pixera.kJsonPacketFraming);
		log("tell", cmdStr);
	}

	private handleMsgFromPixera(msg: JsonMsg) {
		if (msg.id === -1)
			this.owner.handleMonitorMsg(<MonitorJsonMsg>msg);
		else if (msg.id !== QueryHandler.NO_QUERY) {
			const query = this.pendingQueries[msg.id];
			if (query) {
				delete this.pendingQueries[msg.id];
				query.handleResult(msg);
			} else
				console.warn("spurious data", JSON.stringify(msg));
		} // Else ignore response to "tell" call
	}

	/**
	 * Run through all outstanding queries every now and then, discarding
	 * ones considered timed out. Calls the error handler of the query.
	 */
	private checkStaleQueries(now: number) {
		for (const id in this.pendingQueries) {
			const query = this.pendingQueries[id];
			if (now - query.getWhenAsked() > QueryHandler.kMaxAge) {
				delete this.pendingQueries[id];
				console.error("Query timed out", query.method, "id", id);
				query.fail("Timeout");
			}
		}
	}
}

class Query<T> {
	private whenAsked: number | undefined;	// getMonotonousMillis when asked

	constructor(
		public readonly method: string,	// Method name (excluding 'Pixera.' prefix)
		private params: object | undefined,	// Params sent
		private resolver: (value?: T | Thenable<T>) => void,
		private rejector: (error?: any) => void
	) {
	}

	aboutToSend(timeNow: number): object | undefined {
		this.whenAsked = timeNow;
		return this.params;
	}

	getWhenAsked(): number | undefined {
		return this.whenAsked;
	}

	handleResult(resultMsg: JsonReply) {
		if (resultMsg.error) {
			log("rejected query id", resultMsg.id);
			this.rejector(resultMsg.error.message || ("Code: " + resultMsg.error.code));
			// log("rejected id done", resultMsg.id);
		} else {
			// log("resolved query id", resultMsg.id);
			this.resolver(resultMsg.result);
			// log("resolved query id done", resultMsg.id);
		}
	}

	fail(error: string) {
		this.rejector(error);
	}
}


export interface Dictionary<TElem> {
	[id: string]: TElem;
}

/**
 Log messages, allowing my logging to be easily disabled in one place.
 */
const DEBUG = false;	// Set to false to disable verbose logging
function log(...messages: any[]) {
	if (DEBUG)
		console.info(messages);
}
