/*	A very rudimentary Philip display SICP driver, mainly showing how to assemble the command
	sequence, calculate checksum, and send the command to the device.
	Look at it as a starting point...

 * Copyright (c) 2018 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import * as Meta from "system_lib/Metadata";


@Meta.driver('NetworkTCP', { port: 5000 })
export class PhilipsSICP extends Driver<NetworkTCP> {

	// Use the name of the input as the property, using this to convert to the number
	static nameToInput = {
		"VIDEO": 0x01,
		"S-VIDEO": 0x02,
		"COMPONENT": 0x03,
		"VGA": 0x05,
		"HDMI": 0x0D,
		"HDMI 1": 0x0D,
		"HDMI 2": 0x06,
		"HDMI 3": 0x0F,
		"DVI-D": 0x0E,
		"BROWSER": 0x10,
		"DISPLAY PORT": 0x0A,
		"DISPLAY PORT 1": 0x0A,
		"DISPLAY PORT 2": 0x07
	}

	// Assume BROWSER initially. Should probably read this back from the device on start-up
	private mCurrentInput: string = "BROWSER";

	/**	Create me, attached to the network socket I communicate through. When using a
	 	driver, the driver replaces the built-in functionality of the network socket
	 	with the properties and callable functions exposed.
	 */
	public constructor(private socket: NetworkTCP) {
		super(socket);
		socket.autoConnect(true); // The param here specifies "binary" mode
	}

	
	/** Switch input to the one specified by name, which must be one of those listed 
		under nameToInput above.
	*/
	@Meta.property("Input to be displayed, by name")
	public set currentInput(name: string) {
		const inputNumber = PhilipsSICP.nameToInput[name];
		if (inputNumber === undefined)
			throw "Bad input name";
		this.sendCommand(inputNumber, 9, 1, 0);
		this.mCurrentInput = name;
	}

	public get currentInput(): string {
		return this.mCurrentInput;
	}

	/**	Send the provided command bytes, after prefixing with the leading "static" part
		as well as the terminating checksum.
	*/
	private sendCommand(...commandBytes: number[]) {
		const fullCommand: number[] = [];
		fullCommand.push(0x00);	// Total length of command will be back-patched below
		fullCommand.push(0x01);
		fullCommand.push(0x00);
		fullCommand.push(0xAC);
		fullCommand.splice(4, 0, ...commandBytes);

		// Put in the total length of the command into the first byte
		fullCommand[0] = fullCommand.length + 1;	// Account for checksum byte, yet to be appended
		
		this.addChecksum(fullCommand);
		// this.logCommand(fullCommand);
		this.socket.sendBytes(fullCommand);
	}

	/** Calculate the XOR checksum, and append to the command.
	*/
	private addChecksum(command: number[]) {
		var checksum = 0;

		for (const byte of command)
			checksum ^= byte;
		command.push(checksum);
		return command;
	}

	/** Helper to log out the command string, to see what you're about to send.
	*/
	private logCommand(command: number[]) {
		var fullMessage: string = "";
		for (const byte of command)
			fullMessage += byte.toString(16) + ' ';
		console.log(fullMessage);
	}
}
