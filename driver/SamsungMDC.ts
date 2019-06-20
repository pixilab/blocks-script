/*
 * Basic driver for Samsung MDC displays.
 * Copyright (c) 2019 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {driver, max, min, property} from "system_lib/Metadata";

@driver('NetworkTCP', { port: 1515 })
export class SamsungMDC extends Driver<NetworkTCP> {
	// Arbitrary initial value - we really have no idea
	private mPower: boolean = false;
	private mInput: number = 0x14;
	private mVolume: number = 0.5;

	public constructor(private socket: NetworkTCP) {
		super(socket);
		socket.enableWakeOnLAN();
		socket.autoConnect(true);
	}

	@property("Power on/off")
	public set power(
		on: boolean
	) {
		this.mPower = on;
		this.sendCommand(0x11, on ? 1 : 0);
		if (on) // Needs WOL to turn on even though there is a command...
			this.socket.wakeOnLAN();
	}
	public get power(): boolean {
		return this.mPower;
	}

	@property("Volume level, normalized 0...1")
	@min(0) @max(1)
	public set volume(
		volume: number
	) {
		volume = Math.max(0, Math.min(1, volume));
		this.mVolume = volume;
		this.sendCommand(0x12, Math.round(volume * 100));
	}
	public get volume(): number {
		return this.mVolume;
	}

	@property("Input (source) number. HDMI1=0x21. HDMI2=0x22")
	@min(0x14) @max(0x40) // Somewhat arbitrary constraints
	public set input(
		input: number
	) {
		this.mInput = input;
		this.sendCommand(0x14, input);
	}
	public get input(): number {
		return this.mInput;
	}

	/**	Rudimentary command generator and sender, accepting a single
		command byte and an optional single param byte.
	*/
	private sendCommand(cmdByte: number, paramByte?:number) {
		const cmd: number[] = [];
		cmd.push(0xAA);	// Start of commanf marker (not part of checksum)
		cmd.push(cmdByte);
		cmd.push(0);	// 0 is default. 0xFE targets ALL (can't make that work)
		if (paramByte !== undefined) {
			cmd.push(1);
			cmd.push(paramByte);
		} else
			cmd.push(0);	// No param
		var checksum = 0;
		const count = cmd.length;
		for (var ix = 1; ix < count; ++ix)
			checksum += cmd[ix];
		cmd.push(checksum & 0xff);
		this.socket.sendBytes(cmd);

		console.log(cmd);
	}
}
