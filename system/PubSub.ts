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
 * Specifies a primitive type, either by its global "constructor" function, or as a string.
 * Valid examples include Number, Boolean, "Boolean", String, "String".
 */
export type PrimTypeSpecifier = NumberConstructor|BooleanConstructor|StringConstructor|"Number"|"Boolean"|"String";

/**
 * An object of this class can be required under the PubSub name, allowing you
 * to hook up script properties and listeners.
 */
interface PubSubber {

	/**	Define a property of type T with specified options and name.
	 */
	property<T>(name: string, options: SGOptions, setGetFunc: SetterGetter<T>):void;

	/**	Define a property of type T with specified options and its name
	 defined by the name of the setGetFunction.
	 */
	property<T>(options: SGOptions, setGetFunc: SetterGetter<T>):void;

	/**	Define a property of type T with default options and its name defined
	 	by the name of the setGetFunction.
	 */
	property<T>(setGetFunc: SetterGetter<T>):void;

	/**
	 * Notify PubSub system that property with propName has changed, causing any
	 * subscribers to be notified soon.
	 */
	changed(propName:string):void;

	/**
	 * Define a named message listener function with accepting a message of type T.
	 */
	listener<T>(name: string, listenerFunc: Listener<T>):void;

	/**
	 * Define a message listener function accepting a message of type T, its name
	 * defined by the name of the listenerFunc.
	 */
	listener<T>(listenerFunc: Listener<T>):void;
}


/**
 * A function to set or get a value. If the parameter is missing, then it is considered a
 * getter, else it is considered a setter.
 */
interface SetterGetter<T> {
	(setValue?:T):T;
}

/**
 * Options for setter/getter.
 */
interface SGOptions {
	type?: PrimTypeSpecifier;	// Default is string
	readOnly?: boolean;			// Default is read/write
}

/**
 * A listener function. I.e., one that can be told a message with parameters of a specific type.
 * Allows arbitrary message to be passed into a script through the PubSub mechanism.
 */
interface Listener<T> {
	(message?:T):void;
}

