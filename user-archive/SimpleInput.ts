/*	A script that listens for a string arriving on a TCP port, exposing that string as a single property.
	The value of that property can ne used, e.g., to trigger a task.

 * Copyright (c) 2019 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {SimpleServer} from "system/SimpleServer";
import {Script, ScriptEnv} from "system_lib/Script";
import {property} from "system_lib/Metadata";


export class SimpleInput extends Script {
	private mCommand = '';	// Most recently received command, or empty string
	private mClearTimer?: CancelablePromise<void>;	// Clear command timer, if set

	public constructor(env : ScriptEnv) {
		super(env);
		// Fire up a server listening on a TCP port
		SimpleServer.newTextServer(4004, 5)
		.subscribe('client', (sender, socket) =>
			// Listen for any message received on the connection
			socket.connection.subscribe('textReceived', (sender, message) =>
				this.command = message.text
			)
		);
	}

	/**
	 * The property I expose, providing the name of the most recently received command.
	 * Note that this property is read only. The setter is only used internally to
	 * change the state of the property. Doing it through the setter automatically
	 * notifies listeners about the change.
	 */
	@property("The most recent command", true)
	public get command(): string {
		return this.mCommand;
	}
	public set command(cmd: string) {
		this.mCommand = cmd;

		// Cancel and clear out any existing timer
		if (this.mClearTimer) {
			this.mClearTimer.cancel();
			this.mClearTimer = undefined;
		}

		// If this was a non-empty command, set up to clear it after some time
		if (cmd) {
			this.mClearTimer = wait(300);
			this.mClearTimer.then(()=> {
				this.mClearTimer = undefined; // Now taken
				this.command = '';
			});
		}
	}
}
