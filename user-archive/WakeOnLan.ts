/**
    WakeOnLan user script for Blocks. Sends a WoL "magic packet" to a Display Spot
    (assuming its MAC address can be obtained from its ID). Works only under Linux
    versions that have the 'wakeonlan' command line program. Blocks' built-in
    ability to power up display spots works under the assumption that those spots
    are on the local subnet (or the subnet specified using the defaultNetwork
    option in the configuration file). This script allows a WoL message to be
    sent to any subnet.

    NOTE: Requires Blocks version >= 5.x

    Copyright (c) 2021 No Parking Production ApS, Denmark (https://noparking.dk). All Rights Reserved.
    Created by: Samuel Walz <mail@samwalz.com>

Features:
    0.1.0
        - wake on LAN command

 */
const VERSION: string = '0.1.0';

import { Process, SimpleProcess } from '../system/SimpleProcess';
import { DisplaySpot, Spot } from '../system/Spot';
import { callable, parameter } from '../system_lib/Metadata';
import { Script, ScriptEnv } from '../system_lib/Script';

const MAC_ID_PREFIX = 'MAC_';

export class WakeOnLan extends Script {

    private static wakeonlanPath = '/usr/local/bin/wakeonlan'; // Default path

    public constructor(env: ScriptEnv) {
        super(env);

        // Use the 'which' command to find the actual path to wakeonlan
        const processBuilder = SimpleProcess.create('which');
        processBuilder.addArgument('wakeonlan');
        const process = processBuilder.start();
        process.promise.then((value: string) => {
            const path = value.replace(/(\r\n|\n|\r)/gm, '');
            console.log('path:"' + path + '"');
            WakeOnLan.wakeonlanPath = path;
        }).catch((error: any) => {
            console.log(
            	"Failed using 'which' to locate wakeonlan - using default at", WakeOnLan.wakeonlanPath,
            	error, process.fullStdErr, process.fullStdOut
			);
        });
    }

    @callable('Wake up Display Spot')
    public wakeSpot(
        @parameter('Full dot-separated path to a Display Spot') spotPath: string,
        @parameter('Destination IP (e.g., subnet-specific broadcast address)', true) ip?: string
    ): void {
        const spot = Spot[spotPath];
        if (spot.isOfTypeName('DisplaySpot')) {
            const displaySpot = spot as DisplaySpot;
            const id = displaySpot.identity;
            if (id.indexOf(MAC_ID_PREFIX) == 0) {
                const mac = id.substr(MAC_ID_PREFIX.length).replace(/(.{2})/g, "$1:").slice(0, 17);
                const process = WakeOnLan.wakeOnLan(mac, ip);
                process.promise.catch((error: any) =>
                    console.error("Failed running wakeonlan command line program", error)
                );
            } else
            	console.error("Can't get MAC address from spot ID", id);
        }
    }

    @callable('Wake up device at specified MAC address')
    public wakeUp(
        @parameter('MAC address of device') mac: string,
        @parameter('Destination IP (e.g., subnet-specific broadcast address)', true) ip?: string
    ): void {
        const process = WakeOnLan.wakeOnLan(mac, ip);
        process.promise.catch((error: any) => {
            console.error("Failed running wakeonlan command line program", error);
        });
    }

	/**
	 * Create and run command external line program program to wake up device at specified 'mac'
	 * address, optionally specifying the target IP address (typically a subnet-specific broadcast
	 * address).
	 */
    public static wakeOnLan(mac: string, ip?: string): Process {
        const processBuilder = SimpleProcess.create(this.wakeonlanPath);
        if (ip) {
            processBuilder.addArgument('-i' + ip);
            processBuilder.addArgument('-p9');
        }
        processBuilder.addArgument(mac);
        return processBuilder.start();
    }
}
