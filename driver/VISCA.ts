/*
	A VISCA PTZ camera driver. On startup, queries the camera for initial status, then tracks
	status internally (i.e., polls device *once* up front and soon after power up).

	Tested with Minrray UV510AS-12-ST-NDI PTZ 12x zoom

 	Copyright (c) 2021 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {driver} from "system_lib/Metadata";

// A simple map-like object type
interface Dictionary<TElem> { [id: string]: TElem; }

@driver('NetworkTCP', { port: 1259 })
export class VISCA extends Driver<NetworkTCP> {
	readonly props: Dictionary<Property<any>> = {}; // Keyed by prop name
	readonly informants: Query[] = [];
	readonly commander: Commander;

	private pollStateTimer?: CancelablePromise<any>;

	public constructor(socket: NetworkTCP) {
		super(socket);
		// console.log("VISCA initialized");
		this.commander = new Commander(socket);
		socket.autoConnect();

		this.informants.push(new Query(
			'PowerQ',
			[0x81, 9, 4, 0],
			this.addProp(new Power(this))
		));

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

		this.addProp(new PanSpeed(this));
		this.addProp(new TiltSpeed(this));

		// Query all informants of initial status
		this.pollState();
	}

	/**
	 * Query all my informants, updating property state as results come back.
	 */
	private pollState() {
		for (var inf of this.informants)
			this.commander.send(inf);
	}

	/**
	 * Poll camera state soon. Called when camer powered up, and possibly other
	 * state changes that call for a new status poll.
	 */
	pollStateSoon(howSoonMillis = 8000) {
		if (!this.pollStateTimer) {	// Already armed - ignore
			this.pollStateTimer = wait(howSoonMillis);
			this.pollStateTimer.then(() => {
				this.pollStateTimer = undefined;
				this.pollState();
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
}

/**
 * Keep track of instructions to send to the device. Allow for instruction to be
 * superseded by new one with same name. Also keep track of order to send them in,
 * to be equally fair to all. I will send a command when the device is ready.
 * It's considered ready when connected and the previously sent command has
 * been acked/replied or a reasonable time has elapsed.
 */
class Commander {
	private readonly toSend: Dictionary<Instr> = {}; // Keyed by instruction name
	private readonly sendQ: Instr[] = [];	// Order in which to send them

	private fromCam: number[] = [];	// Accumulates data from camera awaiting full package

	private currInstr?: Instr;		// Instruction currently being processed, not yet acked
	private sendTimeout?: CancelablePromise<any>;

	constructor(private socket: NetworkTCP) {
		socket.autoConnect(true);
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
	}

	onConnectStateChanged(connected: boolean) {
		this.fromCam = [];
		if (connected)
			this.sendNext();
	}

	/**
	 * Store instr for transmission to device ASAP. An old, existing, instr
	 * with same name (type) will be replaced by a newer one, assuming the
	 * old one then is no longer relevant to send.
	 */
	send(instr: Instr) {
		// console.log("Requested to send instr", instr.name, bytesToString(instr.data));
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
		// console.log("Got from cam", bytesToString(bytes));
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

	/**
	 * The current instruction seem to have failed. Report this somehow. Does NOT terminate
	 * the current instruction.
	 */
	currInstrFailed(error: string) {
		const instr = this.currInstr;
		if (instr)
			instr.reportFailed(error);
		else
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
		// console.log("Reply", bytesToString(reply));
		for (var informer of this.toInform) {
			// console.log("Informing", informer.name);
			informer.inform(reply);
		}
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
	protected state: T | undefined;		// State read back from device, if any
	protected wanted: T | undefined;	// Most recently set/desired state

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
	 * Get my current property value.
	 */
	getValue(): T {
		return this.propGS();
	}

	protected propGS(val?: T): T {
		if (val !== undefined) { // Is setter
			const news = val !== this.wanted;
			this.wanted = val;
			this.state = val;		// Consider this set as well right away
			if (news)
				this.desiredStateChanged(val);
		}
		var result = this.state;	// First attempt known state (read from device or set)
		if (result === undefined) 	// Next attempt wanted state (set)
			result = this.wanted;
		if (result === undefined) 	// Neither - fallback to default state
			result = this.defaultState;
		return result;
	}

	/**
	 * For adjusting my state based on feedback from device.
	 */
	protected setState(val: T): T {
		if (this.getValue() !== val) {
			this.state = val;
			this.owner.changed(this.name);
			// console.log("Picked up state", this.name, val);
		}
		return val;
	}

	// Send me to device ASAP
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
	 * Override to log value set for testing purposes.
	 */
	protected setState(val: number) {
		// console.log("Set state", this.name, "to", val);
		return super.setState(val);
	}

	/**
	 * Collect nibCount nibbles starting from the byte at offs in reply, assemble
	 * to number, and return. Convert 32 bit 2s comp negative number (with MSBit set)
	 * to negative value.
	 */
	static collectNibs(reply: number[], nibCount: number, offs = 2): number {
		var result = 0;

		for (var nib = nibCount; nib; --nib)
			result = (result << 4) + (reply[offs++] & 0x0f);

		if (nibCount === 4 && (result & 0x8000)) // Uses 2s compl - make negative
			result = result - 0x10000;

		return result;
	}
}

class Power extends Property<boolean> {
	// readonly query = [0x81, 9, 4, 0, 0xFF];

	constructor(owner: VISCA) {
		super(owner, "power", false);
		owner.property<boolean>(
			"power",
			{ type: Boolean },
			val => this.propGS(val)
		);
	}

	protected desiredStateChanged(state: boolean) {
		this.owner.commander.send(new PowerCmd(state));
		if (state)
			this.owner.pollStateSoon();
	}

	inform(reply: number[]) {
		this.setState(reply[2] === 2);
	}
}

class Autofocus extends Property<boolean> {
	static readonly propName = "autofocus";

	constructor(owner: VISCA) {
		super(owner, Autofocus.propName, false);
		owner.property<boolean>(
			Autofocus.propName,
			{ type: Boolean },
			val => this.propGS(val)
		);
	}

	protected desiredStateChanged(state: boolean) {
		this.owner.commander.send(new AutofocusCmd(state));
		if (!state) {	// Autofocus turned OFF - apply my current value
			this.owner.commander.send(new FocusCmd(this.owner.propValueNum(Focus.propName)));
			// console.log("Autofocus off - applied focus", this.owner.propValueNum(Focus.propName));
		}
	}

	inform(reply: number[]) {
		this.setState(reply[2] === 2);
	}
}

class Zoom extends NumProp {
	// public query = [0x81, 9, 4, 0x47, 0xFF];

	constructor(owner: VISCA) {
		super(owner, "zoom", 0, 0, 0x4000);
	}

	protected desiredStateChanged(value: number) {
		this.owner.commander.send(new ZoomCmd(value));
	}

	// Interpret zoom query [0x81, 9, 4, 0x47, 0xFF] response y0 50 0p 0q 0r 0s FF
	inform(reply: number[]) {
		this.setState(NumProp.collectNibs(reply, 4));
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
			this.owner.commander.send(new FocusCmd(value));
	}

	// Interpret zoom query [0x81, 9, 4, 0x47, 0xFF] response y0 50 0p 0q 0r 0s FF
	inform(reply: number[]) {
		this.setState(NumProp.collectNibs(reply, 4));
	}
}

class Pan extends NumProp {
	static readonly propName = "pan";

	constructor(owner: VISCA) {
		super(owner, Pan.propName, 0, -2448, 2448);
	}

	protected desiredStateChanged(value: number) {
		this.owner.commander.send(new PanTiltCmd(this.owner));
	}


	// Interpret 'PanTiltQ', [0x81, 9, 6, 0x12, 0xFF] response y0 50 0p 0p 0p 0p 0t 0t 0t 0t FF
	inform(reply: number[]) {
		this.setState(NumProp.collectNibs(reply, 4));
	}

}

class Tilt extends NumProp {
	static readonly propName = "tilt";

	constructor(owner: VISCA) {
		super(owner, Tilt.propName, 0, -356, 1296);
	}

	protected desiredStateChanged(value: number) {
		this.owner.commander.send(new PanTiltCmd(this.owner));
	}

	// Interpret 'PanTiltQ', [0x81, 9, 6, 0x12, 0xFF] response y0 50 0p 0p 0p 0p 0t 0t 0t 0t FF
	inform(reply: number[]) {
		const state = NumProp.collectNibs(reply, 4, 6);
		// console.log("Tilt inform 3", state);
		this.setState(state);
	}
}

class PanSpeed extends NumProp {
	static readonly propName = "panSpeed";

	constructor(owner: VISCA) {
		super(owner, PanSpeed.propName, 24, 1, 24);
	}
}


class TiltSpeed extends NumProp {
	static readonly propName = "tiltSpeed";

	constructor(owner: VISCA) {
		super(owner, TiltSpeed.propName, 24, 1, 20);
	}
}
