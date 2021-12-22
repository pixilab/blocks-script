import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {driver, property} from "system_lib/Metadata";

/**	Wall-plate Switcher for HDMI and USB-C.
* https://atlona.com/product/at-hdvs-210u-tx-wp/
*/
@driver('NetworkTCP', { port: 23 })
export class AtlonaHDVS210U extends Driver<NetworkTCP> {
	private input: boolean;
	private autoswitch: boolean;
	private inputnumber: number;

	public constructor(private socket: NetworkTCP) {
		super(socket);
		socket.autoConnect();
	}

	@property("true = HDMI, false = USB-C")
	public set selectInput(inp: boolean) {
		this.input = inp;
		this.inputnumber = inp ? 1 : 0;
		const cmd = "x" + (this.inputnumber + 1) + "AVx1";
		this.sendCmd(cmd);
	}
	public get selectInput(): boolean {
		return this.input;
	}

	@property("Auto-switching mode")
	public set autoSwitch(on: boolean) {
		this.autoswitch = on;
		const cmd = "AutoSW " + (on ? "on" : "off")
		this.sendCmd(cmd);
	}
	public get autoSwitch(): boolean {
		return this.autoswitch;
	}

	private sendCmd(cmd: string) {
		this.socket.sendText(cmd);
	}
}
