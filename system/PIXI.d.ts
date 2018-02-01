
/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

declare function require(name: string): any;
declare function asap(callback: Function): void;
declare function wait(millis:number): CancelablePromise<void>;
declare var console: Console;

/** Log functions take one or many values, which will be concatenated
    with a space as separator.
 */
interface console {
	log(...toLog: string[]):void;		// Synonymous with info
	info(...toLog: string[]):void;		// Log as info message
	error(...toLog: string[]):void;		// Log as error message
	warn(...toLog: string[]):void;		// Log as warning message
}

interface Thenable<T> {
	then<U>(onFulfilled?: (value: T) => U | Thenable<U>, onRejected?: (error: any) => U | Thenable<U>): Thenable<U>;
	then<U>(onFulfilled?: (value: T) => U | Thenable<U>, onRejected?: (error: any) => void): Thenable<U>;
	catch<U>(onRejected?: (error: any) => U | Thenable<U>): Thenable<U>;
}

interface promiseCallback<T> {
	(resolve : (value?: T | Thenable<T>) => void, reject: (error?: any)=> void): void
}

declare class Promise<T> implements Thenable<T> {
	/**
	 * If you call resolve in the body of the callback passed to the constructor,
	 * your promise is fulfilled with result object passed to resolve.
	 * If you call reject your promise is rejected with the object passed to reject.
	 * For consistency and debugging (eg stack traces), obj should be an instanceof Error.
	 * Any errors thrown in the constructor callback will be implicitly passed to reject().
	 */
	constructor(callback: promiseCallback<T>);

	/**
	 * onFulfilled is called when/if "promise" resolves. onRejected is called when/if "promise" rejects.
	 * Both are optional, if either/both are omitted the next onFulfilled/onRejected in the chain is called.
	 * Both callbacks have a single parameter , the fulfillment value or rejection reason.
	 * "then" returns a new promise equivalent to the value you return from onFulfilled/onRejected after being passed through Promise.resolve.
	 * If an error is thrown in the callback, the returned promise rejects with that error.
	 *
	 * @param onFulfilled called when/if "promise" resolves
	 * @param onRejected called when/if "promise" rejects
	 */
	then<U>(onFulfilled?: (value: T) => U | Thenable<U>, onRejected?: (error: any) => U | Thenable<U>): Promise<U>;
	then<U>(onFulfilled?: (value: T) => U | Thenable<U>, onRejected?: (error: any) => void): Promise<U>;

	/**
	 * Sugar for promise.then(undefined, onRejected)
	 *
	 * @param onRejected called when/if "promise" rejects
	 */
	catch<U>(onRejected?: (error: any) => U | Thenable<U>): Promise<U>;

	finally<U>(finallyHandler: () => void): Promise<U>;
}

/**
 * A promise that can be cancelled, causing it to be rejected immediately with
 * a "cancelled" error message.
 */
declare class CancelablePromise<T> extends Promise<T> {
	constructor(callback:promiseCallback<T>, cancellor:()=>void);
	cancel(): void;
}