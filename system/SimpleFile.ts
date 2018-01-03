/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

/// <reference path = 'PIXI.d.ts' />

export var SimpleFile: SimpleFileHandler;

interface SimpleFileHandler {
	/**
	 * Write data to file with fileName. Return a promise that's resolved once done.
	 */
	write(fileName:string, data:string): Promise<void>;

	/**
	 * Read data from file with fileName, resolving the promise with the content
	 * of the file once done.
	 */
	read(fileName:string): Promise<string>;
}
