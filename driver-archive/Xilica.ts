/**	Driver talking to a Xilica DSP, e.g. Solaro or Neutrino: https://xilica.com/products/qr1/

 	This driver controls gain and input selection of up to four channels.

	Copyright (c) 2018 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {callable, driver, max, min, parameter, property} from "system_lib/Metadata";

@driver('NetworkTCP', { port: 10007 })
export class Xilica extends Driver<NetworkTCP> {
	private keepAliver: KeepAliver;
	private outputs: Output[];

	public constructor(public socket: NetworkTCP) {
		super(socket);
		socket.autoConnect();

		// Instantiate outputs
		this.outputs = [];
		for (var ix = 1; ix <= 4; ++ix)
			this.outputs.push(new Output(this, ix));

		this.keepAliver = new KeepAliver(this);

		// Subscribe to data received from device
		socket.subscribe('textReceived', (sender, message) => this.gotData(message.text));

		// Listen for connection state change
		socket.subscribe('connect', (sender, message) => {
			if (message.type === 'Connection') {
				if (!socket.connected)
					console.error("Connection dropped unexpectedly");
			} else
				console.error(message.type);
		});
		// console.log("Xilica driver started");
	}

	/** Data received from DSP. Log any errors, ignore others.
	*/
	private gotData(data: string) {
		// console.log("Received data", data);
		if (data.indexOf('ERROR') === 0)
			console.error(data);	// Report errors from DSP
	}

	@callable("Send a single SET command")
	public sendSetCommand(
		@parameter("Target function") target: string,
		@parameter("Value") value: any
	) {
		if (this.socket.connected) {
			var cmd = 'SET ' + target + ' ';
			const parType = typeof value;
			switch (parType) {
			case 'string':	// Enclose in double quotes
				cmd += '"' + value + '"';
				break;
			case 'boolean':	// Turn to upper case
				cmd += value ? 'TRUE' : 'FALSE';
				break;
			default:		// Others as-is
				cmd += value;
				break;
			}
			this.socket.sendText(cmd);
			// console.log("Sent", cmd);
		}
	}

	/**	Allow raw command string as well, for "no driver" backward compatibility.
	*/
	@callable("Send a command")
	public sendText(
		@parameter("Command to send") cmd: string,
	) {
		this.socket.sendText(cmd);
	}

	@property("Channel 1 gain") @min(-100) @max(15)
	public set gain1(gain: number) {
		this.outputs[0].setGain(gain);
	}
	public get gain1() {
		return this.outputs[0].gain;
	}
	@property("Channel 1 input") @min(0) @max(4)
	public set input1(input: number) {
		this.outputs[0].setInput(input);
	}
	public get input1() {
		return this.outputs[0].input;
	}

	@property("Channel 2 gain") @min(-100) @max(15)
	public set gain2(gain: number) {
		this.outputs[1].setGain(gain);
	}
	public get gain2() {
		return this.outputs[1].gain;
	}
	@property("Channel 2 input") @min(0) @max(4)
	public set input2(input: number) {
		this.outputs[1].setInput(input);
	}
	public get input2() {
		return this.outputs[1].input;
	}

	@property("Channel 3 gain") @min(-100) @max(15)
	public set gain3(gain: number) {
		this.outputs[2].setGain(gain);
	}
	public get gain3() {
		return this.outputs[2].gain;
	}
	@property("Channel 3 input") @min(0) @max(4)
	public set input3(input: number) {
		this.outputs[2].setInput(input);
	}
	public get input3() {
		return this.outputs[2].input;
	}

	@property("Channel 4 gain") @min(-100) @max(15)
	public set gain4(gain: number) {
		this.outputs[3].setGain(gain);
	}
	public get gain4() {
		return this.outputs[3].gain;
	}
	@property("Channel 4 input") @min(0) @max(4)
	public set input4(input: number) {
		this.outputs[3].setInput(input);
	}
	public get input4() {
		return this.outputs[3].input;
	}

}

/** Functions for a single DSP output.
*/
class Output {
	input = 0;		// 0...n
	gain = -100;	// -100...15 dB

	constructor(
		private xilica: Xilica,
		private channel: number
	) {
		// Apply initial values (possibly better to read those back?)
		this.setInput(this.input);
		this.setGain(this.gain);
	}

	setInput(input: number): void {
		this.xilica.sendSetCommand('out'+this.channel, input);
		this.input = input;
	}
	setGain(gain: number): void {
		this.xilica.sendSetCommand('gain'+this.channel, gain);
		this.gain = gain;
	}
}

class KeepAliver {
	constructor(private xilica: Xilica) {
		this.saySomethingInAWhile();
	}

	/** Send some data once in a while to keep connection open.
	*/
	private saySomethingInAWhile() {
		wait(9000).then(() => {
			this.sayNow();
			this.saySomethingInAWhile();	// Ad infinitum
		});
	}

	private sayNow() {
		const sock = this.xilica.socket;
		if (sock.connected)
			sock.sendText("GET gain1");	// Some harmless command
	}
}
