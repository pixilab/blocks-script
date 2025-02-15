/*	VISCA PTZ camera driver.

 	Copyright (c) 2021 PIXILAB Technologies AB, Sweden (http://pixilab.se).
 	All Rights Reserved.

	On startup, queries the camera for initial status, then tracks
	status internally (i.e., polls device *once* up front and soon after power up).
	The Power state is polled regularly, to detect power down/up state changes, and
	then re-do one full poll after restart to pick up camera posisiton. This also helps
	detecing lost connection (device unplugged) faster.

	Tested with Minrray UV510AS-12-ST-NDI PTZ 12x zoom
 */

import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {driver, parameter, property, callable, min, max} from "system_lib/Metadata";

// A simple map-like object type
interface Dictionary<TElem> {
	[id: string]: TElem;
}

@driver('NetworkTCP', {port: 1259})
export class VISCA extends Driver<NetworkTCP> {
	readonly props: Dictionary<Property<any>> = {}; // Keyed by prop name
	readonly informants: Query[] = [];	// All my queries, for initial status poll
	readonly powerQuery: Query;			// Power query, for ongoing polling of this one

	private mReady = false;		// Set once we're considered fully up

	readonly retainedStateProps: Dictionary<boolean> = {}; // Props retained across power off, by name
	private pollStateTimer?: CancelablePromise<any>;
	private secondAckTimer?: CancelablePromise<any>;		// Make sure we wait 200 milliseconds after the second ACK, before sending a new command. The camera would miss behave otherwise
	private moveDirection: string; 		// 'Up', 'Left', 'DownRight', etc... for incremental moves
	readonly joystick: Joystick;
	public zoomVal: number;			// Slide value for the Adjust Zoom property
	public focusVal: number;		// Slide value for the Focus Zoom property

	private lastRecalledPreset: number = 0;	// Last RECALLED preset, 1-based, 0 indicates NONE
	private lastStoredPreset: number = 0;	// Last STORED preset, 1-based, 0 indicates NONE
	private lastStoredPresetTimeout: CancelablePromise<any>;

	public constructor(private socket: NetworkTCP) {
		super(socket);
		socket.autoConnect(true);
		this.joystick = new Joystick;

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

		this.addProp(new AdjustPan(this));
		this.addProp(new AdjustTilt(this));
		this.addProp(new AdjustZoom(this));
		this.addProp(new AdjustFocus(this));

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

		// Stop any cyclic activity if socket discarded (e.g., driver disabled)
		socket.subscribe('finish', () => {
			this.stopPolling();
			if (this.pollStateTimer) {	// Initial state polling too
				this.pollStateTimer.cancel();
				this.pollStateTimer = undefined;
			}
		});
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
	 * Callable to recall a preset by number.
	 * DEPRECATED - use the 'preset' property below instead.
	 */
	@callable("DEPRECATED - use preset property instead. Recall memory preset (0-based)")
	public recallPreset(
		@parameter("Preset to recall; 0...254")
		preset: number
	): void {
		this.preset = preset + 1;	// Property is 1-based, while I'm zero based
	}

	/**
	 * Property flavor for recalling preset by 1-based number. Note that
	 * this doesn't update other parameters according to what the preset states,
	 * so those will likely be out of sync.
	 */
	@min(1) @max(64)
	@property("Recall preset (1-based)")
	get preset(): number {
		return this.lastRecalledPreset;
	}
	set preset(pres: number) {
		this.lastRecalledPreset = pres;
		if (pres > 0)
			this.send(new RecallPresetCmd(pres-1));
	}

	/**
	 * Somewhat strange property for storing preset. You can set this to a 1-based number
	 * to store a preset under that number. This property value will only remain set
	 * for a brief time, so this is a somewhat "momentary" property. This allows you
	 * to change the camera position and then store it into the same preset again,
	 * which would be a bit strange if this property retained its last store preset
	 * number indefinitely.
	 */
	@min(1) @max(64)
	@property("Store preset (1-based)")
	get storePreset(): number {
		return this.lastStoredPreset;
	}
	set storePreset(pres: number) {
		this.lastStoredPreset = pres;
		if (pres > 0) {
			this.send(new StorePresetCmd(pres - 1));
			// Revert back to 0 after timeout, to allow storing the same preset again
			if (this.lastStoredPresetTimeout)
				this.lastStoredPresetTimeout.cancel();
			this.lastStoredPresetTimeout = wait(900);
			this.lastStoredPresetTimeout.then(() => {
				this.lastStoredPresetTimeout = undefined;
				this.lastStoredPreset = 0;
				this.changed('lastStoredPreset');
			});
		}
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

	getMoveDirection(): string {
		return this.moveDirection;
	}

	setJoystickPanAxis(val: number) {
		this.joystick.setPanAxis(val);
		this.calculateDirection();
	}

	setJoystickTiltAxis(val: number) {
		this.joystick.setTiltAxis(val);
		this.calculateDirection();
	}

	changeZoom(val: number) {
		this.zoomVal = val;
		this.send(new AdjustZoomCmd(this))
	}

	changeFocus(val: number) {
		this.focusVal = val;
		this.send(new AdjustFocusCmd(this))
	}

	calculateDirection() {
		if (this.joystick.getPanAxis() === 0 && this.joystick.getTiltAxis() === 0) {              // Only stop if the coords are not 0,0
			if (this.moveDirection !== "Stop") {
				this.moveDirection = "Stop";
				this.send(new MoveDirectionCmd(this));
			}
		} else {
			let jX = this.joystick.getPanAxis()
			let jY = this.joystick.getTiltAxis()

			let degrees = calculateAngle(jX, jY);
			let quantizedAngle = quantizeAngle(degrees);
			let newDirection = angleToDirection(quantizedAngle);	 // Direction to go

			this.moveDirection = newDirection;
			this.send(new MoveDirectionCmd(this));
		}
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
		if (this.socket.connected && this.socket.enabled)
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
		if (this.socket.enabled) {	// Only if we're enabled
			this.pollState();
			if (!this.pollTimer) {
				this.pollTimer = wait(10000 * 60);
				this.pollTimer.then(() => {
					this.pollTimer = undefined;
					if (this.socket.connected)
						this.poll();
				});
			}
		}
	}

	/**
	 * Store instr for transmission to device ASAP. An old, existing, instr
	 * with same name (type) will be replaced by a newer one, assuming the
	 * old one then is no longer relevant to send.
	 */
	send(instr: Instr) {
		//console.log("Requested to send", instr.name, " ", this.sendQ.length);
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
		if (this.sendTimeout) {
			this.sendTimeout.cancel();
			this.sendTimeout = undefined;
		}
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

				// Now we only consider the instr done when second acked
				/*if (this.sendTimeout) {
					this.sendTimeout.cancel();
					console.log("Canceled timeout")
					this.sendTimeout = undefined;
				}*/
				//this.instrDone();	// Consider current instr acked/answered
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
			//this.instrDone();
			break;
		case 0x51:	// EXECUTED TO COMPLETION
			this.secondAckTimer = wait(200);
			this.secondAckTimer.then(() => this.instrDone())		// make sure we wait 200 milliseconds before considering the action done in case of a 51 ack. camera would miss behave otherwise
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
	static pushNibs(data: number[], value: number, nibCount = 4): number[] {
		while (nibCount--)
			data.push((value >> nibCount * 4) & 0xf);
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

class StorePresetCmd extends Instr {
	constructor(presetNumber: number) {
		const cmd = [0x81, 1, 4, 0x3f, 1, Math.round(Math.min(254, presetNumber))];
		super('RecallPreset', cmd);
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

// 8x 01 06 03 VV WW ...
class MoveDirectionCmd extends Instr {
	constructor(owner: VISCA) {
		const directions: Record<string, number[]> = {
			"Right": [0x02, 0x03, 0xFF],
			"UpRight": [0x02, 0x01, 0xFF],
			"Up": [0x03, 0x01, 0xFF],
			"UpLeft": [0x01, 0x01, 0xFF],
			"Left": [0x01, 0x03, 0xFF],
			"DownLeft": [0x01, 0x02, 0xFF],
			"Down": [0x03, 0x02, 0xFF],
			"DownRight": [0x02, 0x02, 0xFF],
			"Stop": [0x03, 0x03, 0xFF]
		};

		let direction = owner.getMoveDirection();
		let directionData = directions[direction];
		let speedsHex = speedsToHexArray([owner.joystick.getPanSpeed(), owner.joystick.getTiltSpeed()])		// gets the speed (0-24) to number[] like [0x0A, 0x0C]

		let data = [0x81, 0x01, 0x06, 0x01];
		data = data.concat(speedsHex)
		data = data.concat(directionData)			// Adds the data regarding the direction of movement

		super("DirectionCmd", data);
	}
}

// 8x 01 04 07 2p FF // 8x 01 04 07 3p FF
class AdjustZoomCmd extends Instr {
	constructor(owner: VISCA) {
		let numberHex: number;

		if (owner.zoomVal === 0) {
			numberHex = 0x00
		} else {
			if (owner.zoomVal < 0)
				numberHex = mapNumber("Wide", Math.abs(owner.zoomVal))
			else
				numberHex = mapNumber("Tele", Math.abs(owner.zoomVal))
		}

		let data = [0x81, 0x01, 0x04, 0x07];
		data.push(numberHex)
		data.push(0xFF)			// Adds FF needed for the packet command

		super("AdjustZoomCmd", data);
	}
}

// 8x 01 04 07 2p FF // 8x 01 04 07 3p FF
class AdjustFocusCmd extends Instr {
	constructor(owner: VISCA) {
		let numberHex: number;

		if (owner.focusVal === 0) {
			numberHex = 0x00
		} else {
			if (owner.focusVal < 0)
				numberHex = mapNumber("Far", Math.abs(owner.focusVal))
			else
				numberHex = mapNumber("Near", Math.abs(owner.focusVal))
		}

		let data = [0x81, 0x01, 0x04, 0x08];
		data.push(numberHex)
		data.push(0xFF)			// Adds FF needed for the packet command

		super("AdjustFocusCmd", data);
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
	protected collectNibs(reply: number[], nibCount: number, offs = 2): number | undefined {
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
			{type: Boolean},
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
			{type: Boolean},
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

class AdjustPan extends NumProp {
	static readonly propName = "adjustPan";

	constructor(owner: VISCA) {
		super(owner, AdjustPan.propName, 0, -1, 1);
		owner.addRetainedStateProp(AdjustPan.propName);
	}

	protected desiredStateChanged(value: number) {
		this.owner.setJoystickPanAxis(value);
	}
}

class AdjustTilt extends NumProp {
	static readonly propName = "adjustTilt";

	constructor(owner: VISCA) {
		super(owner, AdjustTilt.propName, 0, -1, 1);
		owner.addRetainedStateProp(AdjustTilt.propName);
	}

	protected desiredStateChanged(value: number) {
		this.owner.setJoystickTiltAxis(value);
	}
}

class AdjustZoom extends NumProp {
	static readonly propName = "adjustZoom";

	constructor(owner: VISCA) {
		super(owner, AdjustZoom.propName, 0, -1, 1);
		owner.addRetainedStateProp(AdjustZoom.propName);
	}

	protected desiredStateChanged(value: number) {
		this.owner.changeZoom(value);
	}
}

class AdjustFocus extends NumProp {
	static readonly propName = "adjustFocus";

	constructor(owner: VISCA) {
		super(owner, AdjustFocus.propName, 0, -1, 1);
		owner.addRetainedStateProp(AdjustFocus.propName);
	}

	protected desiredStateChanged(value: number) {
		this.owner.changeFocus(value);
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

/**
 * Relevant for Incremental Movement controls.
 * Class to manage joystick related actions, mapping the values (x,y) it gets from a joystick block, and automatically calculating
 * the speed vlaue for the pan and tilt, for the incremental movement.
 */
class Joystick {
	private panAxis: number;			// Pan value in the axis for the joystick controller
	private panSpeed: number;			// Speed we will change the pan value (based on the axis value)

	private tiltAxis: number			// Tilt value in the axis for the joystick controller
	private tiltSpeed: number; 			// Speed we will change the tilt value (based on the axis value)

	constructor() {
		this.panAxis = 0;
		this.panSpeed = 0;

		this.tiltAxis = 0;
		this.tiltSpeed = 0;
	}

	public getPanAxis(): number {
		return this.panAxis;
	}

	public setPanAxis(newVal: number) {
		this.panAxis = newVal;
		this.panSpeed = mapAbsoluteValue(newVal, [1, 24])		// update the pan speed

	}

	public getTiltAxis(): number {
		return this.tiltAxis;
	}

	public setTiltAxis(newVal: number) {
		this.tiltAxis = newVal;
		this.tiltSpeed = mapAbsoluteValue(newVal, [1, 20])		// update the tilt speed
	}

	public getPanSpeed(): number {
		return this.panSpeed;
	}

	public getTiltSpeed(): number {
		return this.tiltSpeed;
	}
}

function calculateAngle(x: number, y: number): number {
	if (x < -1 || x > 1 || y < -1 || y > 1) {
		throw new Error("X and Y values must be between -1 and 1.");
	}
	const radians = Math.atan2(y, x); // Get angle in radians
	let degrees = radians * (180 / Math.PI); // Convert to degrees
	if (degrees < 0) {
		degrees += 360; // Normalize to 0-360 degrees
	}
	// Reverse direction to make angles clockwise
	degrees = (360 - degrees) % 360;
	return degrees;
}

/**
 * Quantize the angle to 45 degrees increments
 */
function quantizeAngle(angle: number): number {
	const quantized = Math.round(angle / 45) * 45; // Round to the nearest multiple of 45
	return quantized % 360; // Ensure the result is within [0...360]
}

/**
 * Receives an angles (multiple of 45 degrees) and returns the corrspondent direction
 * @param angle a certain angles
 * @returns returns the direction of the angle provided
 */
function angleToDirection(angle: number): string {
	const directions: Record<number, string> = {
		0: "Right",
		45: "UpRight",
		90: "Up",
		135: "UpLeft",
		180: "Left",
		225: "DownLeft",
		270: "Down",
		315: "DownRight"
	};

	return directions[angle];
}

/**
 * Makes a number[] with the speed values in hex
 * @param num1 A certain speed value (number)
 * @param num2 A certain speed value (number)
 * @returns a number[] of both speed values in hex
 */
function speedsToHexArray([num1, num2]: [number, number]): number[] {
	let hexVal1 = `0x${num1.toString(16).toUpperCase()}`
	let hexVal2 = `0x${num2.toString(16).toUpperCase()}`

	return [parseInt(hexVal1), parseInt(hexVal2)];
}


/**
 * Maps a value from the range [-1, 1] (absolute) to a specified range.
 * @param value The input value (between -1 and 1).
 * @param range The target range as [min, max].
 * @returns The proportional mapped value within the range, or 0 if the input value is 0.
 */
function mapAbsoluteValue(value: number, range: [number, number]): number {
	const [min, max] = range;
	const absoluteValue = Math.abs(value);		// Take the absolute value of the input
	const mappedValue = absoluteValue * (max - min) + min;		// Map the absolute value (0 to 1) to the target range

	return Math.round(mappedValue);		// Ensure the result is an integer
}


function mapNumber<T extends 'Wide' | 'Tele' | 'Near' | 'Far'>(type: T, input: number): number {
	// Ensure input is between 0 and 1
	if (input < 0 || input > 1) {
		throw new Error('Input must be between 0 and 1');
	}

	// Map the input to a range between 0 and 7
	const mappedNumber = Math.round(input * 7);

	// Determine the base value (0x2 or 0x3) based on the type
	let baseValue: number;
	if (type === 'Wide' || type === 'Near') {
		baseValue = 0x3;
	} else
		baseValue = 0x2;

	// Return the combined value
	return (baseValue << 4) | mappedNumber; // Shift the base value by 4 bits and combine with mappedNumber
}
