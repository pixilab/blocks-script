/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

import {Driver, DriverFacade} from "../system_lib/Driver";

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
	Driver<NetworkTCP | NetworkUDP | SerialPort | MQTT>; // Driver subclass (when one is assigned)
};

/**
 * A bidirectional "streaming" data connection, such as TCP or Serial data.
 */
interface IStreamConnection extends DriverFacade {

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
	 * is the same if the text received is ASCII).
	 *
	 * IMPORTANT: To have any effect, call this function BEFORE connect/autoConnect.
	 */
	setMaxLineLength(maxLineLength: number): void;

	/*	Request auto-connection behavior (default is OFF for a driver).
		Optionally set "raw" data mode if not already opened in text mode.
	 */
	autoConnect(rawBytesMode?: boolean): void;

	/*	Open the data stream. Returns a "connect finished" promise.
		Optionally set "raw" data mode if not already opened in text mode.
	 */
	connect(rawBytesMode?: boolean): Promise<any>;

	/**
	 * Close the data stream
	 */
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
		NOTE: You need to re-subscribe if the object fires the 'finish' event.
	 */
	subscribe<T extends IStreamConnection>(this: T, event: 'textReceived', listener: (emitter: T, message: {
		text: string			// The text string that was received (excluding line terminator)
	}) => void): void;

	/*	Read "raw" data. Only applicable when connected in rawBytesMode. Note that data received
		has no "framing" applied, and is just the next batch of bytes in the connection's
		incoming data stream. Any framing needs to be applied by the receiveing driver/script.
		NOTE: You need to re-subscribe if the object fires the 'finish' event.
	 */
	subscribe<T extends IStreamConnection>(this: T, event: 'bytesReceived', listener: (emitter: T, message: {
		rawData: number[]		// The raw data that was received
	}) => void): void;

	/**
	 * Notification when connection state changes or fails. May be used as an alternative
	 * to the promise returned from connect(), and/or to be notified if the connection is
	 * dropped.
	 * NOTE: You need to re-subscribe if the object fires the 'finish' event.
	 */
	subscribe<T extends IStreamConnection>(this: T, event: 'connect', listener: (emitter: T, message: {
		type: 'Connection' |		// Connection state changed (check connected)
			'ConnectionFailed'	// Connection attempt failed
	}) => void): void;

	// Object is being shut down
	subscribe<T extends IStreamConnection>(this: T, event: 'finish', listener: (emitter: T)=>void): void;
}

/**
 *	A TCP network port.
 */
export interface NetworkTCP extends IStreamConnection, NetworkIPBase {
	isOfTypeName(typeName: 'NetworkTCP'): NetworkTCP|null;	// Check subtype by name

	/*	Explicit connection. Returns a "connect finished" promise.
		Optionally set "raw" data mode if not already opened in text mode.
		Uses the port specified in the UI unless explicitly overridden.
	 */
	connect(rawBytesMode?: boolean, port?:number): Promise<any>;
}

/**
 * Metadata provided in the typeSpecificMeta parameter for the @driver decorator
 * for 'NetworkTCP' drivers
 */
interface NetworkTCPDriverMetaData {
	port: number;	// Default port, selected automatically when driver is chosen
}

/**
	A serial port, typically managed through a USB-to-Serial adaptor
	connected to a PIXILAB Player.

	Note that connect, disconnect and autoConnect, while available, work a bit
	differently for serial ports since those don't really have any concept
 	of being "connected" (in the sense of a TCP connection).
	Here, "connect" establishes the connection to the Display Spot
	providing the actual serial port as well as opens the serial
	port there with specified settings (baudrate, etc). Whether the actual,
	serial device is physically connected or working is not knowable at this
	level (but could be determined by a driver, which then can provide its
	own "connected" property that takes precedence).
 */
export interface SerialPort extends IStreamConnection, NetworkBase {
	isOfTypeName(typeName: 'SerialPort'): SerialPort|null;	// Check subtype by name

	/*	Request auto-connection behavior (default is OFF for a driver).
		Optionally set "raw" data mode if not already opened in text mode.
		Optionally also provide settings, which override any corresponding
		settings in the @driver decorator.
	 */
	autoConnect(rawBytesMode?: boolean, settings?: SerialPortDriverMetaData): void;

	/*	Open the data stream. Returns a "connect finished" promise.
		Optionally set "raw" data mode if not already opened in text mode.
		Optionally also provide settings, which override any corresponding
		settings in the @driver decorator.
	 */
	connect(rawBytesMode?: boolean, settings?: SerialPortDriverMetaData): Promise<any>;
}

/**
 * Metadata provided in the typeSpecificMeta parameter for the @driver decorator
 * for 'SerialPort' drivers. May also be provided with the connect or autoConnect
 * call, which then takes precedence.
 */
interface SerialPortDriverMetaData {
	baudRate?: number;	// Default is 9600
	dataBits?: number;	// Default is 8
	stopBits?: number;	// Default is 1
	parity?: 'none'|'even'|'odd';	// Default is none
	flowControl?:'none'|'hardware';	// Default is none

	usbVendorId?: number;	// Target specific USB serial port vendor
	usbProductId?: number;	// target specific USB serial port product
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

	/*	Receive text data, interpreted as ASCII/UTF-8 from the full UDP packet.
		NOTE: You need to re-subscribe if the object fires the 'finish' event.
	 */
	subscribe(event: 'textReceived', listener: (emitter: NetworkUDP, message:{
		text:string,			// The text string that was received
		sender: string			// Address of peer data was received from
	})=>void): void;

	/*	Receive "raw" data containing the entire UDP packet.
		NOTE: You need to re-subscribe if the object fires the 'finish' event.
	 */
	subscribe(event: 'bytesReceived', listener: (emitter: NetworkUDP, message:{
		rawData:number[],		// The raw data that was received
		sender: string			// Address of peer data was received from
	})=>void): void;

	// Object is being shut down
	subscribe(event: 'finish', listener: (emitter: NetworkUDP)=>void): void;
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
	sendText(text: string, subTopic: string, options?: MqttSendOpts): void;

	/*	Subscribe to topic text from specified subTopic, interpreted as ASCII/UTF-8.
		Specified subTopic may include MQTT wildcards.
	 */
	subscribeTopic(subTopic: string, listener: (emitter: MQTT, message:{
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
	 *
	 * NOTE 1: You don't need to call subscribeTopic to re-subscribe
	 * to topics if the broker connection is lost and then re-established.
	 * Subscriptions remain intact across broker re-connections.
	 *
	 * NOTE 2: You need to re-subscribe to this event if the object
	 * fires the 'finish' event.
	 */
	subscribe(event: 'connect', listener: (emitter: MQTT, message: {
		type:
			'ConnectionFailed' | // Connection attempt failed
			'Connection';		// Connection state changed (check connected)
	}) => void): void;

	// Object is being shut down
	subscribe(event: 'finish', listener: (emitter: MQTT)=>void): void;
}

/** Additional options that can be provided with MQTT send operations.
 */
interface MqttSendOpts {
	retain?: boolean;	// Controls the "retain" flag of outgoing MQTT message
}

/**
 * Metadata provided in the typeSpecificMeta parameter for the @driver decorator
 * for 'NetworkUDP' drivers.
 */
interface NetworkUDPDriverMetaData {
	port: number;	// Default port, selected automatically when driver is chosen
	rcvPort?: number; 	// Set as receive port, and data reception is enabled
}

/**
 * Base interface declaring some common functionality used by network devices.
 */
export interface NetworkBase extends DriverFacade {
	// Check subtype by name (e.g., "NetworkUDP")
	isOfTypeName(typeName: string): NetworkBase|null;

	readonly enabled: boolean;		// True if I'm enabled (else won't send data)
	readonly options: string;		// Any "Custom Options" assigned to the Network Device
	readonly addressString: string;	// Original address, as set on the Network Device page.
	readonly address: string;		// Resolved or initial address, if known, else empty string
}

/**
 * Base interface declaring some common functionality used by both UDP and TCP
 * network ports.
 */
interface NetworkIPBase extends NetworkBase {

	readonly address: string;		// Possibly resolved IP address (e.g., "10.0.2.45")
	readonly port: number;			// Port number sending data to

	/**
	 * Send wake-on-LAN message to this device or device with specified MAC address,
	 * which must be exactly 6 bytes long, or a string in the form "112233445566" or
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
