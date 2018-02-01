/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2018 by Mike Fahl.
 */

import {SetterGetter, SGOptions} from "system/PubSub";

/**
 Ultimate base class for all TypeScript based user scripts.
 */
export class Script {
	private __scriptFacade: ScriptEnv;

	constructor(env: ScriptEnv) {
		this.__scriptFacade = env;
	}

	/** Expose a dynamic property of type T with specified options and name.
	 */
	property<T>(name: string, options: SGOptions, setGetFunc: SetterGetter<T>): void {
		this.__scriptFacade.property(name, options, setGetFunc);
	}

	/**	Inform others that prop has changed, causing any
	 *	subscribers to be notified soon.
	 */
	changed(prop: any): void {
		this.__scriptFacade.changed(prop);
	}
}

export interface ScriptEnv {
	firePropChanged(propName: string): void;
	changed(prop: any): void;
	property(p1: any, p2?: any, p3?: any): void;
}