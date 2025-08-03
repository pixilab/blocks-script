/*
 * Block system service for making basic web requests to http (or https) servers.
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2017 by Mike Fahl.
 */

/**
 * Top level object you can import to make requests.
 */
export var SimpleHTTP: {
	newRequest(url:string, opts?: ReqOpts): Request;
};

/**
 A "fluid" interface for setting various optional request properties,
 and finally firing off the request. Firing the request returns
 a promise that will be resolved/rejected  once the request is
 finished.
 */
export interface Request {
	/*	Time the request is allowed to take to complete.
		If not specified, a default timeout will be applied, suitable
		for most operations. For operations that may take a while,
		such as downloading a large file, you should
		consider setting the timeout explicitly to a reasonable
		maximum time.
	 */
	setTimeout(seconds: number): Request;

	// Add a header to be sent with request.
	header(headerName:string, headerValue:string): Request;

	// GET request, expected to return RetType (if interpreted)
	get<RetType>(): Promise<Response<RetType>>;

	// Default mediaType (aka "Content-Type") is "application/json" unless explicitly specified below
	put<RetType>(dataToSend: string, mediaType?: string): Promise<Response<RetType>>;	// PUT request with supplied data
	post<RetType>(dataToSend: string, mediaType?: string): Promise<Response<RetType>>;	// POST request with supplied data

	delete(): Promise<Response<void>>;	// DELETE request, passing and returning no data

	head(): Promise<Response<void>>;	// Get just response headers. Sometimes useful for preflighting.

	/*	Do a GET request, writing response data toFile. Promise resolved once download complete.
		See SimpleFile for file path syntax and restrictions.
		Downloading a large file may take a while, so you may want to call setTimeout prior
		to calling download on this request, ensuring that the timeout is long enough to
		complete the download.
	 */
	download(toFile:string): Promise<Response<void>>;
}

export interface ReqOpts {
	/*	If possible, interpret known response types, and store the result in
		Response#interpreted. Currently supported response types are:

		- "application/json"
			Response#interpreted holds an object, or an array-like
			object (if the outermost JSON data is array). Fields in objects
			hold primitive data and other, nested objects or array-likes.
			NOTE: This method of reading JSON data is more efficient than
			first reading it as text and then converting it to JSON using
			the JSON.parse() method.

		- "application/xml" or "text/xml"
			Response#interpreted holds an object corresponding to the root node
			of the XML data.
			*	Attributes and child nodes are provided as named properties.
			*	If a node contains multiple child nodes with the same name,
				this will be provided as an array-like object.
			*	Any XML namespace specifiers are discarded. E.g., "ns:myname"
				will be priovided under "myname" only.
			*	If a node has both attributes and plain text content, that
				text content will have an empty string as its key.

		NOTE: An "array-like object" will have a length and can be indexed, but
		doesn't have the methods of a JavaScript array. You can use the
		ScriptBase.makeJSArray function to turn it into a JS array, if required.
	 */
	interpretResponse?: boolean;

	/*	Force interpretation as specified mime type. Useful if the service being called
		doesn't return the correct mime type.
	 */
	interpretAs?: string;

	// Options applicable only for interpreting CSV data.
	columnSeparator?: string, 	// Separator character; default is ',' other common option is '\t'
	escapeChar?: string,		// Escape character; default is none
	quote?: string | false 		// Quote character to use, none if false; default is '"'
}

/**
 Status and optional data and headers returned from a successful request.
 */
export interface Response<T> {
	status: number;			// Status code from request (e.g., 200)
	data?: string;			// Result from request, if any (not available if interpreted)
	interpreted?: T;		// Interpreted data returned by request, if any
	type?: string;			// Data type of any response (e.g. "application/json")

	/*	Get the response message header value. If the message header is not present
		then null is returned. If the message header is present but has no
		value then the empty string is returned. If the message header is present
		more than once then the values of joined together and separated by a ','
		character.
	*/
	getHeader(name: string): string|null;
}
