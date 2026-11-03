/**
 * PIXILAB Blocks driver for the Nexmosphere XN controllers with only x-talk interfaces and no built in elements 
 * XN-115 using TCP-serial server (e.g. Moxa Nport) or Serial transport.
 * Documentation in ./NexmosphereBase.ts
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * version 1.0
 */

import { driver} from "../system_lib/Metadata";
import {NexmosphereBase, ConnType, BuiltInElements} from "../driver/NexmosphereBase";

const kNumInterfaces: number = 8;


@driver('NetworkTCP', { port: 4001 })
@driver('SerialPort', { baudRate: 115200 })
export class Nexmosphere_XC181 extends NexmosphereBase<ConnType> {

 	private specialInterfaces: BuiltInElements= [
		["WIRELESSPICKUP", 111],
		["WIRELESSPICKUP", 112],
		["WIRELESSPICKUP", 113],
		["WIRELESSPICKUP", 114]
	]
	
	public constructor(port: ConnType, numInterfaces?: number) {
		super(port, numInterfaces);
		this.initConnection(port);
		this.addBuiltInInterfaces(this.specialInterfaces);
	}
	
	protected considerConnected(): boolean {
		return this.port.connected;
	}
}

