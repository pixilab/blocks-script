/*	Blocks Driver providing basic control over a Mersive device using their OpenControl
	protocol https://documentation.mersive.com/content/topics/api-opencontrol-overview.htm
	This is done by POSTing json data to device along with an optional authorization header.

	The authorization token can be set either in the Driver Options field or using
	the autorization property.

	Copyright (c) 2023 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {Script, ScriptEnv} from "../system_lib/Script";
import {SimpleHTTP} from "../system/SimpleHTTP";
import {callable, driver, max, min, parameter, property} from "../system_lib/Metadata";
import {NetworkTCP} from "../system/Network";
import {Driver} from "../system_lib/Driver";

@driver('NetworkTCP', {port: 80})
export class MersiveOpenControl extends Driver<NetworkTCP> {
	private mAutorization = "";
	private mDisplayMode= 0;
	private mOrigin: string;

	public constructor(private socket: NetworkTCP) {
		super(socket);

		/*
		 * Pick up any authorization specified in the Custom Options field
		 * of the device's settings
		 */
		this.mAutorization = socket.options;

		/*	This autoConnect call only serves to provide a "connected"
			status of the device, at the cost of holding a separate (unused)
			TCP connection to the device. Comment out the following line
			if that causes problems or is undesirable for some other
			reason.
		*/
		socket.autoConnect(); // This socket is never used (see above)

		// Real comms happens using SimpleHTTP. Determine origin to use.
		var origin = socket.address;
		if (socket.port !== 80) // Uses non-standard port - append that
			origin += ':' + socket.port;
		this.mOrigin = `http://${origin}/`;
	}

	/**
	 * The autorization header value is also exposed as a property on the device, making
	 * this easy to change. Alternatively, this can be set in the Custom Options field
	 * of the device
	 */
	@property("Authorization to use by requests")
	get autorization(): string {
		return this.mAutorization;
	}
	set autorization(value: string) {
		this.mAutorization = value;
	}

	/**
	 * Gen3 Pods Only – Change the dual display mode to Mirror (1), Seamless (2), or Extend (3).
	 */
	@property("HDMI output display mode setting; Mirror (1), Seamless (2), or Extend (3)")
	@min(1) @max(3)
	set hdmiOutDisplay(mode: number) {
		this.mDisplayMode = mode;
		this.post('api/config', JSON.stringify(
			{
				m_generalCuration: {
					hdmiOutDisplayMode: mode
				}
			}
		));
	}
	get hdmiOutDisplay(): number {
		return this.mDisplayMode;
	}

	/**
	 * A "raw" method for POSTing whatever JSON string you want to an endpoint
	 * under the device's orgin
	 */
	@callable("POSTs raw JSON data to the device")
	post(
		@parameter('Path to send to, such as "api/config"') path: string,
		@parameter('JSON data to be sent') jsonData: string
	) {
		// Remove any leading /, as we already have trailing / in mOrigin
		if (path.charAt(0) === '/')
			path = path.substring(1);

		// Create request and set mandatory header
		const request = SimpleHTTP.newRequest(this.mOrigin + path)
			.header("Accept", "*/*");

		// Add any authorization header, if specified
		if (this.mAutorization)
			request.header("Authorization", this.mAutorization);

		// Send the request, returning a promise resolved once done. Result ignored.
		const result = request.post(jsonData);

		// Log any request failure to aid in error diagnostics
		result.catch(error => console.error("POST to endpoint", path, "failed due to", error));

		// Return the request promise, fwiw
		return result;
	}
}
