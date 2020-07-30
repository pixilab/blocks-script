/*
 * Block system service for making basic web requests to http (or https) servers.
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

/**
 * Top level object you can import to make requests.
 */
export var SimpleHTTP: {
	newRequest(url:string): Request;
};

/**
 A "fluid" interface for setting various optional request properties,
 and finally firing off the request. Firing the request returns
 a promise that will be resolved/rejected  once the request is
 finished.
 */
export interface Request {
	setTimeout(seconds: number): Request;	// Maximum time the request may take
	header(headerName:string, headerValue:string): Request; // Additional header sent with request

	get(): Promise<Response>;	// Make a basic GET request
	// Default mediaType (aka "Content-Type"), unless explicitly specified below, is "application/json"
	put(dataToSend: string,  mediaType?: string): Promise<Response>;	// PUT request with supplied data
	post(dataToSend: string,  mediaType?: string): Promise<Response>;	// POST request with supplied data
}

/**
 Status and optional data returned from a successful request.
 */
export interface Response {
	status: number;			// Status code from request (e.g., 200)
	data?: string;			// Data returned from request, if any
	type?: string;			// Data type of any response (e.g. "application/json")
}
