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
	type?: PropTypeSpecifier;	// Default is string
	description?: string;		// Descriptive text for property
	readOnly?: boolean;			// Default is read/write
	min?: number;				// Allowed range (Number property type only)
	max?:number;
}

/**
 * Specifies a primitive type, either by its global "constructor" function, or as a string.
 */
export type PrimTypeSpecifier =
	NumberConstructor
	| BooleanConstructor
	| StringConstructor
	| "Number"
	| "Boolean"
	| "String";

/**
 * Extend with additonal non-primitive property type(s).
 */
export type PropTypeSpecifier = PrimTypeSpecifier
	| "TimeFlow";
