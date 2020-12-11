/*
 * Miscellaneous declarations related to property publish/subscribe script implementation.
 *
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */


/**
 * A function that will set the value if its parameter is defined.
 * Always returns the current value.
 */
export interface SetterGetter<T> {
	(setValue?: T): T;
}

/**
 * Options for property setter/getter.
 */
export interface SGOptions {
	type?: PrimTypeSpecifier;	// Default is string
	description?: string;		// Descriptive text for property
	readOnly?: boolean;			// Default is read/write
	min?: number;				// Allowed range (Number property type only)
	max?:number;
}

/**
 * Specifies a primitive type, either by its global "constructor" function, or as a string.
 * Valid examples include Number, Boolean, "Boolean", String, "String".
 */
export type PrimTypeSpecifier =
	NumberConstructor
	| BooleanConstructor
	| StringConstructor
	| "Number"
	| "Boolean"
	| "String";


/*
 * REMAINDER IS DEPRECATED FOR REMOVAL!
 * These features should *not* be used for class-based
 * custom script development. Use property() and changed() provided through the
 * base-class instead, and use the @property and @callable annotations
 * to expose static properties and functions.
 *
interface PubSubber {
	property<T>(name: string, options: SGOptions, setGetFunc: SetterGetter<T>): void;
	property<T>(options: SGOptions, setGetFunc: SetterGetter<T>): void;
	property<T>(setGetFunc: SetterGetter<T>): void;
	changed(propName: string): void;
	listener<T>(name: string, listenerFunc: Listener<T>): void;
	listener<T>(listenerFunc: Listener<T>): void;
}
export var PubSub: PubSubber;
interface Listener<T> {(message?: T): void;}
*/
