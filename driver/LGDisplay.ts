/*	A basic LG display driver.

 * Copyright (c) 2018 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import * as Meta from "system_lib/Metadata";


@Meta.driver('NetworkTCP', { port: 9761 })
export class LGDisplay extends Driver<NetworkTCP> {
		private mCurrentInput: string|undefined;	// Input from nameToInput or initially undefined
		private mPowerIsOn: boolean|undefined;
		private mVolume: number|undefined;
		private mBrightness: number|undefined;
		private mBacklight: number|undefined;
		private mColor: number|undefined;

	// Input names used as property value, using this lookup table to convert
	static readonly nameToInput:Dictionary<number> = {
		"DTV": 0x00,
		"CADTV": 0x01,
		"ATV": 0x10,
		"CATV": 0x11,
		"AV": 0x20,
		"AV2": 0x21,
		"Component1": 0x40,
		"Component2": 0x41,
		"RGB": 0x60,
		"HDMI1": 0x90,
		"HDMI2": 0x91,
		"HDMI3": 0x92,
		"HDMI4": 0x93
	}

	/**	Create me, attached to the network socket I communicate through. When using a
	 	driver, the driver replaces the built-in functionality of the network socket
	 	with the exposed properties.
	 */
	public constructor(private socket: NetworkTCP) {
		super(socket);
		socket.enableWakeOnLAN();
		socket.autoConnect(true); // The param here specifies "binary" mode

		/*	No data expected from TV, but log it in case it says something.
			This also prevents any incoming data from clogging up the data receive buffer.
		 */
		socket.subscribe("textReceived", (sender, message) => {
			console.info("Data received", message.text);
		});
	}

	/** Switch input to the one specified by name, which must be one of those listed
		under nameToInput above.
	*/
	@Meta.property("Video source to be displayed, by name, such as DTV, AV, AV2, HDMI1 etc.")
	public set input(name: string) {
		const inputNumber = LGDisplay.nameToInput[name];
		if (inputNumber === undefined)
			throw "Bad input name";
		this.sendCommand('xb', inputNumber);
		this.mCurrentInput = name;
	}
	public get input(): string {
		return this.mCurrentInput || "DTV"; // Default to "DTV" if never set
	}

	@Meta.property("Display power state (WoL must be enabled)")
	public set power(desiredState: boolean) {
		this.sendCommand('ka', desiredState ? 1 : 0);
		this.mPowerIsOn = desiredState;
		// Display won't obey OK command if power is off so also do wakeOnLAN
		if (desiredState)
			this.socket.wakeOnLAN();
	}
	public get power(): boolean {
		return this.mPowerIsOn || false; // Default to OFF if never set
	}

	@Meta.property("Volume level")
	@Meta.min(0)
	@Meta.max(1)
	public set volume(desiredVolume: number) {
		this.sendCommand('kf', desiredVolume * 100);
		this.mVolume = desiredVolume;
	}
	public get volume(): number {
		return this.mVolume || 0; // Default to 0 if never set
	}

	@Meta.property("Brightness level")
	@Meta.min(0)
	@Meta.max(1)
	public set brightness(desiredBrightness: number) {
		this.sendCommand('kh', desiredBrightness * 100);
		this.mBrightness = desiredBrightness;

	}
	public get brightness(): number {
			return this.mBrightness || 0.5; // Default value if never set
	}

	@Meta.property("Backlight intensity")
	@Meta.min(0)
	@Meta.max(1)
	public set backlight(desiredBacklight: number) {
		this.sendCommand('mg', desiredBacklight * 100);
		this.mBacklight = desiredBacklight;
	}
	public get backlight(): number {
		return this.mBacklight || 0.5; // Default value if never set
	}


	@Meta.property("Color saturation")
	@Meta.min(0)
	@Meta.max(1)
	public set color(desiredColor: number) {
		this.sendCommand('ki', desiredColor * 100);
		this.mColor = desiredColor;
	}
	public get color(): number {
		return this.mColor || 0.5; // Default value if never set
	}

	/**	Send the provided command bytes, after prefixing with the leading "static" part
		as well as the terminating checksum.
	*/
	private sendCommand(command: string, parameter: number) {
		command = command + ' ' + '00 ';
		var paramStr = Math.round(parameter).toString(16);
		if (paramStr.length < 2)
			paramStr = '0' + paramStr;
		command = command + paramStr;
		this.socket.sendText(command);
	}
}

// A simple typed dictionary type, using a string as key
export interface Dictionary<TElem> {
	[id: string]: TElem;
}
