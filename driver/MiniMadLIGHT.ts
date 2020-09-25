/*
	Driver for controlling a MiniMad LIGHT via OSC signals,
  based on https://madmapper.com/wp-content/uploads/MINIMAD_4_USER_GUIDE-03-09-2020.pdf

 	Copyright (c) 2020 No Parking Production ApS, Denmark (https://noparking.dk). All Rights Reserved.
	Created by: Samuel Walz <mail@samwalz.com>
  Version: 0.1
 */

import * as Meta from 'system_lib/Metadata';
import { OSCviaUDP } from './OSCviaUDP';

@Meta.driver('NetworkUDP', { port: 8010 })
export class MiniMadLIGHT extends OSCviaUDP {

    @Meta.callable('pauses the playback')
    public pause(): void {
        this.sendMessage('/pause');
    }
    @Meta.callable('starts the playback after a pause')
    public play(): void {
        this.sendMessage('/play');
    }
    @Meta.callable('restarts the current sequence')
    public replay(): void {
        this.sendMessage('/replay');
    }
    @Meta.callable('previous sequence')
    public previousMedia(): void {
        this.sendMessage('/previous_sequence');
    }
    @Meta.callable('next sequence')
    public nextMedia(): void {
        this.sendMessage('/next_sequence');
    }
    @Meta.callable('set playback mode')
    public setPlaybackMode(
        @Meta.parameter('playback mode index')
        modeIndex: number
    ): void {
        this.sendMessage('/set_playback_mode/' + modeIndex);
    }
    @Meta.callable('set the current sequence by name, example: "light_sequence_3" to play the sequence called light_sequence_3')
    public setMediaByName(
        @Meta.parameter('sequence name')
        name: string
    ): void {
        this.sendMessage('/set_sequence_by_name/' + name);
    }
    @Meta.callable('set the current sequence by index')
    public setMediaByIndex(
        @Meta.parameter('sequence index')
        index: number
    ): void {
        this.sendMessage('/set_sequence_by_idex/' + index);
    }
    @Meta.callable('set the master audio-level')
    public setMasterAudioLevel(
        @Meta.parameter('audio level')
        audioLevel: number
    ): void {
        var audioLevelString = audioLevel.toString();
        if (audioLevelString.indexOf('.') === -1) audioLevelString += '.0';
        this.sendMessage('/set_master_audio_level', audioLevelString);
    }
    @Meta.callable('set the master luminosity')
    public setMasterAudioLuminosity(
        @Meta.parameter('luminosity level')
        luminosityLevel: number
    ): void {
      var luminosityLevelString = luminosityLevel.toString();
      if (luminosityLevelString.indexOf('.') === -1) luminosityLevelString += '.0';
      this.sendMessage('/set_master_luminosity', luminosityLevelString);
    }

}
