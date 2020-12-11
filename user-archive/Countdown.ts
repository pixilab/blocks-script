/*	A simple countdown timer, with minutes and seconds. Publishes "minutes" and "seconds" as separate properties,
	for maximum flexibility in displaying the counter value. Also publishes a "zero" property that's
	true while the timer is as time 0:00, and can be useful to start whatever is to happen at this time.

 	Copyright (c) 2020 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {Script, ScriptEnv} from "system_lib/Script";
import {property, callable} from "system_lib/Metadata";

export class Countdown extends Script {
	private mMinutes = 0;
	private mSeconds = 0;
	private mRunning = true;
	private tickTimer: CancelablePromise<void>;	// Set if we have a timer in flight

	public constructor(env : ScriptEnv) {
		super(env);

		// Ensure timer is cancelled if script is disposed
		env.subscribe('finish', () => {
			if (this.tickTimer)
				this.tickTimer.cancel();
			// console.log("Finished");
		});
	}

	@property("Number of minutes remaining (always 2 digits)")
	public get minutes(): string {
		return padTwoDigits(this.mMinutes);
	}

	@property("Number of seconds remaining (always 2 digits)")
	public get seconds(): string {
		return padTwoDigits(this.mSeconds);
	}

	@property("True when the timer is at time zero")
	public get zero(): boolean {
		return this.mMinutes === 0 && this.mSeconds === 0;
	}

	@property("Countdown is running (true) or paused (false)")
	public get running() {
		return this.mRunning;
	}
	public set running(state: boolean) {
		if (this.mRunning !== state) {	// This is news
			this.mRunning = state;
			this.manageTicking();		// Starts/stops timer
		}
	}

	// Return true if clock should run ath this point
	private shouldRunClock(): boolean {
		return this.mRunning && !this.zero;
	}

	@callable("Start countdown from specified time")
	public start(minutes: number, seconds: number) {
		const wasZero = this.zero;
		this.setSeconds(Math.max(0, Math.min(59, Math.round(seconds))));
		this.setMinutes(Math.max(0, Math.min(60, Math.round(minutes))));
		this.notifyZero(wasZero);
		this.manageTicking();
		// console.log("Started at", minutes, seconds);
	}


	// Set my "minutes" value, notifying if this is news
	private setMinutes(val: number) {
		if (this.mMinutes !== val) {	// Was indeed a change
			this.mMinutes = val;
			this.changed("minutes");	// Let others know
		}
		return val;
	}

	// Set my "seconds" value, notifying if this is news
	private setSeconds(val: number) {
		if (this.mSeconds !== val) {
			this.mSeconds = val;
			this.changed("seconds");
		}
		return val;
	}

	// Notify change of "zero" state
	private notifyZero(wasZero: boolean): boolean {
		const isZero = this.zero;
		if (wasZero !== isZero)
			this.changed("zero");
		return isZero;
	}

	/**
	 * Make sure I have a tick timer. On each tick, count down one second, until
	 * reaches zero.
	 */
	private manageTicking() {
		if (this.tickTimer) {
			this.tickTimer.cancel();
			this.tickTimer = undefined;
		}
		if (this.shouldRunClock()) {
			this.tickTimer = wait(1000);
			this.tickTimer.then(() => this.nextTick());
		}
	}

  	// Called once per second while clock is running
	private nextTick() {
		// console.log("Ticked");
		this.tickTimer = undefined;
		var seconds = this.mSeconds;
		var minutes = this.mMinutes;
		if (--seconds === -1) {
			if (--minutes === -1)
				seconds = minutes = 0;	// All done
			else
				seconds = 59;
		}
		this.setSeconds(seconds);
		this.setMinutes(minutes);
		this.notifyZero(false);
		this.manageTicking();	// Set up for next second
	}
}

function padTwoDigits(val: string|number): string {
	var result = val.toString();
	if (result.length < 2)
		result = '0' + result;
	return result;
}
