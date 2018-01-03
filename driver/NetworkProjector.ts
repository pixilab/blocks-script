/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

import {NetworkTCP} from "system/Network";
import {property} from "system_lib/Metadata";
import {Driver} from "driver/Driver";

/**
 Common functionality needed by projectors controlled over the network.
 */
export abstract class NetworkProjector extends Driver<NetworkTCP> {
	private awake: boolean;					// Initialization queries are done
	protected discarded: boolean;				// Set once I've been discarded
	protected poller: CancelablePromise<void>;	// To poll projector status regularly
	protected connecting: boolean;				// Has initiated a connection attempt
	protected connectDly: CancelablePromise<void>; // While connection delay in progress
	protected correctionRetry: CancelablePromise<void>;	// To retry failed correction

	// Basic states (presumably) supported by all projectors.
	protected _power: BoolState;					// Set in subclass ctor
	// Remember to add to propList if you add more states here
	protected propList: State<any>[];			// States I attempt to apply to the projector

	// Most recent command sent to projector, with associated resolver/rejector callbacks
	protected currCmd: string;	// Command in flight, if any
	protected currResolver: (value?: string | Thenable<string>) => void;
	protected currRejector: (error?: any) => void;

	private sendFailedReported: boolean;	// To not nag if can't send data

	protected constructor(protected socket: NetworkTCP) {
		super(socket);
		this.propList = [];
		socket.subscribe('connect', (sender, message)=> {
			// console.info('connect msg', message.type);
			this.connectStateChanged()
		});
		socket.subscribe('textReceived', (sender, msg)=>
			this.textReceived(msg.text)
		);

		socket.subscribe('finish', (sender)=>
			this.discard()
		);
	}

	/**
	 Turn power on/off.
	 */
	@property("Power on/off")
	public set power(on: boolean) {
		if (this._power.set(on))
			this.sendCorrection();
	}
	/**
	 Get current power state, if known, else undefined.
	 */
	public get power(): boolean {
		return this._power.get();
	}


	/**
	 Return true if I'm currently online to the projector. Note that
	 this may change at any time, as the projector disconnects 30 seconds
	 after last command. You don't need to connect explicitly before
	 calling one of the public setXxx to change the state, as I connect
	 on demand.
	 */
	@property("True if projector is online", true)
	public get connected(): boolean {
		return this.awake;
	}
	public set connected(conn: boolean) {
		this.awake = conn;
	}

	/**
	 Got data from peer. E.g., reply to query or ack for command. Text does not
	 include line terminator character (e.g, CR).
	 */
	protected abstract textReceived(text: string): void;

	/**
	 Send a question or command to the projector, and wait for the response. The response
	 will be provided in the resolved promise. An error response will cause it to be rejected
	 with that error code.
	 */
	abstract request(question: string, param?: string): Promise<string>;

	protected discard() {
		this.discarded = true;
		if (this.poller)
			this.poller.cancel();
		if (this.correctionRetry)
			this.correctionRetry.cancel();
		delete this.poller;
	}

	/**
	 Log an error message, incriminating my network connection's name
	 */
	protected errorMsg(...messages: string[]) {
		messages.unshift(this.socket.fullName); // Provide some context
		console.error(messages);
	}

	/**
	 Log a warning message, incriminating my network connection's name
	 */
	protected warnMsg(...messages: string[]) {
		messages.unshift(this.socket.fullName);
		console.warn(messages);
	}

	/*	Get first state that wants to send a request, else undefined.
	 */
	protected reqToSend(): State<any>|undefined {
		for (var p of this.propList)
			if (p.needsCorrection())
				return p;
	}

	/**
	 If at all possible, and any pending, attempt to send a single correction command.
	 */
	protected sendCorrection() {
		// Don't even try if there's any command in flight or we're not yet fully awake
		if (this.currCmd || !this.awake) {
			// console.info("sendCorrection NOT", this.currCmd, this.awake);
			return;	// No can do
		}

		const req = this.reqToSend();	// Get pending request, if any
		if (req) {	// Got one - proceed with attempting to send it
			if (!this.socket.connected) {	// Must connect that first
				if (!this.connectDly)		// No delay in progress
					this.attemptConnect();
				// Else a commection attempt will happen after delay
			} else {
				// console.info("req", req.current, req.get());
				req.correct(this)
				.then(
					() => this.sendFailedReported = false,
					() => { // Sending request failed
						if (this.reqToSend())		// Anything important to say
							this.retryCorrectionSoon();	// Re-try in a while

					}
				);
			}
		}
	}

	/**
	 Correction attempt above failed. Re-try again after som delay.
	 */
	private retryCorrectionSoon() {
		if (!this.correctionRetry) {
			this.correctionRetry = wait(20000);
			this.correctionRetry.then(() => {
				this.correctionRetry = undefined;
				this.sendCorrection();
			});
		}
	}

	/**
	 Attempt to connect now.
	 */
	protected attemptConnect() {
		if (!this.connecting && this.socket.enabled) {
			// console.info("attemptConnect");
			this.socket.connect().then(
				() => this.justConnected(),
				error => this.connectStateChanged()
			);
			this.connecting = true;
		}
	}

	/**
	 Override if you want to do something once connection has been established
	 successfully.
	 */
	protected justConnected(): void {
	}

	/**
	 Connection attempt finished (successfully or not), or was disconnected.
	 */
	protected connectStateChanged() {
		this.connecting = false;
		// console.info("connectStateChanged", this.socket.isConnected());
		if (!this.socket.connected) {
			this.connected = false;	// Tell clients connection dropped
			if (this.correctionRetry)
				this.correctionRetry.cancel();
			if (this.reqToSend())
				this.connectSoon();	// Got data to send - attempt to re-connect soon
		}
	}

	/**
	 Some comms error happened. Disconnect and re-try from the start soon.
	 */
	protected disconnectAndTryAgainSoon() {
		if (this.socket.connected)
			this.socket.disconnect();
		this.connectSoon();
	}

	/**
	 Arrange to attempt to connect soon.
	 */
	protected connectSoon() {
		if (!this.connectDly) {
			// console.info("connectSoon");
			this.connectDly = wait(8000);
			this.connectDly.then(
				() => {
					this.connectDly = undefined;
					this.attemptConnect();
				}
			);
		}
	}

	/**
	 Poll the projector's status with some regularity, to not get out
	 of sync if status changed behind our back.
	 */
	protected poll() {
		this.poller = wait(60000);
		this.poller.then(()=> {
			if (!this.connecting && !this.connectDly)
				this.attemptConnect();	// Status retrieved once connected
			if (!this.discarded)	// Keep polling
				this.poll();
		})
	}

	/**
	 Failed sending command. Assume socket is down, and initiate connection
	 attempt.
	 */
	protected sendFailed(err: string) {
		if (!this.sendFailedReported) {	// Don't nag
			this.warnMsg("Failed sending command", this.currCmd, err);
			this.sendFailedReported = true;
		}
		const rejector = this.currRejector;
		if (rejector)
			rejector("Send failed with " + err + ", for " + this.currCmd);
		this.requestFinished();
		if (!rejector)
			this.sendCorrection();
		// Else assume done through rejector
	}

	/**
	 End of current request (whether successful or failed). Clear out associated state.
	 */
	protected requestFinished() {
		delete this.currCmd;
		delete this.currRejector;
		delete this.currResolver;
	}

}


/**
 Property state for a single property, with current and wanted values, allowing
 for desired-state-tracking behavior in the driver, rather than command queueing.
 */
export abstract class State<T> {
	protected current: T;					// Current state of projector, if known
	protected wanted: T;		// Desired (set by user user) state, if any

	constructor(protected baseCmd: string) {}

	/**
	 Return wanted state, if any, else current, else undefined.
	 */
	get(): T {
		return this.wanted != undefined ? this.wanted : this.current;
	}

	/**
	Set desired state, returning true if this was news compared to previously
	known state.
	 */
	set(state: T): boolean {
		const news = this.wanted !== state;
		this.wanted = state;
		return news;
	}

	/**
	 A "current state" update received from the device. Store it as current. Also,
	 let the tail wag the dog under the right circumstances. Without this mechanism,
	 you may not be able to control the device if it has changed state "behind our
	 back". E.g., if the projector has powered itself down due to "no signal", we
	 would still thing it is ON if that's the last state set, and since there's then
	 no change in the "wanted" value when attempting to turn it on, it won't send the
	 command, and the projector can not be turned on from the user's point of view.

	 Note that for this to work with changes done "behind our back", someone must
	 poll the projector with some regularity to learn about its actual status, and
	 then call this function with the result.
	 */
	updateCurrent(newState: T) {
		const lastCurrent = this.current;
		this.current = newState;
		// console.info("updateCurrent", this.baseCmd, newState);
		if (lastCurrent !== newState && newState !== undefined) {
			// Got a new, defined, current state
			if (lastCurrent === this.wanted) { // Last state was my currently "wanted"
				this.wanted = newState;		// Let the tail wag the dog
				// console.info("updateCurrent wag dog", this.baseCmd, newState);
			}
		}
	}

	/**
	 Return true if I have pending correction to send.
	 */
	needsCorrection(): boolean {
		return this.wanted !== undefined && this.current !== this.wanted;
	}

	abstract correct(drvr: NetworkProjector): Promise<string>;	// Make current desired

	protected correct2(drvr: NetworkProjector, arg: string): Promise<string> {
		// Hold on to wanted in case it changes before reply
		const wanted = this.wanted;
		const result = drvr.request(this.baseCmd, arg);
		result.then(()=> {
			this.current = wanted;	// Now consider set
			// console.info("correct2 succeeded", this.baseCmd, wanted);
		});
		return result;
	}
}


/**
 Manage a boolean state.
 */
export class BoolState extends State<boolean> {
	correct(drvr: NetworkProjector): Promise<string> {
		return this.correct2(drvr, this.wanted ? '1' : '0');
	}
}

/**
 Manage a numeric state, including limits.
 */
export class NumState extends State<number> {
	private min: number;
	private max: number;

	constructor(protected baseCmd: string, min: number, max: number) {
		super(baseCmd);
		this.min = min;
		this.max = max;
	}

	correct(drvr: NetworkProjector): Promise<string> {
		return this.correct2(drvr, this.wanted.toString());
	}

	/**
	 Override to validate in range.
	 */
	set(v: number): boolean {
		if (v < this.min || v > this.max) {
			console.error("Value out of range for", this.baseCmd, v);
			return false;
		}
		return super.set(v);
	}
}
