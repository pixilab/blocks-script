/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2018 by Mike Fahl.
 */

import {ScriptBase} from "system_lib/ScriptBase";
import * as Meta from "system_lib/Metadata";

/**
 Ultimate base class for all script-based drivers.
 */
export class Driver<facadeType extends DriverFacade> extends ScriptBase<DriverFacade> {

	constructor(scriptFacade: DriverFacade) {
		super(scriptFacade);
		if (scriptFacade.isOfTypeName("NetworkTCP")) {
			// Re-emit message associated with basic "connected" state
			scriptFacade.subscribe('connect', (sender:any, message:any) => {
				if (message.type === 'Connection')
					this.__scriptFacade.firePropChanged('connected')
			});
		}
	}

	/**	Inform others that prop has changed, causing any
	 *	subscribers to be notified soon.
	 */
	changed(prop: string|Function): void {
		this.__scriptFacade.changed(prop);
	}

	/*	Provide basic connected status. May be overridden in subclass
		if it has better idea.
	 */
	@Meta.property("Connected to peer")
	public get connected(): boolean {
		// Always false for facade that doesn't have connected property
		return (<any>this.__scriptFacade).connected ? true : false;
	}
}

// Internal implementation - not for direct client access
interface DriverFacade {
	isOfTypeName(typeName: string): any|null;	// Check subtype by name
	changed(prop: string|Function): void;
	firePropChanged(prop: string): void;
	subscribe(name: string, listener: Function): void;
	unsubscribe(name: string, listener: Function): void;
}
