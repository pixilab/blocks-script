/*
	Driver for Athmen MRX x20 devices

    Based on manufacturers command reference
    https://www.anthemav.com/downloads/MRX-x20-AVM-60-IP-RS-232.xls

 	Copyright (c) 2020 No Parking Production ApS, Denmark (https://noparking.dk). All Rights Reserved.
	Created by: Samuel Walz <mail@samwalz.com>
    Version: 0.3
    Features:
    - power on/off (main / all)
	- volume / mute (main)
	- misc (front screen brightness, display message)

 */

import {NetworkTCP} from "system/Network";
import {callable, driver, max, min, parameter, property} from "system_lib/Metadata";
import {BoolState, NetworkProjector, NumState, State} from "driver/NetworkProjector";
import {Driver} from "system_lib/Driver";

const ZONE_ALL = 'Z0';
const ZONE_MAIN = 'Z1';


/* read / write */
/* global */
/** Front panel brightness: 0=off, 1=low, 2=medium, 3=high */ const CMD_FPB = 'FPB';
/** Standby IP Control: 0=disabled, 1=enabled */ const CMD_SIP = 'SIP';
/* zone specific (need zone prefix Zx) */
const CMD_MUT = 'MUT'; // Mute: 0=unmute, 1=mute
const CMD_POW = 'POW'; // power
const CMD_VOL = 'VOL'; // Volume setting: s=sign: +/-, yy=value.  Example: Z1VOL-35 represents main zone volume set to -35 dB.  Entry is rounded to nearest valid value.
/* read only */
/** Query model and firmware version */ const CMD_IDQ = 'IDQ';
/** Query model */                      const CMD_IDM = 'IDM';
/** Query software version */           const CMD_IDS = 'IDS';
/** Query region */                     const CMD_IDR = 'IDR';
/** Query software build date */        const CMD_IDB = 'IDB';
/** Query hardware version */           const CMD_IDH = 'IDH';
/** Query MCU MAC Address */            const CMD_IDN = 'IDN';
/* write only */
/** Z1MSGxyyyy x=row 0-1, yyyy=message */ const CMD_MSG = 'MSG';

const ERROR_CANNOT_BE_EXECUTED_PREFIX = '!E';
const ERROR_OUT_OF_RANGE_PREFIX = '!R';
const ERROR_INVALID_COMMAND_PREFIX = '!I';
const ERROR_ZONE_OFF_PREFIX = '!Z';


@driver('NetworkTCP', { port: 14999 })
export class AnthemMRX_x20 extends NetworkProjector {

	private busyHoldoff?: CancelablePromise<void>;	// See projectorBusy()
	private recentCmdHoldoff?: CancelablePromise<void>;	// See sentCommand()

	private _fpb: NumState;
	private _mut: BoolState;
	private _powerAll: BoolState;
	private _sip: BoolState;
	private _vol: SignedNumberState;

    constructor(socket: NetworkTCP) {
        socket.setReceiveFraming(';');
		super(socket);
        this.addState(this._power = new BoolState(ZONE_MAIN + CMD_POW, 'power'));
		this.addState(this._powerAll = new BoolState(ZONE_ALL + CMD_POW, 'powerAll'));
		this.addState(this._fpb = new NumState(CMD_FPB, 'frontPanelBrightness', 0, 3));
		this.addState(this._mut = new BoolState(ZONE_MAIN + CMD_MUT, 'mute'));
		this.addState(this._vol = new SignedNumberState(ZONE_MAIN + CMD_VOL, 'volume'));
        this.poll();	// Get polling going
		this.attemptConnect();	// Attempt initial connection
        console.log(this.socket.fullName);
        // socket.enableWakeOnLAN();

	}

	@property('Front panel brightness: 0=off, 1=low, 2=medium, 3=high')
	@min(0)
	@max(3)
	public set frontPanelBrightness(value: number) {
		if (this._fpb.set(Math.round(value))) {
            this.sendCorrection();
        }
	}
	public get frontPanelBrightness(): number {
		return this._fpb.get();
	}

	@property("Mute")
	public set mute(value: boolean) {
		if (this._mut.set(value)) {
            this.sendCorrection();
        }
	}
	public get mute(): boolean {
		return this._mut.get();
	}

	@property('Power All Zones on/off')
	public set powerAll(on: boolean) {
		if (this._powerAll.set(on))
			this.sendCorrection();
	}
	public get powerAll(): boolean {
		return this._power.get();
	}

	@property("Volume, Main Zone")
	@min(-90)
	@max(10)
	public set volume(value: number) {
		if (this._vol.set(value)) {
            this.sendCorrection();
        }
	}
	public get volume(): number {
		return this._vol.get();
	}

	@callable('Display Message')
	public displayMessage(
		@parameter('message') message: string,
		@parameter('row 0-1', true) row?: number
	): void {
		this.sendText(
			ZONE_MAIN + CMD_MSG +
			Math.round(row) +
			message.substr(0, 100)
		);
	}

    // @callable('wake device')
    // public wakeUp () {
    //     this.socket.wakeOnLAN();
    // }

    protected textReceived(text: string): void {
		let result = text;
		if (text[0] == '!') {
			const firstTwoChars = text.substr(0, 2);
			const followingChars = text.substr(2);
			let failed = false;
			switch (firstTwoChars) {
				case ERROR_CANNOT_BE_EXECUTED_PREFIX:
					console.warn('can not be executed: "' + followingChars + '"');
					break;
				case ERROR_OUT_OF_RANGE_PREFIX:
					console.warn('command out of range: "' + followingChars + '"');
					break;
				case ERROR_INVALID_COMMAND_PREFIX:
					console.error('invalid command: "' + followingChars + '"');
					break;
				case ERROR_ZONE_OFF_PREFIX:
					console.warn('zone is off: "' + followingChars + '"');
					failed = true;
					break;
			}
			if (failed) {
				this.requestFailure(text);
				return;
			}
		}
		this.requestSuccess(result);
		this.requestFinished();
    }
    protected justConnected(): void {
        console.log('connected');
        this.connected = true;
	}
    protected getDefaultEoln(): string | undefined {
		return ';';
	}
    protected pollStatus(): boolean {
		if (this.okToSendCommand()) {	// Don't interfere with command already in flight
			const powerRequest = ZONE_MAIN + CMD_POW;
			this.request(powerRequest).then(
				reply => {
					if (reply.substr(0, powerRequest.length) == powerRequest) {
						const on = (parseInt(reply.substr(powerRequest.length)) & 1) != 0;
						if (!this.inCmdHoldoff())
							this._power.updateCurrent(on);
					}
				}
			).catch(error => {
				this.warnMsg("pollStatus error", error);
				this.disconnectAndTryAgainSoon();	// Triggers a new cycle soon
			});
			// console.info("pollStatus");
		}
		return true;	// Check back again in a bit
	}
    request(question: string, param?: string): Promise<string> {
        var toSend = question;
        toSend += (param === undefined) ? '?' : param;
        // console.info("request", toSend);
        this.socket.sendText(toSend, this.getDefaultEoln()).catch(
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
    private inCmdHoldoff() {
		return this.recentCmdHoldoff
	}
    private projectorBusy() {
		if (!this.busyHoldoff) {
			this.busyHoldoff = wait(4000);
			this.busyHoldoff.then(() => this.busyHoldoff = undefined);
		}
	}
	protected okToSendCommand(): boolean {
		return !this.busyHoldoff && super.okToSendCommand();
	}

}

class StringState extends State<string> {
	correct(drvr: NetworkProjector): Promise<string> {
		return this.correct2(drvr, this.wanted);
	}
}
class SignedNumberState extends State<number> {
	correct(drvr: NetworkProjector): Promise<string> {
		return this.correct2(drvr, (this.wanted >= 0 ? '+' : '') + this.wanted.toString());
	}

	set(v: number): boolean {
		return super.set(Math.round(v));
	}


	// get(): number {
	// 	var result = super.get();
	// 	// Better return min/0 than undefined or some invalid type of data
	// 	if (typeof result !== 'number') {
	// 		console.error("Value invalid for", this.baseCmd, result);
	// 		result = this.min || 0;
	// 	}
	// 	return result;
	// }
}
