/*
 * Copyright (c) 2018 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {driver, max, min, property} from "system_lib/Metadata";

interface CmdDesc {
	page: number;
	code: number;
	paramMax: number;
}

/**	Driver for controlling a 3M touch display, via serial port connected
*  through a Moxa nPort. 9600 baud, no parity, 8 data bits seems to be
*  default.
*/
@driver('NetworkTCP', { port: 4001 })
export class ThreeM_Touch extends Driver<NetworkTCP> {
	private powered: boolean;
	private howBrite: number;

	// Some useful commands, mainly as documentation
	static kCommands = {
		BRIGHTNESS: {
			page: 0x01,
			code: 0x10,
			paramMax: 100
		},
		CONTRAST: {
			page: 0x01,
			code: 0x12,
			paramMax: 100
		},
		COLOR_TEMP: {
			page: 0x02,
			code: 0x54,
			paramMax: 2	// 19300K, 6500K, Custom
		},
		VOLUME: {
			page: 0x0,
			code: 0x62,
			paramMax: 30
		},
		MUTE: {
			page: 0x0,
			code: 0x8D,
			paramMax: 1	// 1 is mute
		},
		INPUT: {
			page: 0x02,
			code: 0xCB,
			paramMax: 3	// 0 VGA, 2 DVI, 2 HDMI, 3 DP
		},
		POWER: {
			page: 0x0,
			code: 0x03,
			paramMax: 1	// 0 OFF, 1 ON
		}
	};

	public constructor(private socket: NetworkTCP) {
		super(socket);
		socket.autoConnect(true);
	}

	@property("Display power")
	public set power(on: boolean) {
		this.powered = on;
		this.sendCommand(ThreeM_Touch.kCommands.POWER, on ? 1 : 0);
	}
	public get power(): boolean {
		return this.powered;
	}

	@property("Display brightness")
	@min(0)
	@max(80)
	public set brightness(value: number) {
		this.howBrite = value;
		this.sendCommand(ThreeM_Touch.kCommands.BRIGHTNESS, value);
	}
	public get brightness(): number {
		return this.howBrite;
	}

	/**
	 * Send command at specified "opcodePage", "opcode" and
	  * param as per the protocol docs.
	 */
	private sendCommand(cd: CmdDesc, param: number) {
		param = Math.min(cd.paramMax, Math.max(0, param));
		const cmd = buildCommand(cd.page, cd.code, param);
		return this.socket.sendBytes(cmd);
	}
}

/**
 * Build command as an array of bytes, with specified opcodePage, opcode and
 * param as per the protocol docs.
 */
function buildCommand(opcodePage: number, opcode: number, param: number): number[] {
	var data: number[] = [];
	data.push(1);		// SOH
	data.push(0x30);	// "Reserved"
	data.push(0x2A);	// "All Sets" (presumably display ID "wildcard")
	data.push(0x30);	// "Sender is PC"
	data.push(0x45);	// "Set parameter command"

	var lengthPos = data.length;
	data.push(0x30);	// Command length: '0A' for 10 bytes STX...ETX inclusive
	data.push(0x30);	// Backpatched here later

	var headerLength = data.length;	// Not included in command length to be backpatched

	data.push(2);		// STX

	appendHex(data, opcodePage, 2);
	// data.push(0x30);	// "Opcode page number 00"
	// data.push(0x30);

	appendHex(data, opcode, 2);
	// data.push(0x30);	// "Power Opcode"
	// data.push(0x33);

	appendHex(data, param, 4);
	// data.push(0x30);	// "Parameter" 0000 or 0001
	// data.push(0x30);
	// data.push(0x30);
	// data.push(on ? 0x31 : 0x30);

	data.push(3);		// ETX

	var cmdLength = data.length - headerLength;
	var cmdLenHex = toHex(cmdLength, 2);
	data[lengthPos] = cmdLenHex.charCodeAt(0);
	data[lengthPos+1] = cmdLenHex.charCodeAt(1);

	// Checksum  (all bytes except leading SOH byte)
	var checksum = 0;
	for (var ix = 1; ix < data.length; ++ix)
		checksum = checksum ^ data[ix]; // XOR of all bytes
	data.push(checksum);

	data.push(0x0d);	// Terminating CR
	return data;
}

/**
 * Append num hex encoded into numDigits to dataArray.
 */
function appendHex(dataArray: number[], num: number, numDigits: number) {
	var chars = toHex(num, numDigits);
	for (var ci = 0; ci < numDigits; ++ci)
		dataArray.push(chars.charCodeAt(ci));
}

/**
 * Return num as hex encoded string with numDigits.
 */
function toHex(num: number, numDigits: number): string {
	return ('0000' + num.toString(16).toUpperCase()).slice(-numDigits);
}