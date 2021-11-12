/*
	Basic KNXNet-IP driver.
	Loosely based on documentation found here: http://www.eb-systeme.de/?page_id=479

 	Copyright (c) 2020 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {callable, parameter, driver, property} from "system_lib/Metadata";
import {Driver} from "system_lib/Driver";
import {NetworkUDP} from "system/Network";
import {SimpleFile} from "system/SimpleFile";

const enum State {
	DISCONNECTED,	// Initial (virgin) state
	CONNECTING,
	CONNECTIONSTATE_REQUESTED,	// Have received CONNECT_RESPONSE, and sent CONNECTIONSTATE_REQUEST
	CONNECTED_IDLE,		// Have received CONNECTIONSTATE_RESPONSE and is just idle not doing anything for now
	TUNNELING,		// Have sent TUNNELLING_REQUEST, awaiting TUNNEL_RESPONSE
	DISCONNECTING	// Have sent DISCONNECT_REQUEST
}

const enum Command {
	SEARCH_REQUEST = 0x0201,
	SEARCH_RESPONSE = 0x0202,
	DESCRIPTION_REQUEST = 0x0203,
	DESCRIPTION_RESPONSE = 0x0204,
	CONNECTION_REQUEST = 0x0205,
	CONNECTION_RESPONSE = 0x0206,
	CONNECTIONSTATE_REQUEST = 0x0207,
	CONNECTIONSTATE_RESPONSE = 0x0208,
	DISCONNECT_REQUEST = 0x0209,
	DISCONNECT_RESPONSE = 0x020A,
	TUNNEL_REQUEST = 0x0420,
	TUNNEL_RESPONSE = 0x0421,
	DEVICE_CONFIGURATION_REQUEST = 0x0310,
	DEVICE_CONFIGURATION_ACK = 0x0311,
	ROUTING_INDICATION = 0x0530
}

interface QueuedCommand {
	handler: (cmd: QueuedCommand) => void;
	seqId?: number;	// Assigned once sent, to verify in ack
}

interface AddressedCmd extends QueuedCommand {
	destAddr: number; 	// What's returned by calcAddr
}

interface OnOffCmd extends AddressedCmd {
	on: boolean;
}

interface NumberCmd extends AddressedCmd {
	num: number;
}

/**
 * Definitions for what's in my configuration file.
 */
interface IBaseProp {
	addr: number[];		// KNX bus address to send to (must be 3 values)
	description?: string;
}
interface IAnalog extends IBaseProp {
	name: string;	// Name property will be published under
	type?: '5.001';	// KNX value type, to support other flavors (5.001 is default)
}
interface IDigital extends IBaseProp {
	name: string;	// Name property will be published under
	type?: '1.xxx';	// KNX value type, to support other flavors (1.xxx is default)
}

/**
 * Structure of config file, if any. Assumed to be stored under
 * script/files/KNXNetIP/<device-name>, where <device-name> is the
 * name of the network device under Manage in Blocks.
 */
interface IConfig {
	analog?: IAnalog[];		// Analog properties
	digital?: IDigital[];	// On/off properties
}

@driver('NetworkUDP', { port: 3671, rcvPort:32331 })
export class KNXNetIP extends Driver<NetworkUDP> {
	private state: State = State.DISCONNECTED;	// Update ONLY through setState
	private channelId: number;	// Once received in CONNECT_RESPONSE
	private seqCount = 0;		// Tunneling command equence (incremented for each)
	private mConnected = false;
	private cmdQueue: QueuedCommand[] = [];
	private timer?: CancelablePromise<void>;	// Set if have pending timer to checkStateSoon
	private errCount = 0;		// To rereset connection after "too many errors"
	private dynProps: DynProp[] = [];
	private connTimeoutWarned = false;	// To not nag on failed connection attempts

	public constructor(private socket: NetworkUDP) {
		super(socket);
		if (!this.socket.listenerPort)
			throw "Listening port not specified (e.g, 32331)"

		socket.subscribe('bytesReceived', (sender, message) => {
			// console.log("bytesReceived", message.rawData.length);
			try {
				this.processReply(message.rawData);
				this.errCount = 0;
			} catch (error) {
				console.error(error);
				// Reset state after "too many errors"
				if (++this.errCount > 5) {
					this.errCount = 0;
					this.setState(State.DISCONNECTED);
					this.checkStateSoon();
				}
			}
		});

		this.loadConfig();

		this.checkStateSoon(5);
	}

	/**
	 * Load my configuration data, if any, setting up dynamic properties accordingly.
	 */
	private loadConfig() {
		const configFile = 'KNXNetIP/' + this.socket.name + '.json';

		SimpleFile.exists(configFile).then(existence => {
			if (existence === 1)	// Exists and is a plain file
				SimpleFile.readJson(configFile).then(data => this.processConfig(data));
			else
				console.log('No configuration file "' + configFile + '" - providing only generic functionality');
		});
	}

	private processConfig(config: IConfig) {
		if (config.analog) {
			for (const analog of config.analog) {	// Define one analog property per entry
				if (!analog.type || analog.type === "5.001") // Only type we know of for now
					this.dynProps.push(new AnalogProp(this, analog));
				else
					console.warn("Unsupported analog type", analog.type);
			}
		}
		if (config.digital) {
			for (const digital of config.digital) {	// Define one analog property per entry
				if (!digital.type || digital.type.charAt(0) === "1") // Only type we know of for now
					this.dynProps.push(new DigitalProp(this, digital));
				else
					console.warn("Unsupported digital type", digital.type);
			}
		}

	}

	@property("Connection established", true)
	get connected(): boolean {
		return this.mConnected;
	}
	set connected(value: boolean) {
		this.mConnected = value;
	}

	/**
	 * Hook up a timer to check my state and move me forward "soon" (in mS).
	 */
	private checkStateSoon(howSoon = 5000) {
		if (this.timer)
			this.timer.cancel();	// Kill any pre-existing timeout

		this.timer = wait(howSoon);
		this.timer.then(() => {
			this.timer = undefined;	// Now taken
			switch (this.state) {
			case State.DISCONNECTED:
				if (this.socket.enabled) {
					this.sendConnectRequest();
					this.setState(State.CONNECTING);
					// console.log("CONNECTING");
					this.checkStateSoon();	// Make sure I succeed reasonably soon
				}
				break;
			case State.TUNNELING:		// Presumably failed doing state work fast enough
			case State.CONNECTIONSTATE_REQUESTED:
				console.error("Response too slow in state " + this.state);
				// Deliberate fallthrough to other slow state that won't log errors
			case State.CONNECTING:
				if (!this.connTimeoutWarned) {
					console.warn("CONNECTING timeout");
					this.connTimeoutWarned = true;	// Do not nag in log
				}
				this.setState(State.DISCONNECTED);	// Regress to disconnected state
				this.checkStateSoon();	// Re-try soon
				break;
			case State.CONNECTED_IDLE:	// Keep connection alive by sending conn state requests every now and then
				this.sendConnectionStateRequest();
				this.connTimeoutWarned = false;
				break;
			}
		});
	}

	/**
	 * Change my state. Also determines if I'm considered connected.
	 */
	private setState(state: State) {
		// console.log("setState", state);
		this.state = state;
		this.connected = state >= State.CONNECTIONSTATE_REQUESTED && state <= State.TUNNELING;
		if (state === State.CONNECTED_IDLE) { // In "connected & idle" state
			if (this.cmdQueue.length)	// Got data to send
				this.sendQueuedCommand();	// Do so and set checkStateSoon for that command
			else
				this.checkStateSoon(6000); // To send connection state request regularly
		}
	}

	private sendQueuedCommand() {
		if (this.cmdQueue.length && this.connected) {
			const toSend = this.cmdQueue[0];
			// Command left in queue until acked
			toSend.handler(toSend);
			this.setState(State.TUNNELING);
			this.checkStateSoon();	// In case ack doesn't arrive on time
		}
	}

	private processReply(reply: number[]) {
		if (reply[0] !== 0x06 || reply[1] !== 0x10)
			throw "Invalid Header";
		const command = get16bit(reply, 2);
		const expectedLength = get16bit(reply, 4);
		// console.log("Length", reply[4], reply[5], expectedLength);
		if (expectedLength !== reply.length)
			throw "Invalid reply expectedLength, expected " + expectedLength + ' got ' + reply.length;
		// console.log("Got command", command);
		switch (command) {
		case Command.CONNECTION_RESPONSE:
			this.gotConnectionResponse(reply);
			break;
		case Command.CONNECTIONSTATE_RESPONSE:
			this.gotConnectionStateResponse(reply);
			this.connTimeoutWarned = false;
			break;
		case Command.TUNNEL_RESPONSE:
			this.gotTunnelResponse(reply);
			break;
		case Command.TUNNEL_REQUEST:
			this.gotTunnelRequest(reply);
			break;
		case Command.DISCONNECT_REQUEST:
			this.gotDisconnectRequest(reply);
			break;
		default:	// Log and ignore unknown commands for now
			console.warn("Comand not implemented", command);
			break;
		}
	}

	/**
	 * Peer wants to disconnect from me. Just ack that request and consider me disconnected.
	 */
	private gotDisconnectRequest(packet: number[]) {
		const reqChannelId = packet[6];
		if (reqChannelId === this.channelId) 	// Handle only if my current channel ID
			this.setState(State.DISCONNECTED);

		// Always respond, to not keep that connection haning in other end if he wants to close it
		const disconnectResponse = [0x06, 0x10, 0x02, 0x0a, 0x00, 0x08, reqChannelId, 0x00];
		this.socket.sendBytes(setLength(disconnectResponse));
	}

	/**
	 * Got connection response. Verify no error and pick up channel ID to use subsequently.
	 * If all is well, bump my state and send a CONNECTIONSTATE_REQUEST.
	 */
	private gotConnectionResponse(packet: number[]) {
		// console.log("gotConnectionResponse");
		this.verifyState(State.CONNECTING);
		const error = packet[7];
		if (error)
			throw "Connetion response error " + error;
		this.channelId = packet[6];
		this.sendConnectionStateRequest();
	}

	private verifyState(expectedState: State) {
		if (this.state !== expectedState)
			throw "Packet unexpected in state. Expected " + expectedState + ' had ' + this.state;
	}

	private gotConnectionStateResponse(packet: number[]) {
		// console.log("gotConnectionStateResponse");
		this.verifyState(State.CONNECTIONSTATE_REQUESTED);
		const error = packet[7];
		if (error)
			throw "Connetion state response error " + error;
		this.setState(State.CONNECTED_IDLE);
	}

	private gotTunnelResponse(packet: number[]) {
		this.verifyState(State.TUNNELING);
		const error = packet[9];
		if (error)
			throw "Tunnel response error " + error;
		const seqId = packet[8];
		const queue = this.cmdQueue;
		if (queue.length && queue[0].seqId === seqId) {
			// Ack of most recently sent command - now consider done
			queue.shift();	// Remove from queue
			this.setState(State.CONNECTED_IDLE);
		}
	}

	/**
	 * Just ack the "reverse tunnel request". We don't support it, but must respond to
	 * keep peer happy.
	 */
	private gotTunnelRequest(packet: number[]) {
		this.sendTunnelAck(packet[7], packet[8]);
	}

	private sendConnectRequest() {
		const listenerPort = this.socket.listenerPort;

		const connReq = [
			0x06,0x10,
			Command.CONNECTION_REQUEST >> 8, Command.CONNECTION_REQUEST & 0xff,	// CONNECTION_REQUEST
			0x00,0x1a,	// Total length

			0x08,0x01,	// Connection HPAI length
			0,0,0,0,	// Response IP address (any)
			listenerPort >> 8, listenerPort & 0xff,

			0x08,0x01,	// Tunnelling HPAI length
			0,0,0,0,	// Response IP address (any)
			listenerPort >> 8, listenerPort & 0xff,	// Using same port fwiw (not interested in return data)
			0x04,0x04,0x02,0x00	// CRI
		];
		this.socket.sendBytes(setLength(connReq));
		this.seqCount = 0;	// New session established
		this.errCount = 0;
	}

	private sendConnectionStateRequest() {
		const listenerPort = this.socket.listenerPort;

		const connStateReq = [
			0x06,0x10,
			Command.CONNECTIONSTATE_REQUEST >> 8, Command.CONNECTIONSTATE_REQUEST & 0xff,	// CONNECTION_REQUEST
			0x00,0x10,	// Total length

			this.channelId, 0x00,	// Connection HPAI
			0x08,	// HPAI length
			0x01,	// Host Protocol Code 0x01 -> IPV4_UDP, 0x02 -> IPV6_TCP */
			0,0,0,0,	// Response IP address (any)
			listenerPort >> 8, listenerPort & 0xff
		];
		this.socket.sendBytes(setLength(connStateReq));
		this.setState(State.CONNECTIONSTATE_REQUESTED);
		this.checkStateSoon();
	}

	/**
	 * Turn item at address addr1/addr2/addr3 (e.g., 4/0/0) on or off
	 */
	@callable("Send on/off command specified addr1/addr2/addr3")
	public setOnOff(
		addr1: number, addr2: number, addr3: number,
		on: boolean
	) {
		const cmd: OnOffCmd = {
			handler: this.sendOnOff.bind(this),
			destAddr: calcAddr(addr1, addr2, addr3),
			on: on
		};
		this.queueCmd(cmd);
	}

	/**
	 * Turn item at address addr1/addr2/addr3 (e.g., 4/0/0) on or off
	 */
	@callable("Recall scene for addr1/addr2/addr3")
	public setScene(
		addr1: number, addr2: number, addr3: number,
		@parameter("Scene 0…63 to recall (may be off-by-1)") scene: number
	) {
		scene = Math.min(Math.max(0, scene), 63);
		const cmd: NumberCmd = {
			handler: this.sendSingleByteNumber.bind(this),
			destAddr: calcAddr(addr1, addr2, addr3),
			num: scene
		};
		this.queueCmd(cmd);
	}

	/**
	 * Enfore all my dynamic property values by sending them anew. This is useful if
	 * some other external actor have messed with those values, to get them
	 * back to where I believe they are.
	 *
	 * CAUTION: I send ALL values. If there's a very large number of dynamic properties,
	 * you may need to allow for a larger send queue (see queueCmd below).
	 */
	@callable("Send all my dynamic property values")
	public enforceProps() {
		if (this.connected) {
			for (const dynProp of this.dynProps)
				dynProp.sendWantedValue();
		}
	}

	/**
	 * Enqueue a command to be sent ASAP (awaiting connection, pending acks, etc).
	 */
	queueCmd(cmd: QueuedCommand) {
		this.cmdQueue.push(cmd);
		if (this.cmdQueue.length > 50) {
			console.warn("Excessive command buffering - discarding old");
			this.cmdQueue.shift();
		}
		if (this.state === State.CONNECTED_IDLE)
			this.sendQueuedCommand();	// I'm currently idle, so can send right away
		else if (!this.connected && !this.timer) 	// Not even connected or awaiting - get me going
			this.checkStateSoon(2);

		// Else will do so once state changes back to idle
	}

	/**
	 * Turn item at address addr1/addr2/addr3 (e.g., 4/0/0) on or off
	 */
	sendOnOff(cmd: OnOffCmd) {
		cmd.seqId = this.seqCount;
		this.sendTunReq([
			0,0,0,0,0,0,0,0,0,0,	// Header backpatched here in sendTunReq

			// cEMI frame
			0x11, /* message code, 11: Data Service transmitting */
			0x00, /* add. info length (0 bytes) */
			0xbc, /* control byte */
			0xe0, /* DRL byte */
			0x00, /* hi-byte source individual address */
			0x00, /* lo-byte source (replace throw IP-Gateway) */
			cmd.destAddr >> 8, cmd.destAddr & 0xff,
			0x01, /* number of data bytes following */
			0x00, /* tpdu */
			cmd.on ? 0x81 : 0x80 /* 81: switch on, 80: off */
		]);
	}

	/**
	 * Set single byte number at address addr1/addr2/addr3, such as a scene number
	 * or a percentage value.
	 */
	sendSingleByteNumber(cmd: NumberCmd) {
		cmd.seqId = this.seqCount;
		this.sendTunReq([
			0,0,0,0,0,0,0,0,0,0,	// Header backpatched here in sendTunReq

			// cEMI frame
			0x11, /* message code, 11: Data Service transmitting */
			0x00, /* add. info length (0 bytes) */
			0xbc, /* control byte */
			0xe0, /* DRL byte */
			0x00, /* hi-byte source individual address */
			0x00, /* lo-byte source (replace throw IP-Gateway) */
			cmd.destAddr >> 8, cmd.destAddr & 0xff,
			0x02, /* number of data bytes following */
			0x00, /* tpdu */
			0x80,	// ???
			cmd.num
		]);
	}

	/**
	 * Send a "tunnel request", after defining the fixed headers and length fields
	 */
	private sendTunReq(tunReq: number[]) {
		tunReq[0] = 0x06;	// Tunneling header
		tunReq[1] = 0x10;
		tunReq[2] = Command.TUNNEL_REQUEST >> 8;
		tunReq[3] = Command.TUNNEL_REQUEST & 0xff;

		// Connection Header
		tunReq[6] = 4;		// Structure length
		tunReq[7] = this.channelId;
		tunReq[8] = this.seqCount;
		tunReq[9] = 0;			// Reserved

		this.socket.sendBytes(setLength(tunReq));
		this.seqCount = ((this.seqCount + 1) & 0xff);	// Incremented ready for next
	}

	/* TUNNEL_RESPONSE, sent in response to a TUNNELLING_REQUEST from gateway */
	private sendTunnelAck(channelId: number, seqCount: number) {
		const tunAck = [
			/* Header (6 Bytes) */
			0x06, /* Header Length */
			0x10, /* KNXnet version (1.0) */
			Command.TUNNEL_RESPONSE >> 8, Command.TUNNEL_RESPONSE & 0xff,
			0x00, /* hi-byte total length */
			0x0A, /* lo-byte total lengt 10 bytes */

			/* ConnectionHeader (4 Bytes) */
			0x04, /* 04 - Structure length */
			channelId, /* given channel id */
			seqCount, /* 01 the sequence counter from 7th: receive a TUNNELLING_REQUEST */
			0x00 /* 00 our error code */
		];
		this.socket.sendBytes(setLength(tunAck));
	}
}

/**
 * Dynamic properties that can be enforced through enforceProps.
 */
interface DynProp {
	sendWantedValue(): void;
}

/**
 * An analog property, with a normalized value 0...1, sent as a 0...255 value.
 */
class AnalogProp implements DynProp {
	private wantedValue = 0;	// Most recently set value
	private currValue: number;	// Sent value (may lag if prop changed frequently)
	private delayedSendTimer: CancelablePromise<void>;

	constructor(private owner: KNXNetIP, private analog: IAnalog) {
		owner.property<number>(
			'analog_' + analog.name,
			{
				type: "Number",
				description: analog.description || "An analog channel value (normalized)",
				min: 0,
				max: 1
			},
			setValue => {	// Function that handles both SETting and GETting a value
				if (setValue !== undefined) {	// Is SET call
					setValue = Math.max(0, Math.min(1, setValue)); // Clip to my range
					this.wantedValue = setValue;
					if (this.currValue !== setValue) {	// This is news - send it soon
						if (!this.delayedSendTimer) {
							// Debounce send requests to not overflow send queue
							this.delayedSendTimer = wait(150); // An arbitrary time
							this.delayedSendTimer.then(() => {
								this.delayedSendTimer = undefined;	// Now taken
								this.sendWantedValue();
								this.currValue = this.wantedValue;	// Consider applied now
							});
						}
					}
				}
				return this.wantedValue;	// Value from GET (also on SET, which is fine)
			}
		)
	}

	/**
	 * Send my wanted value to KNX bus.
	 */
	sendWantedValue() {
		const anal = this.analog;
		const owner = this.owner;
		const cmd: NumberCmd = {
			handler: owner.sendSingleByteNumber.bind(owner),
			destAddr: calcAddr(anal.addr[0], anal.addr[1], anal.addr[2]),
			num: Math.round(this.wantedValue * 255)
		};
		owner.queueCmd(cmd);
	}
}
/**
 * An analog property, with a normalized value 0...1, sent as a 0...100 percentage.
 */
class DigitalProp implements DynProp {
	private wantedValue = false;	// Most recently set value

	constructor(private owner: KNXNetIP, private digital: IDigital) {
		owner.property<boolean>(
			'digital_' + digital.name,
			{
				type: "Boolean",
				description: digital.description || "An digital (on/off) channel value"
			},
			setValue => {	// Function that handles both SETting and GETting a value
				if (setValue !== undefined) {	// Is SET call
					this.wantedValue = setValue;
					this.sendWantedValue();
				}
				return this.wantedValue;	// Value from GET (also on SET, which is fine)
			}
		)
	}

	/**
	 * Send my wanted value to KNX bus.
	 */
	sendWantedValue() {
		const ch = this.digital;
		const owner = this.owner;
		const cmd: OnOffCmd = {
			handler: owner.sendOnOff.bind(owner),
			destAddr: calcAddr(ch.addr[0], ch.addr[1], ch.addr[2]),
			on: this.wantedValue
		};
		owner.queueCmd(cmd);
	}
}

/**
 * Turn addr1/addr2/addr3 into 16 bit value "group address" using the proper formula
 *
 */
function calcAddr(addr1: number, addr2: number, addr3: number) {
	addr1 = Math.min(Math.max(0, addr1), 31);
	addr2 = Math.min(Math.max(0, addr2), 7);
	addr3 = Math.min(Math.max(0, addr3), 255);

	return addr1 * 2048 + addr2 * 256 + addr3;
}

/**
 * Set the total length in pkg as byte at offset 4 and 5.
 */

 function setLength(pkg: number[]) {
	const length = pkg.length;
	pkg[4] = length >> 8;
	pkg[5] = length & 0xff;
	return pkg;
}

/**
 * Return 16 bit data from high/low order bytes beginning at offs into rawData.
 */
function get16bit(rawData: number[], offs: number) {
	return (rawData[offs] << 8) + rawData[offs+1];
}

