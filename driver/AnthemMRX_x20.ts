/*
	Driver for Athmen MRX x20 devices

    Based on manufacturers command reference
    https://www.anthemav.com/downloads/MRX-x20-AVM-60-IP-RS-232.xls

 	Copyright (c) 2020 No Parking Production ApS, Denmark (https://noparking.dk). All Rights Reserved.
	Created by: Samuel Walz <mail@samwalz.com>
    Version: 0.1
    Features:
    - power on/off


 */

import {NetworkTCP} from "system/Network";
import {callable, driver, parameter, property} from "system_lib/Metadata";
import {BoolState, NetworkProjector, NumState} from "driver/NetworkProjector";
import {Driver} from "system_lib/Driver";


@driver('NetworkTCP', { port: 14999 })
export class AnthemMRX_x20 extends NetworkProjector {
    private busyHoldoff?: CancelablePromise<void>;	// See projectorBusy()
	private recentCmdHoldoff?: CancelablePromise<void>;	// See sentCommand()
    constructor(socket: NetworkTCP) {
        socket.setReceiveFraming(';');
		super(socket);
        this.addState(this._power = new BoolState('Z0POW', 'power'));
        // this.poll();	// Get polling going
		this.attemptConnect();	// Attempt initial connection
        console.log(this.socket.fullName);
        // socket.enableWakeOnLAN();
        // console.info("inited");
	}

    // @callable('wake device')
    // public wakeUp () {
    //     this.socket.wakeOnLAN();
    // }

    protected textReceived(text: string): void {
        console.log(text);
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
			this.request('Z0POW').then(
				reply => {
					const on = (parseInt(reply) & 1) != 0;
					if (!this.inCmdHoldoff())
						this._power.updateCurrent(on);
					// if (on && this.okToSendCommand()) // Attempt input too on case never done
					// 	this.getInputState(true);
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
        // toSend += ' ';
        toSend += (param === undefined) ? '?' : param;
        // toSend += ';';
        console.info("request", toSend);
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
