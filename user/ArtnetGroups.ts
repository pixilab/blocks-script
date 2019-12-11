/*
	Script for added Artnet convenience

 	Copyright (c) 2019 No Parking Production ApS, Denmark (https://noparking.dk). All Rights Reserved.
	Created by: Samuel Walz <mail@samwalz.com>
  Version: 0.1
  Features:
  - group channels
  - master fade all channels of a fixture

  advice: ideally all used channels should be normalised
 */

import { Artnet, Fixture, Channel, AnalogChannel } from "system/Artnet";
import { Script, ScriptEnv } from "system_lib/Script";
import { callable, max, min, parameter, property } from "system_lib/Metadata";

const CHANNEL_NAME_PREFIX = 'L_';
const CHANNEL_NAME_DIGITS = 2;

const MIN_CHANNEL = 1;
const MAX_CHANNEL = 42;

const split: any = require("lib/split-string");

export class ArtnetGroups extends Script {
    private mFadeOnDuration = 1.2;
    private mFadeOffDuration = 5.0;
    private mLightOffValue = 0.0;
    private mMinChannel = MIN_CHANNEL;
    private mMaxChannel = MAX_CHANNEL;
    private mDebug = false;
    private mValue = 0.0;
    private mChannelNamePrefix = CHANNEL_NAME_PREFIX;
    private mChannelNameDigits = CHANNEL_NAME_DIGITS;

    private groups: Dictionary<ArtnetGroup> = {};
    private fixtureChannelNames: Dictionary<string[]> = {};

    public constructor(env: ScriptEnv) {
        super(env);
        console.log('ArtnetGroups instantiated');

    }

    @property('Debug Mode on/off')
    set debug(value: boolean) {
        this.mDebug = value;
    }
    get debug(): boolean {
        return this.mDebug;
    }

    @property('All Lights To Value')
    set value(value: number) {
        if (value > 1.0) value = value / 255.0;
        for (var key in this.groups) {
            this.groups[key].value = value;
        }
        this.mValue = value;
    }
    get value(): number {
        return this.mValue;
    }

    @callable('set channel names for fixtures (fx with of type)')
    public setFixtureChannelNames(
        @parameter('fixtureName, fixtureName, fixtureName') fixtureNames: string,
        @parameter('channelName, channelName, channelName') channelNames: string,
    ) {
        var fixtureNameList: string[] = this.getStringArray(fixtureNames);
        var channelNameList: string[] = this.getStringArray(channelNames);
        for (let i = 0; i < fixtureNameList.length; i++) {
            this.fixtureChannelNames[fixtureNameList[i]] = channelNameList;
        }
    }

    @callable('fade fixture')
    public fadeFixture(
        @parameter('fixture name') fixtureName: string,
        @parameter('target value. Normalised range: 0 .. 1') value: number,
        @parameter('duration in seconds') duration: number
    ) {
        var channels: AnalogChannel[] = this.getAnalogChannels(this.getFixtureChannels(fixtureName, ''));
        this.fadeChannels(channels, value, duration);
    }

    @callable('fade fixture')
    public fadeFixtureChannels(
        @parameter('fixture name') fixtureName: string,
        @parameter('channelName, channelName, channelName') channelNames: string,
        @parameter('target value. Normalised range: 0 .. 1') value: number,
        @parameter('duration in seconds') duration: number
    ) {
        var channels: AnalogChannel[] = this.getAnalogChannels(this.getFixtureChannels(fixtureName, channelNames));
        this.fadeChannels(channels, value, duration);
    }

    @callable('fade group')
    public fadeGroupTo(
        @parameter('group name') groupName: string,
        @parameter('target value. Normalised range: 0 .. 1') value: number,
        @parameter('fade duration in seconds') duration: number
    ) {
        this.getGroup(groupName) ?.fadeTo(value, duration);
    }

    @callable('set group value')
    public setGroupValue(
        @parameter('group name') groupName: string,
        @parameter('target value. Normalised range: 0 .. 1') value: number
    ) {
        var group: ArtnetGroup = this.getGroup(groupName);
        if (!group) return;
        group.value = value;
    }

    @callable('settings for addFixture and addFixtures')
    public addFixtureSettings(
        @parameter('defaults to "' + CHANNEL_NAME_PREFIX + '"') channelNamePrefix: string,
        @parameter('defaults to ' + MIN_CHANNEL) minChannel: number,
        @parameter('defaults to ' + MAX_CHANNEL) maxChannel: number,
        @parameter('defaults to ' + CHANNEL_NAME_DIGITS + '. If maxChannel is too large, this value will be automatically adjusted to fit maxChannel') channelNameDigits: number,
    ) {
        this.mChannelNamePrefix = channelNamePrefix;
        this.mMinChannel = minChannel;
        this.mMaxChannel = maxChannel;
        var neededDigits: number = maxChannel.toString().length;
        this.mChannelNameDigits = Math.max(channelNameDigits, neededDigits);
    }

    @callable('Reset setup (delete all groups)')
    public reset() {
        this.groups = {};
        this.fixtureChannelNames = {};
    }

    @callable('Add complete fixtures to group (channel names have to follow the naming scheme "L_01, L_02, L_03, L_04, L_05")')
    public addFixtures(
        @parameter('fixtureName, fixtureName, fixtureName') fixtureNames: string,
        @parameter('name of group') groupName: string
    ) {
        var fixtureNameList: string[] = this.getStringArray(fixtureNames);
        for (let i = 0; i < fixtureNameList.length; i++) {
            var channels: Channel[] = this.getFixtureChannels(fixtureNameList[i]);
            this.getGroup(groupName).addChannels(channels);
        }
    }

    @callable('Add channels of fixture to group')
    public addFixtureChannels(
        @parameter('fixtureName, fixtureName, fixtureName') fixtureNames: string,
        @parameter('channelName, channelName, channelName') channelNames: string,
        @parameter('name of group') groupName: string
    ) {
        var fixtureNameList: string[] = this.getStringArray(fixtureNames);
        for (let f = 0; f < fixtureNameList.length; f++) {
            var channels: Channel[] = this.getFixtureChannels(fixtureNameList[f], channelNames);
            this.getGroup(groupName).addChannels(channels);
        }
    }

    @callable('Fade all lights To Value')
    public massFadeTo(
        @parameter('target value. Normalised range: 0 .. 1') value: number,
        @parameter('duration in seconds') duration: number
    ): void {
        if (value > 1.0) value = value / 255.0;
        for (var key in this.groups) {
            this.groups[key].fadeTo(value, duration);
        }
    }

    @callable("Reset All Lights")
    public resetAllLights(): void {
        for (var key in this.groups) {
            this.groups[key].fadeTo(this.mLightOffValue, this.mFadeOffDuration);
        }
    }

    @callable("Animate Group ('chase')")
    public animateGroup(groupName: string, delay: number, style: string): void {
        if (style == 'chase') {
            var channels: AnalogChannel[] = this.getGroupChannels(groupName);
            this.recursiveChase(channels, delay);
        }
    }

    @callable("Animate Fixture ('chase')")
    public animateFixture(fixtureName: string, delay: number, style: string): void {
        if (style == 'chase') {
            var channels: AnalogChannel[] = this.getAnalogChannels(this.getFixtureChannels(fixtureName, ''));
            this.recursiveChase(channels, delay);
        }
    }

    private recursiveValue(channels: AnalogChannel[], pos: number, value: number, delay: number) {
        if (pos == channels.length) return;
        wait(delay / 2 * 1000).then(() => {
            var channel: AnalogChannel = channels[pos];
            channel.fadeTo(value * channel.maxValue, delay);
            this.recursiveValue(channels, pos + 1, value, delay);
        });
    }

    private recursiveChase(channels: AnalogChannel[], delay: number) {
        this.recursiveValue(channels, 0, 1, delay);
        wait(delay * 1000).then(() => {
            this.recursiveValue(channels, 0, this.mLightOffValue, delay);
        });
    }

    private fadeChannels(channels: AnalogChannel[], value: number, duration: number) {
        for (let i = 0; i < channels.length; i++) {
            var channel: AnalogChannel = channels[i];
            channel.fadeTo(value * channel.maxValue, duration);
        }
    }

    private padStart(value: string, minLength: number, padWith: string): string {
        var result: string = value;
        while (result.length < minLength) {
            result = padWith + result;
        }
        return result;
    }

    private getFixtureChannels(fixtureName: string, channelNames?: string): Channel[] {
        var fixture = Artnet[fixtureName];
        if (!fixture) return [];
        var channels: Channel[] = [];
        var channelNameList: string[] = channelNames && channelNames.trim().length > 0 ?
            this.getStringArray(channelNames) : this.getFixtureChannelNames(fixtureName);
        for (let i = 0; i < channelNameList.length; i++) {
            var channel: Channel = fixture[channelNameList[i]];
            if (channel) channels.push(channel);
        }
        return channels;
    }

    private getAnalogChannels(channels: Channel[]): AnalogChannel[] {
        var analogChannels: AnalogChannel[] = [];
        for (let i = 0; i < channels.length; i++) {
            var channel: Channel = channels[i];
            if (!channel.isOfTypeName('AnalogChannel')) return;
            const analogChannel: AnalogChannel = channel as AnalogChannel;
            analogChannels.push(analogChannel);
        }
        return analogChannels;
    }

    private getFixtureChannelNames(fixtureName: string): string[] {
        var channelNameList: string[] = [];
        if (this.fixtureChannelNames[fixtureName]) {
            channelNameList = this.fixtureChannelNames[fixtureName];
        }
        else {
            for (let i = this.mMinChannel; i < this.mMaxChannel; i++) {
                var channelName: string = this.mChannelNamePrefix + this.padStart(i.toString(10), this.mChannelNameDigits, '0');
                channelNameList.push(channelName);
            }
        }
        return channelNameList;
    }

    private getGroup(groupName: string): ArtnetGroup {
        if (!this.groups[groupName]) {
            this.groups[groupName] = new ArtnetGroup();
        }
        return this.groups[groupName];
    }

    private getGroupChannels(groupName: string): AnalogChannel[] {
        var group: ArtnetGroup = this.getGroup(groupName);
        if (!group) return [];
        return group.channels;
    }

    private getStringArray(list: string): string[] {
        var result: string[] = [];
        var listParts: string[] = split(list,
            { separator: ',', quotes: ['"', '\''], brackets: { '[': ']' } }
        );
        for (let i = 0; i < listParts.length; i++) {
            var listPart: string = this.removeQuotes(listParts[i].trim());
            result.push(listPart);
        }
        return result;
    }

    private removeQuotes(value: string): string {
        if (value.length < 2) return value;
        const QUOTATION = '"';
        const APOSTROPHE = '\'';
        var first: string = value.charAt(0);
        var last: string = value.charAt(value.length - 1);
        if (
            (first == QUOTATION && last == QUOTATION) ||
            (first == APOSTROPHE && last == APOSTROPHE)
        ) {
            return value.substr(1, value.length - 2);
        }
        return value;
    }

    private random(
        min: number,
        max: number
    ): number {
        return Math.random() * (max - min) + min;
    }

    private randomInt(
        min: number,
        max: number
    ): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

}

class ArtnetGroup {
    private mChannels: AnalogChannel[] = [];

    set value(value: number) {
        for (let i = 0; i < this.mChannels.length; i++) {
            var channel: AnalogChannel = this.mChannels[i];
            channel.value = value * channel.maxValue;
        }
    }

    get channels(): AnalogChannel[] {
        return this.mChannels;
    }

    public addChannel(channel: Channel) {
        if (!channel.isOfTypeName('AnalogChannel')) return;
        const analogChannel: AnalogChannel = channel as AnalogChannel;
        this.mChannels.push(analogChannel);
    }

    public addChannels(channels: Channel[]) {
        for (let i = 0; i < channels.length; i++) {
            this.addChannel(channels[i]);
        }
    }

    public fadeTo(value: number, duration: number) {
        for (let i = 0; i < this.mChannels.length; i++) {
            var channel: AnalogChannel = this.mChannels[i];
            channel.fadeTo(value * channel.maxValue, duration);
        }
    }


}
interface Dictionary<Group> {
    [id: string]: Group;
}
