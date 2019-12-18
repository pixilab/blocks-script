/*
	The Realm top level object containing all groups, tasks and variables.

 	Copyright (c) 2019 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

export var Realm: { [realmName: string]: {	// Realms, by name
	group: {[groupName: string]: {			// Task groups, by name
		[taskName: string]: {				// Tasks in group, by name
			running: boolean;				// True if the task is running
		}
	}};
	variable: {[variableName: string]: {	// Realm variables, by name
		value: number|string|boolean;		// Variable's value
	}}
}};
