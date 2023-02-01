/*
 * Blocks user script receiveing a message from an external client, exposing it as a
 * single message property. Originally devised to receive messages from a Shelly Button 1,
 * but can be used to receive a message fmor ANY client capable of sending a GET request to
 * my URL.
 *
 * CAUTION: Since this exposes a SINGLE property, briefly holding the last message received,
 * this will not work reliably if data is sent rapidly, or simultaneously from multiple clients.
 * It will likely work as expected for one or a few Shelly Buttons pressed every now and then.
 *
 * Copyright (c) 2023 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {Script, ScriptEnv} from "system_lib/Script";
import {property, resource} from "system_lib/Metadata";

export class SimpleHttpInput extends Script {
	private mLastMessage = "";	// Backing store for lastMessage property
	private resetTimer?: CancelablePromise<any>; // Message reset timer, if any

	public constructor(env: ScriptEnv) {
		super(env);
	}

	/*	Receives a GET request such as:
	  	 http://<SERVER><:PORT-IF-REQUIRED>/rest/script/invoke/SimpleHttpInput/message/on/B
	 	Exposing the trailing part (here "on/B") as the lastMessage property.
	 */
	@resource(undefined, 'GET')
	public message(
		body: object, 	// Not used fir GET requests
		trailer: string	// Trailing part of URL
	) {
		this.lastMessage = trailer;
		this.resetSoon();
	}

	/*	Reset my lastMessage property soon, allowing it to be re-triggered with same value.
	 */
	private resetSoon() {
		if (this.resetTimer)
			this.resetTimer.cancel();
		this.resetTimer = wait(400);
		this.resetTimer.then(() => {
			this.resetTimer = undefined;
			this.lastMessage = "";
		});
	}

	/**
	 * Property exposed by this script, indicating the last message received.
	 */
	@property("Last message received from client", true)
	get lastMessage(): string {
		return this.mLastMessage;
	}
	set lastMessage(value: string) {
		this.mLastMessage = value;
	}
}
