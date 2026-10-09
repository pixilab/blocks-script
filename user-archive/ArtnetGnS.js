"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtnetGnS = void 0;
const Artnet_1 = require("../system/Artnet");
const Realm_1 = require("../system/Realm");
const Script_1 = require("../system_lib/Script");
const Metadata_1 = require("../system_lib/Metadata");
const CHANNEL_NAME_PREFIX = 'L_';
const CHANNEL_NAME_DIGITS = 2;
const MIN_CHANNEL = 1;
const MAX_CHANNEL = 42;
const MS_PER_S = 1000;
const PUBLISH_GROUP_PROPERTIES = false;
const PUBLISH_SCENE_PROPERTIES = false;
const PUBLISH_CROSSFADER_PROPERTIES = false;
const split = require("lib/split-string");
class ArtnetGnS extends Script_1.Script {
    mFadeDuration = 1.0;
    mLightOffValue = 0.0;
    mMinChannel = MIN_CHANNEL;
    mMaxChannel = MAX_CHANNEL;
    mValue = 0.0;
    mChannelNamePrefix = CHANNEL_NAME_PREFIX;
    mChannelNameDigits = CHANNEL_NAME_DIGITS;
    static groups = {};
    static scenes = {};
    static fixtureChannelNames = {};
    static crossfaders = {};
    static channelLabelValues = {};
    constructor(env) {
        super(env);
    }
    set groupValue(value) {
        for (var key in ArtnetGnS.groups) {
            ArtnetGnS.groups[key].value = value;
        }
        this.mValue = value;
    }
    get groupValue() {
        return this.mValue;
    }
    fixtureSetChannelNames(fixtureNames, channelNames) {
        var fixtureNameList = this.getStringArray(fixtureNames);
        var channelNameList = this.getStringArray(channelNames);
        for (let i = 0; i < fixtureNameList.length; i++) {
            ArtnetGnS.fixtureChannelNames[fixtureNameList[i]] = channelNameList;
        }
    }
    fixtureFadeTo(fixtureName, value, duration) {
        var channels = this.getAnalogChannels(this.getFixturesChannels(fixtureName, ''));
        return this.fadeChannels(channels, value, duration ? duration : this.mFadeDuration);
    }
    fixtureFadeToLabel(fixtureName, label, duration) {
        var channels = this.getAnalogChannels(this.getFixtureChannels(fixtureName, ''));
        this.fadeChannelsToLabel(fixtureName, channels, label, duration ? duration : this.mFadeDuration);
    }
    fixtureChannelsFadeTo(fixtureName, channelNames, value, duration) {
        var channels = this.getAnalogChannels(this.getFixturesChannels(fixtureName, channelNames));
        return this.fadeChannels(channels, value, duration ? duration : this.mFadeDuration);
    }
    fixtureChannelsFadeToLabel(fixtureName, channelNames, label, duration) {
        var channels = this.getAnalogChannels(this.getFixturesChannels(fixtureName, channelNames));
        this.fadeChannelsToLabel(fixtureName, channels, label, duration ? duration : this.mFadeDuration);
    }
    fixtureSetDefaults(channelNamePrefix, minChannel, maxChannel, channelNameDigits) {
        this.mChannelNamePrefix = channelNamePrefix;
        this.mMinChannel = minChannel;
        this.mMaxChannel = maxChannel;
        var neededDigits = maxChannel.toString().length;
        this.mChannelNameDigits = Math.max(channelNameDigits, neededDigits);
    }
    groupFadeTo(groupName, value, duration) {
        const group = this.getGroup(groupName, false);
        return group ? group.fadeTo(value, duration ? duration : this.mFadeDuration) : undefined;
    }
    groupDuck(groupName, value, duration) {
        const group = this.getGroup(groupName, false);
        if (!group)
            return;
        group.duck(value, duration ? duration : this.mFadeDuration);
    }
    groupSetValue(groupName, value) {
        var group = this.getGroup(groupName, false);
        if (!group)
            return;
        group.value = value;
    }
    groupSetPower(groupName, power) {
        var group = this.getGroup(groupName, false);
        if (!group)
            return;
        group.power = power;
    }
    groupSetDefaults(groupName, fadeOnDuration, fadeOffDuration, onValue, offValue) {
        var group = this.getGroup(groupName, true);
        group.setDefaults(fadeOnDuration, fadeOffDuration, onValue, offValue);
    }
    groupAddFixtures(fixtureNames, groupName) {
        var channels = this.getFixturesChannels(fixtureNames);
        this.getGroup(groupName, true).addChannels(channels);
    }
    groupAddChannels(fixtureNames, channelNames, groupName) {
        var channels = this.getFixturesChannels(fixtureNames, channelNames);
        this.getGroup(groupName, true).addChannels(channels);
    }
    crossfaderAdd(crossfaderName, groupNameA, groupNameB, maxValueA, maxValueB) {
        var groupA = this.getGroup(groupNameA, false);
        var groupB = this.getGroup(groupNameB, false);
        if (groupA && groupB) {
            ArtnetGnS.crossfaders[crossfaderName] = new ArtnetCrossfader(groupA, groupB, maxValueA, maxValueB);
            if (PUBLISH_CROSSFADER_PROPERTIES)
                this.publishCrossfaderProps(crossfaderName);
        }
    }
    crossfaderSetFadeValue(crossfaderName, fadeValue) {
        const crossfader = ArtnetGnS.crossfaders[crossfaderName];
        if (!crossfader)
            return;
        crossfader.fadeTo(fadeValue, -1, 0);
    }
    crossfaderSetMasterValue(crossfaderName, masterValue) {
        const crossfader = ArtnetGnS.crossfaders[crossfaderName];
        if (!crossfader)
            return;
        crossfader.fadeTo(-1, masterValue, 0);
    }
    crossfaderFadeTo(crossfaderName, fadeValue, masterValue, duration) {
        const crossfader = ArtnetGnS.crossfaders[crossfaderName];
        return crossfader ? crossfader.fadeTo(fadeValue, masterValue ? masterValue : -1, duration ? duration : this.mFadeDuration) : undefined;
    }
    labelDefine(labelName, value, fixtureName, channelNames) {
        var channels = this.getAnalogChannels(this.getFixtureChannels(fixtureName, channelNames));
        for (let i = 0; i < channels.length; i++) {
            var channel = channels[i];
            var valuePath = ArtnetGnS.renderValuePath(fixtureName, channel.name, labelName);
            ArtnetGnS.channelLabelValues[valuePath] = value;
        }
    }
    sceneAddFixtures(sceneName, fixtureNames, value, duration, delay) {
        var channels = this.getAnalogChannels(this.getFixturesChannels(fixtureNames));
        this.getScene(sceneName, true).addChannels(channels, value, duration, delay);
    }
    sceneAddChannels(sceneName, fixtureNames, channelNames, value, duration, delay) {
        var channels = this.getAnalogChannels(this.getFixturesChannels(fixtureNames, channelNames));
        this.getScene(sceneName, true).addChannels(channels, value, duration, delay);
    }
    sceneAddGroups(sceneName, groupNames, value, duration, delay) {
        var groups = this.getGroups(groupNames);
        this.getScene(sceneName, true).addGroups(groups, value, duration, delay);
    }
    sceneAddCrossfaders(sceneName, crossfaderNames, fadeValue, masterValue, duration, delay) {
        var crossfaders = this.getCrossfaders(crossfaderNames);
        this.getScene(sceneName, true).addCrossfaders(crossfaders, fadeValue, masterValue, duration, delay);
    }
    sceneAddExecute(sceneName, realmName, groupName, taskName, delay) {
        this.getScene(sceneName, true).addExecute(realmName, groupName, taskName, delay);
    }
    sceneAddCallScene(sceneName, sceneNameToCall, timefactor, delay) {
        this.getScene(sceneName, true).addCallScene(sceneNameToCall, timefactor, delay);
    }
    sceneAddChannelsFadeToLabel(sceneName, label, fixtureName, channelNames, duration, delay) {
        var channels = this.getAnalogChannels(this.getFixtureChannels(fixtureName, channelNames));
        this.getScene(sceneName, true).addChannelsFadeToLabel(fixtureName, channels, label, duration, delay);
    }
    sceneCall(sceneName, timefactor, seekTo, force) {
        const scene = this.getScene(sceneName, false);
        if (timefactor) {
            if (timefactor <= 0.0)
                return;
            timefactor = 1.0 / timefactor;
        }
        scene.call(timefactor, seekTo, force);
        return undefined;
    }
    static sceneCall(sceneName, timefactor, seekTo, force) {
        const scene = ArtnetGnS.getScene(sceneName, false);
        if (timefactor) {
            if (timefactor <= 0.0)
                return;
            timefactor = 1.0 / timefactor;
        }
        scene.call(timefactor, seekTo, force);
        return undefined;
    }
    sceneCancel(sceneName) {
        const scene = this.getScene(sceneName, false);
        if (!scene)
            return;
        scene.cancel();
    }
    sceneIsRunning(sceneName) {
        const scene = this.getScene(sceneName, false);
        return scene ? scene.isRunning : false;
    }
    groupAllFadeTo(value, duration) {
        if (value > 1.0)
            value = value / 255.0;
        for (var key in ArtnetGnS.groups) {
            ArtnetGnS.groups[key].fadeTo(value, duration);
        }
        return wait(duration * MS_PER_S);
    }
    groupAnimate(groupName, delay, style) {
        if (style == 'chase') {
            var channels = this.getGroupChannels(groupName);
            return this.recursiveChase(channels, delay);
        }
        if (style == 'chase backwards') {
            var channels = this.getGroupChannels(groupName);
            return this.recursiveChase(channels, delay, true);
        }
    }
    fixtureAnimate(fixtureName, delay, style) {
        if (style == 'chase') {
            var channels = this.getAnalogChannels(this.getFixtureChannels(fixtureName, ''));
            this.recursiveChase(channels, delay);
        }
    }
    reset() {
        ArtnetGnS.fixtureChannelNames = {};
        ArtnetGnS.groups = {};
        for (let key in ArtnetGnS.scenes) {
            let scene = ArtnetGnS.scenes[key];
            scene.cancel();
        }
        ArtnetGnS.scenes = {};
        ArtnetGnS.crossfaders = {};
    }
    static renderValuePath(fixtureName, channelName, label) {
        return fixtureName + '.' + channelName + ':' + label;
    }
    static sanitizePropName(propName) {
        return propName.replace(/[^\w\-]/g, '-');
    }
    static grpPropNameDuck(groupName) {
        return this.sanitizePropName('_gr_' + groupName + '_dck');
    }
    static grpPropNameValue(groupName) {
        return this.sanitizePropName('_gr_' + groupName + '_val');
    }
    static grpPropNamePower(groupName) {
        return this.sanitizePropName('_gr_' + groupName + '_pwr');
    }
    static scnPropNameTrigger(sceneName) {
        return this.sanitizePropName('_sc_' + sceneName + '_trigger');
    }
    static cfdrPropNameFadeValue(crossfaderName) {
        return this.sanitizePropName('_cfdr_' + crossfaderName + '_fade');
    }
    static cfdrPropNameMasterValue(crossfaderName) {
        return this.sanitizePropName('_cfdr_' + crossfaderName + '_master');
    }
    publishGroupProps(groupName) {
        var duck = 0;
        var value = 0;
        var power = false;
        this.property(ArtnetGnS.grpPropNameDuck(groupName), { type: Number, description: "duck group (temporarily dampen group value: 0..1)" }, setValue => {
            if (setValue !== undefined) {
                duck = setValue;
                this.groupDuck(groupName, setValue);
            }
            return duck;
        });
        this.property(ArtnetGnS.grpPropNameValue(groupName), { type: Number, description: "group value 0..1 (normalised range)" }, setValue => {
            if (setValue !== undefined) {
                value = setValue;
                this.groupSetValue(groupName, setValue);
            }
            return value;
        });
        this.property(ArtnetGnS.grpPropNamePower(groupName), { type: Boolean, description: "group power on/off" }, setValue => {
            if (setValue !== undefined) {
                power = setValue;
                this.groupSetPower(groupName, power);
            }
            return power;
        });
    }
    publishCrossfaderProps(crossfaderName) {
        var masterValue = 0;
        var fadeValue = 0;
        this.property(ArtnetGnS.cfdrPropNameMasterValue(crossfaderName), { type: Number, description: "Master Value 0..1" }, setValue => {
            if (setValue !== undefined) {
                masterValue = setValue;
                this.crossfaderSetMasterValue(crossfaderName, masterValue);
            }
            return masterValue;
        });
        this.property(ArtnetGnS.cfdrPropNameFadeValue(crossfaderName), { type: Number, description: "Crossfade 0..1" }, setValue => {
            if (setValue !== undefined) {
                fadeValue = setValue;
                this.crossfaderSetFadeValue(crossfaderName, fadeValue);
            }
            return fadeValue;
        });
    }
    publishSceneProps(sceneName) {
        var trigger = false;
        this.property(ArtnetGnS.scnPropNameTrigger(sceneName), { type: Boolean, description: "Trigger Scene" }, setValue => {
            if (setValue !== undefined) {
                trigger = setValue;
                this.sceneCall(sceneName);
            }
            return trigger;
        });
    }
    recursiveValue(channels, pos, value, delay) {
        if (pos == channels.length)
            return;
        wait(delay * MS_PER_S).then(() => {
            var channel = channels[pos];
            channel.fadeTo(value * channel.maxValue, delay);
            this.recursiveValue(channels, pos + 1, value, delay);
        });
    }
    recursiveChase(channels, delay, backwards) {
        var channelsCopy = channels.slice();
        if (backwards)
            channelsCopy = channelsCopy.reverse();
        this.recursiveValue(channelsCopy, 0, 1, delay);
        const waitDelay = delay * 2 * MS_PER_S;
        wait(waitDelay).then(() => {
            this.recursiveValue(channelsCopy, 0, this.mLightOffValue, delay);
        });
        return new Promise((resolve, reject) => {
            const total = channelsCopy.length * delay * MS_PER_S + waitDelay;
            wait(total + MS_PER_S).then(() => {
                reject('scene timeout! (did not finish on time)');
            });
            wait(total).then(() => {
                resolve();
            });
        });
    }
    fadeChannels(channels, value, duration) {
        for (let i = 0; i < channels.length; i++) {
            var channel = channels[i];
            channel.fadeTo(value * channel.maxValue, duration);
        }
        return wait(duration * MS_PER_S);
    }
    fadeChannelsToLabel(fixtureName, channels, label, duration) {
        for (let i = 0; i < channels.length; i++) {
            var channel = channels[i];
            var valuePath = ArtnetGnS.renderValuePath(fixtureName, channel.name, label);
            var value = ArtnetGnS.channelLabelValues[valuePath];
            if (value)
                channel.fadeTo(value * channel.maxValue, duration);
        }
        return wait(duration * MS_PER_S);
    }
    padStart(value, minLength, padWith) {
        var result = value;
        while (result.length < minLength) {
            result = padWith + result;
        }
        return result;
    }
    getFixturesChannels(fixtureNames, channelNames) {
        var fixtureNameList = this.getStringArray(fixtureNames);
        var channels = [];
        for (let i = 0; i < fixtureNameList.length; i++) {
            channels = channels.concat(this.getFixtureChannels(fixtureNameList[i], channelNames));
        }
        return channels;
    }
    getFixtureChannels(fixtureName, channelNames) {
        const fixture = Artnet_1.Artnet[fixtureName];
        if (!fixture)
            return [];
        const channels = [];
        const channelNameList = channelNames && channelNames.trim().length > 0 ?
            this.getStringArray(channelNames) : this.getFixtureChannelNames(fixtureName);
        for (let i = 0; i < channelNameList.length; i++) {
            var channel = fixture[channelNameList[i]];
            if (channel)
                channels.push(channel);
        }
        return channels;
    }
    getAnalogChannels(channels) {
        var analogChannels = [];
        for (let i = 0; i < channels.length; i++) {
            var channel = channels[i];
            if (!channel.isOfTypeName('AnalogChannel'))
                return;
            const analogChannel = channel;
            analogChannels.push(analogChannel);
        }
        return analogChannels;
    }
    getFixtureChannelNames(fixtureName) {
        var channelNameList = [];
        if (ArtnetGnS.fixtureChannelNames[fixtureName]) {
            channelNameList = ArtnetGnS.fixtureChannelNames[fixtureName];
        }
        else {
            for (let i = this.mMinChannel; i <= this.mMaxChannel; i++) {
                var channelName = this.mChannelNamePrefix + this.padStart(i.toString(10), this.mChannelNameDigits, '0');
                channelNameList.push(channelName);
            }
        }
        return channelNameList;
    }
    getGroup(groupName, createIfMissing) {
        if (!ArtnetGnS.groups[groupName] && createIfMissing) {
            ArtnetGnS.groups[groupName] = new ArtnetGroup();
            if (PUBLISH_GROUP_PROPERTIES)
                this.publishGroupProps(groupName);
        }
        return ArtnetGnS.groups[groupName];
    }
    getGroups(groupNames) {
        var groupNameList = this.getStringArray(groupNames);
        var groups = [];
        for (let i = 0; i < groupNameList.length; i++) {
            var group = ArtnetGnS.groups[groupNameList[i]];
            if (group)
                groups.push(group);
        }
        return groups;
    }
    getCrossfaders(crossfaderNames) {
        var crossfaderNameList = this.getStringArray(crossfaderNames);
        var crossfaders = [];
        for (let i = 0; i < crossfaderNameList.length; i++) {
            var crossfader = ArtnetGnS.crossfaders[crossfaderNameList[i]];
            if (crossfader)
                crossfaders.push(crossfader);
        }
        return crossfaders;
    }
    getGroupChannels(groupName) {
        var group = this.getGroup(groupName, false);
        if (!group)
            return [];
        return group.channels;
    }
    getScene(sceneName, createIfMissing) {
        if (!ArtnetGnS.scenes[sceneName] && createIfMissing) {
            ArtnetGnS.scenes[sceneName] = new ArtnetScene();
            if (PUBLISH_SCENE_PROPERTIES)
                this.publishSceneProps(sceneName);
        }
        return ArtnetGnS.scenes[sceneName];
    }
    static getScene(sceneName, createIfMissing) {
        if (!ArtnetGnS.scenes[sceneName] && createIfMissing) {
            ArtnetGnS.scenes[sceneName] = new ArtnetScene();
        }
        return ArtnetGnS.scenes[sceneName];
    }
    getStringArray(list) {
        var result = [];
        var listParts = split(list, { separator: ',', quotes: ['"', '\''], brackets: { '[': ']' } });
        for (let i = 0; i < listParts.length; i++) {
            var listPart = this.removeQuotes(listParts[i].trim());
            result.push(listPart);
        }
        return result;
    }
    removeQuotes(value) {
        if (value.length < 2)
            return value;
        const QUOTATION = '"';
        const APOSTROPHE = '\'';
        var first = value.charAt(0);
        var last = value.charAt(value.length - 1);
        if ((first == QUOTATION && last == QUOTATION) ||
            (first == APOSTROPHE && last == APOSTROPHE)) {
            return value.substr(1, value.length - 2);
        }
        return value;
    }
}
exports.ArtnetGnS = ArtnetGnS;
__decorate([
    (0, Metadata_1.property)('all groups to value'),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], ArtnetGnS.prototype, "groupValue", null);
__decorate([
    (0, Metadata_1.callable)('set channel names for fixtures (fx with of type)'),
    __param(0, (0, Metadata_1.parameter)('fixtureName, fixtureName, fixtureName')),
    __param(1, (0, Metadata_1.parameter)('channelName, channelName, channelName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "fixtureSetChannelNames", null);
__decorate([
    (0, Metadata_1.callable)('fade fixture'),
    __param(0, (0, Metadata_1.parameter)('fixtureName, fixtureName, fixtureName')),
    __param(1, (0, Metadata_1.parameter)('target value. Normalised range: 0 .. 1')),
    __param(2, (0, Metadata_1.parameter)('duration in seconds', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], ArtnetGnS.prototype, "fixtureFadeTo", null);
__decorate([
    (0, Metadata_1.callable)('fade fixture to label'),
    __param(0, (0, Metadata_1.parameter)('fixtureName')),
    __param(1, (0, Metadata_1.parameter)('label')),
    __param(2, (0, Metadata_1.parameter)('duration in seconds', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "fixtureFadeToLabel", null);
__decorate([
    (0, Metadata_1.callable)('fade fixture channels'),
    __param(0, (0, Metadata_1.parameter)('fixtureName, fixtureName, fixtureName')),
    __param(1, (0, Metadata_1.parameter)('channelName, channelName, channelName')),
    __param(2, (0, Metadata_1.parameter)('target value. Normalised range: 0 .. 1')),
    __param(3, (0, Metadata_1.parameter)('duration in seconds', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], ArtnetGnS.prototype, "fixtureChannelsFadeTo", null);
__decorate([
    (0, Metadata_1.callable)('fade fixture channels to label'),
    __param(0, (0, Metadata_1.parameter)('fixtureName')),
    __param(1, (0, Metadata_1.parameter)('channelName, channelName, channelName')),
    __param(2, (0, Metadata_1.parameter)('label')),
    __param(3, (0, Metadata_1.parameter)('duration in seconds', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Number]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "fixtureChannelsFadeToLabel", null);
__decorate([
    (0, Metadata_1.callable)('settings for groupAddFixtures and sceneAddFixtures'),
    __param(0, (0, Metadata_1.parameter)('defaults to "' + CHANNEL_NAME_PREFIX + '"')),
    __param(1, (0, Metadata_1.parameter)('defaults to ' + MIN_CHANNEL)),
    __param(2, (0, Metadata_1.parameter)('defaults to ' + MAX_CHANNEL)),
    __param(3, (0, Metadata_1.parameter)('defaults to ' + CHANNEL_NAME_DIGITS + '. If maxChannel is too large, this value will be automatically adjusted to fit maxChannel')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Number]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "fixtureSetDefaults", null);
__decorate([
    (0, Metadata_1.callable)('fade group'),
    __param(0, (0, Metadata_1.parameter)('group name')),
    __param(1, (0, Metadata_1.parameter)('target value. Normalised range: 0..1')),
    __param(2, (0, Metadata_1.parameter)('fade duration in seconds', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], ArtnetGnS.prototype, "groupFadeTo", null);
__decorate([
    (0, Metadata_1.callable)('duck group (temporarily dampen group value: 0..1)'),
    __param(0, (0, Metadata_1.parameter)('group name')),
    __param(1, (0, Metadata_1.parameter)('duck amount. Percentage: 0..1 (0% - 100%)')),
    __param(2, (0, Metadata_1.parameter)('fade duration in seconds', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "groupDuck", null);
__decorate([
    (0, Metadata_1.callable)('set group value'),
    __param(0, (0, Metadata_1.parameter)('group name')),
    __param(1, (0, Metadata_1.parameter)('target value. Normalised range: 0 .. 1')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "groupSetValue", null);
__decorate([
    (0, Metadata_1.callable)('set group power'),
    __param(0, (0, Metadata_1.parameter)('group name')),
    __param(1, (0, Metadata_1.parameter)('power on/off : true/false')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "groupSetPower", null);
__decorate([
    (0, Metadata_1.callable)('group settings'),
    __param(0, (0, Metadata_1.parameter)('group name')),
    __param(1, (0, Metadata_1.parameter)('fade on duration (seconds)')),
    __param(2, (0, Metadata_1.parameter)('fade off duration (seconds)')),
    __param(3, (0, Metadata_1.parameter)('on value (0..1)')),
    __param(4, (0, Metadata_1.parameter)('off value (0..1)')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Number, Number]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "groupSetDefaults", null);
__decorate([
    (0, Metadata_1.callable)('Add complete fixtures to group (channel names have to follow the naming scheme "L_01, L_02, L_03, L_04, L_05")'),
    __param(0, (0, Metadata_1.parameter)('fixtureName, fixtureName, fixtureName')),
    __param(1, (0, Metadata_1.parameter)('name of group')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "groupAddFixtures", null);
__decorate([
    (0, Metadata_1.callable)('Add channels of fixture to group'),
    __param(0, (0, Metadata_1.parameter)('fixtureName, fixtureName, fixtureName')),
    __param(1, (0, Metadata_1.parameter)('channelName, channelName, channelName')),
    __param(2, (0, Metadata_1.parameter)('name of group')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "groupAddChannels", null);
__decorate([
    (0, Metadata_1.callable)('Add crossfader. Allows crossfade between group A and B. Features master value.'),
    __param(0, (0, Metadata_1.parameter)('name for crossfader group')),
    __param(1, (0, Metadata_1.parameter)('name of group A')),
    __param(2, (0, Metadata_1.parameter)('name of group B')),
    __param(3, (0, Metadata_1.parameter)('max value group A (0..1)', true)),
    __param(4, (0, Metadata_1.parameter)('max value group B (0..1)', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Number, Number]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "crossfaderAdd", null);
__decorate([
    __param(0, (0, Metadata_1.parameter)('name of crossfader')),
    __param(1, (0, Metadata_1.parameter)('fade value (0..1)')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "crossfaderSetFadeValue", null);
__decorate([
    __param(0, (0, Metadata_1.parameter)('name of crossfader')),
    __param(1, (0, Metadata_1.parameter)('master value (0..1)')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "crossfaderSetMasterValue", null);
__decorate([
    (0, Metadata_1.callable)('Animate crossfade'),
    __param(0, (0, Metadata_1.parameter)('name of crossfade group')),
    __param(1, (0, Metadata_1.parameter)('fade value (0..1) | -1 : ignore')),
    __param(2, (0, Metadata_1.parameter)('master value (0..1) | -1 : ignore', true)),
    __param(3, (0, Metadata_1.parameter)('fade duration in seconds', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Number]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "crossfaderFadeTo", null);
__decorate([
    (0, Metadata_1.callable)('define label'),
    __param(0, (0, Metadata_1.parameter)('label name')),
    __param(1, (0, Metadata_1.parameter)('value (0..1)')),
    __param(2, (0, Metadata_1.parameter)('fixtureName')),
    __param(3, (0, Metadata_1.parameter)('channelName, channelName, channelName', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, String, String]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "labelDefine", null);
__decorate([
    (0, Metadata_1.callable)('add fixtures to scene'),
    __param(0, (0, Metadata_1.parameter)('scene name')),
    __param(1, (0, Metadata_1.parameter)('fixtureName, fixtureName, fixtureName')),
    __param(2, (0, Metadata_1.parameter)('value (0..1)')),
    __param(3, (0, Metadata_1.parameter)('duration in seconds', true)),
    __param(4, (0, Metadata_1.parameter)('delay in seconds', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number, Number]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "sceneAddFixtures", null);
__decorate([
    (0, Metadata_1.callable)('add channels to scene'),
    __param(0, (0, Metadata_1.parameter)('scene name')),
    __param(1, (0, Metadata_1.parameter)('fixtureName, fixtureName, fixtureName')),
    __param(2, (0, Metadata_1.parameter)('channelName, channelName, channelName')),
    __param(3, (0, Metadata_1.parameter)('value (0..1)')),
    __param(4, (0, Metadata_1.parameter)('duration in seconds', true)),
    __param(5, (0, Metadata_1.parameter)('delay in seconds', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Number, Number, Number]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "sceneAddChannels", null);
__decorate([
    (0, Metadata_1.callable)('add groups to scene'),
    __param(0, (0, Metadata_1.parameter)('scene name')),
    __param(1, (0, Metadata_1.parameter)('groupName, groupName, groupName')),
    __param(2, (0, Metadata_1.parameter)('value (0..1)')),
    __param(3, (0, Metadata_1.parameter)('duration in seconds', true)),
    __param(4, (0, Metadata_1.parameter)('delay in seconds', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number, Number]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "sceneAddGroups", null);
__decorate([
    (0, Metadata_1.callable)('add crossfaders to scene'),
    __param(0, (0, Metadata_1.parameter)('scene name')),
    __param(1, (0, Metadata_1.parameter)('crossfaderName, crossfaderName, crossfaderName')),
    __param(2, (0, Metadata_1.parameter)('fade value (0..1) | -1 : ignore')),
    __param(3, (0, Metadata_1.parameter)('master value (0..1) | -1 : ignore', true)),
    __param(4, (0, Metadata_1.parameter)('duration in seconds', true)),
    __param(5, (0, Metadata_1.parameter)('delay in seconds', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number, Number, Number]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "sceneAddCrossfaders", null);
__decorate([
    (0, Metadata_1.callable)('add task execute to scene'),
    __param(0, (0, Metadata_1.parameter)('scene name')),
    __param(1, (0, Metadata_1.parameter)('realm')),
    __param(2, (0, Metadata_1.parameter)('group')),
    __param(3, (0, Metadata_1.parameter)('task')),
    __param(4, (0, Metadata_1.parameter)('delay in seconds', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Number]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "sceneAddExecute", null);
__decorate([
    (0, Metadata_1.callable)('add call scene to scene'),
    __param(0, (0, Metadata_1.parameter)('scene name')),
    __param(1, (0, Metadata_1.parameter)('scene name to call')),
    __param(2, (0, Metadata_1.parameter)('timefactor')),
    __param(3, (0, Metadata_1.parameter)('delay in seconds', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "sceneAddCallScene", null);
__decorate([
    (0, Metadata_1.callable)('add fade to label to scene'),
    __param(0, (0, Metadata_1.parameter)('scene name')),
    __param(1, (0, Metadata_1.parameter)('label')),
    __param(2, (0, Metadata_1.parameter)('fixtureName')),
    __param(3, (0, Metadata_1.parameter)('channelName, channelName, channelName', true)),
    __param(4, (0, Metadata_1.parameter)('duration in seconds', true)),
    __param(5, (0, Metadata_1.parameter)('delay in seconds', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Number, Number]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "sceneAddChannelsFadeToLabel", null);
__decorate([
    (0, Metadata_1.callable)('call scene'),
    __param(0, (0, Metadata_1.parameter)('scene name')),
    __param(1, (0, Metadata_1.parameter)('time factor (> 1 faster, < 1 slower)', true)),
    __param(2, (0, Metadata_1.parameter)('seek to position in seconds', true)),
    __param(3, (0, Metadata_1.parameter)('force execution (usually a scene has to finish before it can be called again)', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Boolean]),
    __metadata("design:returntype", Promise)
], ArtnetGnS.prototype, "sceneCall", null);
__decorate([
    (0, Metadata_1.callable)('cancel scene'),
    __param(0, (0, Metadata_1.parameter)('scene name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "sceneCancel", null);
__decorate([
    (0, Metadata_1.callable)('is scene running?'),
    __param(0, (0, Metadata_1.parameter)('scene name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "sceneIsRunning", null);
__decorate([
    (0, Metadata_1.callable)('fade all groups to value'),
    __param(0, (0, Metadata_1.parameter)('target value. Normalised range: 0 .. 1')),
    __param(1, (0, Metadata_1.parameter)('duration in seconds')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], ArtnetGnS.prototype, "groupAllFadeTo", null);
__decorate([
    (0, Metadata_1.callable)("Animate Group ('chase', 'chase backwards')"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, String]),
    __metadata("design:returntype", Promise)
], ArtnetGnS.prototype, "groupAnimate", null);
__decorate([
    (0, Metadata_1.callable)("Animate Fixture ('chase')"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, String]),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "fixtureAnimate", null);
__decorate([
    (0, Metadata_1.callable)('Reset setup (delete all groups and scenes)'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ArtnetGnS.prototype, "reset", null);
class ArtnetCrossfader {
    groupA;
    groupB;
    maxValueA = 1;
    maxValueB = 1;
    fadeValue = 0;
    masterValue = 0;
    constructor(groupA, groupB, maxValueA, maxValueB) {
        this.groupA = groupA;
        this.groupB = groupB;
        if (maxValueA)
            this.maxValueA = maxValueA;
        if (maxValueB)
            this.maxValueB = maxValueB;
    }
    fadeTo(fadeValue, masterValue, duration) {
        if (fadeValue >= 0)
            this.fadeValue = fadeValue;
        if (masterValue >= 0)
            this.masterValue = masterValue;
        this.applyChanges(duration);
    }
    applyChanges(duration) {
        this.groupA.fadeTo(this.masterValue * this.maxValueA * (1.0 - this.fadeValue), duration);
        this.groupB.fadeTo(this.masterValue * this.maxValueB * this.fadeValue, duration);
    }
}
class ArtnetGroup {
    mChannels = [];
    mFadeOnDuration = 1;
    mFadeOffDuration = 1;
    mOnValue = 1;
    mOffValue = 0;
    mPowerOn = false;
    currentValue = 0;
    duckValue = 0;
    set value(value) {
        this.currentValue = value;
        var effectiveValue = (1 - this.duckValue) * this.currentValue;
        for (let i = 0; i < this.mChannels.length; i++) {
            var channel = this.mChannels[i];
            channel.value = effectiveValue * channel.maxValue;
        }
    }
    set power(on) {
        this.currentValue = on ? this.mOnValue : this.mOffValue;
        var effectiveValue = (1 - this.duckValue) * this.currentValue;
        var duration = on ? this.mFadeOnDuration : this.mFadeOffDuration;
        for (let i = 0; i < this.mChannels.length; i++) {
            var channel = this.mChannels[i];
            channel.fadeTo(effectiveValue * channel.maxValue, duration);
        }
        this.mPowerOn = on;
    }
    get power() {
        return this.mPowerOn;
    }
    get channels() {
        return this.mChannels;
    }
    addChannel(channel) {
        if (!channel.isOfTypeName('AnalogChannel'))
            return;
        const analogChannel = channel;
        this.mChannels.push(analogChannel);
    }
    addChannels(channels) {
        for (let i = 0; i < channels.length; i++) {
            this.addChannel(channels[i]);
        }
    }
    duck(duckValue, duration) {
        this.duckValue = duckValue;
        this.fadeTo(this.currentValue, duration);
    }
    fadeTo(value, duration) {
        this.currentValue = value;
        var effectiveValue = (1 - this.duckValue) * this.currentValue;
        for (let i = 0; i < this.mChannels.length; i++) {
            var channel = this.mChannels[i];
            channel.fadeTo(effectiveValue * channel.maxValue, duration);
        }
        return wait(duration * MS_PER_S);
    }
    setDefaults(fadeOnDuration, fadeOffDuration, onValue, offValue) {
        this.mFadeOnDuration = fadeOnDuration;
        this.mFadeOffDuration = fadeOffDuration;
        this.mOnValue = onValue;
        this.mOffValue = offValue;
    }
}
class ArtnetScene {
    sceneItems = [];
    sceneCallStartMs;
    callingScene;
    callingSceneResolver;
    callingSceneRejector;
    runObject = null;
    runCounter = 0;
    debug;
    get duration() {
        var max = 0;
        for (let i = 0; i < this.sceneItems.length; i++) {
            var channel = this.sceneItems[i];
            var total = channel.delay + channel.duration;
            if (total > max)
                max = total;
        }
        return max;
    }
    get isRunning() {
        return this.runObject !== null;
    }
    addChannel(channel, value, duration, delay) {
        this.addChannelInternal(channel, value, duration, delay);
        this.applyChanges();
    }
    addChannels(channels, value, duration, delay) {
        for (let i = 0; i < channels.length; i++) {
            this.addChannelInternal(channels[i], value, duration, delay);
        }
        this.applyChanges();
    }
    addChannelsFadeToLabel(fixtureName, channels, label, duration, delay) {
        for (let i = 0; i < channels.length; i++) {
            this.addChannelFadeToLabelInternal(fixtureName, channels[i], label, duration, delay);
        }
        this.applyChanges();
    }
    addGroup(group, value, duration, delay) {
        this.addGroupInternal(group, value, duration, delay);
        this.applyChanges();
    }
    addGroups(groups, value, duration, delay) {
        for (let i = 0; i < groups.length; i++) {
            this.addGroupInternal(groups[i], value, duration, delay);
        }
        this.applyChanges();
    }
    addCrossfader(crossfader, fadeValue, masterValue, duration, delay) {
        this.addCrossfaderInternal(crossfader, fadeValue, masterValue, duration, delay);
        this.applyChanges();
    }
    addCrossfaders(crossfaders, fadeValue, masterValue, duration, delay) {
        for (let i = 0; i < crossfaders.length; i++) {
            this.addCrossfaderInternal(crossfaders[i], fadeValue, masterValue, duration, delay);
        }
        this.applyChanges();
    }
    addExecute(realm, group, task, delay) {
        this.sceneItems.push(new ArtnetSceneExecute(realm, group, task, 0, delay));
        this.applyChanges();
    }
    addCallScene(sceneName, timefactor, delay) {
        this.sceneItems.push(new ArtnetSceneCallScene(sceneName, timefactor, 0, delay));
        this.applyChanges();
    }
    applyChanges() {
        this.sceneItems.sort((a, b) => {
            if (a.delay > b.delay)
                return 1;
            if (b.delay > a.delay)
                return -1;
            return 0;
        });
    }
    addChannelInternal(channel, value, duration, delay) {
        this.sceneItems.push(new ArtnetSceneChannel(channel, value, duration, delay));
    }
    addChannelFadeToLabelInternal(fixtureName, channel, label, duration, delay) {
        this.sceneItems.push(new ArtnetSceneChannelFadeToLabel(fixtureName, channel, label, duration, delay));
    }
    addGroupInternal(group, value, duration, delay) {
        this.sceneItems.push(new ArtnetSceneGroup(group, value, duration, delay));
    }
    addCrossfaderInternal(crossfader, fadeValue, masterValue, duration, delay) {
        this.sceneItems.push(new ArtnetSceneCrossfade(crossfader, fadeValue, masterValue, duration, delay));
    }
    call(timefactor, seekTo, force) {
        this.sceneCallStartMs = Date.now();
        if (seekTo)
            this.sceneCallStartMs -= seekTo * MS_PER_S;
        if (this.callingScene && force) {
            if (this.debug)
                console.log('stopping previous scene call');
            this.resolveSceneExecution();
        }
        if (!this.callingScene) {
            this.callingScene = new Promise((resolve, reject) => {
                this.callingSceneResolver = resolve;
                this.callingSceneRejector = reject;
                if (!timefactor)
                    timefactor = 1.0;
                var duration = this.duration * timefactor;
                if (seekTo)
                    duration -= seekTo;
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
    cancel() {
        if (this.callingScene) {
            this.resolveSceneExecution();
            this.runObject = null;
        }
    }
    executeScene(channelPos, timefactor, runObject, runCounter) {
        var nowMs = Date.now();
        var deltaTimeMs = nowMs - this.sceneCallStartMs;
        var sceneItem;
        if (this.debug)
            console.log('continuing scene at ' + deltaTimeMs + 'ms (#' + runCounter + ')');
        if (runObject !== this.runObject) {
            console.log('runID is wrong ' + runObject + ' vs ' + this.runObject);
            return;
        }
        for (let i = channelPos; i < this.sceneItems.length; i++) {
            sceneItem = this.sceneItems[i];
            var delay = sceneItem.delay * timefactor;
            var deltaDelay = delay * MS_PER_S - deltaTimeMs;
            if (deltaDelay <= 0) {
                sceneItem.call(timefactor * (deltaDelay < -MS_PER_S ? 0.001 : 1));
                if (this.debug)
                    console.log('calling scene item ' + i + ' at ' + deltaTimeMs + 'ms (#' + runCounter + ')');
            }
            else {
                wait(deltaDelay).then(() => {
                    const offset = i;
                    this.executeScene(offset, timefactor, runObject, runCounter);
                });
                return;
            }
        }
    }
    resolveSceneExecution() {
        if (this.callingSceneResolver)
            this.callingSceneResolver(true);
        delete this.callingSceneResolver;
        delete this.callingSceneRejector;
        delete this.callingScene;
    }
}
class ArtnetSceneItem {
    duration;
    delay;
    constructor(duration, delay) {
        this.duration = duration ? duration : 0;
        this.delay = delay ? delay : 0;
    }
}
class ArtnetSceneChannel extends ArtnetSceneItem {
    channel;
    value;
    constructor(channel, value, duration, delay) {
        super(duration, delay);
        this.channel = channel;
        this.value = value;
    }
    call(timefactor) {
        this.channel.fadeTo(this.value * this.channel.maxValue, timefactor ? timefactor * this.duration : this.duration);
    }
}
class ArtnetSceneChannelFadeToLabel extends ArtnetSceneItem {
    channel;
    valuePath;
    constructor(fixtureName, channel, label, duration, delay) {
        super(duration, delay);
        this.channel = channel;
        this.valuePath = ArtnetGnS.renderValuePath(fixtureName, channel.name, label);
    }
    call(timefactor) {
        var value = ArtnetGnS.channelLabelValues[this.valuePath];
        if (value) {
            this.channel.fadeTo(value * this.channel.maxValue, timefactor ? timefactor * this.duration : this.duration);
        }
    }
}
class ArtnetSceneGroup extends ArtnetSceneItem {
    group;
    value;
    constructor(group, value, duration, delay) {
        super(duration, delay);
        this.group = group;
        this.value = value;
    }
    call(timefactor) {
        this.group.fadeTo(this.value, timefactor ? timefactor * this.duration : this.duration);
    }
}
class ArtnetSceneCrossfade extends ArtnetSceneItem {
    crossfader;
    fadeValue;
    masterValue;
    constructor(crossfader, fadeValue, masterValue, duration, delay) {
        super(duration, delay);
        this.crossfader = crossfader;
        this.fadeValue = fadeValue;
        this.masterValue = masterValue;
    }
    call(timefactor) {
        this.crossfader.fadeTo(this.fadeValue, this.masterValue, timefactor ? timefactor * this.duration : this.duration);
    }
}
class ArtnetSceneExecute extends ArtnetSceneItem {
    realm;
    group;
    task;
    constructor(realm, group, task, duration, delay) {
        super(duration, delay);
        this.realm = realm;
        this.group = group;
        this.task = task;
    }
    call(factor) {
        if (factor > 0.9 && factor < 1.1) {
            Realm_1.Realm[this.realm].group[this.group][this.task].running = true;
        }
    }
}
class ArtnetSceneCallScene extends ArtnetSceneItem {
    sceneName;
    timefactor;
    constructor(sceneName, timefactor, duration, delay) {
        super(duration, delay);
        this.sceneName = sceneName;
        this.timefactor = timefactor;
    }
    call(factor) {
        if (factor > 0.9 && factor < 1.1) {
            ArtnetGnS.sceneCall(this.sceneName, this.timefactor);
        }
    }
}
