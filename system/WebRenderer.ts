/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

/// <reference path = 'PIXI.d.ts' />

export var WebRenderer: {
	/**
	 * Write web page as PNG image file. Returns a promise that's resolved once done.
	 * The file is stored with the specified name under /public/WebRenderer/
	 */
	render(url: string, toFile:string, width:number, height:number, extraDelayMillis?: number, explicitReady?:boolean): Promise<void>;
}