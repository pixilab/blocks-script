/*
 * Copyright (c) 2020 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import * as Meta from "system_lib/Metadata";


@Meta.driver('NetworkTCP', { port: 5000 })
export class PhilipsSICP extends Driver<NetworkTCP> {

	// Use the name of the input as the property, using this to convert to the number
	static nameToInput: {[index: string]: number} = {
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
	};

	// Assume BROWSER initially. Should probably read this back from the device on start-up
	private mCurrentInput: string = "BROWSER";
	private mPower: boolean = true;
	private mVolume: number = 50;	// Device volume (0...100)

	private mDefVolHoldoff?: CancelablePromise<any>; // Holdoff volume to not send too fast
	private mDefVolume?: boolean;	// Send volume at end of mDefVolHoldoff

	/**	Create me, attached to the network socket I communicate through. When using a
	 	driver, the driver replaces the built-in functionality of the network socket
	 	with the properties and callable functions exposed.
	 */
	public constructor(private socket: NetworkTCP) {
		super(socket);
		socket.autoConnect(true); // The param here specifies "binary" mode
	}


	/**
	 * Set power on/off.
	 */
	@Meta.property("Display power")
	public set power(on: boolean) {
		this.mPower = on;
		this.sendCommand(0x18, on ? 2 : 1);
	}
	public get power(): boolean {
		return this.mPower;
	}


	/** Switch input to the one specified by name, which must be one of those listed
		under nameToInput above.
	*/
	@Meta.property("Input to be displayed, by name")
	public set currentInput(name: string) {
		const inputNumber = PhilipsSICP.nameToInput[name];
		if (inputNumber === undefined)
			throw "Bad input name";
		this.sendCommand(0xAC, inputNumber, 9, 1, 0);
		this.mCurrentInput = name;
	}

	public get currentInput(): string {
		return this.mCurrentInput;
	}

	/**
	 * Set the volume.
	 */
	@Meta.property("Audio volume")
	@Meta.min(0)
	@Meta.max(1)
	public set volume(value: number) {
		const devVol = Math.round(value * 100);
		if (devVol !== this.mVolume) {	// This is news
			this.mVolume = devVol;		// Consider accepted
			if (this.mDefVolHoldoff)	// In holdoff...
				this.mDefVolume = true; // ...just set flag to send at end
			else
				this.sendVolume();		// Send right away, then holdoff
		}
	}
	public get volume(): number {
		return this.mVolume / 100;	// Return normalized value
	}

	/**
	 * Send a volume command, and then holdoff for some time to avoid
	 * sending such commands faster than the device can handle. That really
	 * applies to ALL commands, but for now only the volume command is likely
	 * to cause trouble here, as it is the only analog command. A full and
	 * proper implementation should really look for ACK commands from the
	 * device matching every command sent. But this should do for now.
	 */
	private sendVolume() {
		this.sendCommand(0x44, this.mVolume, this.mVolume);
		this.mDefVolHoldoff = wait(200);	// How long???
		this.mDefVolHoldoff.then(() => {
			this.mDefVolHoldoff = undefined;	// Now taken
			if (this.mDefVolume) {	// Got intervening change not yet sent
				this.mDefVolume = false; // Now taken
				this.sendVolume();
			}
		});
	}

	/**	Send the provided command bytes, after prefixing with the leading "static" part
		as well as the terminating checksum.
	*/
	private sendCommand(...commandBytes: number[]) {
		const fullCommand: number[] = [];
		fullCommand.push(0x00);	// Total length of command will be back-patched below
		fullCommand.push(0x01);
		fullCommand.push(0x00);
		fullCommand.splice(3, 0, ...commandBytes);

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
