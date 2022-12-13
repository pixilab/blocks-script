/**
 * Visual Production CueCore and QuadCore lighting controllers.
 * By Sheikh Amir & Greg Brown, PULSE MIDDLE EAST, www.pulse-me.com
 *
 * The driver works by sending and receiving lighting playback commands/messages.
 * Unfortunately the devices have no commands for getting initial status at this time.
 */

import { NetworkTCP } from "system/Network";
import { Driver } from "system_lib/Driver";
import * as Meta from "system_lib/Metadata";

@Meta.driver("NetworkTCP", { port: 7000 })
export class CueCoreV2 extends Driver<NetworkTCP> {
	private mConnected = false; //Connected to CueCore

	private readonly kChannels = 6;

	private mLevel1 = 0; // Output levels
	private mLevel2 = 0;
	private mLevel3 = 0;
	private mLevel4 = 0;
	private mLevel5 = 0;
	private mLevel6 = 0;

	private mRate1 = 0; // Channel fade rate (?)
	private mRate2 = 0;
	private mRate3 = 0;
	private mRate4 = 0;
	private mRate5 = 0;
	private mRate6 = 0;

	private readonly mMethods: Dictionary<string> = {};
	private readonly mObjects: Dictionary<string> = {};
	private static readonly prefix = 'core'; // Prefix for QuadCore PBs

	/**
     * Create me, attached to the network socket I communicate through. When using a
     * driver, the driver replaces the built-in functionality of the network socket
     with the properties and callable functions exposed.
    */
	public constructor(private socket: NetworkTCP) {
		//socket.setReceiveFraming(`${VPCueCoreV2.prefix}-`); // core-
		super(socket);

		for (let i=1; i <= this.kChannels; i++) {
			this.mMethods[`pb-${i}-intensity`] = `PB0${i}Level`;
			this.mObjects[`pb-${i}-intensity`] = `mLevel${i}`;
			this.mMethods[`pb-${i}-rate`] = `PB0${i}Rate`;
			this.mObjects[`pb-${i}-rate`] = `mRate${i}`;
		}

		socket.subscribe("connect", (sender, message) => {
			// console.info("connect msg", message.type);
			this.connectStateChanged();
		});
		socket.subscribe("bytesReceived", (sender, msg) =>
			this.bytesReceived(msg.rawData)
		);
		socket.autoConnect(true); // Use automatic connection mechanism
		this.mConnected = socket.connected;
	}

	@Meta.property("Connected to CueCore", true)
	public set connected(online: boolean) {
		this.mConnected = online;
	}
	public get connected(): boolean {
		return this.mConnected;
	}

	/**
	 * PLAYBACK LEVELS
	 */
	@Meta.property("PB01 Level")
	@Meta.min(0)
	@Meta.max(1)
	public set PB01Level(level: number) {
		this.tell("core-pb-1-intensity=" + level);
		this.mLevel1 = level;
	}
	public get PB01Level() {
		return this.mLevel1;
	}

	@Meta.property("PB02 Level")
	@Meta.min(0)
	@Meta.max(1)
	public set PB02Level(level: number) {
		this.tell("core-pb-2-intensity=" + level);
		this.mLevel2 = level;
	}
	public get PB02Level() {
		return this.mLevel2;
	}

	@Meta.property("PB03 Level")
	@Meta.min(0)
	@Meta.max(1)
	public set PB03Level(level: number) {
		this.tell("core-pb-3-intensity=" + level);
		this.mLevel3 = level;
	}
	public get PB03Level() {
		return this.mLevel3;
	}

	@Meta.property("PB04 Level")
	@Meta.min(0)
	@Meta.max(1)
	public set PB04Level(level: number) {
		this.tell("core-pb-4-intensity=" + level);
		this.mLevel4 = level;
	}
	public get PB04Level() {
		return this.mLevel4;
	}

	@Meta.property("PB05 Level")
	@Meta.min(0)
	@Meta.max(1)
	public set PB05Level(level: number) {
		this.tell("core-pb-5-intensity=" + level);
		this.mLevel5 = level;
	}
	public get PB05Level() {
		return this.mLevel5;
	}

	@Meta.property("PB06 Level")
	@Meta.min(0)
	@Meta.max(1)
	public set PB06Level(level: number) {
		this.tell("core-pb-6-intensity=" + level);
		this.mLevel6 = level;
	}
	public get PB06Level() {
		return this.mLevel6;
	}

	/**
	 * PLAYBACK Rates
	 */
	@Meta.property("PB01 Rate")
	@Meta.min(-1)
	@Meta.max(1)
	public set PB01Rate(level: number) {
		this.tell("core-pb-1-rate=" + level);
		this.mRate1 = level;
	}
	public get PB01Rate() {
		return this.mRate1;
	}

	@Meta.property("PB02 Rate")
	@Meta.min(-1)
	@Meta.max(1)
	public set PB02Rate(level: number) {
		this.tell("core-pb-2-rate=" + level);
		this.mRate2 = level;
	}
	public get PB02Rate() {
		return this.mRate2;
	}

	@Meta.property("PB03 Rate")
	@Meta.min(-1)
	@Meta.max(1)
	public set PB03Rate(level: number) {
		this.tell("core-pb-3-rate=" + level);
		this.mRate3 = level;
	}
	public get PB03Rate() {
		return this.mRate3;
	}

	@Meta.property("PB04 Rate")
	@Meta.min(-1)
	@Meta.max(1)
	public set PB04Rate(level: number) {
		this.tell("core-pb-4-rate=" + level);
		this.mRate4 = level;
	}
	public get PB04Rate() {
		return this.mRate4;
	}

	@Meta.property("PB05 Rate")
	@Meta.min(-1)
	@Meta.max(1)
	public set PB05Rate(level: number) {
		this.tell("core-pb-5-rate=" + level);
		this.mRate5 = level;
	}
	public get PB05Rate() {
		return this.mRate5;
	}

	@Meta.property("PB06 Rate")
	@Meta.min(-1)
	@Meta.max(1)
	public set PB06Rate(level: number) {
		this.tell("core-pb-6-rate=" + level);
		this.mRate6 = level;
	}
	public get PB06Rate() {
		return this.mRate6;
	}

	/**	Connection state changed. Called as a result of the
    	'connect' subscription done in the constructor.
    */
	private connectStateChanged() {
		// console.info("connectStateChanged", this.socket.connected);
		this.connected = this.socket.connected; // Propagate state to clients
	}

	private tell(data: string) {
		// console.info('tell', data);
		this.socket.sendText(data);
	}

	// Cnverts bytes into string
	toString(bytes: number[]): string {
		let result = '';
		for (let i = 0; i < bytes.length; ++i) {
			const byte = bytes[i];
			const text = byte.toString(16);
			result += (byte < 16 ? '%0' : '%') + text;
		}
		return decodeURIComponent(result);
	}

	// A regex for parsing replies from QuadCore
	private static readonly kReplyParser = /(.*)=([+-]?([0-9]*[.])?[0-9]+)/;

	/**	Got data from device. Update status accordingly.
    */
	private bytesReceived(rawData: number[]) {
		// Convert raw data from device into string
		let text = this.toString(rawData).replace(`${CueCoreV2.prefix}-`, '');
		// console.info("bytesReceived", text);
		const pieces: any = CueCoreV2.kReplyParser.exec(text);
		// console.info("bytesReceived:", pieces[2]);
		if (pieces && pieces.length > 3) {
			const method = this.mMethods[pieces[1]];
			const object = this.mObjects[pieces[1]];
			const value = pieces[2] * 1;
			// console.log('START-EVAL');
			if (this.mLevel1 !== value) {
				// console.info("EVAL:", eval(`this.${method}`));
				// Change the value using a somewhat hackish method
				eval(`this.${object}=${value}`);
				this.changed(method);
			}
		} else
			console.warn("Unexpected data", text);
	}
}

// A simple typed dictionary type, using a string as key
interface Dictionary<TElem> {
	[id: string]: TElem;
}
