import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {callable, driver, parameter} from "system_lib/Metadata";

/**	A very basic HelvarNet driver mainly for recalling DALI scenes
	and possibly controlling some other misc functions.
*/
@driver('NetworkTCP', { port: 50000 })
export class HelvarNet extends Driver<NetworkTCP> {

	public constructor(private socket: NetworkTCP) {
		super(socket);
		socket.autoConnect();
	}

	@callable("Recall scene number on group")
	public recallScene(
		@parameter("Group to control") group: number,
		@parameter("Scene number to recall") scene: number,
		@parameter("Scene block", true) block?: number,
		@parameter("Transition time, in seconds", true) fadeTime?: number
	) {
		if (block === undefined)
			block = 1;
		const cmd = "V:1,C:11,G:" + group
			+ ",B:" + block
			+ ",S:" + scene
			+ fadeParam(fadeTime);
		this.sendCmd(cmd);
	}

	@callable("Adjust curr scene of group up or down")
	public sceneAbsAdjust(
		@parameter("Proportion, -1..1") proportion: number,
		@parameter("Group to control, 1..16383") group: number,
		@parameter("Transition time, in seconds", true) fadeTime?: number
	) {
		const propStr = Math.round(proportion * 100).toString();
		const cmd = "V:1,C:15,P:" + propStr
			+ ",G:" + group
			+ fadeParam(fadeTime);
		this.sendCmd(cmd);
	}

	@callable("Adjust curr scene of group up or down incrementally")
	public sceneRelAdjust(
		@parameter("Proportion, -1..1") proportion: number,
		@parameter("Group to control, 1..16383") group: number,
		@parameter("Transition time, in seconds", true) fadeTime?: number
	) {
		const propStr = Math.round(proportion * 100).toString();
		const cmd = "V:1,C:17,P:" + propStr
			+ ",G:" + group
			+ fadeParam(fadeTime);
		this.sendCmd(cmd);
	}

	@callable("Apply brightness level to a single device")
	public levelToDevice(
		@parameter("Brightness, 0..1") level: number,
		@parameter("Target device, as '1.2.3.4'") address: string,
		@parameter("Transition time, in seconds", true) fadeTime?: number

	) {
		const levelStr = Math.round(level * 100).toString();
		const cmd = "V:1,C:14,L:" + levelStr + ",@" + address + fadeParam(fadeTime);
		this.sendCmd(cmd);
	}

	/**
	 * Frame the command with leading > and trailing #.
	 */
	private sendCmd(cmd: string) {
		cmd = '>' + cmd + '#';
		// console.warn("DALI", cmd);
		this.socket.sendText(cmd, null);
	}
}

/**
 * Convert a fade time in seconds to a centisecond string prefixed by ",F:"
 * ready to be appended to a command.
 */
function fadeParam(timeInSeconds: number): string {
	if (timeInSeconds === undefined)
		timeInSeconds = 0;
	return ",F:" + Math.round(timeInSeconds * 100).toString();
}