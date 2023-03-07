/*	Blocks MQTT driver for the Shelly range of switches:
	https://www.shelly.cloud/en-se/products/switching-and-triggering
	The default configuration is to manage a single relay and input. Other configurations can be specified
	using the Custom Options field in the device's settings, in JSON notation, like this:

	{ "inputs": 1,
	  "relays": 3 }

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

@driver('MQTT')
export class ShellySwitch extends Driver<MQTT> {
	private mConnected = false;
	private mOnline = false;

	relay: IndexedProperty<Relay>;	// Treat those as indexed to manage multi-relay Shellys
	input: IndexedProperty<Input>;	// Treat those as indexed to manage multi-relay Shellys

	public constructor(public mqtt: MQTT) {
		super(mqtt);
		let kRelayCount = 1;	// Number of output relays to manage
		let kInputCount = 1;	// Number of input switches we expect
		const mMaxRelaySwitchCount = 4;	// Largest number of inputs or relays expected

		if (mqtt.options) {
			let options = JSON.parse(mqtt.options) as CustomOptions;
			kRelayCount = Math.max(1, Math.min(mMaxRelaySwitchCount, options.relays || 1))
			kInputCount = Math.max(1, Math.min(mMaxRelaySwitchCount, options.inputs || 1))
		}

		this.relay = this.indexedProperty("relay", Relay);
		for (let rix = 0; rix < kRelayCount; ++rix)
			this.relay.push(new Relay(this, rix));

		this.input = this.indexedProperty("input", Input);
		for (let six = 0; six < kInputCount; ++six)
			this.input.push(new Input(this, six));

		mqtt.subscribeTopic("online", (sender, message) => {
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
}

class Relay {
	private mEnergized = false;
	private inFeedback = false;	// Set to supress sending of data when setter called only for feedback purpose

	constructor(private owner: ShellySwitch, index: number) {
		owner.mqtt.subscribeTopic("relay/" + index, (sender, message) => {
			// console.log("MQTT got event", message.fullTopic, message.text);
			owner.setOnline(true);	// Implicitly makes me considered online, since I got some data
			this.inFeedback = true;
			this.energize = message.text === 'on';
			this.inFeedback = false;
		});
	}

	@property("True if output relay is energized")
	get energize(): boolean {
		return this.mEnergized;
	}
	set energize(value: boolean) {
		this.mEnergized = value;
		if (!this.inFeedback)
			this.owner.mqtt.sendText(value ? "on" : "off", "relay/0/command");
	}
}

class Input {
	private mActive = false;

	constructor(owner: ShellySwitch, index: number) {
		owner.mqtt.subscribeTopic("input/" + index, (sender, message) => {
			// console.log("MQTT got input", message.fullTopic, message.text);
			owner.setOnline(true);	// Implicitly makes me considered online, since I got some data
			this.active = message.text === '1';
		});
	}

	@property("True if input switch is closed", true)
	get active(): boolean {
		return this.mActive;
	}
	set active(value: boolean) {
		this.mActive = value;
	}
}
