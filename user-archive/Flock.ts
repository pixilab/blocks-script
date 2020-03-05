/*
	Basic Flock API integration.

	IMPORTANT: You MUST enter your credentials into the corresponding
	configuration file in files/Flock.config.json in order to use this
	service.

 	Created 2018 by Samuel Walz
 */
import {SimpleHTTP} from "system/SimpleHTTP";
import {SimpleFile} from "system/SimpleFile";
import {Script, ScriptEnv} from "system_lib/Script";
import {callable, parameter} from "system_lib/Metadata";

export class Flock extends Script {

    private static CONFIG_FILE_NAME = "Flock.config.json";
    private static FLOCK_MSG_URL = "https://api.flock.com/hooks/sendMessage/";

    private accessToken = "";

	public constructor(env : ScriptEnv) {
		super(env);
		// console.log("Flock instantiated");

        SimpleFile.read(Flock.CONFIG_FILE_NAME).then(readValue => {
            var settings = JSON.parse(readValue);
			this.accessToken = settings.access_token;
			if (!this.accessToken)
				console.warn("Access token not set", Flock.CONFIG_FILE_NAME)
		}).catch(error =>
			console.error("Can't read file", Flock.CONFIG_FILE_NAME, error)
		);
	}


    @callable("Send message to Flock")
	public sendMessage(
        @parameter("Message content") message: string
    ): Promise<any> {
		return this.sendJSON('{"text":"' + message + '"}');
	}

    @callable("Send rich text message to Flock")
    public sendRichMessage(
        @parameter("Rich text version (using FlockML. Supports e.g. <a>, <em>, <i>, <strong>, <b>, <u>, <br>)") richText: string
    ): Promise<any> {
        return this.sendJSON(
            '{' +
            '  "attachments": [{' +
            '    "views": { "flockml": "<flockml>' + richText + '</flockml>" }' +
            '  }]' +
            '}'
        );
    }

    private sendJSON (jsonContent : string) : Promise<any>
    {
        var request = SimpleHTTP.newRequest(Flock.FLOCK_MSG_URL + this.accessToken);
        return request.post(jsonContent, 'application/json');
    }

}
