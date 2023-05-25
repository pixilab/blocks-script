/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2018 by Mike Fahl.
 */

import {ScriptBase, ScriptBaseEnv} from "system_lib/ScriptBase";
import * as Meta from "system_lib/Metadata";
import {NetworkBase} from "system/Network";

/**
 Ultimate base class for all script-based drivers.
 */
export class Driver<FacadeType extends NetworkBase> extends ScriptBase<FacadeType> {

	constructor(scriptFacade: FacadeType) {
		super(scriptFacade);
		if (!scriptFacade.isOfTypeName("NetworkUDP")) {
			// Re-emit any message associated with basic "connected" state
			(<any>this.__scriptFacade).subscribe('connect', (sender:any, message:any) => {
				if (message.type === 'Connection')
					this.changed('connected')
			});
		}
	}

	/*	Provide basic connected status. Override this in subclass
		if it has better idea of any 'connected' status.
		I return false if there's no 'connected' property
	 */
	@Meta.property("Connected to peer")
	public get connected(): boolean {
		// Returns false if connected is undefined
		return !!(<any>this.__scriptFacade).connected;
	}

	/**
	 * Expose name and fullName as driver properties as well, just as for
	 * driver-less network devices.
	 */
	@Meta.property("Leaf name of this object")
	public get name(): string { return this.__scriptFacade.name }

	@Meta.property("Full, dot-separated path to this object")
	public get fullName(): string { return this.__scriptFacade.fullName }

	@Meta.property("Name of associated Device Driver")
	public get driverName(): string { return this.__scriptFacade.driverName }

	@Meta.property("Type of low level driver")
	public get deviceType(): 'NetworkTCP' | 'NetworkUDP' | 'Serial' | 'MQTT' {
		return this.__scriptFacade.deviceType
	}

	/**
	 * Foward any event subscriptions through facade, e.g., providing
	 * 'finished' callback also for use in driver clients.
	 */
	subscribe(name: string, listener: ()=>void): void {
		(<any>this.__scriptFacade).subscribe(name, listener);
	}
}

// Internal implementation - not for direct client access
export interface DriverFacade extends ScriptBaseEnv {
	readonly name: string;		// Leaf name of this object
	readonly fullName: string;	// Full, dot-separated path, incl enclosing containers
	readonly driverName: string; // Name of associated Device Driver or empty string
	readonly deviceType: 'NetworkTCP' | 'NetworkUDP' | 'Serial' | 'MQTT';

	// Check subtype by name, returning the implementing object (if any)
	isOfTypeName(typeName: string): any|null;
}
