/*
 * Block system service for making websocket client calls to servers.
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2019 by Mike Fahl.
 */

/**
 * Top level object you can import to open websockets.
 */
export var SimpleWebsocket: {

	/* Open websocket at specified URL, returning a promise that will bew resolved
	 * with the  WebsocketConnection once connection succeeds, or rejected with an error
	 * if connection fails.
	 */
	connect(
		url:string, 				// URL to connect to (typically starts with ws:// or wss://)
		maxMsgSize?: number,		// Max expected incoming frame size (default is 8K)
		headers?: Dictionary<string> // Request headers (e.g., authorization, API key, etc)
	): Promise<WebsocketConnection>;
};

interface Dictionary<TElem> {
	[id: string]: TElem;
}

export interface TextMessage {
	text:string;				// The text string that was received
}

export interface BytesMessage {
	rawData:number[];			// The data that was received
}


export interface WebsocketConnection {
	/*	Send text string (append \r or other framing before calling, if needed).
	 */
	sendText(text:string): void;

	sendBytes(bytes:Uint8Array): void;	// Most efficient way to send data
	sendBytes(bytes:number[]): void;	// For compatibility

	// Close websocket gracefully from client end.
	disconnect(): void;

	// // // // Notifications // // // //

	// Receive text data, interpreted as ASCII/UTF-8 from the full websocket frame.
	subscribe(event: 'textReceived', listener: (sender: WebsocketConnection, message:TextMessage)=>void): void;

	// Receive text data, interpreted as ASCII/UTF-8 from the full websocket frame.
	subscribe(event: 'bytesReceived', listener: (sender: WebsocketConnection, message:BytesMessage)=>void): void;


	/*	Connection was closed (by server or due to error, which then is logged).
		Release any connections to it immediately. It can no longer be used
		to send/receive data.
	 */
	subscribe(event: 'finish', listener: (sender: WebsocketConnection)=>void): void;

	/**
	 * Unsubscribe from notificication if no longer desired.
	 */
	unsubscribe(event: string, listener: Function): void;
}
