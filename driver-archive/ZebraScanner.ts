/*	Zebra barcode scanner driver.
 	Copyright (c) 2022 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.

	Assumes the scanner (here a Zebra ds9308) outputs RS232 serial data, and is connected through
	a MOXA nPort 5110 serial device server.

	Set up the MOXA nPort as shown on the attached screenshots.
	Default MOXA IP address is 192.168.127.254.
	Default password is moxa.
    Apply the following settings:
        Network Settings:
            IP adress: Change this to a suitable IP address for your network
            Netmask: As appropriate for your network (e.g., 255.255.255.0)
            Gateway: can be left blank
        Serial Settings, Port 1:
            Baud Rate: 9600
            Data Bits: 9
            Stop Bits: 1
            Parity: None
            Flow Control: None
        Operating Settings, Port 1:
            Operation mode: TCP Server Mode
            TCP alive vheck time: 7
            Max connection: 2
            Delimiter 1: a (and select the "Enable" checkbox)
            Local TCP port: 4001

	The Zebra scanner needs to be set up as well. This is done by scanning barcodes from
	its manual. Scan the following codes, in this order (from the DS9308 manual):

		RS-232 Host Type: Standard RS-232
		Baud Rate: Baud Rate 9600
		Data Bits: 8-bit
		Scan Data Transmission Format: <DATA> <SUFFIX 1>
		Miscellaneous Scanner Parameters: Enter Key
 */

import {Driver} from "../system_lib/Driver";
import {NetworkTCP} from "../system/Network";
import * as Meta from "../system_lib/Metadata";
import {property} from "../system_lib/Metadata";

@Meta.driver('NetworkTCP', { port: 4001 })
export class ZebraScanner  extends Driver<NetworkTCP> {
	private mCode = '';	// Most recently received code, or empty string
	private mClearTimer?: CancelablePromise<void>;	// Clear command timer, if set

	constructor(socket: NetworkTCP) {
		super(socket);
		socket.setMaxLineLength(1024);
		socket.autoConnect();
		socket.subscribe('textReceived', (sender, msg)=>
			this.scannedCode = msg.text
		);
	}

	/**
	 * The property I expose, providing the name of the most recently received code.
	 * Note that this property is read only. The setter is only used internally to
	 * set the state of the property. Doing it through the setter automatically
	 * notifies listeners about the change.
	 */
	@property("The most recent code scanned", true)
	public get scannedCode(): string {
		return this.mCode;
	}
	public set scannedCode(cmd: string) {
		this.mCode = cmd;

		// Cancel and clear any existing timer
		if (this.mClearTimer) {
			this.mClearTimer.cancel();
			this.mClearTimer = undefined;
		}

		// If this was a non-empty command, set up to clear it after some time
		if (cmd) {
			this.mClearTimer = wait(500);
			this.mClearTimer.then(()=> {
				this.mClearTimer = undefined; // Now taken
				this.scannedCode = '';
			});
		}
	}
}
