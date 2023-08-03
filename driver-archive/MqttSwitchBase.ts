/*	Base class for MQTT switch device (i.e., contact closure or digital I/O).

	IMPORTANT: This is NOT a driver. It's only a base class ued by drivers such as Shelly Gen 1 and
	Gen 2 drivers, and possibly other similar devices. This script file is required if you install any
	driver that uses it, such as the ShellySwitchGen1, ShellySwitchGen2 or possibly others in the future.

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
	outputs?: number;
}

interface MqttIODevice {
	mqtt: MQTT;
	setOnline(online: boolean): void;
}

export abstract class MqttSwitchBase<Output extends OutputBase, Input extends InputBase> extends Driver<MQTT> {
	private mConnected = false;
	private mOnline = false;

	protected readonly abstract output: IndexedProperty<Output>;	// Outputs (generally a dry contact relay)
	protected readonly abstract input: IndexedProperty<Input>;

	protected constructor(public mqtt: MQTT) {
		super(mqtt);
	}

	/**
	 * Rest of initialization goes here rather than in ctor, since the most derived ctor
	 * must finish its work before doing these things.
	 */
	protected initialize() {
		const kMaxIOCount = 32;	// Some reasonable upper limit to I/O pins

		// Determine how many outputs and inputs to expose, with reasonable default values
		let outputCount = 4;	// Number of outputs (relays) to manage
		let inputCount = 4;	// Number of inputs (switches) we expect
		const rawOptions = this.mqtt.options;
		if (rawOptions) {	// Override defaults from above using options JSON data
			let options = JSON.parse(rawOptions) as CustomOptions;
			outputCount = Math.max(0, Math.min(kMaxIOCount, options.outputs || 0))
			inputCount = Math.max(0, Math.min(kMaxIOCount, options.inputs || 0))
		}

		// Configure the specified number of outputs and inputs
		for (let rix = 0; rix < outputCount; ++rix)
			this.output.push(this.makeOutput(rix));
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

	protected abstract makeOutput(ix: number): Output;
	protected abstract makeInput(ix: number): Input;
}

export abstract class OutputBase {
	private active = false;
	private inFeedback = false; // Supresses sending data when setter called only for feedback

	protected constructor(
		protected owner: MqttIODevice,
		protected index: number
	) {
		// NOTE: Subclass MUST call init below after calling super constructor
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

	@property("True if output is active")
	get on(): boolean {
		return this.active;
	}
	set on(value: boolean) {
		this.active = value;
		if (!this.inFeedback)
			this.sendCommand(value);
	}

	// Send message to topic causing the output to activate
	protected abstract sendCommand(activate: boolean): void;

	// Provide the topic to subscribe to for output feedback
	protected abstract feedbackTopic(): string;

	// Parse feedback, returning the indicated status as true if output is activated
	protected abstract parseFeedback(feedback: string): boolean;
}

export abstract class InputBase {
	private mActive = false;

	protected constructor(protected owner: MqttIODevice, protected index: number) {
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
