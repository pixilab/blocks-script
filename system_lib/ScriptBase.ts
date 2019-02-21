/*
 * Copyright (c) 2018 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {SetterGetter, SGOptions} from "system/PubSub";

/**
 * Common stuff shared between user scripts and drivers.
 */
export class ScriptBase<FC extends ScriptBaseEnv> {
	protected readonly __scriptFacade: FC;	// Internal use only!

	constructor(scriptFacade: FC) {
		this.__scriptFacade = scriptFacade;
	}

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

	/**	Inform others that prop has changed, causing any
	 *	subscribers to be notified soon.
	 */
	changed(prop: string|Function): void {
		this.__scriptFacade.changed(prop);
	}
}

// Internal implementation - not for direct client access
export interface ScriptBaseEnv {
	property(p1: any, p2?: any, p3?: any): void;
	changed(prop: string|Function): void;
	firePropChanged(prop: string): void;
}
