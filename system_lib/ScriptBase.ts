/*
 * Copyright (c) 2018 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {SetterGetter, SGOptions} from "system/PubSub";
import {PropertyAccessor} from "./Script";


interface Ctor<T> { new(... args: any[]): T ;}

export type PrimitiveValue = number | string | boolean;

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
	property<T extends PrimitiveValue>(name: string, options: SGOptions, gsFunc: SetterGetter<T>): PropertyValue<T> {

		// Make assignment work also for direct JS use
		const propDescriptor: TypedPropertyDescriptor<T> & ThisType<any> = {
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
		return this.__scriptFacade.property(name, options, gsFunc);
	}

	/**
	 * Expose a named and indexed property of object type T.
	 *
	 * IMPORTANT: The name specified  MUST be identical to
	 * the instance variable name used to hold this indexed
	 * property, or the property won't be found by task
	 * expressions or other scripts.
	 *
	 * NOTE: T should normally extend AggregateElem, allowing
	 * you to use explicit change notification. Not enforced
	 * here for backward compatibility, since that wasn't
	 * the case early on.
	 */
	indexedProperty<T /* extends AggregateElem */>(
		name: string, 		// Name of the indexed property
		itemType: Ctor<T>	// Type of elements held
	): IndexedProperty<T> {
		return this.__scriptFacade.indexedProperty(name, itemType);
	}

	/**
	 * Expose a named property acting as a dictionary for named
	 * sub-objects of type T exposing properties of their own.
	 *
	 * IMPORTANT: The name specified  MUST be identical to
	 * the instance variable name used to hold this aggregate
	 * property, or the property won't be found by task
	 * expressions or other scripts.
	 */
	namedAggregateProperty<T extends AggregateElem>(
		name: string, 		// Property holding the aggregates
		itemType: Ctor<T>	// Type common to all aggregates held
	): Dictionary<T> {
		return this.__scriptFacade.namedAggregate(name, itemType);
	}

	/**	Inform others that prop has changed, causing any
	 *	subscribers to be notified soon.
	 */
	changed(propName: string): void {
		this.__scriptFacade.changed(propName);
	}

	/**
	 * Connect to the property at the specified full (dot-separated) path. Pass
	 * a callback function to be notified when the value of the property changes.
	 * Returns an object that can be used to read/write the property's value,
	 * as well as close down the connection to the property once no longer
	 * needed.
	 *
	 * The value associated with the property varies with the type of property.
	 *
	 * IMPORTANT: Unlike object-specific "subscribe" methods, a property
	 * connection established through this function will persist across any
	 * recreation or reinitialization of any associated object. Thus, you
	 * must NOT repeat any getProperty call when an object emits a 'finish'
	 * event.
	 */
	getProperty<PropType extends PrimitiveValue>(
		fullPath: string,
		changeNotification?: (value: PropType)=>void
	): PropertyAccessor<PropType> {
		return changeNotification ?
			this.__scriptFacade.getProperty<PropType>(fullPath, changeNotification) :
			this.__scriptFacade.getProperty<PropType>(fullPath);
	}

	/**
	 * Disconnect specified listener function from specified event. Often,
	 * you don't need to unsubscribe explicitly, since subscriptions will
	 * auto-terminate when the object providing the subscription dies.
	 * But in some cases, you may want to unsubscribe explicitly, for
	 * instance when the subscribed-to information isn't needed any more,
	 * or if the subscribing object dies before the suscbribed-to object
	 * (which could otherwise cause callbacks into zombie objects and
	 * memory leaks).
	 *
	 * IMPORTANT: You MUST pass the VERY SAME function to unsibscribe
	 * as you passed to subscribe. Thus, when first subscribing, you may want
	 * to store that listener function in an instance variable, allowing you
	 * to subsequently unsubscribe from it through here. If this function
	 * needs to be a member function, use the "bind" function method to
	 * obtain a function bound to the proper this. Then use the result from
	 * bind in both the subscribe and unsignscribe calls, thus making
	 * sure they're referencing the very same function.
	 *
	 * https://javascript.info/bind
	 */
	unsubscribe(event: string, listener: Function): void {
		this.__scriptFacade.unsubscribe(event, listener);
	}

	/**
	 * Provide a monotonous millisecond current time readout. Unlike the value of Date.now(), which
	 * may jump when the system clock is adjusted (e.g., due to a daylight savings time switch),
	 * this monotonous clock increases monotonously, without any discontinuities.
	 */
	getMonotonousMillis() {
		return this.__scriptFacade.getMonotonousMillis();
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

// An array-like type having "index signature" and a length property
type IndexedAny<T> = { [index:number]: T; readonly length: number };

/**
 * Base your IndexedProperty elements on this class to support "changed" notifications, like
 * in the top level script/driver object. Not required if the indexed elements are
 * immutable (can not change while being used). If data can change, then use this as
 * the base class of your IndexedProperty elements, and call this.changed("fieldname")
 * from within the element when it's data is known to have changed, where fieldname is
 * the name of the field in the element. All fields in IndexedProperty elements must be
 * of primitive type (i.e., string, boolean or number).
 */
export class AggregateElem implements ChangeNotifier {
	private readonly __scriptFacade: ChangeNotifier;	// Internal use only!

	changed(propName: string): void {
		this.__scriptFacade.changed(propName);
	}
}

/**
 * An array-like type holding "indexed items".
 */
export interface IndexedProperty<T> extends IndexedAny<T> {
	readonly name: string;	// Name given to this indexed property

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
 * 	A simple, map-like type
 */
export interface Dictionary<TElem> { [id: string]: TElem; }

/**
 * A plain, typed, primitive property value accessor.
 */
export interface PropertyValue<PropType extends PrimitiveValue> {
	value: PropType;	// Current value (read only if property is read only)
}

/**
 * Base class for persistent records used to, e.g., track visitor journey, collecting
 * data along the way. Use decorators such as @field() @id() and @spotParameter() to
 * mark your custom fields added to your own subclass being used in your script.
 */
export abstract class RecordBase {
	readonly $puid: number;		// Persistent, system-unique identifier for this Record
	readonly $hasUserData: boolean; // Record has received data (else entirely unused)
}

/*	Common environment used by user scripts as well as device drivers
	These are INTERNAL implementation details, and may change.
	DO NOT CALL directly from any scripts/drivers! Always use base class
	equivalents.
 */
export interface ScriptBaseEnv extends ChangeNotifier  {
	property<PropType extends PrimitiveValue>(name: string, options: SGOptions, gsFunc: SetterGetter<any>): PropertyValue<PropType>;
	getProperty<PropType extends PrimitiveValue>(fullPath: string, changeNotification?: (value: any)=>void): PropertyAccessor<PropType>;
	unsubscribe(event: string, listener: Function): void;
	changed(prop: string): void;
	indexedProperty<T>(name: string, elemType: Ctor<T>): IndexedProperty<T>;
	namedAggregate<T>(name: string, elemType: Ctor<T>): Dictionary<T>;
	reInitialize(): void;
	getMonotonousMillis(): number;
}

