/*
 * This script can be used to toggle a sync source on/off using a booean property exposed by the script.
 * It exposes a callable that must run in a task do statement to configure a new switch, typically this task is triggered on server startup. 
 * The callable be run several times to setup multiple switches.
 * The sync can be conditionally stopped using the Time passthrough enabled boolen. Additional logic will be required to conditionally operate the switch, that can be 
 * programmed in a Task.
 * The intention of the script is to be able to conditionally sync a timeline to some timesource. 
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
                                this.syncSource = new TimeFlow(0,0, undefined, true);
                }
        }
}