/*	Blocks MQTT driver for the Shelly range of switches, Gen 1, as documented here:
	https://shelly-api-docs.shelly.cloud/gen1/#shelly-family-overview

	IMPORTANT: In addition to this driver, you must also install ShellySwitchBase.
	You must configuring the Shelly device as appropriate for your MQTT broker.
	MQTT settings are found under Internet & Security / Advanced Developer Settings.

	Note that newer devices may use the "Gen 2" protocol, for which a separate driver is provided.
	The default configuration is to manage four relays and inputs. Other configurations can be specified
	using the Custom Options field in the device's settings, in JSON notation, like this:

	{ "inputs": 1, "outputs": 3 }

	Copyright (c) 2023 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {MQTT, NetworkTCP} from "system/Network";
import { Driver } from "system_lib/Driver";
import { driver, property } from "system_lib/Metadata";
import {IndexedProperty} from "../system_lib/ScriptBase";
import {InputBase, OutputBase, MqttSwitchBase} from "./MqttSwitchBase";

/**
 * Custom options accepted from Device settings, in JSON format
 */
interface CustomOptions {
	inputs?: number;
	relays?: number;
}

@driver('MQTT')
export class ShellySwitchGen1 extends MqttSwitchBase<Output, Input> {

	protected readonly output: IndexedProperty<Output>;
	protected readonly input: IndexedProperty<Input>;

	public constructor(public mqtt: MQTT) {
		super(mqtt);
		this.output = this.indexedProperty("output", Output);
		this.input = this.indexedProperty("input", Input);
		super.initialize();
	}

	protected makeInput(ix: number): Input {
		return new Input(this, ix);
	}

	protected makeOutput(ix: number): Output {
		return new Output(this, ix);
	}
}

class Output extends OutputBase {
	constructor(owner: ShellySwitchGen1, index: number) {
		super(owner, index);
		this.init();
	}

	protected sendCommand(energize: boolean): void {
		this.owner.mqtt.sendText(energize ? "on" : "off", "relay/" + this.index + "/command");
	}

	protected feedbackTopic(): string {
		return "relay/" + this.index;
	}

	protected parseFeedback(feedback: string): boolean {
		return feedback === 'on';
	}
}

class Input extends InputBase {
	constructor(owner: ShellySwitchGen1, index: number) {
		super(owner, index);
		this.init();
	}

	protected feedbackTopic(): string {
		return "input/" + this.index;
	}

	protected parseFeedback(feedback: string): boolean {
		return feedback === '1';
	}
}
