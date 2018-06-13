/*
 * Copyright (c) 2018 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

/**
 * Common stuff shared between user scripts and drivers.
 */
export class ScriptBase<FC extends ScriptBaseEnv> {
	protected readonly __scriptFacade: FC;

	constructor(scriptFacade: FC) {
		this.__scriptFacade = scriptFacade;
	}

	/**	Inform others that prop has changed, causing any
	 *	subscribers to be notified soon.
	 */
	changed(prop: string|Function): void {
		this.__scriptFacade.changed(prop);
	}
}

// Internal implementation - not for direct client access
export interface ScriptBaseEnv {
	changed(prop: string|Function): void;
	firePropChanged(prop: string): void;
}