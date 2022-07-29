/**	Core functionality provided by Blocks' runtime environment, available to drivers and
 	user scripts.

	Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
	Created 2017 by Mike Fahl.
*/


/**	Make a promise that will be fulfilled after milliseconds.
 */
declare function wait(milliseconds: number): CancelablePromise<void>;

/**	Perform callback as soon as possible, but not at the current "event cycle".
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


/**	A Promise generally manages the future completion/failure of lengthy tasks. It is
	returned in cases where the result typically can't be provided immediately. The eventual
	outcome/failure will then instead trigger a callback. Promises are chainable in that
	the callback from one fulfillment can in its turn return a promise, and so on.
	Learn more about Promises here:
	https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
*/
// @ts-ignore // the fact that Promise may also be declared elsewhere
declare class Promise<T> implements Thenable<T> {
	constructor(callback: promiseCallback<T>);

	/**	onFulfilled is called when/if "promise" resolves. onRejected is called when/if "promise" rejects.
		Both are optional, if either/both are omitted the next onFulfilled/onRejected in the chain is called.
		Both callbacks have a single parameter , the fulfillment value or rejection reason.
		"then" returns a new promise equivalent to the value you return from onFulfilled/onRejected after being passed through Promise.resolve.
		If an error is thrown in the callback, the returned promise rejects with that error.

		onFulfilled called when/if "promise" resolves
		onRejected called when/if "promise" rejects
	 */
	then<U>(onFulfilled?: (value: T) => U | Thenable<U>, onRejected?: (error: any) => U | Thenable<U>): Promise<U>;
	then<U>(onFulfilled?: (value: T) => U | Thenable<U>, onRejected?: (error: any) => void): Promise<U>;

	/**	Sugar for promise.then(undefined, onRejected)

		onRejected called when/if "promise" rejects
	 */
	catch<U>(onRejected?: (error: any) => U | Thenable<U>): Promise<U>;

	finally<U>(finallyHandler: () => void): Promise<U>;

	/**
	 * Make a promise that fulfills when every item in the array fulfills, and rejects if (and when) any item rejects.
	 * The fulfillment value is an array (in order) of fulfillment values. The rejection value is the first rejection value.
	 */
	static all<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(values: [T1 | Thenable<T1>, T2 | Thenable<T2>, T3 | Thenable<T3>, T4 | Thenable<T4>, T5 | Thenable<T5>, T6 | Thenable<T6>, T7 | Thenable<T7>, T8 | Thenable<T8>, T9 | Thenable<T9>, T10 | Thenable<T10>]): Promise<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10]>;
	static all<T1, T2, T3, T4, T5, T6, T7, T8, T9>(values: [T1 | Thenable<T1>, T2 | Thenable<T2>, T3 | Thenable<T3>, T4 | Thenable<T4>, T5 | Thenable<T5>, T6 | Thenable<T6>, T7 | Thenable<T7>, T8 | Thenable<T8>, T9 | Thenable<T9>]): Promise<[T1, T2, T3, T4, T5, T6, T7, T8, T9]>;
	static all<T1, T2, T3, T4, T5, T6, T7, T8>(values: [T1 | Thenable<T1>, T2 | Thenable<T2>, T3 | Thenable<T3>, T4 | Thenable<T4>, T5 | Thenable<T5>, T6 | Thenable<T6>, T7 | Thenable<T7>, T8 | Thenable<T8>]): Promise<[T1, T2, T3, T4, T5, T6, T7, T8]>;
	static all<T1, T2, T3, T4, T5, T6, T7>(values: [T1 | Thenable<T1>, T2 | Thenable<T2>, T3 | Thenable<T3>, T4 | Thenable<T4>, T5 | Thenable<T5>, T6 | Thenable<T6>, T7 | Thenable<T7>]): Promise<[T1, T2, T3, T4, T5, T6, T7]>;
	static all<T1, T2, T3, T4, T5, T6>(values: [T1 | Thenable<T1>, T2 | Thenable<T2>, T3 | Thenable<T3>, T4 | Thenable<T4>, T5 | Thenable<T5>, T6 | Thenable<T6>]): Promise<[T1, T2, T3, T4, T5, T6]>;
	static all<T1, T2, T3, T4, T5>(values: [T1 | Thenable<T1>, T2 | Thenable<T2>, T3 | Thenable<T3>, T4 | Thenable<T4>, T5 | Thenable<T5>]): Promise<[T1, T2, T3, T4, T5]>;
	static all<T1, T2, T3, T4>(values: [T1 | Thenable<T1>, T2 | Thenable<T2>, T3 | Thenable<T3>, T4 | Thenable<T4>]): Promise<[T1, T2, T3, T4]>;
	static all<T1, T2, T3>(values: [T1 | Thenable<T1>, T2 | Thenable<T2>, T3 | Thenable<T3>]): Promise<[T1, T2, T3]>;
	static all<T1, T2>(values: [T1 | Thenable<T1>, T2 | Thenable<T2>]): Promise<[T1, T2]>;
	static all<T1>(values: [T1 | Thenable<T1>]): Promise<[T1]>;
	static all<TAll>(values: Array<TAll | Thenable<TAll>>): Promise<TAll[]>;

	/**
	 * Make a Promise that fulfills when any item fulfills, and rejects if any item rejects.
	 */
	static race<R>(promises: (R | Thenable<R>)[]): Promise<R>;

	/**
	 * Make a new promise from ultimate value or thenable.
	 */
	static resolve(): Promise<void>;
	static resolve<R>(value: R | Thenable<R>): Promise<R>;
}

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
 * Data indicating a time position and rate. Used for various playback,
 * timing and sync purposes. Also includes some generally useful, time-related
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

	constructor(position: number, rate: number, end?: number, dead?: boolean);


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
