/*
 * A skeleton driver for sending data to devices supporting REST-style commands over HTTP,
 * such as the Panasonic "HD Integrated Camera". I'm not actually a "real" driver. I don't
 * connect to the socket.  Instead I pick up its address, then use SimpleHTTP to do the
 * communicaiton instead.
 *
 * Copyright (c) 2018 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {Request, SimpleHTTP} from "system/SimpleHTTP";
import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import * as Meta from "system_lib/Metadata";

@Meta.driver('NetworkTCP', { port: 80 })
export class PanasonicPanTilt extends Driver<NetworkTCP> {
	private processor: CmdProcessor;

	private panTiltPending: Promise<any>;	// Set while pan/tilt command pending

	/*	Some devide state. Initial value could be read back from device
		rather than hard-coded.
	 */
	private mPower = false;
	private mPan = 0.5;		// Initial/center position
	private mTilt = 0.5;

	public constructor(private socket: NetworkTCP) {
		super(socket);
		this.processor = new CmdProcessor(socket.address);
	}

	@Meta.property("Camera power control")
	set power(state: boolean) {
		this.mPower = state;
		this.sendRawCommand('O' + (state ? '1' : '0'));
	}
	get power(): boolean {
		return this.mPower;
	}

	@Meta.property("Camera pan, normalized 0…1")
	@Meta.min(0)
	@Meta.max(1)
	set pan(state: number) {
		if (this.mPan !== state) {
			this.mPan = state;
			this.sendPanTiltSoon();
		}
	}
	get pan(): number {
		return this.mPan;
	}

	@Meta.property("Camera tilt, normalized 0…1")
	@Meta.min(0)
	@Meta.max(1)
	set tilt(state: number) {
		if (this.mTilt !== state) {
			this.mTilt = state;
			this.sendPanTiltSoon();
		}
	}
	get tilt(): number {
		return this.mTilt;
	}

	/**
	 * Send a pan/tilt command soon. I expose those as separate properties, but they
	 * are sent as one command. Defer sending a bit to allow both values to be combined
	 * if changed closely together.
	 */
	private sendPanTiltSoon() {
		if (!this.panTiltPending) {
			this.panTiltPending = wait(100);
			this.panTiltPending.then(() => {
				const cmd = 'APC' +
					toFourHex(this.mPan * 0xffff) +
					toFourHex(this.mTilt * 0xffff);
				this.sendRawCommand(cmd);
				this.panTiltPending = undefined;
			});
		}
	}

	/**
	 * Send "raw" command to the device. Mainly for testing purposes. Use properties
	 * for most "real" device state, and callable functions when you must.
	 */
	@Meta.callable("Send raw command to device")
	public sendRawCommand(rawCommand: string): Promise<string>  {
		const result = this.processor.sendCommand(rawCommand);
		result.then(response => log("Response", response));
		return result;
	}
}

/**
 * Queue up commands to be sent, spacing them out to be sent no faster than
 * kMillisPerCmd, according to the protocol spec.
 */
class CmdProcessor {
	private currCmd?: Cmd;				// Currently processed command, if any
	private cmdQueue: Cmd[] = [];		// Waiting commands

	private static readonly kMillisPerCmd = 130;	// Milliseconds to space commands apart

	constructor(private server: string) {
	}

	/**
	 * Send a command. Return a promise that will be resolved once the command
	 * has been promised successfully, where the result of the promise contains
	 * the data returned from the other side.
	 */
	sendCommand(command: string): Promise<string>  {
		log("sendCommand", command);
		const cmd = new Cmd(command);
		if (this.cmdQueue.length > 30)	// Largest number of pending commands we accept
			throw "Command buffer overflow";
		this.cmdQueue.push(cmd);
		this.doNextCommand();
		return cmd.getPromise();
	}

	/**
	 * If no command currently in flight, initiate one.
	 */
	private doNextCommand() {
		if (!this.currCmd && this.cmdQueue.length) {
			const cmd = this.cmdQueue.shift();
			this.currCmd = cmd;

			cmd.getRequest(this.server).get().then(
				result => {
					cmd.handleResponse(result.data);
					return wait(CmdProcessor.kMillisPerCmd);
				},
				error => {
					cmd.fail(error);
					return wait(CmdProcessor.kMillisPerCmd);
				}
			).finally(() => {
				log("Finally");
				this.currCmd = undefined;
				// Proceed with next command, if any
				this.doNextCommand();
			});
		}
	}
}

/**
Internal log function, making my logging easy to turn on/off.
*/
function log(...toLog: any[]) {
	// console.log(toLog);	// Uncomment to enable logging
}

/**
 * Maintain the state and life-cycle of a single command.
 */
class Cmd {
	private readonly outcome: Promise<string>;
	private resolver: (value?: string | Thenable<string>) => void;
	private rejector: (error?: any) => void;

	/**
	 * Create a command, where the command string is what needs to follow after the
	 * initial / in the request. Must ONLY contain URL-compatible characters.
	 */
	constructor(private command: string, ) {
		this.outcome = new Promise((resolver, rejector) => {
			this.resolver = resolver;
			this.rejector = rejector;
		});
	}

	getPromise(): Promise<string> {
		return this.outcome;
	}


	getRequest(server: string): Request {
		const url = 'http://' + server + '/cgi-bin/aw_ptz?cmd=%23' + this.command + '&res=1';
		log("URL", url);
		return SimpleHTTP.newRequest(url);
	}

	/**
	 * Accumulate any response data received from the other end
	 */
	handleResponse(response: string) {
		this.resolver(response);
	}

	/**
	 * Final death-knell of this command, rejecting it with the specified error.
	 */
	fail(error: any) {
		this.rejector(error);
	}
}

/**
 * Convert num to exactly four hex digit (upper case).
 */
function toFourHex(num: number): string {
	num = Math.round(num);
	const hexDigits = num.toString(16).toUpperCase();
	const numDigits = hexDigits.length;
	if (numDigits > 4)	// Woops - no can do - clip to max
		return 'FFFF';
	return '000'.substr(numDigits-1) + hexDigits;
}