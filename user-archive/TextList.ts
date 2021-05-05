/*	Reads a number of text lines from script/files/TextList.txt, exposing the content of each
	line as an indexed property. Provides functions to re-load the text from the file (in case
	it changes externally) and to randomize the lines.

	IMPORTANT: Assumes the text file mentioned above to exist on the Blocks server. This is a
	plain text file containing a reasonable number of lines.

	Copyright (c) 2021 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {Script, ScriptEnv} from "system_lib/Script";
import {IndexedProperty} from "system_lib/ScriptBase";
import {SimpleFile} from "system/SimpleFile";
import {callable, property} from "system_lib/Metadata";

export class TextList extends Script {
	private lines: IndexedProperty<IndexedPropItem>;
	private mLengt = 0;

	public constructor(scriptFacade: ScriptEnv) {
		super(scriptFacade);

		this.lines = this.indexedProperty('lines', IndexedPropItem);
		this.reloadFile();	// Do at least once up front
	}

	/**
	 * Load (or reload) data from file.
	 */
	@callable("Reload data from file, updating lines' content and length")
	public reloadFile() {
		const fileName = "TextList.txt";
		SimpleFile.read(fileName).then(fulltext => {
			const lines = fulltext.split(/[\r\n]+/);
			var lineNumber = 0;
			for (var line of lines) {
				if (line) {	// Line indeed contains text
					console.log("Read line", line);
					if (lineNumber >= this.lines.length)
						this.lines.push(new IndexedPropItem(line));
					else // Already existed - just replace content
						this.lines[lineNumber].value = line;
					++lineNumber;
				} // Else was blank line - ignore
			}
			console.log("Loaded number of lines", lineNumber);
			this.lineCount = lineNumber;	// Publish official number of loaded lines
		}).catch(error =>
			console.error("Error reading data file", fileName, error)
		);
	}

	@callable("Re-arrange the order of active text lines")
	randomize() {
		// First make a copy of our text strings in a true array we can sort
		const arrayToRandomize: string[] = [];
		for (var ix = 0; ix < this.mLengt; ++ix)
			arrayToRandomize.push(this.lines[ix].value);

		// A function that will make "sort" sort in random order
		function randomSort(a: any, b:any) { return Math.round((Math.random() - 0.5) * 10); }
		arrayToRandomize.sort(randomSort);

		// Put the results back into the indexed property values
		for (var ix = 0; ix < arrayToRandomize.length; ++ix)
			this.lines[ix].value = arrayToRandomize[ix];
	}

	@property("Number of items currently available", true)
	public get lineCount(): number {
		return this.mLengt;
	}
	public set lineCount(value: number) {
		this.mLengt = value;
	}
}

/**
 * An example "indexed item" to be held in a IndexedProperty
 */
class IndexedPropItem {
	private mStrValue = "";

	constructor(value: string) {
		this.mStrValue = value;
	}

	@property("The string I represent")
	public get value(): string {
		return this.mStrValue;
	}
	public set value(value: string) {
		this.mStrValue = value;
	}
}
