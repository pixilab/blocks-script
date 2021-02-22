/*
	Driver for controlling a ENTTECT S-Play via OSC signals,
  based on http://dol2kh495zr52.cloudfront.net/pdf/misc/SPLAY_OSC_api_spec.pdf

 	Copyright (c) 2021 No Parking Production ApS, Denmark (https://noparking.dk). All Rights Reserved.
	Created by: Samuel Walz <mail@samwalz.com>
  Version: 0.1
 */

import * as Meta from 'system_lib/Metadata';
import { OSCviaUDP } from './OSCviaUDP';
import { NetworkUDP } from '../system/Network';

@Meta.driver('NetworkUDP', { port: 8000 })
export class EnttecSPlay extends OSCviaUDP {

    private m_masterIntensity: number = 1.0;

    public constructor(socket: NetworkUDP) {
        super(socket);
        socket.subscribe('textReceived', (sender, message) => {
			console.log(message.text);
		});
    }

	/**
	 * Allow clients to check for my type, just as in some system object classes
	 */
	isOfTypeName(typeName: string) {
		return typeName === "EnttecSPlay" ? this : super.isOfTypeName(typeName);
	}

    @Meta.property('master intensity')
    @Meta.min(0.0)
    @Meta.min(1.0)
    public set masterIntensity(value: number) {
        this.m_masterIntensity = value;
        this.sendMessage('/splay/master/intensity', value.toFixed(3));
    }
    public get masterIntensity(): number {
        return this.m_masterIntensity;
    }

    @Meta.callable('start all / specific playlist')
    public play(
        @Meta.parameter('playlist ID', true) id?: number
    ): void {
        const playlistID = id == undefined ? 'all' : id;
        this.sendMessage('/splay/playlist/play/' + playlistID);
    }
    @Meta.callable('pause all / specific playlist')
    public pause(
        @Meta.parameter('playlist ID', true) id?: number
    ): void {
        const playlistID = id == undefined ? 'all' : id;
        this.sendMessage('/splay/playlist/pause/' + playlistID);
    }
    @Meta.callable('stop all / specific playlist')
    public stop(
        @Meta.parameter('playlist ID', true) id?: number
    ): void {
        const playlistID = id == undefined ? 'all' : id;
        this.sendMessage('/splay/playlist/stop/' + playlistID);
    }

    @Meta.callable('set master / playlist intensity')
    public setIntensity(
        @Meta.parameter('intensity (0..1)') intensity: number,
        @Meta.parameter('playlist ID', true) id?: number
    ): void {
        const intensityString = intensity.toFixed(3);
        if (id == undefined) {
            this.sendMessage('/splay/master/intensity', intensityString);
        } else {
            this.sendMessage('/splay/playlist/intensity/' + id, intensityString);
        }
    }



}
