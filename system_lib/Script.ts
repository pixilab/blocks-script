/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2018 by Mike Fahl.
 */

import {RecordBase, ScriptBase, ScriptBaseEnv} from "system_lib/ScriptBase";

/**
 Ultimate base class for all TypeScript based user scripts.
 */
export class Script extends ScriptBase<ScriptEnv> {

	/**
	 * Establish a named channel associated with this script, with optional "data received
	 * on channel" handler function.
	 */
	establishChannel(leafChannelName: string, callback?: (data: string)=>void) {
		if (callback) {
			this.__scriptFacade.establishChannel(leafChannelName, function (sender:any, axon:any) {
				callback(axon.data);
			});
		} else
			this.__scriptFacade.establishChannel(leafChannelName);
	}

	/**
	 * Send data on my named channel.
	 */
	sendOnChannel(leafChannelName: string, data: string) {
		this.__scriptFacade.sendOnChannel(leafChannelName, data);
	}

	/**
	 * Instantiate a new Record of specified type, assiging it a persistent system-unique
	 * ID, accessible as $puid field value.
	 *
	 * NOTE: This function is only available if Visitor Tracking is licensed.
	 */
	newRecord<DST extends RecordBase>(type: Ctor<DST>): DST {
		return this.__scriptFacade.newRecord(type);
	}

	/**
	 * Delete specified record, either deleting it permanently or archiving its log
	 * (TSV) file for later analysis outside Blocks. Do NOT use this record after
	 * deleting it.
	 */
	deleteRecord<DST extends RecordBase>(record: DST, archive: boolean): void {
		return this.__scriptFacade.deleteRecord(record, archive);
	}

	/**
	 * Delete ALL instances of specified type, optionally archiving their
	 * collected data.
	 */
	deleteRecords<DST extends RecordBase>(type: Ctor<DST>, archive?: boolean) {
		return this.__scriptFacade.deleteRecords(type, archive || false);
	}

	/**
	 Get Record of specified type keyed by puid.
	 Returns null if no data found for puid.
	 */
	getRecord<DST extends RecordBase>(type: Ctor<DST>, puid: number): DST|null {
		return this.__scriptFacade.getRecord(type, puid);
	}

	/**
	 * Get Record based on secondary key fieldValue in id field fieldName.
	 * Returns null if not found.
	 */
	getRecordSec<DST extends RecordBase>(type: Ctor<DST>, fieldName: string, fieldValue: string|number): DST|null {
		return this.__scriptFacade.getRecordSec(type, fieldName, fieldValue);
	}

	/**
	 * Get ALL live puids ofType. Occasionally useful if you want to do some processing
	 * of all records, such as before calling deleteRecords, to update or move or clean up any
	 * associated data or files.
	 */
	getAllPuids<DST extends RecordBase>(ofType: Ctor<DST>): number[] {
		return this.__scriptFacade.getAllPuids(ofType);
	}
}

/**
 * What's returned from getProperty. Allows the property's value to be read/written.
 * It may in some cases take some time for a property to become available. Check
 * "available" to be true if you need to know. Once you no longer need
 * this property, call close() to terminate the connection. No further change
 * notification callbacks will be received after calling close().
 */
export interface PropertyAccessor<PropType> {
	value: PropType;	// Current property value (read only if property is read only)
	readonly available: boolean;	// Property has been attached and is now live
	close(): void;	// Close down this accessor - can no longer be used
}


export interface ScriptEnv extends ScriptBaseEnv {
	// Script is being shut down
	subscribe(event: 'finish', listener: ()=>void): void;

	// 	Following are INTERNAL implementation details, and may change.
	// 	DO NOT CALL directly from scripts/drivers!
	establishChannel(name: string):void;
	establishChannel(name: string, listener: Function): void;
	sendOnChannel(name: string, data: string):void;
	newRecord<DST extends RecordBase>(type: Ctor<DST>): DST;
	getRecord<DST extends RecordBase>(type: Ctor<DST>, puid: number): DST;
	getRecordSec<DST extends RecordBase>(type: Ctor<DST>, fieldName: string, key: string|number): DST;
	deleteRecords<DST extends RecordBase>(type: Ctor<DST>, archive: boolean): void;
	deleteRecord<DST extends RecordBase>(record: DST, archive?: boolean): void;
	getAllPuids<DST extends RecordBase>(ofType: Ctor<DST>): number[];
}
