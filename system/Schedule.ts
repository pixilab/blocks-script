/*	Access to Schedule block's data, firstly under under its group and
	then under its individual name (e.g., using dot notation or
	array-style notation).

	Copyright (c) 2025 PIXILAB Technologies AB, Sweden (http://pixilab.se).
	All Rights Reserved.
*/

export var Schedule: { [groupName: string]: Group; };

// Group level, accessed by name from the global Schedule root above.
export interface Group {
	[name: string]: Schedule;	// Specific Timeline, by name
}

/**
 * Schedule block scripting API.
 */
export interface Schedule {
	readonly block: string;	// Current group/block, or empty string if none
}
