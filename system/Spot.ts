/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

/// <reference path = 'PIXI.d.ts' />

/**
 * Access a SpotGroupItem under its assigned name.
 * Use dot notation to access nested spots inside groups.
 */
export var Spot: {
	[name: string]: SpotGroupItem;
};

/**
 Items that can live in the root Spot object
 */
interface SpotGroupItem {
	isOfTypeName(typeName: string): SpotGroupItem|null;
}

export interface SpotGroup extends SpotGroupItem {
	[name: string]: SpotGroupItem|any;
}

/**
 * Basic Spot properties available for most spot types.
 */
export interface BaseSpot {
	fullName: string;		// Full path name (read-only)
	name: string;			// Leaf spot name (read only)

	/**
	 Default block name as "group/leaf", or empty string
	 if none.
	 */
	block: string;

	/**
	 Priority block name as "group/leaf", or empty string
	 if none.
	 */
	priorityBlock: string;

	/**
	 Get current playing block name as "group/leaf", or empty tring
	 if none.
	 */
	playingBlock: string;	// Read-only
}

export interface DisplaySpot extends SpotGroupItem, BaseSpot {
	isOfTypeName(typeName: string): DisplaySpot|null;	// Check subtype by name ("DisplaySpot")

	/**
	 True if the spot is connected. Read only.
	 */
	connected: boolean;

	/**
	 * Load a Block with priority. Returns a promise that's fulfilled once
	 * the block is loaded, or rejected if the loading fails. Block name
	 * is in "group/leaf" form. Setting to null or empty string reverts to
	 * the normal block.
	 */
	loadPriorityBlock(name: string): Promise<any>;

	/**
	 * Reload the current block. Occasionally useful after making server-side changes to
	 * a block programmatically, or to reload a WebBlock that changed for other reasons.
	 */
	reload(): void;

	/**
	 * Turn power on/off, if possible.
	 */
	power: boolean;

	/**
	 * Current time position (e.g., in video), in seconds. Write to position the video.
	 * Reading is supported only when spot has an active Synchronizer block which provides
	 * this information (else returns NaN).
	 */
	time: number;

	/**
	 Ask display to reboot/reload. Not supported by all displays.
	 */
	reboot(): void;

	/**
	 * Locate time position in video/audio
	 */
	seek(timeInSeconds: number):void;

	/**
	 * Ask Spot to select an alternative picture source, by name. Supported inputs vary
	 * with spot models, but typically look like, "DVI", "HDMI" or "HDMI1" (if has more
	 * than one input of same type). Specify empty string to revert to the default Spot
	 * image source (i.e., its "browser").
	 */
	pictureSource: string;

	/**
	 Spot is playing (true) or paused (false).
	 */
	playing: boolean;

	/**
	 Spot is actively viewed
	 */
	active: boolean;

	/**
	 Control audio volume, if possible, as 0...1.
	 */
	volume: number;

	/**
	 * Apply custom CSS classes to root display element ("theDisplay").
	 * Multiple classes separated by space.
	 */
	customClasses: string;

	/**
	 Ask Spot to reveal the specified path, which is assumed to exist
	 in the currently loaded block. The path must be absolute (start
	 with a slash), and in the form

	  	/TopLevel/subLevel/targetBlock

	 Where each segment must be one of the following:

	 - An alphanumeric block name.
	 - A numeric index into a list of blocks (0-based)
	 - A relative change in a list (e.g., a Slideshow), in the form
	 	+	To advance one step, with wrap-around once the end is reached
	 	-	To step backwards by one step, with wrap-around
	 	+2	To step forward by two steps, with no wrap-around
	 	-3	To step backwards 3 steps, with no wrap-around

	 Fails silently if the target page can't be found.
	 */
	gotoPage(path: string): void;

	/**
	 * Same as gotoPage, but returns a promise that will be rejected with
	 * an error message if the specified page can't be found.
	 */
	tryGotoPage(path: string): Promise<any>;

	/**
	 * Force set of local tags to only those specified (comma separated). Does not
	 * alter any tags specified in the Display Spot's configuration. If ofSet specified,
	 * then alter only tags within ofSet, leaving others alone.
	 */
	forceTags(tags: string, ofSet?: string): void;

	/**
	 * Ask spot to scroll horizontally and/or vertically, to the specified position.
	 * This assumes the existence of Scroller(s) on the client side, to do the actual
	 * scrolling. The position is specified as a normalized value 0...1, where 0
	 * is no scrolling, and 1 is the maximum amount of scrolling.
	 */
	scrollTo(x: number|undefined, y?:number): void;

	/**
	 * Tell any active Locator on this Spot to locate the location ID
	 * or spot path specified by "location". This performs the same
	 * function as manually entering the specified Location ID on
	 * the numeric keypad of the Locator (if isSpotPath is falsey).
	 * If isSpotPath is true, then location specifies the full
	 * path to the Spot (dot separated if inside a Spot group)
	 * to locate to, bypassing the Location-ID-to-Spot lookup
	 * step. This is useful if you already know the name of the
	 * spot.
	 *
	 * To cancel any current location, pass empty string
	 * as location.
	 */
	locateSpot(location: string, isSpotPath?: boolean): void;

	/**
	 * Event fired when interesting connection state event occurs.
	 */
	subscribe(event: "connect", listener: (sender: DisplaySpot, message:{
		type:
			'Connection'|		// Connection state changed (check with isConnected)
			'ConnectionFailed'	// Connection attempt failed
	})=>void): void;

	/**
	 *	Event fired when various spot state changes occur.
	 */
	subscribe(event: "spot", listener: (sender: DisplaySpot, message:{
		type:
			'DefaultBlock'|		// Default block changed
			'PriorityBlock'|	// Priority block changed
			'PlayingBlock'|		// Actually playing block changed
			'InputSource'|		// Input source selection changed
			'Volume'|			// Audio volume changed
			'Active'|			// Actively viewed state changed
			'Playing'			// Playing/paused state changed
	})=>void): void;

	/**
	 *	Event fired when user navigates manually to a block path
	 */
	subscribe(event: 'navigation', listener: (sender: DisplaySpot, message: {
		targetPath: string,	// Requested path navigated to
		foundPath: string	// Resulting absolute (//-style) and canonized path
	})=>void): void;

	/**
	 *	Event fired when keyboard faux-GPIO (numeric key 0...9) changes state.
	 */
	subscribe(event: 'keyPress', listener: (sender: DisplaySpot, message: {
		input: number,		// Input that changed; 0...9
		active: boolean		// Input is active (pressed)
	})=>void): void;

	/**
	 *	Event fired when on RFID/QR scanner input (keyboard text entry).
	 */
	subscribe(event: 'scannerInput', listener: (sender: DisplaySpot, message: {
		code: string,		// Scanned code, or empty string at end of scan
	})=>void): void;

	// Object is being shut down
	subscribe(event: 'finish', listener: (sender: DisplaySpot)=>void): void;

	unsubscribe(event: string, listener: Function): void;
}


export interface MobileSpot extends SpotGroupItem, BaseSpot {
	isOfTypeName(typeName: string): MobileSpot | null;	// Check subtype by name ("MobileSpot")

	subscribe(event: "spot", listener: (sender: MobileSpot, message:{
		type:
			'DefaultBlock'|		// Default block changed (may be schedule)
			'PriorityBlock'|	// Priority block changed (may be schedule)
			'PlayingBlock'		// Actually playing block changed (always media)
	})=>void): void;

	// Explicitly end subscription to event with function
	unsubscribe(event: string, listener: Function): void;
}
