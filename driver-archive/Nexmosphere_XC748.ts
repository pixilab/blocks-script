/**
 * PIXILAB Blocks driver for the Nexmosphere controller in file name using TCP or Serial transport.
 * Documentation in ./NexmosphereBase.ts
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * version 1.0
 */

import { driver } from "../system_lib/Metadata";
import { NexmosphereBase,ConnType,BuiltInElements  } from "./NexmosphereBase";

const kNumInterfaces: number = 4;	// Number of interface ports on this device

@driver('NetworkTCP', { port: 4001 })
@driver('SerialPort', { baudRate: 115200})
export class Nexmosphere_XC748 extends NexmosphereBase<ConnType> {

 private specialInterfaces: BuiltInElements = [
        ["RGBW", 5],
		["LightMark", 111],
		["LightMark", 112],	
		["LightMark", 113],
		["LightMark", 114]
	
    ]
   

    constructor(port: ConnType) {
        super(port, kNumInterfaces);
        this.initConnection(port)
        this.addBuiltInInterfaces(this.specialInterfaces);
        
    }

     protected considerConnected(): boolean {
        return this.port.connected;
    }
}