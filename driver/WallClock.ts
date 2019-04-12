/*	A Blocks user script that provides a simple "time of day" clock, published as a string property.

	Copyright (c) 2019 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {Script, ScriptEnv} from "system_lib/Script";
import {property} from "system_lib/Metadata";

// @roleRequired("Spot")
export class WallClock extends Script {
	private mClockTime = "0:00";	// Time, as a string. E.g. "14:45"

	public constructor(env : ScriptEnv) {
		super(env);
		this.updateClock();	// Get us going
	}

	@property("Time of day, as H:MM", true)
	public get currentTime(): string {
		return this.mClockTime;
	}

	public set currentTime(t: string) {
		this.mClockTime = t;
	}

	private updateClock() {
		const time = new Date();
		const hour = time.getHours().toString();
		const min = time.getMinutes();
		this.currentTime = hour + ':' + padTwoDigits(min);

		// Update clock with some regularity
		wait(20*1000).then(()=> this.updateClock());
	}

}

function padTwoDigits(val: string|number): string {
	var result = val.toString();
	if (result.length < 2)
		result = '0' + result;
	return result;
}
