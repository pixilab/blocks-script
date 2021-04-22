/*	Controls a Pharos lighting controller, calling up a number of named scenes.
	https://www.pharoscontrols.com/products/controllers/

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
