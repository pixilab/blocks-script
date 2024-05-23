/*	A Blocks user script that provides a simple "time of day" clock, published as a string property.
	Also provides date, month year as individual (numeric) properties and a full date in ISO format.

	Copyright (c) 2024 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {Script, ScriptEnv} from "system_lib/Script";
import {min, property} from "system_lib/Metadata";

export class WallClock extends Script {
	private mClockTime = "0:00";	// Time, as a string. E.g. "14:45"
	private mYear = 0;
	private mMonth = 0;	// 1-based month, once set
	private mDate = 0;		// 1-based day of month
	private mFullDate = "";		// ISO date

	public constructor(env : ScriptEnv) {
		super(env);
		// Get us going soon, but avoid firing change notification from constructor
		wait(100).then(() => this.updateClock());
	}

	@property("Time of day, as H:MM", true)
	public get currentTime(): string { return this.mClockTime; }
	public set currentTime(t: string) { this.mClockTime = t; }

	@property("Year; e.g. 2024", true)
	get year(): number { return this.mYear;}
	set year(value: number) { this.mYear = value; }

	@property("Month, 1-based", true)
	get month(): number { return this.mMonth; }
	set month(value: number) { this.mMonth = value; }

	@property("Day of month, 1-based", true)
	get date(): number { return this.mDate; }
	set date(value: number) { this.mDate = value; }

	@property("Full date, in ISO format, e.g. 2024-05-23", true)
	get fullDate(): string { return this.mFullDate; }
	set fullDate(value: string) { this.mFullDate = value; }

	private updateClock() {
		const now = new Date();
		const hour = now.getHours().toString();
		const min = now.getMinutes();
		this.currentTime = hour + ':' + padTwoDigits(min);

		var year= now.getFullYear();
		this.year = year;
		var month = now.getMonth() + 1;
		this.month = month;
		var date = now.getDate();
		this.date = date;

		this.fullDate = year + '-' + padTwoDigits(month) + '-' + padTwoDigits(date)

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
