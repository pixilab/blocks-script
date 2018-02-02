/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

/*	Object required by scripts to access the PubSub mechanism.
 */

/*	Main entry point for me.
 */
export var PubSub: PubSubber;


/**
 * An object of this class can be required under the PubSub name, allowing you
 * to hook up script properties and listeners.
 */
interface PubSubber {

	/**    Expose a property of type T with specified options and name.
	 */
	property<T>(name: string, options: SGOptions, setGetFunc: SetterGetter<T>): void;

	/**    Expose a property of type T with specified options and its name
	 defined by the name of the setGetFunction.
	 */
	property<T>(options: SGOptions, setGetFunc: SetterGetter<T>): void;

	/**    Expose a property of type T with default options and its name defined
	 by the name of the setGetFunction.
	 */
	property<T>(setGetFunc: SetterGetter<T>): void;

	/**
	 * Inform others that property with propName has changed, causing any
	 * subscribers to be notified soon.
	 */
	changed(propName: string): void;

	/**
	 * Expose a callable function with specified name, accepting a single parameter
	 * of type T.
	 * DEPRECATED: Use @callable instead.
	 */
	listener<T>(name: string, listenerFunc: Listener<T>): void;

	/**
	 * Expose a callable function with its name defined by the name of the listenerFunc,
	 * accepting a single parameter of type T.
	 * DEPRECATED: Use @callable instead.
	 */
	listener<T>(listenerFunc: Listener<T>): void;
}


/**
 * A function that will set the value if its parameter is defined. Always returns the current value.
 */
export interface SetterGetter<T> {
	(setValue?: T): T;
}

/**
 * Options for setter/getter.
 */
export interface SGOptions {
	type?: PrimTypeSpecifier;	// Default is string
	readOnly?: boolean;			// Default is read/write
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

/**
 * A callable function accepting a single parameter of type T.
 */
interface Listener<T> {
	(message?: T): void;
}

