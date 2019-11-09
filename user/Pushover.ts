/*	A basic notification message integration for https://pushover.net

	IMPORTANT: You MUST enter your credentials into the corresponding
	configuration file in files/Pushover.config.json in order to use this
	service.

 	Created 2019 by PIXILAB AB, Mike Fahl
*/

import {SimpleHTTP} from "system/SimpleHTTP";
import {SimpleFile} from "system/SimpleFile";
import {Script, ScriptEnv} from "system_lib/Script";
import {callable, parameter} from "system_lib/Metadata";

/**
 * Used both as settings data and form parameter dictionary for sending the message.
 * Extends Dictionary to keep TS compiler happy when passed to makeFormUrl.
 */
interface Settings extends Dictionary<string>{
    token: string,
    user: string
	message?: string;	// Provided dynamically when message sent
}

export class Pushover extends Script {

    private static CONFIG_FILE_NAME = "Pushover.config.json";
    private static MSG_URL = "https://api.pushover.net/1/messages.json";

    private settings: Settings;

	public constructor(env : ScriptEnv) {
		super(env);

        SimpleFile.read(Pushover.CONFIG_FILE_NAME).then(readValue => {
        	const settings = JSON.parse(readValue);
        	// Some basic validation to make sure we get at least something
            if (!settings.token || !settings.user)
				console.warn("Invalid settings", Pushover.CONFIG_FILE_NAME)
			this.settings = settings;
		}).catch(error =>
			console.error("Can't read settings", Pushover.CONFIG_FILE_NAME, error)
		);
	}

    @callable("Send a message")
	public sendMessage(
        @parameter("Message content") message: string
    ): Promise<any> {
		let settings = this.settings;
		if (!settings)
			throw("can't send messsage (no settings)");
		settings.message = message;
		const encodedUrl = Pushover.makeFormUrl(Pushover.MSG_URL, settings);
		const request = SimpleHTTP.newRequest(encodedUrl);
		// console.log(encodedUrl);
		return request.post("", 'application/x-www-form-urlencoded');
	}

	/**
	 * Append params to baseUrl to form a URL with parameters
	 * encoded suitable for a 'application/x-www-form-urlencoded'
	 * POST request.
	 */
	private static makeFormUrl(baseUrl: string, params?: Dictionary<string>): string {
		let result = baseUrl;
		if (params) {
			let count = 0;
			for (const par in params) {
				result += count++ ? '&' : '?';
				result += par + '=' + encodeURIComponent(params[par]);
			}
		}
		return result;
	}
}

// A simple typed dictionary type, using a string as key
interface Dictionary<TElem> {
	[id: string]: TElem;
}
