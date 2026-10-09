/**	Core functionality provided by Blocks' runtime environment, available to drivers and
 	user scripts.

	Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
	Created 2017 by Mike Fahl.
*/


/**	Make a promise that will be fulfilled after milliseconds. If you change your
	mind and no longer want the promise to fire after the specified time, just
	call cancel() on the returned CancelablePromise.
 */
declare function wait(milliseconds: number): CancelablePromise<void>;

/**	Perform callback as soon as possible, but not during the current "event cycle".
 */
declare function asap(callback: Function): void;


/** Log functions take one or many values, which will be concatenated
 	with a space as separator.
 */
interface Console {
	log(...toLog: any[]): void;			// Synonymous with info
	info(...toLog: any[]): void;		// Log as info message
	error(...toLog: any[]): void;		// Log as error message
	warn(...toLog: any[]): void;		// Log as warning message
}
declare var console: Console;	// Globally accessible through "console"

/**	A promise that can be cancelled, causing it to be rejected immediately with
	a "cancelled" error message. When cancel is called on the promise, its
	"cancellor" function will be called, which should at the very least
	reject the promise.
 */
declare class CancelablePromise<T> extends Promise<T> {
	constructor(callback: promiseCallback<T>, cancellor: () => void);
	cancel(): void;
}

interface Thenable<T> {
	then<U>(onFulfilled?: (value: T) => U | Thenable<U>, onRejected?: (error: any) => U | Thenable<U>): Thenable<U>;
	then<U>(onFulfilled?: (value: T) => U | Thenable<U>, onRejected?: (error: any) => void): Thenable<U>;
	catch<U>(onRejected?: (error: any) => U | Thenable<U>): Thenable<U>;
}

/**	If you call resolve in the body of the callback passed to the constructor,
	your promise is fulfilled with result object passed to resolve
	If you call reject your promise is rejected with the object passed to reject
	For consistency and debugging (eg stack traces), obj should be an instanceof Error
	Any errors thrown in the constructor callback will be implicitly passed to reject().
*/
interface promiseCallback<T> {
	(resolve: (value?: T | Thenable<T>) => void, reject: (error?: any) => void): void
}

// Standard "require" function for requiring modules, as expected by TypeScript's module implementation
declare function require(name: string): any;

/**
 * Global API for encoding/decoding strings to/from Base64.
 */
interface Base64EncoderDecoder {
	encode(str: string): string;
	decode(str: string): string;
}
declare var base64: Base64EncoderDecoder;


/**
 * Data indicating a time position and rate. Used for playback,
 * timing and synchronization purposes. All time valus in mS. The rate
 * is in seconds per second (nominally 1 if time is moving normally, or 0 if
 * time is standing still). Also includes some generally useful, time-related
 * constants and functions.
 */
declare class TimeFlow  {
	readonly currentTime: number;	// Time now, extrapolated from most recent data
	readonly position: number;		// Time position most recently reported, in mS
	readonly rateUnknown?: boolean;	// The rate field is unknown/undefined
	readonly rate: number;			// Time rate, unless rateUnknown. Seconds per second (0 is stopped)
	readonly end:number;			// End time, if known, else 0
	readonly dead: boolean;			// TimeFlow is invalid - do not use any of its values

	readonly serverTime?: number;	// Corresponding server time (mS, monotonous)

	constructor(
		position: number, 	// Time position, in mS
		rate: number, 		// 1 for playing at normal rate, 0 for paused
		end?: number, 		// End time, if known
		dead?: boolean, 	// Time data not available if true
		/*	System time (from this.getMonotonousMillis() in a script).
			Normally, you don't need to pass this, but may be useful in
			some critical cases where times must match exactly.
		 */
		monotonousSysTimeNow?: number
	);

	/*	Similar to currentTime, but extrapolates to specified monotonousSysTimeNow.
		This serves a similar purpose as the monotonousSysTimeNow constructor
		parameter in supplying the "current" systsm time explicitly rather than
		obtaining it internally, and may be useful when precise extrapolation is
		required.
	 */
	extrapolate(monotonousSysTimeNow: number): number;


	/*	Following are some useful constants and functions. Not really limited to
		TimeFlow, but often used in conjunction.
	 */
	static readonly SecondsPerMinute: number;	//  = 60
	static readonly MinutesPerHour: number;		//  = 60
	static readonly HoursPerDay : number;		// = 24
	static readonly Second: number;	// Milliseconds per second; = 1000
	static readonly Minute: number;	// Millseconds per minute; = Second * SecondsPerMinute
	static readonly Hour: number;	// Millseconds per hour;  = Minute * MinutesPerHour
	static readonly Day: number;	// Millseconds per day; = HoursPerDay * Hour

	/**	Convert timeInMilliseconds to a string in the format HH:MM:SS.fff.
	 If no format specified, always return at least seconds.fractions, else return
	 only the parts specified by the format, which may contain either of "hmsf"
	 characters.
	 */
	static millisToString(timeInMilliseconds: number, format?: string): string;

	/**	Convert time from str to milliseconds. If format is set to "hm",
	 the string 12:30 will be parsed as hours and minutes, otherwise
	 seconds is the default base, wih minutes and hours separated by colon,
	 and fractions (up to three digits) by a period.
	 */
	static stringToMillis(str: string, format?: string): number
}

// General-purpose "custructor" function type
interface Ctor<T> { new(... args: any[]): T ;}

// Enhance Reflect with legacy functions still in use
declare namespace Reflect {
	function defineMetadata(metadataKey: any, metadataValue: any, target: Object): void;
	function defineMetadata(metadataKey: any, metadataValue: any, target: Object, propertyKey: string | symbol): void;
}
