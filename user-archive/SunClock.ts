/*	A basic "solar event" script, indicating whether we're in a variety of daylight
	"phases" based on the time of day and a specified latitude/longitude.

	IMPORTANT: THis script depends on lib/suncalc. If you enable this script, remember
	to also enable the suncalc library script by moving it from lib_archive to lib.

 	Copyright (c) 2022 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {property} from "system_lib/Metadata"
import {Script, ScriptEnv} from "../system_lib/Script";
import * as SunCalc from "suncalc";

const suncalc: typeof SunCalc = require("lib/suncalc");

export class SunClock extends Script {
	private mLat = 58.41086;	// Linkoping - set latitude & longiture properties to change
	private mLong = 15.62157;

	private readonly momentProps: Dictionary<MomentProp> = {}; // Dynamic properties, keyed by property name
	private waiter: CancelablePromise<any>;	// Delay until next update

	// Names of dynamic properties. These MUST match fields in SunCalc.GetTimesResult
	private static readonly kPropNames = ['sunrise', 'sunset', 'sunsetStart', 'sunriseEnd', 'dawn', 'dusk'];

	// SOme other useful constants
	private static readonly kMinuteMillis = 1000 * 60;
	private static readonly kHourMillis = SunClock.kMinuteMillis * 60;
	private static readonly kDayMillis = SunClock.kHourMillis * 24;

	public constructor(env: ScriptEnv) {
		super(env);
		// Establish my sun-position-based properties
		for (var propName of SunClock.kPropNames)
			this.momentProps[propName] = new MomentProp(this, propName);

		this.updateTimes();
	}

	/**
	 * Read interesting moments, update state of sun-position-based properties,
	 * then wait for next interesting moment, rinse and repeat.
	 */
	private updateTimes() {
		if (this.waiter)	// Cancel any non-terminated wait, since we'll set up a new one
			this.waiter.cancel();

		const now = new Date();
		const moments = suncalc.getTimes(now, this.mLat, this.mLong);
		const nowMillis = now.getTime();
		var timeTilNextInteresting = SunClock.kDayMillis;
		for (var propName of SunClock.kPropNames) {
			const slotDate = ((moments as any)[propName] as Date);
			const momentMillis = slotDate.getTime();
			const timeUntil = momentMillis - nowMillis;
			const momentProp = this.momentProps[propName];
			const withinSlot = timeUntil <= 0 && timeUntil > -SunClock.kMinuteMillis;
			if (momentProp.setState(withinSlot)) {
				this.changed(propName);
				// console.log("Flipped", propName, "inside", withinSlot);
			}
			if (timeUntil > 0)	// In the future - wait for that if nothing else
				timeTilNextInteresting = Math.min(timeTilNextInteresting, timeUntil);
			if (momentProp.getState()) // Is within slot - check again after a minute
				timeTilNextInteresting = Math.min(timeTilNextInteresting, SunClock.kMinuteMillis);
		}
		// Wait at most an hour between checks
		timeTilNextInteresting = Math.min(timeTilNextInteresting, SunClock.kHourMillis);

		// Wait a tad more than timeTilNextInteresting to land firmly within interesting slot
		// console.log("Millis until next interesting", timeTilNextInteresting);
		this.waiter = wait(timeTilNextInteresting + 200);
		this.waiter.then(() => {
			this.waiter = undefined;
			this.updateTimes();
		});
	}

	@property("World location latitude")
	get latitude(): number {
		return this.mLat;
	}
	set latitude(value: number) {
		const news = this.mLat !== value;
		this.mLat = value;
		if (news)
			this.updateTimes();
	}

	@property("World location longitude")
	get longitude(): number {
		return this.mLong;
	}
	set longitude(value: number) {
		const news = this.mLong !== value;
		this.mLong = value;
		if (news)
			this.updateTimes();
	}
}

class MomentProp {
	private propState = false;
	constructor(owner: SunClock, readonly name: string) {
		owner.property(
			name,
			{type: Boolean, readOnly: true},
			() => this.propState
		);
	}

	getState() {
		return this.propState;
	}

	/**
	 * Update the state of this property, returning true if that constituted a change.
	 */
	setState(state: boolean) {
		const news = state !== this.propState;
		this.propState = state;
		return news;
	}
}

export interface Dictionary<TElem> {
	[id: string]: TElem;
}
