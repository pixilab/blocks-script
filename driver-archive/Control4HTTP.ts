/*	A rudimentary driver for sending messages to a Control4 system using a HTTP ping
	to its port on the address specified for the driver, where the data passed to the
	ping function is passed as the URL path.

 	Copyright (c) 2022 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {Driver} from "../system_lib/Driver";
import {NetworkTCP} from "../system/Network";
import {callable} from "../system_lib/Metadata";
import {SimpleHTTP} from "../system/SimpleHTTP";
import * as Meta from "../system_lib/Metadata";

@Meta.driver('NetworkTCP', { port: 51048 })
export class Control4HTTP extends Driver<NetworkTCP> {
	private readonly mOrigin: string;

	constructor(private socket: NetworkTCP) {
		super(socket);
		this.mOrigin = `http://${socket.address}`;
		if (socket.port !== 80)
			this.mOrigin = this.mOrigin + ':' + socket.port;
	}

	@callable("Ping specified path with a GET request")
	public ping(path: string) {
		return SimpleHTTP
			.newRequest(`${this.mOrigin}/${path}`)
			.get();
	}
}
