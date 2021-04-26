/*
 * Copyright (c) 2018 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {SetterGetter, SGOptions} from "system/PubSub";


interface Ctor<T> { new(... args: any[]): T ;}
/**
 * Common stuff shared between user scripts and drivers.
 */
export class ScriptBase<FC extends ScriptBaseEnv> {
	protected readonly __scriptFacade: FC;	// Internal use only!

	constructor(scriptFacade: FC) {
		this.__scriptFacade = scriptFacade;
	}

	/** Expose a named property of primitive type T with specified options and getter/setter function.
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
						this.__scriptFacade.changed(name);
				}
			});
		}
	}

	/**
	 * Expose a named and indexed property of object type T.
	 *
	 * IMPORTANT: The name you specify here MUST be identical to
	 * the instance variable name used to hold this indexed
	 * property, or the property won't be found by task
	 * expressions or other scripts.
	 */
	indexedProperty<T>(
		name: string, 		// Name of the indexed property
		itemType: Ctor<T>	// Type of elements held
	): IndexedProperty<T> {
		return this.__scriptFacade.indexedProperty(name, itemType);
	}

	/**	Inform others that prop has changed, causing any
	 *	subscribers to be notified soon.
	 *
	 *  NOTE: I used to alternatively accept a function (then using its
	 *  name) in Blocks <= 4.3. Newer code should use property name
	 *  only (while the underlying implementation will still accept
	 *  a function for the forseeable future for the sake of
	 *  backward compatibility)
	 */
	changed(propName: string): void {
		this.__scriptFacade.changed(propName);
	}

	/**
	 * Forward any event unsubscription to my associated facade.
	 */
	unsubscribe(event: string, listener: Function): void {
		this.__scriptFacade.unsubscribe(event, listener);
	}

	/**
	 * Turn an array-like object into a proper JavaScript array, which is returned.
	 * Simply returns arr if already is fine.
	 */
	makeJSArray(arr: any[]) {
		if (Array.isArray(arr))
			return arr;	// Already seems kosher
		/*	Casts below required to convince TS compiler that arr is indeed
			sufficiently array-like to provide length and indexed access,
			even past the isArray check above.
		 */
		const result = [];
		const length = (<any[]>arr).length;
		for (var i = 0; i < length; ++i)
			result.push((<any[]>arr)[i]);
		return result;
	}
}


/**
 * An array-like type holding "indexed items".
 */
export interface IndexedProperty<T> {

	[index:number] : T;	// Read-only array-like object

	/**
	 * Add an item to my list. Items can not be removed, and will be published
	 * with an index range corresponding to the number of elements.
	 */
	push(item: T): void


	/**
	 * Number of items in me.
	 */
	length: number;
}

// Common environment used by user scripts as well as device drivers
export interface ScriptBaseEnv  {
	unsubscribe(event: string, listener: Function): void;	// Unsubscribe to a previously subscribed event

	// Following are INTERNAL implementation details only. DO NOT CALL directly from scripts/drivers!
	changed(prop: string): void; // Named child property has changed
	property(name: string, options: SGOptions, gsFunc: SetterGetter<any>): void;
	indexedProperty<T>(name: string, elemType: Ctor<T>): T[];
}
