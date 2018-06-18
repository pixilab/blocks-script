/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2018 by Mike Fahl.
 */

import {SetterGetter, SGOptions} from "system/PubSub";
import {ScriptBase, ScriptBaseEnv} from "system_lib/ScriptBase";

/**
 Ultimate base class for all TypeScript based user scripts.
 */
export class Script extends ScriptBase<ScriptEnv> {

	/** Expose a dynamic property of type T with specified options and name.
	 */
	property<T>(name: string, options: SGOptions, setGetFunc: SetterGetter<T>): void {
		this.__scriptFacade.property(name, options, setGetFunc);

		// A little dance to make this work also for direct JS-style assignment
		Object.defineProperty(this.constructor.prototype, name, {
			get: function () {
				return setGetFunc();
			},
			set: function (value) {
				if (!options.readOnly) {
					const oldValue = setGetFunc();
					if (oldValue !== setGetFunc(value))
						this.__scriptFacade.firePropChanged(name);
				}
			},
			enumerable: true,
			configurable: true
		});
	}

	/**
	 * Establish a named channel associated with this script, with optional "data received
	 * on channel" handler function.
	 */
	establishChannel(leafChannelName: string, callback?: (data: string)=>void) {
		if (callback) {
			this.__scriptFacade.establishChannel(leafChannelName, function (sender:any, axon:any) {
				callback(axon.data);
			});
		} else
			this.__scriptFacade.establishChannel(leafChannelName);
	}

	/**
	 * Send data on my named channel.
	 */
	sendOnChannel(leafChannelName: string, data: string) {
		this.__scriptFacade.sendOnChannel(leafChannelName, data);
	}
}


// Internal implementation - not for direct client access
export interface ScriptEnv extends ScriptBaseEnv {
	property(p1: any, p2?: any, p3?: any): void;

	establishChannel(name: string):void;
	establishChannel(name: string, listener: Function): void;
	sendOnChannel(name: string, data: string):void;
}