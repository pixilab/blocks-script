/*
 * Driver for receiveing timecode for synconization purposes from a Digital Cinema Server
 * that supports the D-Cinema Auxiliary Content Synchronization Protocol, SMPTE ST 430-10.
 * Copyright (c) 2024 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {Driver} from "../system_lib/Driver";
import {NetworkTCP} from "../system/Network";
import {driver, property} from "../system_lib/Metadata";
import {ScriptBase} from "../system_lib/ScriptBase";


@driver('NetworkTCP', { port: 4170 })
export class DCS extends Driver<NetworkTCP> {
	private rcvMsg: IncomingMessage;
	private mTimePos = new TimeFlow(0, 0);
	private lastTimeReceived: number;
	private mOutputEnabled = false;

	constructor(private socket: NetworkTCP) {
		super(socket);
		socket.setMaxLineLength(1024);	// Hopefully long enough (?)
		socket.autoConnect(true);
		socket.subscribe(
			'bytesReceived',
			(sender, msg) => {
				this.gotData(msg.rawData);
			}
		);
	}

	/**
	 * A new time position received - update time property
	 * accordingly, with the rate according to enabled state.
	 */
	newTimePosition(timeInSeconds: number) {
		log("Timeline position", timeInSeconds);
		if (this.lastTimeReceived != timeInSeconds) {
			this.mTimePos = new TimeFlow(
				Math.round(timeInSeconds * 1000),
				this.mOutputEnabled ? 1 : 0
			);
			this.lastTimeReceived = timeInSeconds;
			this.changed('timePos');
		}
	}

	@property("Current time position")
	get timePos(): TimeFlow {
		return this.mTimePos
	}

	/**
	 * Stop time if output is disabled. Not entirely sure this is
	 * correct, but that was implied in the protocol documentation
	 * (section 7.2.5; "The DCS shall set the output mode to disabled
	 * when the playout of content ... is stopped"), and I found no
	 * other message that indicated "playback stopped".
	 */
	setOutputEnabled(ena: boolean) {
		if (this.mOutputEnabled != ena) {
			// Start/stop based on most recenly reported time.
			this.mTimePos = new TimeFlow(
				this.mTimePos.currentTime, // Extrapolated time
				ena ? 1 : 0
			);
			this.mOutputEnabled = ena;
			// Affects timePos property as well
			this.changed('timePos');
			this.changed('outputEnabled');
		}
	}

	/*	Expose this property as well, fwiw. We're internally treating it more
		like a "playing" state, but the protocol refers to it as the "output
		mode" being "enabled" or "disabled".
	 */
	@property("Data outpout enabled")
	get outputEnabled(): boolean {
		return this.mOutputEnabled
	}

	private gotData(data: number[]) {
		if (!this.rcvMsg) {	// Got no previous msg - make one from this data
			this.rcvMsg = new IncomingMessage(data);
			data = null;
		} else {	// Append to existing message (spread over several packages)
			this.rcvMsg.appendFrom(data);
			if (!data.length)
				data = null;	// All consumed
		}
		if (this.rcvMsg.isComplete()) {
			this.processCommand(this.rcvMsg);
			this.rcvMsg = undefined;
			/*	No data expected to be left over in package since only one
				command should be in the pipe at any given time.
			 */
			if (data)
				console.error("Got leftover data");
		}
	}

	private processCommand(msg: IncomingMessage) {
		if (msg.getMsgType1() != 2) {
			console.error("Unexpected MsgType1", msg.getMsgType1());
			return
		}
		let request: Request;

		log("Got msg total length", msg.getPacketSize());

		switch (msg.getMsgType2()) {
		case MsgType.Announce_Request:
			request = new AnnounceRequest(msg);
			break;
		case MsgType.Get_New_Lease_Request:
			request = new GetNewLeaseRequest(msg);
			break;
		case MsgType.Get_Status_Request:
			request = new GetStatusRequest(msg);
			break;
		case MsgType.Set_RPL_Location_Request:
			request = new SetRplLocationRequest(msg);
			break;
		case MsgType.Set_Output_Mode_Request:
			request = new SetOutputModeRequest(msg);
			break;
		case MsgType.Update_Timeline_Request:
			request = new UpdateTimelineRequest(msg);
			break;
		default:
			console.error("Unimplemented MsgType2", msg.getMsgType2());
			return;
		}
		log("Processing", msg.getMsgType2());
		request.process(this);
	}

	send(msg: OutgoingMessage) {
		this.socket.sendBytes(msg.finalize());
	}
}

const enum TimlineExtType {
	Current_Composition_Playlist_ID,
	Current_Composition_Playlist_Position,
	Current_Reel_ID,
	Current_Reel_Position,
	Next_Composition_Playlist_ID
}

interface TimelineExt {
	type: TimlineExtType;
	data: number[];
}

abstract class Request {
	protected constructor(readonly id:  number) {
	}
	abstract process(owner: DCS): void;
}

class UpdateTimelineRequest extends Request {
	readonly playoutId: number;
	readonly timelinePosition;
	readonly editRate: number;
	readonly extensions: TimelineExt[];	// Only if had any extensions

	constructor(msg: IncomingMessage) {
		super(msg.get4bytes());
		this.playoutId = msg.get4bytes();
		this.timelinePosition = msg.get8bytes();
		const rateNum = msg.get8bytes();
		const rateDenom = msg.get8bytes();
		this.editRate= rateNum / rateDenom;
		let numExts = msg.get4bytes();

		if (numExts) {
			this.extensions = [];
			while (numExts--) {
				const extType = msg.get4bytes();
				const extLen = msg.get4bytes();
				this.extensions.push({
					type: extType,
					data: msg.getBytes(extLen)
				});
			}
		}
	}

	process(owner: DCS): void {
		owner.newTimePosition(this.timelinePosition / this.editRate);
		owner.send(new SimpleResponse(this, MsgType.Update_Timeline_Response));
	}
}

/**
 Log messages, allowing my logging to be easily disabled in one place.
 */
const DEBUG = true;	// Set to false to disable verbose logging
function log(...messages: any[]) {
	if (DEBUG)
		console.info(messages);
}

const enum MsgType {
	Announce_Request,
	Announce_Response,
	Get_New_Lease_Request,
	Get_New_Lease_Response,
	Get_Status_Request,
	Get_Status_Response,
	Set_RPL_Location_Request,
	Set_RPL_Location_Response,
	Set_Output_Mode_Request,
	Set_Output_Mode_Response,
	Update_Timeline_Request,
	Update_Timeline_Response,
	Terminate_Lease_Request,
	Terminate_Lease_Response,
	Get_Log_Event_List_Request = 0x10,
	Get_Log_Event_List_Response,
	Get_Log_Event_Request,
	Get_Log_Event_Response
}

abstract class Message {
	protected static readonly kHdrLength = 16;
	static readonly kMsgStart = this.kHdrLength + 4;	// Just past the initial BER length

	protected msg: number[];

	protected constructor(msg: number[]) {
		this.msg = ScriptBase.makeJSArray(msg);	// Ensure it's a bona fide JS array
	}
}

abstract class OutgoingMessage extends Message {
	protected constructor(msgType1: number, msgType2: number) {
		const msg: number[] = [];
		super(msg);
		/*	See Annex A
			Auxiliary Content Synchronization Protocol Variable Length Universal Label (UL)
		 */
		msg.push(0x06);
		msg.push(0x0e);
		msg.push(0x2b);
		msg.push(0x34);
		msg.push(0x02);
		msg.push(0x05);
		msg.push(0x01);
		msg.push(0x01);
		msg.push(0x02);
		msg.push(0x07);
		msg.push(0x02);
		msg.push(msgType1);
		msg.push(msgType2);
		msg.push(0, 0, 0);

		msg.push(0, 0, 0, 0);	// BER length placeholder
	}

	protected push4bytes(value: number) {
		this.pushNumBytes(value, 4);
	}

	protected push8bytes(value: number) {
		this.pushNumBytes(value, 8);
	}

	protected pushStatusResponse(statusResponseKey: number = 0, text: string = "") {
		this.pushByte(statusResponseKey);
		this.pushString(text);
	}

	/**
	 * Push a string, typically prefixed by its lengt as a four byte number.
	 * I currently deal only with ASCII characters.
	 */
	protected pushString(str: string, omitLength?: boolean) {
		const numChars = str.length;
		if (!omitLength)
			this.push4bytes(numChars);
		for (let cix = 0; cix < numChars; ++cix)
			this.pushByte(str.charCodeAt(cix));
	}

	protected pushTrailingString(str: string) {
		this.pushString(str, true);
	}

	protected pushNumBytes(value: number, byteCount: number) {
		let shifts = 8 * (byteCount-1);
		while (byteCount--) {
			this.msg.push((value >> shifts) & 0xff);
			shifts -= 8;
		}
	}

	private pushByte(byte: number) {
		if (byte < 0 || byte > 0xff)
			throw "Byte out of range";
		this.msg.push(byte);
	}

	private setNumBytes(value: number, byteCount: number, atOffs: number) {
		let shifts = 8 * (byteCount-1);
		while (byteCount--) {
			this.msg[atOffs++] = ((value >> shifts) & 0xff);
			shifts -= 8;
		}
	}

	/**
	 * Finalize this message, setting its overall "BER length". Call
	 * prior to sending the message. Returns byte array ready to send.
	 */
	finalize() {
		this.setNumBytes(0x83, 1, Message.kHdrLength);

		this.setNumBytes(
			this.msg.length - Message.kHdrLength - 4,
			3, Message.kHdrLength + 1
		);
		return this.msg;
	}
}

class IncomingMessage extends Message {
 	private readPos = Message.kHdrLength;		// Current data read cursor
 	private packetSize: number;	// Once obtained

 	constructor(msg: number[]) {
 		super(msg);
 	}

 	/**
 	 * Get the total length of this entire packet, which is following right after
 	 * its initial Pack Key. Don't call unless data known to be there.
 	 */
 	getPacketSize() {
 		return this.packetSize;
 	}
 	getMsgType1() {
 		return this.msg[11];
 	}
 	getMsgType2() {
 		return this.msg[12];
 	}

 	getReadPos() {
 		return this.readPos;
 	}

 	/**
 	 * Read the BigEndian 4 byte value, returnning it as a number.
 	 */
 	get4bytes(): number {
 		return this.getNum(4);
 	}

	/*	The BER Length always seem to have 0x83 in the first byte, so
		we keep only the three low bytes of the four.
	 */
 	getBerLength(): number {
		 return this.get4bytes() & 0xffffff;
	}

 	/**
 	 * Read the BigEndian 8 byte value, returnning it as a number.
 	 * NOTE: I don't currently consider the sign bit, so assumes
 	 * a positive number.
 	 */
 	get8bytes(): number {
 		return this.getNum(8);
 	}

 	getNum(byteCount: number): number {
 		let result = 0;
 		while (byteCount--) {
 			result = result << 8;
 			result += this.msg[this.readPos++];
 		}
 		return result;
 	}

 	/**
 	 * Get numBytes from the current position.
 	 */
 	getBytes(numBytes: number): number[] {
 		const bytes = this.msg.slice(this.readPos, this.readPos + numBytes);
 		this.readPos += numBytes;
 		return bytes;
 	}

 	/**
 	 * Get string from ASCII data starting atOffs, extending for numBytes.
 	 * NOTE: I support ASII subset only - not UTF-8.
 	 */
 	getStr(numBytes: number): string {
 		if (numBytes) {
 			const strBytes = this.getBytes(numBytes);
 			return String.fromCharCode(...strBytes);
 		}
 		return "";
 	}

 	/**
 	 * Get a string thatäs the last element in the packet, where the length is implied
 	 * by the total packet length.
 	 */
 	getTrailingString(): string {
 		return this.getStr(this.getPacketSize() - this.getReadPos());
 	}

 	/*	Get the total required length of this package, if can be determined, else 0.
 	 */
 	private getRequiredLength(): number {
 		if (this.msg.length < Message.kHdrLength + 4) // No can do
 			return 0;
 		const pktSize = this.getBerLength();	// Length EXCLUDING header and length
 		this.readPos = Message.kHdrLength; // Keep it here until isComplete() becomes true
 		const totalLength = pktSize + Message.kHdrLength + 4;
 		if (totalLength > 2048) // This just seems wrong
 			throw "Packet too large - perhaps weäre out of sync";
 		return totalLength;
 	}

 	isComplete() {
 		const bytesSoFar = this.msg.length;
 		const requiredLength = this.getRequiredLength();
 		if (requiredLength) {
 			if (bytesSoFar === requiredLength) {
 				this.packetSize = this.getBerLength() + Message.kHdrLength + 4;
 				return true;
 			}
 			if (bytesSoFar > requiredLength) // Someone goofed up
 				throw "IncomingMessage overflow";
 		}
 		return false;
 	}

 	appendFrom(moreData: number[]) {
 		const requiredLength = this.getRequiredLength();
 		if (!requiredLength) {
 			this.tryAppend(Message.kHdrLength + 4 - this.msg.length, moreData);
 			const requiredLength = this.getRequiredLength();
 			if (!requiredLength)
 				return;
 		}
 	}

 	/**
 	 * Try to append count bytes to me by removing them from moreData, leaving
 	 * any residue in moreData.
 	 */
 	private tryAppend(count: number, moreData: number[]) {
 		const moreDataLen = moreData.length;
 		if (count >= moreDataLen) {
 			const toAppend = moreData.splice(0, count);
 			this.msg = this.msg.concat(toAppend);
 		}
 	}
 }

class SimpleResponse extends OutgoingMessage {
	constructor(req: GetStatusRequest, responseCode: MsgType) {
		super(2, responseCode);
		this.push4bytes(req.id);
		this.pushStatusResponse();
	}
}

class AnnounceRequest extends Request {
	readonly systemTime: number;
	readonly dcsDeviceDescription: string;

	constructor(msg: IncomingMessage) {
		super(msg.get4bytes());
		this.systemTime = msg.get8bytes();
		this.dcsDeviceDescription = msg.getTrailingString();
	}

	process(owner: DCS): void {
		owner.send(new AnnounceResponse(this));
	}
}

class AnnounceResponse extends OutgoingMessage {
	static readonly kDescr = "PIXILAB DCS Driver";

	constructor(req: AnnounceRequest) {
		super(2, MsgType.Announce_Response);
		this.push4bytes(req.id);
		this.push8bytes(req.systemTime);
		this.pushString(AnnounceResponse.kDescr);
		this.pushStatusResponse();
	}
}

class GetNewLeaseRequest extends Request {
	readonly duration: number;	// In seconds

	constructor(msg: IncomingMessage) {
		super(msg.get4bytes());
		this.duration = msg.get4bytes();
	}

	process(owner: DCS): void {
		owner.send(new GetNewLeaseResponse(this));
	}
}

class GetNewLeaseResponse extends OutgoingMessage {
	constructor(req: GetNewLeaseRequest) {
		super(2, MsgType.Get_New_Lease_Response);
		this.push4bytes(req.id);
		this.push4bytes(req.duration);
		this.pushStatusResponse();
	}
}

class GetStatusRequest extends Request {
	constructor(msg: IncomingMessage) {
		super(msg.get4bytes());
	}

	process(owner: DCS): void {
		owner.send(new SimpleResponse(this, MsgType.Get_Status_Response));
	}
}


class SetRplLocationRequest extends Request {
	readonly playoutId: number;
	readonly resourceUrl: string;

	constructor(msg: IncomingMessage) {
		super(msg.get4bytes());
		this.playoutId = msg.get4bytes();
		this.resourceUrl = msg.getTrailingString();
	}

	process(owner: DCS): void {
		log("Resource URL", this.resourceUrl);
		owner.send(new SimpleResponse(this, MsgType.Set_RPL_Location_Response));
	}
}

class SetOutputModeRequest extends Request {
	readonly enabled: boolean;

	constructor(msg: IncomingMessage) {
		super(msg.get4bytes());
		this.enabled = !!msg.getNum(1);
	}

	process(owner: DCS): void {
		owner.setOutputEnabled(this.enabled);
		log("SetOutputMode", this.enabled);
		owner.send(new SimpleResponse(this, MsgType.Set_Output_Mode_Response));
	}
}
