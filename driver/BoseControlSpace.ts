/*
 * Copyright (c) 2018 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {NetworkTCP} from "system/Network";
import {callable, driver, max, min, parameter, property} from "system_lib/Metadata";
import {Driver} from "system_lib/Driver";


/**
Basic driver for BOSE BoseControlSpace (e.g. PowerMatch 4250).
*/
@driver('NetworkTCP', { port: 10055 })
export class BoseControlSpace extends Driver<NetworkTCP> {
	private toSend: Dictionary<Command>;	// Commands that to send, keyed by getKey()
	private pendingSend: CancelablePromise<void>;	// If have a pending send

	private readonly micMuteState: Dictionary<boolean>; // Stored under the mic name
	private readonly micVolumeState: Dictionary<number>;


	// Property values, so they cn be read back
	private mParamSet = 0;
	private mStandBy = false;

	constructor(private socket: NetworkTCP) {
		super(socket);
		socket.autoConnect();
		this.toSend = {};
		this.micMuteState = {};
		this.micVolumeState = {};
		socket.subscribe('connect', (sender, msg) => {
			// Connection state changed
			if (this.pendingSend) {
				this.pendingSend.cancel();
				this.pendingSend = undefined;
				// …so it will be re-initiated when connection restored
			}
			if (sender.connected && Object.keys(this.toSend).length)
				this.sendSoon(); // Now connected - attempt to send
		});
	}

	@property("Standby power mode")
	public set standBy(stby: boolean) {
		this.mStandBy = stby;
		this.requestSendCmd(new StbyCmd(stby));
	}
	public get standBy(): boolean {
		return this.mStandBy;
	}

	@property("Parameter set")
	@min(0) @max(255)
	public set parameterSet(setNum: number) {
		setNum = Math.round(setNum);
		this.mParamSet = setNum;
		this.requestSendCmd(new ParamSetCmd(setNum));
	}
	public get parameterSet():number {
		return this.mParamSet;
	}


	@property("Mute Mic1")
	public set muteMic1(mute: boolean) {
		this.requestSendCmd(this.getMicMuteCmd('Mic1', mute));
	}
	public get muteMic1(): boolean {
		return this.getMicMuteState('Mic1');
	}

	@property("Volume Mic1") @min(-60) @max(12)
	public set volumeMic1(volume: number) {
		this.requestSendCmd(this.getMicVolumeCmd('Mic1', volume));
	}
	public get volumeMic1(): number {
		return this.getMicVolumeState('Mic1');
	}

	@property("Mute Mic2")
	public set muteMic2(mute: boolean) {
		this.requestSendCmd(this.getMicMuteCmd('Mic2', mute));
	}
	public get muteMic2(): boolean {
		return this.getMicMuteState('Mic2');
	}

	@property("Volume Mic2") @min(-60) @max(12)
	public set volumeMic2(volume: number) {
		this.requestSendCmd(this.getMicVolumeCmd('Mic2', volume));
	}
	public get volumeMic2(): number {
		return this.getMicVolumeState('Mic2');
	}


	@property("Mute Mic3")
	public set muteMic3(mute: boolean) {
		this.requestSendCmd(this.getMicMuteCmd('Mic3', mute));
	}
	public get muteMic3(): boolean {
		return this.getMicMuteState('Mic3');
	}

	@property("Volume Mic3") @min(-60) @max(12)
	public set volumeMic3(volume: number) {
		this.requestSendCmd(this.getMicVolumeCmd('Mic3', volume));
	}
	public get volumeMic3(): number {
		return this.getMicVolumeState('Mic3');
	}

	@property("Mute Mic4")
	public set muteMic4(mute: boolean) {
		this.requestSendCmd(this.getMicMuteCmd('Mic4', mute));
	}
	public get muteMic4(): boolean {
		return this.getMicMuteState('Mic4');
	}

	@property("Volume Mic4") @min(-60) @max(12)
	public set volumeMic4(volume: number) {
		this.requestSendCmd(this.getMicVolumeCmd('Mic4', volume));
	}
	public get volumeMic4(): number {
		return this.getMicVolumeState('Mic4');
	}

	@property("Mute Mic5")
	public set muteMic5(mute: boolean) {
		this.requestSendCmd(this.getMicMuteCmd('Mic5', mute));
	}
	public get muteMic5(): boolean {
		return this.getMicMuteState('Mic5');
	}

	@property("Volume Mic5") @min(-60) @max(12)
	public set volumeMic5(volume: number) {
		this.requestSendCmd(this.getMicVolumeCmd('Mic5', volume));
	}
	public get volumeMic5(): number {
		return this.getMicVolumeState('Mic5');
	}

	@property("Mute Mic6")
	public set muteMic6(mute: boolean) {
		this.requestSendCmd(this.getMicMuteCmd('Mic6', mute));
	}
	public get muteMic6(): boolean {
		return this.getMicMuteState('Mic6');
	}

	@property("Volume Mic6") @min(-60) @max(12)
	public set volumeMic6(volume: number) {
		this.requestSendCmd(this.getMicVolumeCmd('Mic6', volume));
	}
	public get volumeMic6(): number {
		return this.getMicVolumeState('Mic6');
	}

	@property("Mute Mic7")
	public set muteMic7(mute: boolean) {
		this.requestSendCmd(this.getMicMuteCmd('Mic7', mute));
	}
	public get muteMic7(): boolean {
		return this.getMicMuteState('Mic7');
	}

	@property("Volume Mic7") @min(-60) @max(12)
	public set volumeMic7(volume: number) {
		this.requestSendCmd(this.getMicVolumeCmd('Mic7', volume));
	}
	public get volumeMic7(): number {
		return this.getMicVolumeState('Mic7');
	}

	@property("Mute Mic8")
	public set muteMic8(mute: boolean) {
		this.requestSendCmd(this.getMicMuteCmd('Mic8', mute));
	}
	public get muteMic8(): boolean {
		return this.getMicMuteState('Mic8');
	}

	@property("Volume Mic8") @min(-60) @max(12)
	public set volumeMic8(volume: number) {
		this.requestSendCmd(this.getMicVolumeCmd('Mic8', volume));
	}
	public get volumeMic8(): number {
		return this.getMicVolumeState('Mic8');
	}

	@property("Mute Mic9")
	public set muteMic9(mute: boolean) {
		this.requestSendCmd(this.getMicMuteCmd('Mic9', mute));
	}
	public get muteMic9(): boolean {
		return this.getMicMuteState('Mic9');
	}

	@property("Volume Mic9") @min(-60) @max(12)
	public set volumeMic9(volume: number) {
		this.requestSendCmd(this.getMicVolumeCmd('Mic9', volume));
	}
	public get volumeMic9(): number {
		return this.getMicVolumeState('Mic9');
	}

	@property("Mute Mic10")
	public set muteMic10(mute: boolean) {
		this.requestSendCmd(this.getMicMuteCmd('Mic10', mute));
	}
	public get muteMic10(): boolean {
		return this.getMicMuteState('Mic10');
	}

	@property("Volume Mic10") @min(-60) @max(12)
	public set volumeMic10(volume: number) {
		this.requestSendCmd(this.getMicVolumeCmd('Mic10', volume));
	}
	public get volumeMic10(): number {
		return this.getMicVolumeState('Mic10');
	}

	private getMicMuteCmd(name: string, mute: boolean) {
		this.micMuteState[name] = mute;
		return new MicMute(name, mute);
	}
	private getMicMuteState(name: string): boolean {
		return this.micMuteState[name] || false;
	}


	private getMicVolumeCmd(name: string, volume: number): Command | undefined {
		volume = Math.round(volume);
		const oldState = this.micVolumeState[name];
		if (volume !== oldState) {
			this.micVolumeState[name] = volume;
			return new MicVolume(name, volume);
		}
	}
	private getMicVolumeState(name: string): number {
			return this.micVolumeState[name] || 0;
	}

	@callable("Send raw command string, automatically terminated by CR")
	public sendString(toSend: string) {
		return this.socket.sendText(toSend);
	}

	/**
	 Set the volume to a normalized value in range 0...1.2, which maps
	 to -60 ... +12 dB.
	 */
	@callable("Set the volume of slot and channel to normalized value")
	public setVolume(
		@parameter("Slot to set") slot: number,
		@parameter("Channel to set") channel: number,
		@parameter("Value (0…1.2)") normValue: number
	) {
		this.requestSendCmd(new VolumeCmd(slot, channel, normVolume(normValue)));
	}

	/**
	 Set the group level 1…64 to a normalized value in range 0...1, which maps
	 to -60 ... 0 dB. I also allow "boost" by sepcifying a value greater than 1, which
	 can be used to boost the signal to at most +12dB on supporting devices.
	 */
	@callable("Set the level of specified group to normalized value")
	public setGroupLevel(
		@parameter("Group to set (1…64)") group: number,
		@parameter("Value (0…1.2)") normValue: number
	) {
		group = Math.max(1, Math.min(group, 64));
		this.requestSendCmd(new GroupLevelCmd(group, normVolume(normValue)));
	}

	/**
	 Request a command to be sent. Will schedule a send operation soon.
	 Note that a new Command with same key as an existing one will
	 replace the existing one, making it send only the last one
	 with same key.
	 */
	private requestSendCmd(cmd: Command) {
		if (cmd) {
			if (Object.keys(this.toSend).length === 0)
				this.sendSoon();
			this.toSend[cmd.getKey()] = cmd;
		}
	}

	/**
	 Attempt to make sure commands in toSend are sent soon.
	 */
	private sendSoon(howSoonMillis = 10) {
		if (!this.pendingSend) {
			this.pendingSend = wait(howSoonMillis);
			this.pendingSend.then(() => {
				this.pendingSend = undefined;	// Now taken
				if (this.socket.connected)
					this.sendNow();
				// Else will try once connected
			});
		}
	}


	/**
	 Attempt to send all commands in toSend. If fails, then restore to toSend
	 and try again soon.
	 */
	private sendNow() {
		const sendNow = this.toSend;	// Pick up all we're to send
		if (Object.keys(sendNow).length > 0) {
			this.toSend = {};	// To accumulate new commands that may appear meanwhile
			var cmdStr = '';	// Concat commands for ALL to send now here
			for (let cmdKey in sendNow) { // Concatenate all pending commands
				var cmd = sendNow[cmdKey].getCmdStr();;
				// console.log(cmd);
				cmdStr += cmd;
				cmdStr += '\r';	// Each command terminated by Carriage Return
			}
			this.socket.sendText(cmdStr, null).catch(error => {
				console.warn("Error send command", error);
				/*	Failed sending for some reason. Put back sendNow commands into
					this.toSend unless superseded. Then try again soon.
				 */
				for (let cmdKey in sendNow) {
					if (!this.toSend[cmdKey])	// Got nothing newer there for key
						this.toSend[cmdKey] = sendNow[cmdKey];	// Put failed command back
				}
				this.sendSoon(3000);	// Try again later
			});
		}
	}
}

interface Dictionary<TElem> {
	[id: string]: TElem;
}

/**
 * Model each command its own subclass of Command, able to render itself into
 * the required command string to send to the device.
 */
abstract class Command {
	protected constructor(protected baseCmd: string) {
	}

	// Return full command string EXCEPT the terminating \r
	abstract getCmdStr(): string;

	// Base cmd also used as key (to not overwrite new values with old failed sends)
	getKey(): string {
		return this.baseCmd;
	}
}

class StbyCmd extends Command {
	constructor(private stby: boolean) {
		super("SY ");
	}

	// Append S or N for Standby or Normal
	getCmdStr(): string {
		return this.baseCmd + (this.stby ? 'S' : 'N');
	}
}

class ParamSetCmd extends Command {
	constructor(private value: number) {
		super("SS ");
	}

	// Append hex value
	getCmdStr(): string {
		return this.baseCmd + this.value.toString(16);
	}
}

class GroupLevelCmd extends Command {

	constructor(channel: number, private value: number) {
		super("SG " + channel.toString(16) + ',');
	}

	// Append hex value
	getCmdStr(): string {
		return this.baseCmd + this.value.toString(16);
	}
}

class VolumeCmd extends Command {

	constructor(slot: number, channel: number, private value: number) {
		super("SV " + slot.toString(16) + ',' + channel.toString(16));
	}

	// Append comma and hex value
	getCmdStr(): string {
		return this.baseCmd + ',' + this.value.toString(16);
	}
}

class MicVolume extends Command {
	constructor(name: string, private value: number) {
		super('SA"' + name + '">1=');
	}
	getCmdStr(): string {
		return this.baseCmd + this.value.toFixed(1);
	}
}

class MicMute extends Command {
	constructor(name: string, private mute: boolean) {
		super('SA"' + name + '">2=');
	}
	getCmdStr(): string {
		return this.baseCmd + (this.mute ? 'O' : 'F');
	}
}

/**
 * Return normalized "volume" value 0…1 as 0…120, with possible overshoot for larger than 1
 * input value up to 1.2. This corresponds to 0h(-60dB) to 90h(+12dB) in 0.5dB steps
 * (0-144 dec), where 120 is at 0dB.
 */
function normVolume(normValue: number): number {
	const value = Math.round(normValue * 120);	// 0.5 db steps
	return Math.max(0, Math.min(value, 144)); // Clip to allowed range
}
