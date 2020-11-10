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

	sleep(): Promise<any>;
	wakeUp(timeoutMilliseconds?: number): Promise<any>;

	load(showName: string): Promise<any>;
	isReady(): boolean;
	isShowLoaded(): boolean;
	getShowName(): string;

	play(auxTimelineName?:string): void;	// Main timeline if no auxTimelineName
	pause(auxTimelineName?:string): void;
	stop(auxTimelineName?:string): void;

	reset(): void;
	gotoTime(time:number, auxTimelineName?:string): void; // Time in mS
	gotoControlCue(cueName:string, reverseOnly: boolean, auxTimelineName?:string): void;

	setLayerConditions(layerCond:number): void;
	getLayerConditions(): number;
	layerConditions: number;

	setStandBy(stby: boolean, rateInMs: number): void;
	setStandBy(stby: boolean): void;
	isStandBy(): boolean;
	standBy: boolean;

	setInput(name:string, value:number, slewRateMs?:number): void;

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
	name: string;		// Read-only
	duration: number;	// Read-only, milliseconds
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
