/**
 * PIXILAB Blocks driver for the Nexmosphere XN controllers with only x-talk interfaces and no built in elements 
 * XN-115 using TCP-serial server (e.g. Moxa Nport) or Serial transport.
 * Documentation in ./NexmosphereBase.ts
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * version 1.0
 */

import { NetworkTCP, SerialPort } from "system/Network";
import { driver} from "system_lib/Metadata";
import {NexmosphereBase} from "./NexmosphereBase";

const kNumInterfaces: number = 8;

type ConnType = NetworkTCP | SerialPort;	// I accept either type of backend

@driver('NetworkTCP', { port: 4001 })
@driver('SerialPort', { baudRate: 115200 })
export class NexmosphereXN185 extends NexmosphereBase<ConnType> {

	

	public constructor(port: ConnType, numInterfaces?: number) {
		super(port, numInterfaces);
		if (port.enabled) {
			this.initConnection(port);
		}
	}
	

	protected considerConnected(): boolean {
		return this.port.connected;
	}
}

