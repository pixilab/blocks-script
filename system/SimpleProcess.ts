/*
	API for executing external process on the server. Occasionally useful in "CGI-like" applications where
	some function is implemented as an external executable.

	WARNING! Such external processes can potentially do ANYTHING the user (under which the
	Blocks server is running) can do. Including deleting the entire Blocks root directory, and
	similar devastating actions.

	Make sure to ONLY call benign executables. Or PROTECT the entry points to scripts that call
	SimpleProcess methods using roleRequired annotations with adequate user role.
	Do NOT pass in the name of the executable from outside, or similar "wildcard" actions.
	Instead, ALWAYS hard-code the executable to call in your user script.

	Consider yourself warned, and proceed with caution!


	Copyright (c) 2019 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */



export var SimpleProcess: {
	/**
	 * Launch the process specified by cmdNameOrPath, optionally passing it args.
	 * Returns a Promise that will be fulfilled with the output of the process,
	 * or rejected if an error occurs.
	 */
	start(cmdNameOrPath: string, args?: string[]): Promise<string>
};