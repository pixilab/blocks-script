/**
 * A very basic driver for Medialon AppLauncher
 *
 *
 *
 * Copyright (c) 2022 No Parking Production ApS, Denmark (https://noparking.dk). All Rights Reserved.
 * Author: Samuel Walz <mail@samwalz.com>
 */

import {NetworkTCP} from "system/Network";
import {NetworkDriver} from "system_lib/NetworkDriver";
import * as Meta from "system_lib/Metadata";

const CMD_SHUTDOWN =         [0xff, 0x16, 0x01, 0x30, 0x30, 0x30, 0x31, 0x32, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xfe];
const CMD_RESTART_COMPUTER = [0xff, 0x16, 0x01, 0x30, 0x30, 0x30, 0x31, 0x31, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xfe];
const CMD_RESTART_WINDOWS =  [0xff, 0x16, 0x01, 0x30, 0x30, 0x30, 0x31, 0x30, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xfe];

@Meta.driver('NetworkTCP', { port: 4550 })
export class MedialonAppLauncher extends NetworkDriver {
    private _socket: NetworkTCP;
    private _power: boolean;
    private _shuttingDown: boolean;
    public constructor(private socket: NetworkTCP) {
        super(socket);
        this._socket = socket;
        socket.enableWakeOnLAN();
        socket.autoConnect(true);

        socket.subscribe("textReceived", (sender, message) => {
            console.info("Data received", message.text);
        });
        socket.subscribe('connect', ((sender, message) => {
            if (this._shuttingDown) return;
            switch (message.type) {
                case "Connection":
                    this.setPowerState(true);
                    break;
                case "ConnectionFailed":
                    this.setPowerState(false);
                    break;
            }
        }));
    }
    /** Allow clients to check for my type, just as in some system object classes */
    isOfTypeName(typeName: string) { return typeName === "MedialonAppLauncher" ? this : null; }

	@Meta.property('Power on/off')
	public set power(on: boolean) {
		this._power = on;
		if (on) this.sendWakeOnLAN();
		else {
			this._shuttingDown = true;
			this.shutdown().finally(() => {
				wait(1000).then(()=> {
					this._shuttingDown = false;
				});
			});
		}
	}
	public get power(): boolean {
		return this._power;
	}
	private setPowerState(on: boolean) {
		if (this._power != on) {
			this._power = on;
			this.changed('power');
		}
	}

	@Meta.callable('Restart Windows')
	public restartWindows(): Promise<void> {
		return this._socket.sendBytes(CMD_RESTART_WINDOWS);
	}
	@Meta.callable('Restart PC')
	public restart(): Promise<void> {
		return this._socket.sendBytes(CMD_RESTART_COMPUTER);
	}
	@Meta.callable('Shutdown PC')
	public shutdown(): Promise<void> {
		return this._socket.sendBytes(CMD_SHUTDOWN);
	}
    @Meta.callable('Send WakeOnLAN')
    public sendWakeOnLAN(): void {
		this._socket.wakeOnLAN();
    }

}
