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

	/** Expose a dynamic property of type T with specified name and options.
	 */
	property<T>(name: string, options: SGOptions, gsFunc: SetterGetter<T>): void {
		this.__scriptFacade.property(name, options, gsFunc);

		// Make assignment work also for direct JS use (instance-specific, so apply to 'this')
		if (options && options.readOnly) {	// Define as read-only
			Object.defineProperty(this, name, {
				get: function () {
					return gsFunc();
				}
			});
		} else {	// Define as R/W
			// defineProperty on 'this', not on prototype, as gsFunc is instance-specific
			Object.defineProperty(this, name, {
				get: function () {
					return gsFunc();
				},
				set: function (value) {
					const oldValue = gsFunc();
					if (oldValue !== gsFunc(value))
						this.__scriptFacade.firePropChanged(name);
				}
			});
		}
	}

	/**	Inform others that prop has changed, causing any
	 *	subscribers to be notified soon.
	 */
	changed(prop: string|Function): void {
		this.__scriptFacade.changed(prop);
	}

	/**
	 * Turn an array-like object into a proper JavaScript array, which is returned.
	 * Simply returns arr if already is fine.
	 */
	makeJSArray(arr: any[]) {
		if (Array.isArray(arr))
			return arr;	// Already seems kosher

		const arrayLike: any[] = arr; // Needed since TS compiler thinks it knows better
		const result = [];
		for (var i = 0; i < arrayLike.length; ++i)
			result.push(arrayLike[i]);
		return result;
	}
}

// Common script environment used by all script objects
export interface ScriptBaseEnv {
	unsubscribe(event: string, listener: Function): void;	// Unsubscribe to a previously subscribed event

	// Following are internal implementation details - not for direct client access
	property(p1: any, p2?: any, p3?: any): void;
	changed(prop: string|Function): void;
	firePropChanged(prop: string): void;
}
