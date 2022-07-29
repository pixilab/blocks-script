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

	/** Expose a named property of type T with specified options and getter/setter function.
	 */
	property<T>(name: string, options: SGOptions, gsFunc: SetterGetter<T>): void {
		this.__scriptFacade.property(name, options, gsFunc);

		// Make assignment work also for direct JS use
		const propDescriptor: PropertyDescriptor & ThisType<any> = {
			get: function () {	// Always define getter
				return gsFunc();
			}
		};
		if (!options || !options.readOnly) {	// Read/write
			propDescriptor.set = function (value) {	// Define setter also
				const oldValue = gsFunc();	// Detect change and fire notification
				if (oldValue !== gsFunc(value)) // Always obains new value
					this.__scriptFacade.changed(name);
			};
		}
		// defineProperty on 'this', not on prototype, as gsFunc is instance-specific
		Object.defineProperty(this, name, propDescriptor);
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
	 Allows a script/driver to request reinitialization of itself.
	 This can be useful in cases where configuration has been changed in such
	 a way that the script needs to be re-instantiated. E.g., to change its
	 set of dynamic properties. While dynamic properties can be ADDED at any time,
	 they can not be revoked or replaced. If you need to do so, call reInitilize
	 and your script's constructor will be called to initialize a new instance
	 afresh.
	 */
	public reInitialize() {
		this.__scriptFacade.reInitialize();
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
export interface IndexedProperty<T> extends IndexedAny<T> {
	[index:number] : T;	// Read-only "array-like", holding objects of type T

	/**
	 * Number of items in me.
	 */
	length: number;

	/**
	 * Append item to the end of the list.
	 */
	push(item: T): void

	/**
	 * Insert item at offs position in the list.
	 */
	insert(offs: number, item:T): void

	/**
	 * Remove deleteCount items starting from offs, where deleteCount
	 * must be a positive integer
	 */
	remove(offs: number, deleteCount: number): void

	/**
	 * Sort items in me in place, based on what the function returns.
	 * A return value > 0 sorts rhs before lhs.
	 * A return value < 0 sorts lhs before rhs.
	 * A return value === 0 keeps the original order of lhs and rhs.
	 */
	sort(compareFn: (lhs: T, rhs: T) => number): void;
}

/**
 * Base class for persistent records used to, e.g., track visitor journey, collecting
 * data along the way.
 */
export abstract class RecordBase {
	readonly $puid: number;		// Persistent, system-unique identifier for this Record
}

/*	Common environment used by user scripts as well as device drivers
	These are INTERNAL implementation details, and may change.
	DO NOT CALL directly from scripts/drivers!
 */
export interface ScriptBaseEnv extends ChangeNotifier  {
	unsubscribe(event: string, listener: Function): void;	// Unsubscribe to a previously subscribed event
	changed(prop: string): void; // Named child property has changed
	property(name: string, options: SGOptions, gsFunc: SetterGetter<any>): void;
	indexedProperty<T>(name: string, elemType: Ctor<T>): IndexedProperty<T>;
	reInitialize(): void;
}

