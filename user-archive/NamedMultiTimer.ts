/* 	Exposes a configurable number of timers addressed by name (named aggregate). Each timer can have its own start value
	and direction (up or down), can be started/stopped, change direction and reset to its initial
	value, or some arbitrary value (by setting its 'time' property from outside).

	IMPORTANT: You MUST configure the timers provided by this script using a Task that
	calls addTimer with the desired settings for each timer you need. To make sure this
	configuration task is performed in case the server is restarted, set its Trigger to
	'Server Startup"

 	Copyright (c) 2025 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
	version 1.0.0 initial release
 */

import {Script, ScriptEnv} from "system_lib/Script";
import {AggregateElem} from "system_lib/ScriptBase";
import {callable, parameter, property} from "system_lib/Metadata";

interface Dictionary<TElem> { [id: string]: TElem; }

export class NamedMultiTimer extends Script {
	
	private readonly timers: Dictionary<Timer>;
	public constructor(scriptFacade: ScriptEnv) {
		super(scriptFacade);
		this.timers = this.namedAggregateProperty('timers', Timer);
	}

	@callable("Append a new timer to 'timers'")
	addTimer(
		@parameter("Name of the timer.") name: string,
		@parameter("Initial direction Defaults to false for count up.",true) countBackwards: boolean | false,
		@parameter("Initial time in milliseconds as number, timeflow or string (hh:mm:ss). Must be > 0 for a countdown timer.", true) startTime?: number
	) {
		if (this.timers[name] !== undefined)
			this.timers[name].discard(); // Remove any existing timer with this name
			
			
		if (typeof startTime === 'string') // Also accept time-formatted string
			startTime = TimeFlow.stringToMillis(startTime);
		if (countBackwards && (!startTime || startTime <= 0))
			throw "startTime must be > 0 when running countBackwards";
		if (!startTime || startTime < 0)
			startTime = 0;	// Default start time
		this.timers[name]= new Timer(name, countBackwards, startTime);
	}

	@callable("Reinit script")
	reinit() {
		this.reInitialize();
	}
}


/**
 * Each individual timer, with its settings and properties.
 */
class Timer extends AggregateElem {
	private runRate: number;	// Rate of time flow while running

	// Property backing stores:
	private mTime: TimeFlow;		// My current time
	private mRun = false;	// Time is running
	private mReset = false; // Stop and reset timer to initial value

	private stopTimer: CancelablePromise<any>;  // To stop countdown once at 0

	constructor(
		private name: string,
		backwards: boolean, // Time runs backwards
		private startTimeMs = 0	// Starting time (must be > 0 when backwards
	) {
		super();
		this.runRate = backwards ? -1 : 1;
		this.mTime = new TimeFlow(startTimeMs, 0)
	}

	@property("Timer name")
	get timerName() {
		return this.name;
	}

	@property("Timer count backwards, false = countup")
	get countdown() {
		return this.runRate < 0;
	}
	set countdown(value: boolean) {
		const newRate = value ? -1 : 1;
		if (newRate !== this.runRate){
			let currentRunState = this.run;
			if  (currentRunState)
				this.run = false; // Stop timer if changing direction while running
			this.runRate = newRate;
			this.run =  currentRunState; // Restart timer
				
		}		
	}

	@property("Set momentarily to reset the time to initial value")
	get reset(): boolean { return this.mReset; }
	set reset(value: boolean) {
		this.run = false;	// Implicitly stops timer
		this.mReset = value;
		if (value)
			this.time = new TimeFlow(this.startTimeMs, 0);
	}

	@property("The current time position (as a TimeFlow, number in millis or string e.g. 'm:ss.t')")
	get time(): TimeFlow { return this.mTime; }
	set time(value: TimeFlow) {
		/*	Supposed to be a TimeFlow, but also accept string and number
			by converting those into a stopped TimeFlow. This may be
			useful for setting my time from a task expression.
		 */
		if (typeof value === 'string') // Assume a valid time format
			value =  new TimeFlow(TimeFlow.stringToMillis(value), 0);
		else if (typeof value === 'number') // Take as milliseconds
			value = new TimeFlow(value, 0);

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
						this.cancelStopTimer();
						this.stopTimer = wait(currTime);
						this.stopTimer.then(() => {  // Stop at 0 exactly
							this.run = false;
							this.time = new TimeFlow(0, 0);
						});
					}
				}
			} else	// Stop running
				this.cancelStopTimer();

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
	private cancelStopTimer() {
		if (this.stopTimer) {
			this.stopTimer.cancel();
			this.stopTimer = undefined;
		}
	}

	/**
	 * This timer is going away. Do any cleanup required.
	 */
	discard() {
		this.cancelStopTimer();
	}
}