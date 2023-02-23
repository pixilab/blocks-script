/*	Manage persistency for an indexed property by, on request,
	writing the data held in the property to a disk file. Likewise, when
	asked to initially make the property, it will look for that file and
	reload any data found there into items in the indexed property.

	Copyright (c) 2022 PIXILAB Technologies AB, Sweden (http://pixilab.se).
	All Rights Reserved.

 */

import {Script} from "../system_lib/Script";
import {IndexedProperty} from "../system_lib/ScriptBase";
import {SimpleFile} from "../system/SimpleFile";

/**
 * An object that can deserialize a "real" T from a possibly degenerate
 * T (i.e., a JSON-deserialized object containing only the data fields
 * of T). Used to typecheck the type (i.e., constructor) passed into
 * IndexedPropertyPersistor getOrMake.
 */
interface Deserializor<T> {
	fromDeserialized(src: T): T;
}

export class IndexedPropertyPersistor<T> {
	private indexedProperty: IndexedProperty<T>; // Once obtained through getOrMake

	constructor(
		private owner: Script,
		private persistenceDir: string // Where to store my data
	) {
	}

	/**
	 * If there's a persistent store for specified indexed property,
	 * then resurrect the data from there. Else make new, empty
	 * indexed property of type T.
	 */
	getOrMake(
		name: string, // Name of the indexed property
		itemType: Ctor<T> & Deserializor<T> // Type of elements held
	): IndexedProperty<T> {
		// Make new, empty indexed property to begin with
		const result = this.owner.indexedProperty<T>(name, itemType);

		// Then attemt to read persisted data, if any
		SimpleFile.readJson(this.persistenceFileName(name)).then(
			(items: T[]) => {
				// Got data - pupulate with items
				for (const item of items)
					result.push(itemType.fromDeserialized(item));
			}
		);
		this.indexedProperty = result;
		return result;
	}

	/**
	 * Persist values in indexed property ip to a JSON file named
	 * by its type, allowing it to later be resurrected through
	 * getOrNewIndexedProperty.
	 */
	persist(): Promise<void> {
		const filePath = this.persistenceFileName(this.indexedProperty.name);
		const toWrite = JSON.stringify(this.indexedProperty);
		return SimpleFile.write(filePath, toWrite);
	}

	/**
	 * Clear (delete) any persistent data associated with ip.
	 */
	clear() {
		SimpleFile.delete(this.persistenceFileName(this.indexedProperty.name));
	}

	/*
	 * Make a filename under persistenceDir, named by propName with
	 * a .json extension. Used to persist and reload data such as
	 * high-scores.
	 */
	private persistenceFileName(propName: string) {
		return this.persistenceDir + '/' + propName + '.json';
	}
}
