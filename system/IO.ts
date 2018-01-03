/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

/// <reference path = 'PIXI.d.ts' />

/**
 * IO Alias subsystem known by name. Returns the item mapped to that name (e.g.,
 * a ModbusChannel).
 */
export var IO: { [name: string]: any; };
