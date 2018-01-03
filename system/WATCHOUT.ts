/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

/// <reference path = 'PIXI.d.ts' />

/**
 * Access WATCHOUT subsystem known by system by its cluster name.
 */
export var WATCHOUT: { [clusterName: string]: WATCHOUTCluster; };

interface WATCHOUTCluster {
	connect(): Promise<any>;
	disconnect(): void;
	isConnected(): boolean;
	connected: boolean;		// Read only

	sleep(): Promise<any>;
	wakeUp(timeoutMilliseconds?: number): Promise<any>;

	load(showName: string): Promise<any>;
	isReady(): boolean;
	isShowLoaded(): boolean;
	getShowName(): string;

	playing: boolean;		// Main timeline
	stopped: boolean;		// Main timeline
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

	// // // // Notification subscriptions

	subscribe(type: "connect", listener: (sender: WATCHOUTCluster, message:{
		type:
			'Connection'|		// Connection state changed (check with isConnected)
			'ConnectionFailed'	// Connection attempt failed
	})=>void): void;

	subscribe(type: "play", listener: (sender: WATCHOUTCluster, message:{
		type:
			'Playback'|		// Playback state changed
			'TimePosition'	// Time position changed abruptly
	})=>void): void;

	subscribe(type: "watchout", listener: (sender: WATCHOUTCluster, message:{
		type:
			'Authentication'|	// Authentication level changed
			'Busy'|				// Computer indicated being busy
			'Ready'|        	// Ready state changed
			'ShowName'|			// Name changed
			'ShowReloaded'|		// Show was reloaded (with same name)
			'StandBy'			// Stand-by state changed
	})=>void): void;

	subscribe(type: "error", listener: (sender: WATCHOUTCluster, message:{
		type: 'Error'|'Warning',
		text: string
	})=>void): void;

	unsubscribe(type: string, listener: Function);
}