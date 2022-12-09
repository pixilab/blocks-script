/*	Zip and email the latest Blocks log file. This script assumes a unix-style environment
	(i.e., Mac/Linux), in that it calls the command line zip utility. It may not work without
	changes under Windows (which presumably also has a command line zip utility, likely in
	another location taking different options).

	Furthermore, for emailing to work, you must have the appropriate mail settings in your
	Blocks configuration file.

	Copyright (c) 2021 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {Script} from "system_lib/Script";
import {SimpleMail} from "system/SimpleMail";
import {SimpleProcess} from "system/SimpleProcess";
import {callable} from "system_lib/Metadata";
import {SimpleFile} from "system/SimpleFile";

export class MailLog extends Script {
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
				'--quiet',			// Do not output unnecessary data to stdout
				'--junk-paths',		// Store just the file - not its enclosing directories
			   SimpleProcess.blocksRoot + '/temp/latest-log.zip',	// File written to
			   SimpleProcess.blocksRoot + '/logs/latest.log'		// What's zipped
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
