/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2018 by Mike Fahl.
 */

import {ScriptBase, ScriptBaseEnv} from "system_lib/ScriptBase";
import * as Meta from "system_lib/Metadata";

/**
 Ultimate base class for all script-based drivers.
 */
export class Driver<FacadeType extends DriverFacade> extends ScriptBase<FacadeType> {

	constructor(scriptFacade: FacadeType) {
		super(scriptFacade);
		if (scriptFacade.isOfTypeName("NetworkTCP")) {
			// Re-emit message associated with basic "connected" state
			scriptFacade.subscribe('connect', (sender:any, message:any) => {
				if (message.type === 'Connection')
					this.__scriptFacade.changed('connected')
			});
		}
	}

	/*	Provide basic connected status. May be overridden in subclass
		if it has better idea.
	 */
	@Meta.property("Connected to peer")
	public get connected(): boolean {
		// Always false for facade that doesn't have connected property
		return (<any>this.__scriptFacade).connected ? true : false;
	}

	/**
	 * Foward any event subscriptions through facade, e.g., providing
	 * 'finished' callback also for use in driver clients.
	 */
	subscribe(name: string, listener: Function): void {
		this.__scriptFacade.subscribe(name, listener);
	}
}

// Internal implementation - not for direct client access
interface DriverFacade extends ScriptBaseEnv {
	// Check subtype by name, returning the implementing object (if any)
	isOfTypeName(typeName: string): any|null;
	subscribe(name: string, listener: Function): void;
	unsubscribe(event: string, listener: Function): void;	// Unsubscribe to a previously subscribed event
}
