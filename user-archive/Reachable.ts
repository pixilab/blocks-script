/*	A Block user script that can poll any number of network devices, exposing the outcome
	of each poll as a property.

	NOTE: Uses the command line "ping" utility to do the job. This script is written for
	the Linux ping command. For Mac/Windows, you will need to adjust/adapt the ping
	command parameters to work.

	Copyright (c) 2023 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {Script, ScriptEnv} from "system_lib/Script";
import {callable, parameter} from "system_lib/Metadata";
import {SimpleProcess} from "../system/SimpleProcess";


export class Reachable extends Script {
	private targets: Target[] = [];
	private nextPing = 0;	// Index of next one to ping

	public constructor(env : ScriptEnv) {
		super(env);
	}

	@callable("Add a target to ping, to be exposed as a property")
	public addTarget(
		@parameter("Name of device to poll and exposed property name") name: string,
		@parameter("IP address or resolvable doman name of device") address: string
	) {
		const firstOne = this.targets.length === 0;
		this.targets.push(new Target(this, name, address));
		if (firstOne)
			this.startNext();	// Get goig first time
	}

	@callable("Clear out all targers, allowing you to start anew")
	public reset() {
		this.reInitialize();
	}

	/**
	 * Initiate "ping" polling of next target.
	 */
	private startNext() {
		this.targets[this.nextPing].poll().finally(() => {
			// Wait a bit between each ping to keep frequency reasonable
			wait(1000).then(() => this.startNext());
		});
		this.nextPing++;

		// Advance nextPing ready for next poll, with wrap-round
		if (this.nextPing >= this.targets.length)
			this.nextPing = 0;
	}
}

/*	Manages a single "poll target", with its ability to run the command-line ping
	command, updating a property with the outcome.
 */
class Target {
	private mSuccess = false;	// Corresponding property's current state
	private readonly name: string;	// Name of the property exposed by me

	constructor(
		private readonly owner: Reachable,
		name: string,
		private readonly addr: string
	) {
		// Period not allowed in property name, so clean up
		this.name = name.replace(/\./g, '_');
		// Establish a dynamic property with this target's name
		owner.property<boolean>(
			this.name,
			{type: "Boolean", readOnly: true, description: "Device was reachable on network"},
			(unused: boolean): boolean => this.mSuccess
		);
	}

	/**
	 * Poll addr using ping, returning a promise that will be resolved if success or
	 * rejected if fails.
	 */
	poll(): Promise<any> {
		const pb = SimpleProcess.create("ping");
		// Arguments provided here work on Linux, but likely not on Windows
		pb.addArgument("-q");	// Quiet mode, with minimal output
		pb.addArgument("-c"); pb.addArgument("1");	// Attempt only one ping
		pb.addArgument("-w"); pb.addArgument("1");	// Timeout, seconds
		// MacOS: pb.addArgument("-t"); pb.addArgument("1");	// Timeout, seconds
		// MacOS: pb.addArgument("-o");	// Exit successfully after receiving one reply packet
		pb.addArgument(this.addr);
		pb.setTimeout(2000);	// Timeout for the entire process (milliseconds)
		// console.log("Polling", this.name, this.addr);
		const resultPromise = pb.start().promise;
		resultPromise.then(success => this.setSuccess(true), failure => this.setSuccess(false));
		return resultPromise;
	}

	/**
	 * Update the success status of this target, firing a change notification if this is news.
	 */
	private setSuccess(isOk: boolean) {
		// console.log("Poll result", this.name, isOk);
		if (this.mSuccess !== isOk) {	// This is news
			this.mSuccess = isOk;		// Updte property's state backing store
			this.owner.changed(this.name);	// Explicitly notify change by name
		}
	}
}
