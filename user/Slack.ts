/*
 * Created 2018 by Samuel Walz
 */
import {SimpleHTTP} from "../system/SimpleHTTP";
import {SimpleFile} from "../system/SimpleFile";
import {Script, ScriptEnv} from "system_lib/Script";
import {callable, max, min, parameter, property} from "system_lib/Metadata";

export class Slack extends Script {

    private static CONFIG_FILE_NAME = "Slack.config.json";
    private static SLACK_MSG_URL = "https://hooks.slack.com/services/";

    private accessToken = "";

	public constructor(env : ScriptEnv) {
		super(env);
		console.log("Slack instantiated");

        SimpleFile.read(Slack.CONFIG_FILE_NAME).then(readValue => {
            var settings = JSON.parse(readValue);
			this.accessToken = settings.access_token;
		}).catch(error =>
			console.warn("Can't read file", Slack.CONFIG_FILE_NAME, error)
		);
	}


    @callable("Send message to Slack")
	public sendMessage(
        @parameter("Message content (supports basic formatting e.g. \\n *bold* _italic_)") message: string
    ): Promise<any> {
		return this.sendJSON('{"text":"' + message + '"}');
	}

    private sendJSON (jsonContent : string) : Promise<any>
    {
        var request = SimpleHTTP.newRequest(Slack.SLACK_MSG_URL + this.accessToken);
        return request.post(jsonContent, 'application/json');
    }

}
