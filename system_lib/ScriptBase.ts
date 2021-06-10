/*
 * Copyright (c) 2018 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {SetterGetter, SGOptions} from "system/PubSub";


interface Ctor<T> { new(... args: any[]): T ;}
/**
 * Common stuff shared between user scripts and drivers.
 */
export class ScriptBase<FC extends ScriptBaseEnv> implements ChangeNotifier {
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
	 * Simply returns arr if already appears to be fine.
	 */
	makeJSArray<T>(arrayLike: IndexedAny<T>): T[] {
		if (Array.isArray(arrayLike) && arrayLike.sort && arrayLike.splice)
			return arrayLike;	// Already seems like a bona fide JS array

		const realArray: T[] = [];
		const length = arrayLike.length;
		for (var i = 0; i < length; ++i)
			realArray.push(arrayLike[i]);
		return realArray;
	}
}

/**	Inform others that propName has changed, causing any
 *	subscribers to be notified.
 */
interface ChangeNotifier {
	changed(propName: string): void;
}

/**
 * Base your IndexedProperty elements on this class to support "changed" notifications, like
 * in the top level script/driver object.
 */
export class AggregateElem implements ChangeNotifier {
	private readonly __scriptFacade: ChangeNotifier;	// Internal use only!

	changed(propName: string): void {
		this.__scriptFacade.changed(propName);
	}
}

// An array-like type having "index signature" and a length property
type IndexedAny<T> = { [index:number]: T; readonly length: number };

/**
 * An array-like type holding "indexed items".
 */
export interface IndexedProperty<T> {

	[index:number] : T;	// Read-only array-like with T

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
export interface ScriptBaseEnv extends ChangeNotifier  {
	unsubscribe(event: string, listener: Function): void;	// Unsubscribe to a previously subscribed event

	// Following are INTERNAL implementation details only. DO NOT CALL directly from scripts/drivers!
	changed(prop: string): void; // Named child property has changed
	property(name: string, options: SGOptions, gsFunc: SetterGetter<any>): void;
	indexedProperty<T>(name: string, elemType: Ctor<T>): T[];
}
