/*
 * Copyright (c) 2021 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {callable, driver, parameter, property} from "system_lib/Metadata";

@driver('NetworkTCP', { port: 3047 })
export class UIRobot extends Driver<NetworkTCP> {
	private mLeftDown = false;
	private mRightDown = false;

	private mPower = false;	// Current power state

	// The currently running program including dir and params (pipe-separated).
	private mProgramParams: string = '';

	// Currently pressed key combo
	private mCurrentKeys: string = '';
	private mKeyRlsTimer?: CancelablePromise<void>;	// Set while key down timer running

	// A promise which will be resolved when we want to retry WoL, will be cancelled on successful connection.
	private woLRetryPromise: CancelablePromise<void>;
	// How many times we've sent the WoL package.
	private woLRetryAttempts: number;

	// Program and arguments that need to run on peer to shut down. Assumes Windows.
	static readonly kPowerDownProgram = "C:/Windows/System32/shutdown.exe||/s /f /t 0";
	// The interval at which we will send the WoL command when powering on.
	static readonly kWoLRetryInterval = 1000 * 20;
	// The max number of attempts to try waking up the target PC through WoL.
	static readonly kWoLRetryMaxAttempts = 10;

	public constructor(protected socket: NetworkTCP, bufferSize?: number) {
		super(socket);
		if (bufferSize)
			socket.setMaxLineLength(bufferSize);
		socket.enableWakeOnLAN();	// Allows us to use wakeOnLAN in power property
		socket.autoConnect();

		// Listen for connection attempt failure or connection state change
		socket.subscribe('connect', (sender, message) => {
			if (message.type === 'Connection') // Connection state changed
				this.onConnectStateChanged(sender.connected);
		});

		// Handle initially connected state
		if (socket.connected)
			this.onConnectStateChanged(true);
	}

	/**	Connected state changed to the one specified by the parameter.
	 */
	protected onConnectStateChanged(connected: boolean) {
		if (connected) 			// Just connected
			this.power = true;	// Consider powered (likely turned on manually)
		else	// Just disconnected - clear out any "current program"
			this.mProgramParams = '';
	}

	/**
	 * Turn power of computer in other end on and off. Setting the power to ON will attempt
	 * to wake up the computer using Wake-on-LAN. Setting it to OFF will send a command to
	 * the peer to shut it down, using kPowerDownProgram.
	 */
	@property("Power computer on/off")
	public set power(power: boolean) {
		if (this.mPower !== power) {	// This is news
			this.mPower = power;		// Consider state change taken
			this.cancelWoLRetry();		// Only one pending at a time
			if (power) {				// Turn power on
				this.woLRetryAttempts = 0;
				this.tryWakeUp();
			} else // Turn power OFF using designated command
				this.program = UIRobot.kPowerDownProgram;
		}
	}

	/**
	 * Return the most recently set power state. If you want to know whether we're
	 * successfully connected, use the "connected" read-only property instead.
	 */
	public get power(): boolean {
		return this.mPower;
	}

	/**
	 * Send a WoL-package as long as we are not yet connected.
	 * Sometimes the package won't reach its destination, so we schedule yet another
	 * WoL-package to be sent in the near future, which will be cancelled if we get
	 * a succesfull connection status before it fires. Also, don't try more than 10 times.
	 */
	private tryWakeUp() {
		if (!this.socket.connected) {	// No need if already online
			if (this.woLRetryAttempts < UIRobot.kWoLRetryMaxAttempts) {
				// More re-tries to go
				this.socket.wakeOnLAN();
				this.woLRetryPromise = wait(UIRobot.kWoLRetryInterval);
				this.woLRetryPromise.then(() => this.tryWakeUp());
				this.woLRetryAttempts += 1;
			} else { // Too many retries - give up
				this.woLRetryPromise = undefined;
				this.power = false; // Auto-revert to power off state at this point
			}
		} else
			this.woLRetryPromise = undefined;
	}

	/**
	 * If we have a prominent WoL retry, cancel it.
	 */
	private cancelWoLRetry() {
		if (this.woLRetryPromise) {
			this.woLRetryPromise.cancel();
			this.woLRetryPromise = undefined;
		}
	}

	@property("Left mouse button down")
	public set leftDown(value: boolean) {
		if (this.mLeftDown !== value) {
			this.mLeftDown = value;
			this.sendMouseButtonState(1024, value);
		}
	}
	public get leftDown(): boolean {
		return this.mLeftDown;
	}

	@property("Right mouse button down")
	public set rightDown(value: boolean) {
		if (this.mRightDown !== value) {
			this.mRightDown = value;
			this.sendMouseButtonState(4096, value);
		}
	}
	public get rightDown(): boolean {
		return this.mRightDown;
	}

	@callable("Move mouse by specified distance")
	public moveMouse(x: number, y: number): void {
		this.sendCommand('MouseMove', x, y)
	}

	@callable("Transitory command to run")
	public transitoryCommand(
		@parameter("Path to executable command to run") exePath: string,
		@parameter("Working directory to be applied") workingDirectory: string,
		@parameter("Additional arguments, separated by vertical bar", true)args?: string
	) {
		let params: string[] = [];
		if (args) // Put arguments into params array
			params = args.split('|');
		// Prepend working directory and command path
		params.unshift(exePath);
		params.unshift(workingDirectory);
		return this.sendCommand('Launch', ...params);
	}

	@property("The program to start, will end any previously running program. Format is EXE_PATH|WORKING_DIR|...ARGS")
	public set program(programParams: string) {
		// console.log("program", programParams);
		if (this.mProgramParams !== programParams) { // Only send command if this is indeed news
			// First stop the previously runnig program, if any
			const runningProgram = this.parseProgramParams(this.mProgramParams);
			if (runningProgram) {
				this.sendCommand(
					'Terminate',
					runningProgram.program
				);
			}

			// Then launch any new program
			const newProgram = this.parseProgramParams(programParams);

			if (newProgram) {
				this.mProgramParams = programParams;
				this.sendCommand(
					'Launch',
					newProgram.workingDir,
					newProgram.program,
					...newProgram.arguments
				);
			} else {
				this.mProgramParams = '';
			}
		}
	}
	public get program(): string {
		return this.mProgramParams;
	}

	/**
	 * Press a key (with optional modifiers) in the format of
	 *
	 * 		MODIFIER1+MODIFIER2+KEY
	 *
	 * Possible modifiers are:
	 * 	shift
	 * 	meta
	 * 	control
	 * 	alt
	 * 	altgr
	 * KEY may be expressed as:
	 * 	 - an upper case alphabetic (ASCII) character
	 * 	 - a digit
	 * 	 - a VK_XXX "virtual key code" from the list found here:
	 * 	 	https://docs.oracle.com/javase/7/docs/api/java/awt/event/KeyEvent.html
	 *
	 * The property value is only held for about 0.2 seconds, and is then reset. This provides
	 * some feedback when controlled using, e.g., a button on a panel.
	 */
	@property("Press a key, modifiers (alt, shift, etc) before key")
	public set keyDown(keys: string) {
		this.mCurrentKeys = keys;

		if (!!this.mCurrentKeys) {
			const keyPresses = keys.split('+');
			const key = keyPresses[keyPresses.length - 1];
			let modifierSum: number = 0;
			if (keyPresses.length > 1) {
				let modifiers = keyPresses.slice(0, keyPresses.length - 1);
				const modifierValues: any = {
					'shift': 1,
					'control': 2,
					'alt': 4,
					'altgr': 8,
					'meta': 16
				};
				modifiers.forEach(mod => modifierSum += modifierValues[mod] || 0);
			}
			this.sendCommand('KeyPress', key, modifierSum);

			if (this.mKeyRlsTimer) // Reset already running timer for new keystroke
				this.mKeyRlsTimer.cancel();
			this.mKeyRlsTimer = wait(200);
			this.mKeyRlsTimer.then(() => {
				this.keyDown = '';
				this.mKeyRlsTimer = undefined;
			});
		}
	}
	public get keyDown(): string {
		return this.mCurrentKeys;
	}

	/**
	 * Send button down/up, where buttonMask is one of the
	 * BUTTON_DOWN_MASK constants defined in se.pixilab.robot.MousePress
	 */
	private sendMouseButtonState(buttonMask: number, down: boolean) {
		this.sendCommand('MousePress', buttonMask, down ? 1 : 2);
	}

	/**
	 * Send command with any arguments separated by space to dest socket.
	 */
	protected sendCommand(command: string, ...args: any[]) {
		command += ' ' + args.join(' ');
		// console.log("command", command);
		return this.socket.sendText(command);
	}

	/**
	 * Parse out the up to three parameters in the form Format is EXE_PATH|WORKING_DIR|...ARGS
	 * into a ProgramParams object.
	 */
	private parseProgramParams(programParams?: string): ProgramParams|undefined {
		// console.log("parseProgramParams", programParams);
		if (programParams) {
			const params = programParams.split('|');
			const result = {
				program: UIRobot.quote(params[0]),
				workingDir: UIRobot.quote(params[1]) || '/',
				arguments: params.slice(2)
			};
			// console.log("parseProgramParams PROGRAM", result.program, "WORKING", result.workingDir, "ARGS", result.arguments.toString());
			return result;
		} // Else returns undefined if no/empty programParams
	}

	static quote(str: string) {
		return  '"' + str + '"';
	}
}

interface ProgramParams {
	program: string;
	workingDir?: string;
	arguments?: string[];
}
