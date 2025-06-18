/*	Provides script access to Timelines.

 	Copyright (c) 2024 PIXILAB Technologies AB, Sweden (http://pixilab.se).
 	All Rights Reserved.
*/

/**
 * Access to Blocks' Timeline, firstly under under its group and
 * then under its individual name (e.g., using dot notation or
 * array-style notation).
 */
export var Timeline: { [groupName: string]: Group; };

// Group level, accessed by name from the global Timeline root above.
export interface Group {
	[name: string]: Timeline;	// Specific Timeline, by name
}

/**
 * Timeline scripting API.
 */
export interface Timeline {
	readonly duration: number;	// Timeline's duration, in mS
	playing: boolean;			// Timeline is playing
	stopped: boolean;			// Timeline is stopped
	time: TimeFlow;				// Time position, rate, etc.

	/**
	 * Got to Marker cue specified by name. Returns false if cue was not found.
	 */
	gotoMarker(cueName: string, play?: boolean, searchReverse?: boolean, markerTrackName?: string): boolean;

	subscribe(event: "play", listener: (sender: Timeline, message:{
		type:
			'Playback'|		// Playback state changed
			'TimePosition'	// Time position changed abruptly
	})=>void): void;

	// Explicitly end subscription to event with function
	unsubscribe(event: string, listener: Function): void;
}
