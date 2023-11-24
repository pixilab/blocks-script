/*	Receive "timecode" from external system over UDP. Originally devised to receive
	time data from Medialon, exposing this as a time property that can be used
	to synchronize playback of content in Blocks, such as subtitles.

	Accepts time data in the form "HHMMSSFF R", where FF is assumed to be 30fps and R is
	the current rate of motion (typically 0 for stationary or 1 for moving at 1 second
	per second). Send such a packet whennever playback starts/stops and on a regular
	of no more thamn once every few seconds in between.

	Copyright (c) 2023 PIXILAB Technologies AB, Sweden (http://pixilab.se).
	All Rights Reserved.
 */


import {driver, property} from "system_lib/Metadata";
import {Driver} from "system_lib/Driver";
import {NetworkUDP} from "system/Network";

@driver('NetworkUDP', { rcvPort: 9898 })
export class UDPTimecode extends Driver<NetworkUDP> {
	private static FRAMERATE = 30;

	private mTime: TimeFlow;	// Backing store for my time property

	public constructor(private socket: NetworkUDP) {
		super(socket);
		this.mTime = new TimeFlow(0, 0);
		socket.subscribe('textReceived', (sender, message) => {
			this.timeData(message.text);
		});
	}

	@property("Time received from external system")
	public get time(): TimeFlow {
		return this.mTime;
	}

	/*
	 * Process time data in the form described in block comment at top of this file.
	 */
	private timeData(rawTime: string) {
		// console.log("rawTime", rawTime);
		rawTime = rawTime.trim();	// Get rid of any trailing CR/LF or other unwanted data
		const parts = rawTime.trim().split(' ');
		if (parts.length === 2 && parts[0].length === 8) {
			try {
				const rateStr = parts[1];
				const rate = parseFloat(rateStr);
				if (isNaN(rate) || rate < 0 || rate > 2)
					throw "Invalid rate: " + rateStr;
				const ms = UDPTimecode.timecodeToMillis(parts[0]);
				const newTime = new TimeFlow(ms, rate);
				if (newTime.rate !== this.mTime.rate || newTime.position !== this.mTime.position) {
					this.mTime = newTime;
					this.changed('time');	// Notifies others time property changed
				}
			} catch (error) {
				console.error(error, "for source data", rawTime);
			}
		} else
			console.warn("Expected 'HHMMSSFF R', but got", rawTime);
	}

	/**
	 * Convert time in the form "HHMMSSFF" to the corresponding straight time position in mS.
	 */
	private static timecodeToMillis(tc: string) {
		const ms =
			UDPTimecode.getTwoDigits(tc, 0) * TimeFlow.Hour +
			UDPTimecode.getTwoDigits(tc, 2) * TimeFlow.Minute +
			UDPTimecode.getTwoDigits(tc, 4) * TimeFlow.Second +
			UDPTimecode.getTwoDigits(tc, 6) * (TimeFlow.Second / UDPTimecode.FRAMERATE);
		return ms;
	}

	/**
	 * Get two digits at offs in src, returned as an integer.
	 */
	private static getTwoDigits(src: string, offs: number): number {
		const digits = src.substring(offs, offs+2);
		const num = parseInt(digits);
		if (isNaN(num) || digits.length !== 2)
			throw "Invalid two digit number: " + digits;
		return num;
	}
}
