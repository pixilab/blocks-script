/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

/// <reference path = 'PIXI.d.ts' />

export var WebRenderer: {
	/**
	 * Write web page as PNG image file. Returns a promise that's resolved once done.
	 * The file is stored with the specified name under /public/WebRenderer/
	 * Specify extraDelayMillis, as a time in milliseconds, if the web page needs
	 * extra time to render fully before the the picture is taken.
	 */
	render(url: string, toFile:string, width:number, height:number, extraDelayMillis?: number): Promise<void>;
}
