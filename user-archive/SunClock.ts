/*	Provides properties corresponding to "astronomical events", such as sunrise and sunset.

	IMPORTANT: This script depends on lib/suncalc. Make sure suncalc.js is installed in
	the lib directory (it can be found in lib-archive if not already installed, so then
	just move it to lib).

 * Copyright (c) 2022 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {callable, parameter, property} from "system_lib/Metadata"
import {Script, ScriptEnv} from "system_lib/Script";
import * as SunCalc from "lib-archive/suncalc";

const suncalc: typeof SunCalc = require("lib/suncalc");

export class SunClock extends Script {
	private mLat = 58.41086;	// Linkoping - set latitude & longiture properties to change
	private mLong = 15.62157;

	private readonly momentProps: Dictionary<SunProp> = {}; // Dynamic properties, keyed by property name
	private waiter: CancelablePromise<any>;	// Delay until next update

	private todaysMoments: SunCalc.GetTimesResult; // Update once per date
	private utcDateWhenCached: number;		// When todaysMoments were last fetched

	private forceUpdateTimer: CancelablePromise<any>;	// To defer forced updates somewhat

	// Names of default properties. These MUST match fields in SunCalc.GetTimesResult
	private static readonly kPropNames = ['sunrise', 'sunset'];

	// Some other useful constants
	static readonly kMinuteMillis = 1000 * 60;
	static readonly kHourMillis = SunClock.kMinuteMillis * 60;
	static readonly kDayMillis = SunClock.kHourMillis * 24;

	public constructor(env: ScriptEnv) {
		super(env);
		// Establish some default "momentary" properties
		for (var propName of SunClock.kPropNames)
			this.momentProps[propName] = new SunProp(this, propName, propName, 0);
		// And one extensive one
		this.momentProps['daylight'] = new SunProp(
			this, 'daylight',
			'sunriseEnd', 0,
			'sunsetStart', 0
		);

		asap(() =>this.forceUpdate());	// Get us going once constructor is done
	}

	@callable("Define a custom sub clock property")
	defineCustom(
		@parameter("Name of this custom property") propName: string,
		@parameter("Event name in suncalc library indicating beginning") startMoment: string,
		@parameter("Time offset added to startMoment time, in minutes", true) startOffset: number,
		@parameter("Event name in suncalc library indicating end", true) endMoment?: string,
		@parameter("Time offset added to endMoment time, in minutes", true) endOffset?: number
	) {
		var existingProp = this.momentProps[propName];
		if (existingProp) {	// Update already existing prop's state
			existingProp.startMoment = startMoment;
			existingProp.startOffset = startOffset;
			existingProp.endMoment = endMoment;
			existingProp.endOffset = endOffset;
		} else {
			this.momentProps[propName] = new SunProp(
				this, propName,
				startMoment, startOffset || 0,
				endMoment, endOffset
			);
		}
		this.forceUpdateSoon();
	}

	/**
	 * Read interesting moments, update state of my SunProps,
	 * then wait for next interesting moment, rinse and repeat.
	 */
	private updateTimes() {
		const now = new Date();

		// Update and cache todaysMoments only when date changed
		const todaysUTCDate = now.getUTCDate();
		if (this.utcDateWhenCached !== todaysUTCDate) {
			this.todaysMoments = suncalc.getTimes(now, this.mLat, this.mLong);
			this.utcDateWhenCached = todaysUTCDate;
		}
		const moments = this.todaysMoments;

		const nowMillis = now.getTime();
		// Limit time between checks to not miss DST switches and such
		let nextWaitTime = SunClock.kMinuteMillis * 30;

		for (var propName in this.momentProps) {
			let nextInteresting = this.momentProps[propName].updateState(nowMillis, moments);
			let untilNextInteresting = nextInteresting - nowMillis;
			if (untilNextInteresting < 0) // Push negative times to next day
				untilNextInteresting += SunClock.kDayMillis;
			nextWaitTime = Math.min(nextWaitTime, untilNextInteresting);
		}

		// console.log("Minutes until next interesting", nextWaitTime / SunClock.kMinuteMillis);

		// Wait a tad more than nextWaitTime to land firmly within slot
		this.waiter = wait(nextWaitTime + 200);
		this.waiter.then(() => {
			this.waiter = undefined;
			this.updateTimes();		// Next update cycle
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
			this.forceUpdateSoon();
	}

	@property("World location longitude")
	get longitude(): number {
		return this.mLong;
	}
	set longitude(value: number) {
		const news = this.mLong !== value;
		this.mLong = value;
		if (news)
			this.forceUpdateSoon();
	}

	/**
	 * Something "drastic" happened, requiring that we dump any cached data and update
	 * things from scratch.
	 */
	private forceUpdate() {
		if (this.waiter) // Cancel any pending wait - updateTimes starts one anew
			this.waiter.cancel();
		if (this.forceUpdateTimer) {
			// Cancel any deferred update - since it's been done now
			this.forceUpdateTimer.cancel();
			this.forceUpdateTimer = undefined;
		}

		this.utcDateWhenCached = undefined;
		this.updateTimes();
	}

	/**
	 * Do a forceUpdate soonish. Deferred to collapse multiple mutations to one update.
	 */
	private forceUpdateSoon() {
		if (this.forceUpdateTimer)
			this.forceUpdateTimer.cancel();
		this.forceUpdateTimer = wait(50);
		this.forceUpdateTimer.then(() => this.forceUpdate());
	}
}

/**
 * Manages one of my properties, whether built-in or custom.
 */
class SunProp {
	private currentlyIn = false;	// True if considered "within" this props time range

	constructor(
		readonly owner: SunClock,
		readonly propName: string,
		public startMoment: string,
		public startOffset: number,		// Minutes
		public endMoment?: string,		// Else ends 1 minute after start
		public endOffset?: number		// Minutes
	) {
		owner.property(
			propName,
			{type: Boolean, readOnly: true},
			() => this.currentlyIn
		);
	}

	getState() {
		return this.currentlyIn;
	}

	/**
	 * Get the time, in milliseconds of momentName today from moments.
	 */
	private static getTimeFor(momentName: string, moments: SunCalc.GetTimesResult) {
		const slot = ((moments as any)[momentName] as Date);
		if (!slot)
			throw "Invalid moment name " + momentName;
		return slot.getTime();
	}

	/**
	 * Get the end time today of this prop, which is either an explicit, named end moment
	 * (with possible offset) or one minute after the starting moment (again with possible
	 * offset).
	 */
	private getEndTime(moments: SunCalc.GetTimesResult) {
		const endMoment = this.endMoment;
		if (endMoment) // Explicit end moment
			return SunProp.getTimeFor(endMoment, moments) + (this.endOffset || 0) * SunClock.kMinuteMillis;
		// Default to time one minute past start moment
		return this.getStartTime(moments) + SunClock.kMinuteMillis;
	}

	private getStartTime(moments: SunCalc.GetTimesResult) {
		return SunProp.getTimeFor(this.startMoment, moments) + this.startOffset * SunClock.kMinuteMillis;
	}

	/**
	 * Update the state of this property, returning the "next interesting time"
	 * for this property - i.e., when it will flip next.
	 */
	updateState(timeNow: number, moments: SunCalc.GetTimesResult): number {
		const startTime = this.getStartTime(moments);
		const endTime = this.getEndTime(moments);
		const within = timeNow >= startTime && timeNow < endTime;

		if (within != this.currentlyIn) {	// This is news
			this.currentlyIn = within;
			this.owner.changed(this.propName);
		}

		// Return next transition time
		return within ? endTime :startTime;
	}
}

export interface Dictionary<TElem> {
	[id: string]: TElem;
}
