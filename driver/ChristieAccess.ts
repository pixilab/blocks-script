/*
 * Copyright (c) 2018 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */
import {NetworkTCP} from "system/Network";
import {NetworkProjector, NumState, State} from "driver/NetworkProjector";
import * as Meta from "system_lib/Metadata";

/*
 Manage a Christie ACCESS display, accessed through a provided NetworkTCP connection.
 */
@Meta.driver('NetworkTCP', { port: 1986 })
export class ChristieAccess extends NetworkProjector {
	private static replyParser = /.* (.*)$/;	// Extracts word following last space

	private static kMinInput = 5;				// Allowable input range
	private static kMaxInput = 20;

	// Maps input name to input number, as query command returns name, but we use number
	private static kInputNameToNum: Dictionary<number> = {
		"FAV": 5,
		"HDMI1": 7,
		"HDMI2": 8,
		"YPbPr": 11,
		"VGA": 12,
		"DVI": 18,
		"DP": 19,
		"OPS": 20
	};
	protected _input: NumState;

	constructor(socket: NetworkTCP) {
		super(socket);
		this._power = new PowerState('SETQUICKSTANDBY', 'power');
		this.addState(this._power);
		this._input = new NumState(
			'SELECTSOURCE', 'input',
			ChristieAccess.kMinInput, ChristieAccess.kMaxInput
		);
		this.addState(this._input);

		this.poll();			// Get polling going
		this.attemptConnect();	// Attempt initial connection
	}

	/*
	 Set desired input source.
	 */
	@Meta.property("Desired input source number")
	@Meta.min(ChristieAccess.kMinInput) @Meta.max(ChristieAccess.kMaxInput)
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
		this.request('GETQUICKSTANDBY').then(
			reply => {
				console.info("getInitialState GETQUICKSTANDBY", reply);
				if (reply)
					this._power.updateCurrent(reply === 'off');
				return this.request('GETSOURCE')
			}
		).then(
			reply => {
				console.info("getInitialState GETSOURCE", reply);
				if (reply) {
					// GETSOURCE returns name, but we want input number
					const inputNum = ChristieAccess.kInputNameToNum[reply];
					if (inputNum)
						this._input.updateCurrent(inputNum);
				}
				this.connected = true;
				this.sendCorrection();
			}
		).catch(error => {
			console.info("getInitialState error - retry soon", error);
			this.disconnectAndTryAgainSoon();
		});
	}


	/*
	 Send a question or command to the display, and wait for the response.
	 */
	request(question: string, param?: string): Promise<string> {
		var toSend = question;
		if (param !== undefined)
			toSend += ' ' + param;
		// console.info("request", toSend);
		this.socket.sendText(toSend, this.getDefaultEoln())
		.catch(err=>
			this.sendFailed(err)
		);
		const result = this.startRequest(question);
		result.finally(()=> {
			// Send further corrections soon, with some delay between each as
			// display isn't always happy with commands sent back to back
			wait(600).then(()=> {
				// console.info("request finally sendCorrection");
				this.sendCorrection();
			});
		});
		return result;
	}

	protected getDefaultEoln(): string | undefined {
		return '\r\n';
	}

	/*
	 Got data from peer. Handle responses to requests.
	 */
	protected textReceived(text: string): void {
		if (text) {	// Ignore empty string sometimes received frmo projector
			console.info("textReceived", text);

			const parts = ChristieAccess.replyParser.exec(text);
			if (parts)
				this.requestSuccess(parts[1]); // Only "reply" data part
			else
				this.warnMsg("Unexpected data", text);
			this.requestFinished();
		}
	}
}

interface Dictionary<TElem> {
	[id: string]: TElem;
}

/**
 * I use the SETQUICKSTANDBY command to implement power, by setting
 * standby to "on" when power is off, and vice versa.
 */
export class PowerState extends State<boolean> {
	correct(drvr: NetworkProjector): Promise<string> {
		return this.correct2(drvr, this.wanted ? 'off' : 'on');
	}
}
