/*	Base class for Shelly switch device, implementing common stuff across Gen 1 and Gen 2
	Relay/Input devices.

	IMPORTANT: This is NOT a driver. It's only the common stuff used by both the Gen 1 and
	Gen 2 Shelly drivers. Thus, to use either of those types of Shellt switches, you need both
	ShellySwitch and the appropriate ShellySwitchGen1 or ShellySwitchGen2 (it's OK to install
	both those).

 	Copyright (c) 2023 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {MQTT, NetworkTCP} from "system/Network";
import { Driver } from "system_lib/Driver";
import { driver, property } from "system_lib/Metadata";
import {IndexedProperty} from "../system_lib/ScriptBase";

/**
 * Custom options accepted from Device settings, in JSON format
 */
interface CustomOptions {
	inputs?: number;
	relays?: number;
}

interface IShellySwitch {
	mqtt: MQTT;
	setOnline(online: boolean): void;

}

export abstract class ShellySwitchBase<Relay extends RelayBase, Input extends InputBase> extends Driver<MQTT> {
	private mConnected = false;
	private mOnline = false;

	protected abstract relay: IndexedProperty<Relay>;
	protected abstract input: IndexedProperty<Input>;

	protected constructor(public mqtt: MQTT) {
		super(mqtt);
	}

	protected initialize() {
		const mMaxRelaySwitchCount = 4;	// Largest number of inputs or relays expected

		// Determine how many relays and inptus to expose
		let relayCount = 1;	// Number of output relays to manage
		let inputCount = 1;	// Number of input switches we expect
		const rawOptions = this.mqtt.options;
		if (rawOptions) {	// Override defaults from above using options JSON data
			let options = JSON.parse(rawOptions) as CustomOptions;
			relayCount = Math.max(0, Math.min(mMaxRelaySwitchCount, options.relays || 0))
			inputCount = Math.max(0, Math.min(mMaxRelaySwitchCount, options.inputs || 0))
		}

		// Configure the specified number of relays and inputs
		for (let rix = 0; rix < relayCount; ++rix)
			this.relay.push(this.makeRelay(rix));
		for (let six = 0; six < inputCount; ++six)
			this.input.push(this.makeInput(six));

		this.mqtt.subscribeTopic("online", (sender, message) => {
			// console.log("MQTT got online event", message.fullTopic, message.text);
			this.setOnline(message.text === 'true');
		});
	}


	@property("Connected to broker and device online", true)
	get connected(): boolean {
		return this.mConnected;
	}
	set connected(value: boolean) {
		this.mConnected = value;
	}

	setOnline(online: boolean) {
		if (this.mOnline !== online) {
			this.mOnline = online;
			this.updateConnected();
		}
	}

	/**
	 * Update my connected property's state based on both brooker connection and the
	 * most recent online event.
	 */
	private updateConnected() {
		this.connected = this.mOnline && this.mqtt.connected;
	}

	protected abstract makeRelay(ix: number): Relay;
	protected abstract makeInput(ix: number): Input;
}

export abstract class RelayBase {
	private mEnergized = false;
	private inFeedback = false;	// Set to supress sending of data when setter called only for feedback purpose

	constructor(protected owner: IShellySwitch, protected index: number) {
	}

	/*	Concrete class must call this init method (can't call from base ctor above since
		abstract methods then aren't available
	 */
	protected init() {
		this.owner.mqtt.subscribeTopic(this.feedbackTopic(), (sender, message) => {
			// console.log("MQTT got event", message.fullTopic, message.text);
			this.owner.setOnline(true);	// Implicitly makes me considered online, since I got some data
			const newState = this.parseFeedback(message.text);
			this.inFeedback = true;
			this.on = newState;
			this.inFeedback = false;
		});
	}

	@property("True if output relay is energized")
	get on(): boolean {
		return this.mEnergized;
	}
	set on(value: boolean) {
		this.mEnergized = value;
		if (!this.inFeedback)
			this.sendCommand(value);
	}

	// Send message to topic causing the relay to be energized
	protected abstract sendCommand(energize: boolean): void;

	// Provide the topic to subscribe to for relay feedback
	protected abstract feedbackTopic(): string;

	// Parse feedback, returning the indicated status as true if relay is energized
	protected abstract parseFeedback(feedback: string): boolean;
}

export abstract class InputBase {
	private mActive = false;

	constructor(protected owner: IShellySwitch, protected index: number) {
	}

	/*	Concrete class must call this init method (can't call from base ctor above since
		abstract methods then aren't available
	 */
	protected init() {
		this.owner.mqtt.subscribeTopic(this.feedbackTopic(), (sender, message) => {
			// console.log("MQTT got input", message.fullTopic, message.text);
			this.owner.setOnline(true);	// Implicitly makes me considered online, since I got some data
			this.active = this.parseFeedback(message.text);
		});
	}

	@property("True if input switch is closed", true)
	get active(): boolean {
		return this.mActive;
	}
	set active(value: boolean) {
		this.mActive = value;
	}

	// Provide the topic to subscribe to for input status
	protected abstract feedbackTopic(): string;

	// Parse feedback, returning the indicated status as true if input switch is closed
	protected abstract parseFeedback(feedback: string): boolean;
}
