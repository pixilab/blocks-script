/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

/// <reference path = 'PIXI.d.ts' />

/**
 * Access Spot subsystem known by system by its assigned name.
 */
export var Spot: SpotGroup;

/**
 Marker interface for items that can live in a SpotGroup (including other SpotGroups)
 */
interface SpotGroupItem {
}

interface SpotGroup extends SpotGroupItem {
	[name: string]: SpotGroupItem;
}

export interface DisplaySpot extends SpotGroupItem {

	isOfTypeName(typeName: string): DisplaySpot|null;	// Check subtype by name

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

	/**
	 * Turn power on/off, if possible.
	 */
	power: boolean;

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
	 */
	gotoPage(path: string): void;

	/**
	 * Restore tags to those specified in the Spot's configuration.
	 */
	resetTags(): void;

	/**
	 * Force set of tags to only those specified (comma separated).
	 */
	forceTags(tags: string): void;

	subscribe(event: "connect", listener: (sender: DisplaySpot, message:{
		type:
			'Connection'|		// Connection state changed (check with isConnected)
			'ConnectionFailed'	// Connection attempt failed
	})=>void): void;

	subscribe(event: "spot", listener: (sender: DisplaySpot, message:{
		type:
			'DefaultBlock'|		// Default block changed (may be schedule)
			'PriorityBlock'|	// Priority block changed (may be schedule)
			'PlayingBlock'|		// Actually playing block changed (always media)
			'InputSource'|		// Input source selection changed
			'Volume'|			// Audio volume changed
			'Active'|			// Actively viewed state changed
			'Playing'			// Is playing (vs paused)
	})=>void): void;

	unsubscribe(event: string, listener: Function): void;
}
