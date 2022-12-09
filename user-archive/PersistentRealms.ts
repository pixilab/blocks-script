/*
	Script for persisting realm variables

 	Copyright (c) 2022 No Parking Production ApS, Denmark (https://noparking.dk). All Rights Reserved.
	Created by: Samuel Walz <mail@samwalz.com>
  Version: 0.1
  Features:
  - save / load realm variables

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
		@parameter(`save name (defaults to "${DEFAULT_SAVE_NAME}")`, true) saveName?: string
	): Promise<void> {
		if (!saveName) saveName = DEFAULT_SAVE_NAME;
		return this.processRealms(saveName, this.saveRealm);
	}
	@callable('load all Realm variables')
	public load(
		@parameter(`save name (defaults to "${DEFAULT_SAVE_NAME}")`, true) saveName?: string
	): Promise<void> {
		if (!saveName) saveName = DEFAULT_SAVE_NAME;
		return this.processRealms(saveName, this.loadRealm);
	}



	private async processRealms(saveName: string, action: (path: string, realm: IRealm) => Promise<void>): Promise<void> {
		const basePath = `${BASE_SAVE_PATH}${saveName}/`;
		for (let realmName in Realm) {
			const path = `${basePath}${realmName}`;
			const realm: IRealm = Realm[realmName];
			await action(path, realm);
		}
	}
	private async saveRealm(path: string, realm: IRealm): Promise<void> {
		const dict: Dictionary<number|string|boolean> = {};
		for (let varName in realm.variable) {
			dict[varName] = realm.variable[varName].value;
		}
		const json = JSON.stringify(dict);
		return SimpleFile.write(path, json);
	}
	private async loadRealm(path: string, realm: IRealm): Promise<void> {
		const fileExists = await SimpleFile.exists(path);
		if (!fileExists) return;
		const json = await SimpleFile.read(path);
		const dict = JSON.parse(json) as Dictionary<number|string|boolean>;
		for (let varName in realm.variable) {
			const value = dict[varName];
			if (value !== undefined) {
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
interface Dictionary<Group> {
    [id: string]: Group;
}
