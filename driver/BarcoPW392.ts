/*
 * Copyright (c) 2020 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import * as Meta from "system_lib/Metadata";
import {BoolState, NetworkProjector, NumState} from "driver/NetworkProjector";
import {NetworkTCP} from "system/Network";

/**
 Manage a BarcoPW392 protocol (aka ProjectionDesign) projector,
 accessed through a provided NetworkTCPDevice connection.
 */
@Meta.driver('NetworkTCP', { port: 1025 })
export class BarcoPW392 extends NetworkProjector {
	protected _input: NumState;
	private static replyParser = /%\d* (\S*) (!?)(\d*)/;

	constructor(socket: NetworkTCP) {
		super(socket);
		this.addState(this._power = new BoolState('POWR', 'power'));
		this.addState(this._input = new NumState(
			'IABS', 'input',
			0, 25, () => this._power.getCurrent()
		));

		this.poll();	// Get polling going
		this.attemptConnect();	// Attempt initial connection
		// console.info("inited");
	}

	/**
	 Override to initiate getInitialState on connection, as this protocol has
	 no initial handshake from peer.
	 */
	protected justConnected(): void {
		super.justConnected();
		this.getInitialState();
	}

	/**
	 Send queries to obtain the initial state of the projector.
	 */
	private getInitialState() {
		this.connected = false;	// Mark me as not yet fully awake, to hold off commands
		this.request('POWR').then(
			reply => {
				this._power.updateCurrent(!!(parseInt(reply) & 1));
				// console.info("getInitialState POWR", this.power.current);
				return this.request('IABS')
			}
		).then(
			reply => {
				this._input.updateCurrent(parseInt(reply));
				this.connected = true;
				// console.info("getInitialState IABS", this.input.current);
				this.sendCorrection();
			}
		).catch(error => {
			// console.info("getInitialState error - retry soon", error);
			this.disconnectAndTryAgainSoon();	// Triggers a new cycle soon
		});
	}


	/**
	 Send a question or command to the projector, and wait for the response. The
	 response is assumed to be

	 	%nnn question rrr

	 where nnn is the "address"
	 If success: rrr is the reply
	 If error: rrr is an error code, beginning with a '!'char
	 */
	request(question: string, param?: string): Promise<string> {
		this.currCmd = question;
		var toSend = ':' + question;
		toSend += (param === undefined) ? '?' : param;
		// console.info("request", toSend);
		this.socket.sendText(toSend).catch(
			err=>this.sendFailed(err)
		);
		const result = this.startRequest(toSend);
		result.finally(()=> {
			asap(()=> {	// Send further corrections soon, once this cycle settled
				// console.info("request finally sendCorrection");
				this.sendCorrection();
			});
		});
		return result;
	}

	/**
	 Got data from peer. Handle responses to requests.
	 */
	protected textReceived(text: string): void {
		if (text) {	// Ignore empty string sometimes received frmo projector
			// console.info("textReceived", text);

			const parts = BarcoPW392.replyParser.exec(text);
			if (parts && parts[1] === this.currCmd) {
				if (parts[2]) {
					console.warn("BarcoPW response", text);
					this.requestFailure(text);
				} else
					this.requestSuccess(parts[3]);	// Only "reply" data part
			} else
				console.warn("Unexpected data", text);
			this.requestFinished();
		}
	}
}