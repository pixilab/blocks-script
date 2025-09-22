/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2018 by Mike Fahl.
 */
import {NetworkTCP} from "system/Network";
import {BoolState, NetworkProjector, NumState} from "driver/NetworkProjector";
import * as Meta from "system_lib/Metadata";
import {property} from "system_lib/Metadata";

/**
 Manage a PJLink projector, accessed through a provided NetworkTCPDevice connection.
 */
@Meta.driver('NetworkTCP', { port: 4352 })
export class PJLink extends NetworkProjector {
	private unauthenticated: boolean;	// True if projector requires authentication
	protected _input: NumState;
	protected _mute: MuteState;
	private static kMinInput = 11;
	private static kMaxInput = 59;
	private busyHoldoff?: CancelablePromise<void>;	// See projectorBusy()
	private recentCmdHoldoff?: CancelablePromise<void>;	// See sentCommand()

	constructor(socket: NetworkTCP) {
		super(socket);
		this.addState(this._power = new BoolState('POWR', 'power'));
		this.addState(this._mute = new MuteState('AVMT', 'mute'));
		this.addState(this._input = new NumState(
			'INPT', 'input',
			PJLink.kMinInput, PJLink.kMaxInput, () => this._power.getCurrent()
		));

		this.setKeepAlive(false);		// Let connection drop when not needed
		this.setPollFrequency(60000);	// Connect and check device at this interval, mS

		this.poll();			// Get polling going
		this.attemptConnect();	// Attempt initial connection
	}

    /**
	 	Poll for status regularly. This keeps me somewhat in the loop with manual control
	 	of projector. Also helps detecting connection loss.
	 */
    protected pollStatus(): boolean {
		if (this.okToSendCommand()) {	// Don't interfere with command already in flight
			this.request('POWR').then(
				reply => {
					const value = parseInt(reply);
					if (typeof value !== 'number')
						throw "Invalid POWR query response " + reply;
					const on = (value & 1) != 0;
					if (!this.inCmdHoldoff())
						this._power.updateCurrent(on);
					if (on && this.okToSendCommand()) // Attempt input too in case never done
						this.getMiscState1(true);
				}
			).catch(error => {
				this.warnMsg("pollStatus error", error);
				this.disconnectAndTryAgainSoon(70);	// Triggers a new cycle soon
			});
			// console.info("pollStatus");
		}
		return true;	// Check back again in a bit
	}

	/**
	 * Allow clients to check for my type, just as in some system object classes
	 */
	isOfTypeName(typeName: string) {
		return typeName === "PJLink" ? this : super.isOfTypeName(typeName);
	}

	/**
	 Set desired input source.
	 */
	@Meta.property("Desired input source number; 11…59")
	@Meta.min(PJLink.kMinInput)
	@Meta.max(PJLink.kMaxInput)
	public set input(value: number) {
		if (this._input.set(value))
			this.sendCorrection();
	}
	/**
	 Get current input, if known, else undefined.
	 */
	public get input(): number {
		return this._input.get();
	}

	/**
	 Mute video & audio.
	 */
	@property("A/V Muted")
	public set mute(on: boolean) {
		if (this._mute.set(on))
			this.sendCorrection();
	}
	public get mute(): boolean {
		return this._mute.get();
	}

	/**
	 Send queries to obtain the initial state of the projector.
	 */
	private getInitialState() {
		if (this.keepAlive)
			this.connected = false;	// Mark me as not yet fully awake, to hold off commands

		this.request('POWR').then(
			reply => {
				if (!this.inCmdHoldoff())
					this._power.updateCurrent((parseInt(reply) & 1) != 0);
				if (this._power.get()) // Power on - proceed quering misc
					this.getMiscState1();
				else {
					this.connected = true;	// Can't query input if off - skip that step
					this.sendCorrection();
				}
			},
			error => {
				this.warnMsg("getInitialState POWR error - retrying", error);
				this.disconnectAndTryAgainSoon();	// Triggers a new cycle soon
			}
		);
	}

	/**
	 Once we know power is on, proceed quering other states.
	 */
	private getMiscState1(ignoreError?: boolean) {
		this.request('INPT').then(
			reply => {
				const value = parseInt(reply);
				if (typeof value !== 'number')
					throw "Invalid INPT query response " + reply;
				if (!this.inCmdHoldoff())
					this._input.updateCurrent(value);
				this.getMiscState2();
			},
			error => {
				// May fail for "normal" reasons, eg, during power up/down
				this.warnMsg("INPT query error", error);
				if (ignoreError)
					this.getMiscState2();
				else {
					this.connected = true; // Allow things to proceed anyway
					this.sendCorrection();
				}
			}
		);
	}

	private getMiscState2(ignoreError?: boolean) {
		this.request('AVMT').then(
			reply => {
				const value = parseInt(reply);
				if (typeof value !== 'number')
					throw "Invalid AVMT query response " + reply;
				if (!this.inCmdHoldoff())
					this._mute.updateCurrent(value === 31);
				this.connected = true;
				this.sendCorrection();
			},
			error => {
				// May fail for "normal" reasons, eg, during power up/down
				this.warnMsg("AVMT query error", error);
				if (!ignoreError) {
					this.connected = true; // Allow things to proceed anyway
					this.sendCorrection();
				}
			}
		);
	}

	protected sendCorrection(): boolean {
		const didSend = super.sendCorrection();
		if (didSend) {
			if (this.recentCmdHoldoff)
				this.recentCmdHoldoff.cancel();
			this.recentCmdHoldoff = wait(5000);
			this.recentCmdHoldoff.then((): CancelablePromise<void> => this.recentCmdHoldoff = undefined);
		}
		return didSend;
	}

	/**
	 * Return truthy if sent a command recently, meaning that any status replies from
	 * the projector may be unreliable due to how the projector
	 * answers with "actual" rather than "wanted" status, e.g., still
	 * saying it's ON even after you asked it to turn OFF.
	 */
	private inCmdHoldoff() {
		return this.recentCmdHoldoff;
	}

	/**
	 Send a question or command to the projector, and wait for the response. The
	 response is assumed to be the same string as the question, followed by
	 "=" and the reply (which will be provided in the resolved promise), or
	 ERR followed by an error number, which will cause it to be rejected
	 with that error code.
	 */
	request(question: string, param?: string): Promise<string> {
		var toSend = '%1' + question;
		toSend += ' ';
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
	 Got data from peer. Handle initial handshake, as well as command/query response.
	 */
	protected textReceived(text: string): void {
		text = text.toUpperCase();	// Some brands send lower case responses
		if (text.indexOf('PJLINK ') === 0) {	// Initial handshake sent spontaneously by projector
			if (this.unauthenticated = (text.indexOf('PJLINK 1') === 0))
				this.errorMsg("PJLink authentication not supported");
			else
				this.getInitialState();	// Pick up initial state before doing anything else
			return;	// Initial handshake all done
		}

		// console.info("textReceived", text);

		// Strip ogg any leading garbage characters seen occasionally, up to expected %
		const msgStart = text.indexOf('%');
		if (msgStart > 0)
			text = text.substring(msgStart);

		// If no query in flight - log a warning and ignore data
		let currCmd = this.currCmd;
		if (!currCmd) {
			this.warnMsg("Unsolicited data", text);
			return;
		}

		currCmd = currCmd.substring(0, 6);	// Initial part %1XXXX of command
		if (currCmd) {
			const expectedResponse = currCmd + '=';
			if (text.indexOf(expectedResponse) === 0) {
				// Reply on expected command/question
				text = text.substr(expectedResponse.length);	// Trailing text
				var treatAsOk = text.indexOf('ERR') !== 0; // Consider non-ERR respons as "OK"
				if (treatAsOk && this.recentCmdHoldoff) {
					this.recentCmdHoldoff.cancel();	// Consider ack end of any command holdoff
					this.recentCmdHoldoff = undefined;
				}
				if (!treatAsOk) {	// Got error from projector
					/*	Some errors are "terminal", meaning there's no reason to
						attempt the command again. For those, just log them then
						resolve the promise (albeit with the error string, not
						"OK". Other errors will cause the promise to be rejected,
						which will NOT accept the value attempting to be set,
						hence re-trying it soon again.
					 */
					switch (text) {
					case 'ERR1':	// Undefined command - no need to re-try
						this.errorMsg("Undefined command", this.currCmd);
						treatAsOk = true;
						break;
					case 'ERR2':	// Parameter not accepted (e.g., non-existing input)
						this.errorMsg("Bad command parameter", this.currCmd);
						treatAsOk = true;
						break;
					case 'ERR3':	// Bad time for this command (usually in standby or not yet awake)
						// console.info("PJLink ERR3");
						treatAsOk = true;	// Consider OK, but "busy" for a while
						this.projectorBusy();
						this.warnMsg("PJLink projector BUSY", currCmd, text);
						break;
					default:
						this.warnMsg("PJLink unexpected response", currCmd, text);
						break;
					}
					if (!treatAsOk)
						this.requestFailure(text);
				}

				/*	Successful response ('OK' for commands, reply for query),
					or error deemed as "ok" above since there's nothing we can
					do about it anyway, and there's no point in rejecting and
					subsequently re-trying it.
				 */
				if (treatAsOk)
					this.requestSuccess(text);
			} else
				this.requestFailure("Expected reply " + expectedResponse + ", got " + text);
		} else
			this.warnMsg("Unexpected data", text);
		this.requestFinished();
	}

	/**
	 * Called on receiveing ERR3, meaning that the command was OK, but the projector
	 * currently isn't in a state where it can handle it. E.g., asking for the input
	 * or attempting to switch input, while in standby or not yet fully awake.
	 */
	private projectorBusy() {
		if (!this.busyHoldoff) {
			this.busyHoldoff = wait(4000);
			this.busyHoldoff.then((): CancelablePromise<void>  => this.busyHoldoff = undefined);
		}
	}

	/**
	 * Override to hold off commands also while busyHoldoff.
	 */
	protected okToSendCommand(): boolean {
		return !this.busyHoldoff && super.okToSendCommand();
	}
}

class MuteState extends BoolState {
	correct(drvr: NetworkProjector): Promise<string> {
		return this.correct2(drvr, this.wanted ? '31' : '30');
	}
}
