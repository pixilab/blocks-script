/*	API for executing external process on the server. Occasionally useful in "CGI-like"
	applications where some function is implemented using an external executable.

	WARNING! Such external processes can potentially do ANYTHING the user (under which the
	Blocks server is running) can do. Including deleting the entire Blocks root directory,
	and similar devastating actions.

	Make sure to ONLY call benign executables. Or PROTECT the entry points to scripts
	calling on SimpleProcess using roleRequired annotations with an adequate user role.
	NEVER pass in the name of the executable from the outside. Instead, ALWAYS hard-code
	the executable to be called in your user script.

	Consider yourself warned, and proceed with caution!


	Copyright (c) 2019 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */


export var SimpleProcess: {
	/**
	 * Launch the process specified by cmdNameOrPath, optionally passing it args.
	 * Returns a Promise that will be fulfilled with the output of the process,
	 * or rejected if an error occurs.
	 */
	start(cmdNameOrPath: string, args?: string[]): Promise<string>;

	/**
	 Path to the blocks root, without trailing slash.
	 Occasionally useful for running external programs
	 operating on files inside the Blocks root.
	 */
	readonly blocksRoot: string;

	/**
	 A more advanced way to create, configure, start and manage a process,
	 providing more options along the way.
	 */
	create(cmdNameOrPath: string): ProcessBuilder;

};

/**
 * Interface returned from SimpleProcess.create, allowing you to configure
 * the process before eventually starting it. Call any desired setXxxx
 * function(s) BEFORE you call start
  */
interface ProcessBuilder {
	/**
	 Append one argument to the argument list of the process.
	 */
	addArgument(arg: string): void;

	/**
	 Set the working directory of the process. If not set, it defaults to the
	 current directory as set when starting Blocks.
	 */
	setWorkingDirectory(dirPath: string): void;

	/**
	 Set the maximum time the process is allowed to run before being forcefully
	 terminated, in mS. The default timeout is 5 minutes.
	 */
	setTimeout(milliseconds: number): void;

	/**
	 * Some processes return a non-zero exit code even if no error occurred.
	 * The default behavior is to consider any non-zero exit code as an
	 * error, causing the asspciated promise to be rejected. You can override
	 * this default behavior by registering acceptable exit codes using
	 * this function before starting the process.
	 */
	addAcceptableExitCode(code: number): void;

	/**
	 Start the process, returning an object providing more information
	 about the process. Call this LAST, after any configuration
	 methods above. Returns an object providing more control over
	 the process.
	 */
	start(): Process;
}

/**
 * Interface returned from ProcessBuilder.start, providing various information
 * and functions that can be used to further observe and control the process.
 */
export interface Process {
	/** A promise to be resolved with the output from the process,
	 	or rejected if an error occurs.
	 */
	readonly promise: Promise<string>;

	/**
	 * Return true if this process is still running, false if it's terminated.
	 * Note that is is generally preferable to use the promise to learn when
	 * the process has finished, rather than checking this value. Also keep
	 * in mind that this status is "volatile", as the process may exit at
	 * any time.
	 */
	readonly alive: boolean;

	/**
	 * The exit code of the process (once it's terminated, as indicated by the
	 * promise being resolved/rejected
	 */
	readonly exitCode: number;

	/**
	 * The process' ID (pid), used by the operating system to identify the process.
	 */
	readonly processId: number;

	/**
	 * Provide the complete data emitted by the process to stdout and stderr AFTER
	 * the process has terminated.
	 */
	readonly fullStdOut: string;
	readonly fullStdErr: string;

	/**
	 * Ask the process to terminate. Useful for long-running processes that can be
	 * terminated gracefully (e.g., by sending it a SIGTERM signal or similar).
	 */
	stop(): void;
}
