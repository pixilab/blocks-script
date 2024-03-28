/*	
	A timer with minutes, seconds and tenths. Publishes "minutes", "seconds", "tenths", "time" 
	and "done" as separate properties, for maximum flexibility in displaying the counter value 
	and to know when the time is reached. 
	
	You can also choose to count up instead of down, by starting with startUp() instead of startDown().
	The timer will compensate for any time spent in the script, so that the timer will be as accurate as possible.
	Set the "running" property to true to start the timer, and to false to pause it.

	The script is based on PixiLab's Countdown.ts script, but has been modified to support tenths, count up and to 
	be more accurate.
	
	Script made by 
	Jonas Hjalmarsson, By Jalma AB, Sweden (https://byjalma.se). 
	Petter Feltenstedt, Kalmar Mediespecialist AB, Sweden (http://mediespecialist.se).
	All Rights Reserved.
*/

import { Script, ScriptEnv } from "system_lib/Script";
import { property, callable } from "system_lib/Metadata";

export class UpAndDownTimer extends Script {
	private mMinutes = 0;
	private mSeconds = 0;
	private mTenths = 0;
	private mRunning = true;
	private tickTimer: CancelablePromise<void>;	// Set if we have a timer in flight
	private tickDown: boolean = true;
	private mToMinutes = 0;
	private mToSeconds = 0;
	private mToTenths = 0;
	private mTimerStarted = 0;
	private mCountTicks = 0;

	public constructor(env: ScriptEnv) {
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
	@property("Number of tenths remaining (always 1 digit)")
	public get tenths(): string {
		return this.mTenths.toString();
	}

	@property("Current time as a string in format m:ss.t")
	public get time(): string {
		return this.minutes + ":" + padTwoDigits(this.seconds) + "." + this.tenths;
	}

	@property("Number of ticks")
	public get ticks(): number {
		return this.mCountTicks;
	}
	public set ticks(val: number) {
		this.mCountTicks = val;
	}

	@property("True when the timer is at time done")
	public get done(): boolean {
		if (this.tickDown)
			return this.mMinutes === 0 && this.mSeconds === 0 && this.mTenths === 0;
		else
			return this.mMinutes === this.mToMinutes && this.mSeconds === this.mToSeconds && this.mTenths === this.mToTenths;
	}

	@property("Countdown is running (true) or paused (false)")
	public get running() {
		return this.mRunning;
	}
	public set running(state: boolean) {
		if (this.mRunning !== state) {	// This is news
			console.log("Timer running: " + state);
			this.mRunning = state;
			// set new start time, compensating for ticks already counted
			if (this.mRunning) {
				this.mTimerStarted = Date.now() - this.ticks * 100;
			}
			// console.log("Timer started: " + this.mTimerStarted);
			this.manageTicking(); // Starts/stops timer
		}

	}

	// Return true if clock should run ath this point
	private shouldRunClock(): boolean {
		return this.mRunning && !this.done;
	}

	@callable("Start countdown from specified time")
	public startDown(minutes: number, seconds: number, tenths: number) {
		this.tickDown = true;
		this.mTimerStarted = Date.now();
		this.ticks = 0;
		this.setSeconds(Math.max(0, Math.min(59, Math.round(seconds))));
		this.setMinutes(Math.max(0, Math.min(60, Math.round(minutes))));
		this.setTenths(Math.max(0, Math.min(9, Math.round(tenths))));
		this.changed("done");
		this.running = true;
		this.manageTicking();

		// console.log("Started down", minutes, seconds);
	}

	@callable("Start upcount from specified time")
	public startUp(minutes: number, seconds: number, tenths: number) {
		this.tickDown = false;
		this.mTimerStarted = Date.now();
		this.ticks = 0;
		this.mToMinutes = Math.max(0, Math.min(60, Math.round(minutes)));
		this.mToSeconds = Math.max(0, Math.min(59, Math.round(seconds)));
		this.mToTenths = Math.max(0, Math.min(9, Math.round(tenths)));
		this.setMinutes(0);
		this.setSeconds(0);
		this.setTenths(0);
		this.changed("done");
		this.running = true;
		this.manageTicking();
		// console.log("Started up", minutes, seconds);
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

	// Set my "seconds" value, notifying if this is news
	private setTenths(val: number) {
		if (this.mTenths !== val) {
			this.mTenths = val;
			this.changed("tenths");
			this.changed("time");
		}
		return val;
	}

	// Notify change of "done" state
	private notifyDone(wasDone: boolean): boolean {
		const isDone = this.done;
		if (wasDone !== isDone) {
			if (this.done) {
				console.log("Timer done! " + this.ticks + " ticks")
				console.log(((Date.now() - this.mTimerStarted) / this.ticks) + " ms/tick")
				console.log("total diff: " + (Date.now() - this.mTimerStarted - this.ticks * 100) + "ms")
			}
			this.changed("done");
		}
		return isDone;
	}

	/**
	 * Make sure I have a tick timer. On each tick, count down one second, until
	 * reaches done.
	 */
	private manageTicking() {
		if (this.tickTimer) {
			this.tickTimer.cancel();
			this.tickTimer = undefined;
		}
		if (this.shouldRunClock()) {
			this.tickTimer = wait(this.getWaitTime());
			this.ticks++

			if (this.tickDown)
				this.tickTimer.then(() => this.nextTickDown());
			else
				this.tickTimer.then(() => this.nextTickUp());
		}
	}

	private getWaitTime() {
		let timeNow = Date.now();
		let totalMilliseconds = timeNow - this.mTimerStarted;
		let shouldHaveMilliseconds = this.ticks * 100;
		let timeDiff = totalMilliseconds - shouldHaveMilliseconds;
		timeDiff = Math.min(100, Math.max(0, timeDiff)); // set min/max
		// console.log("timeDiff: " + timeDiff);
		return 100 - timeDiff;
	}

	// Called once per second while clock is running
	private nextTickDown() {
		// console.log("Ticked");
		this.tickTimer = undefined;
		var seconds = this.mSeconds;
		var minutes = this.mMinutes;
		var tenths = this.mTenths;
		if (--tenths === -1) {
			tenths = 9;
			if (--seconds === -1) {
				seconds = 59;
				if (--minutes === -1) {
					seconds = minutes = tenths = 0;	// All done
					// this.notifyDone(true);
				}
			}
			else {
			}
		}
		this.setSeconds(seconds);
		this.setMinutes(minutes);
		this.setTenths(tenths);
		this.notifyDone(false);
		this.manageTicking();	// Set up for next second
	}

	private nextTickUp() {
		// console.log("Ticked");
		this.tickTimer = undefined;
		var seconds = this.mSeconds;
		var minutes = this.mMinutes;
		var tenths = this.mTenths;
		if (++tenths === 10) {
			tenths = 0
			if (++seconds === 60) {
				seconds = 0
				++minutes
			}
		}
		this.setSeconds(seconds);
		this.setMinutes(minutes);
		this.setTenths(tenths);
		this.notifyDone(false);
		this.manageTicking();	// Set up for next second
	}
}

function padTwoDigits(val: string | number): string {
	var result = val.toString();
	if (result.length < 2)
		result = '0' + result;
	return result;
}
