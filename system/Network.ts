/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

import {ScriptBaseEnv} from "system_lib/ScriptBase";

/**
 * Access Network subsystem known by system by its device (socket) name.
 */
export var Network: { [deviceName: string]: NetworkTCP|NetworkUDP; };

/**
 *	A TCP network port.
 */
export interface NetworkTCP extends NetworkBase {
	isOfTypeName(typeName: string): NetworkTCP|null;	// Check subtype by name

	connected: boolean;		// True if I'm currently connected (read-only)
	fullName: string;		// Full, unique name (read-only)
	name: string;			// Leaf network port name (read only)

	/**
	 * Specify end-of-data framing for textReceived. If not set, this defaults to any of CR/LF,
	 * CR, or LF. Example, to read data terminated by a > character, call setReceiveFraming('>').
	 * If you want the termination sequencde to be included in the data received, pass
	 * true in includeInData. Otherwise, the termination sequence will NOT be included.
	 *
	 * IMPORTANT: To have any effect, call this function BEFORE connect/autoConnect.
	 */
	setReceiveFraming(sequence: string, includeInData?: boolean): void;

	/**
	 * Specify the maximum line length that can be received in text mode. The default value
	 * is 256 bytes. Call this function if you need to accept longer strings. Note that it's
	 * specified in BYTES, not characters (which may vary when using UTF-8 encoding, but
	 * is the same as long as the text received is ASCII).
	 *
	 * IMPORTANT: To have any effect, call this function BEFORE connect/autoConnect.
	 */
	setMaxLineLength(maxLineLength: number): void;

	/*	Request auto-connection behavior (default is OFF for a driver).
		Optionally set "raw" data mode if not already opened in text mode.
	 */
	autoConnect(rawBytesMode?: boolean): void;

	/*	Explicit connection. Returns a "connect finished" promise.
		Optionally set "raw" data mode if not already opened in text mode.
		Uses the port specified in the UI unless explicitly overridden.
	 */
	connect(rawBytesMode?: boolean, port?:number): Promise<any>;

	disconnect(): void;			// Disconnect immediately

	/*	Send text with a carriage return appended.
		Returned promise resolved/rejected once sent/failed.
	*/
	sendText(text: string): Promise<any>;

	/*	Send text with optional line terminator (none if null).
		Returned promise resolved/rejected once sent/failed.
	*/
	sendText(text: string, optLineTerminator: string): Promise<any>;

	/*	Send "raw" data bytes.
		Returned promise resolved/rejected once sent/failed.
	 */
	sendBytes(rawData: number[]): Promise<any>;

	// // // // Notification subscription management // // // //

	/*	Read text data string (single line), interpreted as ASCII/UTF-8, by default
		up to (but not including) the end of line (which may be CR, CR/LF or LF).
		This default termination may be overridden by calling setReceiveFraming.
		NOT applicable when connected in rawBytesMode.
	 */
	subscribe(event: 'textReceived', listener: (sender: NetworkTCP, message: {
		text: string			// The text string that was received (excluding line terminator)
	}) => void): void;

	/*	Read "raw" data. Only applicable when connected in rawBytesMode. Note that data received
		has no "framing" applied, and is just the next batch of bytes in the connection's
		incoming data stream. Any framing needs to be applied by the receiveing driver/script.
	 */
	subscribe(event: 'bytesReceived', listener: (sender: NetworkTCP, message: {
		rawData: number[]		// The raw data that was received
	}) => void): void;

	/**
	 * Notification when connection state changes or fails. May be used as an alternative
	 * to the promise returned from connect(), and/or to be notified if the connection is
	 * dropped.
	 */
	subscribe(event: 'connect', listener: (sender: NetworkTCP, message: {
		type: 'Connection' |		// Connection state changed (check with isConnected)
			'ConnectionFailed'	// Connection attempt failed
	}) => void): void;

	// Object is being shut down
	subscribe(event: 'finish', listener: (sender: NetworkTCP)=>void): void;
}

/**
 *	A UDP network port.
 */
export interface NetworkUDP extends NetworkBase {
	isOfTypeName(typeName: string): NetworkUDP|null;	// Check subtype by name

	listenerPort: number;	// UDP listener port number, if any, else 0 (read only)

	// Text to send (append \r or other framing before calling, if needed)
	sendText(text:string): void;

	// Send raw data bytes
	sendBytes(data: number[]): void;

	// // // // Notification subscription management // // // //

	// Receive text data, interpreted as ASCII/UTF-8 from the full UDP packet.
	subscribe(event: 'textReceived', listener: (sender: NetworkUDP, message:{
		text:string				// The text string that was received
	})=>void): void;

	// Receive "raw" data containing the entire UDP packet.
	subscribe(event: 'bytesReceived', listener: (sender: NetworkUDP, message:{
		rawData:number[]				// The raw data that was received
	})=>void): void;

	// Object is being shut down
	subscribe(event: 'finish', listener: (sender: NetworkUDP)=>void): void;
}

/**
 * Base interface declaring some common functionality used by both UDP and TCP
 * network ports.
 */
interface NetworkBase extends ScriptBaseEnv {
	// Check subtype by name (e.g., "NetworkUDP")
	isOfTypeName(typeName: string): NetworkBase|null;

	// Read-only properties:
	name: string;			// Leaf name of this network device
	fullName: string;		// Full name, including enclosing containers
	enabled: boolean;		// True if I'm enabled (else won't send data)
	address: string;		// Target IP address (e.g., "10.0.2.45")
	port: number;			// Port number sending data to

	/**
	 * Send wake-on-LAN message to this device or device with specified MAC address,
	 * which must be exactly 6 bytes long, or a colon separated string in the form
	 * "11:22:33:44:55:66". To use "this device" (i.e., no argument), you must have
	 * called enableWakeOnLAN() early on (typically in the driver's constructor),
	 * and enugh time must have elapsed for the MAC address to be picked up and
	 * stored.
	 */
	wakeOnLAN(macAddr?: string|number[]): void;

	/**
	 * Indicate that you want to call wakeOnLAN() on this device at some future
	 * point in time, thus initiating acquisition of the devices MAC address.
	 */
	enableWakeOnLAN(): void
}
