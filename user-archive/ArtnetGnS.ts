/*
	Script for added Artnet convenience

 	Copyright (c) 2019 No Parking Production ApS, Denmark (https://noparking.dk). All Rights Reserved.
	Created by: Samuel Walz <mail@samwalz.com>
  Version: 0.85
  Features:
  - groups (grouping fixtures and channels)
  - master fade all channels of a fixture
  - scenes (adding fixtures & channels to scenes)

 */

import { Artnet, Fixture, Channel, AnalogChannel } from "system/Artnet";
import { Script, ScriptEnv } from "system_lib/Script";
import { callable, max, min, parameter, property } from "system_lib/Metadata";

const CHANNEL_NAME_PREFIX = 'L_';
const CHANNEL_NAME_DIGITS = 2;

const MIN_CHANNEL = 1;
const MAX_CHANNEL = 42;

const MS_PER_S = 1000;

const split: any = require("lib/split-string");

/**
 * ArtnetGnS : Artnet Groups & scenes
 */
export class ArtnetGnS extends Script {
    private mFadeDuration = 1.0;
    private mLightOffValue = 0.0;
    private mMinChannel = MIN_CHANNEL;
    private mMaxChannel = MAX_CHANNEL;

    private mValue = 0.0;
    private mChannelNamePrefix = CHANNEL_NAME_PREFIX;
    private mChannelNameDigits = CHANNEL_NAME_DIGITS;

    private groups: Dictionary<ArtnetGroup> = {};
    private scenes: Dictionary<ArtnetScene> = {};
    private fixtureChannelNames: Dictionary<string[]> = {};

    public constructor(env: ScriptEnv) {
        super(env);
    }

    @property('all groups to value')
    set groupValue(value: number) {
        if (value > 1.0) value = value / 255.0;
        for (var key in this.groups) {
            this.groups[key].value = value;
        }
        this.mValue = value;
    }
    get groupValue(): number {
        return this.mValue;
    }

    @callable('set channel names for fixtures (fx with of type)')
    public fixtureSetChannelNames(
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
    public fixtureFadeTo(
        @parameter('fixtureName, fixtureName, fixtureName') fixtureName: string,
        @parameter('target value. Normalised range: 0 .. 1') value: number,
        @parameter('duration in seconds', true) duration?: number
    ): Promise<void> {
        var channels: AnalogChannel[] = this.getAnalogChannels(this.getFixturesChannels(fixtureName, ''));
        return this.fadeChannels(channels, value, duration ? duration : this.mFadeDuration);
    }

    @callable('fade fixture channels')
    public fixtureChannelsFadeTo(
        @parameter('fixtureName, fixtureName, fixtureName') fixtureName: string,
        @parameter('channelName, channelName, channelName') channelNames: string,
        @parameter('target value. Normalised range: 0 .. 1') value: number,
        @parameter('duration in seconds', true) duration?: number
    ): Promise<void> {
        var channels: AnalogChannel[] = this.getAnalogChannels(this.getFixturesChannels(fixtureName, channelNames));
        return this.fadeChannels(channels, value, duration ? duration : this.mFadeDuration);
    }

    @callable('fade group')
    public groupFadeTo(
        @parameter('group name') groupName: string,
        @parameter('target value. Normalised range: 0 .. 1') value: number,
        @parameter('fade duration in seconds', true) duration?: number
    ): Promise<void> {
    	const group = this.getGroup(groupName, false);
        return group ? group.fadeTo(value, duration ? duration : this.mFadeDuration) : undefined;
    }

    @callable('set group value')
    public groupSetValue(
        @parameter('group name') groupName: string,
        @parameter('target value. Normalised range: 0 .. 1') value: number
    ) {
        var group: ArtnetGroup = this.getGroup(groupName, false);
        if (!group) return;
        group.value = value;
    }

    @callable('set group power')
    public groupSetPower(
        @parameter('group name') groupName: string,
        @parameter('power on/off : true/false') power: boolean
    ) {
        var group: ArtnetGroup = this.getGroup(groupName, false);
        if (!group) return;
        group.power = power;
    }

    @callable('group settings')
    public groupSetDefaults(
        @parameter('group name') groupName: string,
        @parameter('fade on duration (seconds)') fadeOnDuration: number,
        @parameter('fade off duration (seconds)') fadeOffDuration: number,
        @parameter('on value (0..1)') onValue: number,
        @parameter('off value (0..1)') offValue: number,
    ) {
        var group: ArtnetGroup = this.getGroup(groupName, true);
        group.setDefaults(fadeOnDuration, fadeOffDuration, onValue, offValue);
    }

    @callable('settings for groupAddFixtures and sceneAddFixtures')
    public fixtureSetDefaults(
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

    @callable('Reset setup (delete all groups and scenes)')
    public reset() {
        this.fixtureChannelNames = {};
        this.groups = {};
        this.scenes = {};
    }

    @callable('Add complete fixtures to group (channel names have to follow the naming scheme "L_01, L_02, L_03, L_04, L_05")')
    public groupAddFixtures(
        @parameter('fixtureName, fixtureName, fixtureName') fixtureNames: string,
        @parameter('name of group') groupName: string
    ) {
        var channels: Channel[] = this.getFixturesChannels(fixtureNames);
        this.getGroup(groupName, true).addChannels(channels);
    }

    @callable('Add channels of fixture to group')
    public groupAddChannels(
        @parameter('fixtureName, fixtureName, fixtureName') fixtureNames: string,
        @parameter('channelName, channelName, channelName') channelNames: string,
        @parameter('name of group') groupName: string
    ) {
        var channels: Channel[] = this.getFixturesChannels(fixtureNames, channelNames);
        this.getGroup(groupName, true).addChannels(channels);
    }

    @callable('add fixtures to scene')
    public sceneAddFixtures(
        @parameter('scene name') sceneName: string,
        @parameter('fixtureName, fixtureName, fixtureName') fixtureNames: string,
        @parameter('value (0..1)') value: number,
        @parameter('duration in seconds', true) duration?: number,
        @parameter('delay in seconds', true) delay?: number
    ) {
        var channels: AnalogChannel[] = this.getAnalogChannels(this.getFixturesChannels(fixtureNames));
        this.getScene(sceneName, true).addChannels(channels, value, duration, delay);
    }

    @callable('add channels to scene')
    public sceneAddChannels(
        @parameter('scene name') sceneName: string,
        @parameter('fixtureName, fixtureName, fixtureName') fixtureNames: string,
        @parameter('channelName, channelName, channelName') channelNames: string,
        @parameter('value (0..1)') value: number,
        @parameter('duration in seconds', true) duration?: number,
        @parameter('delay in seconds', true) delay?: number
    ) {
        var channels: AnalogChannel[] = this.getAnalogChannels(this.getFixturesChannels(fixtureNames, channelNames));
        this.getScene(sceneName, true).addChannels(channels, value, duration, delay);
    }

    @callable('call scene')
    public sceneCall(
        @parameter('scene name') sceneName: string
    ): Promise<void> {
    	const scene = this.getScene(sceneName, false);
        return scene ? scene.call() : undefined;
    }

    @callable('fade all groups to value')
    public groupAllFadeTo(
        @parameter('target value. Normalised range: 0 .. 1') value: number,
        @parameter('duration in seconds') duration: number
    ): Promise<void> {
        if (value > 1.0) value = value / 255.0;
        for (var key in this.groups) {
            this.groups[key].fadeTo(value, duration);
        }
        return wait(duration * MS_PER_S);
    }

    @callable("Reset All Lights")
    public groupAllLightsReset(): Promise<void> {
        for (var key in this.groups) {
            this.groups[key].fadeTo(this.mLightOffValue, this.mFadeDuration);
        }
        return wait(this.mFadeDuration * MS_PER_S);
    }

    @callable("Animate Group ('chase')")
    public groupAnimate(groupName: string, delay: number, style: string): void {
        if (style == 'chase') {
            var channels: AnalogChannel[] = this.getGroupChannels(groupName);
            this.recursiveChase(channels, delay);
        }
    }

    @callable("Animate Fixture ('chase')")
    public fixtureAnimate(fixtureName: string, delay: number, style: string): void {
        if (style == 'chase') {
            var channels: AnalogChannel[] = this.getAnalogChannels(this.getFixtureChannels(fixtureName, ''));
            this.recursiveChase(channels, delay);
        }
    }



    /**
  	 * Make composite names for group and scene properties
  	 */
    private static sanitizePropName(propName: string) {
        return propName.replace(/[^\w\-]/g, '-');
    }
    private static grpPropNameValue(groupName: string) {
        return this.sanitizePropName('gr_' + groupName + '_val');
    }
    private static grpPropNamePower(groupName: string) {
        return this.sanitizePropName('gr_' + groupName + '_pwr');
    }
    private static scnPropNameTrigger(sceneName: string) {
        return this.sanitizePropName('sc_' + sceneName + '_trigger');
    }

    /**
  	 * Publish properties for specified group
  	 */
    private publishGroupProps(groupName: string) {
        var value = 0;
        var power = false;

        this.property<number>(ArtnetGnS.grpPropNameValue(groupName), { type: Number, description: "Group Value 0..1" }, setValue => {
            if (setValue !== undefined) {
                value = setValue;
                this.groupSetValue(groupName, setValue)
            }
            return value;
        });
        this.property<boolean>(ArtnetGnS.grpPropNamePower(groupName), { type: Boolean, description: "Group Power on/off" }, setValue => {
            if (setValue !== undefined) {
                power = setValue;
                this.groupSetPower(groupName, power)
            }
            return power;
        });
    }
    /**
     * Publish properties for specified scene
     */
    private publishSceneProps(sceneName: string) {
        var trigger = false;

        this.property<boolean>(ArtnetGnS.scnPropNameTrigger(sceneName), { type: Boolean, description: "Trigger Scene" }, setValue => {
            if (setValue !== undefined) {
                trigger = setValue;
                this.sceneCall(sceneName);
            }
            return trigger;
        });
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

    private fadeChannels(channels: AnalogChannel[], value: number, duration: number): Promise<void> {
        for (let i = 0; i < channels.length; i++) {
            var channel: AnalogChannel = channels[i];
            channel.fadeTo(value * channel.maxValue, duration);
        }
        return wait(duration * MS_PER_S);
    }

    private padStart(value: string, minLength: number, padWith: string): string {
        var result: string = value;
        while (result.length < minLength) {
            result = padWith + result;
        }
        return result;
    }

    private getFixturesChannels(fixtureNames: string, channelNames?: string): Channel[] {
        var fixtureNameList: string[] = this.getStringArray(fixtureNames);
        var channels: Channel[] = [];
        for (let i = 0; i < fixtureNameList.length; i++) {
            channels = channels.concat(this.getFixtureChannels(fixtureNameList[i], channelNames));
        }
        return channels;
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

    private getGroup(groupName: string, createIfMissing: boolean): ArtnetGroup|undefined {
        if (!this.groups[groupName] && createIfMissing) {
            this.groups[groupName] = new ArtnetGroup();
            this.publishGroupProps(groupName);
        }
        return this.groups[groupName];
    }
    private getGroupChannels(groupName: string): AnalogChannel[] {
        var group: ArtnetGroup = this.getGroup(groupName, false);
        if (!group) return [];
        return group.channels;
    }
    private getScene(sceneName: string, createIfMissing: boolean): ArtnetScene|undefined {
        if (!this.scenes[sceneName] &&
            createIfMissing) {
            this.scenes[sceneName] = new ArtnetScene();
            this.publishSceneProps(sceneName);
        }
        return this.scenes[sceneName];
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

    // private random(
    //     min: number,
    //     max: number
    // ): number {
    //     return Math.random() * (max - min) + min;
    // }
    //
    // private randomInt(
    //     min: number,
    //     max: number
    // ): number {
    //     min = Math.ceil(min);
    //     max = Math.floor(max);
    //     return Math.floor(Math.random() * (max - min + 1)) + min;
    // }

}

class ArtnetGroup {
    private mChannels: AnalogChannel[] = [];
    private mFadeOnDuration: number = 1;
    private mFadeOffDuration: number = 1;
    private mOnValue: number = 1;
    private mOffValue: number = 0;
    private mPowerOn: boolean = false;

    set value(value: number) {
        for (let i = 0; i < this.mChannels.length; i++) {
            var channel: AnalogChannel = this.mChannels[i];
            channel.value = value * channel.maxValue;
        }
    }

    set power(on: boolean) {
        var value: number = on ? this.mOnValue : this.mOffValue;
        var duration: number = on ? this.mFadeOnDuration : this.mFadeOffDuration;
        for (let i = 0; i < this.mChannels.length; i++) {
            var channel: AnalogChannel = this.mChannels[i];
            channel.fadeTo(value * channel.maxValue, duration);
        }
        this.mPowerOn = on;
    }
    get power(): boolean {
        return this.mPowerOn;
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

    public fadeTo(value: number, duration: number): Promise<void> {
        for (let i = 0; i < this.mChannels.length; i++) {
            var channel: AnalogChannel = this.mChannels[i];
            channel.fadeTo(value * channel.maxValue, duration);
        }
        return wait(duration * MS_PER_S);
    }

    public setDefaults(
        fadeOnDuration: number,
        fadeOffDuration: number,
        onValue: number,
        offValue: number,
    ) {
        this.mFadeOnDuration = fadeOnDuration;
        this.mFadeOffDuration = fadeOffDuration;
        this.mOnValue = onValue;
        this.mOffValue = offValue;
    }
}
class ArtnetScene {
    private sceneChannels: ArtnetSceneChannel[] = [];

    private sceneCallStartMs: number;
    private callingScene: Promise<void>;
    private callingSceneResolver: (value?: any) => void;
    private callingSceneRejector: (error?: any) => void;

    /** duration in seconds */
    get duration(): number {
        var max: number = 0;
        for (let i = 0; i < this.sceneChannels.length; i++) {
            var channel = this.sceneChannels[i];
            var total: number = channel.delay + channel.duration;
            if (total > max) max = total;
        }
        return max;
    }

    public addChannels(
        channels: AnalogChannel[],
        value: number,
        duration?: number,
        delay?: number
    ) {
        for (let i = 0; i < channels.length; i++) {
            this.addChannelInternal(channels[i], value, duration, delay);
        }
        this.applyChanges();
    }

    public addChannel(
        channel: AnalogChannel,
        value: number,
        duration?: number,
        delay?: number
    ) {
        this.addChannelInternal(channel, value, duration, delay);
        this.applyChanges();
    }

    private applyChanges() {
        this.sceneChannels.sort((a, b) => {
            if (a.delay > b.delay) return 1;
            if (b.delay > a.delay) return -1;
            return 0;
        });
    }

    private addChannelInternal(
        channel: AnalogChannel,
        value: number,
        duration?: number,
        delay?: number
    ) {
        this.sceneChannels.push(new ArtnetSceneChannel(channel, value, duration, delay));
    }

    public call(): Promise<void> {
        this.sceneCallStartMs = Date.now();
        if (!this.callingScene) {
            this.callingScene = new Promise<void>((resolve, reject) => {
                this.callingSceneResolver = resolve;
                this.callingSceneRejector = reject;
                wait(this.duration * MS_PER_S + MS_PER_S).then(() => {
                    reject('scene timeout! (did not finish on time)');
                });
                wait(this.duration * MS_PER_S).then(() => {
                    this.resolveSceneExecution();
                });
            });
            this.executeScene(0);
        }
        return this.callingScene;
    }

    private executeScene(channelPos: number) {
        var nowMs: number = Date.now();
        var deltaTimeMs: number = nowMs - this.sceneCallStartMs;
        var sceneChannel: ArtnetSceneChannel;
        for (let i = channelPos; i < this.sceneChannels.length; i++) {
            sceneChannel = this.sceneChannels[i];
            var deltaDelay: number = sceneChannel.delay * MS_PER_S - deltaTimeMs;
            if (deltaDelay <= 0) {
                sceneChannel.call();
            } else {
                wait(deltaDelay).then(() => {
                    this.executeScene(i);
                });
                return;
            }
        }
    }

    private resolveSceneExecution() {
        this.callingSceneResolver(true);
        delete this.callingSceneResolver;
        delete this.callingSceneRejector;
        delete this.callingScene;
    }

}

class ArtnetSceneChannel {
    public readonly channel: AnalogChannel;
    public value: number;
    public duration: number;
    public delay: number;

    public constructor(
        channel: AnalogChannel,
        value: number,
        duration?: number,
        delay?: number
    ) {
        this.channel = channel;
        this.value = value;
        this.duration = duration ? duration : 0;
        this.delay = delay ? delay : 0;
    }

    public call() {
        this.channel.fadeTo(this.value * this.channel.maxValue, this.duration);
    }
}

interface Dictionary<Group> {
    [id: string]: Group;
}
