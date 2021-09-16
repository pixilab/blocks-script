/**
    WakeOnLan

    requires Blocks version >= 5.x

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

    private static wakeonlanPath = '/usr/local/bin/wakeonlan';

    public constructor(env: ScriptEnv) {
        super(env);
        const processBuilder = SimpleProcess.create('which');
        processBuilder.addArgument('wakeonlan');
        const process = processBuilder.start();
        process.promise.then((value: string) => {
            const path = value.replace(/(\r\n|\n|\r)/gm, '');
            console.log('path:"' + path + '"');
            WakeOnLan.wakeonlanPath = path;
        }).catch((error: any) => {
            console.log(error, process.fullStdErr, process.fullStdOut);
        });
    }

    @callable('wake Spot')
    public wakeSpot(
        @parameter('spot path') spotPath: string,
        @parameter('destination IP', true) ip?: string
    ): void {
        const spot = Spot[spotPath];
        if (spot.isOfTypeName('DisplaySpot')) {
            const displaySpot = spot as DisplaySpot;
            const id = displaySpot.identity;
            if (id.indexOf(MAC_ID_PREFIX) == 0) {
                const mac = id.substr(MAC_ID_PREFIX.length).replace(/(.{2})/g, "$1:").slice(0, 17);
                const process = WakeOnLan.wakeOnLan(mac, ip);
                process.promise.catch((error: any) => {
                    console.error(error);
                });
            }
        }
    }

    @callable('wake device')
    public wakeUp(
        @parameter('MAC') mac: string,
        @parameter('destination IP', true) ip?: string
    ): void {
        const process = WakeOnLan.wakeOnLan(mac, ip);
        process.promise.catch((error: any) => {
            console.error(error);
        });
    }

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
