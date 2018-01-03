/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

/**
 * Access Network subsystem known by system by its device (socket) name.
 */
export var Network: { [deviceName: string]: NetworkTCP|NetworkUDP; };

export interface NetworkTCP {
	name: string;			// Name of this TCP port (read-only)
	fullName: string;		// Full name, including any containers (read-only)
	enabled: boolean;		// True if I'm enabled. Else won't send data. (read-only)

	autoConnect(): void;		// Request auto-connection behavior (default is OFF for a driver)
	connect(): Promise<any>;	// Explicit connection. Returns a "connect finished" promise
	disconnect(): void;			// Disconnect immediately
	connected: boolean;			// True if I'm currently connected (read-only)

	// Send text with \r appended. Promise resolved once sent.
	sendText(text:string): Promise<any>;

	// Send text with optional line terminator (none if null). Promise resolved once sent.
	sendText(text:string, optLineTerminator: string): Promise<any>;

	// // // // Notification subscriptions

	subscribe(type: 'textReceived', listener: (sender: NetworkTCP, message:{
		text:string				// The text string that was received (excluding line terminator)
	})=>void): void;

	subscribe(type: 'connect', listener: (sender: NetworkTCP, message:{
		type:
			'Connection'|		// Connection state changed (check with isConnected)
			'ConnectionFailed'	// Connection attempt failed
	})=>void): void;

	subscribe(type: 'finish', listener: (sender: NetworkTCP)=>void): void;

	unsubscribe(type: string, listener: Function);
}


export interface NetworkUDP {
	name: string;			// Name of this TCP port (read-only)
	fullName: string;		// Full name, including any containers (read-only)
	enabled: boolean;		// True if I'm enabled. Else won't send data. (read-only)

	sendText(text:string): void; // Text to send (add \r before calling, if needed)

	// // // // Notification subscriptions

	subscribe(type: 'finish', listener: (sender: NetworkUDP)=>void): void;
	subscribe(type: 'textReceived', listener: (sender: NetworkUDP, message:{
		text:string				// The text string that was received
	})=>void): void;
	unsubscribe(type: string, listener: Function);
}
