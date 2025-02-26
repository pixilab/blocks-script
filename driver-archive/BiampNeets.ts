/* 	Blocks driver for the Biamp/Neets Audio Amplifier 2:25 and
	Biamp/Neets Audio Preamplifier. This is a bidirectional driver,
	that starts by fetching the current state from the device
	and then provides control over basic functions such as input
	selection and volume.

	Copyright (c) 2025 PIXILAB Technologies AB, Sweden (http://pixilab.se).
	All Rights Reserved.
 */

import * as Meta from "../system_lib/Metadata";
import {BoolState, NetworkProjector, NumState} from "../driver/NetworkProjector";
import {NetworkTCP} from "../system/Network";

@Meta.driver('NetworkTCP', { port: 5000 })
export class BiampNeets extends NetworkProjector {
	protected _input: NumState;
	protected _volume: NumState;

	static readonly kMinInput = 1;
	static readonly kMaxInput = 5;

	static readonly kMinVol = -70;
	static readonly kMaxVol = 12;


	constructor(socket: NetworkTCP) {
		super(socket);
		this._power = new OnOffState('POWER', 'power');
		this.addState(this._power);
		this._input = new NumState(
			'INPUT', 'input',
			BiampNeets.kMinInput, BiampNeets.kMaxInput
		);
		this.addState(this._input);

		this._volume = new DbState(
			'VOL', 'volume',
			BiampNeets.kMinVol, BiampNeets.kMaxVol
		);
		this.addState(this._volume);

		if (socket.enabled) {
			this.poll();			// Get status polling going
			this.attemptConnect();	// Attempt initial connection
		}
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
	 Set desired input source.
	 */
	@Meta.property("Desired audio input number")
	@Meta.min(BiampNeets.kMinInput) @Meta.max(BiampNeets.kMaxInput)
	public set input(value: number) {
		if (this._input.set(value)) {
			// console.info("set input", value);
			this.sendCorrection();
		}
	}
	public get input(): number {
		return this._input.get();
	}

	/*
	 Set desired input source.
	 */
	@Meta.property("Desired output volume")
	@Meta.min(BiampNeets.kMinVol) @Meta.max(BiampNeets.kMaxVol)
	public set volume(value: number) {
		if (this._volume.set(value)) {
			this.sendCorrection();
		}
	}
	public get volume(): number {
		return this._volume.get();
	}

	/*
	 Send queries to obtain the initial state of the projector.
	 Ret true if to continue polling
	 */
	protected pollStatus(): boolean {
		if (this.okToSendCommand()) {	// Don't interrfere if already a command in flight
			this.request('POWER', '?')
			.then(reply => {
				// console.info("pollStatus power", reply);
				const powered = reply == 'ON';
				this._power.updateCurrent(powered);
				return this.request('INPUT', '?');
			}).then(reply => {
				// console.info("pollStatus input", reply);
				this._input.updateCurrent(parseInt(reply));
				return this.request('VOL', '?');
			}).then(reply => {
				// console.info("pollStatus volume", reply);
				this._volume.updateCurrent(parseInt(reply));
			}).then(() => {
				if (!this.connected) {
					console.info("Connected (Initial poll complete)")
					this.connected = true;	// Considered all up now
				}
				this.sendCorrection();
			}).catch(error => {
				console.warn("pollStatus error - retrying soon", error);
				this.disconnectAndTryAgainSoon();	// Triggers a new cycle soon
			});
		}
		return true;
	}

	/*
	 Send a question or command to the display, and wait for the response.
	 */
	request(msg: string, param: string): Promise<string> {
		var toSend = "NEUNIT=1," + msg + '=' + param
		// console.info("request", toSend);
		this.socket.sendText(toSend)
		.catch(err=>
			this.sendFailed(err)
		);
		const result = this.startRequest(msg);
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
	private static readonly kReplyRegex = /NEUNIT=1,(.*)=(.*)/
	protected textReceived(text: string): void {
		if (text) {	// Ignore empty string silently
			// console.info("textReceived", text);
			if (text === "NEUNIT=1,OK")
				this.requestSuccess("");
			else {
				const parts = BiampNeets.kReplyRegex.exec(text);
				if (parts)
					this.requestSuccess(parts[2]); // Only "reply" data part
				else
					console.warn("Unexpected data", text);
			}
		}
	}
}

/**
 * Prefix positive numeric, presumably "decibel", value with '+'.
 * Deals with integral values only.
 * As per the protocol spec.
 */
class DbState extends NumState {

	// Round value to integer
	set(v: number): boolean {
		return super.set(Math.round(v));
	}

	// Prefix positive value with +
	correct(drvr: NetworkProjector): Promise<string> {
		let arg = this.wanted.toString();
		if (this.wanted > 0)
			arg = '+' + arg;
		return this.correct2(drvr, arg);
	}
}

/**
 * Send boolean value as ON or OFF.
 */
class OnOffState extends BoolState {
	correct(drvr: NetworkProjector): Promise<string> {
		return this.correct2(drvr, this.wanted ? 'ON' : 'OFF');
	}
}
