/*
 * Created 2018 by Sam Walz.
 */

import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import * as Meta from "system_lib/Metadata";

/**
 A driver using a UDP socket for communicating with a "device" running Zumma.

 The port value specified indicates the default UDP port number,
 selected automatically when chosing this driver. The 'NetworkUDP' string
 specifies that this driver is intended for that type of subsystem, and
 its constructor will accept that type.
 */
@Meta.driver('NetworkTCP', { port: 32401 })
export class ZummaPC extends Driver<NetworkTCP> {
	// IMPORTANT: The class name above MUST match the name of the
	// file (minus its extension).

    private powerState: boolean;

	private poweringUp: Promise<void>;	// Set while waiting to be powered up
    private powerUpResolver: (value?: any) => void;

    private shuttingDown: Promise<void>;
    private shutDownResolver: (value?: any) => void;

    protected connecting: boolean;				// Has initiated a connection attempt
    private connectedToZumma: boolean;

	/**
	 * Create me, attached to the network socket I communicate through. When using a
	 * driver, the driver replaces the built-in functionality of the network socket
	 with the properties and callable functions exposed.
	 */
	public constructor(private socket: NetworkTCP) {
		super(socket);
        socket.enableWakeOnLAN();
		socket.autoConnect(false);

        socket.subscribe('connect', (sender, message)=> {
			// console.info('connect msg', message.type);
			this.connectStateChanged()
		});
	}


    @Meta.property("Connected to Zumma", true)
	public set connected(online: boolean) {
		this.connectedToZumma = online;
		// console.info("Connection state", online)
	}
	public get connected(): boolean {
		return this.connectedToZumma;
	}

    /**
	 * Passthrough for sending raw commands frmo tasks and client scripts.
	 * Comment out @callable if you don't want to expose sending raw command strings to tasks.
	 */
	@Meta.callable("Send raw command string to device")
	public sendText(
		@Meta.parameter("What to send") text: string,
	): Promise<any> {
		return this.socket.sendText(text, null);
	}

	/**
	 * Tell Zumma something through the UDP socket. Funnel most commands through here
	 * to also allow them to be logged, which makes testing easier.
	 */
	private tell(data: string) {
		// console.info('tell', data);
		this.socket.sendText(data, null);
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
    * Is PC online (powered up and connected)?
    */
    @Meta.property("Is device online?")
    public get online(): boolean {
        return this.socket.connected;
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
    public shutDown(): Promise<void> {
        if (this.powerState) {
            this.powerState = false;		// Indicates desired state
            this.changed('power');
        }
        return this.powerDown();
    }

    /**
     * Send wake-on-LAN, unless one is already in progress.
     * Return promise resolved once powered up.
     */
    private powerUp2(): Promise<void> {
        if (!this.socket.connected &&
            !this.poweringUp) {
            this.socket.wakeOnLAN();
            this.poweringUp = new Promise<void>((resolve, reject)=> {
                this.powerUpResolver = resolve;
                wait(90000).then(()=> {
                    reject("Timeout");
                    delete this.poweringUp;
                    delete this.powerUpResolver;
                });
            });
        }
        return this.poweringUp;
    }

    // Send command to turn power off
    private powerDown(): Promise<void> {
        if (this.socket.connected &&
            !this.shuttingDown) {
            this.tell("stop");
            this.shuttingDown = new Promise<void>((resolve, reject)=> {
                this.shutDownResolver = resolve;
                // wait sec to lose Zumma connection
                wait(35000).then(()=> {
                    reject("Timeout");
                    delete this.shuttingDown;
                    delete this.shutDownResolver;
                });
            });
        }
        return this.shuttingDown;
    }

    private connectStateChanged() {
        if (this.socket.connected) {
			if (this.powerUpResolver) {
				this.poweringUp.then(()=>
					this.nowPowered()
				);
                this.powerUpResolver(true);
                console.log("ZummaPC powered up successfully");
				delete this.powerUpResolver;
				delete this.poweringUp;
			} else
				this.nowPowered();
		} else {
            if (this.shutDownResolver) {
                this.shutDownResolver(wait(25000));
                this.shuttingDown.then(()=>{
                    this.nowPowerless();
                });
                delete this.shutDownResolver;
                delete this.shuttingDown;
            } else {
                this.nowPowerless();
            }
        }
		// console.info("connectStateChanged", this.socket.connected);
		this.connected = this.socket.connected; // Propagate state to clients

	}

    private nowPowered() {
		if (this.powerState === undefined)	// Never set
			this.powerState = true;		// Consider power to be on now

        // supposed to be off
		// if (!this.powerState) {
        //     this.powerDown();
        // }
	}

    private nowPowerless() {
        if (this.powerState === undefined)
            this.powerState = false;

        // supposed to be on
        if (this.powerState)
            this.powerUp();
    }


}
