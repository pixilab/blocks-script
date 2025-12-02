/**
 *  PIXILAB Blocks driver for the Nexmosphere controller in file name using UDP transport.
 * Documentation in ./NexmosphereBase.ts
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * version 1.0
 */

import {NetworkUDP} from "system/Network";
import {driver} from "system_lib/Metadata";
import {NexmosphereBase,BuiltInElements} from "./NexmosphereBase";

const kNumInterfaces: number = 4;

@driver('NetworkUDP', { port: 5000, rcvPort: 5000 })

export class Nexmosphere_XC938_UDP extends NexmosphereBase<NetworkUDP> {
	 private specialInterfaces: BuiltInElements = [
        ["RGBW", 5],
        ["Opticalx4", 115] //Bitwice 0-3: Audio Switches
    
    ]
	
	public constructor(port: NetworkUDP ) {
		super(port, kNumInterfaces);
		if (port.enabled){
			this.initUdp();
			this.addBuiltInInterfaces(this.specialInterfaces);
			this.numInterfaces = kNumInterfaces;
			
		
		} 
	}	

}
	


