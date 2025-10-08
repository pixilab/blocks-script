/*
	Driver for thr COMMAND Fusion relay box. This connects using a serial-over-USB interface to
	a Blocks player.

 	Copyright (c) 2025 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */


import {SerialPort} from "system/Network";
import {Driver} from "system_lib/Driver";
import {callable, driver, max, min, property} from "system_lib/Metadata";
import {IndexedProperty} from "../system_lib/ScriptBase";

interface MyOptions {
	numberOfRelays: number;
}

@driver('SerialPort', {baudRate: 115200})
export class DIN_RY8_N extends Driver<SerialPort> {
	private relays: IndexedProperty<Relay>;
	public _unitId = 1;
	myOptions: MyOptions = { numberOfRelays: 8}

	public constructor(public connection: SerialPort) {
		super(connection);
		if (connection.options)
			this.myOptions = JSON.parse(connection.options);

		this.relays = this.indexedProperty("relays", Relay);
		for (let rc = 0; rc < this.myOptions.numberOfRelays; ++rc)
			this.relays.push(new Relay(this, rc));
		connection.autoConnect(true, {usbVendorId: 0x04d8, usbProductId: 0x000a});
		connection.subscribe('bytesReceived', (sender, message) =>
			console.log(byteArrayToString(message.rawData))
		);
	}

	@property("Relay box ID number")
	@min(1)
	@max(99)
	get unitId(): number {
		return this._unitId;
	}
	set unitId(value: number) {
		this._unitId = value;
	}

	// Early test code. Uncomment the @callable below to re-enable it
	// @callable()
	testSend() {
		this.connection.sendBytes([0xf2, 0x01, 0xf3]);
		this.connection.sendBytes(stringToByteArray("TRLYSET"));
		this.connection.sendBytes([0xf4]);
		// this.connection.sendBytes(stringToByteArray("P01:T"));
		this.connection.sendBytes(stringToByteArray("P01:" + '1'));
		this.connection.sendBytes([0xF5, 0xF5]);
	}
}

class Relay {
	private m_on: boolean = false;

	constructor(private owner: DIN_RY8_N, private relayNumber: number) {}

	@property("True if the relay is on")
	get on(): boolean {
		return this.m_on;
	}

	set on(on: boolean) {
		if (this.m_on !== on) {
			this.m_on = on;
			this.owner.connection.sendBytes([0xf2, this.owner._unitId, 0xf3]);
			this.owner.connection.sendBytes(stringToByteArray("TRLYSET"));
			this.owner.connection.sendBytes([0xf4]);
			const cmdString = "P0" + (this.relayNumber + 1) + ':' + (on ? '1' : '0')
			this.owner.connection.sendBytes(stringToByteArray(cmdString));
			this.owner.connection.sendBytes([0xF5, 0xF5]);
			// console.log("Sent relay", cmdString);
		}
	}
}


function stringToByteArray(str: string) {
	const len = str.length;
	const bytes = [];
	for (var ix = 0; ix < len; ++ix)
		bytes.push(str.charCodeAt(ix));
	return bytes;
}

function byteArrayToString(bytes: number[]) {
	let result = "";
	for (let ix = 0; ix < bytes.length; ++ix)
		result += ' 0x' + bytes[ix].toString(16);
	return result;
}
