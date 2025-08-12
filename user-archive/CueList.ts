/*	Blocks Feed script that lets you define a number of named cue lists, each with a
	list of cues exposing current cue index and name as well as name of next and
	previous cue.

	Each such cue then controls corresponding task and/or timeline, activating the
	task/timeline when the cue becomes active and killing those when it is no
	longer the current cue.

	Each cue list also has a "nextCue" callable, which will tell any associated
	timeline to skip ahead to its next marker unless timeline has already died
	in which case it instead advances to the next name cue.

 	Copyright (c) 2025 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
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

		@parameter("Task realm name (defaults to 'CueList'", true)
		taskRealm?: string,

		@parameter("Task group name (defaults to name of this list", true)
		taskGroup?: string,

		@parameter("Task group name (defaults to name of this list", true)
		timelineGroup?: string
	) {
		if (this.list[name]) {
			this.list[name].clear()
		} else {
			const list = new List(this, name, taskRealm, taskGroup, timelineGroup);
			this.list[name] = list;
			this.establishFeed(list);
		}
	}

	@callable("Append a cue to named list")
	addCue(
		@parameter("Name of list to add cue to")
		list: string,

		@parameter("Name of cue (also task and timeline unless overridden)")
		name: string,

		/*	Following could be useful, but mostly felt like noise at this point in the task list
		@parameter("Name of associated task if different from 'name' parameter", true)
		task?: string,

		@parameter("Name of associated timeline if different from 'name' parameter", true)
		timeline?: string
		*/
	) {
		const addToList = this.list[list];
		if (addToList)
			addToList.addCue(name /*	, task, timeline*/);
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

	constructor(
		public owner: CueList,
		public readonly name: string,
		public readonly taskRealm?: string,
		public readonly taskGroup?: string,
		public readonly timelineGroup?: string
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
		task?: string,
		timeline?: string
	) {
		// console.log("addied cue", name, "to list", this.name);
		this.cues.push(new Cue(name, task, timeline));
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

	@property("Current cue position, where 0 is before first cue")
	@min(0)
	get cueIndex(): number {
		return this.index;
	}
	set cueIndex(ix: number) {
		// console.log("cueIndex", ix, "was", this.index);
		if (ix >= 0 && ix <= this.cues.length) {
			if (this.index !== ix) { // This is a new cue
				if (this.index)  // Had a another live cue
					this.killCueAt(this.index);
				this.index = ix;
				if (ix)	// New presumably runnable cue
					this.triggerCueAt(ix);
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
	@callable("Proceed with next marker on timeline or cue in list")
	proceed() {
		const cue = this.cues[this.index-1];
		if (!cue || !cue.proceedWithTimeline(this))	// Timeline didn't proceed
			this.cueIndex = this.index + 1; 	// Step to next cue instead
	}

	/**
	 * Kill any task and timeline associated with cue at cueIx, which is 1-based.
	 */
	private killCueAt(cueIx: number) {
		const cue = this.cues[cueIx-1];
		if (cue)
			cue.kill(this);
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
	private runningPropAccessor: PropertyAccessor<boolean>;

	constructor(
		name: string,
		readonly task?: string,
		readonly timeline?: string
	) {
		this.name = name;
	}

	@field("Cue name")
	readonly name: string;

	// Paths used to subscribe to "running" status
	private taskRunningPath(list: List): string {
		return `Realm.${list.taskRealm || kDefaultRealm}.group.${list.taskGroup || list.name}.${this.task || this.name}.running`;
	}

	// Paths used to subscribe to "running" status of timeline
	private timelineRunningPath(list: List): string {
		return `Timeline.${list.timelineGroup || list.name}.${this.timeline || this.name}.playing`;
	}

	/**
	 * Find my associated task, if any.
	 */
	private findTask(list: List): Task | undefined {
		const realm = Realm[list.taskRealm || kDefaultRealm];
		if (realm) {
			const group = realm.group[list.taskGroup || list.name];
			if (group)
				return group[this.task || this.name];
		}
	}

	/**
	 * Find my associated timeline, if any.
	 */
	private findTimeline(list: List): Timeline | undefined {
		const timelineGroup = Timeline[list.timelineGroup || list.name];
		if (timelineGroup)
			return timelineGroup[this.timeline || this.name];
	}

	/**
	 * Stop any task and timeline associated with me.
	 */
	kill(list: List) {
		// console.log("Killing cue", this.name);
		const timeline = this.findTimeline(list);
		if (timeline) {
			// console.log("Stopping timeline", this.name);
			timeline.stopped = true;
		}
		const task = this.findTask(list);
		if (task)
			task.running = false;
		if (this.runningPropAccessor) {
			list.tellRunning(false);
			this.runningPropAccessor.close();
			this.runningPropAccessor = undefined;
		}
	}

	/**
	 * Run task and timeline associated with me.
	 */
	trigger(list: List) {
		const task = this.findTask(list);
		if (task)
			task.running = true;
		const timeline = this.findTimeline(list);
		if (timeline)
			timeline.playing = true;
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
