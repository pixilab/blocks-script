/*
 * Script letting you enable/disable a sync source using a boolean property.
 * Its purpose is to conditionally synchronize someting (e.g., a timeline)
 * to some time source.
 *
 * The CreateNewSwitch callable must be invoked (e.g., by a task do statement)
 * to configure a new sync source switch. Typically, such a task is triggered
 * on server start-up to establish all desired switches. CreateNewSwitch can
 * be invoked multiple times to create more switches.
 *
 * Once a sync switch has been configured, you read its time using the syncSource time
 * property exposed under this user script by the name given to CreateNewSwitch, rather
 * than directly from its origin.
 * You can disengage the time source by setting the enabled property of the named switch to false.
 * Additional logic will be required to set the enabled propety as desired, e.g., from a task.
 *
 * Copyright (c) 2025 PIXILAB Technologies AB, Sweden (https://pixilab.se). All Rights Reserved.
 * Author: Mattias Andersson
 */

import {PropertyAccessor, Script, ScriptEnv} from "system_lib/Script";
import {property, callable, parameter} from "system_lib/Metadata";
import {AggregateElem, Dictionary} from "system_lib/ScriptBase";


export class SyncSourceSwitch extends Script {

	private readonly SyncSourceSwitches: Dictionary<Switch>;

	public constructor(env: ScriptEnv) {

		super(env);
		this.SyncSourceSwitches = this.namedAggregateProperty("SyncSourceSwitches", Switch);
	}

	@callable("Re-initialize the script, run to reset feed config")
	reInitialize() {
		console.log("Reinitialize")
		super.reInitialize();
	}

	@callable("Configure a new switch")
	CreateNewSwitch(
		@parameter("Name of this switch") name: string,
		@parameter("Source sync property i.e timeline or spots time property") syncSourcePath: string,
	) {
		const newSwitch = new Switch(this, syncSourcePath);
		this.SyncSourceSwitches[name] = newSwitch;

	}
}


/**Class describing a single instance of a SyncsourceSwitch */
class Switch extends AggregateElem {

	private mSyncSource: TimeFlow
	private disabledTimeValue: TimeFlow;
	private owner: SyncSourceSwitch
	private propAccessor: PropertyAccessor<TimeFlow>
	private mEnabled = true;

	public constructor(owner: SyncSourceSwitch, sourceProp: string) {
		super();
		this.owner = owner;
		this.mSyncSource = new TimeFlow(0, 0)
		this.setupPropAccessor(sourceProp)
	}

	private setupPropAccessor(sourceProp: string) {
		if (this.propAccessor) {
			this.propAccessor.close()
		}
		this.propAccessor = this.owner.getProperty<TimeFlow>(sourceProp, value => {
			this.disabledTimeValue = value;
			if (this.mEnabled)
				this.syncSource = value
		});
	}

	@property('Time Source, property path to a time (timeFlow) property', true)
	get syncSource(): TimeFlow {
		return this.mSyncSource
	}

	set syncSource(data: TimeFlow) {
		this.mSyncSource = data;
	}

	@property('Time passthrough')
	get enabled(): boolean {
		return this.mEnabled;
	}

	set enabled(value: boolean) {
		if (this.mEnabled !== value) {
			this.mEnabled = value;
			if (value) {
				if (this.disabledTimeValue)
					this.syncSource = this.disabledTimeValue;
			} else
				this.syncSource = new TimeFlow(0, 0, undefined, true);
		}
	}
}
