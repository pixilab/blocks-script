/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

/// <reference path = 'PIXI.d.ts' />

/**
 * Modbus subsystem known by module and channel names.
 */
export var Modbus: { [moduleName: string]: ModbusModule; };

export interface ModbusModule { [channelName: string]: ModbusChannel; }

export interface ModbusChannel {
	value: number|boolean;	// Read only if channel is input
	subscribe(event: "change", listener: (sender: ModbusChannel, message:{value:number|boolean})=>void): void;
}
