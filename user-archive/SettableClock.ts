/*
	A settable, persistent time-of-day-based state,
	that will be "on" between the set start and end time,
	expressed in hours and minutes

 	Created 2018 by Mike Fahl.
 */

import {Script, ScriptEnv} from "system_lib/Script";
import {SimpleFile} from "system/SimpleFile";
import {max, min, property} from "system_lib/Metadata";

// Composite hour and minutes
interface HMTime {
	hour: number;
	minute: number
}

// What goes into my settings file
interface Settings {
	start: HMTime;
	end: HMTime;
}

export class SettableClock extends Script {

	private settings: Settings;
	private mPersistor: CancelablePromise<any>;
	private mStateChecker: CancelablePromise<any>;
	private mOn = false;	// Published "on" state

	private readonly kFileName = "SettableClock";	// Name of my presistent settings file

	public constructor(env : ScriptEnv) {
		super(env);
		this.settings = {	// Init to default values until read from file
			start: {hour: 8, minute: 0},
			end: {hour: 18, minute: 0}
		};
		SimpleFile.read(this.kFileName).then(data => {
			const old = this.settings;
			const curr = this.settings = JSON.parse(data);
			// Fire notification for all props that changed
			if (old.start.hour !== curr.start.hour)
				this.changed('startHour');
			if (old.start.minute !== curr.start.minute)
				this.changed('startMinute');
			if (old.end.hour !== curr.end.hour)
				this.changed('endHour');
			if (old.end.minute !== curr.end.minute)
				this.changed('endMinute');
			this.checkStateNow();
			// console.log("SettableClock resurrected");
		}).finally(() => this.checkState())
	}

	@property("ON state", true)
	set on(value: boolean) {
		this.mOn = value;
	}
	get on(): boolean {
		return this.mOn;
	}

	@property("Start hour")
	@min(0) @max(23)
	set startHour(value: number) {
		if (this.settings.start.hour !== value)
			this.persistVars();
		this.settings.start.hour = value;
	}
	get startHour(): number {
		return this.settings.start.hour || 0;
	}

	@property("Start minute")
	@min(0) @max(59)
	set startMinute(value: number) {
		if (this.settings.start.minute !== value)
			this.persistVars();
		this.settings.start.minute = value;
	}
	get startMinute(): number {
		return this.settings.start.minute || 0;
	}

	@property("End hour")
	@min(0) @max(23)
	set endHour(value: number) {
		if (this.settings.end.hour !== value)
			this.persistVars();
		this.settings.end.hour = value;
	}
	get endHour(): number {
		return this.settings.end.hour || 0;
	}

	@property("End minute")
	@min(0) @max(59)
	set endMinute(value: number) {
		if (this.settings.end.minute !== value)
			this.persistVars();
		this.settings.end.minute = value;
	}
	get endMinute(): number {
		return this.settings.end.minute || 0;
	}

	/**
	 * Convert HMTime to seconds.
	 */
	private static hmToSeconds(hm: HMTime): number {
		return hm.hour * 60 * 60 + hm.minute * 60;
	}

	/**
	 * Check once per minute whether to update my "on" state.
	 */
	private checkState() {
		if (this.mStateChecker)
			return;	// Timer alredy running - no need to restart
		this.mStateChecker = wait(60*1000);
		this.mStateChecker.then(() => {
			this.mStateChecker = undefined;
			// Avoid checking close to time change if still in progress
			if (!this.mPersistor) {
				if (!this.checkStateNow())
					return;	// Failws checking state, leave timer dead
			}
			this.checkState();	// Check in a minute again
		});
	}

	/**
	 * Set my "on" state as appropriate for current start and end time.
	 * Returns false in pathological case when end < start.
	 */
	private checkStateNow(): boolean {
		const secStart = SettableClock.hmToSeconds(this.settings.start);
		const secEnd = SettableClock.hmToSeconds(this.settings.end);
		if (secEnd <= secStart) {
			console.error("End time must be greater than start time");
			return false;	// Pathological case
		}
		const now = new Date();
		const hmNow: HMTime = {hour: now.getHours(), minute: now.getMinutes()};
		const secNow = SettableClock.hmToSeconds(hmNow);

		// Set me to ON if between start and end time
		this.on = secNow >= secStart && secNow < secEnd;
		return true;
	}

	// Make sure written to disk soon. Also uses mPersistor to hold off triggering on/off state
	private persistVars() {
		if (this.mPersistor)
			this.mPersistor.cancel();
		this.mPersistor = wait(2000);
		this.mPersistor.then(() => {
			this.mPersistor = undefined;
			SimpleFile.write(this.kFileName, JSON.stringify(this.settings));
			// console.log("Persisted");
			this.checkState();	// Possibly restart dead timer
		});
	}
}
