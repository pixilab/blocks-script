/*
 * Basic functions for reading/writing/moving and deleting files.
 * By default (if a relative path or plain file name is specified), files are stored under script/files.
 * You may also specify one of the follwing absolute paths:
 * /public/*	Specifies a file path under public
 * /temp/*		Specifies a file path under temp
 *
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

/// <reference path = 'PIXI.d.ts' />

export var SimpleFile: {
	/**
	 * Write data to file with fileName. Returns a promise that's resolved once done,
	 * or rejected if the operation fails.
	 */
	write(fileName:string, data:string): Promise<void>;

	/**
	 * Read data from file with fileName, resolving the promise with the content
	 * of the file once done, or rejecting it if the operation fails.
	 */
	read(fileName:string): Promise<string>;

	/**
	 * Move a file from src to dest. If dest exists and replace is true, then
	 * replace the file, else fail. Returns a promise that's resolved once done,
	 * or rejected if the operation fails.
	 */
	move(src: string, dest: string, replace?: boolean): Promise<void>;

	/**
	 * Copy a file from src to dest. If dest exists and replace is true, then
	 * replace the file, else fail. Returns a promise that's resolved once done,
	 * or rejected if the operation fails.
	 */
	copy(src: string, dest: string, replace?: boolean): Promise<void>;

	/**
	 * Delete specified file. Will only delete file (not directory).
	 * Succeeds also if the file doesn't exist. Returns a promise that's resolved once done,
	 * or rejected if the operation fails.
	 */
	delete(file: string): Promise<void>;
}
