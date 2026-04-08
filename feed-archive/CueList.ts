/*	Blocks Feed script that lets you define a number of named cue lists, each with a
	list of cues exposing current cue index and name as well as name of next and
	previous cue.

	Each such cue then controls corresponding task and/or timeline, activating the
	task/timeline when the cue becomes active and killing those when it is no
	longer the current cue (then also triggering any associated XXX_exit task).

	Each cue list also has a running, which (when set) tells any associated, live
	timeline to proceed (letting it run until paused or ended). If the timeline is
	dead (stopped) it instead advances to the next named cue in the list.

	The task group used is usually the one specified in the defineList call (which
	defaults to 'CueList' if left blank). However, you can also override this in a
	more dynamic way by setting the "track" property to a task group name. This lets you
	use task groups to represent different "tracks" of a journey, presenting different
	content.

	When using this "track" feature, the task group name specified with defineList
	will be used as fallback when there's no matching task in the "track" group.
	This automatic fallback to the defineList's task group name means that
	you only need to provide a task in the "track" group when track-speficific
	functionality is required and fallback when tracks are identical.

 	Copyright (c) 2025 PIXILAB Technologies AB, Sweden (http://pixilab.se).
 	All Rights Reserved.
 */

import * as feed from "../system_lib/Feed";
import {callable, field, min, parameter, property} from "../system_lib/Metadata";
import {FeedListSpec, ListData} from "../system_lib/Feed";
import {AggregateElem, Dictionary} from "../system_lib/ScriptBase";
import {Timeline} from "../system/Timeline";
import {Realm, Task} from "../system/Realm";
import {PropertyAccessor} from "../system_lib/Script";

const kDefaultRealm = "CueList";

export class CueList extends feed.Feed {
	list: Dictionary<List>;

	constructor(env: feed.FeedEnv) {
		super(env);
		this.list = env.namedAggregate('list', List);
	}

	@callable("Create (or clear content of) named cue list")
	defineList(
		@parameter("Name of cue list to define or clear")
		name: string,

		@parameter("Task realm name. Default is 'CueList'.", true)
		taskRealm?: string,

		@parameter("Task group name. Name of this list unless ovrridden by track property.", true)
		taskGroup?: string,

		@parameter("Timeline group name. Default is name of this list.", true)
		timelineGroup?: string
	) {
		if (this.list[name]) {
			this.list[name].clear()
		} else {
			const list = new List(
				this, name,
				taskRealm || kDefaultRealm,
				taskGroup || name,
				timelineGroup || name
			);
			this.list[name] = list;
			this.establishFeed(list);
		}
	}

	@callable("Append a cue to named list")
	addCue(
		@parameter("Name of list to add cue to")
		list: string,

		@parameter("Internal name of cue (also task and/or timeline name)")
		name: string,

		@parameter("User-friendly name (defaults to name)", true)
		friendlyName: string,
	) {
		const addToList = this.list[list];
		if (addToList)
			addToList.addCue(name, friendlyName);
		else
			throw "Cue list " + list + " not found. Use defineList first to create it."
	}
}

/**	Represents a single, named cue list, holding its named cues.
 *
 */
class List extends AggregateElem implements feed.StaticFeed<Cue, Cue> {
	readonly listType = Cue;
	readonly itemType = Cue;

	index = 0;
	cues: Cue[] = [];

	refreshTimer: CancelablePromise<any> = undefined;

	private mRunning = false;	// running property backing store
	private mTrack = '';			// Track name backing store. Overrides task group name.

	constructor(
		public owner: CueList,
		public readonly name: string,
		public readonly taskRealm: string,
		public readonly taskGroup: string,	// Task group name unless overridden by track name
		public readonly timelineGroup: string
	) {
		super();
	}

	/**
	 * Kill any current cue and delete all cues.
	 */
	clear() {
		if (this.cues.length) {
			if (this.index) // Had a another cue prior to
				this.killCueAt(this.index)
			this.cues.length = 0;
			this.refreshSoon();
		}
	}

	addCue(
		name: string,
		friendlyName?: string
	) {
		// console.log("addied cue", name, "to list", this.name);
		this.cues.push(new Cue(name, friendlyName));
		this.refreshSoon();
	}

	/**
	 * Notify feed listeners that I have changed.
	 */
	refreshSoon() {
		if (!this.refreshTimer) {
			this.refreshTimer = wait(100);
			this.refreshTimer.then(() => {
				this.refreshTimer = undefined;
				this.owner.refreshFeed(this.name);
			});
		} // Else already have a pending refresh
	}

	getList(spec: FeedListSpec): Promise<ListData<Cue>> {
		return Promise.resolve({ items: this.cues });
	}

	getTaskGroupName() {
		return this.mTrack || this.taskGroup;
	}

	@property("Track name. Overrides task group name if specified.")
	set track(trackName: string) {
		this.mTrack = trackName;
	}
	get track(){
		return this.mTrack;
	}

	@property("Current cue position, where 0 is before first cue")
	@min(0)
	get cueIndex(): number {
		return this.index;
	}
	set cueIndex(ix: number) {
		// console.log("cueIndex", ix, "was", this.index);
		if (ix >= 0 && ix <= this.cues.length) {
			if (this.index !== ix) { // This is a new cue
				let proceedWhen: Promise<any>;	// To wait for to start next cue
				if (this.index)  // Had a another live cue
					proceedWhen = this.killCueAt(this.index);
				else
					proceedWhen = Promise.resolve()	// Nothing ro wait for
				this.index = ix;
				if (ix) {
					/*	New presumably runnable cue. Wait for any "_exit"
						task to complete before starting next cue.
					 */
					proceedWhen.then(() => this.triggerCueAt(ix));
				}
				this.changed('cueName');
				this.changed('cueNext');
				this.changed('cuePrevious');
			}
		} else
			console.error("cueIndex", ix,  "out of bounds for list ", this.name);
	}

	@property("Current cue name (set to jump there)")
	get cueName(): string {
		return this.cues[this.index-1]?.name || '';
	}
	set cueName(name: string)  {
		let foundAt = -1;
		// console.log("cueName", name);
		this.cues.filter((cue, index) => {
			// console.log("considering cue", cue.name)
			if (cue.name === name && foundAt < 0)
				foundAt = index;
		});
		if (foundAt >= 0) {
			// console.log("found at ", foundAt)
			this.cueIndex = foundAt+1;
		} else
			console.error("cueName", name,  "not found in list ", this.name);
	}

	@property("Next cue name", true)
	get cueNext(): string {
		return this.cues[this.index]?.name || '';
	}

	@property("Previous cue name", true)
	get cuePrevious(): string {
		return this.cues[this.index-2]?.name || '';
	}

	/**
	 * First attempt to proceed running any associated timeline. If
	 * no timeline or timeline stopped (presumably due to reaching its
	 * end) then proceed with next cue in list instead
	 */
	private proceed() {
		const cue = this.cues[this.index-1];
		if (!cue || !cue.proceedWithTimeline(this))	// Timeline didn't proceed
			this.cueIndex = this.index + 1; 	// Step to next cue instead
	}

	/**
	 * Kill any task and timeline associated with cue at cueIx, which is 1-based.
	 * Return promise fulfilled once done.
	 */
	private killCueAt(cueIx: number) {
		const cue = this.cues[cueIx-1];
		// Return resolved promise if no such cue to not get stuck on that
		return cue ? cue.kill(this) : Promise.resolve();
	}

	/**
	 * Run any task and timeline associated with cue at cueIx, which is 1-based.
	 */
	private triggerCueAt(cueIx: number) {
		const cue = this.cues[this.index-1];
		if (cue)
			cue.trigger(this)
	}

	@property("True while timeline or task is running")
	set running(value: boolean) {
		// Setter can only be used to proceed with next, not pause mid-stream
		if (value && !this.mRunning)
			this.proceed();
	}
	get running(): boolean {
		return this.mRunning;
	}

	/**
	 * Callback from cue letting me know when it starts/stops.
	 */
	tellRunning(running: boolean) {
		// console.log("tellRunning", running);
		if (this.mRunning !== running) {
			this.mRunning = running;
			this.changed('running');
		}
	}
}

/**
 * Definition of a single cue held in a CueList.
 */
class Cue {
	private runningPropAccessor: PropertyAccessor<boolean>;	// Associated running timeline or task
	private timelineStopDelay?: CancelablePromise<any>;	// While in deferred timeline stop

	constructor(
		name: string,
		friendlyName?: string	// Defaults to name if not specified
	) {
		this.name = name;
		this.friendlyName = friendlyName ? friendlyName : name;
	}

	@field("Cue internal name")
	readonly name: string;

	@field("Cue name shown in UI")
	readonly friendlyName: string;

	// Paths used to subscribe to "running" status of timeline
	private timelineRunningPath(list: List): string {
		return `Timeline.${list.timelineGroup}.${this.name}.playing`;
	}

	/*	Paths used to subscribe to task's "running" status.
	 */
	private taskRunningPath(list: List, suffix: string = ''): string {
		let groupName = list.getTaskGroupName();
		if (!this.findSpecificTask(list, suffix)) { // Primary target task not found - assume fallback
			groupName = list.taskGroup;
			if (!groupName)
				throw "No corresponding task and Base Track not specified."
		}
		return `Realm.${list.taskRealm}.group.${groupName}.${this.name}${suffix}.running`;
	}

	/**
	 * Find my associated task, if any.
	 */
	private findSpecificTask(list: List, suffix?: string, useBaseGroup?: boolean): Task | undefined {
		const realm = Realm[list.taskRealm];
		if (realm) {
			const group = realm.group[useBaseGroup ? list.taskGroup : list.getTaskGroupName()];
			if (group) {
				let name = this.name;
				if (suffix)
					name = name + suffix;
				return group[name];
			}
		}
	}

	/**
	 * Find primary task if exists, else return task based on baseTrack group name,
	 * else retirm undefined.
	 */
	private findTask(list: List, suffix?: string): Task | undefined {
		let task = this.findSpecificTask(list, suffix);
		if (!task)
			task = this.findSpecificTask(list, suffix, true);
		return task;
	}

	/**
	 * Find my associated timeline, if any.
	 */
	private findTimeline(list: List): Timeline | undefined {
		if (Timeline) {
			const timelineGroup = Timeline[list.timelineGroup];
			if (timelineGroup)
				return timelineGroup[this.name];
		}
	}

	/**
	 * Stop any task and timeline associated with me.
	 * Returns promise fulfilled once done.
	 */
	kill(list: List): Promise<any> {
		// Stop any associated timeline
		const timeline = this.findTimeline(list);
		if (timeline) {
			// console.log("Stopping timeline", this.name);
			// Defer stopping to allow for smoother transition away from the timeline block
			this.timelineStopDelay = wait(1000);
			this.timelineStopDelay.then(() => {
				timeline.stopped = true;
				this.timelineStopDelay = undefined;
			});
		}

		// Stop any associated task in case it's still doing things
		let task = this.findTask(list);
		if (task)
			task.running = false;

		let result: Promise<any>;

		// Run any associated xxx_exit task
		task = this.findTask(list, "_exit");
		if (task) {
			task.running = true;
			result = new Promise(resolver => {
				const exitPropAccessor = list.owner.getProperty<boolean>(
					this.taskRunningPath(list, '_exit'), running => {
						if (!running) {
							exitPropAccessor.close();
							resolver();
						}
					}
				);
			});
		} else
			result = Promise.resolve();

		// Shut down any child-is-running state accessor
		if (this.runningPropAccessor) {
			list.tellRunning(false);
			this.runningPropAccessor.close();
			this.runningPropAccessor = undefined;
		}
		return result;
	}

	/**
	 * Run task and timeline associated with me.
	 */
	trigger(list: List) {
		const task = this.findTask(list);
		if (task)
			task.running = true;
		const timeline = this.findTimeline(list);
		if (timeline) {
			if (this.timelineStopDelay) {
				// Cancel any deferred stop as timeline got started again
				this.timelineStopDelay.cancel();
				this.timelineStopDelay = undefined;
			}
			timeline.playing = true;
		}
		if (!task && !timeline)
			console.warn("Neither task nor timeline found for cue", this.name, "of CueList", list.name);
		else {
			// Subscribe to running state of timeline or task
			const statusChangeHandler = (running: boolean) => list.tellRunning(running);
			this.runningPropAccessor = list.owner.getProperty<boolean>(timeline ?
				this.timelineRunningPath(list) : this.taskRunningPath(list),
				statusChangeHandler
			);
			if (this.runningPropAccessor.available) // Inform of initial state if known
				statusChangeHandler(this.runningPropAccessor.value);
		}
	}

	/**
	 * If I have no timeline or my timeline is dead, return false.
	 * If timeline is paused, then make it run and return true.
	 */
	proceedWithTimeline(list: List): boolean {
		const timeline = this.findTimeline(list);
		if (!timeline || timeline.stopped)
			return false;	// No timeline or timeline stopped (presumably due to reaching its end)
		timeline.playing = true;	// Get timeline going again if paused
		return true;	// Consider me done, not to proceed with next List cue
	}
}
