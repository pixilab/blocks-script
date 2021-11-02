/*
 * Created 2017 by Mike Fahl.
 */

import {NetworkUDP} from "system/Network";
import {Driver} from "system_lib/Driver";
import * as Meta from "system_lib/Metadata";

/**
 An example driver using a UDP socket for communicating with WATCHOUT.
*/
@Meta.driver('NetworkUDP', { port: 3040 })
export class WOCustomUdpDrvr extends Driver<NetworkUDP> {
	// IMPORTANT: The class name above MUST match the name of the
	// file (minus its extension).

	private mPlaying = false;	// Most recent state (obtained from WO initially)
	private mStandBy = false;
	private mLevel = 0;			// Numeric state of Output

	private mLayerCond: number;

	/**
	 * Create me, attached to the network socket I communicate through. When using a
	 * driver, the driver replaces the built-in functionality of the network socket
	 with the properties and callable functions exposed.
	 */
	public constructor(private socket: NetworkUDP) {
		super(socket);
	}

	@Meta.property("Layer condition flags")
	@Meta.min(0)
	@Meta.max(65535)
	public set layerCond(cond: number) {
		cond = Math.round(cond);
		if (this.mLayerCond !== cond) {
			this.mLayerCond = cond;
			this.tell("enableLayerCond " + cond);
		}
		// console.info("layerCond", cond)
	}
	public get layerCond(): number {
		return this.mLayerCond || 0;
	}

	/**
	 * Main timeline playback state. Where both a set and get function are provided,
	 * the value can also be set from a button. It is, however, possible to have a
	 * set implementation while still exposing the property as read-only by
	 * setting the second (optional) parameter of the @Meta.property annotation
	 * to true. This is useful for values you may want to set internally, from
	 * within the driver itself, and that should then update UI bound to the property.
	 */
	@Meta.property("Main timeline playing")
	public set playing(play: boolean) {
		this.tell(play ? "run" : "halt");	// Start/stop main timeline
		this.mPlaying = play;
	}
	public get playing() {
		return this.mPlaying;
	}

	/**
	 * Set and get the standBy mode of the cluster.
	 */
	@Meta.property("Standby mode")
	public set standBy(stby: boolean) {
		this.tell(stby ? "standBy true 1000" : "standBy false 1000");
		this.mStandBy = stby;
	}
	public get standBy() {
		return this.mStandBy;
	}

	/**
	 * An input value, that can be bound to a slider. Here the min and max annotations are
	 * also used to specify the acceptable range of the numeric value.
	 */
	@Meta.property("Generic input level")
	@Meta.min(0)
	@Meta.max(1)
	public set input(level: number) {
		const cmd = 'setInput "In1" ' + level;
		console.log("setInput cmd", cmd);
		this.tell(cmd);
		this.mLevel = level;
	}
	public get input() {
		return this.mLevel;
	}

	/**
	 * A function that can be called from a Task, supplying multiple parameters.

	   IMPORTANT: If a callable returns a Promise, any task invoking it will
	   stall until the promise is resolved/rejected.
	 */
	@Meta.callable("Play or stop any auxiliary timeline")
	public playAuxTimeline(
		@Meta.parameter("Name of aux timeline to control") name: string,
		@Meta.parameter("Whether to start the timeline") start: boolean
	) {
		this.tell((start ? "run \"" : "kill \"") + name + '""');
	}

	/**
	 * Tell WATCHOUT something through the  socket. Funnel most commands through here
	 * to also allow them to be logged, which makes testing easier.
	 */
	private tell(data: string) {
		// console.info('tell', data);
		this.socket.sendText(data + '\r');
	}
}
