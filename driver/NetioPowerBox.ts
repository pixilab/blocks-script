/*	Driver for NETIO PowerBOX

	Note that for this driver to work
	- the "JSON API" must be enabled under M2M APIs
	- READ-WRITE must be enabled
	- The Username and Password for READ-WRITE must be blank

	The driver will fail to start if the initial connection attempt doesn't succeed for
	whatever reason (e.g., box not being connected and powered when the driver starts).

 	Copyright (c) 2020 VICREO BV, the Netherlands (https://vicreo.eu). All Rights Reserved.
	Created by: Jeffrey Davidsz <jeffrey.davidsz@vicreo.eu>
  	Version: 1.0.0
 */

import { NetworkTCP } from "system/Network";
import { Driver } from "system_lib/Driver";
import { SimpleHTTP } from "system/SimpleHTTP";
import { driver, property } from "system_lib/Metadata";

/**
 * What's in the Outputs field from the "netio.json" request
 * @interface NetioOutputs
 */
interface NetioOutputs {
	ID: number;
	Name: string;
	State: number;
	Action: number;
	Delay: number;
}


/**
 * Main class
 * @export
 * @class NetioPowerBox
 * @extends {Driver}
 */
@driver('NetworkTCP', { port: 80 })
export class NetioPowerBox extends Driver<NetworkTCP> {
	private mConnected = false;	// Until I know
	private outputs: Array<NetioOutputs> = [];

	public constructor(private socket: NetworkTCP) {
		super(socket);

		//Get initial status
		SimpleHTTP.newRequest(`http://${socket.address}/netio.json`)
		.get().then((result) => {
			this.connected = true;
			const parsedResponse = JSON.parse(result.data);
			this.outputs = parsedResponse.Outputs;
		}).catch(error => this.requestFailed(error));

		for (let i = 1; i <= 3; i++)
			this.createOutlets(i);
	}

	private requestFailed(error: string) {
		this.connected = false;
		console.warn(error);
	}

	/**
	 * Connection status
	 * @memberof NetioPowerBox
	 */
	@property("True if communication attempt succeeded", true)
	public get connected(): boolean {
		return this.mConnected;
	}
	public set connected(value: boolean) {
		this.mConnected = value;
	}

	/**
	 * Create outlet options
	 * @private
	 * @param {number} outletNumber
	 * @memberof NetioPowerBox
	 */
	private createOutlets(outletNumber: number) {
		this.property<boolean>(
			`Power outlet ${outletNumber}`,
			{ type: 'Boolean', description: 'Power on outlet ' + outletNumber },
			val => {
				if (val !== undefined) {
					// .find function would be better
					let theOutlet1 = this.outputs.filter(x => x.ID === 1)[0];
					// direct change value
					theOutlet1.State = val ? 1 : 0;

					SimpleHTTP.newRequest(`http://${this.socket.address}/netio.json`).
					post(
						`{ "Outputs":[ { "ID":"${outletNumber}", "Action":"${val ? 1 : 0}" } ] }`,
						'application/json'
					).then(result => {
						this.connected = true;
						let jsonObj = JSON.parse(result.data);
						this.outputs = jsonObj.Outputs;
						this.changed(`Power outlet ${outletNumber}`);
					}).catch(error => this.requestFailed(error))
				}
				const state = this.outputs.filter(x => x.ID == outletNumber)[0];
				if (state) //May be undefined
					return state.State == 1 ? true : false;
			}
		);
	}
}
