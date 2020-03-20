/*
	Script for added Artnet convenience

 	Copyright (c) 2019 No Parking Production ApS, Denmark (https://noparking.dk). All Rights Reserved.
	Created by: Samuel Walz <mail@samwalz.com>
  Version: 0.85
  Features:
  - groups (grouping fixtures and channels)
  - master fade all channels of a fixture
  - scenes (adding fixtures & channels to scenes)
  - crossfade between two groups (fx between cold and warm lights)

 */

import { Artnet, Fixture, Channel, AnalogChannel } from "system/Artnet";
import { Realm } from "system/Realm";
import { Script, ScriptEnv } from "system_lib/Script";
import { callable, max, min, parameter, property } from "system_lib/Metadata";

const CHANNEL_NAME_PREFIX = 'L_';
const CHANNEL_NAME_DIGITS = 2;

const MIN_CHANNEL = 1;
const MAX_CHANNEL = 42;

const MS_PER_S = 1000;

const PUBLISH_GROUP_PROPERTIES = true;
const PUBLISH_SCENE_PROPERTIES = true;
const PUBLISH_CROSSFADER_PROPERTIES = true;

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

    private static groups: Dictionary<ArtnetGroup> = {};
    private static scenes: Dictionary<ArtnetScene> = {};
    private static fixtureChannelNames: Dictionary<string[]> = {};
    private static crossfaders: Dictionary<ArtnetCrossfader> = {};

    public constructor(env: ScriptEnv) {
        super(env);
    }

    @property('all groups to value')
    @min(0) @max(1)
    set groupValue(value: number) {
        for (var key in ArtnetGnS.groups) {
            ArtnetGnS.groups[key].value = value;
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
            ArtnetGnS.fixtureChannelNames[fixtureNameList[i]] = channelNameList;
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

    @callable('fade group')
    public groupFadeTo(
        @parameter('group name') groupName: string,
        @parameter('target value. Normalised range: 0..1') value: number,
        @parameter('fade duration in seconds', true) duration?: number
    ): Promise<void> {
    	const group = this.getGroup(groupName, false);
        return group ? group.fadeTo(value, duration ? duration : this.mFadeDuration) : undefined;
    }
    @callable('duck group (temporarily dampen group value: 0..1)')
    public groupDuck(
        @parameter('group name') groupName: string,
        @parameter('duck amount. Percentage: 0..1 (0% - 100%)') value: number,
        @parameter('fade duration in seconds', true) duration?: number
    ): void {
    	const group = this.getGroup(groupName, false);
        if (!group) return;
        group.duck(value, duration ? duration : this.mFadeDuration);
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

    @callable('Add crossfader. Allows crossfade between group A and B. Features master value.')
    public crossfaderAdd(
      @parameter('name for crossfader group') crossfaderName: string,
      @parameter('name of group A') groupNameA: string,
      @parameter('name of group B') groupNameB: string,
      @parameter('max value group A (0..1)', true) maxValueA?: number,
      @parameter('max value group B (0..1)', true) maxValueB?: number,
    ) {
      var groupA = this.getGroup(groupNameA, false);
      var groupB = this.getGroup(groupNameB, false);
      if (groupA && groupB) {
          ArtnetGnS.crossfaders[crossfaderName] = new ArtnetCrossfader(groupA, groupB, maxValueA, maxValueB);
          if (PUBLISH_CROSSFADER_PROPERTIES) this.publishCrossfaderProps(crossfaderName);
      }
    }
    private crossfaderSetFadeValue(
      @parameter('name of crossfader') crossfaderName: string,
      @parameter('fade value (0..1)') fadeValue: number
    ) {
        const crossfader = ArtnetGnS.crossfaders[crossfaderName];
        if (!crossfader) return;
        crossfader.fadeTo(fadeValue, -1, 0);
    }
    private crossfaderSetMasterValue(
      @parameter('name of crossfader') crossfaderName: string,
      @parameter('master value (0..1)') masterValue: number
    ) {
      const crossfader = ArtnetGnS.crossfaders[crossfaderName];
      if (!crossfader) return;
      crossfader.fadeTo(-1, masterValue, 0);
    }
    @callable('Animate crossfade')
    public crossfaderFadeTo (
      @parameter('name of crossfade group') crossfaderName: string,
      @parameter('fade value (0..1) | -1 : ignore') fadeValue: number,
      @parameter('master value (0..1) | -1 : ignore', true) masterValue?: number,
      @parameter('fade duration in seconds', true) duration?: number
    ) {
        const crossfader = ArtnetGnS.crossfaders[crossfaderName];
        return crossfader ? crossfader.fadeTo(
            fadeValue,
            masterValue ? masterValue : -1,
            duration ? duration : this.mFadeDuration
        ) : undefined;
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
    @callable('add groups to scene')
    public sceneAddGroups(
        @parameter('scene name') sceneName: string,
        @parameter('groupName, groupName, groupName') groupNames: string,
        @parameter('value (0..1)') value: number,
        @parameter('duration in seconds', true) duration?: number,
        @parameter('delay in seconds', true) delay?: number
    ) {
        var groups: ArtnetGroup[] = this.getGroups(groupNames);
        this.getScene(sceneName, true).addGroups(groups, value, duration, delay);
    }
    @callable('add crossfaders to scene')
    public sceneAddCrossfaders (
        @parameter('scene name') sceneName: string,
        @parameter('crossfaderName, crossfaderName, crossfaderName') crossfaderNames: string,
        @parameter('fade value (0..1) | -1 : ignore') fadeValue: number,
        @parameter('master value (0..1) | -1 : ignore', true) masterValue?: number,
        @parameter('duration in seconds', true) duration?: number,
        @parameter('delay in seconds', true) delay?: number
    ) {
        var crossfaders: ArtnetCrossfader[] = this.getCrossfaders(crossfaderNames);
        this.getScene(sceneName, true).addCrossfaders(crossfaders, fadeValue, masterValue, duration, delay);
    }
    @callable('add task execute to scene')
    public sceneAddExecute (
        @parameter('scene name') sceneName: string,
        @parameter('realm') realmName: string,
        @parameter('group') groupName: string,
        @parameter('task') taskName: string,
        @parameter('delay in seconds', true) delay?: number
    ) {
        this.getScene(sceneName, true).addExecute(realmName, groupName, taskName, delay);
    }

    @callable('call scene')
    public sceneCall(
        @parameter('scene name') sceneName: string,
        @parameter('time factor (> 1 faster, < 1 slower)', true) timefactor?: number,
        @parameter('seek to position in seconds', true) seekTo?: number,
        @parameter('force execution (usually a scene has to finish before it can be called again)', true) force?: boolean
    ): Promise<void> {
    	  const scene = this.getScene(sceneName, false);
        if (timefactor) {
            if (timefactor <= 0.0) return;
            timefactor = 1.0 / timefactor;
        }
        // return scene ? scene.call(timefactor, seekTo, force) : undefined;
        scene.call(timefactor, seekTo, force);
        return undefined;
    }
    @callable('cancel scene')
    public sceneCancel(
        @parameter('scene name') sceneName: string
    ): void {
        const scene = this.getScene(sceneName, false);
        if (!scene) return;
        scene.cancel();
    }
    @callable('is scene running?')
    public sceneIsRunning (
        @parameter('scene name') sceneName: string
    ) {
        const scene = this.getScene(sceneName, false);
        return scene ? scene.isRunning : false;
    }

    @callable('fade all groups to value')
    public groupAllFadeTo(
        @parameter('target value. Normalised range: 0 .. 1') value: number,
        @parameter('duration in seconds') duration: number
    ): Promise<void> {
        if (value > 1.0) value = value / 255.0;
        for (var key in ArtnetGnS.groups) {
            ArtnetGnS.groups[key].fadeTo(value, duration);
        }
        return wait(duration * MS_PER_S);
    }

    @callable("Animate Group ('chase', 'chase backwards')")
    public groupAnimate(groupName: string, delay: number, style: string): Promise<void> {
        if (style == 'chase') {
            var channels: AnalogChannel[] = this.getGroupChannels(groupName);
            return this.recursiveChase(channels, delay);
        }
        if (style == 'chase backwards') {
            var channels: AnalogChannel[] = this.getGroupChannels(groupName);
            return this.recursiveChase(channels, delay, true);
        }
    }

    @callable("Animate Fixture ('chase')")
    public fixtureAnimate(fixtureName: string, delay: number, style: string): void {
        if (style == 'chase') {
            var channels: AnalogChannel[] = this.getAnalogChannels(this.getFixtureChannels(fixtureName, ''));
            this.recursiveChase(channels, delay);
        }
    }

    @callable('Reset setup (delete all groups and scenes)')
    public reset() {
        ArtnetGnS.fixtureChannelNames = {};
        ArtnetGnS.groups = {};
        // cancel and remove scenes
        for (let key in ArtnetGnS.scenes) {
            let scene = ArtnetGnS.scenes[key];
            scene.cancel();
        }
        ArtnetGnS.scenes = {};
        ArtnetGnS.crossfaders = {};
    }

    /**
  	 * Make composite names for group and scene properties
  	 */
    private static sanitizePropName(propName: string) : string {
        return propName.replace(/[^\w\-]/g, '-');
    }
    private static grpPropNameDuck(groupName: string) : string {
        return this.sanitizePropName('_gr_' + groupName + '_dck');
    }
    private static grpPropNameValue(groupName: string) : string {
        return this.sanitizePropName('_gr_' + groupName + '_val');
    }
    private static grpPropNamePower(groupName: string) : string {
        return this.sanitizePropName('_gr_' + groupName + '_pwr');
    }
    private static scnPropNameTrigger(sceneName: string) : string {
        return this.sanitizePropName('_sc_' + sceneName + '_trigger');
    }
    private static cfdrPropNameFadeValue(crossfaderName: string) : string {
        return this.sanitizePropName('_cfdr_' + crossfaderName + '_fade');
    }
    private static cfdrPropNameMasterValue(crossfaderName: string) : string {
        return this.sanitizePropName('_cfdr_' + crossfaderName + '_master');
    }

    /**
  	 * Publish properties for specified group
  	 */
    private publishGroupProps(groupName: string) : void {
        var duck = 0;
        var value = 0;
        var power = false;
        this.property<number>(ArtnetGnS.grpPropNameDuck(groupName), { type: Number, description: "duck group (temporarily dampen group value: 0..1)" }, setValue => {
            if (setValue !== undefined) {
                duck = setValue;
                this.groupDuck(groupName, setValue)
            }
            return duck;
        });
        this.property<number>(ArtnetGnS.grpPropNameValue(groupName), { type: Number, description: "group value 0..1 (normalised range)" }, setValue => {
            if (setValue !== undefined) {
                value = setValue;
                this.groupSetValue(groupName, setValue)
            }
            return value;
        });
        this.property<boolean>(ArtnetGnS.grpPropNamePower(groupName), { type: Boolean, description: "group power on/off" }, setValue => {
            if (setValue !== undefined) {
                power = setValue;
                this.groupSetPower(groupName, power)
            }
            return power;
        });
    }
    /**
     * Publish properties for specified crossfader
     */
     private publishCrossfaderProps (crossfaderName: string) : void {
       var masterValue = 0;
       var fadeValue = 0;
       this.property<number>(ArtnetGnS.cfdrPropNameMasterValue(crossfaderName), { type: Number, description: "Master Value 0..1" }, setValue => {
           if (setValue !== undefined) {
               masterValue = setValue;
               this.crossfaderSetMasterValue(crossfaderName, masterValue)
           }
           return masterValue;
       });
       this.property<number>(ArtnetGnS.cfdrPropNameFadeValue(crossfaderName), { type: Number, description: "Crossfade 0..1" }, setValue => {
           if (setValue !== undefined) {
               fadeValue = setValue;
               this.crossfaderSetFadeValue(crossfaderName, fadeValue)
           }
           return fadeValue;
       });
     }
    /**
     * Publish properties for specified scene
     */
    private publishSceneProps(sceneName: string) : void {
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
        wait(delay * MS_PER_S).then(() => {
            var channel: AnalogChannel = channels[pos];
            channel.fadeTo(value * channel.maxValue, delay);
            this.recursiveValue(channels, pos + 1, value, delay);
        });
    }

    private recursiveChase(channels: AnalogChannel[], delay: number, backwards?: boolean) : Promise<void> {
        var channelsCopy = channels.slice();
        if (backwards) channelsCopy = channelsCopy.reverse();
        this.recursiveValue(channelsCopy, 0, 1, delay);
        const waitDelay = delay * 2 * MS_PER_S;
        wait(waitDelay).then(() => {
            this.recursiveValue(channelsCopy, 0, this.mLightOffValue, delay);
        });
        return new Promise<void>((resolve, reject) => {
            const total = channelsCopy.length * delay * MS_PER_S + waitDelay;
            wait(total + MS_PER_S).then(() => {
                reject('scene timeout! (did not finish on time)');
            });
            wait(total).then(() => {
                resolve();
            });
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
        var fixture : Fixture = Artnet[fixtureName];
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
        if (ArtnetGnS.fixtureChannelNames[fixtureName]) {
            channelNameList = ArtnetGnS.fixtureChannelNames[fixtureName];
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
        if (!ArtnetGnS.groups[groupName] && createIfMissing) {
            ArtnetGnS.groups[groupName] = new ArtnetGroup();
            if (PUBLISH_GROUP_PROPERTIES) this.publishGroupProps(groupName);
        }
        return ArtnetGnS.groups[groupName];
    }
    private getGroups(groupNames: string): ArtnetGroup[] {
        var groupNameList: string[] = this.getStringArray(groupNames);
        var groups: ArtnetGroup[] = [];
        for (let i = 0; i < groupNameList.length; i++) {
            var group = ArtnetGnS.groups[groupNameList[i]];
            if (group) groups.push(group);
        }
        return groups;
    }
    private getCrossfaders(crossfaderNames: string): ArtnetCrossfader[] {
        var crossfaderNameList: string[] = this.getStringArray(crossfaderNames);
        var crossfaders: ArtnetCrossfader[] = [];
        for (let i = 0; i < crossfaderNameList.length; i++) {
            var crossfader = ArtnetGnS.crossfaders[crossfaderNameList[i]];
            if (crossfader) crossfaders.push(crossfader);
        }
        return crossfaders;
    }
    private getGroupChannels(groupName: string): AnalogChannel[] {
        var group: ArtnetGroup = this.getGroup(groupName, false);
        if (!group) return [];
        return group.channels;
    }
    private getScene(sceneName: string, createIfMissing: boolean): ArtnetScene|undefined {
        if (!ArtnetGnS.scenes[sceneName] && createIfMissing) {
            ArtnetGnS.scenes[sceneName] = new ArtnetScene();
            if (PUBLISH_SCENE_PROPERTIES) this.publishSceneProps(sceneName);
        }
        return ArtnetGnS.scenes[sceneName];
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

class ArtnetCrossfader {
    private groupA: ArtnetGroup;
    private groupB: ArtnetGroup;
    private maxValueA: number = 1;
    private maxValueB: number = 1;
    private fadeValue: number = 0;
    private masterValue: number = 0;

    public constructor(
        groupA: ArtnetGroup,
        groupB: ArtnetGroup,
        maxValueA: number,
        maxValueB: number
    ) {
        this.groupA = groupA;
        this.groupB = groupB;
        if (maxValueA) this.maxValueA = maxValueA;
        if (maxValueB) this.maxValueB = maxValueB;
    }
    public fadeTo (fadeValue: number, masterValue: number, duration: number) {
      if (fadeValue >= 0) this.fadeValue = fadeValue;
      if (masterValue >= 0) this.masterValue = masterValue;
      this.applyChanges(duration);
    }
    private applyChanges (duration: number) {
      this.groupA.fadeTo(this.masterValue * this.maxValueA * (1.0 - this.fadeValue), duration);
      this.groupB.fadeTo(this.masterValue * this.maxValueB * this.fadeValue, duration);
    }

}
class ArtnetGroup {
    private mChannels: AnalogChannel[] = [];
    private mFadeOnDuration: number = 1;
    private mFadeOffDuration: number = 1;
    private mOnValue: number = 1;
    private mOffValue: number = 0;
    private mPowerOn: boolean = false;
    private currentValue: number = 0;
    private duckValue: number = 0;

    set value(value: number) {
        this.currentValue = value;
        var effectiveValue = (1 - this.duckValue) * this.currentValue;
        for (let i = 0; i < this.mChannels.length; i++) {
            var channel: AnalogChannel = this.mChannels[i];
            channel.value = effectiveValue * channel.maxValue;
        }
    }
    set power(on: boolean) {
        this.currentValue = on ? this.mOnValue : this.mOffValue;
        var effectiveValue = (1 - this.duckValue) * this.currentValue;
        var duration: number = on ? this.mFadeOnDuration : this.mFadeOffDuration;
        for (let i = 0; i < this.mChannels.length; i++) {
            var channel: AnalogChannel = this.mChannels[i];
            channel.fadeTo(effectiveValue * channel.maxValue, duration);
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

    public duck (duckValue: number, duration: number) : void {
        this.duckValue = duckValue;
        this.fadeTo(this.currentValue, duration);
    }
    public fadeTo(value: number, duration: number): Promise<void> {
        this.currentValue = value;
        var effectiveValue = (1 - this.duckValue) * this.currentValue;
        for (let i = 0; i < this.mChannels.length; i++) {
            var channel: AnalogChannel = this.mChannels[i];
            channel.fadeTo(effectiveValue * channel.maxValue, duration);
        }
        return wait(duration * MS_PER_S);
    }

    public setDefaults(fadeOnDuration: number, fadeOffDuration: number, onValue: number, offValue: number) {
        this.mFadeOnDuration = fadeOnDuration;
        this.mFadeOffDuration = fadeOffDuration;
        this.mOnValue = onValue;
        this.mOffValue = offValue;
    }
}
class ArtnetScene {
    private sceneItems: ArtnetSceneItem[] = [];
    private sceneCallStartMs: number;
    private callingScene: Promise<void>;
    private callingSceneResolver: (value?: any) => void;
    private callingSceneRejector: (error?: any) => void;
    private runObject: Object = null;
    private runCounter: number = 0;

    public debug: boolean;

    /** duration in seconds */
    get duration(): number {
        var max: number = 0;
        for (let i = 0; i < this.sceneItems.length; i++) {
            var channel = this.sceneItems[i];
            var total: number = channel.delay + channel.duration;
            if (total > max) max = total;
        }
        return max;
    }
    /* is scene running? */
    get isRunning() : boolean {
        return this.runObject !== null;
    }

    public addChannel(channel: AnalogChannel, value: number, duration?: number, delay?: number) {
        this.addChannelInternal(channel, value, duration, delay);
        this.applyChanges();
    }
    public addChannels(channels: AnalogChannel[], value: number, duration?: number, delay?: number) {
        for (let i = 0; i < channels.length; i++) {
            this.addChannelInternal(channels[i], value, duration, delay);
        }
        this.applyChanges();
    }
    public addGroup(group: ArtnetGroup, value: number, duration?: number, delay?: number) {
        this.addGroupInternal(group, value, duration, delay);
        this.applyChanges();
    }
    public addGroups(groups: ArtnetGroup[], value: number, duration?: number, delay?: number) {
        for (let i = 0; i < groups.length; i++) {
            this.addGroupInternal(groups[i], value, duration, delay);
        }
        this.applyChanges();
    }
    public addCrossfader(crossfader: ArtnetCrossfader, fadeValue: number, masterValue?: number, duration?: number, delay?: number) {
        this.addCrossfaderInternal(crossfader, fadeValue, masterValue, duration, delay);
        this.applyChanges();
    }
    public addCrossfaders(crossfaders: ArtnetCrossfader[], fadeValue: number, masterValue?: number, duration?: number, delay?: number) {
        for (let i = 0; i < crossfaders.length; i++) {
            this.addCrossfaderInternal(crossfaders[i], fadeValue, masterValue, duration, delay);
        }
        this.applyChanges();
    }
    public addExecute(realm: string, group: string, task: string, delay?: number)
    {
        this.sceneItems.push(new ArtnetSceneExecute(realm, group, task, 0, delay));
        this.applyChanges();
    }
    private applyChanges() {
        this.sceneItems.sort((a, b) => {
            if (a.delay > b.delay) return 1;
            if (b.delay > a.delay) return -1;
            return 0;
        });
    }

    private addChannelInternal(channel: AnalogChannel, value: number, duration?: number, delay?: number) {
        this.sceneItems.push(new ArtnetSceneChannel(channel, value, duration, delay));
    }
    private addGroupInternal(group: ArtnetGroup, value: number, duration?: number, delay?: number) {
        this.sceneItems.push(new ArtnetSceneGroup(group, value, duration, delay));
    }
    private addCrossfaderInternal(crossfader: ArtnetCrossfader, fadeValue: number, masterValue?: number, duration?: number, delay?: number) {
        this.sceneItems.push(new ArtnetSceneCrossfade(crossfader, fadeValue, masterValue, duration, delay));
    }

    public call(timefactor? : number, seekTo?: number, force?: boolean): Promise<void> {
        this.sceneCallStartMs = Date.now();
        if (seekTo) this.sceneCallStartMs -= seekTo * MS_PER_S;
        if (this.callingScene && force)
        {
            if (this.debug) console.log('stopping previous scene call');
            this.resolveSceneExecution();
        }
        if (!this.callingScene) {
            this.callingScene = new Promise<void>((resolve, reject) => {
                this.callingSceneResolver = resolve;
                this.callingSceneRejector = reject;
                if (!timefactor) timefactor = 1.0;
                var duration = this.duration * timefactor;
                if (seekTo) duration -= seekTo;
                wait(duration * MS_PER_S + MS_PER_S).then(() => {
                    reject('scene timeout! (did not finish on time)');
                });
                wait(duration * MS_PER_S).then(() => {
                    this.resolveSceneExecution();
                });
            });
            this.runObject = new Object();
            this.runCounter++;
            this.executeScene(0, timefactor, this.runObject, this.runCounter);
        }
        return this.callingScene;
    }
    public cancel(): void {
        if(this.callingScene) {
            this.resolveSceneExecution();
            this.runObject = null;
        }
    }

    private executeScene(channelPos: number, timefactor: number, runObject: Object, runCounter: number) {
        var nowMs: number = Date.now();
        var deltaTimeMs: number = nowMs - this.sceneCallStartMs;
        var sceneItem: ArtnetSceneItem;
        if (this.debug) console.log('continuing scene at ' + deltaTimeMs + 'ms (#' + runCounter + ')');
        // cancel execution if another execution has been started
        if (runObject !== this.runObject)
        {
            console.log('runID is wrong ' + runObject + ' vs ' + this.runObject);
            return;
        }
        for (let i = channelPos; i < this.sceneItems.length; i++) {
            sceneItem = this.sceneItems[i];
            var delay = sceneItem.delay * timefactor;
            var deltaDelay: number = delay * MS_PER_S - deltaTimeMs;
            if (deltaDelay <= 0) {
                sceneItem.call(timefactor * (deltaDelay < -MS_PER_S ? 0.001 : 1));
                if (this.debug) console.log('calling scene item ' + i + ' at ' + deltaTimeMs + 'ms (#' + runCounter + ')');
            } else {
                wait(deltaDelay).then(() => {
                    const offset = i;
                    this.executeScene(offset, timefactor, runObject, runCounter);
                });
                return;
            }
        }
    }

    private resolveSceneExecution() {
        if (this.callingSceneResolver) this.callingSceneResolver(true);
        delete this.callingSceneResolver;
        delete this.callingSceneRejector;
        delete this.callingScene;
    }

}

/*
 * different types of supported scene items
 */
 abstract class ArtnetSceneItem {
   readonly duration: number;
   readonly delay: number;
   public constructor(
       duration: number,
       delay: number
   ) {
       this.duration = duration ? duration : 0;
       this.delay = delay ? delay : 0;
   }
   abstract call(timefactor? : number) : void;
 }
class ArtnetSceneChannel extends ArtnetSceneItem {
    public readonly duration: number;
    public readonly delay: number;
    private readonly channel: AnalogChannel;
    private value: number;
    public constructor(
        channel: AnalogChannel,
        value: number,
        duration?: number,
        delay?: number
    ) {
        super(duration, delay);
        this.channel = channel;
        this.value = value;
    }
    public call(timefactor? : number) {
        this.channel.fadeTo(
          this.value * this.channel.maxValue,
          timefactor ? timefactor * this.duration : this.duration
        );
    }
}
class ArtnetSceneGroup extends ArtnetSceneItem {
    public readonly group: ArtnetGroup;
    private value: number;
    public constructor(group: ArtnetGroup, value: number, duration?: number, delay?: number) {
        super(duration, delay);
        this.group = group;
        this.value = value;
    }
    public call(timefactor? : number) {
        // console.log('sc_grp fadeTo ' + this.value + ' over ' + this.duration + 's ' + (timefactor ? ' f' + timefactor : ''));
        this.group.fadeTo(
          this.value,
          timefactor ? timefactor * this.duration : this.duration
        );
    }
}
class ArtnetSceneCrossfade extends ArtnetSceneItem {
    public readonly crossfader: ArtnetCrossfader;
    private fadeValue: number;
    private masterValue: number;
    public constructor(crossfader: ArtnetCrossfader, fadeValue: number, masterValue: number, duration?: number, delay?: number) {
        super(duration, delay);
        this.crossfader = crossfader;
        this.fadeValue = fadeValue;
        this.masterValue = masterValue;
    }
    public call(timefactor? : number) {
        this.crossfader.fadeTo(
          this.fadeValue,
          this.masterValue,
          timefactor ? timefactor * this.duration : this.duration
        );
    }
}
class ArtnetSceneExecute extends ArtnetSceneItem {
    private readonly realm: string;
    private readonly group: string;
    private readonly task: string;
    public constructor(realm: string, group: string, task: string, duration?: number, delay?: number) {
        super(duration, delay);
        this.realm = realm;
        this.group = group;
        this.task = task;
    }
    public call (factor? : number) {
        if (factor > 0.9 && factor < 1.1) {
            Realm[this.realm].group[this.group][this.task].running = true;
        }
    }
}

interface Dictionary<Group> {
    [id: string]: Group;
}
