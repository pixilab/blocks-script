/*
 * Copyright (c) 2018 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {NetworkTCP} from "system/Network";
import {SimpleFile} from "system/SimpleFile";
import {Driver} from "system_lib/Driver";
import {driver, property} from "system_lib/Metadata";

/**	A do-nothing driver that illustrates how a driver can store persistent data in a file
* named by the asociated port.
*/
@driver('NetworkTCP', { port: 1025 })
export class PersistentDrvr extends Driver<NetworkTCP> {
	private mStringo: string;

	public constructor(private socket: NetworkTCP) {
		super(socket);
		socket.autoConnect();

		const myFullName = socket.fullName;
		console.log("fullName", myFullName);

		/*	Attempt to load the initial value of the property from a file
			named by the full name of associated NetworkTCP ports.
		*/
		SimpleFile.read(myFullName).then(readValue => {
			if (this.mStringo !== readValue) {
				this.mStringo = readValue;
				socket.changed("stringo");
			}
		}).catch(error =>
			console.warn("Can't read file", myFullName, error)
		);
	}

	@property("Persisted property")
	set stringo(value: string) {
		if (this.mStringo !== value) {
			this.mStringo = value;
			console.log("stringo", value);
			SimpleFile.write(this.socket.fullName, value).catch(error =>
				console.warn("Can't write file", error)
			)
		}
	}
	get stringo(): string {
		return this.mStringo
	}
}