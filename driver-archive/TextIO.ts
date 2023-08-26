/*	Simple Blocks driver for sending and receiveing text strings to/from a TCP device

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
	private mAutoClear: boolean = true; // Clear recievedText after timeout
	private mAlwaysFireChange: boolean = false; // Fire change when new data received even if recievedText didn't change
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
		if (termination === undefined)
			this.connection.sendText(rawData);	// Use default framing
		else
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
		const oldData = this.mRecievedText;
		this.mRecievedText = msg;
		if (this.mAlwaysFireChange && oldData === msg)
			this.changed('recievedText');
		// Else change notification will be fired automatically when property changes

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

	@property("Clear recievedText automatically after 300 mS")
	public get autoClear(): boolean {
		return this.mAutoClear;
	}
	public set autoClear(cmd: boolean) {
		this.mAutoClear = cmd;
	}

	@property("Fire change on data received even if recievedText didn't change")
	get alwaysFireChange(): boolean {
		return this.mAlwaysFireChange;
	}
	set alwaysFireChange(value: boolean) {
		this.mAlwaysFireChange = value;
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
