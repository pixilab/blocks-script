/*	A settable "alarm clock", that exposes an alarm property that is true while the time matches
	what the alarm clock has been set to.

 	Copyright (c) 2020 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {Script, ScriptEnv} from "../system_lib/Script";
import {min, max, property, callable, resource} from "../system_lib/Metadata";

export class AlarmClock extends Script {
	private mMinute = 0;
	private mHour = 0;
	private mAlarm = false;
	private mTime: number = 0;	// most recent getTime from current time

	public constructor(env: ScriptEnv) {
		super(env);
		this.checkAlarmTime();	// Get us going on start-up
	}

	@property("Alarm time, hours") @min(0) @max(23)
	get hour(): number {
		return this.mHour;
	}
	set hour(value: number) {
		this.mHour = value;
	}

	@property("Alarm time, minutes") @min(0) @max(59)
	get minute(): number {
		return this.mMinute;
	}
	set minute(value: number) {
		this.mMinute = value;
	}

	@property("Alarm ringing", true)
	get alarm(): boolean {
		return this.mAlarm;
	}
	set alarm(value: boolean) {
		this.mAlarm = value;
	}

	/**
	 * Return the current local time, in unix time.
	 */
	@resource()
	getTime(unused: object) {
		return this.mTime;
	}

	/**
	 * A function that runs every couple of seconds, sounding the alarm if within specified minute.
	 */
	private checkAlarmTime() {
		wait(9000).then(() => {
			const now = new Date();	// Obtain the current time

			const hours = now.getHours();
			const minutes = now.getMinutes();
			const seconds = now.getSeconds();

			this.mTime = now.getTime();

			// Sound the alarm if time matches what alarm clock is set at
			this.alarm = hours === this.mHour && minutes === this.mMinute;
			this.checkAlarmTime();	// Check again soon
		});
	}
}
