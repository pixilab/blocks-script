/* 	Exposes a configurable number of timers. Each timer can have its own start value
	and direction (up or down), can be started/stopped and reset to its initial
	value, or some arbitrary value (by setting its 'time' property from outside).

	IMPORTANT: You MUST configure the timers provided by this script using a Task that
	calls addTimer with the desired settings for each timer you need. To make sure this
	configuration task is performed in case the server is restarted, set its Trigger to
	'Server Startup"

 	Copyright (c) 2024 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {Script, ScriptEnv} from "system_lib/Script";
import {AggregateElem, IndexedProperty} from "system_lib/ScriptBase";
import {callable, parameter, property} from "system_lib/Metadata";

export class MultiTimer extends Script {
	timer: IndexedProperty<Timer>;

	public constructor(scriptFacade: ScriptEnv) {
		super(scriptFacade);
		this.timer = this.indexedProperty('timer', Timer);
	}

	@callable("Append one more timer to my list")
	public addTimer(
		@parameter("Creates a countdown timer if true.") countBackwards: boolean,
		@parameter("Milliseconds. Must be > 0 for a countdown timer.", true) startTime?: number
	) {
		if (countBackwards && startTime <= 0)
			throw "startTime must be > 0 when running countBackwards";
		if (!startTime || startTime < 0)
			startTime = 0;	// Default start time when counting up
		this.timer.push(new Timer(countBackwards, startTime));
	}

	@callable("Removes all timers, letting you start over with new addTimer calls")
	public clear() {
		for (var ix = 0; ix < this.timer.length; ++ix)
			this.timer[ix].discard();	// Tell him he's going away
		this.timer.remove(0, this.timer.length);
	}
}

/**
 * Each individual timer, with its settings and properties.
 */
class Timer extends AggregateElem {
	private readonly runRate: number;	// Rate of time flow while running

	// Property backing stores:
	private mTime: TimeFlow;		// My current time
	private mRun = false;	// Time is running
	private mReset = false; // Stop and reset timer to initial value

	private stopTimer: CancelablePromise<any>;  // To stop countdown once at 0

	constructor(
		backwards: boolean, // Time runs bacwards
		private startTimeMs = 0	// Starting time (must be > 0 when backwards
	) {
		super();
		this.runRate = backwards ? -1 : 1;
		this.mTime = new TimeFlow(startTimeMs, 0)
	}

	@property("Timer count backwards")
	get countdown() {
		return this.runRate < 0;
	}

	@property("Set momentarily to reset the time to initial value")
	get reset(): boolean { return this.mReset; }
	set reset(value: boolean) {
		this.run = false;	// Implicitly stops timer
		this.mReset = value;
		if (value)
			this.time = new TimeFlow(this.startTimeMs, 0);
	}

	@property("The current time position")
	get time(): TimeFlow { return this.mTime; }
	set time(value: TimeFlow) {
		if (!value.rate && this.mRun) // Timeflow not running
			this.run = false; // Neither should I
		this.mTime = value;
	}

	@property("Time is runnung (vs paused)")
	get run(): boolean { return this.mRun; }
	set run(doRun: boolean) {
		if (this.mRun !== doRun) { // This is news
			const currTime = this.mTime.currentTime;
			if (doRun) {	// Start to run
				if (this.runRate < 0) {	// To run backwards
					// Ignore request to run timer if countdown and already at 0
					if (currTime <= 0)
						throw "Timer already at zero";
					if (this.runRate < 0) { // Running backwards - make sure stops at 0
						this.stopStopTimer();
						this.stopTimer = wait(currTime);
						this.stopTimer.then(() => {  // Stop at 0 exactly
							this.run = false;
							this.time = new TimeFlow(0, 0);
						});
					}
				}
			} else	// Stop running
				this.stopStopTimer();

			/*	Here I assign to the backing store and fires a change notification
				manually rather then assigning though the setter (which automatically
				fires a change notification when required). I do so both to show how
				this works but also to avoid an infinite recursion shere since
				the time setter calls me (through this.run = x) in some cases.
			 */
			this.mTime = new TimeFlow(currTime, doRun ? this.runRate : 0);
			this.changed('time');
			this.mRun = doRun;
		}
	}

	/**
	 * Stop any stopTimer I may have running,
	 */
	private stopStopTimer() {
		if (this.stopTimer) {
			this.stopTimer.cancel();
			this.stopTimer = undefined;
		}
	}

	/**
	 * This timer is going away. Do any cleanup required.
	 */
	discard() {
		this.stopStopTimer();
	}
}
