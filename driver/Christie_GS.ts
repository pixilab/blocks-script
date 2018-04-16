/*
 * Copyright (c) 2018 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */
import {NetworkTCP} from "system/Network";
import {BoolState, NetworkProjector, NumState} from "driver/NetworkProjector";
import * as Meta from "system_lib/Metadata";

/*
 Manage a PJLink projector, accessed through a provided NetworkTCP connection.
 */
@Meta.driver('NetworkTCP', { port: 3002 })
export class Christie_GS extends NetworkProjector {
	private static replyParser = /\(\D+(\d+)\D/;	// Extracts digits following command in reply
	private static kMinInput = 1;		// Allowable input range
	private static kMaxInput = 12;
	protected _input: NumState;

	constructor(socket: NetworkTCP) {
		super(socket);
		// console.info("Christie_GS instantiated");
		this._power = new BoolState('PWR', 'power');
		this.addState(this._power);
		this._input = new NumState(
			'SIN+MAIN', 'input',
			Christie_GS.kMinInput, Christie_GS.kMaxInput
		);
		this.addState(this._input);

		socket.setReceiveFraming(")", true);	// projector sends no newline after reply

		this.poll();			// Get status polling going
		this.attemptConnect();	// Attempt initial connection
	}

	/*
	 Set desired input source.
	 */
	@Meta.property("Desired input source number")
	@Meta.min(Christie_GS.kMinInput) @Meta.max(Christie_GS.kMaxInput)
	public set input(value: number) {
		if (this._input.set(value)) {
			// console.info("set input", value);
			this.sendCorrection();
		}
	}

	/*
	 Get current input, if known, else undefined.
	 */
	public get input(): number {
		return this._input.get();
	}

	/*
	 Override to call getInitialState on connection, as this protocol has
	 no initial handshake from projector.
	 */
	protected justConnected(): void {
		super.justConnected();
		this.connected = false;	// Mark me as not yet fully awake, to hold off commands
		this.pollStatus();		// Do initial poll to get us going
	}

	/*
	 Send queries to obtain the initial state of the projector.
	 Ret true if to continue polling
	 */
	protected pollStatus(): boolean {
		this.request('PWR?').then(
			reply => {
				// console.info("pollStatus PWR?", reply);
				const powered = reply == '1';
				this._power.updateCurrent(powered);
				if (powered)
					return this.request('SIN+MAIN?');
				else {
					this.connected = true;	// Can't get input if off - skip this step
					this.sendCorrection();
				}
			}
		).then(
			reply => {
				// console.info("pollStatus SIN+MAIN?", reply);
				if (reply !== undefined) {
					const selInput = parseInt(reply);
					if (!isNaN(selInput))
						this._input.updateCurrent(selInput);
				}
				this.connected = true;
				this.sendCorrection();
			}
		).catch(error => {
			// console.info("pollStatus error - retrying soon", error);
			this.disconnectAndTryAgainSoon();	// Triggers a new cycle soon
		});
		return true;
	}

	/*
	 Send a question or command to the display, and wait for the response.
	 */
	request(question: string, param?: string): Promise<string> {
		var toSend = question.indexOf('?') < 0 ? '#' + question : question;
		if (param !== undefined)
			toSend += param;
		toSend = '(' + toSend + ')';
		// console.info("request", toSend);
		this.socket.sendText(toSend)
		.catch(err=>
			this.sendFailed(err)
		);
		const result = this.startRequest(question);
		result.finally(()=> {
			// Send further corrections soon
			asap(()=> {
				// console.info("request finally sendCorrection");
				this.sendCorrection();
			});
		});
		return result;
	}

	/*
	 Got data from peer. Handle responses to requests.
	 */
	protected textReceived(text: string): void {
		if (text) {	// Ignore empty string sometimes received frmo projector
			// console.info("textReceived", text);

			const parts = Christie_GS.replyParser.exec(text);
			if (parts)
				this.requestSuccess(parts[1]); // Only "reply" data part
			else
				console.warn("Unexpected data", text);
		}
	}
}
