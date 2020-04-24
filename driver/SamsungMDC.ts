/*
	Samsung MDC display control driver. Works with most Samsung Signage displays.

	Available "input" numbers, according to the protocol doc (may vary with model of display)

 	Copyright (c) 2020 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {driver, max, min, property} from "system_lib/Metadata";
import {PrimTypeSpecifier} from "../system/PubSub";

/**
 * Fixed position slots in commands and replies byte arrays accoding to the MDC protocol spec.
 */
const enum CmdSlots {
	kHeader,		// Expected kHeaderData
	kCmdType,		// Command type
	kId,			// Display ID (leftover from old serial multi-drop control)
	kDataLength,	// Number of data bytes following (not including checksum byte)

	kAck,			// In replies only
	kRespToCmdType,	// Type of command this is a response for
	// Specified number of data bytes go here
	// Checksum as last byte
}

const kHeaderData = 0xAA;
const kAckData = 0x41;	// 'A'

@driver('NetworkTCP', { port: 1515 })
export class SamsungMDC extends Driver<NetworkTCP> {

	// ID of display. Leftover from original serial protocol. Must match what's set on display.
	private mId: number = 0;

	private discarded: boolean;				// Set once driver been discarded (shut down)
	private poller: CancelablePromise<void>;	// To pollSoon projector status regularly
	private correctionRetry: CancelablePromise<void>;	// To retry failed correction

	// Store individual properties here to update those when pollSoon status arrives en mass
	private readonly powerProp: Power;
	private readonly volumeProp: Volume;
	private readonly inputProp: NumProp;
	private readonly propList: Prop<any>[];	// Also as array to scan for property to correct

	/*	Most recent command sent, with associated resolver/rejector callbacks.
		I'm designed to operate with a single command at a time, since most protocols
		don't provide any command/response ID to associate a command with its possible
		response. So don't fire off a command if there's alredy a currCmd.
	 */
	private currCmd: Command;	// Command in flight, if any
	private currResolver: (value?: number[] | Thenable<number[]>) => void;
	private currRejector: (error?: any) => void;
	private cmdTimeout: CancelablePromise<void>;	// To timeout current command if no response

	private receivedData: number[];		// Data received buffer, to splice together partial data

	constructor(protected socket: NetworkTCP) {
		super(socket);
		socket.autoConnect(true);
		socket.enableWakeOnLAN();
		this.propList = [];

		this.propList.push(this.powerProp = new Power(this));
		this.inputProp = new NumProp(this,
			"input", "Source input number; HDMI1=33",
			0x14, 0x21,
			0x14, 0x40
		);
		this.propList.push(this.inputProp);
		this.propList.push(this.volumeProp = new Volume(this));

		socket.subscribe('connect', (sender, message)=>
				this.connectStateChanged(message.type)
		);
		socket.subscribe('bytesReceived', (sender, msg)=>
			this.dataReceived(msg.rawData)
		);

		socket.subscribe('finish', sender =>
			this.discard()
		);
		if (socket.connected)	// Already connected - get going right away
			this.pollNow();
		debugMsg("driver initialized");
	}


	/**
	 * Allow clients to check for my type by name, just as in some system classes.
	 */
	isOfTypeName(typeName: string) {
		return typeName === "SamsungMDC" ? this : null;
	}

	/**
	 * Attempt to power up the display by sending it a wake-on-LAN package.
	 */
	wakeUp() {
		this.socket.wakeOnLAN();
	}

	@property("The target ID (rarely used over network)")
	@min(0) @max(254)
	public set id(
		id: number
	) {
		this.mId = id;
	}
	public get id(): number {
		return this.mId;
	}


	/**
	 * Discard this driver. Called when the host object is torn down, to cancel all pending
	 * requests/timers.
	 */
	private discard() {
		this.discarded = true;
		this.cancelPollAndRetry();
	}

	/*	Cancel and clear any pending pollSoon or command retry.
	 */
	private cancelPollAndRetry() {
		if (this.poller) {
			this.poller.cancel();
			this.poller = undefined;
		}
		if (this.correctionRetry) {
			this.correctionRetry.cancel();
			this.correctionRetry = undefined;
		}
		if (this.cmdTimeout) {
			this.cmdTimeout.cancel();
			this.cmdTimeout = undefined;
		}
	}

	/**
	 Log an error message, incriminating my network connection's name
	 */
	private errorMsg(...messages: string[]) {
		messages.unshift(this.socket.fullName); // Provide some context
		console.error(messages);
	}

	/**
	 Log a warning message, incriminating my network connection's name
	 */
	private warnMsg(...messages: string[]) {
		messages.unshift(this.socket.fullName);
		console.warn(messages);
	}

	/**	Get first property that wants to send a command, else undefined.
	 */
	private getPropToSend(): Prop<any>|undefined {
		for (var p of this.propList)
			if (p.needsCorrection())
				return p;
	}

	/**
	 If at all possible and theres any property to send, attempt to send a correction command.
	 */
	sendCorrection() {
		if (this.okToSendNewCommand()) {
			const prop = this.getPropToSend();	// Get pending request, if any
			if (prop) {	// Got one - proceed with attempting to send it
				if (prop.canSendOffline() || (this.powerProp.getCurrent() && this.socket.connected)) {
					debugMsg("sendCorrection prop", prop.name, "from", prop.getCurrent(), "to", prop.get());
					const promise = prop.correct();
					if (promise) {
						promise.catch(
							() => { // Sending request failed
								if (this.getPropToSend())	// Still something important to say
									this.retryCorrectionSoon();	// Re-try in a while
							}
						);
					} else 	// Else command was "send and forget", so no promise to await
						this.retryCorrectionSoon();	// Retry non-promise command after some time as well
				}
			}
		} else
			debugMsg("sendCorrection NOT", this.currCmd);
	}

	/**
	 * Return true if it seems OK to send a new command now.
	 */
	private okToSendNewCommand() {
		return !this.discarded && !this.currCmd && !this.correctionRetry;
	}

	/**
	 Correction attempt above failed (or we have no idea). Re-try again after some time.
	 */
	private retryCorrectionSoon() {
		if (!this.correctionRetry && !this.discarded) {
			this.correctionRetry = wait(500);
			this.correctionRetry.then(() => {
				this.correctionRetry = undefined;
				this.sendCorrection();
			});
		}
	}

	/**
	 Connection attempt finished (successfully or not), or was disconnected.
	 */
	private connectStateChanged(type: String) {
		debugMsg("connectStateChanged", type, this.socket.connected);
		if (type === 'Connection') {
			if (!this.socket.connected)	// Connection dropped
				this.cancelPollAndRetry();
			else 	// Just connected - gett polling started
				this.pollNow()
		} else if (type === 'ConnectionFailed')	// Connection attempt failed
			this.powerProp.updateCurrent(false); // Device presumably off
	}

	/**
	 Poll the projector's status with some regularity, to not get out
	 of sync for too long if status changes behind our back (e.g., using
	 the remote or turning off power).
	 */
	private pollSoon(howSoonMillis = 5333) {
		if (!this.discarded) {
			this.poller = wait(howSoonMillis);
			this.poller.then(() => {
				this.poller = undefined;	// Now taken
				if (this.okToSendNewCommand())
					this.pollNow();	// We're clear to go
				else
					this.pollSoon(600); // Retry soon again
			});
		}
	}

	/**
	 * Send a "status" command to the device, trying to probe its current state.
	 */
	private pollNow() {
		this.startRequest(new Command("status", this.id, 0x00)).then(reply => {
			if (reply.length >= 4) { // Got at least the number of status bytes I need
				debugMsg("Got status pollSoon reply", reply);
				this.powerProp.updateCurrent(!!reply[0]); // Prop is boolean
				var volNorm = reply[1];
				if (volNorm == 0xff)		// Models without audio reports as 0xff - make this zero vol
					volNorm = 0;
				volNorm = volNorm / 100;	// Prop is normalized
				this.volumeProp.updateCurrent(volNorm);
				this.inputProp.updateCurrent(reply[3]);
			}
		});
		this.pollSoon();	// Poll again in a bit
	}

	/**
	 * Received data from device. Presumably ack for command or reply for query.
	 */
	private dataReceived(rawData: number[]): void {
		// Append to any already receivedData if I get partial packets
		var buf = this.receivedData;
		/*	Note that rawData received is "array-like" in that it has elements and a
			length, but not much more. So we need to convert it to a proper JS array to
			call Array methods on it. For more on array-like objects, see
			https://dzone.com/articles/js-array-from-an-array-like-object
		*/
		rawData = makeJSArray(rawData);
		buf = this.receivedData = buf ? buf.concat(rawData) : rawData;

		debugMsg("Got some data back");

		if (buf.length > CmdSlots.kRespToCmdType + 1) {	// Enough data to consider in reply
			if (this.currCmd) {	// There's is indeed a command awaiting its response
				if (buf[CmdSlots.kHeader] !== kHeaderData)
					this.currCmdErr('Invalid header in reply');
				else if (buf[CmdSlots.kAck] === kAckData) {
					var responseType = buf[CmdSlots.kCmdType];
					if (buf[CmdSlots.kCmdType] === 0xff) {
						responseType = buf[CmdSlots.kRespToCmdType];
						if (responseType === this.currCmd.cmdType) {
							// Obtain number pf param bytes from "Data Length" (which also counts kAck and kRespToCmdType)
							const numParams = buf[CmdSlots.kDataLength] - (CmdSlots.kRespToCmdType - CmdSlots.kDataLength);
							const paramOffs = CmdSlots.kRespToCmdType + 1;	// Param bytes start from here
							if (buf.length >= paramOffs + numParams) { // Got what I need
								this.requestSuccess(buf.slice(paramOffs, paramOffs + numParams));
								debugMsg("ACK for cmd type", responseType)
							}
							// Else await some more data (may be fragmented into multiple packets
						} else
							this.currCmdErr('Unexpected response type ' + responseType);
					} else
						this.currCmdErr('Unexpected response command' + responseType);
				} else
					this.currCmdErr('NAK response');
			} else
				this.warnMsg("Unexpected data from device", rawData.toString())
		}
	}

	/**
	 * Fail the current command with excuse plus something describing the failed command.
	 */
	private currCmdErr(excuse: string) {
		this.requestFailure(excuse + ' ' + this.currCmd.toString());
	}

	/**
	 * Begin a new request, storing the command sent in currCmd and returning a promise that will
	 * be finished with the request.
	 * Once the request is finished, call requestSuccess or requestFail. If it finishes
	 * for some other abnormal reason, you must call requestFinished. I will set up a timeout to reject
	 * the command and call requestFinished after some time, in case there's never any reply.
	 */
	startRequest(cmd: Command): Promise<number[]> {
		this.currCmd = cmd;
		this.receivedData = undefined;	// Clear out any residue in preparation for new command
		this.socket.sendBytes(cmd.getBytes());	// Send the command to the device
		const result = new Promise<number[]>((resolve, reject) => {
			this.currResolver = resolve;
			this.currRejector = reject;
		});
		/*	Provide AMPLE time to carry out commands and receive reply. Some commands (such as switching
			input when no input is connected) may take a VERY long time	to return a response.
			Sending new commands before receiving ACK/NAK for the previous one is likely not
			a good idea.
		 */
		this.cmdTimeout = wait(10000);
		this.cmdTimeout.then(() => {
			this.requestFailure("Timeout for " + cmd);
			/*	Assume display was powered down, so disconnect from my end and consider its power OFF.
				Is there a better way to detect that power was turned off outside our control? Likely
				not, since the device don't respond to network commands when off.
			 */
			this.socket.disconnect();
			this.powerProp.updateCurrent(false);
		});
		return result;
	}

	/**
	 * Call to indicate that the current command succeeded.
	 */
	private requestSuccess(result: number[]) {
		debugMsg("Request succeded", this.currCmd.name);
		if (this.currResolver)
			this.currResolver(result);
		this.requestClear();
		// Send any command-in-waiting once this cycle is complete
		asap(() => this.sendCorrection());
	}

	/**
	 * Call to indicate that the current command failed.
	 */
	private requestFailure(msg?: string) {
		debugMsg("Request failed", msg || this.currCmd.name);
		const rejector = this.currRejector;
		this.requestClear();
		if (rejector)
			rejector(msg);
	}

	/**
	 * Clear out state associated with the current request, now presumably finished with.
	 */
	private requestClear() {
		if (this.cmdTimeout)
			this.cmdTimeout.cancel();
		this.cmdTimeout = undefined;
		this.currCmd = undefined;
		this.currRejector = undefined;
		this.currResolver = undefined;
		this.receivedData = undefined;
	}
}

/**	A single command, wrapping a single
	command byte and an optional single param byte. Calculates the
 	checksum and sends the command through the socket.
*/
class Command {
	private readonly cmd: number[];

	constructor(
		public readonly name: string,	// To make log messages more readable
		id: number,			// Display ID
		public readonly cmdType: number, 	// Byte identifying the type of command
		paramByte?:number	// The (single) parameter byte, if any
	) {
		const cmd: number[] = [];
		cmd.push(kHeaderData);	// Start of command marker (not part of checksum)
		cmd.push(cmdType);
		cmd.push(id);
		if (paramByte !== undefined) {
			// I handle only single byte params for now
			cmd.push(1);	// Length of parameter block
			// Clip to zero and truncate to a byte value (integer 0...0xff)
			paramByte = Math.max(0, Math.round(paramByte)) & 0xff;
			cmd.push(paramByte);	// Command byte
		} else
			cmd.push(0);	// No param, so zero length parameter block

		// Calculate crummy checksum
		var checksum = 0;
		const count = cmd.length;
		for (var ix = 1; ix < count; ++ix)
			checksum += cmd[ix];
		// Append to command, truncated to a byte
		cmd.push(checksum & 0xff);
		this.cmd = cmd;
	}

	/**
	 * Return the byte array to send to the device
	 */
	getBytes():  number[] {
		return this.cmd;
	}

	/**
	 * Return a stirng description of this command, suitable in error logging.
	 */
	toString() {
		return this.name + ' ' + this.cmd.toString();
	}
}


/**
 Property state for a single property of type T, with current and wanted values, allowing
 for desired-state-tracking behavior in the driver, rather than command queueing.
 */
abstract class Prop<T> {
	protected wanted: T;		// Desired (set by user) state, if any

	protected constructor(
		protected readonly driver: SamsungMDC, // Owning driver
		type: PrimTypeSpecifier,		// Type of property (must match T)
		public readonly name: string, 	// Name of associated property
		description: string,	// Property description shown in UI
		protected readonly cmdByte: number, // Command to send
		private current: T				// Current state (initially assumed state)
	) {
		driver.property<T>(
			name,
			{
				type: type,
				description: description,
			},
			setValue => {
				if (setValue !== undefined) { // Is "set" request
					if (this.set(setValue))
						this.driver.sendCorrection();
				}
				return this.get();	// Always returns current value
			}
		);
	}

	// True if this property can be controlled even while offline
	canSendOffline(): boolean {
		return false;
	}

	/**
	 Return wanted state, if any, else current, else undefined.
	 */
	get(): T {
		return this.wanted != undefined ? this.wanted : this.current;
	}

	getCurrent() {
		return this.current;
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
		if (lastCurrent !== newState && newState !== undefined) {
			debugMsg("updateCurrent", this.cmdByte, newState);
			// Got a new, defined, current state
			if (lastCurrent === this.wanted) { 	// Last state was my currently "wanted"
				this.wanted = newState;			// Let the tail wag the dog
				this.notifyListeners();
				debugMsg("updateCurrent wag dog", this.name, newState);
			} else if (this.wanted === undefined)
				this.notifyListeners(); // Had no wanted state set yet - notify for current
		}
	}

	private notifyListeners() {
		this.driver.changed(this.name);	// Let others know
	}

	/**
	 Return true if I have pending correction to send.
	 */
	needsCorrection(): boolean {
		return	this.wanted !== undefined &&
				this.current !== this.wanted;
	}

	protected correctWithValue(value: number) {
		return this.correct2(new Command(this.name, this.driver.id, this.cmdByte, value));
	}

	/**
	 * Do what's require to make the current state equal the wanted, such
	 * as sending a commnd to the device. Return a promise if possible, else
	 * undefined (e.g., for wake-on-LAN message, which is send-and-forget).
	 */
	abstract correct(): Promise<number[]> | undefined;

	correct2(cmd: Command): Promise<number[]> {
		// Hold on to wanted in case it changes before reply
		const wanted = this.wanted;
		const result = this.driver.startRequest(cmd);
		result.then(()=> {
			this.current = wanted;	// Now consider set
			debugMsg("correct2 succeeded for command type", this.cmdByte, "with wanted value", wanted);
		});
		return result;
	}
}


/**
 Manage a basic boolean state, where the command parameter byte is
 assumed to be 1 for true and 0 for false.
 */
class BoolProp extends Prop<boolean> {


	constructor(driver: SamsungMDC, propName: string, description: string, cmdByte: number, current: boolean) {
		super(driver, Boolean, propName, description, cmdByte, current);
	}

	correct(): Promise<number[]>  {
		return this.correctWithValue(this.wanted ? 1 : 0);
	}
}

/**
 * Override to send wake-on-LAN message with command to power up, as some models don't listen
 * to regular commands while powered off.
 */
class Power extends BoolProp {
	constructor(driver: SamsungMDC) {
		super(driver, "power", "Power display on/off", 0x11, false);
	}

	// I can "send this command" to turn on power even while offline, as I use wake-on-LAN
	canSendOffline(): boolean {
		return this.wanted;
	}

	correct(): Promise<number[]>  {
		if (this.wanted) {
			debugMsg("WoL attempted");
			this.driver.wakeUp();
		}
		return super.correct();
	}
}


/**
 Manage a numeric property, including its limits.
 */
class NumProp extends Prop<number> {

	constructor(
		driver: SamsungMDC, 	// Owning driver
		propName: string, 		// Name of associated property
		description: string,	// Property description shown in UI
		cmdByte: number, 		// Command to send
		current: number,		// Current state (initially assumed state)
		private readonly min: number = 0,
		private readonly max: number = 1
	) {
		super(driver, Number, propName, description, cmdByte, current);
	}

	/**
	 * Correct by sending wantedValue, which defaults to my wantedValue if not specified
	 */
	correct(wantedValue: number = this.wanted): Promise<number[]>  {
		return this.correctWithValue(wantedValue);
	}

	/**
	 Override to reject if not in range.
	 */
	set(v: number): boolean {
		if (v < this.min || v > this.max) {
			console.error("Value out of range for", this.name, v);
			return false;
		}
		return super.set(v);
	}
}

class Volume extends NumProp {
	constructor(driver: SamsungMDC) {
		super(driver, "volume", "Volume level, normalized 0...1", 0x12, 1);
	}

	/**
	 * Override to scale normalized 0...1 volume to percentage 0...100.
	 */
	correct(): Promise<number[]>  {
		return super.correct(this.wanted * 100);
	}
}

/**
 * Turn an array-like object into a proper JavaScript array, which is returned.
 * Simply returns arr if already is fine.
 */
function makeJSArray(arr: any[]) {
	if (Array.isArray(arr))
		return arr;	// Already seems kosher - no need to convert

	const arrayLike: any[] = arr; // Needed since TS compiler thinks it knows better
	const result = [];
	for (var i = 0; i < arrayLike.length; ++i)
		result.push(arrayLike[i]);
	return result;
}

/**
 * Funnel all debug/test messages through here, making them easy to turn off in one place
 */
function debugMsg(...messages: any[]) {
	// console.info(messages);	// Uncomment to provide verbose logging from this driver
}