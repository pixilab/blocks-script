import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {callable, driver, parameter, property} from "system_lib/Metadata";

/**	A very basic Barco E2 driver for recalling presets using the newer JSON
*  based protocol.
*/
@driver('NetworkTCP', { port: 9999 })
export class BarcoE2_JSON extends Driver<NetworkTCP> {

	private mPreview: number = 0;
	private mLive: number = 0;

	public constructor(private socket: NetworkTCP) {
		super(socket);
		socket.autoConnect();
	}

	@callable("Load a preset into Live or Preview")
	public activatePreset(
		@parameter("Preset number")  preset: number,
		@parameter("Load into Preview", true) preview?: boolean
	) {
		if (preview)
			this.mPreview = preset;
		else
			this.mLive = preset;

		return this.send(new Command(
			"activatePreset",
			{ id: preset, type: preview ? 0 : 1 }
		));
	}

	@property("Current preview preset")
	public set preview(preset: number) {
		this.activatePreset(preset, true);
	}
	public get preview() {
		return this.mPreview;
	}

	@property("Current live preset")
	public set live(preset: number) {
		this.activatePreset(preset, false);
	}
	public get live() {
		return this.mLive;
	}

	/**
	 * Send specified command, returning a promise resolved once sent.
	 */
	private send(cmd: Command): Promise<any> {
		const cmdJson = JSON.stringify(cmd);
		return this.socket.sendText(cmdJson);
	}
}

/**
 * Base class of commands sent.
 */
class Command {
	readonly id: number;		// Unique number identifying this command
	readonly jsonrpc: string;	// Always contains "2.0"
	readonly method: string		// Name of command
	readonly params:any;		// Parameter object, corresponding to command name

	static nextId = 1;

	constructor(
		method: string,		// Name of command
		params: any
	) {
		this.method = method;
		this.jsonrpc = "2.0";
		this.id = Command.nextId++;
		this.params = params;
	}
}
