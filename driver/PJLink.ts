/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2018 by Mike Fahl.
 */
import {NetworkTCP} from "system/Network";
import {BoolState, NetworkProjector, NumState} from "driver/NetworkProjector";
import * as Meta from "system_lib/Metadata";

/**
 Manage a PJLink projector, accessed through a provided NetworkTCPDevice connection.
 */
@Meta.driver('NetworkTCP', { port: 4352 })
export class PJLink extends NetworkProjector {
	private unauthenticated: boolean;	// True if projector requires authentication
	protected _input: NumState;
	private static kMinInput = 11;
	private static kMaxInput = 59;
	private busyHoldoff?: CancelablePromise<void>;	// See projectorBusy()
	private recentCmdHoldoff?: CancelablePromise<void>;	// See sentCommand()

	constructor(socket: NetworkTCP) {
		super(socket);
		this.addState(this._power = new BoolState('POWR', 'power'));
		this.addState(this._input = new NumState(
			'INPT', 'input',
			PJLink.kMinInput, PJLink.kMaxInput, () => this._power.getCurrent()
		));

		this.poll();	// Get polling going
		this.attemptConnect();	// Attempt initial connection
		// console.info("inited");
	}

    /**
	 	Poll for status regularly. This keeps me somewhat in the loop with manual control
	 	of projector. It also helps with detecting projector unplugged.
	 */
    protected pollStatus(): boolean {
		if (this.okToSendCommand()) {	// Don't interfere with command already in flight
			this.request('POWR').then(
				reply => {
					const on = (parseInt(reply) & 1) != 0;
					if (!this.inCmdHoldoff())
						this._power.updateCurrent(on);
					if (on && this.okToSendCommand()) // Attempt input too on case never done
						this.getInputState(true);
				}
			).catch(error => {
				this.warnMsg("pollStatus error", error);
				this.disconnectAndTryAgainSoon();	// Triggers a new cycle soon
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
	@Meta.property("Desired input source number")
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
	 Send queries to obtain the initial state of the projector.
	 */
	private getInitialState() {
		this.connected = false;	// Mark me as not yet fully awake, to hold off commands
		this.request('POWR').then(
			reply => {
				if (!this.inCmdHoldoff())
					this._power.updateCurrent((parseInt(reply) & 1) != 0);
				if (this._power.get()) // Power on - proceed quering input
					this.getInputState();
				else {
					this.connected = true;	// Can't query input if off - skip this step
					this.sendCorrection();
				}
			},
			error => {
				this.warnMsg("getInitialState POWR error - retry soon", error);
				this.disconnectAndTryAgainSoon();	// Triggers a new cycle soon
			}
		);
	}

	/**
	 Once we know power is on, proceed quering input state.
	 */
	private getInputState(ignoreError?: boolean) {
		this.request('INPT').then(
			reply => {
				if (!this.inCmdHoldoff())
					this._input.updateCurrent(parseInt(reply));
				this.connected = true;
				this.sendCorrection();
			},
			error => {
				// May fail for "normal" reasons, eg, during power up/down
				this.warnMsg("getInitialState INPT error", error);
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
			this.recentCmdHoldoff = wait(10000);
			this.recentCmdHoldoff.then(() => this.recentCmdHoldoff = undefined);
		}
		return didSend;
	}

	/**
	 * Return truthy if sent a command recently, meaning that any status replies from
	 * the projector may be unreliable, due to the way the projector
	 * answers with the "actual" rather than the "wanted" status, e.g., still
	 * saying it's ON even after you asked it to turn OFF.
	 */
	private inCmdHoldoff() {
		return this.recentCmdHoldoff
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
				var treatAsOk = text.indexOf('ERR') !== 0;
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
						this.projectorBusy();
						// Deliberate fallthrough
					default:
						this.warnMsg("PJLink response", currCmd, text);
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
			this.busyHoldoff.then(() => this.busyHoldoff = undefined);
		}
	}

	/**
	 * Override to hold off commands also while busyHoldoff.
	 */
	protected okToSendCommand(): boolean {
		return !this.busyHoldoff && super.okToSendCommand();
	}
}
