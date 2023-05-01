/*
	Script for persisting realm variables

 	Original Copyright (c) 2022 No Parking Production ApS, Denmark (https://noparking.dk). All Rights Reserved.
	Created by: Samuel Walz <mail@samwalz.com>

	Enhanced by PIXILAB by
	- adding the realmsToSave parameter, letting the script be more selective as to what to save.
	- removing an unused async from saveRealm, resulting in a promise leak.
 */

import {Realm} from 'system/Realm';
import {Script, ScriptEnv} from 'system_lib/Script';
import {callable, parameter} from "system_lib/Metadata";
import {SimpleFile} from "../system/SimpleFile";

const BASE_PATH = 'PersistentRealms/';
const BASE_SAVE_PATH = BASE_PATH + 'saves/';
const DEFAULT_SAVE_NAME = 'default';

export class PersistentRealms extends Script {

    public constructor(env: ScriptEnv) {
        super(env);
    }


	@callable('save all Realm variables')
	public save(
		@parameter(`Directory name to save into (defaults to "${DEFAULT_SAVE_NAME}")`, true)
		saveName?: string,
		@parameter("Realms to save, as an array of realm names (defualts to all)", true)
		realmsToSave?: string|string[]
	): Promise<void> {
		if (typeof realmsToSave == "string")
			realmsToSave = [realmsToSave];	// Turn into array of names
		// Then turn into a Set of names (actually a Dictionary of true values)
		let realmsSet: Dictionary<true> = null;
		if (realmsToSave) {
			realmsSet = {};
			for (let realmName of realmsToSave)
				realmsSet[realmName] = true;
		}
		return PersistentRealms.processRealms(
			saveName || DEFAULT_SAVE_NAME,
			PersistentRealms.saveRealm,
			realmsSet
		);
	}

	@callable('load all Realm variables saved in specified directory')
	public load(
		@parameter(`save name (defaults to "${DEFAULT_SAVE_NAME}")`, true) saveName?: string
	): Promise<void> {
		return PersistentRealms.processRealms(
			saveName || DEFAULT_SAVE_NAME,
			PersistentRealms.loadRealm
		);
	}

	/**
	 * Call action for each realm in desiredSet, reading/writing files under dirName
	 */
	private static async processRealms(
		dirName: string,
		action: (path: string, realm: IRealm) => Promise<void>,
		desiredSet?: Dictionary<true>
	): Promise<void> {
		const basePath = `${BASE_SAVE_PATH}${dirName}/`;
		for (let realmName in Realm) {
			if (!desiredSet || desiredSet[realmName]) {
				const path = `${basePath}${realmName}`;
				const realm: IRealm = Realm[realmName];
				await action(path, realm);
			}
		}
	}

	/**
	 * Save all variables in realm into file specified by path, promise resolved once done.
	 */
	private static saveRealm(path: string, realm: IRealm): Promise<void> {
		// Collect all variable values in realm here first
		const dict: Dictionary<number|string|boolean> = {};
		for (let varName in realm.variable)
			dict[varName] = realm.variable[varName].value;

		const json = JSON.stringify(dict);
		return SimpleFile.write(path, json);
	}

	/**
	 * Load variables into realm from any file at path, promise resolved once done.
	 */
	private static async loadRealm(path: string, realm: IRealm): Promise<void> {
		const fileExists = await SimpleFile.exists(path);
		if (fileExists) {
			const json = await SimpleFile.read(path);
			const dict = JSON.parse(json) as Dictionary<number | string | boolean>;
			for (let varName in realm.variable) {
				const value = dict[varName];
				if (value !== undefined)
					realm.variable[varName].value = value;
			}
		}
	}
}
interface IRealm {
	variable: {[variableName: string]: {	// Realm variables, by name
		value: number|string|boolean;		// Variable's value
	}}
}
interface Dictionary<ElemType> {
    [id: string]: ElemType;
}
