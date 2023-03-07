/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

import {ScriptBaseEnv} from "system_lib/ScriptBase";
import {Driver} from "../system_lib/Driver";

/**
 * Access Network subsystem by system by its assigned name. Note that the object
 * returned varies based on whether there's a driver assigned or not. If no driver
 * is assigned, the raw NetworkTCP or NetworkUDP object is returned. If a driver
 * has been assigned, then the driver is returned. The driver exposes its own
 * methods and properties, thus hiding the standard methods and properties
 * of the underlying NetworkTCP or NetworkUDP object, unless it choses to re-
 * expose those explicitly.
 */
export var Network: { [deviceName: string]:
	NetworkTCP | NetworkUDP |		// Applies when no driver is assigned
	Driver<NetworkTCP|NetworkUDP>;	// Driver subclass (when driver is assigned)
};

/**
 *	A TCP network port.
 */
export interface NetworkTCP extends NetworkIPBase {
	isOfTypeName(typeName: 'NetworkTCP'): NetworkTCP|null;	// Check subtype by name

	readonly connected: boolean;		// True if I'm currently connected

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
		type: 'Connection' |		// Connection state changed (check connected)
			'ConnectionFailed'	// Connection attempt failed
	}) => void): void;

	// Object is being shut down
	subscribe(event: 'finish', listener: (sender: NetworkTCP)=>void): void;
}

/**
 * Metadata provided in the typeSpecificMeta parameter for the @driver decorator
 * for baseDriverType 'NetworkTCP'.
 */
interface NetworkTCPDriverMetaData {
	port: number;	// Default port, selected automatically when driver is chosen
}

/**
 *	A UDP network port.
 */
export interface NetworkUDP extends NetworkIPBase {
	isOfTypeName(typeName: 'NetworkUDP'): NetworkUDP|null;	// Check subtype by name

	readonly listenerPort: number;	// UDP listener port number, if any, else 0

	// Text to send (append \r or other framing before calling, if needed)
	sendText(text:string): void;

	// Send raw data bytes
	sendBytes(data: number[]): void;

	// // // // Notification subscription management // // // //

	// Receive text data, interpreted as ASCII/UTF-8 from the full UDP packet.
	subscribe(event: 'textReceived', listener: (sender: NetworkUDP, message:{
		text:string,			// The text string that was received
		sender: string			// Address of peer data was received from
	})=>void): void;

	// Receive "raw" data containing the entire UDP packet.
	subscribe(event: 'bytesReceived', listener: (sender: NetworkUDP, message:{
		rawData:number[],		// The raw data that was received
		sender: string			// Address of peer data was received from
	})=>void): void;

	// Object is being shut down
	subscribe(event: 'finish', listener: (sender: NetworkUDP)=>void): void;
}

/**
 * An broker connection corresponding to a single MQTT Network Device.
 * Requires an MQTT broker connection, which can be defined in Blocks'
 * configuration file.
 *
 * A base topic path is defined in the Network Device settings for
 * this device. You then provide a subTopic when calling functions,
 * which is appended to the base topic (separated by a forward slash).
 */
export interface MQTT extends NetworkBase {
	isOfTypeName(typeName: 'MQTT'): MQTT|null;	// Checks type by name

	readonly connected: boolean;		// True if I'm currently connected
	readonly address: string			// Device-specific part of topic

	isOfTypeName(typeName: string): any|null;

	/*	Send text string to broker on specified sub-topic.
	*/
	sendText(text: string, subTopic: string): void;

	/*	Subscribe to topic text from specified subTopic, interpreted as ASCII/UTF-8.
		Specified subTopic may include MQTT wildcards.
	 */
	subscribeTopic(subTopic: string, listener: (sender: MQTT, message:{
		text:string,			// The text string that was received
		fullTopic: string,		// FULL topic path data was received from
		subTopic: string		// Subscribed-to subTopic
	})=>void): void;

	/*	Terminate topic subscription from specified subTopic. You must pass
		the same listener function as used in the matching subscribe call.
	 */
	unsubscribeTopic(subTopic: string, listener: Function): void;

	/**
	 * Notification when broker connection fails or its state changes.
	 */
	subscribe(event: 'connect', listener: (sender: MQTT, message: {
		type:
			'ConnectionFailed' | // Connection attempt failed
			'Connection';		// Connection state changed (check connected)
	}) => void): void;

	// Object is being shut down
	subscribe(event: 'finish', listener: (sender: MQTT)=>void): void;
}

/**
 * Metadata provided in the typeSpecificMeta parameter for the @driver decorator
 * for baseDriverType 'NetworkUDP'.
 */
interface NetworkUDPDriverMetaData {
	port: number;	// Default port, selected automatically when driver is chosen
	rcvPort?: number; 	// Set as receive port, and data reception is enabled
}

/**
 * Base interface declaring some common functionality used network devices.
 */
interface NetworkBase extends ScriptBaseEnv {
	// Check subtype by name (e.g., "NetworkUDP")
	isOfTypeName(typeName: string): NetworkBase|null;

	readonly name: string;			// Leaf name of this network device
	readonly fullName: string;		// Full name, including enclosing containers
	readonly enabled: boolean;		// True if I'm enabled (else won't send data)
	readonly address: string;		// Resolved or initial address
	readonly options: string;		// Any "Custom Options" assigned to the Network Device
	readonly addressString: string;	// IP address exactly as set on the Network Device page.

	unsubscribe(event: string, listener: Function): void;	// Unsubscribe to a previously subscribed event
}

/**
 * Base interface declaring some common functionality used by both UDP and TCP
 * network ports.
 */
interface NetworkIPBase extends NetworkBase {

	address: string;		// Possibly resolved IP address (e.g., "10.0.2.45")
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
