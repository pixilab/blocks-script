/* PIXILAB Blocks driver for the Stotzen Typhoon DSP1212 by Audioteknikk AS, Norway.
 */

import {NetworkUDP} from "system/Network";
import {callable, driver, max, min, parameter, property} from "system_lib/Metadata";
import {Driver} from "system_lib/Driver";


@driver('NetworkUDP', { port: 50000 })
export class StoltzenTyphoon extends Driver<NetworkUDP> {
	private toSend: Dictionary<Command>;	// Commands that to send, keyed by getKey()
	private pendingSend: CancelablePromise<void>;	// If have a pending send

	private readonly micMuteState: Dictionary<boolean>; // Stored under the mic name
	private readonly micVolumeState: Dictionary<number>;


	// Property values, so they can be read back
	private mParamSet = 0;
	private mStandBy = false;

	constructor(private socket: NetworkUDP) {
		super(socket);
		this.toSend = {};
		this.micMuteState = {};
		this.micVolumeState = {};
	}



	@property("Mute Input01")
    public set muteInput01(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#0', mute));
    }
    public get muteInput01(): boolean {
        return this.getMicMuteState('Input#mute#0');
    }

    @property("Volume Input01") @min(-72) @max(12)
    public set volumeInput01(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#0', volume));
    }
    public get volumeInput01(): number {
        return this.getMicVolumeState('Input#gain#0');
    }
    @property("Mute Input02")
    public set muteInput02(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#1', mute));
    }
    public get muteInput02(): boolean {
        return this.getMicMuteState('Input#mute#1');
    }

    @property("Volume Input02") @min(-72) @max(12)
    public set volumeInput02(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#1', volume));
    }
    public get volumeInput02(): number {
        return this.getMicVolumeState('Input#gain#1');
    }
    @property("Mute Input03")
    public set muteInput03(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#2', mute));
    }
    public get muteInput03(): boolean {
        return this.getMicMuteState('Input#mute#2');
    }

    @property("Volume Input03") @min(-72) @max(12)
    public set volumeInput03(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#2', volume));
    }
    public get volumeInput03(): number {
        return this.getMicVolumeState('Input#gain#2');
    }
    @property("Mute Input04")
    public set muteInput04(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#3', mute));
    }
    public get muteInput04(): boolean {
        return this.getMicMuteState('Input#mute#3');
    }

    @property("Volume Input04") @min(-72) @max(12)
    public set volumeInput04(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#3', volume));
    }
    public get volumeInput04(): number {
        return this.getMicVolumeState('Input#gain#3');
    }

    @property("Mute Input05")
    public set muteInput05(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#4', mute));
    }
    public get muteInput05(): boolean {
        return this.getMicMuteState('Input#mute#4');
    }

    @property("Volume Input05") @min(-72) @max(12)
    public set volumeInput05(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#4', volume));
    }
    public get volumeInput05(): number {
        return this.getMicVolumeState('Input#gain#4');
    }

    @property("Mute Input06")
    public set muteInput06(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#5', mute));
    }
    public get muteInput06(): boolean {
        return this.getMicMuteState('Input#mute#5');
    }

    @property("Volume Input06") @min(-72) @max(12)
    public set volumeInput06(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#5', volume));
    }
    public get volumeInput06(): number {
        return this.getMicVolumeState('Input#gain#5');
    }

    @property("Mute Input07")
    public set muteInput07(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#6', mute));
    }
    public get muteInput07(): boolean {
        return this.getMicMuteState('Input#mute#6');
    }

    @property("Volume Input07") @min(-72) @max(12)
    public set volumeInput07(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#6', volume));
    }
    public get volumeInput07(): number {
        return this.getMicVolumeState('Input#gain#6');
    }

    @property("Mute Input08")
    public set muteInput08(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#7', mute));
    }
    public get muteInput08(): boolean {
        return this.getMicMuteState('Input#mute#7');
    }

    @property("Volume Input08") @min(-72) @max(12)
    public set volumeInput08(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#7', volume));
    }
    public get volumeInput08(): number {
        return this.getMicVolumeState('Input#gain#7');
    }

    @property("Mute Input09")
    public set muteInput09(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#8', mute));
    }
    public get muteInput09(): boolean {
        return this.getMicMuteState('Input#mute#8');
    }

    @property("Volume Input09") @min(-72) @max(12)
    public set volumeInput09(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#8', volume));
    }
    public get volumeInput09(): number {
        return this.getMicVolumeState('Input#gain#8');
    }

    @property("Mute Input10")
    public set muteInput10(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#9', mute));
    }
    public get muteInput10(): boolean {
        return this.getMicMuteState('Input#mute#9');
    }

    @property("Volume Input10") @min(-72) @max(12)
    public set volumeInput10(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#9', volume));
    }
    public get volumeInput10(): number {
        return this.getMicVolumeState('Input#gain#9');
    }

    @property("Mute Input11")
    public set muteInput11(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#10', mute));
    }
    public get muteInput11(): boolean {
        return this.getMicMuteState('Input#mute#10');
    }

    @property("Volume Input11") @min(-72) @max(12)
    public set volumeInput11(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#10', volume));
    }
    public get volumeInput11(): number {
        return this.getMicVolumeState('Input#gain#10');
    }

    @property("Mute Input12")
    public set muteInput12(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('Input#mute#11', mute));
    }
    public get muteInput12(): boolean {
        return this.getMicMuteState('Input#mute#11');
    }

    @property("Volume Input12") @min(-72) @max(12)
    public set volumeInput12(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('Input#gain#11', volume));
    }
    public get volumeInput12(): number {
        return this.getMicVolumeState('Input#gain#11');
    }

	@property("Mute Output01")
	public set muteOutput01(mute: boolean) {
		this.requestSendCmd(this.getMicMuteCmd('output#mute#0', mute));
	}
	public get muteOutput01(): boolean {
		return this.getMicMuteState('output#mute#0');
	}

	@property("Volume Output01") @min(-72) @max(12)
	public set volumeOutput01(volume: number) {
		this.requestSendCmd(this.getMicVolumeCmd('output#gain#0', volume));
	}
	public get volumeOutput01(): number {
		return this.getMicVolumeState('output#gain#0');
	}
    @property("Mute Output02")
    public set muteOutput02(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#1', mute));
    }
    public get muteOutput02(): boolean {
        return this.getMicMuteState('output#mute#1');
    }

    @property("Volume Output02") @min(-72) @max(12)
    public set volumeOutput02(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#1', volume));
    }
    public get volumeOutput02(): number {
        return this.getMicVolumeState('output#gain#1');
    }
	@property("Mute Output03")
    public set muteOutput03(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#2', mute));
    }
    public get muteOutput03(): boolean {
        return this.getMicMuteState('output#mute#2');
    }

    @property("Volume Output03") @min(-72) @max(12)
    public set volumeOutput03(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#2', volume));
    }
    public get volumeOutput03(): number {
        return this.getMicVolumeState('output#gain#2');
    }
    @property("Mute Output04")
    public set muteOutput04(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#3', mute));
    }
    public get muteOutput04(): boolean {
        return this.getMicMuteState('output#mute#3');
    }

    @property("Volume Output04") @min(-72) @max(12)
    public set volumeOutput04(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#3', volume));
    }
    public get volumeOutput04(): number {
        return this.getMicVolumeState('output#gain#3');
    }

	@property("Mute Output05")
    public set muteOutput05(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#4', mute));
    }
    public get muteOutput05(): boolean {
        return this.getMicMuteState('output#mute#4');
    }

    @property("Volume Output05") @min(-72) @max(12)
    public set volumeOutput05(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#4', volume));
    }
    public get volumeOutput05(): number {
        return this.getMicVolumeState('output#gain#4');
    }

    @property("Mute Output06")
    public set muteOutput06(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#5', mute));
    }
    public get muteOutput06(): boolean {
        return this.getMicMuteState('output#mute#5');
    }

    @property("Volume Output06") @min(-72) @max(12)
    public set volumeOutput06(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#5', volume));
    }
    public get volumeOutput06(): number {
        return this.getMicVolumeState('output#gain#5');
    }

    @property("Mute Output07")
    public set muteOutput07(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#6', mute));
    }
    public get muteOutput07(): boolean {
        return this.getMicMuteState('output#mute#6');
    }

    @property("Volume Output07") @min(-72) @max(12)
    public set volumeOutput07(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#6', volume));
    }
    public get volumeOutput07(): number {
        return this.getMicVolumeState('output#gain#6');
    }

	@property("Mute Output08")
    public set muteOutput08(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#7', mute));
    }
    public get muteOutput08(): boolean {
        return this.getMicMuteState('output#mute#7');
    }

    @property("Volume Output08") @min(-72) @max(12)
    public set volumeOutput08(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#7', volume));
    }
    public get volumeOutput08(): number {
        return this.getMicVolumeState('output#gain#7');
    }

    @property("Mute Output09")
    public set muteOutput09(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#8', mute));
    }
    public get muteOutput09(): boolean {
        return this.getMicMuteState('output#mute#8');
    }

    @property("Volume Output09") @min(-72) @max(12)
    public set volumeOutput09(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#8', volume));
    }
    public get volumeOutput09(): number {
        return this.getMicVolumeState('output#gain#8');
    }

    @property("Mute Output10")
    public set muteOutput10(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#9', mute));
    }
    public get muteOutput10(): boolean {
        return this.getMicMuteState('output#mute#9');
    }

    @property("Volume Output10") @min(-72) @max(12)
    public set volumeOutput10(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#9', volume));
    }
    public get volumeOutput10(): number {
        return this.getMicVolumeState('output#gain#9');
    }

    @property("Mute Output11")
    public set muteOutput11(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#10', mute));
    }
    public get muteOutput11(): boolean {
        return this.getMicMuteState('output#mute#10');
    }

    @property("Volume Output11") @min(-72) @max(12)
    public set volumeOutput11(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#10', volume));
    }
    public get volumeOutput11(): number {
        return this.getMicVolumeState('output#gain#10');
    }

    @property("Mute Output12")
    public set muteOutput12(mute: boolean) {
        this.requestSendCmd(this.getMicMuteCmd('output#mute#11', mute));
    }
    public get muteOutput12(): boolean {
        return this.getMicMuteState('output#mute#11');
    }

    @property("Volume Output12") @min(-72) @max(12)
    public set volumeOutput12(volume: number) {
        this.requestSendCmd(this.getMicVolumeCmd('output#gain#11', volume));
    }
    public get volumeOutput12(): number {
        return this.getMicVolumeState('output#gain#11');
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

	@callable("Send raw command string")
	public sendString(toSend: string) {
		return this.socket.sendText(toSend);
	}

	@callable("Recall preset number (slot 1 to 16)")
	public RecallPreset(toSend: number) {
		return this.socket.sendText("scene: toggle #" + (toSend-1));
	}

	@callable("Save setting as preset number 1 to 16")
	public SavePreset(toSend: number) {
		return this.socket.sendText("scene:save#" + (toSend-1));
	}

    /**
     Set the volume to a normalized value in range 0...1.2, which maps
     to -72 ... +12 dB.
     */
	 @callable("Set input gain ch.1-12, value 0-16. 3dB step pr. value. Must save preset to remember")
	 public setGain(
		@parameter("Channel to set 1-12") channel: number,
		@parameter("Gain to set value 0-16") gain: number,
		) {
		return this.socket.sendText("set:input#sens#" + (channel-1) + "#" + gain);
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
			}
			this.socket.sendText(cmdStr);
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




class MicVolume extends Command {
	constructor(name: string, private value: number) {
		super('set:' + name + '#');
	}
	getCmdStr(): string {
		return this.baseCmd + this.value.toFixed(0);
	}
}

class MicMute extends Command {
	constructor(name: string, private mute: boolean) {
		super('set:' + name + '#');
	}
	getCmdStr(): string {
		return this.baseCmd + (this.mute ? '1' : '0');
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
