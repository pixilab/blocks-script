/*
 * Driver for Samsung MDC compatible displays.
 */

import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {driver, max, min, property} from "system_lib/Metadata";

/**	Basic driver for sending keystrokes through a Global Caché iTach
	Ethernet IR sender.
*/
@driver('NetworkTCP', { port: 1515 })
export class SamsungMDC extends Driver<NetworkTCP> {
	private mPower: boolean;
	private mInput: number;

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

	/**
	 * Input source number. See page 46 in the protocol documentation
	 * MDC_Protocol_2018_mdc_ppmxxm6x_protocol_v14.4c.pdf
	 */
	@property("Input (source) number; e.g. HDMI1=33, HDMI2=34")
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
