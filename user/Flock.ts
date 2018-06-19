/*
 * Created 2018 by Samuel Walz
 */
import {SimpleHTTP} from "../system/SimpleHTTP";
import {SimpleFile} from "../system/SimpleFile";
import {Script, ScriptEnv} from "system_lib/Script";
import {callable, max, min, parameter, property} from "system_lib/Metadata";

export class Flock extends Script {

    private static CONFIG_FILE_NAME = "Flock.config.json";
    private static FLOCK_MSG_URL = "https://api.flock.com/hooks/sendMessage/";

    private accessToken = "";

	public constructor(env : ScriptEnv) {
		super(env);
		console.log("Flock instantiated");

        SimpleFile.read(Flock.CONFIG_FILE_NAME).then(readValue => {
            var settings = JSON.parse(readValue);
			this.accessToken = settings.access_token;
		}).catch(error =>
			console.warn("Can't read file", Flock.CONFIG_FILE_NAME, error)
		);
	}


    @callable("Send message to Flock")
	private sendMessage(
        @parameter("Message content") message: string
    ): void {
		var request = SimpleHTTP.newRequest(Flock.FLOCK_MSG_URL + this.accessToken);
        request.post('{"text":"' + message + '"}', 'application/json');
	}

}
