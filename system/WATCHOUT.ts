/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

/// <reference path = 'PIXI.d.ts' />

/**
 * Access WATCHOUT subsystem known by system by its cluster name.
 */
export var WATCHOUT: { [clusterName: string]: WATCHOUTCluster; };

/**
 * Shared stuff provided both for the main timeline as well as aux timelines.
 */
export interface Timeline {
	connected: boolean;		// Read only (indicates data is now available/relevant)
	playing: boolean;		// Timeline is playing
	timePosition: number;	// Timeline time position, in mS
	time: TimeFlow;			// Time position, et al, as TimeFlow as well

	subscribe(event: "connect", listener: (sender: Timeline, message:{
		type:
			'Connection'|		// Connection state changed (check with isConnected)
			'ConnectionFailed'	// Connection attempt failed
	})=>void): void;

	subscribe(event: "play", listener: (sender: Timeline, message:{
		type:
			'Playback'|		// Playback state changed
			'TimePosition'	// Time position changed abruptly
	})=>void): void;

	// Explicitly end subscription to event with function
	unsubscribe(event: string, listener: Function): void;
}

export interface WATCHOUTCluster extends Timeline {
	showName: string;	// Name of the currently loaded show

	connect(): Promise<any>;
	disconnect(): void;
	isConnected(): boolean;

	// Shut down cluster - promise resolved once all members shut down
	sleep(): Promise<any>;

	// Promise resolved once all members are up
	wakeUp(timeoutSeconds?: number): Promise<any>;

	load(showName: string): Promise<any>;
	isReady(): boolean;
	isShowLoaded(): boolean;
	getShowName(): string;

	// Main timeline used if no auxTimelineName specified in following calls
	play(auxTimelineName?:string): void;
	pause(auxTimelineName?:string): void;
	stop(auxTimelineName?:string): void;
	gotoTime(time:number, auxTimelineName?:string): void; // Time in mS
	gotoControlCue(cueName:string, reverseOnly: boolean, auxTimelineName?:string): void;

	reset(): void;	// Reset cluster to initial (just loaded) state

	setLayerConditions(layerCond:number): void;
	getLayerConditions(): number;
	layerConditions: number;

	setStandBy(stby: boolean, rateInMs: number): void;
	setStandBy(stby: boolean): void;
	isStandBy(): boolean;
	standBy: boolean;

	setInput(name:string, value:number, slewRateMs?:number): void;

	/*	Get information about control cues on auxTimelineName or on Main timeline
		if auxTimelineName is unspecified. If the include parameter is undefined
		or 0, then return only named cues that have some effect and targets the
		current timeline.

		Pass a value in the include parameter to also return:

	 	1	Cues that have no effect when executed (e.g., Play with no target timeline)
		2	Cues targeting other timelines
		4	Cues having no name

		You can specify multiple includes by adding the numbers shown above.
		E.g., calling getControlCues(1+4) will also return control cues
		that have no effect and no name. The control cues returned will be
		sorted in ascending time order.
	 */
	getControlCues(include?: number, auxTimelineName?:string): Promise<ControlCueInfo[]>;

	// Get info about known aux timelines and their durations in mS
	auxTimelines(): [{ name: string, duration: number }];

	// Connect to an auxiliary timeline in order to subscribe to notifications from it
	auxTimeline(name: string): AuxTimeline;

	// // // // // // // Notification subscriptions // // // // // //

	subscribe(event: "connect", listener: (sender: WATCHOUTCluster, message:{
		type:
			'Connection'|		// Connection state changed (check with isConnected)
			'ConnectionFailed'	// Connection attempt failed
	})=>void): void;

	subscribe(event: "play", listener: (sender: WATCHOUTCluster, message:{
		type:
			'Playback'|		// Playback state changed
			'TimePosition'	// Time position changed abruptly
	})=>void): void;

	subscribe(event: "watchout", listener: (sender: WATCHOUTCluster, message:{
		type:
			'Authentication'|	// Authentication level changed
			'Busy'|				// Computer indicated being busy
			'Ready'|        	// Ready state changed
			'ShowName'|			// Name changed
			'ShowReloaded'|		// Show was reloaded (with same name)
			'StandBy'			// Stand-by state changed
	})=>void): void;

	subscribe(event: "error", listener: (sender: WATCHOUTCluster, message:{
		type: 'Error'|'Warning',
		text: string
	})=>void): void;

	// Object is being shut down
	subscribe(event: 'finish', listener: (sender: WATCHOUTCluster)=>void): void;
}

/**
 * Object you can get from a WATCHOUTCluster to subscribe to aux timeline status.
 * IMPORTANT: Use this only if you need to get state from aux timelines. If
 * you merely want to control an aux timeline, use the methods on WATCHOUTCluster
 * that take an optional auxTimelineName instead. If you open various timelines
 * in a dynamic manner from your script, close those you no longer need
 * explicitly to save on resources.
 */
export interface AuxTimeline extends Timeline {
	readonly name: string;
	readonly duration: number;	// Milliseconds
	stopped: boolean;
	close(): void;		// Close the connection to this auxiliary timeline

	// // // // // // // Notification subscriptions // // // // // //

	subscribe(event: "connect", listener: (sender: AuxTimeline, message:{
		type:
			'Connection'|		// Connection state changed (check with isConnected)
			'ConnectionFailed'	// Connection attempt failed
	})=>void): void;

	subscribe(event: "play", listener: (sender: AuxTimeline, message:{
		type:
			'Playback'|		// Playback state changed
			'TimePosition'	// Time position changed abruptly
	})=>void): void;

	// Object is being shut down
	subscribe(event: 'finish', listener: (sender: AuxTimeline)=>void): void;
}

export interface ControlCueInfo {
	readonly name: string;		// Name of this control cue
	readonly time: number;		// Time position of control cue on timeline, in mS

	readonly jump: boolean;		// Control cue causes a jump
	readonly jumpToCue: boolean; // Jump to cue named jumpCue (else jumps to time)
	readonly jumpCue: string;	// Name of target cue to jump to
	readonly jumpReverse: boolean;	// Search backwards for named jumpCue
	readonly jumpTime: number;	// Time, in milliseconds, to jump to

	readonly stop: boolean;		// Stop timeline

	readonly run: boolean;		// Run again after jump
	readonly jumpToRunDelay: number;	// Time, in mS to wait before running again

	readonly targetTimeline: string;	// Name of target timeline (else current)

	// Following provide information about the cue's enclosing layer
	readonly layerName: string;
	readonly layerCondition: number;
	readonly layerStandby: boolean
}
