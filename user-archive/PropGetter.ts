/*
 * Copyright (c) 2020 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */
import {Script, ScriptEnv} from "system_lib/Script";
import {Realm} from "system/Realm";
import {Spot} from "system/Spot";
import {resource} from "system_lib/Metadata";


/**
 * Example user script showing how to read some system properties using an HTTP request rather than
 * the general-purpose websocket-based pub-sub mechanism.
 */
export class PropGetter extends Script {
	public constructor(env: ScriptEnv) {
		super(env);
	}

	/**
	 * Read arbitrary Realm property, by passing in either the variable or task group and name
	 * to obtain.
	 */
	@resource()
	public readTaskItem(fetchSpec: TaskItemSpec): any {
		const realm = Realm[fetchSpec.realmName];
		var result: any;
		if (fetchSpec.varName)
			result = realm.variable[fetchSpec.varName].value;
		else
			result = realm.group[fetchSpec.groupName][fetchSpec.taskName].running;
		return result;
	}

	/**
	 * Read arbitrary Spot property, by passing in the spot name or path (if in group(s))
	 * in fetchSpec.spotPath, and its property name in fetchSpec.propName
	 */
	@resource()
	public readSpotState(fetchSpec: SpotItemSpec): any {
		const spotListItem: any = Spot[fetchSpec.spotPath];
		return spotListItem[fetchSpec.propName];
	}
}

/**
 * Object passed in to readTaskItem to read Realm-related stuff.
 */
interface TaskItemSpec {
	realmName: string;		// Realm to read from

	groupName?: string;		// Group and task name, if to get task's state
	taskName?: string;

	varName: string;		// Variable name if to get variable value
}

/**
 * Object passed in to readSpotState to read Spot-related stuff.
 */
interface SpotItemSpec {
	spotPath: string;			// Full path to the spot to query
	propName: string;			// Name of property to read
}