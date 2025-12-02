/**
 * PIXILAB Blocks driver for the Nexmosphere controller in file name using TCP or Serial transport.
 * Documentation in ./NexmosphereBase.ts
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * version 1.0
 */

import {driver} from "system_lib/Metadata";
import {NexmosphereBase,ConnType,BuiltInElements} from "./NexmosphereBase";

const kNumInterfaces: number = 2;

@driver('NetworkTCP', { port: 4001 })
@driver('SerialPort', { baudRate: 115200 })

export class Nexmosphere_XN135M3 extends NexmosphereBase<ConnType> {
	 private specialInterfaces: BuiltInElements = [
        ["XY", 3]
    ]
	
	public constructor(port: ConnType ) {
		super(port, kNumInterfaces);
		if (port.enabled){
			this.initUdp();
			this.addBuiltInInterfaces(this.specialInterfaces);
			this.numInterfaces = kNumInterfaces;
			
		
		} 
	}	

}
	


