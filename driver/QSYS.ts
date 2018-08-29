/*
 * Copyright (c) 2018 Mika Raunio <mika@imagemaker.fi>. Licensed under the MIT License.
 */
import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import * as Meta from "system_lib/Metadata";
const split:any = require("lib/split-string");

/**
 This driver talks to a QSC Q-Sys core via TCP using the Q-SYS External Control
 Protocol.

 Protocol spec info at:
 http://q-syshelp.qschome.com/Content/External_Control/Q-SYS_External_Control/007_Q-SYS_External_Control_Protocol.htm#Metadata_Controls

 Q-SYS controls names must be hard-coded below (at START CONFIGURATION),
 and (for now) getters and setters must be manually created.

 The driver exposes control positions (normalised 0.00-1.00 values) as Blocks
 property values.

 String and vector controls are not yet supported.
 */

interface Dictionary<T> {
	[K: string]: T;
}

interface QSYSControl {
	internalName: string;
	controlName: string;
}

interface Prop {
	controlName: string;
	value: number;
}

@Meta.driver('NetworkTCP', { port: 1702 })
export class QSYS extends Driver<NetworkTCP> {

	/**** START CONFIGURATION ****/

	/**
	 Define the Q-SYS Named Controls you wish to expose as Blocks properties here.

	 internalName is the Blocks property id and must be a valid TypeScript variable name.
	 controlName is the Named Control name in the Q-SYS design.

	 Define the user-visible property descriptions in the setters' @Meta.property decorators.
	 */

	private controls: Array<QSYSControl> = [
		{internalName: 'tap1Gain', controlName: 'tap1gain'},
		{internalName: 'masterGain', controlName: 'mastergain'}
	]

	/* Then, for each property, define a getter and a setter */

	// tap1Gain
	@Meta.property("Tap 1 Gain")
	@Meta.min(0)
	@Meta.max(1)
	public set tap1Gain(val: number) { this.propSetter('tap1Gain', val); }
	public get tap1Gain() { return this.propGetter('tap1Gain'); }

	// masterGain
	@Meta.property("Master Gain")
	@Meta.min(0)
	@Meta.max(1)
	public set masterGain(val: number) { this.propSetter('masterGain', val); }
	public get masterGain() { return this.propGetter('masterGain'); }

	/**** END CONFIGURATION ****/

	private mConnected = false; // Connected to Q-SYS
	private props: Dictionary<Prop> = {};
	private controlToProp: Dictionary<string> = {};

	private statusPoller: CancelablePromise<void>; // Keep-alive poller
	private asFeedback = false;

	/**
	 Create me, attached to the network socket I communicate through. When using a
	 driver, the driver replaces the built-in functionality of the network socket
	 with the properties and callable functions exposed.
	 */
	public constructor(private socket: NetworkTCP) {
		super(socket);

		// Init properties, and map control names to properties, for processing incoming messages
		for (const { controlName, internalName } of this.controls) {
			this.props[internalName] = {
				controlName: controlName,
				value: 0
			};
			this.controlToProp[controlName] = internalName;
		}

		// Connect
		socket.subscribe('connect', (sender, message)=> {
			console.info('connect msg', message.type);
			this.connectStateChanged();
		});
		socket.subscribe('textReceived', (sender, msg)=>
			this.textReceived(msg.text)
		);
		socket.autoConnect(); // Use automatic connection mechanism
		this.mConnected = socket.connected; // May already be connected
		if (this.mConnected)
			this.setupConnection(); // If so, get status right away
		this.keepAlive();
	}

	/* Connection status */
	@Meta.property("Connected to Q-SYS", true)
	public set connected(online: boolean) {
		this.mConnected = online;
		// console.info("Connection state", online)
	}
	public get connected(): boolean {
		return this.mConnected;
	}

	/* setter/getter helpers */

	private propSetter(internalName: string, val: number) {
		const prop: Prop = this.props[internalName];
		if (!this.asFeedback)
			this.tell('csp "' + prop.controlName + '" ' + val);
		prop.value = val;
	}

	private propGetter(internalName: string) {
		return this.props[internalName].value;
	}

	/** CALLABLE FUNCTIONS

	 Note that when functions are called from blocks, the Q-SYS Named Control Id
	 must be used as Control ID, not the Blocks property name.
	 */

	/* Control Set Position */
	@Meta.callable("Control Set Position")
	public controlSetPosition(
		@Meta.parameter("Control ID") id: string,
		@Meta.parameter("Control Position") position: number
	) {
		this.tell('csp "' + id + '" ' + position);
	}

	/* Control Set Position Ramp */
	@Meta.callable("Control Set Position Ramp")
	public controlSetPositionRamp(
		@Meta.parameter("Control ID") id: string,
		@Meta.parameter("Control Position") position: number,
		@Meta.parameter("Ramp time") rampTime: number
	) {
		this.tell('cspr "' + id + '" ' + position + ' ' + rampTime);
	}

	/* Control Set Position Vector NOT IMPLEMENTED */
	/* Control Set Position Vector Ramp NOT IMPLEMENTED */

	/* Control Set String */
	@Meta.callable("Control Set String")
	public controlSetString(
		@Meta.parameter("Control ID") id: string,
		@Meta.parameter("Control String") cString: string
	) {
		// TODO Escape quotes in sent strings
		this.tell('css "' + id + '" "' + cString + '"');
	}

	/* Control Set String Vector NOT IMPLEMENTED */

	/* Control Set Value */
	@Meta.callable("Control Set Value")
	public controlSetValue(
		@Meta.parameter("Control ID") id: string,
		@Meta.parameter("Control Value") value: number
	) {
		this.tell('csv "' + id + '" ' + value);
	}

	/* Control Set Value Ramp */
	@Meta.callable("Control Set Value Ramp")
	public controlSetValueRamp(
		@Meta.parameter("Control ID") id: string,
		@Meta.parameter("Control Value") value: number,
		@Meta.parameter("Ramp time") rampTime: number
	) {
		this.tell('csvr "' + id + '" ' + value + ' ' + rampTime);
	}

	/* Control Set Value Vector NOT IMPLEMENTED */
	/* Control Set Value Vector Ramp NOT IMPLEMENTED */

	/* Control Trigger */
	@Meta.callable("Control Trigger")
	public controlTrigger(
		@Meta.parameter("Control ID") id: string
	) {
		this.tell('ct "' + id + '"');
	}

	/* Snapshot Load NOT IMPLEMENTED */
	/* Snapshot Save NOT IMPLEMENTED */

	/**
	 Connection state changed. If became connected, setup the connection. Called
	 as a result of the 'connect' subscription done in the constructor.
	 */
	private connectStateChanged() {
		console.info("connectStateChanged", this.socket.connected);
		this.connected = this.socket.connected; // Propagate state to clients
		if (this.socket.connected)
			this.setupConnection();
	}

	/**
	 Q-SYS auto-closes sockets after 60s of inactivity. Poll status every
	 19s to avoid this.
	 */
	private keepAlive() {
		this.statusPoller = wait(19 * 1000);
		this.statusPoller.then(() => {
			if (this.connected)
				this.tell("sg"); // Send Status Get
			this.keepAlive(); // Keep polling
		});
	}

	/** Login and subsribe to changes as I wake up.
	 */
	private setupConnection() {
		/**
		 Login if necessary. Note: if login is required and wrong credentials
		 are supplied, the Q-SYS system will send "login_failed" and close
		 the socket.
		 */
		// this.tell("login NAME PIN");

		// Create a Change Group to subscribe to control changes
		this.tell('cgc 1');

		// Add controls to the Change Group
		for (const { controlName } of this.controls)
			this.tell('cga 1 "' + controlName + '"');

		// Schedule Change Group notifications with a minimum interval of 50ms
		this.tell('cgsna 1 50');
	}

	/**
	 Tell Q-SYS something through the TCP socket. Funnel most commands through
	 here to also allow them to be logged, which makes testing easier.
	 */
	private tell(data: string) {
		//console.info('tell', data);
		this.socket.sendText(data + "\n");
	}

	/**
	 Define Q-SYS reply parser:
	 Use "split-string" to split reply on spaces, keeping quoted (") strings
	 intact, unless the quote is escaped with \.
	 Then strip unescaped quotes from the resulting pieces.
	 */
	private parseReply(reply: string) : string {
		let keep = (value, state) => {
			return value !== '\\' && (value !== '"' || state.prev() === '\\');
		};
		return split(reply, { quotes: ['"'], separator: ' ', keep: keep });
	}

	/*Got data from Q-SYS. Parse reply. */
	private textReceived(text: string) {
		//console.info("textReceived", text);
		const pieces = this.parseReply(text);
		if (pieces && pieces.length >= 1) {
			const cmd = pieces[0];
			if (cmd === "cv") {
				// Control Value received, use CONTROL_POSITION to set property
				const id = pieces[1];
				this.asFeedback = true;
				this[this.controlToProp[id]] = parseFloat(pieces[4]);
				this.asFeedback = false;
			} else if (cmd === "cmv" || cmd === "cmvv" || cmd === "cvv") {
				// Not handled yet
			} else if (cmd === "sr" || cmd === "cgpa" || cmd === "login_success") {
				// Ack received, ignore
			} else if (
				cmd === "cro" || // core_read_only
				cmd === "core_not_active" ||
				cmd === "bad_change_group_handle" ||
				cmd === "bad_command" ||
				cmd === "bad_id" ||
				cmd === "login_failed" ||
				cmd === "login_required" ||
				cmd === "too_many_change_groups") {
				// Reply indicates device or command error, notify
				console.warn("Received error", text);
			} else {
				console.warn("Unknown response from device", text);
			}
		} else
			console.warn("Unparsable reply from device", text);
	}
}
