/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */
import {NetworkTCP} from "system/Network";
import {BoolState, NetworkProjector, NumState} from "driver/NetworkProjector";
import * as Meta from "system_lib/Metadata";

/*
 Manage a PJLink projector, accessed through a provided NetworkTCP connection.
 */
@Meta.driver('NetworkTCP', { port: 1025 })
export class BarcoPW392 extends NetworkProjector {
	private static replyParser = /\%\d* (\S*) (\!?)(\d*)/;
	private static kMaxInput = 25;
	protected _input: NumState;

	constructor(socket: NetworkTCP) {
		super(socket);
		this.propList.push(this._power = new BoolState('POWR'));
		this.propList.push(this._input = new NumState('IABS', 0, BarcoPW392.kMaxInput));

		this.poll();	// Get polling going
		this.attemptConnect();	// Attempt initial connection
	}

	/*
	 Set desired input source.
	 */
	@Meta.property("Desired input source number")
	@Meta.min(0) @Meta.max(BarcoPW392.kMaxInput)
	public set input(value: number) {
		if (this._input.set(value))
			this.sendCorrection();
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
		this.getInitialState();
	}

	/*
	 Send queries to obtain the initial state of the projector.
	 */
	private getInitialState() {
		this.connected = false;	// Mark me as not yet fully awake, to hold off commands
		this.request('POWR').then(
			reply => {
				this._power.updateCurrent((parseInt(reply) & 1) != 0);
				// console.info("getInitialState POWR", this.power.current);
				return this.request('IABS')
			}
		).then(
			reply => {
				this._input.updateCurrent(parseInt(reply));
				this.connected = true;
				// console.info("getInitialState INPT", this.input.current);
				this.sendCorrection();
			}
		).catch(error => {
			// console.info("getInitialState error - retry soon", error);
			this.disconnectAndTryAgainSoon();	// Triggers a new cycle soon
		});
	}


	/*
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
		this.socket.sendText(toSend).catch(err=>this.sendFailed(err));
		const result = new Promise<string>((resolve, reject) => {
			this.currResolver = resolve;
			this.currRejector = reject;
		});
		result.finally(()=> {
			asap(()=> {	// Send further corrections soon, once this cycle settled
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

			const parts = BarcoPW392.replyParser.exec(text);
			if (parts && parts[1] === this.currCmd) {
				if (parts[2]) {
					console.warn("BarcoPW response", text);
					if (this.currRejector)
						this.currRejector(text);	// Entire error reply
				} else if (this.currResolver)
					this.currResolver(parts[3]); // Only "reply" data part
			} else
				console.warn("Unexpected data", text);
			this.requestFinished();
		}
	}

}
