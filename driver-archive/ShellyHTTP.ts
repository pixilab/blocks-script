/**
 * @author Johnny Karhinen
 * @contact johnny@levandeteknik.se
 * @version 1.1
 *
 * One-way REST API (HTTP) control of Shelly device (e.g. mains power switch).
 *
 * The API is documented here: https://shelly-api-docs.shelly.cloud/gen1/
 *
 * 
 * Version history:
 * 1.0 - One way control of Shelly device, Relay 1-4 via HTTP REST API. (Johnny Karhinen, johnny@levandeteknik.se)
 * 1.1 - Bugfixes and changed to zero-based index API request. (Jonas Hjalmarsson, jonas@jalma.se)
 */

import { NetworkTCP } from "../system/Network";
import { SimpleHTTP } from "../system/SimpleHTTP";
import { Driver } from "../system_lib/Driver";
import { driver, property } from "../system_lib/Metadata";

@driver('NetworkTCP', { port: 80 })
export class ShellyHTTP extends Driver<NetworkTCP> {
    private _relay1: boolean = false
    private _relay2: boolean = false
    private _relay3: boolean = false
    private _relay4: boolean = false

    public constructor(
        private socket: NetworkTCP
    ) {
        super(socket)
    }

    @property("Relay 1")
    get relay1(): boolean {
        return this._relay1
    }
    set relay1(on: boolean) {
        this.makeRelayRequest(0, on)
        this._relay1 = on
    }

    @property("Relay 2")
    get relay2(): boolean {
        return this._relay2
    }
    set relay2(on: boolean) {
        this.makeRelayRequest(1, on)
        this._relay2 = on
    }

    @property("Relay 3")
    get relay3(): boolean {
        return this._relay3
    }
    set relay3(on: boolean) {
        this.makeRelayRequest(2, on)
        this._relay3 = on
    }

    @property("Relay 4")
    get relay4(): boolean {
        return this._relay4
    }
    set relay4(on: boolean) {
        this.makeRelayRequest(3, on)
        this._relay4 = on
    }

    private async makeRelayRequest(relayIndex: number, on: boolean) {
        let state = on ? 'on' : 'off'
        return SimpleHTTP.newRequest(`http://${this.socket.address}/relay/${relayIndex}?turn=${state}`).get()
    }
}
