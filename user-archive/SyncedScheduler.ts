/*	Schedule the triggering of tasks accurately in relation to a TimeFlow.

	For this script to have any effect, you must first call (from a Task) the 'initialize'
	function, specifying the Realm and Group in which Task to be triggered live as well as
	the path to a time property (such as the 'time' of a Display Spot playing a video inside
	a Synchronizer, or the path to a driver property providing a TimeFlow, such as the
	TimecodeLTC driver).

	Then you must call the 'schedule' function to hook up all the Tasks tto be triggered to
	the time at which to trigger those. The time must be expressed as a string, where the
	last segment is fractions (not frames). To make these settings permanent, you may want
	to set this configuration script to trogger on System Start, so it is performed
	automatically whenever your Blocks server is started.

 	Copyright (c) 2024 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {PropertyAccessor, Script, ScriptEnv} from "../system_lib/Script";
import {callable, parameter, property} from "../system_lib/Metadata";
import {Realm} from "../system/Realm";


export class SyncedScheduler extends Script {
	private targetRealm = "";
	private targetGroup = "";
	private cues: Cue[] = [];
	private nextCueIx = 0;		// Index into cues

	private nextCueWait?: CancelablePromise<any>;
	private timePropAccessor?: PropertyAccessor<TimeFlow>;
	private lastTime: TimeFlow;	// Most recently received time

	public constructor(env : ScriptEnv) {
		super(env);
		this.lastTime = new TimeFlow(0, 0);
	}

	@callable("Specify target realm and group and clear all cues")
	initialize(
		@parameter("Name of Realm in which tasks to trigger is found") realm: string,
		@parameter("Name of Group in which tasks to trigger is found") group: string,
		@parameter("Full path to time property used as sync source") timeProp: string
	) {
		// Verify realm and group exists
		if (!Realm[realm].group[group])
			throw "No such realm/group name"; // Nope - give up

		this.targetRealm = realm;
		this.targetGroup = group;
		this.cues = [];
		this.cancelNextCue();

		if (this.timePropAccessor) // Close any existing accerssor
			this.timePropAccessor.close();
		// Establish access to time source property
		this.timePropAccessor = this.getProperty<TimeFlow>(timeProp, newValue =>
			this.handleTimeUpdate(newValue)
		);
	}

	@callable("Specify a Task to run and when to start it relative to my synch source")
	schedule(
		@parameter('The time position, as a string, e.g., "3:12.533"') time: string,
		@parameter("Name of the Task to trigger at that time") taskName: string
	) {
		const prevTime = this.cues.length ? this.cues[0].time : 0;
		const added = new Cue(time, taskName);
		this.cues.push(added);
		if (added.time < prevTime) // Added out of order - need to sort
			this.cues.sort((lhs, rhs) => lhs.time - rhs.time);
		if (this.lastTime.rate > 0) // Added while running - must re-schedule
			this.scheduleCue();
	}

	@property("Current time of synchronization source", true)
	get time() { return this.lastTime; }
	set time(newTime: TimeFlow) { this.lastTime = newTime; }

	/**
	 * New time received. See if this is interesting change vs lastTime
	 * and update scheduling of next event.
	 */
	private handleTimeUpdate(newTime: TimeFlow) {
		const newRunning = newTime.rate > 0;
		const newTimeTime = newTime.currentTime;	// Extrapolated
		const last = this.lastTime;

		if (newRunning !== (last.rate > 0)) {
			// console.log("Running", newRunning);
			// Time started/stopped
			if (!newRunning)
				this.cancelNextCue();
			else // Just started
				this.scheduleCue(newTime);
		} else if (newRunning) {
			// Running and was running
			if (newTime.position < last.position)
				this.scheduleCue(newTime); // Time jumped backwards
			else {
				const nextCueAt = this.nextCueTime();
				if (nextCueAt !== undefined && (newTimeTime - nextCueAt) > 1500)
					this.scheduleCue(newTime); // Time jumped forward
				else { // Time seem to be more or less continuous
					const absDelta = Math.abs(newTimeTime - last.currentTime);
					if (absDelta > 80) { // Take action if too far our of whack
						console.warn("Time glitched", absDelta)
						this.scheduleCue(newTime); // Time jumped backwards
					} // Else assume we're just humming along normally
				}
			}
		}
		this.time = new TimeFlow(newTimeTime, newTime.rate, newTime.end, newTime.dead);
	}

	/**
	 * I'm supposed to be running. Figure out what's the next cue, then wait
	 * for that cue's time to occur. If timeFlow provided, use that, else
	 * use last received timeFlow.
	 */
	private scheduleCue(timeFlow?: TimeFlow) {
		this.cancelNextCue();
		timeFlow = timeFlow || this.lastTime;
		const timeNow = timeFlow.currentTime;
		var pos = bSearch(this.cues, "time", timeNow);
		// console.log("scheduleCue", pos);

		if (pos >= 0) // Right on the money
			this.nextCueIx = pos;
		else
			this.nextCueIx = ~pos;	// In the future (possibly beyond last)
		this.scheduleNextCue(timeNow, timeFlow)
	}

	/**
	 * Wait for the time of next cue (and then some, to be safe), also
	 * factoring in the time flow rate.
	 */
	private scheduleNextCue(timeNow: number, flow: TimeFlow) {
		const atTime = this.nextCueTime();
		if (atTime !== undefined) {
			// console.log("Scheduled", this.nextCueIx, TimeFlow.millisToString(atTime));
			const toWait = Math.max(10, atTime - timeNow * (1 / flow.rate) + 10);
			this.nextCueWait = wait(toWait);
			this.nextCueWait.then(() => this.runCues(this.lastTime.currentTime));
		} // Else no more cues to schedule
		this.nextCueWait = undefined;
	}

	/**
	 * Run all cues from the current one up to the lasty one in the past
	 * relative to timeNow.
	 */
	private runCues(timeNow: number) {
		while (this.moreCues() && this.nextCueTime() < timeNow) {
			const cue = this.cues[this.nextCueIx++];
			Realm[this.targetRealm].group[this.targetGroup][cue.taskName].running = true;
			// console.log(TimeFlow.millisToString(timeNow), "ran", cue.taskName);
		}
		this.scheduleNextCue(timeNow, this.lastTime);
	}

	/**
	 * Cancel any pending timed callback
	 */
	private cancelNextCue() {
		if (this.nextCueWait) {
			this.nextCueWait.cancel();
			this.nextCueWait = undefined;
		}
	}

	/**
	 * Return the time of next cue, if any, else undefined.
	 */
	private nextCueTime(){
		const cue = this.cues[this.nextCueIx];
		return cue ? cue.time : undefined;
	}

	private moreCues() {
		return this.nextCueIx < this.cues.length;
	}
}

/**
 * Information associated with each "cue".
 */
class Cue {
	readonly time: number;	// Sync source time, in mS, when to run the cue
	readonly taskName: string;	// Name of task to run

	constructor(timeStr: string, taskName: string) {
		this.time = TimeFlow.stringToMillis(timeStr);
		this.taskName = taskName;
	}
}


/**
 * Perform a binary search in arr for item, where compOrProp is either the comparision function
 * used to find the element, or a name of the property in arr elements to find (default name is
 * "name"), in which case "sought" is what to look for with a default comparision function.
 *
 * Default comparision function is based on simple comparision (< === >).
 *
 * Returns index of found item, or a negative number if not found
 *
 * If you provide compOrProp as a function, "sought" is ignored, and compOrProp must return
 * <0 if lhs<wanted, >0 if lhs>wanted or 0 if lhs===wanted.
 * Returns index of found element, or a negative number if not found.
 *
 * The negative number returned if not found is the "one's complement" of the index where
 * it should have been found, had it been in arr. I.e., it's ~index, meaning that if it
 * returns -1, it should have been at position zero, if it returns -2, it should have been
 * at position one, and so on.
 *
 * See http://oli.me.uk/2013/06/08/searching-javascript-arrays-with-a-binary-search/
 */
function bSearch<T>(
	arr: T[],
	compOrProp?:string | ((lhs:T)=> number),
	sought?: any
): number {
	var minIndex = 0;
	var maxIndex = arr.length - 1;
	var ix: number;
	const propName = <string>compOrProp;

	if (compOrProp === undefined)
		compOrProp = 'name';
	const compFun = (typeof compOrProp === 'function') ? compOrProp : defaultCompFun;

	while (minIndex <= maxIndex) {
		ix = (minIndex + maxIndex) / 2 | 0;
		var compResult = compFun(arr[ix]);
		if (compResult < 0)
			minIndex = ix + 1;
		else if (compResult > 0)
			maxIndex = ix - 1;
		else
			return ix;	// Found
	}
	// Not found - ret once's complement of where should have been
	return ~Math.max(minIndex, maxIndex);

	function defaultCompFun(lhs:any): number {
		const item = lhs[propName];
		if (item < sought)
			return -1;
		else if (item > sought)
			return 1;
		return 0;
	}
}
