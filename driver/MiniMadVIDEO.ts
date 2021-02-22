/*
	Driver for controlling a MiniMad VIDEO via OSC signals,
  based on https://madmapper.com/wp-content/uploads/MINIMAD_4_USER_GUIDE-03-09-2020.pdf

 	Copyright (c) 2020 No Parking Production ApS, Denmark (https://noparking.dk). All Rights Reserved.
	Created by: Samuel Walz <mail@samwalz.com>
  Version: 0.1
 */

import * as Meta from 'system_lib/Metadata';
import { OSCviaUDP } from './OSCviaUDP';



@Meta.driver('NetworkUDP', { port: 8010 })
export class MiniMadVIDEO extends OSCviaUDP {

	/**
	 * Allow clients to check for my type, just as in some system object classes
	 */
	isOfTypeName(typeName: string) {
		return typeName === "MiniMadVIDEO" ? this : super.isOfTypeName(typeName);
	}

    @Meta.callable('pauses the playback')
    public pause(): void {
        this.sendMessage('/pause');
    }
    @Meta.callable('starts the playback after a pause')
    public play(): void {
        this.sendMessage('/play');
    }
    @Meta.callable('restarts the current media')
    public replay(): void {
        this.sendMessage('/replay');
    }
    @Meta.callable('previous media')
    public previousMedia(): void {
        this.sendMessage('/previous_media');
    }
    @Meta.callable('next media')
    public nextMedia(): void {
        this.sendMessage('/next_media');
    }
    @Meta.callable('set playback mode')
    public setPlaybackMode(
        @Meta.parameter('playback mode index')
        modeIndex: number
    ): void {
        this.sendMessage('/set_playback_mode/' + modeIndex);
    }
    @Meta.callable('set the current media by name, example: "machine-1.mov" will play movie called machine-1 (on miniMAD movies have the .mov extension, images the .png extension)')
    public setMediaByName(
        @Meta.parameter('media name')
        name: string
    ): void {
        this.sendMessage('/set_media_by_name/' + name);
    }
    @Meta.callable('set the current media by index')
    public setMediaByIndex(
        @Meta.parameter('media index')
        index: number
    ): void {
        this.sendMessage('/set_media_by_idex/' + index);
    }
    @Meta.callable('change the image display time in seconds')
    public setImageTime(
        @Meta.parameter('display time')
        displayTime: number
    ): void {
        this.sendMessage('/set_image_time', Math.floor(displayTime).toString());
    }
    @Meta.callable('master audio-level for the targeted MiniMad')
    public setMasterAudioLevel(
        @Meta.parameter('audio level')
        audioLevel: number
    ): void {
        var audioLevelString = audioLevel.toString();
        if (audioLevelString.indexOf('.') === -1) audioLevelString += '.0';
        this.sendMessage('/set_master_audio_level', audioLevelString);
    }
    @Meta.callable('master luminosity for targeted or all connected MiniMads')
    public setMasterAudioLuminosity(
        @Meta.parameter('luminosity level')
        luminosityLevel: number,
        @Meta.parameter('set for all connected MiniMads? (default: false)', true)
        setForAll?: boolean
    ): void {
      var luminosityLevelString = luminosityLevel.toString();
      if (luminosityLevelString.indexOf('.') === -1) luminosityLevelString += '.0';
      this.sendMessage('/set_master_luminosity' + (setForAll ? '/all' : ''), luminosityLevelString);
    }

}
