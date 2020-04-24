/*
 * Copyright (c) 2020 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {NetworkUDP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {driver, property} from "system_lib/Metadata";

/**
 * Similar to the UDP_Input driver, but receives "raw bytes" instead of text. Each byte
 * is represented by two hex characters.
 */
@driver('NetworkUDP', { port: 4445 })
export class UDP_Bytes_Input extends Driver<NetworkUDP> {
	private mCommand = '';	// Most recently received command, or empty string
	private mClearTimer?: CancelablePromise<void>;	// Clear command timer, if set

	public constructor(private socket: NetworkUDP) {
		super(socket);
		socket.subscribe('bytesReceived', (sender, message) => {
			this.command = toHexString(message.rawData);
		});
	}

	/**
	 * The property I expose, providing the name of the most recently received bytes.
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

/**
 * Convert data (up to 20 bytes) to hex format represended by a string, where each byte
 * is converted to two hex characters. All bytes (each represented by two characters)
 * packed back to back, e.g. "0000cafebabe1234" (representing 8 bytes).
 * I assume that each "byte" in the data array is indeed a number 0...255.
 */

function toHexString(data: number[]): string {
	var result = "";
	const len = Math.min(data.length, 20);	// Decode only up to this many bytes
	for (var ix = 0; ix < len; ++ix) {
		const byte = data[ix];
		if (byte < 16)
			result += '0';	// Must prepend 0 to always yield two chars per byte
		result += byte.toString(16);
	}
	return result;
}