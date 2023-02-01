/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

/// <reference path = 'PIXI.d.ts' />


import {RecordBase} from "../system_lib/ScriptBase";

/**
 * Access a SpotGroupItem under its assigned name.
 * Use dot notation to access nested spots inside groups.
 */
export var Spot: SpotGroup;

/**
 Items that can live in the root Spot object
 */
export interface SpotGroupItem {
	isOfTypeName(typeName: string): SpotGroupItem|null;
}

export interface SpotGroup extends SpotGroupItem {
	isOfTypeName(typeName: "SpotGroup"): SpotGroup|null;	// Check subtype by type name
	[name: string]: SpotGroupItem|any;
}

/**
 * Basic Spot properties available for most spot types.
 */
export interface BaseSpot {
	readonly fullName: string;		// Full path name
	readonly name: string;			// Leaf spot name

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

	// Spot disconnected and must no longer be used
	subscribe(event: 'finish', listener: (sender: BaseSpot)=>void): void;

	/*	Explicitly end subscription from listener function to event,
		where both the listener and the event name must be identical to
		those passed into subscribe. Beware if you're using a lambda
		(aka "fat arrow") function, in which case you should store that
		very instance of the function in a variable that can then be
		used to unsubscribe.
	 */
	unsubscribe(event: string, listener: Function): void;
}

interface ControllableSpot extends BaseSpot {
	/**
	 * Identification, based on MAC address, serial number, given ID, or similar
	 * system-unique value.
	 */
	readonly identity: string;

	readonly parameter: { [id: string]: any; }	// Spot parameters, if any, keyed by name

	location: string;	// Current location Spot path, from Locator used on Spot, if any

	/**
	 Ask Spot to reveal the specified child block, in the current root block.
	 Fails silently if the target child block can't be found.
	 The 'play' and 'seekToSeconds' parameters apply to video/audio.
	 The path must be absolute (start with a slash), and in the form

	  	/firstChild/secondChild/targetChildBlock

	 Where each segment must be one of the following:

	 - An alphanumeric block name.
	 - A numeric index into a list of blocks (0-based)
	 - A relative change in a list (e.g., a Slideshow), in the form
	 	+	To advance one step, with wrap-around once the end is reached
	 	-	To step backwards by one step, with wrap-around
	 	+2	To step forward by two steps, with no wrap-around
	 	-3	To step backwards 3 steps, with no wrap-around

	 	This function used to be called gotoPage (still available in its
	 	original form for backward compatibility).
	 */
	gotoBlock(
		path: string,			// Child block path to
		play?:boolean, 			// Once found, tell the child to play or pause
		seekToSeconds?: number // Once found, tell the child to seek to time pos
	): void;


	/**
	 * Same as gotoBlock, but returns a promise that will be rejected with
	 * an error message if the specified block can't be found.
	 */
	tryGotoBlock(
		path: string,			// Child block path to
		play?:boolean, 			// Once found, tell the child to play or pause
		seekToSeconds?: number // Once found, tell the child to seek to time pos
	): Promise<any>;

	/**
	 * Load a Block with priority. Returns a promise that's fulfilled once
	 * the block is loaded, or rejected if the loading fails. Block name
	 * is in "group/leaf" form. Setting to null or empty string reverts to
	 * the normal block.
	 */
	loadPriorityBlock(name: string): Promise<any>;

	/**
	 * Seek to time position in video/audio. If argument is a number, it is interpreted as seconds
	 * (which may have fractions). If it is a stinrg, it is expected to be in the format
	 * "HH:MM.SS.fff".
	 */
	seek(time: number|string):void;

	/**
	 * Apply custom CSS classes to root display element ("theDisplay").
	 * Multiple classes separated by space.
	 */
	customClasses: string;

	/**
	 * Force set of local tags to only those specified (comma separated). Does not
	 * alter any tags specified in the Spot's configuration. If ofSet specified,
	 * then alter only tags within ofSet, leaving others alone.
	 */
	forceTags(tags: string, ofSet?: string): void;

	/**
	 * Tell any active Locator on this Spot to locate the location ID
	 * or spot path specified by "location". This performs the same
	 * function as manually entering the specified Location ID on
	 * the numeric keypad of the Locator (if isSpotPath is falsey).
	 * If isSpotPath is true, then location specifies the full
	 * path to the Spot (dot separated if inside Spot group(s))
	 * to locate, bypassing the Location-ID-to-Spot lookup step.
	 * This is useful if you already know the path to the spot.
	 *
	 * To end any current location, pass empty string
	 * as location.
	 */
	locateSpot(location: string, isSpotPath?: boolean): void;

	/**
	 * Most recently scanned value, when using keyboard-emulating or QR code
	 * scanner.
	 */
	readonly scannerInput: string;

	/**
	 * Ask spot to scroll horizontally and/or vertically, to the specified position.
	 * This assumes the existence of Scroller(s) on the client side, to do the actual
	 * scrolling. The position is specified as a normalized value 0...1, where 0
	 * is no scrolling, and 1 is the maximum amount of scrolling. If "seconds" is
	 * specified, then scroll gradually over that time.
	 */
	scrollTo(x: number|undefined, y?:number, seconds?: number): void;
}

export interface DisplaySpot extends ControllableSpot, SpotGroupItem, GeoZonable {
	isOfTypeName(typeName: "DisplaySpot"): DisplaySpot|null;

	/**
	 True if the spot is connected.
	 */
	readonly connected: boolean;

	/**
	 * Dot-separated IP address of display spot, if connected, else null.
	 */
	readonly address: string;

	/**
	 * Get any geolocation associated with spot, or null if none.
	 */
	readonly geoZone: GeoZone|null;


	/**
	 * Reload the current block. Occasionally useful after making server-side changes to
	 * a block programmatically, or to reload a WebBlock that changed for other reasons.
	 * Optionally, reload the entire web page (essentially performing a browser "reset").
	 */
	reload(reloadBrowser?:boolean): void;

	/**
	 * Turn power on/off, if possible. Returns most recently set power state.
	 * NOTE: Prior to Blocks 5.5, this returned the current power state, which
	 * would lag the wanted power state during power-up.
	 *
	 * Alternatively, call wakeUp below from a task, to turn power on and wait
	 * for spot to connect before proceeding (possibly consolidated inside an
	 * await statement, to wait for more than one starting in parallell).
	 */
	power: boolean;

	/**
	 * Power up the display spot. Promise resolved once spot has connected.
	 */
	wakeUp(timeoutSeconds?: number): Promise<any>;

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
	 Controls or returns audio volume, if possible, as 0...1.
	 */
	volume: number;

	/**
	 * Event fired when interesting connection state event occurs.
	 */
	subscribe(event: "connect", listener: (sender: DisplaySpot, message:{
		readonly type:
			'Connection'|		// Connection state changed (check with isConnected)
			'ConnectionFailed'	// Connection attempt failed
	})=>void): void;

	/**
	 *	Event fired when various spot state changes occur.
	 */
	subscribe(event: "spot", listener: (sender: DisplaySpot, message:{
		readonly type:
			'DefaultBlock'|		// Default block changed
			'PriorityBlock'|	// Priority block changed
			'PlayingBlock'|		// Actually playing block changed
			'InputSource'|		// Input source selection changed
			'Volume'|			// Audio volume changed (from Blocks)
			'Active'|			// Actively viewed state changed
			'Playing'			// Playing/paused state changed
	})=>void): void;

	/**
	 *	Event fired when user navigates manually to a block path
	 */
	subscribe(event: 'navigation', listener: (sender: DisplaySpot, message: {
		readonly targetPath: string,	// Path navigated to
		readonly foundPath: string		// Resulting absolute (//-style) and canonized path
	})=>void): void;

	/**
	 *	Event fired when keyboard faux-GPIO (numeric key 0...9) changes state.
	 */
	subscribe(event: 'keyPress', listener: (sender: DisplaySpot, message: {
		readonly input: number,		// Input that changed; 0...9
		readonly active: boolean	// Input is active (pressed)
	})=>void): void;

	/**
	 *	Event fired when on RFID/QR scanner input (keyboard text entry).
	 */
	subscribe(event: 'scannerInput', listener: (sender: DisplaySpot, message: {
		readonly code: string,		// Scanned code, or empty string at end of scan
	})=>void): void;

	/**
	 *	Event fired when Locator changes location of spot.
	 */
	subscribe(event: 'location', listener: (sender:DisplaySpot, message: {
		readonly location: string	// New location, as Spot path, or empty string if left location
	})=>void): void;

	/**
	 *	Event fired when image is received from Camera block on Spot.
	 */
	subscribe(event: 'image', listener: (sender: DisplaySpot, message: {
		readonly filePath: string,	// Path to file just received (typically "/temp/xxx/xxx.jpeg")
		readonly rollName: string	// Camera Block's assigned "roll name"
	})=>void): void;


	// Spot disconnected and must no longer be used
	subscribe(event: 'finish', listener: (sender: DisplaySpot)=>void): void;
}

/*	Spot type named "Visitor Spot" in Blocks UI. This corresponds to
	the URL used to connect many separate browsers (e.g., mobile
	phones). These may be either anonymous (in which case you can't
	interact with tmem individually from the server) or they may
	each have their own individual identity, depending on how the
	MobileSpot is configured. If it's configured to identify
	individual visitors, then use the 'visitor' event to learn
	when such individuals connect.
 */
export interface MobileSpot extends SpotGroupItem, BaseSpot {
	isOfTypeName(typeName: "MobileSpot"): MobileSpot | null;
	readonly individual: boolean;	// Supports individual visitor identity

	subscribe(event: 'spot', listener: (sender: MobileSpot, message:{
		readonly type:
			'DefaultBlock'|		// Default block changed (may be schedule)
			'PriorityBlock'|	// Priority block changed (may be schedule)
			'PlayingBlock'		// Actually playing block changed (always media)
	})=>void): void;

	/**
	 * Event fired when an individual visitor joins in or disconnects. For the
	 * Disconnect case, you must immediately sever all ties to that Visitor,
	 * and should not attempt to use it in any way.
	 */
	subscribe<RecordType extends RecordBase>(event: 'visitor', listener: (sender: MobileSpot, message:{
		readonly type:
			'Connected'|		// Visitor connected
			'Disconnected',		// Visitor disconnected (also indicated by Visitor's 'finish' event)
		readonly visitor: Visitor<RecordType>	// The visitor this event pertains to
	})=>void): void;

	/**
	 *	Event fired when image is received from Camera block on Spot. If you're using
	 *	individual visitors	(as reported through the 'visitor' event above), then
	 *	the	Visitor object will receive the 'image' event first, and then the
	 *	enclosing MobileSpot will receive it. In general, you should handle this
	 *	event EITHER at the Visitor level OR the MobileSpot - not both.
	 */
	subscribe(event: 'image', listener: (sender: MobileSpot, message: {
		readonly filePath: string,	// Path to file just received (typically "/temp/xxx/xxx.jpeg")
		readonly rollName: string	// Camera Block's assigned "roll name"
	})=>void): void;

	// Spot disconnected and must no longer be used
	subscribe(event: 'finish', listener: (sender: MobileSpot)=>void): void;
}

/**
 * A MobileSpot's individual Visitor and any associated data record. A data record
 * will always be provided if the mobile phone is the primary means of identification. If
 * the mobile phone is secondary (e.g., when using RFID tag as primary means of
 * identification), my identity can be used as a secondary identification field in
 * RecordType, with the name of this field specified in the Visitor Spot's configuration.
 * It's then your responsibility to assign the visitor's identity (a string) to that
 * field in the data record. Once done, the data record will subsequently be looked up
 * and provided automatically.
 */
export interface Visitor<RecordType extends RecordBase> extends ControllableSpot {

	readonly identity: string;		// Persistent, system-unique visitor (e.g. mobile phone) identifier
	readonly record: RecordType | null;		// Associated data record, if any

	/**
	 *	Event fired when various spot state changes occur.
	 */
	subscribe(event: "spot", listener: (sender: Visitor<RecordType>, message:{
		readonly type:
			'DefaultBlock'|		// Default block changed
			'PriorityBlock'|	// Priority block changed
			'PlayingBlock'		// Actually playing block changed
	})=>void): void;

	/**
	 *	Event fired when Locator changes location of spot.
	 */
	subscribe(event: 'location', listener: (sender: Visitor<RecordType>, message: {
		readonly location: string	// New location, as Spot path, or empty string if left location
	})=>void): void;

	/**
	 *	Event fired when image is received from Camera block on Spot.
	 */
	subscribe(event: 'image', listener: (sender: Visitor<RecordType>, message: {
		readonly filePath: string,	// Path to file just received (typically "/temp/xxx/xxx.jpeg")
		readonly rollName: string	// Camera Block's assigned "roll name"
	})=>void): void;

	/**
	 *	Event fired when user navigates manually to a block path
	 */
	subscribe(event: 'navigation', listener: (sender: Visitor<RecordType>, message: {
		readonly targetPath: string,	// Path navigated to
		readonly foundPath: string		// Resulting absolute (//-style) and canonized path
	})=>void): void;


	// Visitor disconnected and must no longer be used
	subscribe(event: 'finish', listener: (sender: Visitor<RecordType>)=>void): void;
}

// Spot type named "Location" in Blocks UI
export interface VirtualSpot extends SpotGroupItem, BaseSpot, GeoZonable  {
	isOfTypeName(typeName: "VirtualSpot"): VirtualSpot | null;

	subscribe(event: "spot", listener: (sender: VirtualSpot, message:{
		type:
			'DefaultBlock'|		// Default block changed (may be schedule)
			'PriorityBlock'|	// Priority block changed (may be schedule)
			'PlayingBlock' |	// Actually playing block changed (always media)
			'Active'			// Spot activated by accessing its Location ID
	})=>void): void;

	/**
	 * Get any geolocation assoctaed with spot, or null if none.
	 */
	getGeoZone(): GeoZone|null;

	// Spot disconnected and must no longer be used
	subscribe(event: 'finish', listener: (sender: VirtualSpot)=>void): void;
}

export interface GeoZonable {
	/**
	 * Get any geolocation assoctaed with spot, or null if none.
	 */
	getGeoZone(): GeoZone|null;
}

/**
 * Optonal GeoZone information that may be available on DisplaySpot and VirtualSpot.
 */
export interface GeoZone {
	readonly latitude: number;
	readonly longitude: number;
	readonly radius: number;	// In meters
}
