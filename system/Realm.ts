/*
	The Realm top level object containing all groups, tasks and variables.

 	Copyright (c) 2019 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */


export var Realm: {
	[realmName: string]: {	// Realms, by name
		group: {
			[groupName: string]: TaskGroup	// Groups, by name
		};

		variable: {
			[variableName: string]: {	// Realm variables, by name
				value: number|string|boolean;		// Variable's value
			}
		}
	}
};

export interface TaskGroup {
	[taskName: string]: Task;
}

export interface Task {
	running: boolean;	// True if the task is running
}
