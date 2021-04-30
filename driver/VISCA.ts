/*
	A VISCA PTZ camera driver.
 	Copyright (c) 2021 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.

	On startup, queries the camera for initial status, then tracks
	status internally (i.e., polls device *once* up front and soon after power up).
	The Power state is polled regularly, to detect power down/up state changes, and
	then re-do one full poll after restart to pick up camera posisiton. This also helps
	detecing lost connection (device unplugged) faster.

	Tested with Minrray UV510AS-12-ST-NDI PTZ 12x zoom

 */

import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {driver, parameter, property} from "system_lib/Metadata";
import * as Meta from "../system_lib/Metadata";

// A simple map-like object type
interface Dictionary<TElem> { [id: string]: TElem; }

@driver('NetworkTCP', { port: 1259 })
export class VISCA extends Driver<NetworkTCP> {
	readonly props: Dictionary<Property<any>> = {}; // Keyed by prop name
	readonly informants: Query[] = [];	// All my queries, for initial status poll
	readonly powerQuery: Query;			// Power query, for ongoing polling of this one

	private mReady = false;		// Set once we're considered fully up

	readonly retainedStateProps: Dictionary<boolean> = {}; // Props retained across power off, by name
	private pollStateTimer?: CancelablePromise<any>;

	public constructor(private socket: NetworkTCP) {
		super(socket);
		socket.autoConnect(true);

		this.powerQuery = new Query(
			'PowerQ',
			[0x81, 9, 4, 0],
			this.addProp(new Power(this))
		);
		this.informants.push(this.powerQuery);

		this.informants.push(new Query(
			'AutofocusQ',
			[0x81, 9, 4, 0x38],
			this.addProp(new Autofocus(this))
		));

		this.informants.push(new Query(
			'ZoomQ', [0x81, 9, 4, 0x47],
			this.addProp(new Zoom(this))
		));

		this.informants.push(new Query(
			'FocusQ', [0x81, 9, 4, 0x48],
			this.addProp(new Focus(this))
		));

		this.informants.push(new Query(
			'PanTiltQ', [0x81, 9, 6, 0x12],
			this.addProp(new Pan(this)),
			this.addProp(new Tilt(this))
		));

		// The following ones don't seem queryable
		this.addProp(new PanSpeed(this));
		this.addProp(new TiltSpeed(this));

		// Listen for connection state change
		socket.subscribe('connect', (sender, message) => {
			if (message.type === 'Connection') // Connection state changed
				this.onConnectStateChanged(sender.connected);
		});

		// Allow for pre-connected state too
		if (socket.connected)
			this.onConnectStateChanged(true);

		socket.subscribe('bytesReceived', (sender, message) => {
			this.gotDataFromCam(message.rawData);
		});
		this.init();
	}

	/**
	 * Mark propName as being a property whos state is to be retained across
	 * power cycling.
	 */
	addRetainedStateProp(propName: string) {
		this.retainedStateProps[propName] = true;
	}

	@property("Set once camera considered ready to be controlled", true)
	get ready(): boolean {
		return this.mReady;
	}
	set ready(value: boolean) {
		this.mReady = value;
	}

	/**
	 * Recall a preset by number. Note that this doesn't update
	 * other parameters according to what the preset states,
	 * so those will likely be out of sync.
	 */
	@Meta.callable("Recall memory preset")
	public recallPreset(
		@parameter("Preset to recall; 0...254")
		preset: number
	): void {
		this.send(new RecallPresetCmd(preset));
	}

	/**
	 * Query status, updating properties as results come back. If initialPoll, then poll
	 * all state, else just power. This was considered a reasonable compromise to
	 * alow for some ongoing traffic to detect loss of connection faster, and ti at least
	 * initially bring me reasonably up to date. Querying all state on a more regular
	 * basis was not helpful, and caused all kinds of "tail wags the dog" race conditions,
	 * since some status (e.g., pan/tilt positions) return current position, and not
	 * target position while moving, which then messed with the property's current state
	 * in weird ways.
	 */
	pollState() {
		if (!this.initialPollDone) { // Do them all
			for (var inf of this.informants)
				this.send(inf);
		} else // Power only (see above)
			this.send(this.powerQuery)
	}

	/**
	 * Poll camera state soon. Called when camera connected, powered up, and
	 * possibly other state changes that call for a new, full status poll.
	 */
	pollStateSoon(howSoonMillis = 12000) {
		this.stopPolling();	// No regular polling during startup delay
		if (!this.pollStateTimer) {	// Already armed - ignore
			this.pollStateTimer = wait(howSoonMillis);
			this.pollStateTimer.then(() => {
				this.pollStateTimer = undefined;
				this.init();
			});
		}
	}

	private addProp(prop: Property<any>): Property<any> {
		this.props[prop.name] = prop;
		return prop;
	}

	/**
	 * Return the value of propName.
	 */
	propValue(propName: string): any {
		const prop = this.props[propName];
		return prop.getValue();
	}

	/**
	 * Assuming that propName leads to a numeric property, return its value.
	 */
	propValueNum(propName: string): number {
		return Math.round(this.propValue(propName));
	}

/**
 * The following was initially in a separate class, but merged in here since
 * the two really were closely related. But kept apart a bit in the code according
 * to the original separation.
 *
 * Keep track of instructions to send to the device. Allow for instruction to be
 * superseded by new one with same name. Also keep track of order to send them in,
 * to be equally fair to all. I will send a command when the device is ready.
 * It's considered ready when connected and the previously sent command has
 * been acked/replied or a reasonable time has elapsed.
 */
	private readonly toSend: Dictionary<Instr> = {}; // Keyed by instruction name
	private readonly sendQ: Instr[] = [];	// Order in which to send them

	private fromCam: number[] = [];	// Accumulates data from camera awaiting full package

	private currInstr?: Instr;		// Instruction currently being processed, not yet acked
	private sendTimeout?: CancelablePromise<any>;
	private pollTimer?: CancelablePromise<any>;	// For regular polling
	private initialPollDone?: boolean;	// Set once polling has succeded after poll start

	init() {
		// Query for initial status
		if (this.socket.connected)
			this.poll();
	}

	private onConnectStateChanged(connected: boolean) {
		this.fromCam = [];
		if (connected) 	// Just became connected
			this.poll();
		else
			this.stopPolling();
		// Disconnected is also reflected as power being off, so fire change for that as well
		this.changed(Power.propName);
	}

	/**
	 * End regular polling, e.g. due to device being disconnected.
	 */
	stopPolling() {
		if (this.pollTimer)
			this.pollTimer.cancel();
		this.pollTimer = undefined;
		this.initialPollDone = false;	// Need to re-do full poll on reconnect

		// Clear most property state that may be lost due to power off, and need to be re-queried
		for (var prop in this.props) {
			if (!this.retainedStateProps[prop])
				this.props[prop].reset();
		}
	}

	/**
	 * Initiate comms by sending first poll, and set up for (infrequent)
	 * auto-polling on a regular basis for as long as it remains connected.
	 * Assumes connected when called.
	 */
	private poll() {
		this.pollState();
		if (!this.pollTimer) {
			this.pollTimer = wait(1000 * 60);
			this.pollTimer.then(() => {
				this.pollTimer = undefined;
				if (this.socket.connected)
					this.poll();
			});
		}
	}

	/**
	 * Store instr for transmission to device ASAP. An old, existing, instr
	 * with same name (type) will be replaced by a newer one, assuming the
	 * old one then is no longer relevant to send.
	 */
	send(instr: Instr) {
		// console.log("Requested to send", instr.name);
		const existing = this.toSend[instr.name]; // Existing one of same type?
		if (existing) {
			const qix = this.sendQ.indexOf(existing);
			if (qix >= 0)
				this.sendQ[qix] = instr;
			else // That's wierd - in data but NOT in sendQ
				console.error("sendQ out of whack");
		} else // Not an existing instr - append to queue
			this.sendQ.push(instr);
		this.toSend[instr.name] = instr;
		this.sendNext();
	}

	/**
	 * If allowed to, send any instruction waiting to be sent.
	 */
	private sendNext() {
		if (!this.sendTimeout && this.socket.connected) {
			const toSend = this.sendQ.shift();
			if (toSend) {
				// console.log("Sending instr", toSend.name, bytesToString(toSend.data));
				delete this.toSend[toSend.name];
				this.currInstr = toSend;
				this.socket.sendBytes(toSend.data);
				this.sendTimeout = wait(3000); // How long?
				this.sendTimeout.then(() => {
					// Timed out - clear and proceed with next anyway
					const instr = this.currInstr;
					console.warn("Timed out sending", instr.name, bytesToString(instr.data));
					this.sendTimeout = undefined;
					this.currInstr = undefined;
					this.sendNext();
				});
			}
		}
	}

	/**
	 * The current instruction is finished now. Clear it and proceed sending any
	 * next instr.
	 */
	private instrDone() {
		this.currInstr = undefined;
		this.sendNext();
	}

	/**
	 * Got some more data from camera. Accululate it in fromCam, and call
	 * processDataFromCam once we have what looks like a complete package.
	 */
	private gotDataFromCam(bytes: number[]) {
		this.fromCam = this.fromCam.concat(bytes);
		const len = this.fromCam.length;
		if (len >= 3) {
			const packetEnd = this.fromCam.indexOf(0xff);	// All packets end with ff
			if (packetEnd >= 2) { 	// Seems like something useful
				this.processDataFromCam(this.fromCam.splice(0, packetEnd + 1));
				if (this.sendTimeout) {
					this.sendTimeout.cancel();
					this.sendTimeout = undefined;
				}
				this.instrDone();	// Consider current instr acked/answered
			}
		}

		// Make sure buffer doesn't grow unreasonably large
		const excess = len - 32;
		if (excess > 0) {
			this.fromCam.splice(0, excess);
			console.warn("Discarding excessive data", excess);
		}
	}


	/**
	 * Got a complete packet. May be ack, completion, error or answer to query.
	 */
	private processDataFromCam(packet: number[]) {
		const msg = packet[1];
		switch (msg) {
		case 0x41:	// ACK
			this.instrDone();
			break;
		case 0x51:	// EXECUTED TO COMPLETION
			// Do we need to use this msg at all?
			break;
		case 0x60:	// SYNTAX ERROR
			this.currInstrFailed("SYNTAX ERROR " + packet[2]);
			this.instrDone();
			break;
		case 0x61:	// NOT EXECUTABLE NOW
			this.currInstrFailed("CAN'T EXECUTE");
			this.instrDone();
			break;
		case 0x50:	// Answer to a query
			if (this.currInstr) {
				this.currInstr.handleReply(packet);
				this.instrDone();
				break;
			}
			// Else fallthrough to unexpected data case
		default:
			console.warn("Unexpected data from camera", bytesToString(packet));
			break;
		}
	}

	// Consider initial poll successfully done after this, to then only poll power
	setInitialPollDone() {
		this.initialPollDone = true;
		this.ready = true;	// Also considers me ready for use now
	}

	/**
	 * The current instruction seem to have failed. Report this somehow. Does NOT terminate
	 * the current instruction.
	 */
	currInstrFailed(error: string) {
		const instr = this.currInstr;
		if (instr) {
			// Suppress warning if power turned off
			if (this.propValue(Power.propName))
				instr.reportFailed(error);
		} else
			console.warn("Spurious error from camera", error);
	}
}

/**
 * Given an array of numbers 0...255, return those as a string of bytes,
 * such as "10 22 6F"
 */
function bytesToString(bytes: number[]): string {
	var result = '';
	var hasData = false;
	for (var byte of bytes) {
		if (hasData)
			result += ' ';
		if (byte < 0x10)
			result += '0';	// Make all bytes 2 hex digits
		result += byte.toString(16);
		hasData = true;
	}
	return result;
}

class Instr {
	constructor(
		public readonly name: string,
		public readonly data: number[]
	) {
		data.push(0xff);	// Terminates all instructions
	}

	// Mainly for the benefit of queries - I consider this an error
	handleReply(reply: number[]) {
		this.reportFailed("UNEXPECTED REPLY");
	}

	/**
	 * The current instruction seem to have failed. Report this somehow. Does NOT terminate
	 * the current instruction.
	 */
	reportFailed(error: string) {
		console.warn(
			"Instruction failed; ",
			error,
			this.name,
			bytesToString(this.data)
		);
	}

	/**
	 * Append nibCOunt nibbles of numeric data from value to data, then terminate
	 * it with the 0ff command terminator and return the result.
	 */
	static pushNibs(data: number[], value: number, nibCount= 4): number[] {
		while (nibCount--)
			data.push((value >> nibCount*4) & 0xf);
		return data;
	}
}

class Query extends Instr {
	protected toInform: Property<any>[];	// Inform those once answer arrives

	constructor(
		name: string,
		toSend: number[],
		...toInform: Property<any>[]
	) {
		super(name, toSend);
		this.toInform = toInform;
	}

	/*	Forward to my associated properties, to let them adapt to status query replies.
	 */
	handleReply(reply: number[]) {
		for (var informer of this.toInform)
			informer.inform(reply);
	}

}

class PowerCmd extends Instr {
	constructor(on: boolean) {
		super('Power', [0x81, 1, 4, 0, on ? 2 : 3]);
	}
}

class AutofocusCmd extends Instr {
	constructor(on: boolean) {
		super('Autofocus', [0x81, 1, 4, 0x38, on ? 2 : 3]);
	}
}


// 8x 01 04 47 0p 0q 0r 0s FF
class ZoomCmd extends Instr {
	constructor(value: number) {
		super('Zoom', Instr.pushNibs([0x81, 1, 4, 0x47], Math.round(value)));
	}
}

class FocusCmd extends Instr {
	constructor(value: number) {
		super('Focus', Instr.pushNibs([0x81, 1, 4, 0x48], Math.round(value)));
	}
}

class RecallPresetCmd extends Instr {
	constructor(presetNumber: number) {
		const cmd = [0x81, 1, 4, 0x3f, 2, Math.round(Math.min(254, presetNumber))];
		super('RecallPreset', cmd);
	}
}

// 8x 01 06 03 VV WW 0Y 0Y 0Y 0Y 0Z 0Z 0Z 0Z FF
class PanTiltCmd extends Instr {
	constructor(owner: VISCA) {
		const data = [0x81, 1, 6, 2];
		data.push(owner.propValueNum(PanSpeed.propName));
		data.push(owner.propValueNum(TiltSpeed.propName));
		Instr.pushNibs(data, owner.propValueNum(Pan.propName));
		Instr.pushNibs(data, owner.propValueNum(Tilt.propName));
		super('PanTilt', data);
	}
}

abstract class Property<T> {
	protected state: T | undefined;		// State read back or set, if any

	protected constructor(
		protected owner: VISCA,
		public readonly name: string,
		protected readonly defaultState: T
	) {
	}

	/**
	 * Inform me about the outcome of any query that may concern me.
	 * Must be overriden per property where appropriate.
	 */
	inform(reply: number[]) {
	}

	/**
	 * Reset known state (used when power is lost for some properties that will need to
	 * be re-acquired on power up).
	 */
	reset() {
		const hadState = this.state;
		this.state = undefined;
		if (hadState !== undefined)
			this.owner.changed(this.name);
	}

	/**
	 * Get my current property value.
	 */
	getValue(): T {
		return this.propGS();
	}

	protected propGS(val?: T): T {
		if (val !== undefined) { // Is setter
			const news = val !== this.state;
			this.state = val;		// Consider this set as well right away
			// console.log("Prop Set", news, val);
			if (news)
				this.desiredStateChanged(val);
		}
		var result = this.state;	// First attempt known state (read from device or set)
		if (result === undefined) 	// Nope - assume default state
			result = this.defaultState;
		return result;
	}

	/**
	 * For adjusting my state based on feedback from device. Ignore if undefined.
	 */
	protected gotDeviceState(val: T | undefined): T {
		if (val !== undefined && this.getValue() !== val) {
			this.state = val;
			this.owner.changed(this.name);
			// console.log("Picked up state", this.name, val);
		}
		return val;
	}

	// State changed through setter. Tell device ASAP, if applicable
	protected desiredStateChanged(state: T) {
	}
}

/**
 * A numeric property, such as zoom or pan.
 */
abstract class NumProp extends Property<number> {
	protected constructor(
		owner: VISCA,
		name: string,
		defaultState: number,
		private min: number, private max: number,	// Denormalized min...max values
	) {
		super(owner, name, defaultState);
		owner.property<number>(
			name,
			{
				type: Number,
				description: name,
				min: min,
				max: max
			},
			num => this.propGS(num)
		);
	}

	/**
	 * Collect nibCount nibbles starting from the byte at offs in reply, assemble
	 * to number, and return. Convert 32 bit 2s comp negative number (with MSBit set)
	 * to negative value. Return undefined if out of range for me (occasionally
	 * seen crazy answers from device)
	 */
	protected collectNibs(reply: number[], nibCount: number, offs = 2): number|undefined {
		var result = 0;

		for (var nib = nibCount; nib; --nib)
			result = (result << 4) + (reply[offs++] & 0x0f);

		if (nibCount === 4 && (result & 0x8000)) // Uses 2s compl - make negative
			result = result - 0x10000;

		if (result < this.min || result > this.max) {
			console.warn("Nupermic feedback out of whack", this.name, result);
			result = undefined;
		}
		return result;
	}
}

class Power extends Property<boolean> {
	static readonly propName = "power";

	constructor(owner: VISCA) {
		super(owner, Power.propName, false);
		owner.addRetainedStateProp(Power.propName);
		owner.property<boolean>(
			Power.propName,
			{ type: Boolean },
			val => this.propGS(val)
		);
	}

	protected desiredStateChanged(state: boolean) {
		this.owner.send(new PowerCmd(state));
		if (state) // Just turned on
			this.owner.pollStateSoon();
		else
			this.owner.ready = false;
	}

	/**
	 * Override to NOT consider powered on if not even connected.
	 */
	propGS(val?: boolean): boolean {
		return super.propGS(val) && this.owner.connected;
	}

	inform(reply: number[]) {
		const wasOn = this.getValue();
		if (this.gotDeviceState(reply[2] === 2) && !wasOn)
			this.owner.pollStateSoon();	// Just powered on
	}
}

class Autofocus extends Property<boolean> {
	static readonly propName = "autofocus";

	constructor(owner: VISCA) {
		super(owner, Autofocus.propName, false);
		owner.addRetainedStateProp(Autofocus.propName);
		owner.property<boolean>(
			Autofocus.propName,
			{ type: Boolean },
			val => this.propGS(val)
		);
	}

	protected desiredStateChanged(state: boolean) {
		this.owner.send(new AutofocusCmd(state));
		if (!state) {	// Autofocus turned OFF - apply my current value
			this.owner.send(new FocusCmd(this.owner.propValueNum(Focus.propName)));
			// console.log("Autofocus off - applied focus", this.owner.propValueNum(Focus.propName));
		}
	}

	inform(reply: number[]) {
		this.gotDeviceState(reply[2] === 2);
	}
}

class Zoom extends NumProp {
	// public query = [0x81, 9, 4, 0x47, 0xFF];

	constructor(owner: VISCA) {
		super(owner, "zoom", 0, 0, 0x4000);
	}

	protected desiredStateChanged(value: number) {
		this.owner.send(new ZoomCmd(value));
	}

	// Interpret zoom query [0x81, 9, 4, 0x47, 0xFF] response y0 50 0p 0q 0r 0s FF
	inform(reply: number[]) {
		this.gotDeviceState(this.collectNibs(reply, 4));
	}
}

class Focus extends NumProp {
	static readonly propName = "focus";

	constructor(owner: VISCA) {
		super(owner, Focus.propName, 0, 0, 2788);
	}

	// Send new value, except in autofocus mode, where this is done once autofocus is disabled
	protected desiredStateChanged(value: number) {
		if (!this.owner.propValue(Autofocus.propName)) // Ignore calue chane in autofocus mode
			this.owner.send(new FocusCmd(value));
	}

	// Interpret zoom query [0x81, 9, 4, 0x47, 0xFF] response y0 50 0p 0q 0r 0s FF
	inform(reply: number[]) {
		this.gotDeviceState(this.collectNibs(reply, 4));
	}
}

class Pan extends NumProp {
	static readonly propName = "pan";

	constructor(owner: VISCA) {
		super(owner, Pan.propName, 0, -2448, 2448);
	}

	protected desiredStateChanged(value: number) {
		this.owner.send(new PanTiltCmd(this.owner));
	}


	// Interpret 'PanTiltQ', [0x81, 9, 6, 0x12, 0xFF] response y0 50 0p 0p 0p 0p 0t 0t 0t 0t FF
	inform(reply: number[]) {
		this.gotDeviceState(this.collectNibs(reply, 4));
	}

}

class Tilt extends NumProp {
	static readonly propName = "tilt";

	constructor(owner: VISCA) {
		super(owner, Tilt.propName, 0, -356, 1296);
	}

	protected desiredStateChanged(value: number) {
		this.owner.send(new PanTiltCmd(this.owner));
	}

	// Interpret 'PanTiltQ', [0x81, 9, 6, 0x12, 0xFF] response y0 50 0p 0p 0p 0p 0t 0t 0t 0t FF
	inform(reply: number[]) {
		const state = this.collectNibs(reply, 4, 6);
		// console.log("Tilt inform 3", state);
		if (state !== undefined) {
			this.gotDeviceState(state);
			this.owner.setInitialPollDone();	// Consider complete poll done successfully now
		}
	}
}

class PanSpeed extends NumProp {
	static readonly propName = "panSpeed";

	constructor(owner: VISCA) {
		super(owner, PanSpeed.propName, 24, 1, 24);
		owner.addRetainedStateProp(PanSpeed.propName);
	}
}


class TiltSpeed extends NumProp {
	static readonly propName = "tiltSpeed";

	constructor(owner: VISCA) {
		super(owner, TiltSpeed.propName, 24, 1, 20);
		owner.addRetainedStateProp(TiltSpeed.propName);
	}
}
