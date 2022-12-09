/*
	Basic driver for Kramer 3000 series switches.

 	Copyright (c) 2020 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */


import {Driver} from "../system_lib/Driver";
import {NetworkTCP} from "../system/Network";
import * as Meta from "../system_lib/Metadata";

@Meta.driver('NetworkTCP', { port: 5000 })
export class Kramer3000 extends Driver<NetworkTCP> {
	private destinations: SwitchDest[];	// All my destinations, indexed 0...kNumDests-1

	static kNumDests = 8;	// Number of destinations handled by me
	static kNumSources = 64;	// Potential number of inputs that can be routed to a dest

	static kFeedbackParser = /~\d+@(.+) (\d+),(\d+),(\d+)/;

	public constructor(public socket: NetworkTCP) {
		super(socket);
		socket.autoConnect();

		socket.subscribe('connect', sender => {
			if (sender.connected)
				this.initialPoll();
		});

		socket.subscribe('textReceived', (sender, message) =>
			this.handleFeedback(message.text)
		);

		this.destinations = [];
		for (var destIx = 0; destIx < Kramer3000.kNumDests; ++destIx)
			this.destinations.push(new SwitchDest(this, destIx+1));
	}

	/**
	 * Request initial status from switch. Done on connection etablished.
	 */
	private initialPoll() {
		var compositePollMsg: string;
		for (var destIx = 0; destIx < Kramer3000.kNumDests; ++destIx) {
			if (!compositePollMsg)
				compositePollMsg = '#';		// Composite command lead-in
			else
				compositePollMsg += '|';	// Command separator
			compositePollMsg += this.destinations[destIx].getPollCommand();
		}
		this.socket.sendText(compositePollMsg);
	}

	/**
	 * Handle feedback arraiving frmo the device
	 */
	private handleFeedback(msg: string) {
		// console.log("Feedback", msg);
		const parseResult = Kramer3000.kFeedbackParser.exec(msg);
		// Currently only looking for something like "~01@ROUTE 1,1,2"
		if (parseResult && parseResult.length >= 5) {
			if (parseResult[1] === 'ROUTE') {
				const destIndex = parseInt(parseResult[3]);	// 1-based!
				if (!isNaN(destIndex) && destIndex > 0 && destIndex <= Kramer3000.kNumDests) {
					const sourceIndex = parseInt(parseResult[4]);	// 1-based!
					if (!isNaN(sourceIndex) && sourceIndex > 0 && sourceIndex <= Kramer3000.kNumSources) {
						this.destinations[destIndex-1].takeFeedback(sourceIndex);
					}
				}
			}
		}
	}
}

/**
 * Manage a single switcher destination (output), including its property.
 */
class SwitchDest {
	private readonly srcPropName: string;
	private mSource: number = 0;	// Until we know better (to never return undefined)

	constructor(
		private driver: Kramer3000,
		private index: number	// 1-based output number to be managed by me
	) {
		this.srcPropName = "Dest" + index + "Source";
		driver.property<number>(this.srcPropName, {
			type: Number,
			description: "The source number of this destination",
			min: 1,
			max: Kramer3000.kNumSources
		}, (source: number) => {
			if (source !== undefined) {
				if (this.mSource !== source) {
					this.mSource = source;
					driver.socket.sendText('#ROUTE 1,' + this.index + ',' + source);
				}
			}
			return this.mSource;
		});
	}

	/**
	 * Get command to poll the current src of this dest (excluding the leading #)
	 */
	getPollCommand(): string {
		return 'ROUTE? 1,' + this.index;
	}

	takeFeedback(source: number) {
		if (this.mSource !== source) {
			this.mSource = source;
			this.driver.changed(this.srcPropName);
			// console.log("Feedback changed", this.srcPropName, 'to', source);
		}
	}
}
