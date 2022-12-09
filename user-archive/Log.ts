/*
 * Basic example User script for PIXILAB Blocks, just logging a warning message.
 *
 * Created 2021 by Mattias Andersson.
 */

import {Script, ScriptEnv} from "system_lib/Script";
import {callable, parameter} from "system_lib/Metadata";

/**
 * A user script must begin with a class that extends the Script base-class. The name of this class
 * must be the same as the name of the script file (minus its .ts or .js extension)
 */
export class Log extends Script {

	/*	A constructor can be used to perform one-time initializations or similar.
		If you use a constructor, you must declare it takign a single ScriptEnv
		parameter and then calling super with that parameter. If you have no
		initializations (as is the case here), you can omit the entire constructor.
		Included here for the sake of completeness in this example.
	 */
	public constructor(env : ScriptEnv) {
		super(env);
	}

	/**
	 * A public function marked as @callable is published for use from Tasks. You can use pass
	 * a string to the @callable decorator describing what the function does. That text will then
	 * be shown in the Blocks editor when selecting the function for a do statement.
	 *
	 * Likewise, any parameters to the function can be decorated with @parameter, also taking
	 * a brief description to be shown in the Editor for that parameter. Trailing parameters
	 * may be marked as optional by adding true to the @parameter decorator, as seen
	 * for the sender parameter below. That parameter will then be undefined if not provided
	 * in the do statement.
	 */
	@callable("Log a string as warning")
	public warning(
		@parameter("What to log") message: string,
		@parameter("Can be used to indicate who logged the message", true) sender: string
	): void {
		console.warn(message, "from", sender);
	}
}
