/*
	A Blocks user script to trigger tasks from a web page.

 	Copyright (c) 2020 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {Script, ScriptEnv} from "system_lib/Script";
import {Realm} from "system/Realm";
import {SimpleFile} from "system/SimpleFile";
import {resource} from "system_lib/Metadata";


/*	Optional cofiguration JSON file structure. Specifies the name of the realm in which
	tasks can be accessed. The "group" setting, if specified, further restricts the set
	of allowed tasks to those in that group only (else group can be specified interface
	in TaskPar). Read from "script/files/WebTask.json".
*/
interface Config {
	// Name of realm in which task may be triggered. Default is "Public"
	realm: string;

	/*	If specified, only tasks in this group may be triggered.
	 	Else group can also be specified in TaskPar. Default is "Web".
	*/
	group?: string;
}


// Expected parameter to the start function
interface TaskPar {
	task: string;		// Name of the task to run
	group?:string;		// Task group name (not required if group specified in Config)
}

export class WebTask extends Script {
	private config: Config;

	public constructor(env: ScriptEnv) {
		super(env);

		// Attempt to read configuation file, using defailt values if fails
		const configFileName = "WebTask.json";
		SimpleFile.readJson(configFileName).then(
			readConfig => this.config = readConfig
		).catch(error =>
			console.warn("Configuration not found", configFileName, error, "- using defaults.")
		);

		// Check that we've got config with at least a realm specified, else set default
		if (!this.config || !this.config.realm) {
			console.warn("Missing/invalid", configFileName, "using default configuration");
			this.config = {
				realm: "Public",	// Default config values
				group: "Web"
			};
		}
	}

	/**	Start a task in the preconfigured realm, by name specified in param and group
	 	specified either in config or in param (config takes precedence).
	 */
	@resource()
	start(param: TaskPar) {
		const realm = Realm[this.config.realm];
		if (realm) {
			const groupName = this.config.group || param.group;
			const group = realm.group[groupName];
			if (group) {
				const task = group[param.task];
				if (task) // Found the task to start - do so
					task.running = true;
				else
					throw("No task named " + param.task);
			} else
				throw("No group named " + groupName);
		} else
			throw("No realm named " + this.config.realm);
	}
}
