/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2018 by Mike Fahl.
 */

import {NetworkTCP} from "system/Network";
import {callable, parameter, property} from "system_lib/Metadata";
import {Driver} from "system_lib/Driver";

const REQUEST_TIMEOUT = 8000;

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
	private readonly propList: State<any>[];		// States I attempt to apply to the projector

	/*	Most recent command sent to projector, with associated resolver/rejector callbacks.
		I'm designed to operate with a single command at a time, since most protocols
		don't provide any command/response ID to associate a command with its possible
		response. So don't fire off a command if commandInProgress() returns true.
	 */
	protected currCmd: string;	// Command in flight, if any
	private currResolver: (value?: string | Thenable<string>) => void;
	private currRejector: (error?: any) => void;
	private cmdTimeout: CancelablePromise<void>;	// Timeout associated with current command

	private sendFailedReported: boolean;	// To not nag if can't send data

	protected constructor(protected socket: NetworkTCP) {
		super(socket);
		this.propList = [];
		socket.subscribe('connect', (sender, message)=> {
			if (message.type === 'Connection')
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
	 * Add a state managed by me.
	 */
	protected addState(state: State<any>) {
		this.propList.push(state);
		state.setDriver(this);	// Allowing it to fire notifications through me
	}

	/**
	 * Allow clients to check for my type, just as in some system object classes
	 */
	isOfTypeName(typeName: string) {
		return typeName === "NetworkProjector" ? this : null;
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
	 * Passthrough for sending raw commands frmo tasks and client scripts.
	 * Comment out @callable if you don't want to expose sending raw command strings to tasks.
	 */
	@callable("Send raw command string to device")
	public sendText(
		@parameter("What to send") text: string,
	): Promise<any> {
		return this.socket.sendText(text, this.getDefaultEoln());
	}

	/**
	 * Override in subclasses that need special form of eoln seq.
	 */
	protected getDefaultEoln(): string | undefined {
		return undefined;
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
	 * Return true if there's no command in progress and otherwise OK to send a command.
	 */
	protected okToSendCommand(): boolean {
		return !this.currCmd;
	}

	/**
	 If at all possible, and any pending, attempt to send a single correction command.
	 Ret true if actually sent a correction command this time.
	 */
	protected sendCorrection(): boolean {
		// Don't even try if there's any command in flight or we're not yet fully awake
		if (!this.okToSendCommand() || !this.awake) {
			// console.info("sendCorrection NOT", this.currCmd, this.awake);
			return false;	// No can do
		}

		const req = this.reqToSend();	// Get pending request, if any
		if (req) {	// Got one - proceed with attempting to send it
			if (!this.socket.connected) {	// Must connect that first
				if (!this.connectDly)		// No delay in progress
					this.attemptConnect();
				// Else a connection attempt will happen after delay
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
				return true;	// Did send this time
			}
		}
		return false;
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
		if (!this.socket.connected && !this.connecting && this.socket.enabled) {
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
		// console.info("connectStateChanged", this.socket.connected);
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
		this.poller = wait(21333);
		this.poller.then(()=> {
			var continuePolling = true;
			if (!this.socket.connected) {
				if (!this.connecting && !this.connectDly)
					this.attemptConnect();	// Status retrieved once connected
			} else  // I'm connected - move ahead to poll for current status
				continuePolling = this.pollStatus();
			if (continuePolling && !this.discarded)	// Keep polling
				this.poll();
		})
	}

	/**
	 	Override to poll for status regularly, if desired.
	 	Ret true if to continue polling
	 */
	protected pollStatus(): boolean {
		return false;
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
	 * Begin a new request, storing the command sent in currCmd and returning a promise that will
	 * be finished when the request finishes. If the driver subclass determines that the request
	 * is finished, it typically calls requestSuccess or requestFail. If it is finished
	 * for some other abnormal reason, it must call requestFinished. I will set up a timeout to reject
	 * the command and call requestFinished after some time, in case there's never any reply.
	 */
	protected startRequest(cmd: string) {
		this.currCmd = cmd;
		const result = new Promise<string>((resolve, reject) => {
			this.currResolver = resolve;
			this.currRejector = reject;
		});
		this.cmdTimeout = wait(REQUEST_TIMEOUT);	// Should be ample time to respond
		this.cmdTimeout.then(() =>
			this.requestFailure("Timeout for " + cmd)
		);
		return result;
	}

	/**
	 * Call to indicate that the current command succeeded.
	 */
	protected requestSuccess(result: string) {
		if (this.currResolver)
			this.currResolver(result);
		this.requestClear();
	}

	/**
	 * Call to indicate that the current command failed.
	 */
	protected requestFailure(msg?: string) {
		// Suppress warning if power is off. Many projectors behave erratic then.
		if (this.power)
			this.warnMsg("Request failed", msg);
		const rejector = this.currRejector;
		this.requestClear();
		if (rejector)
			rejector(msg);
	}

	/**
	 End of current request in some unspecific manner. Do nothing if request already
	 terminated, else consider this error.
	 */
	protected requestFinished() {
		if (this.currRejector)
			this.requestFailure("Request failed for unspecific reason");
	}

	/**
	 * Clear out state associated with the current request.
	 */
	private requestClear() {
		if (this.cmdTimeout)
			this.cmdTimeout.cancel();
		delete this.cmdTimeout;
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
	protected current: T;		// Current state of projector, if known
	protected wanted: T;		// Desired (set by user) state, if any
	private driver: Driver<any>;		// Associated driver

	constructor(
		protected baseCmd: string, 	// Base part of command to send
		private propName: string, 	// Name of associated property
		private correctionApprover?: ()=>boolean // If specified, do NOT attempt to correct if returns false
	) {}

	/**
	 * Set the driver I'm associated with, allowing me to fire property changes when
	 * the tail wags the dog.
	 */
	setDriver(driver: Driver<any>) {
		this.driver = driver;
	}

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
	 would still think it is ON if that's the last state set, and since there's then
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
				this.notifyListeners();
				// console.info("updateCurrent wag dog", this.baseCmd, newState);
			} else if (this.wanted === undefined)
				this.notifyListeners(); // Had nop wanted state - notify for current
		}
	}

	/**
	 * If have a current value, then return it, else return undefined.
	 */
	getCurrent(): T {
		return this.current;
	}

	private notifyListeners() {
		if (this.driver && this.propName)
			this.driver.changed(this.propName);	// Let others know
	}

	/**
	 Return true if I have pending correction to send.
	 */
	needsCorrection(): boolean {
		return	this.wanted !== undefined &&
				this.current !== this.wanted &&
				(!this.correctionApprover || this.correctionApprover());
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

	constructor(
		protected baseCmd: string,
		propName: string,
		private readonly min: number,
		private readonly max: number,
		correctionApprover?: ()=>boolean
	) {
		super(baseCmd, propName, correctionApprover);
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


	get(): number {
		var result = super.get();
		// Better return min/0 than undefined or some invalid type of data
		if (typeof result !== 'number') {
			console.error("Value invalid for", this.baseCmd, result);
			result = this.min || 0;
		}
		return result;
	}
}
