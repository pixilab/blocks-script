import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {callable, driver, min, parameter} from "system_lib/Metadata";

/**	A very basic Barco E2 driver for recalling presets.
*/
@driver('NetworkTCP', { port: 9878 })
export class BarcoE2 extends Driver<NetworkTCP> {

	public constructor(private socket: NetworkTCP) {
		super(socket);
		socket.autoConnect();
	}

	@callable("Load a preset into Program or Preview")
	public activatePreset(
		@parameter("Preset number") preset: number
	) {
		return this.send(preset);
	}

	/**
	 * Send specified command, returning a promise resolved once sent.
	 */
	private send(preset: number): Promise<any> {
		return this.socket.sendText(`PRESET -a ${ preset }`);
	}
}
