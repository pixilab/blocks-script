/*	PIXILAB Blocks user script for sending SMS messages using the 46elks gateway:
	https://46elks.se/

	Before sending SMS you MUST set the user and pasword properties to the
	correspinding values you received from 46elks when you registered your
	account. This can be done either bysetting the properties using a task.

	Alternatively a config file named SMS_46elks.json in the script/files directory.
	This is a more "secure" method since the password can't be easily obtained
	unless you have file system access to the server. Contents of JSON file
	like this (but with your user and pasword values):

	{	"user": "u2c8cde7b8f7951bbc18124cf4ae50bb8",
		"password": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
	}

	Copyright (c) 2025 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {Script, ScriptEnv} from "../system_lib/Script";
import {property, callable, parameter} from "../system_lib/Metadata";
import {SimpleHTTP} from "../system/SimpleHTTP";
import {SimpleFile} from "../system/SimpleFile";

interface Config {
	user: string;
	password: string;
}

export class SMS_46elks extends Script {
	private mUser= "";
	private mPassword = "";
	private config?: Config;

	public constructor(env: ScriptEnv) {
		super(env);
		SimpleFile.readJson('SMS_46elks.json').then(config => this.config = config);
	}

	@callable("Send SMS to phone number")
	send(
		@parameter("Text message to send") msg: string,
		@parameter("Phone number to send it to, with leading + and country code") toNumber: string,
		@parameter("Sender name or number", true) from?: string
	) {
		const config = this.config;
		if (config || (this.mUser && this.mPassword)) {
			const user = config ? config.user : this.mUser;
			const password = config ? config.password : this.mPassword;

			if (!user || !password)
				throw "Missing user or password";

			const auth = Base64.encode(user + ':' + password);

			let srcData = {
				from: from || "Blocks",
				to: toNumber,
				message: msg
			}

			const url = "https://api.46elks.com/a1/sms";
			const data = formDataEnclode(srcData);
			console.log("URL", url, data);
			SimpleHTTP.newRequest(url)
			.header("Authorization", "Basic " + auth)
			.post(data, "application/x-www-form-urlencoded")
			.catch(err => console.error(err));
		} else
			throw "Config file or user and password properties must be set to send";
	}

	@property("User name send with the API request")
	get user(): string {
		return this.mUser;
	}
	set user(value: string) {
		this.mUser = value;
	}

	@property("Password send with the API request")
	get password(): string {
		return this.mPassword;
	}
	set password(value: string) {
		this.mPassword = value;
	}
}

export interface Dictionary<TElem> {
	[id: string]: TElem;
}


/**
 * Encode the key/value pairs in dict to a string, URL query param style.
 */
function formDataEnclode(dict: Dictionary<string>) {
	let result = "";
	let first = true;
	for (const key in dict) {
		result += first ? '' : '&';
		result += key + '=';
		result += encodeURIComponent(dict[key]);
		first = false;
	}
	return result;
}


/*	Minimal Base64 encode/decode utility for the Nashorn JavaScript
	implmentation.
 */
declare var java: any
var Base64 = {
	decode: function (str: string): string {
		return new java.lang.String(java.util.Base64.decoder.decode(str));
	},
	encode: function (str: any): string {
		return java.util.Base64.encoder.encodeToString(str.bytes);
	}
};
