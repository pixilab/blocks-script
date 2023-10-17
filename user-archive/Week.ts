/*	A Blocks user script that provides properties for
	- current week number
	- current week number is even
	- current weekday by name
	with the intention to use them as triggers or conditions in task programming.

	Current week is according to the ISO-8601 standardweeks starting on Monday.
	The first week of the year is the week that contains that year's first Thursday (='First 4-day week').
	The highest week number in a year is either 52 or 53.
	ISO 8601 is not the only week numbering system in the world, other systems use weeks starting on Sunday (US) or Saturday (Islamic).

	Copyright (c) 2023 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {Script, ScriptEnv} from "system_lib/Script";
import {property} from "system_lib/Metadata";

export class Week extends Script {
	private mWeek = 0;	// Invalid week number (but valid number), making it trigger when first set
    private mWeekIsEven = false;
	private mDayName = "";

	public constructor(env : ScriptEnv) {
		super(env);
		// Get us going soon, but avoid firing change notification from constructor
		wait(100).then(() => this.update());
	}

	@property("Current ISO8601 week number as number", true)
	public get weekNumber(): number {
		return this.mWeek;
	}
	public set weekNumber(t: number) {
		this.mWeek = t;
	}

	@property("Current day as string", true)
	public get weekDay(): string {
		return this.mDayName;
	}
	public set weekDay(t: string) {
		this.mDayName = t;
	}

    @property("Current ISO8601 week is even", true)
	public get evenWeekNumber(): boolean {
		return this.mWeekIsEven;
	}
	public set evenWeekNumber(t: boolean) {
		this.mWeekIsEven = t;
	}

	/**
	 * Update my properties, initially and then just past next midnight.
	 */
	private update() {
		//To test with any date rather than current set at date in the date constructor i.e:
		//let dt = new Date(2023,0,1);
		//for 1st of Jan 2023;
        let now: Date = new Date();
		let week = this.iso8601WeekNumber(now);
		if (week !== this.mWeek) {
			this.weekNumber = week;
			this.evenWeekNumber = (week % 2 == 0)
		}
		this.weekDay = this.dayNameAsString(now);

		// Update again soon after next midnight
		const nowUnixTime = now.valueOf();
		var midnight = new Date(nowUnixTime);
		midnight.setHours(24, 0, 0, 100)
		const msTillMidnight = midnight.valueOf() - now.valueOf();
		wait(msTillMidnight).then(()=> this.update());
 	}

	/**
	 * Get the weekday name of date, as its three character abbreviation.
	 */
	private dayNameAsString(date:Date) {
		const daysInWeek = ["Sun","Mon","Tue", "Wed", "Thu", "Fri", "Sat"];
		const dayIx = date.getDay();
		return daysInWeek[dayIx];
	}

	/**
	 * Get the ISO 8601 week number of date.
	 */
	private iso8601WeekNumber(date:Date) {
		//Inspired by example from w3resource.com
        let tdt = new Date(date.valueOf());
        let dayn = (date.getDay() + 6) % 7;
        tdt.setDate(tdt.getDate() - dayn + 3);
        let firstThursday = tdt.valueOf();
        tdt.setMonth(0, 1);
        if (tdt.getDay() !== 4)
        	tdt.setMonth(0, 1 + ((4 - tdt.getDay()) + 7) % 7);
        return 1 + Math.ceil((firstThursday - tdt.valueOf()) / 604800000);
    }
}
