/*
 * Basic functions for reading/writing/moving and deleting files.
 * By default (if a relative path or plain name is specified), files are assumed to live under script/files.
 * Alternatively, you can specify one of the follwing absolute paths:
 * /public/*	Specifies a path under public
 * /temp/*		Specifies a path under temp
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
	 * Append data to file with fileName. Returns a promise that's resolved once done,
	 * or rejected if the operation fails.
	 */
	append(fileName:string, data:string): Promise<void>;

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
	 * Delete specified fileOrDirectory.
	 * If directory, and not recirsive, it must be empty.
	 * If file, it must not be "write protected" or "locked" by other means.
	 * If recursive, deletes non-empty directory, including EVERYTHING INSIDE IT!
	 * Succeeds also if fileOrDirectory doesn't exist. Returns a promise resolved
	 * once done, or rejected if the operation fails.
	 */
	delete(fileOrDirectory: string, recursive?:boolean): Promise<void>;

	/**
	 * List files and subdirectories in specified directory. Returns usable
	 * path to each item, or name only (if leafNameOnly).
	 *
	 * Reject promise if directory doesn't exist or isn't a directory,
	 * or if an error occurs during the operation.
	 */
	list(directory: string, leafNameOnly?: boolean): Promise<DirInfo>;

	/**
	 * Get the last-modified timestamp of specified file or directory.
	 */
	lastModified(path: string): Promise<Date>;
};

/**
 * Information returned by the list method. Reported files or subdirectories have the same
 * form as the requested directory. I.e., if the requested directory is relative (and
 * hence implicitly under script/files), the listed files will have a relative path.
 * Likewise, if the requested directory is absolute, all results will be absolute.
 *
 * Only plain files and subdirectories will be returned. Not hidden files (including
 * any . and .. entries) or symlinks.
 *
 * IMPORTANT: The files and directories entries are "array-like" in that they
 * have length and can be indexed into, but they aren't true JavaScript
 * arrays (e.g., they don't support forEach, etc methods).
 */
export interface DirInfo {
	files: string[];			// Plain files found in the specified directory
	directories: string[];		// Subdirectories found in the specified directory
}
