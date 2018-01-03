/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */


export var SimpleHTTP: {
	newRequest(url:string): Request;
};

/**
 Status and optional data returned from a successful request.
 */
export interface Response {
	status: number;			// Status code from request (e.g., 200)
	data?: string;			// Data returned from request, if any
	type?: string;			// Data type of any response (e.g. "application/json")
}

/**
 A "fluid" interface for setting various optional request properties,
 and finally firing off the request. Firing the request returns
 a promise that will be resolved/rejected  once the request is
 finished.
 */
interface Request {
	setTimeout(seconds: number): Request;

	get(): Promise<Response>;
	put(dataToSend: string,  mediaType: string): Promise<Response>;
	post(dataToSend: string,  mediaType: string): Promise<Response>;
}
