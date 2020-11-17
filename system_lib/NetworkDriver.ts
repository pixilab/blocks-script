/*
 * An intermetiate base class adding common getters to network drivers, mimicing those
 * exposed by the underlying NetworkTCP/NetworkUDP socket object.
 *
 * Copyright (c) 2020 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {Driver} from "./Driver";
import {NetworkTCP, NetworkUDP} from "system/Network";


export abstract class NetworkDriver extends Driver<NetworkTCP | NetworkUDP> {
	protected constructor(private mySocket: NetworkTCP | NetworkUDP) {
		super(mySocket);
	}

	get name(): string {			// Leaf name of this network device
		return this.mySocket.name;
	}

	get fullName(): string {		// Full name, including enclosing containers
		return this.mySocket.fullName;
	}

	get enabled(): boolean {		// True if I'm enabled (else won't send data)
		return this.mySocket.enabled;
	}

	get address(): string {		// Target IP address (e.g., "10.0.2.45")
		return this.mySocket.address;
	}

	get port(): number {			// Port number sending data to
		return this.mySocket.port;
	}
}
