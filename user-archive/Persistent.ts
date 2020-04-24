/*
 * Created 2018 by Mike Fahl.
 */

import {Script, ScriptEnv} from "system_lib/Script";
import {SimpleFile} from "system/SimpleFile";
import {PrimTypeSpecifier} from "system/PubSub";


/**
 * A user script publishing "persistent variables". The value of those variables is written to a
 * file in script/files/Persistent. The content of that file also determines which variables
 * that are available. Thus, to add more variables, shut down the server, add entries to the
 * script/files/Persistent file (make sure you follow the JSON syntax properly), then restart the
 * server.
 */
export class Persistent extends Script {
	private data: any;
	private mPersistor: CancelablePromise<any>;	// Timer when persistent write pending

	private static kFileName = "Persistent.json";	// Name of file where I persist my data

	public constructor(env : ScriptEnv) {
		super(env);
		SimpleFile.read(Persistent.kFileName).then(data => {
			try {
				this.data = JSON.parse(data);
				this.publishProperties();
			} catch (parseError) {
				console.error("Failed parsing JSON data from file", Persistent.kFileName, parseError);
			}
		}).catch(	// Failed reading file.
			error => {
				console.error("Failed reading file; use initial sample data", Persistent.kFileName, error);
				//  Likely had no file. Init with some sample data
				this.data = {
					"aNumber": 12,
					"aString": "Billy",
					"aBoolean": true
				}
				this.publishProperties();
			}
		);
	}

	/**
	 * Data was just loaded. Publish all primitive items as named properties.
	 */
	private publishProperties() {
		for (const key in this.data) {
			const propData = this.data[key];
			// Obtain formal type from value type
			const typeName: string = typeof propData;
			if (typeName === 'boolean' ||
				typeName === 'number' ||
				typeName === 'string'
			)
				this.makeProperty(key, typeName);
			else
				console.error("Invalid type of ", key, typeName)
		}
	}

	/**
	 * Make and publish a property with name of typeName.
	 */
	private makeProperty(name: string, typeName: string) {
	 	// Capitalize type name for dynamic property definition
		typeName = typeName.charAt(0).toUpperCase() + typeName.substr(1);
		this.property<boolean>(name, {type: <PrimTypeSpecifier>typeName}, value => {
			if (value !== undefined && value !== this.data[name]) {
				// Specific and changed value - set it
				this.data[name] = value;
				this.persistVars();
			}
			return this.data[name];	// Always return current value
		});
	}

	/**
	 * Make sure my persistent data is saved soon.
	 */
	private persistVars() {
		if (!this.mPersistor) {
			this.mPersistor = wait(200);
			this.mPersistor.then(() => {
				delete this.mPersistor;
				const jsonData = JSON.stringify(this.data, null, 2);
				SimpleFile.write(Persistent.kFileName, jsonData);
			});
		}
	}
}
