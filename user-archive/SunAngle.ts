/*	Provides normalized sun altitude and azimuth properties.

	IMPORTANT: This script depends on lib/suncalc. Make sure suncalc.js is installed in
	the lib directory (it can be found in lib-archive if not already installed, so then
	just move it to lib).

 * Copyright (c) 2022 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import { property} from "system_lib/Metadata"
import {Script, ScriptEnv} from "system_lib/Script";
import * as SunCalc from "suncalc";

const suncalc: typeof SunCalc = require("lib/suncalc");

export class SunAngle extends Script {
	private mLat = 58.41086;	// Linkoping - set latitude & longiture properties to change
	private mLong = 15.62157;

	private mAltitude: number;
	private mAzimuth: number;

	static readonly kMinuteMillis = 1000 * 60;

	public constructor(env: ScriptEnv) {
		super(env);
		asap(() =>this.update());	// Get us going once constructor is done
	}

	/**
	 * Read interesting moments, update state of my SunProps,
	 * then wait for next interesting moment, rinse and repeat.
	 */
	private update() {
		const pos = suncalc.getPosition(new Date(), this.mLat, this.mLong);

		this.altitude = pos.altitude / (Math.PI / 2); // 1 is sun straight up
		this.azimuth = pos.azimuth / (Math.PI * 3/4); // 1 is northeast and 0 is south

		// Run next update cycle in a bit
		wait(SunAngle.kMinuteMillis).then(() => this.update());
	}

	@property("World location latitude")
	get latitude(): number {
		return this.mLat;
	}
	set latitude(value: number) {
		this.mLat = value;	// May want to force an update on change, but will happen soon enough anyway
	}

	@property("World location longitude")
	get longitude(): number {
		return this.mLong;
	}
	set longitude(value: number) {
		this.mLong = value;
	}

	@property("Normalized sun altitude", true)
	get altitude(): number {
		return this.mAltitude;
	}
	set altitude(value: number) {
		this.mAltitude = value;
	}

	@property("Normalized sun azimuth", true)
	get azimuth(): number {
		return this.mAzimuth;
	}
	set azimuth(value: number) {
		this.mAzimuth = value;
	}
}
