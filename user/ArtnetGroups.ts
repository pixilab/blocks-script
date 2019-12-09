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
        @parameter("Wanted Value") value: number,
        @parameter("Fade Duration in seconds") duration: number
    ) {
        if (!Artnet[fixtureName]) return;
        var channelNameList: string[] = this.getFixtureChannelNames(fixtureName);
        this.fadeFixtureByChannelNames(fixtureName, channelNameList, value, duration);
    }

    @callable('fade fixture')
    public fadeFixtureChannels(
        @parameter('fixture name') fixtureName: string,
        @parameter('"channelName, channelName, channelName"') channelNames: string,
        @parameter("Wanted Value") value: number,
        @parameter("Fade Duration in seconds") duration: number
    ) {
        var channelNameList: string[] = this.getStringArray(channelNames);
        this.fadeFixtureByChannelNames(fixtureName, channelNameList, value, duration);
    }

    @callable('fade group')
    public fadeGroupTo(
        @parameter('group name') groupName: string,
        @parameter('target value') value: number,
        @parameter('fade duration in seconds') duration: number
    ) {
        this.getGroup(groupName) ?.fadeTo(value, duration);
    }

    @callable('set group value')
    public setGroupValue(
        @parameter('group name') groupName: string,
        @parameter('value') value: number
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
            var fixtureName: string = fixtureNameList[i];
            var channelNameList: string[] = this.getFixtureChannelNames(fixtureName);
            this.getGroup(groupName).addChannels(fixtureName, channelNameList);
        }

    }

    @callable('Add channels of fixture to group')
    public addFixtureChannels(
        @parameter('fixtureName, fixtureName, fixtureName') fixtureNames: string,
        @parameter('"channelName, channelName, channelName"') channelNames: string,
        @parameter('name of group') groupName: string
    ) {
        var fixtureNameList: string[] = this.getStringArray(fixtureNames);
        var channelNameList: string[] = this.getStringArray(channelNames);
        for (let f = 0; f < fixtureNameList.length; f++) {
            var fixtureName: string = fixtureNameList[f];
            for (let i = 0; i < channelNameList.length; i++) {
                this.addChannel(fixtureName, channelNameList[i], groupName);
            }
        }
    }

    @callable('Add channels of fixture to group')
    public addChannels(
        @parameter('"[fixtureName, channelName],[fixtureName, channelName]"') fixtureChannelList: string,
        @parameter('name of group') groupName: string
    ) {
        var fixtureChannelParts: string[][] = this.getStringArrayArray(fixtureChannelList);
        for (let i = 0; i < fixtureChannelParts.length; i++) {
            var fixtureName: string = fixtureChannelParts[i][0].trim();
            var channelName: string = fixtureChannelParts[i][1].trim();
            this.addChannel(fixtureName, channelName, groupName);
        }

    }

    @callable('Add specific channel to group')
    public addChannel(
        @parameter('name of fixture') fixtureName: string,
        @parameter('name of channel') channelName: string,
        @parameter('name of group') groupName: string
    ) {
        this.getGroup(groupName).addChannel(fixtureName, channelName);
    }




    @callable("Fade all lights To Value")
    public massFadeTo(
        @parameter("Wanted Value") value: number,
        @parameter("Fade Duration in seconds") duration: number
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
            var channels: Channel[] = this.getFixtureChannels(fixtureName, '');
            this.recursiveChase(channels, delay);
        }
    }

    private recursiveValue(channels: Channel[], pos: number, value: number, delay: number) {
        if (pos == channels.length) return;
        wait(delay / 2 * 1000).then(() => {
            channels[pos].fadeTo(value, delay);
            this.recursiveValue(channels, pos + 1, value, delay);
        });
    }

    private recursiveChase(channels: Channel[], delay: number) {
        this.recursiveValue(channels, 0, 1, delay);
        wait(delay * 1000).then(() => {
            this.recursiveValue(channels, 0, this.mLightOffValue, delay);
        });
    }

    private fadeFixtureByChannelNames(
        fixtureName: string,
        channelNames: string[],
        value: number,
        duration: number
    ) {
        if (!Artnet[fixtureName]) return;
        for (let i = 0; i < channelNames.length; i++) {
            Artnet[fixtureName][channelNames[i]] ?.fadeTo(value, duration);
        }
    }

    private padStart(value: string, minLength: number, padWith: string): string {
        var result: string = value;
        while (result.length < minLength) {
            result = padWith + result;
        }
        return result;
    }

    private getFixtures(fixtureNames: string): Fixture[] {
        var fixtureNameList: string[] = this.getStringArray(fixtureNames);
        var fixtures: Fixture[] = [];
        for (let i = 0; i < fixtureNameList.length; i++) {
            var fixtureName: string = fixtureNameList[i];
            var fixture: Fixture = Artnet[fixtureName];
            if (fixture) fixtures.push(fixture);
        }
        return fixtures;
    }

    private getFixtureChannels(fixtureName: string, channelNames: string): Channel[] {
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
        try {
            result = JSON.parse('[' + list + ']');
            return result;
        }
        catch (e) {
        }
        var listParts: string[] = split(list, { separator: ',', quotes: true, brackets: { '[': ']' } });
        for (let i = 0; i < listParts.length; i++) {
            var listPart: string = listParts[i].trim();
            result.push(listPart);
        }
        return result;
    }

    private getStringArrayArray(list: string): string[][] {
        var result: string[][] = [];
        try {
            result = JSON.parse('[' + list + ']');
            return result;
        }
        catch (e) {
        }
        var listParts: string[] = split(list, { separator: ',', quotes: true, brackets: { '[': ']' } });
        for (let i = 0; i < listParts.length; i++) {
            var listPart: string = listParts[i].trim();
            if (this.isEncodedArray(listPart)) {
                var array: string[] = split(listPart.substr(1, listPart.length - 2), { separator: ',', quotes: true, brackets: { '[': ']' } });

                result.push(array);
            }
        }
        return result;
    }

    private isEncodedArray(possibleArray: string): boolean {
        if (possibleArray.length < 2) return false;
        return possibleArray[0] == '[' && possibleArray[possibleArray.length - 1] == ']';
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
            channel.value = channel.maxValue > 1 ? value * 255.0 : value;
        }
    }

    get channels(): AnalogChannel[] {
        return this.mChannels;
    }


    public addFixture(fixtureName: string, channelNamePrefix: string, min: number, max: number) {
        if (!Artnet[fixtureName]) return;

        for (let i = min; i < max; i++) {
            const channelName = channelNamePrefix + (i < 10 ? '0' : '') + i;
            this.addChannel(fixtureName, channelName);
        }
    }
    public addChannels(fixtureName: string, channelNames: string[]) {
        if (!Artnet[fixtureName]) return;
        for (let i = 0; i < channelNames.length; i++) {
            this.addChannel(fixtureName, channelNames[i]);
        }
    }
    public addChannel(fixtureName: string, channelName: string) {
        var fixture: Fixture = Artnet[fixtureName];
        if (!fixture) return;
        var channel = fixture[channelName];
        if (!channel) return;
        if (!channel.isOfTypeName('AnalogChannel')) return;
        const analogChannel: AnalogChannel = channel as AnalogChannel;
        this.mChannels.push(analogChannel);
    }

    public fadeTo(value: number, duration: number
    ): void {
        for (let i = 0; i < this.mChannels.length; i++) {
            var channel: AnalogChannel = this.mChannels[i];
            channel.fadeTo(channel.maxValue > 1 ? value * 255.0 : value, duration);
        }
    }


}
interface Dictionary<Group> {
    [id: string]: Group;
}
