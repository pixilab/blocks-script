/*
 * Copyright (c) 2018 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import * as Meta from "system_lib/Metadata";


@Meta.driver('NetworkTCP', { port: 4999 })
export class CloudDCM1e extends Driver<NetworkTCP> {
	zones: Zone[];
	private static kZones = 8;
	private requestQueue: Request[];	// Fifo of requests waiting to be sent
	private keepAliveTimer: CancelablePromise<void>;	// To send something every now and then to keep connection up

	/**
	 * Create me, attached to the network socket I communicate through. When using a
	 * driver, the driver replaces the built-in functionality of the network socket
	 with the properties and callable functions exposed.
	 */
	public constructor(private socket: NetworkTCP) {
		super(socket);
		this.requestQueue = [];

		this.zones = [];
		for (var zix = 1; zix <= CloudDCM1e.kZones; ++zix)
			this.zones.push(new Zone(this, zix));

		socket.subscribe('connect', (sender, message)=> {
			this.connectStateChanged(message);
		});

		socket.subscribe('textReceived', (sender, msg)=>
			this.textReceived(msg.text)
		);

		socket.setReceiveFraming("/>", true);
		socket.autoConnect();	// Use automatic connection
		console.info("Driver initialized");
	}

	/**
	 * If just connected, fetch the current state of the mixer.
	 */
	private connectStateChanged(message: any) {
		if (message.type === 'Connection') {
			if (this.socket.connected) {
				for (var zone of this.zones)
					zone.poll();
			} else
				console.warn("Connection dropped unexpectedly");
		}
	}

	private textReceived(text: string) {
		const req = this.requestQueue[0];
		if (text.indexOf('<!') >= 0)
			console.warn("Error from peer", text);
		if (req)
			req.considerReply(text);
		else
			console.warn("Spurious data", text);
	}

	@Meta.property("Zone source") @Meta.min(1) @Meta.max(8)
	public set zoneIn1(input: number) {
		this.zones[0].setInput(input);
	}
	public get zoneIn1(): number {
		return this.zones[0].input;
	}

	@Meta.property("Zone source") @Meta.min(1) @Meta.max(8)
	public set zoneIn2(input: number) {
		this.zones[1].setInput(input);
	}
	public get zoneIn2(): number {
		return this.zones[1].input;
	}

	@Meta.property("Zone source") @Meta.min(1) @Meta.max(8)
	public set zoneIn3(input: number) {
		this.zones[2].setInput(input);
	}
	public get zoneIn3(): number {
		return this.zones[2].input;
	}

	@Meta.property("Zone source") @Meta.min(1) @Meta.max(8)
	public set zoneIn4(input: number) {
		this.zones[3].setInput(input);
	}
	public get zoneIn4(): number {
		return this.zones[3].input;
	}


	@Meta.property("Zone source") @Meta.min(1) @Meta.max(8)
	public set zoneIn5(input: number) {
		this.zones[4].setInput(input);
	}
	public get zoneIn5(): number {
		return this.zones[4].input;
	}

	@Meta.property("Zone source") @Meta.min(1) @Meta.min(8)
	public set zoneIn6(input: number) {
		this.zones[5].setInput(input);
	}
	public get zoneIn6(): number {
		return this.zones[5].input;
	}

	@Meta.property("Zone source") @Meta.min(1) @Meta.max(8)
	public set zoneIn7(input: number) {
		this.zones[6].setInput(input);
	}
	public get zoneIn7(): number {
		return this.zones[6].input;
	}

	@Meta.property("Zone source") @Meta.min(1) @Meta.max(8)
	public set zoneIn8(input: number) {
		this.zones[7].setInput(input);
	}
	public get zoneIn8(): number {
		return this.zones[7].input;
	}

	@Meta.property("Zone volume") @Meta.min(0) @Meta.max(1)
	public set zoneVolume1(volume: number) {
		this.zones[0].setVolume(volume);
	}
	public get zoneVolume1(): number {
		return this.zones[0].volume;
	}

	@Meta.property("Zone volume") @Meta.min(0) @Meta.max(1)
	public set zoneVolume2(volume: number) {
		this.zones[1].setVolume(volume);
	}
	public get zoneVolume2(): number {
		return this.zones[1].volume;
	}

	@Meta.property("Zone volume") @Meta.min(0) @Meta.max(1)
	public set zoneVolume3(volume: number) {
		this.zones[2].setVolume(volume);
	}
	public get zoneVolume3(): number {
		return this.zones[2].volume;
	}

	@Meta.property("Zone volume") @Meta.min(0) @Meta.max(1)
	public set zoneVolume4(volume: number) {
		this.zones[3].setVolume(volume);
	}
	public get zoneVolume4(): number {
		return this.zones[3].volume;
	}

	@Meta.property("Zone volume") @Meta.min(0) @Meta.max(1)
	public set zoneVolume5(volume: number) {
		this.zones[4].setVolume(volume);
	}
	public get zoneVolume5(): number {
		return this.zones[4].volume;
	}

	@Meta.property("Zone volume") @Meta.min(0) @Meta.max(1)
	public set zoneVolume6(volume: number) {
		this.zones[5].setVolume(volume);
	}
	public get zoneVolume6(): number {
		return this.zones[5].volume;
	}

	@Meta.property("Zone volume") @Meta.min(0) @Meta.max(1)
	public set zoneVolume7(volume: number) {
		this.zones[6].setVolume(volume);
	}
	public get zoneVolume7(): number {
		return this.zones[6].volume;
	}

	@Meta.property("Zone volume") @Meta.min(0) @Meta.max(1)
	public set zoneVolume8(volume: number) {
		this.zones[7].setVolume(volume);
	}
	public get zoneVolume8(): number {
		return this.zones[7].volume;
	}


	/**
	 * Send request, await response matching responsePattern, extract
	 * the first group of data from the response and resolve returned
	 * promise, or reject promise if got non-matching data or timeout.
	 */
	sendRequest(request: string, responsePattern: RegExp): Request {
		const req = new Request(request, responsePattern);
		this.requestQueue.push(req);
		if (this.requestQueue.length === 1)
			this.sendNextRequest();
		// Else will be sent automatically when pending one finished
		return req;
	}

	/*	Get the request at the head of the queue and send it. Wait for it to finish,
		then remove it from queue and proceed with next, if any.
	 */
	private sendNextRequest() {
		if (this.keepAliveTimer) {
			this.keepAliveTimer.cancel();
			delete this.keepAliveTimer;
		}
		const req = this.requestQueue[0];
		req.perform(this.socket).finally(()=> {
			this.requestQueue.shift();
			if (this.requestQueue.length)
				this.sendNextRequest();
			else {
				/*	Nothing to send. Make sure we send SOMETHING
					every now and then to keep connection open,
					as the device otherwise has a tendency to
					shut it down, without telling us until
					next time we try to send something.
				 */
				this.keepAliveTimer = wait(20000);
				this.keepAliveTimer.then(()=> {
					delete this.keepAliveTimer;
					// console.log("Keep alive");
					this.sendRequest("<Z" + 1 + ".MU,SQ/>", Zone.kInputPattern);
				});
			}
			// Else I will be called explicitly when new request queued
		});
	}
}



/**
 * A single request with its expected reply.
 */
class Request {
	private command: string;
	private responsePattern: RegExp;
	private resolver: (value?: string)=>void;
	private rejector: (error?: any)=> void;
	private waiter: CancelablePromise<void>;

	sent: boolean;	// Set once request sent (may not yet be finished)
	reply: Promise<string>;

	constructor(request: string, responsePattern: RegExp) {
		this.command = request;
		this.responsePattern = responsePattern;
		this.reply = new Promise<string>((resolver, rejector) => {
			this.resolver = resolver;
			this.rejector = rejector;
		});
	}

	/**
	 * Revise this request. Can be used to change its data payload as long as it isn't yet sent.
	 * Only use this to revise the request with a new command of the same kind; e.g., to
	 * revise the volume level in a "set volume" command.
	 */
	reviseRequest(newToSend: string) {
		this.command = newToSend;
	}

	perform(socket: NetworkTCP): Promise<string> {
		this.sent = true;
		socket.sendText(this.command, '\r\n');
		// console.log("Sent", this.command);
		this.waiter = wait(500);
		this.waiter.then(()=> {
			this.rejector("Timeout");
			console.warn("Command timed out", this.command);
		});
		return this.reply;
	}

	/*	Look at reply, resolving me if the expected one, else rejecting me.
	 */
	considerReply(reply: string) {
		if (this.waiter)
			this.waiter.cancel();
		delete this.waiter;
		const result = this.responsePattern.exec(reply);
		if (result && result.length > 1)
			this.resolver(result[1]);
		else
			this.rejector("Invalid reply " + reply);
	}
}

class Zone {
	static kInputPattern = /<z\d\.mu,s=(.*)\/>/;
	static kVolumePattern = /<z\d\.mu,l=(.*)\/>/;
	private static kMinVol = 62;	// Max volume attenuation (-62 == "mute")

	private owner: CloudDCM1e;
	private kZone: number; // Number of this zone 1...8

	input: number;	// Current input selection 1...8
	volume: number; // Current volume level 0...1

	private lastVolRequest: Request;

	constructor(owner: CloudDCM1e, zoneNum: number) {
		this.owner = owner;
		this.kZone = zoneNum;
		// Deliberately leave input, volume undefined to pick up through poll
	}

	/**
	 * Set volume level, also sending command to device.
 	 */
	setVolume(volume: number) {
	 	this.volume = volume;
	 	volume = Math.round((1 - volume) * Zone.kMinVol);
	 	const request = "<Z" + this.kZone + ".MU,L" + volume + "/>";
	 	// Don't queue new request if most recent one isn't sent yet
	 	if (this.lastVolRequest && !this.lastVolRequest.sent)
			this.lastVolRequest.reviseRequest(request); // Just update its payload
	 	else
			this.lastVolRequest = this.owner.sendRequest(request, Zone.kVolumePattern);
	}

	setInput(input: number) {
		this.input = input;
		this.owner.sendRequest("<Z" + this.kZone + ".MU,S" + input + "/>", Zone.kInputPattern);
	}

	/*	Poll status of this zone, updating my properties when data arrives.
		Will ONLY poll for properties that haven't yet been set (e.g., done
		at start-up only, not when connection lost and later re-connected).
		<Z1.MU,SQ/> -> <z1.mu,s=5/>
		<Z1.MU,LQ/> -> <z1.mu,l=23/>
	 */
	poll(): void {
		if (this.input === undefined) {	// Don't ask if already known
			this.owner.sendRequest("<Z" + this.kZone + ".MU,SQ/>", Zone.kInputPattern)
			.reply.then(result => {
				const value = parseInt(result);
				if (value >= 1 && value <= 8 && this.input === undefined) {
					this.input = value;
					this.owner.changed("zoneIn" + this.kZone);
				}
			});
		}
		if (this.volume === undefined) {
			this.owner.sendRequest("<Z" + this.kZone + ".MU,LQ/>", Zone.kVolumePattern)
			.reply.then(result => {
				const value = (result === 'mute') ? 62 : parseInt(result);
				if (value >= 0 && value <= Zone.kMinVol && this.volume === undefined) {
					this.volume = 1 - value / Zone.kMinVol;
					this.owner.changed("zoneVolume" + this.kZone);
				}
			});
		}
	}
}

// A simple typed dictionary type, using a string as key
export interface Dictionary<TElem> {
	[id: string]: TElem;
}
