/*
 * Block system service for building TCP servers, listening for connection requests on a port.
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2018 by Mike Fahl.
 */
export var SimpleServer: {

	/**
	 * Establish a server listening on port and expecting text based data.
	 */
	newTextServer(
		port:number, 				// Port listening on for server connections
		maxConnections?:number, 	// Max number of concurrent connections (default is 25)
		maxStringLength?:number, 	// Max length of character strings (default is 256)
		framingSeq?:string,			// End-of-line sequence (default any of CR, CR-LF, LF)
		includeInData?:boolean		// Include actual EOLN sequence in data received (default is false)
	): ServerListener;

	/**
	 * Establish a server listening on port, providing data as a sequence of bytes.
	 */
	newBytesServer(
		port:number,			// Port listening on for server connections
		maxConnections?:number	// Max number of concurrent connections (default is 25)
	): ServerListener;
};

/*
 * The listener that listens for connections on the specified port
 */
export interface ServerListener {
	subscribe(event: "client", listener: (sender: ServerListener, message:{
		connection: Connection	// The newly acquired connection
	})=>void): void;
}

export interface Connection {
	id: string;				// Connection identifier (unique within its ServerListener)

	disconnect(): void;		// Disconnect the client from the server side

	/*	Send text with a "carriage return" end of line character automatically appended.
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


	// // // // // // // // // // // Notifications // // // // // // // // // // // // //


	/*	Read text data string (single line), interpreted as UTF-8 (ASCII compatible).
		NOT applicable when established through newBytesServer.
	 */
	subscribe(event: 'textReceived', listener: (sender: Connection, message: {
		text: string		// The text string that was received
	}) => void): void;

	/*	Read "raw" data. Only applicable when established through newBytesServer. Note that data
		received has no "framing" applied, and is just the next batch of bytes in the connection's
		incoming data stream. Any framing needs to be applied by the caller.
	 */
	subscribe(event: 'bytesReceived', listener: (sender: Connection, message: {
		rawData: number[]		// The raw data that was received
	}) => void): void;

	/*	Connection was closed by client, or host object died. Release any connection to
		it immediately. It can no longer be used to send/receive data.
	 */
	subscribe(event: 'finish', listener: (sender: Connection)=>void): void;
}
