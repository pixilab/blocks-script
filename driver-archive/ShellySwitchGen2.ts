/*	Blocks MQTT driver for the Shelly range of switches, Gen 2, as documented here:
	https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/Mqtt

	IMPORTANT: In addition to this driver, you must also install ShellySwitchBase.
	For inputs and relay status feedback to work, you must enable the
	"Generic status update over MQTT" setting under Settings/MQTT for the device,
	and also configure the Shelly as appropriate for your MQTT broker.

	Note that older devices may use the "Gen 1" protocol, for which a separate driver is provided.

	The default configuration is to manage four relays and inputs. Other configurations can be specified
	using the Custom Options field in the device's settings, in JSON notation, like this:

	{ "inputs": 1, "relays": 3 }

	Copyright (c) 2023 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {MQTT, NetworkTCP} from "system/Network";
import { Driver } from "system_lib/Driver";
import { driver, property } from "system_lib/Metadata";
import {IndexedProperty} from "../system_lib/ScriptBase";
import {InputBase, RelayBase, ShellySwitchBase} from "./ShellySwitchBase";


@driver('MQTT')
export class ShellySwitchGen2 extends ShellySwitchBase<Relay, Input> {

	protected relay: IndexedProperty<Relay>;
	protected input: IndexedProperty<Input>;

	public constructor(public mqtt: MQTT) {
		super(mqtt);
		this.relay = this.indexedProperty("relay", Relay);
		this.input = this.indexedProperty("input", Input);
		super.initialize();
	}

	protected makeInput(ix: number): Input {
		return new Input(this, ix);
	}

	protected makeRelay(ix: number): Relay {
		return new Relay(this, ix);
	}
}

class Relay extends RelayBase {
	constructor(owner: ShellySwitchGen2, index: number) {
		super(owner, index);
		this.init();
	}

	protected sendCommand(energize: boolean): void {
		this.owner.mqtt.sendText(energize ? "on" : "off", "command/switch:" + this.index);
	}

	protected feedbackTopic(): string {
		return "status/switch:" + this.index;
	}

	protected parseFeedback(feedback: string): boolean {
		const json = JSON.parse(feedback)
		return json.output === true;
	}
}

class Input extends InputBase {
	constructor(owner: ShellySwitchGen2, index: number) {
		super(owner, index);
		this.init();
	}

	protected feedbackTopic(): string {
		return "status/input:" + this.index;
	}

	protected parseFeedback(feedback: string): boolean {
		const json = JSON.parse(feedback)
		return json.state === true;
	}
}
