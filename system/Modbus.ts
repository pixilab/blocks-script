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

	/**
	 * Call lilstener when the value of the channel changes with its new value.
	 * NOTE: You need to re-subscribe if the object fires the 'finish' event.
	 */
	subscribe(event: "change", listener: (sender: ModbusChannel, message:{value:number|boolean})=>void): void;
}
