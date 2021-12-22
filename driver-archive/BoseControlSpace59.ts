/*
Driver for Bose ControlSpace mixer/matrix using protocol version 5.9
This driver, in constrast to the older one, uses the concept of named modules,
rather than slots and channels. So each parameter to be controlled must be named
in the mixer, and then specified in the config of this driver.

Originally made to work at Recolab.

Example config data (JSON format). Note that as of this writing,
only the "gain" module type is supported (providing its gain and
mute sub-properties).

{"gain": [
  { "name": "Master" },
  { "name": "Mic_1" },
  { "name": "Mic_2" },
  { "name": "Mic_3" }
]}

Copyright (c) 2021 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {NetworkTCP} from "system/Network";
import {callable, driver, max, min, parameter, property} from "system_lib/Metadata";
import {Driver} from "system_lib/Driver";

interface Options {
	gain: GainSetting[];	// Only option accepted at this point - more here later
}

interface GainSetting {
	name: string;
}
/**
Basic driver for BOSE BoseControlSpace (e.g. PowerMatch 4250).
*/
@driver('NetworkTCP', { port: 10055 })
export class BoseControlSpace59 extends Driver<NetworkTCP> {
	private pendingSend: CancelablePromise<void>;	// If have a pending send
	private toSend: Dictionary<Command>;	// Commands to send, keyed by getKey()


	// Property values, so they cn be read back
	private mParamSet = 0;
	private mStandBy = false;

	constructor(private socket: NetworkTCP) {
		super(socket);
		socket.autoConnect();
		this.toSend = {};
		this.toSend = {};

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

		const rawOpts = socket.options;
		if (rawOpts) {
			try {
				var opts: Options = JSON.parse(rawOpts);
				if (this.validOptions(opts)) // Looks OK
					this.applyOptions(opts);
				else
					console.error("Invalid options - ignored")
			} catch (error) {
				console.error("Invalid driver options", error);
			}
		} else
			console.warn("No options specified - will provide basic properties only");

	}

	/**
	 * Perform some basic options validation, returning true if all seems well.
	 */
	private validOptions(opts: Options): boolean {
		if (opts.gain) {
			const setting1 = opts.gain[0];
			if (setting1.name)
				return true;
		}
		return false;
	}

	private applyOptions(opts: Options) {
		for (var gain of opts.gain) {
			new GainLevel(this, gain);
			new GainMute(this, gain);
		}
	}

	@property("Standby power mode")
	public set standBy(stby: boolean) {
		this.mStandBy = stby;
		this.requestSendCmd(new StbyCmd(stby));
	}
	public get standBy(): boolean {
		return this.mStandBy;
	}

	@property("Recall Parameter Set")
	@min(0) @max(255)
	public set parameterSet(setNum: number) {
		setNum = Math.round(setNum);
		this.mParamSet = setNum;
		this.requestSendCmd(new ParamSetCmd(setNum));
	}
	public get parameterSet():number {
		return this.mParamSet;
	}

	@callable("Send raw command string, automatically terminated by CR")
	public sendString(toSend: string) {
		return this.socket.sendText(toSend);
	}


	/**
	 Request a command to be sent. Will schedule a send operation soon.
	 Note that a new Command with same key as an existing one will
	 replace the existing one, making it send only the last one
	 with same key.
	 */
	requestSendCmd(cmd: Command) {
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
			}
			this.socket.sendText(cmdStr).catch(error => {
				console.warn("Failed sending command", error);
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

class ModuleGainLevel extends Command {
	static kMin = -60.5
	static kMax = 12;

	constructor(name: string, private value: number) {
		super("SA " + '"' + name + '">1=');
	}

	// Append hex value
	getCmdStr(): string {
		return this.baseCmd + ModuleGainLevel.constrainValue(this.value).toString();
	}

	/**
	 * Clip to allowed range and round to 0.5 db steps
	 */
	static constrainValue(value: number) {
		value = Math.max(ModuleGainLevel.kMin, Math.min(ModuleGainLevel.kMax, value));
		var result = Math.round(value*2) / 2;
		return result.toString();
	}
}

class GainLevel {
	private readonly name: string;
	private value = -20;	// Do we want to read those back from mixer initially?
	constructor(owner: BoseControlSpace59, gain: GainSetting) {
		this.name = gain.name;
		owner.property<number>(
			gain.name + "_level",
			{
				type: "Number",
				description: "Gain level, dB",
				min: ModuleGainLevel.kMin,
				max: ModuleGainLevel.kMax
			},
			newValue => {
				if (newValue !== undefined) {
					this.value = newValue;
					const cmd = new ModuleGainLevel(this.name, newValue);
					owner.requestSendCmd(cmd);
				}
				return this.value;
			}
		);
	}
}

class ModuleGainMute extends Command {
	constructor(name: string, private value: boolean) {
		super("SA " + '"' + name + '">2=');
	}

	// Append hex value
	getCmdStr(): string {
		return this.baseCmd + (this.value ? 'O' : 'F');
	}
}

class GainMute {
	private readonly name: string;
	private value = false;

	constructor(owner: BoseControlSpace59, gain: GainSetting) {
		this.name = gain.name;
		owner.property<boolean>(
			gain.name + "_mute",
			{type: "Boolean", description: "Gain mute", },
			newValue => {
				if (newValue !== undefined) {
					this.value = newValue;
					const cmd = new ModuleGainMute(this.name, newValue);
					owner.requestSendCmd(cmd);
				}
				return this.value;
			}
		);
	}
}


/**
 * Map normalized 0...1 value to gain string
 * -60.5 ... +12.0 in 0.5 steps
 */
function normToGain(norm: number): string {
	const kMin = -60.5;
	const kMax = 12;
	const kRange = kMax - kMin;	// Full range, 0-based

	var result = kRange * norm;
	result = Math.round(result*2) / 2 + kMin;
	return result.toString();
}
