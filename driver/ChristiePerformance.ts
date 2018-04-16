/*
 * Copyright (c) 2018 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */
import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import * as Meta from "system_lib/Metadata";

/*
 Manage a Christie PERFORMANCE display, accessed through a provided
 NetworkTCP connection.
 */
@Meta.driver('NetworkTCP', { port: 5000 })
export class ChristiePerformance extends Driver<NetworkTCP> {
	private static kMinInput = 1;		// Allowable input range
	private static kMaxInput = 16;

	private powerState: boolean;
	private inputNum: number;

	private poweringUp: Promise<void>;	// Set while waiting to be powered up
	private powerUpResolver: (value?: any) => void;

	constructor(private socket: NetworkTCP) {
		super(socket);
		socket.enableWakeOnLAN();
		socket.autoConnect(true);

		socket.subscribe('connect', (sender, message)=> {
			// console.info('connect msg', message.type);
			this.connectStateChanged()
		});
		socket.subscribe('bytesReceived', (sender, msg)=>
			this.bytesReceived(msg.rawData)
		);
	}

	/**
	 * Allow clients to check for my type, just as in some system object classes
	 */
	public isOfTypeName(typeName: string) {
		return typeName === "ChristiePerformance" ? this : null;
	}

	private connectStateChanged() {
		if (this.socket.connected) {
			if (this.powerUpResolver) {
				// Consider powered SOON, but not immediately - display is SLOOOW!
				this.powerUpResolver(wait(15000));
				this.poweringUp.then(()=>
					this.nowPowered()
				);
				delete this.powerUpResolver;
				delete this.poweringUp;
			} else
				this.nowPowered();
		}
		// console.log("connected", this.socket.connected);
	}

	private nowPowered() {
		if (this.powerState === undefined)	// Never set
			this.powerState = true;		// Consider power to be on now

		if (!this.powerState)	// I'm supposed to be OFF
			this.powerDown();
		else {
			if (this.inputNum !== undefined)
				this.input = this.inputNum;	// Enforce selected input
			else {
				const cmd = this.makeCmd(0xAD);	// Query input state
				this.appendChecksum(cmd);
				this.socket.sendBytes(cmd);
			}
		}
	}

	/**
	 * Got some bytes from display. Look out for reply to "Query input state"
	 * command sent when connected above with no desired input specified, in
	 * which case it makes sense to pull the input from the device instead.
	 *
	 * ToDo: Not finished yet, and the docs is unclear/wrong on the input
	 * numbers. Later...
	 */
	private bytesReceived(data: number[]) {
		var sd = "";
		for (var n of data)
			sd += n.toString() + ' ';
		// console.log("bytesReceived", data.length, sd);
	}

	/**
	 Turn power on/off. Turning off is instant. Turning on takes quite a
	 while, and is implemented through WoL, since the stupid display
	 turns off its network interface when switched off, even though
	 the manual describes a command to turn it on. Go figure...

	 As an alternative to setting power to true, call powerUp()
	 and await its returned promise.
	 */
	@Meta.property("Power on/off")
	public set power(on: boolean) {
		if (this.powerState != on) {
			this.powerState = on;
			if (on)
				this.powerUp2();	// This takes a while
			else 	// Tell display to power down
				this.powerDown();
		}
		// console.log("Sent", cmd);
	}
	/**
	 Get current power state, if known, else undefined.
	 */
	public get power(): boolean {
		return this.powerState;
	}

	/**
	 * Power up using wake-on-LAN. Returned promise resolved
	 * once connected.
	 */
	@Meta.callable("Power up using wake-on-LAN")
	public powerUp(): Promise<void> {
		if (!this.powerState) {
			this.powerState = true;		// Indicates desired state
			this.changed('power');
		}
		return this.powerUp2();
	}

	/**
	 * Send wake-on-LAN, unless one is already in progress.
	 * Return promise resolved once powered up.
	 */
	private powerUp2(): Promise<void> {
		if (!this.poweringUp) {
			this.socket.wakeOnLAN();
			this.poweringUp = new Promise<void>((resolver, rejector)=> {
				this.powerUpResolver = resolver;
				wait(40000).then(()=> {
					rejector("Timeout");
					delete this.poweringUp;
					delete this.powerUpResolver;
				});
			});
		}
		return this.poweringUp;
	}

	// Send command to turn power off
	private powerDown() {
		const cmd = this.makeCmd(0x18);
		cmd.push(1);
		this.appendChecksum(cmd);
		this.socket.sendBytes(cmd);
	}

	/*
	 Set desired input source.
	 */
	@Meta.property("Desired input source number")
	@Meta.min(ChristiePerformance.kMinInput) @Meta.max(ChristiePerformance.kMaxInput)
	public set input(value: number) {
		this.inputNum = value;
		const cmd = this.makeCmd(0xAC);
		cmd.push(value);
		cmd.push(1);
		this.appendChecksum(cmd);
		this.socket.sendBytes(cmd);
		// console.log("Input", value);
	}

	/*
	 Get current input, if known, else undefined.
	 */
	public get input(): number {
		return this.inputNum;
	}

	private static kLengthIx = 5;

	private makeCmd(cmd: number) {
		const cmdBuf: number[] = [];
		// Byte kLengthIx is length of remaining Metadata
		cmdBuf.push(0xa6, 1, 0, 0, 0, 0, 1, cmd);
		return cmdBuf;
	}

	private appendChecksum(cmdBuf: number[]) {
		var checksum = 0;
		cmdBuf[ChristiePerformance.kLengthIx] = cmdBuf.length + 1
			- ChristiePerformance.kLengthIx;
		for (var byte of cmdBuf)
			checksum ^= byte;
		cmdBuf.push(checksum);
	}

}
