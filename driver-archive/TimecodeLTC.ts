/** Blocks driver for providing time from an LTC (SMPTE or EBU) timecode source.
	The timecode must be connected to the audio input on a Linux computer, such
	as a our Linux based server image, running our 'timecode-reader' program.
	This program is located in the native directory located in the home directory
	of the pixi-server user, and must be run from there since it depends on
	other components located in the directory.

	Configure this driver with the IP address of localhost (or 127.0.0.1) if you run the
 	'timecode-reader' program om your Blocks server. If you run the program on another
 	computer then enter the IP address of that computer.

 	You must set the 'type' property of this driver to the expected type of timecode.
 	This can be done using a Task triggered on system start-up or the 'connected'
 	property of this driver (which becomes true once the 'timecode-reader' program
 	appears on the network).

 	Copyright (c) 2024 PIXILAB Technologies AB, Sweden (http://pixilab.se).
 	All Rights Reserved.
 */

import {NetworkUDP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {driver, property} from "system_lib/Metadata";
import {SGOptions} from "system/PubSub";
import {Dictionary} from "system_lib/ScriptBase";

@driver('NetworkUDP', { port: 1632, rcvPort: 1632 })
export class TimecodeLTC extends Driver<NetworkUDP> {
	private mType = "25";	// Deffault timecode type
	private mTime: TimeFlow = new TimeFlow(0, 0);
	private mSpeed = 0;
	private mVolume = 0;

	private mConnected = false;
	private lastDataTime = 0;	// Timestamp when data last received

	private settingsTimer: CancelablePromise<any>;

	public constructor(private socket: NetworkUDP) {
		super(socket);

		// Declare enumerated "type" property, and its possible values
		const typePropOpts: SGOptions = {
			type: "Enum",
			description: "Expected type of timecode",
			enumValues: [
				"24",
				"25",
				"29.97_drop",
				"29.97_nondrop",
				"30"
			]
		};
		this.property<string>("type", typePropOpts, newValue => {
			if (this.mType !== newValue && kTypeMap[newValue]) {
				this.mType = newValue;
				this.applySettingsSoon();
			}
			return this.mType;
		})

		socket.subscribe('textReceived', (emitter, message) => {
			this.dataReceived(message.text.trim());
		});

		this.applySettingsSoon();	// Apply settings initially and then auto-repeat
	}

	@property("The current time position", true)
	get time(): TimeFlow { return this.mTime; }
	set time(t: TimeFlow) { this.mTime = t; }

	@property("Playback rate, with 1 being normal", true)
	get speed(): number { return this.mSpeed; }
	set speed(value: number) { this.mSpeed = value; }

	@property("Signal volume, with 1 being 'overload'", true)
	get volume(): number { return this.mVolume; }
	set volume(value: number) { this.mVolume = value; }


	@property("Received data from peer", true)
	get connected(): boolean { return this.mConnected;}
	set connected(value: boolean) { this.mConnected = value;}

	/**
	 * Settings have changed - need to tell peer ASAP.
	 */
	private applySettingsSoon(howSoon = 100) {
		if (this.settingsTimer)
			this.settingsTimer.cancel();
		this.settingsTimer = wait(howSoon);
		this.settingsTimer.then(() => this.applySettings());
	}

	/**
	 * Apply my current settings to peer, and then repeat this every now and then
	 * since we're running on UDP, and can't know if peer goes away for a while.
	 */
	private applySettings() {
		const kinterval = 2000;	// Longest interval for updates from peer
		var settings: string = "i/" + kinterval +
			"/t/" + kTypeMap[this.mType].parName +
			"/p/" + this.socket.listenerPort +
			"/n/1/c/0";	// Frames but no timecode
		this.socket.sendText(settings);

		/*	Since this happens with some regularity, check "connection"
			status here as well. Will lag a bit, but will be
			OK within whatewver is my period time.
		 */
		if (this.getMonotonousMillis() - this.lastDataTime >= kinterval*2)
			this.connected = false;	// Long time no see

		this.applySettingsSoon(5000);	// Do this again in a bit
	}

	/**
	 * Got a new message from peer. Publish as TimeFlow
	 */
	private dataReceived(msg: string) {
		const itemPairs = msg.split('/');
		const pieceCount = itemPairs.length;
		if (pieceCount % 2 || pieceCount < 8) // must be even and hold enough data
			console.error("Invalid data from peer", msg);
		const item: Dictionary<string> = {};
		for (var ix = 0; ix < pieceCount; ix += 2)
			item[itemPairs[ix]] = itemPairs[ix + 1];

		const speedStr = item['s'];
		if (speedStr)
			this.speed = parseFloat(speedStr);

		const sigLevel = item['l'];
		if (sigLevel) {
			// This is dbFS in the range -64...0, which we normalize to 0...1
			var val = ((parseFloat(sigLevel) + 64) / 64);
			this.volume = Math.max(0, Math.min(1, val)); // Clip to 0...1
		}

		const frameNum = item['n'];
		if (frameNum) {
			const timPosMillis = Math.round(parseFloat(frameNum) / kTypeMap[this.mType].fps * 1000);
			this.time = new TimeFlow(timPosMillis, this.speed);
		}
		this.connected = true;
		this.lastDataTime = this.getMonotonousMillis();
	}
}

interface TypeInfo {
	parName: string;	// Parameter sent to peer
	fps: number;		// Expected, nominal frames per second
}

/**
 * Maps enumValues to param type, Keys must match enumValues in type property
 */
const kTypeMap: Dictionary<TypeInfo> = {
	"24": { parName: "24", fps: 24},
	"25": { parName: "25", fps: 25},
	"29.97_drop": { parName: "df", fps: 29.97},
	"29.97_nondrop": { parName: "ndf", fps: 29.97},
	"30": { parName: "30", fps: 30}
}

