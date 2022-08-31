/*
	Driver for Athmen MRX x20 devices

    Based on manufacturers command reference
    https://www.anthemav.com/downloads/MRX-x20-AVM-60-IP-RS-232.xls

 	Copyright (c) 2020 No Parking Production ApS, Denmark (https://noparking.dk). All Rights Reserved.
	Created by: Samuel Walz <mail@samwalz.com>
    Version: 0.6
    Features:
    - power on/off (main / all / zone2 & 3)
	- volume / mute (main / zone 2&3)
	- misc (front screen brightness, display message, info)

 */

import {NetworkTCP} from "system/Network";
import {callable, driver, max, min, parameter, property} from "system_lib/Metadata";
import {BoolState, NetworkProjector, NumState, State} from "driver/NetworkProjector";
import {Driver} from "system_lib/Driver";

const ZONE_ALL = 'Z0';
const ZONE_MAIN = 'Z1';
const ZONE_2 = 'Z2';
const ZONE_3 = 'Z3';

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

const VOL_MIN = -90;
const VOL_MAX = 10;

const LOG_DEBUG = true;

@driver('NetworkTCP', { port: 14999 })
export class AnthemMRX_x20 extends NetworkProjector {

	private busyHoldoff?: CancelablePromise<void>;	// See projectorBusy()
	private recentCmdHoldoff?: CancelablePromise<void>;	// See sentCommand()

	private _fpb: NumState;
	private _mut: BoolState;
	private _powerAll: boolean;
	private _powZone2: BoolState;
	private _powZone3: BoolState;
	private powerZone2: boolean;
	private powerZone3: boolean;
	private _sip: BoolState;
	private _vol: SignedNumberState;

	private readonly staticInfo: Dictionary<string>;

	private getToKnowRunning: boolean;

	constructor(socket: NetworkTCP) {
		socket.setReceiveFraming(';');
		super(socket);
		this.staticInfo = {};
		this.addState(this._power = new BoolState(ZONE_MAIN + CMD_POW, 'power'));
		this.addState(this._fpb = new NumState(CMD_FPB, 'frontPanelBrightness', 0, 3));
		this.addState(this._mut = new BoolState(ZONE_MAIN + CMD_MUT, 'mute'));
		this.addState(this._sip = new BoolState(CMD_SIP, 'standbyIPControl'));
		this.addState(this._vol = new SignedNumberState(ZONE_MAIN + CMD_VOL, 'volume'));
		this.poll();	// Get polling going
		this.attemptConnect();	// Attempt initial connection
		console.log(this.socket.fullName);
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
		const brightness = this._fpb.get();
		return brightness ? brightness : 0;
	}

	@property('Info')
	public get info(): string {
		return '' +
		// 'model and firmware: ' + this.staticInfo[CMD_IDQ] + '\n' +
		'model: ' + this.staticInfo[CMD_IDM] + '\n' +
		'software version: ' + this.staticInfo[CMD_IDS] + '\n' +
		'region: ' + this.staticInfo[CMD_IDR] + '\n' +
		'software date: ' + this.staticInfo[CMD_IDB] + '\n' +
		'hardware version: ' + this.staticInfo[CMD_IDH] + '\n' +
		'MCU MAC: ' + this.staticInfo[CMD_IDN] + '\n' +
		'';
	}

	@property("Mute")
	public set mute(value: boolean) {
		if (this._mut.set(value)) {
			this.sendCorrection();
		}
	}
	public get mute(): boolean {
		const mute = this._mut.get();
		return mute ? mute : false;
	}

	@property('Power All Zones on/off')
	public set powerAll(on: boolean) {
		this.power = on;
		if (this._powZone2)
			this['powerZone2'] = on;
		if (this._powZone3)
			this['powerZone3'] = on;
		this._powerAll = on;
	}
	public get powerAll(): boolean {
		return this._powerAll;
	}
	private updatePowerAll(): void {
		const mainOn = this._power.get();
		const zone2On = (!this._powZone2 || this._powZone2.get());
		const zone3On = (!this._powZone3 || this._powZone3.get());
		const newValue = mainOn && zone2On && zone3On;
		if (this._powerAll !== newValue) {
			this._powerAll = newValue;
			this.changed('powerAll');
		}
	}

	private createDynamicPowerProperty (zone: number) : void {
		if (LOG_DEBUG) console.log('trying to create dynamic power property for zone ' + zone);
		const state: BoolState = (<any>this)['_powZone' + zone];
		this.property<boolean>('powerZone' + zone, { type: Boolean, description: 'Power Zone ' + zone + ' on/off)'}, setValue => {
			if (setValue !== undefined) {
				if (state?.set(setValue)) this.sendCorrection();
			}
			return state?.get();
		});
	}

	@property("Standby IP Control. This must be enabled for the power-on command to operate via IP. Note that anabling this disables ECO mode.")
	public set standbyIPControl(value: boolean) {
		if (this._sip.set(value)) {
			this.sendCorrection();
		}
	}
	public get standbyIPControl(): boolean {
		return this._sip.get();
	}

	@property("Volume, Main Zone")
	@min(VOL_MIN)
	@max(VOL_MAX)
	public set volume(value: number) {
		if (this._vol.set(value)) {
			this.sendCorrection();
		}
	}
	public get volume(): number {
		const volume = this._vol.get();
		return volume === undefined ? 0 : volume;
	}

	private createDynamicVolumeProperty (zone: number) : void {
        if (LOG_DEBUG) console.log('trying  to create dynamic volume property for zone ' + zone);
        const state: SignedNumberState = (<any>this)['_volZone' + zone];
		this.property<number>('volumeZone' + zone, { type: Number, min: VOL_MIN, max: VOL_MAX, description: 'Volume Zone ' + zone + ')'}, setValue => {
			if (setValue !== undefined) {
				if (state?.set(setValue)) this.sendCorrection();
			}
			const stateValue = state?.get();
			return stateValue;
		});
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


    protected textReceived(text: string): void {
		// if (text == '') return;
		// if (LOG_DEBUG) console.log(text);
		let result = text;
		let error = undefined;
		const requestActive = this.currCmd !== undefined;
		if (text[0] == '!') {
			const firstTwoChars = text.substr(0, 2);
			error = firstTwoChars;
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
					// failed = true;
					break;
			}
			if (failed) {
				this.requestFailure(text);
				return;
			}
		} else {
			// console.log(text + ' vs ' + this.currCmd + ' ' + requestActive);
		}
		if (requestActive) {
			this.requestSuccess(result);
			this.requestFinished();
		}
		this.processStatusChange(text, error);
    }
	private processStatusChange(text: string, error?: string) {
		const firstChar = text.substr(0, 1);
		if (firstChar == 'Z') {
			const zoneID = parseInt(text.substr(1, 1));
			const cmd = text.substr(2, 3);
			const value = text.substr(5);
			switch(cmd) {
				case CMD_MUT:
					const newMute = value == '1';
					if (zoneID == 1) this._mut.updateCurrent(newMute);
					break;
				case CMD_POW:
					const newPower = value == '1';
					if (zoneID == 1) this._power.updateCurrent(newPower);
					else if (value !== '?') {
						let state: BoolState = (<any>this)['_powZone' + zoneID];
						if (!state) state = this.setupStates(zoneID).pow;
						state.updateCurrent(newPower);
					}
					this.updatePowerAll();
					// update volume
					if (!this.getToKnowRunning && newPower) this.request('Z' + zoneID + CMD_VOL);
					break;
				case CMD_VOL:
					const newVolume = parseInt(value);
					if (zoneID == 1) this._vol.updateCurrent(newVolume);
					else if (value !== '?') {
						let state: SignedNumberState = (<any>this)['_volZone' + zoneID];
						if (!state) state = this.setupStates(zoneID).vol;
						state.updateCurrent(newVolume);
					}
					break;
			}
		} else if (text.length > 3) {
			const cmd = text.substr(0, 3);
			const value = text.substr(3);
			switch (cmd) {
				case CMD_FPB:
					const newBrightness = parseInt(value);
					this._fpb.updateCurrent(newBrightness);
					break;
				case CMD_IDB:
				case CMD_IDH:
				case CMD_IDM:
				case CMD_IDN:
				case CMD_IDQ:
				case CMD_IDR:
				case CMD_IDS:
					this.staticInfo[cmd] = value;
					this.changed('info');
					break;
			}
		}
	}


	private setupStates(zone: number, zoneOff?: boolean): {pow: BoolState, vol: SignedNumberState} {
		return {
			pow: this.setupPowerState(zone),
			vol: this.setupVolumeState(zone, zoneOff ? 0 : undefined),
		};
	}
	private setupPowerState(zone: number): BoolState {
		const state = (<any>this)['_powZone' + zone] = new BoolState('Z' + zone + CMD_POW, 'powerZone' + zone);
		this.addState(state);
		this.createDynamicPowerProperty(zone);
		return state;
	}
	private setupVolumeState(zone: number, initialVolume?: number): SignedNumberState {
		const state = (<any>this)['_volZone' + zone] = new SignedNumberState('Z' + zone + CMD_VOL, 'volumeZone' + zone);
		if (initialVolume !== undefined) state.updateCurrent(initialVolume);
		this.addState(state);
		this.createDynamicVolumeProperty(zone);
		return state;
	}

    protected justConnected(): void {
        console.log('connected');
        this.connected = true;
		this.getToKnowRunning = true;
		this.requestPower().then(
			() => this.requestVolumes().then(
				() => this.requestStaticInfo().then(
					() => this.getToKnowRunning = false
				)
			)
		);
	}
	private requestPower(): Promise<void> {
		return this.requestAllZones(CMD_POW);
	}
	private requestVolumes(): Promise<void> {
		return this.requestAllZones(CMD_VOL);
	}
	private requestAllZones(cmd: string): Promise<void> {
		return new Promise<void>((resolve) => {
			this.request(ZONE_MAIN + cmd).finally(
				() => this.request(ZONE_2 + cmd).finally (
					() => this.request(ZONE_3 + cmd).finally(
						() => resolve()
					)
				)
			)
		});
	}
	private requestStaticInfo() {
		return new Promise<void>((resolve) => {
			this.request(CMD_IDQ).finally(
				() => this.request(CMD_IDM).finally(
					() => this.request(CMD_IDS).finally(
						() => this.request(CMD_IDR).finally(
							() => this.request(CMD_IDB).finally(
								() => this.request(CMD_IDH).finally(
									() => this.request(CMD_IDN).finally(
										() => resolve()
									)
								)
							)
						)
					)
				)
			)
		});
	}

    protected getDefaultEoln(): string | undefined {
		return ';';
	}
    protected pollStatus(): boolean {
		if (this.okToSendCommand()) {
			this.request(ZONE_MAIN + CMD_POW)
			.catch(error => {
				this.warnMsg("pollStatus error", error);
				this.disconnectAndTryAgainSoon();	// Triggers a new cycle soon
			});
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
		const request = this.correct2(drvr, (this.wanted >= 0 ? '+' : '') + this.wanted.toString());
		return request;
	}

	set(v: number): boolean {
		return super.set(Math.round(v));
	}


	get(): number {
		var result = super.get();
		return result !== undefined ? result : 0;
	}
}

// A simple typed dictionary type, using a string as key
interface Dictionary<TElem> {
	[id: string]: TElem;
}
