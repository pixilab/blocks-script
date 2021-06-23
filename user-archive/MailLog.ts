/* 	A user script for emailing the latest log file, as a zip-compressed enclosure.
	The script is desiged to be used with a standard PIXILAB Blocks server. There
	are hard coded path to where the Blocks root is, as well as an assumption on
	a Linux-style ZIP command being available in the the usual place.

	IMPORTANT: For this script to work, you must first configure an outgoing email
	server using a top-level 'mail:' entry in your Blocks configuration file, see
	https://pixilab.se/docs/blocks/server_configuration_file#top_level_mail_item

 Copyright (c) 2020 PIXILAB Technologies AB, Sweden (http://pixilab.se).
 All Rights Reserved.
 */

import {Script, ScriptEnv} from "system_lib/Script";
import {SimpleMail} from "system/SimpleMail";
import {SimpleProcess} from "system/SimpleProcess";
import {callable} from "system_lib/Metadata";
import {SimpleFile} from "system/SimpleFile";

export class MailLog extends Script {
	// Standard location of Blocks root on a Linux server
	static readonly kBlocksRoot = '/home/pixi-server/PIXILAB-Blocks-root/';

	public constructor(env: ScriptEnv) {
		super(env);
	}

	/**
	 * Our single function, doing the zipping, emailing and clean-up.
	 * All system functions that may take some time to complete return
	 * a promise, allowing the following action to be triggered by the
	 * completion or failure of the previous step. I also return a promise
	 * that is resolved once the complete function is done successfully,
	 * or is rejected (with an error message) if it fails. Calling this
	 * from a task will make the task wait until this function is finished
	 * (i.e., until the promise it returns is resolved/rejected). The task
	 * will then proceed or abort, depending on the outcome as well as its
	 * configuration.
	 */
	@callable("Send the latest.log file to specified email address")
	public sendLogTo(email: string) {
		const timeStamp = new Date().toString();


		return SimpleProcess.start(	// Zip the log, storing it in the temp directory
			'/usr/bin/zip', [
				'-q',	// Run the command in "quiet" mode
				MailLog.kBlocksRoot + 'temp/latest-log.zip',	// File written to
				MailLog.kBlocksRoot + 'logs/latest.log'			// What's zipped
			]
		).then(() =>				// Then email the ZIP to the specified address
			SimpleMail.send(
				email,
				"Blocks log file",
				"Here's the PIXILAB Blocks log file from " + timeStamp + "<br>",
				'/temp/latest-log.zip'
			)
		).finally(() => // Delete the zip file once we're done (success or failure alike)
			SimpleFile.delete('/temp/latest-log.zip')
		).catch(errorMsg => 	// Log any error
			console.error("Failed emailing log file; " + errorMsg)
		);
	}
}
