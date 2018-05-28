/*
 * Created 2017 by Mike Fahl.
 */

import {NetworkUDP} from "system/Network";
import {Driver} from "system_lib/Driver";
import * as Meta from "system_lib/Metadata";

/**
 A driver using a UDP socket for communicating with a "device" running Zumma.

 The port value specified indicates the default UDP port number,
 selected automatically when chosing this driver. The 'NetworkUDP' string
 specifies that this driver is intended for that type of subsystem, and
 its constructor will accept that type.
 */
@Meta.driver('NetworkUDP', { port: 32400 })
export class ZummaPC extends Driver<NetworkUDP> {
	// IMPORTANT: The class name above MUST match the name of the
	// file (minus its extension).

    private powerState: boolean;

	private poweringUp: Promise<void>;	// Set while waiting to be powered up
    private powerUpResolver: (value?: any) => void;

	/**
	 * Create me, attached to the network socket I communicate through. When using a
	 * driver, the driver replaces the built-in functionality of the network socket
	 with the properties and callable functions exposed.
	 */
	public constructor(private socket: NetworkUDP) {
		super(socket);
        socket.enableWakeOnLAN();
	}


	/**
	 * Tell Zumma something through the UDP socket. Funnel most commands through here
	 * to also allow them to be logged, which makes testing easier.
	 */
	private tell(data: string) {
		// console.info('tell', data);
		this.socket.sendText(data);
	}


    /**
     Turn power on/off. Turning off is instant. Turning on takes depending on PC,
     and is implemented through WoL
     As an alternative to setting power to true, call powerUp()
     and await its returned promise.
     */
    @Meta.property("Power on/off")
    public set power(on: boolean) {
        if (this.powerState != on) {
            this.powerState = on;
            if (on)
                this.powerUp2();	// This takes a while
            else 	// Tell display to power down
                this.powerDown();
        }
        // console.log("Sent", cmd);
    }
    /**
     Get current power state, if known, else undefined.
     */
    public get power(): boolean {
        return this.powerState;
    }

    /**
     * Power up using wake-on-LAN. Returned promise resolved
     * once connected.
     */
    @Meta.callable("Power up using wake-on-LAN")
    public powerUp(): Promise<void> {
        if (!this.powerState) {
            this.powerState = true;		// Indicates desired state
            this.changed('power');
        }
        return this.powerUp2();
    }

    /**
     * Power down using Zumma
     */
    @Meta.callable("Shut down using Zumma")
    public shutDown() {
        this.powerDown();
    }

    /**
     * Send wake-on-LAN, unless one is already in progress.
     * Return promise resolved once powered up.
     */
    private powerUp2(): Promise<void> {
        if (!this.poweringUp) {
            this.socket.wakeOnLAN();
            this.poweringUp = new Promise<void>((resolver, rejector)=> {
                this.powerUpResolver = resolver;
                wait(40000).then(()=> {
                    rejector("Timeout");
                    delete this.poweringUp;
                    delete this.powerUpResolver;
                });
            });
        }
        return this.poweringUp;
    }

    // Send command to turn power off
    private powerDown() {
        this.tell("stop");
    }


}
