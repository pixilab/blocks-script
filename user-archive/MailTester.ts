/*	Simple test scipt for testing the SimpleMail API. Invoke from a Task, specifying
	where to send the email.

	IMPORTANT: For email to work, you must have have correct mail settings in your
	Blocks configuration file, as described here:

	https://pixilab.se/docs/blocks/server_configuration_file#top_level_mail_item

 * Copyright (c) 2024 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {Script} from "system_lib/Script";
import {SimpleMail} from "system/SimpleMail";
import {SimpleProcess} from "system/SimpleProcess";
import {callable, parameter} from "system_lib/Metadata";
import {SimpleFile} from "system/SimpleFile";

export class MailTester extends Script {
	@callable("Send an email to the specified address")
	public mailTo(
		@parameter("Where to send the email") emailAddress: string,
		@parameter("Subject field of the email", true) subject?: string,
		@parameter("Text content of the email", true) body?:string
	) {
		const sendResult = SimpleMail.send(
			emailAddress,
			subject || "From Blocks MailTester",
			body || ("Sent to verify working email from Blocks on " + new Date().toString())
		);

		sendResult.catch(errorMsg => 	// Log any error
			console.error("Failed sending email - check your configuration file; " + errorMsg)
		);

		return sendResult;	// Makes calling task wait or send to finish before proceeding
	}
}
