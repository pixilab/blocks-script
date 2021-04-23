/*	Driver for AV Bridge 2x1 Presentation Switcher, providing source switching control.

	IMPORTANT: I expect user config options with the structure according to
	Options (see below) with the user name and password credentials used to log in.

 	Copyright (c) 2021 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {driver, max, min, property} from "../system_lib/Metadata";
import {Driver} from "../system_lib/Driver";
import {NetworkTCP} from "../system/Network";

// Expected structure of user config options
interface Options {
	"name": string;		// <login-name>,
	"password": string;	// <login-password>
}


@driver('NetworkTCP', { port: 23 })
export class VaddioVideoBridge extends Driver<NetworkTCP> {
	private readonly options: Options;
	static readonly userNameReq = /.+vaddio-av-bridge-2x1[0-9,A-F-]+/;
	static readonly loginAccepted = /.+Vaddio Interactive Shell.+/;

	private mInput = 1;		// Currently selected input number

	constructor(public socket: NetworkTCP) {
		super(socket);
		socket.autoConnect();

		const rawOpts = socket.options;
		if (rawOpts) {
			try {
				var opts: Options = JSON.parse(rawOpts);
				if (opts.name && opts.password) { // Looks OK
					this.options = opts;
					console.log("Options set");
					socket.subscribe('textReceived', (sender, msg) => {
						// console.log("Text received", msg.text)
						this.dataFromDevice(msg.text);
					});
				} else
					console.error("Invalid driver options (must have name and password)")
			} catch (error) {
				console.error("Bad driver options format", error);
			}
		} else
			console.warn("No options specified");
	}

	@property("Selected input number")
	@min(1)
	@max(2)
	set input(value: number) {
		this.mInput = value;
		this.sendInputSelect();
	}
	get input(): number {
		return this.mInput;
	}

	/**
	 * Send comand to select the curren input.
	 */
	private sendInputSelect() {
		if (this.socket.connected)
			this.socket.sendText("video program source set input" + this.mInput);
	}

	/**
	 * Look for login prompts and respond as appropriate. First for something like:
	 * 		vaddio-av-bridge-2x1-68-27-19-85-9D-AF login:
	 * where we respond with username, then for
	 * 		Password:
	 * where we respond with password
	 *
	 * Note that the userNameReq regex we look for actually is part of a string that
	 * is received before the user name prompt, since we like to receive complete
	 * lines (terminated by CR), and the prompts aren't terminated like that.
	 * So I cheat a bit and look for a line just above the login prompt, and then
	 * send the name and password with a small delay in between each. Another
	 * option could hae been to look for ": " as framing sequence, but that would
	 * then interfere with possible future desires to read feedback data from the
	 * device, so this felt like a reasonable compromise.
	 */
	private dataFromDevice(msg: string) {
		if (msg.match(VaddioVideoBridge.userNameReq)) {
			wait(500).then(() => {
				this.socket.sendText(this.options.name);
				return wait(500);
			}).then(() => {
				this.socket.sendText(this.options.password);
				console.log("Provided login name and password");
			});
		} else if (msg.match(VaddioVideoBridge.loginAccepted)) {
			console.log("Login successful");
			this.init();
		}
		// Ignore other data from device silently
	}

	/**
	 * Do any further initialization as needed right after logging in.
	 */
	private init() {
		this. sendInputSelect();	// Enforce our idea of current input
	}
}

