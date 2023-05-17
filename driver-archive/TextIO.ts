/*	A simple generic TCP or Serial port driver listening for a string to arrive, published
	as the "recievedText" property. By default, the recievedText property is cleared after a brief
	delay (in order to detect a new message with the same content), but this behavior can be
	disabled by setting the autoClear property to false. There is also a sendText Task-callable
	function that can be used to send raw data to the device.

 	Copyright (c) 2023 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {NetworkTCP, SerialPort} from "system/Network";
import {Driver} from "system_lib/Driver";
import {callable, driver, property, parameter} from "system_lib/Metadata";

type ConnType = NetworkTCP | SerialPort;

@driver('NetworkTCP')
@driver('SerialPort')
export class TextIO extends Driver<ConnType> {
	private mRecievedText = '';	// Most recently received mCommand, or empty string
	private mAutoClear: boolean = true; // Controls whether to clear mCommand after timeout
	private mClearTimer?: CancelablePromise<void>;	// Clear mCommand timer, if set

	public constructor(private connection: ConnType) {
		super(connection);
		connection.autoConnect();
		connection.subscribe('textReceived', (sender, msg) => {
			this.recievedText = msg.text
			log("Received: " + msg.text);
		});
	}

	/**
	 * Send raw messages to the device
	 */
	@callable("Sends rawData to the device")
	sendText(
		rawData: string,
		@parameter('Line termination. Default is a carriage return. Pass null for none.', true)
		termination?: string
	) {
		this.connection.sendText(rawData, termination);
		log("Sent: " + rawData);
	}

	/**
	 * The most recently received text message as a Blocks property
	 */
	@property("The most recently received text message")
	public get recievedText(): string {
		return this.mRecievedText;
	}
	public set recievedText(msg: string) {
		this.mRecievedText = msg;

		// Cancel and clear out any existing timer
		if (this.mClearTimer) {
			this.mClearTimer.cancel();
			this.mClearTimer = undefined;
		}

		// If this was a non-empty string, set up to clear it after some time
		if (msg && this.mAutoClear) {
			this.mClearTimer = wait(300);
			this.mClearTimer.then(()=> {
				this.mClearTimer = undefined; // Now taken
				if (this.mAutoClear)
					this.recievedText= '';
			});
		}
	}
	/**
	*Property that controls whether to clear the last message after a timeout
	*/
	@property("Clear recievedText automatically after 300 mS")
	public get autoClear(): boolean {
		return this.mAutoClear;
	}
	public set autoClear(cmd: boolean) {
		this.mAutoClear = cmd;
	}
}

/**
 Log messages, allowing my logging to be easily disabled in one place.
 */
 const DEBUG = false;	// Controls verbose logging
 function log(...messages: any[]) {
	if (DEBUG)
		// Set to false to disable my logging
		console.info(messages);
}
