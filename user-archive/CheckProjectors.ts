/*
	Check status of all PJLinkPlus projectors in the system, reporting any unexpected disconnections
	or errors/warnings.

 	Copyright (c) 2021 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {PropertyAccessor, Script, ScriptEnv} from "../system_lib/Script";
import {Network} from "../system/Network";
import {PJLinkPlus} from "../driver/PJLinkPlus";
import {callable} from "../system_lib/Metadata";

export class CheckProjectors extends Script {
	// Projectors we've connected to, keyed by name
	private readonly attached: Dictionary<ProjectorConnections>;

	// Errors that have been reported, keyed by proj name
	private readonly errors: Dictionary<string>;

	public constructor(env: ScriptEnv) {
		super(env);
		this.attached = {};
		this.errors = {};
		this.attachToAll();
	}

	@callable("Re-attach to all projectors - useful if set of projectors change")
	reattachAll() {
		this.detachFromAll();
		this.attachToAll();
	}

	/**
	 * Attach to all PJLinkPlus devices in the system.
	 */
	private attachToAll() {
		this.forEachProjector((projector, name) =>
			this.attachTo(projector, name)
		);
		/*	Hook up to check that all projectors connected OK after a while.
			I can't do this right away, since I may be called during
			system start-up, and not all projectors may have connected
			just yet. The amount of time needed here may need tweaking
			to avoid false reports of connection failure, where it's
			really just connections being a bit slow durin startup.
		 */
		wait(6000).then(() => {
			this.forEachProjector((projector, name) =>
				this.connStatus(projector.connected, name, projector)
			)
		});
	}

	/**
	 * Close all connections opened by attachToAll. Useful if the set of
	 * projectors change, allowing us to re-acquire them.
	 */
	private detachFromAll() {
		for (const name in this.attached)
			this.detachFrom(name);
	}

	/**
	 * Call toCall with each PJLinkPlus projetor found in the system.
	 */
	private forEachProjector(toCall: (projector: PJLinkPlus, name: string)=>void) {
		// Iterate over all Network devices, by name
		for (let deviceName in Network) {
			// Assume this is a PJLinkPlus
			const projector = <PJLinkPlus>Network[deviceName];
			// Skip if it wasn't
			if (projector.isOfTypeName && projector.isOfTypeName('PJLinkPlus'))
				toCall(projector, deviceName);
		}
	}

	/**
	 * Attach to specified projector, calling problemStatus when a problem is detected.
	 * I specifically don't check connected status up front, since it may be too early.
	 * Instead, this is deferred a bit in attachToAll, to give them some time to connect.
	 */
	private attachTo(projector: PJLinkPlus, name: string) {
		const problemProp = this.getProperty<boolean>(
			'Network.' + name + '.hasProblem',
			problem => this.problemStatus(name, projector, problem)
		);

		const connProp = this.getProperty<boolean>(
			'Network.' + name + '.connected',
			isConnected => this.connStatus(isConnected, name, projector)
		);


		const finishListener = () => this.lost(name);
		projector.subscribe('finish', finishListener);

		// Keep track of all attached projectors, so I can close them if needed
		this.attached[name] = {
			projector: projector,
			hasProblemProp: problemProp,
			connProp: connProp,
			finishListener: finishListener
		};

		if (problemProp.available) // Available already - report any error
			this.problemStatus(name, projector, problemProp.value);

	}

	private detachFrom(name: string) {
		const connDescr = this.attached[name];
		if (connDescr) {
			connDescr.connProp.close();
			connDescr.hasProblemProp.close();
			connDescr.projector.unsubscribe('finish', connDescr.finishListener);
			delete this.attached[name];
		} else
			console.warn("detachFrom unknown", name);
	}

	/**
	 * Called when a projector is "lost", e.g., when its settings are changed so that
	 * it needs to be re-established.
	 */
	private lost(projName: string) {
		this.detachFrom(projName);
		// Wait a bit then see if we can reestablish the connection to that projector
		wait(2000).then(() => {
			const projector = <PJLinkPlus>Network[projName];
			if (projector && projector.isOfTypeName && projector.isOfTypeName('PJLinkPlus'))
				this.attachTo(projector, projName);
			else // No longer there - just log this
				console.warn("Projector removed", projName);
		});
	}

	/**
	 * Problem state changed (for better or worse).
	 */
	private problemStatus(projName: string, projector: PJLinkPlus, problem: boolean) {
		// Report (or cancel) error status.
		this.reportError(projName, problem ? projector.errorStatus : undefined);
	}

	/**
	 * Connection status changed (or connection failed initially). Report
	 * as "disconnected" error status.
	 */
	private connStatus(isConnected: boolean, projName: string, projector: PJLinkPlus) {
		if (!isConnected)
			this.reportError(projName, "disconnected");
		else if (this.errors[projName] === "disconnected")
			this.reportError(projName); // Cancel only if error is "disconnected"
	}

	/**
	 * Report any error asspociated with projName, or cancel its error status
	 * if no error.
	 */
	private reportError(projName: string, error?: string) {
	let lastErrorState = this.errors[projName];
		if (lastErrorState !== error) {
			// This is news - remember error status to not nag
			this.errors[projName] = error;
			if (error) {
				// Report error status change here as desired - I just log it
				console.warn("Projector problem", projName, error);
			}
		}
	}
}

/**
 * Property connection/subscription handlers for each attached projector, so we
 * can detach if needed.
 */
interface ProjectorConnections {
	projector: PJLinkPlus;
	hasProblemProp: PropertyAccessor<boolean>;	// Attached "hasProblem" property
	connProp: PropertyAccessor<boolean>;	// Attached "connected" property
	finishListener: () => void;	// Attached "device disappeared" listener
}

interface Dictionary<Group> {
    [id: string]: Group;
}
