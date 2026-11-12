/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2026 by Mike Fahl
 */

import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import * as Meta from "system_lib/Metadata";


@Meta.driver('NetworkTCP', { port: 5200 })
export class NovastarVX extends Driver<NetworkTCP> {
	private mInput: string = "HDMI1";

	/**	Create me, attached to the network socket I communicate through. When using a
	driver, the driver replaces the built-in functionality of the network socket
	with the properties and callable functions exposed.
	 */
	public constructor(private socket: NetworkTCP) {
		super(socket);
		socket.autoConnect(true); // The param here specifies "binary" mode
	}

	@Meta.property("Selected input source, e.g. HDMI1, SDI")
	@Meta.enumerated("HDMI1", "HDMI2", "DVI", "SDI")
	set input(value: string) {
		if (this.mInput !== value) {
			this.mInput = value;
			switch (value) {
			case "HDMI1":
				this.socket.sendBytes([
					0x55, 0xaa, 0x00, 0x00, 0xfe, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
					0x00, 0x12, 0x00, 0x02, 0x13, 0x03, 0x00, 0x00, 0x00, 0x00, 0x7e, 0x56
				]);
				break;
			case "HDMI2":
				this.socket.sendBytes([
					0x55, 0xaa, 0x00, 0x00, 0xfe, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
					0x00, 0x12, 0x00, 0x02, 0x13, 0x03, 0x00, 0x01, 0x00, 0x00, 0x7f, 0x56
				]);
				break;
			case "DVI":
				this.socket.sendBytes([
					0x55, 0xaa, 0x00, 0x00, 0xfe, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
					0x00, 0x12, 0x00, 0x02, 0x13, 0x03, 0x00, 0x02, 0x00, 0x00, 0x80, 0x56
				]);
				break;
			case "SDI":
				this.socket.sendBytes([
					0x55, 0xaa, 0x00, 0x00, 0xfe, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
					0x00, 0x12, 0x00, 0x02, 0x13, 0x03, 0x00, 0x03, 0x00, 0x00, 0x81, 0x56
				]);
				break;
			}
		}
	}
	get input(): string {
		return this.mInput;
	}
}
