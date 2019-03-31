/*
	A simple driver listening for a string to arrive on a UDP port, publishing the last received string
	as the "command" property.

 	Copyright (c) 2019 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {NetworkUDP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {callable, driver, property} from "system_lib/Metadata";

@driver('NetworkUDP', { port: 4444 })
export class UDP_Input extends Driver<NetworkUDP> {
	private mCommand = '';	// Most recently received command, or empty string
	private mClearTimer?: CancelablePromise<void>;	// Clear command timer, if set

	public constructor(private socket: NetworkUDP) {
		super(socket);
		socket.subscribe('textReceived', (sender, message) => {
			this.command = message.text
		});
	}

	/**
	 * Provide sendText passthrough, allowing the driver to be used to test itself by
	 * setting the same port number for output and input, and running on localhost.
	 */
	@callable("Send the text to the destination IP address and UDP port")
	public sendText(toSend: string) {
		this.socket.sendText(toSend);
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
