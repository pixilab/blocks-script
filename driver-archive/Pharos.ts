/*
	Controls a Pharos lighting controller, calling up named scenes.
	https://www.pharoscontrols.com/products/controllers/

	Scene recall requests are sent to the Pharos over TCP port 3000 as strings
	in the following format (each terminated by a carriage return):

		scenon#
		scenoff#

	where N# is a number 0...kNumScenes-1, like this:

		scenon0
		scenon1
		scenoff12

	Note that the Pharos MUST be configured to receive those strings each
	one explicitly terminated by \r, due to the way the Pharos parses the
	incoming data. See this application note for more details:

	https://dl.pharoscontrols.com/documentation/application_notes/Ethernet_Integration.pdf

 	Copyright (c) 2021 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {driver, property} from "../system_lib/Metadata";
import {Driver} from "../system_lib/Driver";
import {NetworkTCP} from "../system/Network";
import {IndexedProperty} from "../system_lib/ScriptBase";

@driver('NetworkTCP', { port: 3000 })
export class Pharos extends Driver<NetworkTCP> {
	static kNumScenes = 25;
	public readonly scene: IndexedProperty<Scene>;

	constructor(public socket: NetworkTCP) {
		super(socket);
		socket.autoConnect();
		this.scene = this.indexedProperty("scene", Scene);
		for (var pix = 0; pix < Pharos.kNumScenes; ++pix)
			this.scene.push(new Scene(this, pix));
	}
}

/**
 * A single scene, which initially can be off and on (possibly adding
 * intermediate states later)
 */
class Scene {
	private mState = 0;

	constructor(private owner: Pharos, private ix: number) {
	}

	@property("Scene being on (1) or off (0)")
	get state(): number {
		return this.mState;
	}
	set state(value: number) {
		this.mState = value;
		this.owner.socket.sendText("scen" + (this.mState ? 'on' : 'off') + this.ix);
	}
}
