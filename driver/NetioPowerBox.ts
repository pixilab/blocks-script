/*
	Driver for NETIO PowerBOX

 	Copyright (c) 2020 VICREO BV, the Netherlands (https://vicreo.eu). All Rights Reserved.
	Created by: Jeffrey Davidsz <jeffrey.davidsz@vicreo.eu>
  	Version: 1.0.0

 */

import { NetworkTCP } from "system/Network";
import { Driver } from "system_lib/Driver";
import { SimpleHTTP } from "system/SimpleHTTP";
import { driver, property } from "system_lib/Metadata";

/**
 * Use this for making sure the states are in the right format
 * @interface netioOuput
 */
interface netioOuput {
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
	private outputs: Array<netioOuput> = [];

	public constructor(private socket: NetworkTCP) {
		super(socket);

		console.info("Netio PowerBOX instantiated");
		//Get initial status
		SimpleHTTP.newRequest(`http://${socket.address}/netio.json`).get().then((result) => {
			this.connected = true;
			let jsonObj = JSON.parse(result.data);
			this.outputs = jsonObj.Outputs;
		}).catch(error => this.requestFailed(error))

		for (var i = 1; i <= 3; i++) {
			this.createOutlets(i);
		}
	}

	private requestFailed(error: string) {
		this.connected = false;
		console.warn(error);
	}

	/**
	 * Connection status
	 * @memberof NetioPowerBox
	 */
	@property("Verified connection with the Netio PowerBOX", true)
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
		this.property<boolean>(`Power outlet ${outletNumber}`, { type: 'Boolean', description: 'Power on outlet ' + outletNumber }, (val) => {
			if (val !== undefined) {
				// .find function would be better
				let theOutlet1 = this.outputs.filter(x => x.ID == 1)[0];
				// direct change value
				theOutlet1.State = val ? 1 : 0;

				SimpleHTTP.newRequest(`http://${this.socket.address}/netio.json`).post(`{ "Outputs":[ { "ID":"${outletNumber}", "Action":"${val ? 1 : 0}" } ] }`).then((result) => {
					this.connected = true;
					let jsonObj = JSON.parse(result.data);
					this.outputs = jsonObj.Outputs;
					this.changed(`Power outlet ${outletNumber}`);
				}).catch(error => this.requestFailed(error))

			}
			let state = this.outputs.filter(x => x.ID == outletNumber)[0];
			//Check for undefined
			if (state) {
				return state.State == 1 ? true : false;
			}
		})
	}
}
