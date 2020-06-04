var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
define(["require", "exports", "system/Artnet", "system/Realm", "system_lib/Script", "system_lib/Metadata"], function (require, exports, Artnet_1, Realm_1, Script_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ArtnetGnS = void 0;
    var CHANNEL_NAME_PREFIX = 'L_';
    var CHANNEL_NAME_DIGITS = 2;
    var MIN_CHANNEL = 1;
    var MAX_CHANNEL = 42;
    var MS_PER_S = 1000;
    var PUBLISH_GROUP_PROPERTIES = true;
    var PUBLISH_SCENE_PROPERTIES = true;
    var PUBLISH_CROSSFADER_PROPERTIES = true;
    var split = require("lib/split-string");
    var ArtnetGnS = (function (_super) {
        __extends(ArtnetGnS, _super);
        function ArtnetGnS(env) {
            var _this = _super.call(this, env) || this;
            _this.mFadeDuration = 1.0;
            _this.mLightOffValue = 0.0;
            _this.mMinChannel = MIN_CHANNEL;
            _this.mMaxChannel = MAX_CHANNEL;
            _this.mValue = 0.0;
            _this.mChannelNamePrefix = CHANNEL_NAME_PREFIX;
            _this.mChannelNameDigits = CHANNEL_NAME_DIGITS;
            return _this;
        }
        Object.defineProperty(ArtnetGnS.prototype, "groupValue", {
            get: function () {
                return this.mValue;
            },
            set: function (value) {
                for (var key in ArtnetGnS.groups) {
                    ArtnetGnS.groups[key].value = value;
                }
                this.mValue = value;
            },
            enumerable: false,
            configurable: true
        });
        ArtnetGnS.prototype.fixtureSetChannelNames = function (fixtureNames, channelNames) {
            var fixtureNameList = this.getStringArray(fixtureNames);
            var channelNameList = this.getStringArray(channelNames);
            for (var i = 0; i < fixtureNameList.length; i++) {
                ArtnetGnS.fixtureChannelNames[fixtureNameList[i]] = channelNameList;
            }
        };
        ArtnetGnS.prototype.fixtureFadeTo = function (fixtureName, value, duration) {
            var channels = this.getAnalogChannels(this.getFixturesChannels(fixtureName, ''));
            return this.fadeChannels(channels, value, duration ? duration : this.mFadeDuration);
        };
        ArtnetGnS.prototype.fixtureChannelsFadeTo = function (fixtureName, channelNames, value, duration) {
            var channels = this.getAnalogChannels(this.getFixturesChannels(fixtureName, channelNames));
            return this.fadeChannels(channels, value, duration ? duration : this.mFadeDuration);
        };
        ArtnetGnS.prototype.fixtureSetDefaults = function (channelNamePrefix, minChannel, maxChannel, channelNameDigits) {
            this.mChannelNamePrefix = channelNamePrefix;
            this.mMinChannel = minChannel;
            this.mMaxChannel = maxChannel;
            var neededDigits = maxChannel.toString().length;
            this.mChannelNameDigits = Math.max(channelNameDigits, neededDigits);
        };
        ArtnetGnS.prototype.groupFadeTo = function (groupName, value, duration) {
            var group = this.getGroup(groupName, false);
            return group ? group.fadeTo(value, duration ? duration : this.mFadeDuration) : undefined;
        };
        ArtnetGnS.prototype.groupDuck = function (groupName, value, duration) {
            var group = this.getGroup(groupName, false);
            if (!group)
                return;
            group.duck(value, duration ? duration : this.mFadeDuration);
        };
        ArtnetGnS.prototype.groupSetValue = function (groupName, value) {
            var group = this.getGroup(groupName, false);
            if (!group)
                return;
            group.value = value;
        };
        ArtnetGnS.prototype.groupSetPower = function (groupName, power) {
            var group = this.getGroup(groupName, false);
            if (!group)
                return;
            group.power = power;
        };
        ArtnetGnS.prototype.groupSetDefaults = function (groupName, fadeOnDuration, fadeOffDuration, onValue, offValue) {
            var group = this.getGroup(groupName, true);
            group.setDefaults(fadeOnDuration, fadeOffDuration, onValue, offValue);
        };
        ArtnetGnS.prototype.groupAddFixtures = function (fixtureNames, groupName) {
            var channels = this.getFixturesChannels(fixtureNames);
            this.getGroup(groupName, true).addChannels(channels);
        };
        ArtnetGnS.prototype.groupAddChannels = function (fixtureNames, channelNames, groupName) {
            var channels = this.getFixturesChannels(fixtureNames, channelNames);
            this.getGroup(groupName, true).addChannels(channels);
        };
        ArtnetGnS.prototype.crossfaderAdd = function (crossfaderName, groupNameA, groupNameB, maxValueA, maxValueB) {
            var groupA = this.getGroup(groupNameA, false);
            var groupB = this.getGroup(groupNameB, false);
            if (groupA && groupB) {
                ArtnetGnS.crossfaders[crossfaderName] = new ArtnetCrossfader(groupA, groupB, maxValueA, maxValueB);
                if (PUBLISH_CROSSFADER_PROPERTIES)
                    this.publishCrossfaderProps(crossfaderName);
            }
        };
        ArtnetGnS.prototype.crossfaderSetFadeValue = function (crossfaderName, fadeValue) {
            var crossfader = ArtnetGnS.crossfaders[crossfaderName];
            if (!crossfader)
                return;
            crossfader.fadeTo(fadeValue, -1, 0);
        };
        ArtnetGnS.prototype.crossfaderSetMasterValue = function (crossfaderName, masterValue) {
            var crossfader = ArtnetGnS.crossfaders[crossfaderName];
            if (!crossfader)
                return;
            crossfader.fadeTo(-1, masterValue, 0);
        };
        ArtnetGnS.prototype.crossfaderFadeTo = function (crossfaderName, fadeValue, masterValue, duration) {
            var crossfader = ArtnetGnS.crossfaders[crossfaderName];
            return crossfader ? crossfader.fadeTo(fadeValue, masterValue ? masterValue : -1, duration ? duration : this.mFadeDuration) : undefined;
        };
        ArtnetGnS.prototype.sceneAddFixtures = function (sceneName, fixtureNames, value, duration, delay) {
            var channels = this.getAnalogChannels(this.getFixturesChannels(fixtureNames));
            this.getScene(sceneName, true).addChannels(channels, value, duration, delay);
        };
        ArtnetGnS.prototype.sceneAddChannels = function (sceneName, fixtureNames, channelNames, value, duration, delay) {
            var channels = this.getAnalogChannels(this.getFixturesChannels(fixtureNames, channelNames));
            this.getScene(sceneName, true).addChannels(channels, value, duration, delay);
        };
        ArtnetGnS.prototype.sceneAddGroups = function (sceneName, groupNames, value, duration, delay) {
            var groups = this.getGroups(groupNames);
            this.getScene(sceneName, true).addGroups(groups, value, duration, delay);
        };
        ArtnetGnS.prototype.sceneAddCrossfaders = function (sceneName, crossfaderNames, fadeValue, masterValue, duration, delay) {
            var crossfaders = this.getCrossfaders(crossfaderNames);
            this.getScene(sceneName, true).addCrossfaders(crossfaders, fadeValue, masterValue, duration, delay);
        };
        ArtnetGnS.prototype.sceneAddExecute = function (sceneName, realmName, groupName, taskName, delay) {
            this.getScene(sceneName, true).addExecute(realmName, groupName, taskName, delay);
        };
        ArtnetGnS.prototype.sceneCall = function (sceneName, timefactor, seekTo, force) {
            var scene = this.getScene(sceneName, false);
            if (timefactor) {
                if (timefactor <= 0.0)
                    return;
                timefactor = 1.0 / timefactor;
            }
            scene.call(timefactor, seekTo, force);
            return undefined;
        };
        ArtnetGnS.prototype.sceneCancel = function (sceneName) {
            var scene = this.getScene(sceneName, false);
            if (!scene)
                return;
            scene.cancel();
        };
        ArtnetGnS.prototype.sceneIsRunning = function (sceneName) {
            var scene = this.getScene(sceneName, false);
            return scene ? scene.isRunning : false;
        };
        ArtnetGnS.prototype.groupAllFadeTo = function (value, duration) {
            if (value > 1.0)
                value = value / 255.0;
            for (var key in ArtnetGnS.groups) {
                ArtnetGnS.groups[key].fadeTo(value, duration);
            }
            return wait(duration * MS_PER_S);
        };
        ArtnetGnS.prototype.groupAnimate = function (groupName, delay, style) {
            if (style == 'chase') {
                var channels = this.getGroupChannels(groupName);
                return this.recursiveChase(channels, delay);
            }
            if (style == 'chase backwards') {
                var channels = this.getGroupChannels(groupName);
                return this.recursiveChase(channels, delay, true);
            }
        };
        ArtnetGnS.prototype.fixtureAnimate = function (fixtureName, delay, style) {
            if (style == 'chase') {
                var channels = this.getAnalogChannels(this.getFixtureChannels(fixtureName, ''));
                this.recursiveChase(channels, delay);
            }
        };
        ArtnetGnS.prototype.reset = function () {
            ArtnetGnS.fixtureChannelNames = {};
            ArtnetGnS.groups = {};
            for (var key in ArtnetGnS.scenes) {
                var scene = ArtnetGnS.scenes[key];
                scene.cancel();
            }
            ArtnetGnS.scenes = {};
            ArtnetGnS.crossfaders = {};
        };
        ArtnetGnS.sanitizePropName = function (propName) {
            return propName.replace(/[^\w\-]/g, '-');
        };
        ArtnetGnS.grpPropNameDuck = function (groupName) {
            return this.sanitizePropName('_gr_' + groupName + '_dck');
        };
        ArtnetGnS.grpPropNameValue = function (groupName) {
            return this.sanitizePropName('_gr_' + groupName + '_val');
        };
        ArtnetGnS.grpPropNamePower = function (groupName) {
            return this.sanitizePropName('_gr_' + groupName + '_pwr');
        };
        ArtnetGnS.scnPropNameTrigger = function (sceneName) {
            return this.sanitizePropName('_sc_' + sceneName + '_trigger');
        };
        ArtnetGnS.cfdrPropNameFadeValue = function (crossfaderName) {
            return this.sanitizePropName('_cfdr_' + crossfaderName + '_fade');
        };
        ArtnetGnS.cfdrPropNameMasterValue = function (crossfaderName) {
            return this.sanitizePropName('_cfdr_' + crossfaderName + '_master');
        };
        ArtnetGnS.prototype.publishGroupProps = function (groupName) {
            var _this = this;
            var duck = 0;
            var value = 0;
            var power = false;
            this.property(ArtnetGnS.grpPropNameDuck(groupName), { type: Number, description: "duck group (temporarily dampen group value: 0..1)" }, function (setValue) {
                if (setValue !== undefined) {
                    duck = setValue;
                    _this.groupDuck(groupName, setValue);
                }
                return duck;
            });
            this.property(ArtnetGnS.grpPropNameValue(groupName), { type: Number, description: "group value 0..1 (normalised range)" }, function (setValue) {
                if (setValue !== undefined) {
                    value = setValue;
                    _this.groupSetValue(groupName, setValue);
                }
                return value;
            });
            this.property(ArtnetGnS.grpPropNamePower(groupName), { type: Boolean, description: "group power on/off" }, function (setValue) {
                if (setValue !== undefined) {
                    power = setValue;
                    _this.groupSetPower(groupName, power);
                }
                return power;
            });
        };
        ArtnetGnS.prototype.publishCrossfaderProps = function (crossfaderName) {
            var _this = this;
            var masterValue = 0;
            var fadeValue = 0;
            this.property(ArtnetGnS.cfdrPropNameMasterValue(crossfaderName), { type: Number, description: "Master Value 0..1" }, function (setValue) {
                if (setValue !== undefined) {
                    masterValue = setValue;
                    _this.crossfaderSetMasterValue(crossfaderName, masterValue);
                }
                return masterValue;
            });
            this.property(ArtnetGnS.cfdrPropNameFadeValue(crossfaderName), { type: Number, description: "Crossfade 0..1" }, function (setValue) {
                if (setValue !== undefined) {
                    fadeValue = setValue;
                    _this.crossfaderSetFadeValue(crossfaderName, fadeValue);
                }
                return fadeValue;
            });
        };
        ArtnetGnS.prototype.publishSceneProps = function (sceneName) {
            var _this = this;
            var trigger = false;
            this.property(ArtnetGnS.scnPropNameTrigger(sceneName), { type: Boolean, description: "Trigger Scene" }, function (setValue) {
                if (setValue !== undefined) {
                    trigger = setValue;
                    _this.sceneCall(sceneName);
                }
                return trigger;
            });
        };
        ArtnetGnS.prototype.recursiveValue = function (channels, pos, value, delay) {
            var _this = this;
            if (pos == channels.length)
                return;
            wait(delay * MS_PER_S).then(function () {
                var channel = channels[pos];
                channel.fadeTo(value * channel.maxValue, delay);
                _this.recursiveValue(channels, pos + 1, value, delay);
            });
        };
        ArtnetGnS.prototype.recursiveChase = function (channels, delay, backwards) {
            var _this = this;
            var channelsCopy = channels.slice();
            if (backwards)
                channelsCopy = channelsCopy.reverse();
            this.recursiveValue(channelsCopy, 0, 1, delay);
            var waitDelay = delay * 2 * MS_PER_S;
            wait(waitDelay).then(function () {
                _this.recursiveValue(channelsCopy, 0, _this.mLightOffValue, delay);
            });
            return new Promise(function (resolve, reject) {
                var total = channelsCopy.length * delay * MS_PER_S + waitDelay;
                wait(total + MS_PER_S).then(function () {
                    reject('scene timeout! (did not finish on time)');
                });
                wait(total).then(function () {
                    resolve();
                });
            });
        };
        ArtnetGnS.prototype.fadeChannels = function (channels, value, duration) {
            for (var i = 0; i < channels.length; i++) {
                var channel = channels[i];
                channel.fadeTo(value * channel.maxValue, duration);
            }
            return wait(duration * MS_PER_S);
        };
        ArtnetGnS.prototype.padStart = function (value, minLength, padWith) {
            var result = value;
            while (result.length < minLength) {
                result = padWith + result;
            }
            return result;
        };
        ArtnetGnS.prototype.getFixturesChannels = function (fixtureNames, channelNames) {
            var fixtureNameList = this.getStringArray(fixtureNames);
            var channels = [];
            for (var i = 0; i < fixtureNameList.length; i++) {
                channels = channels.concat(this.getFixtureChannels(fixtureNameList[i], channelNames));
            }
            return channels;
        };
        ArtnetGnS.prototype.getFixtureChannels = function (fixtureName, channelNames) {
            var fixture = Artnet_1.Artnet[fixtureName];
            if (!fixture)
                return [];
            var channels = [];
            var channelNameList = channelNames && channelNames.trim().length > 0 ?
                this.getStringArray(channelNames) : this.getFixtureChannelNames(fixtureName);
            for (var i = 0; i < channelNameList.length; i++) {
                var channel = fixture[channelNameList[i]];
                if (channel)
                    channels.push(channel);
            }
            return channels;
        };
        ArtnetGnS.prototype.getAnalogChannels = function (channels) {
            var analogChannels = [];
            for (var i = 0; i < channels.length; i++) {
                var channel = channels[i];
                if (!channel.isOfTypeName('AnalogChannel'))
                    return;
                var analogChannel = channel;
                analogChannels.push(analogChannel);
            }
            return analogChannels;
        };
        ArtnetGnS.prototype.getFixtureChannelNames = function (fixtureName) {
            var channelNameList = [];
            if (ArtnetGnS.fixtureChannelNames[fixtureName]) {
                channelNameList = ArtnetGnS.fixtureChannelNames[fixtureName];
            }
            else {
                for (var i = this.mMinChannel; i < this.mMaxChannel; i++) {
                    var channelName = this.mChannelNamePrefix + this.padStart(i.toString(10), this.mChannelNameDigits, '0');
                    channelNameList.push(channelName);
                }
            }
            return channelNameList;
        };
        ArtnetGnS.prototype.getGroup = function (groupName, createIfMissing) {
            if (!ArtnetGnS.groups[groupName] && createIfMissing) {
                ArtnetGnS.groups[groupName] = new ArtnetGroup();
                if (PUBLISH_GROUP_PROPERTIES)
                    this.publishGroupProps(groupName);
            }
            return ArtnetGnS.groups[groupName];
        };
        ArtnetGnS.prototype.getGroups = function (groupNames) {
            var groupNameList = this.getStringArray(groupNames);
            var groups = [];
            for (var i = 0; i < groupNameList.length; i++) {
                var group = ArtnetGnS.groups[groupNameList[i]];
                if (group)
                    groups.push(group);
            }
            return groups;
        };
        ArtnetGnS.prototype.getCrossfaders = function (crossfaderNames) {
            var crossfaderNameList = this.getStringArray(crossfaderNames);
            var crossfaders = [];
            for (var i = 0; i < crossfaderNameList.length; i++) {
                var crossfader = ArtnetGnS.crossfaders[crossfaderNameList[i]];
                if (crossfader)
                    crossfaders.push(crossfader);
            }
            return crossfaders;
        };
        ArtnetGnS.prototype.getGroupChannels = function (groupName) {
            var group = this.getGroup(groupName, false);
            if (!group)
                return [];
            return group.channels;
        };
        ArtnetGnS.prototype.getScene = function (sceneName, createIfMissing) {
            if (!ArtnetGnS.scenes[sceneName] && createIfMissing) {
                ArtnetGnS.scenes[sceneName] = new ArtnetScene();
                if (PUBLISH_SCENE_PROPERTIES)
                    this.publishSceneProps(sceneName);
            }
            return ArtnetGnS.scenes[sceneName];
        };
        ArtnetGnS.prototype.getStringArray = function (list) {
            var result = [];
            var listParts = split(list, { separator: ',', quotes: ['"', '\''], brackets: { '[': ']' } });
            for (var i = 0; i < listParts.length; i++) {
                var listPart = this.removeQuotes(listParts[i].trim());
                result.push(listPart);
            }
            return result;
        };
        ArtnetGnS.prototype.removeQuotes = function (value) {
            if (value.length < 2)
                return value;
            var QUOTATION = '"';
            var APOSTROPHE = '\'';
            var first = value.charAt(0);
            var last = value.charAt(value.length - 1);
            if ((first == QUOTATION && last == QUOTATION) ||
                (first == APOSTROPHE && last == APOSTROPHE)) {
                return value.substr(1, value.length - 2);
            }
            return value;
        };
        ArtnetGnS.groups = {};
        ArtnetGnS.scenes = {};
        ArtnetGnS.fixtureChannelNames = {};
        ArtnetGnS.crossfaders = {};
        __decorate([
            Metadata_1.property('all groups to value'),
            Metadata_1.min(0),
            Metadata_1.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], ArtnetGnS.prototype, "groupValue", null);
        __decorate([
            Metadata_1.callable('set channel names for fixtures (fx with of type)'),
            __param(0, Metadata_1.parameter('fixtureName, fixtureName, fixtureName')),
            __param(1, Metadata_1.parameter('channelName, channelName, channelName')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "fixtureSetChannelNames", null);
        __decorate([
            Metadata_1.callable('fade fixture'),
            __param(0, Metadata_1.parameter('fixtureName, fixtureName, fixtureName')),
            __param(1, Metadata_1.parameter('target value. Normalised range: 0 .. 1')),
            __param(2, Metadata_1.parameter('duration in seconds', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, Number]),
            __metadata("design:returntype", Promise)
        ], ArtnetGnS.prototype, "fixtureFadeTo", null);
        __decorate([
            Metadata_1.callable('fade fixture channels'),
            __param(0, Metadata_1.parameter('fixtureName, fixtureName, fixtureName')),
            __param(1, Metadata_1.parameter('channelName, channelName, channelName')),
            __param(2, Metadata_1.parameter('target value. Normalised range: 0 .. 1')),
            __param(3, Metadata_1.parameter('duration in seconds', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, Number, Number]),
            __metadata("design:returntype", Promise)
        ], ArtnetGnS.prototype, "fixtureChannelsFadeTo", null);
        __decorate([
            Metadata_1.callable('settings for groupAddFixtures and sceneAddFixtures'),
            __param(0, Metadata_1.parameter('defaults to "' + CHANNEL_NAME_PREFIX + '"')),
            __param(1, Metadata_1.parameter('defaults to ' + MIN_CHANNEL)),
            __param(2, Metadata_1.parameter('defaults to ' + MAX_CHANNEL)),
            __param(3, Metadata_1.parameter('defaults to ' + CHANNEL_NAME_DIGITS + '. If maxChannel is too large, this value will be automatically adjusted to fit maxChannel')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "fixtureSetDefaults", null);
        __decorate([
            Metadata_1.callable('fade group'),
            __param(0, Metadata_1.parameter('group name')),
            __param(1, Metadata_1.parameter('target value. Normalised range: 0..1')),
            __param(2, Metadata_1.parameter('fade duration in seconds', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, Number]),
            __metadata("design:returntype", Promise)
        ], ArtnetGnS.prototype, "groupFadeTo", null);
        __decorate([
            Metadata_1.callable('duck group (temporarily dampen group value: 0..1)'),
            __param(0, Metadata_1.parameter('group name')),
            __param(1, Metadata_1.parameter('duck amount. Percentage: 0..1 (0% - 100%)')),
            __param(2, Metadata_1.parameter('fade duration in seconds', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "groupDuck", null);
        __decorate([
            Metadata_1.callable('set group value'),
            __param(0, Metadata_1.parameter('group name')),
            __param(1, Metadata_1.parameter('target value. Normalised range: 0 .. 1')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "groupSetValue", null);
        __decorate([
            Metadata_1.callable('set group power'),
            __param(0, Metadata_1.parameter('group name')),
            __param(1, Metadata_1.parameter('power on/off : true/false')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Boolean]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "groupSetPower", null);
        __decorate([
            Metadata_1.callable('group settings'),
            __param(0, Metadata_1.parameter('group name')),
            __param(1, Metadata_1.parameter('fade on duration (seconds)')),
            __param(2, Metadata_1.parameter('fade off duration (seconds)')),
            __param(3, Metadata_1.parameter('on value (0..1)')),
            __param(4, Metadata_1.parameter('off value (0..1)')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "groupSetDefaults", null);
        __decorate([
            Metadata_1.callable('Add complete fixtures to group (channel names have to follow the naming scheme "L_01, L_02, L_03, L_04, L_05")'),
            __param(0, Metadata_1.parameter('fixtureName, fixtureName, fixtureName')),
            __param(1, Metadata_1.parameter('name of group')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "groupAddFixtures", null);
        __decorate([
            Metadata_1.callable('Add channels of fixture to group'),
            __param(0, Metadata_1.parameter('fixtureName, fixtureName, fixtureName')),
            __param(1, Metadata_1.parameter('channelName, channelName, channelName')),
            __param(2, Metadata_1.parameter('name of group')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, String]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "groupAddChannels", null);
        __decorate([
            Metadata_1.callable('Add crossfader. Allows crossfade between group A and B. Features master value.'),
            __param(0, Metadata_1.parameter('name for crossfader group')),
            __param(1, Metadata_1.parameter('name of group A')),
            __param(2, Metadata_1.parameter('name of group B')),
            __param(3, Metadata_1.parameter('max value group A (0..1)', true)),
            __param(4, Metadata_1.parameter('max value group B (0..1)', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, String, Number, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "crossfaderAdd", null);
        __decorate([
            __param(0, Metadata_1.parameter('name of crossfader')),
            __param(1, Metadata_1.parameter('fade value (0..1)')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "crossfaderSetFadeValue", null);
        __decorate([
            __param(0, Metadata_1.parameter('name of crossfader')),
            __param(1, Metadata_1.parameter('master value (0..1)')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "crossfaderSetMasterValue", null);
        __decorate([
            Metadata_1.callable('Animate crossfade'),
            __param(0, Metadata_1.parameter('name of crossfade group')),
            __param(1, Metadata_1.parameter('fade value (0..1) | -1 : ignore')),
            __param(2, Metadata_1.parameter('master value (0..1) | -1 : ignore', true)),
            __param(3, Metadata_1.parameter('fade duration in seconds', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "crossfaderFadeTo", null);
        __decorate([
            Metadata_1.callable('add fixtures to scene'),
            __param(0, Metadata_1.parameter('scene name')),
            __param(1, Metadata_1.parameter('fixtureName, fixtureName, fixtureName')),
            __param(2, Metadata_1.parameter('value (0..1)')),
            __param(3, Metadata_1.parameter('duration in seconds', true)),
            __param(4, Metadata_1.parameter('delay in seconds', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "sceneAddFixtures", null);
        __decorate([
            Metadata_1.callable('add channels to scene'),
            __param(0, Metadata_1.parameter('scene name')),
            __param(1, Metadata_1.parameter('fixtureName, fixtureName, fixtureName')),
            __param(2, Metadata_1.parameter('channelName, channelName, channelName')),
            __param(3, Metadata_1.parameter('value (0..1)')),
            __param(4, Metadata_1.parameter('duration in seconds', true)),
            __param(5, Metadata_1.parameter('delay in seconds', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, String, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "sceneAddChannels", null);
        __decorate([
            Metadata_1.callable('add groups to scene'),
            __param(0, Metadata_1.parameter('scene name')),
            __param(1, Metadata_1.parameter('groupName, groupName, groupName')),
            __param(2, Metadata_1.parameter('value (0..1)')),
            __param(3, Metadata_1.parameter('duration in seconds', true)),
            __param(4, Metadata_1.parameter('delay in seconds', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "sceneAddGroups", null);
        __decorate([
            Metadata_1.callable('add crossfaders to scene'),
            __param(0, Metadata_1.parameter('scene name')),
            __param(1, Metadata_1.parameter('crossfaderName, crossfaderName, crossfaderName')),
            __param(2, Metadata_1.parameter('fade value (0..1) | -1 : ignore')),
            __param(3, Metadata_1.parameter('master value (0..1) | -1 : ignore', true)),
            __param(4, Metadata_1.parameter('duration in seconds', true)),
            __param(5, Metadata_1.parameter('delay in seconds', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, Number, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "sceneAddCrossfaders", null);
        __decorate([
            Metadata_1.callable('add task execute to scene'),
            __param(0, Metadata_1.parameter('scene name')),
            __param(1, Metadata_1.parameter('realm')),
            __param(2, Metadata_1.parameter('group')),
            __param(3, Metadata_1.parameter('task')),
            __param(4, Metadata_1.parameter('delay in seconds', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, String, String, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "sceneAddExecute", null);
        __decorate([
            Metadata_1.callable('call scene'),
            __param(0, Metadata_1.parameter('scene name')),
            __param(1, Metadata_1.parameter('time factor (> 1 faster, < 1 slower)', true)),
            __param(2, Metadata_1.parameter('seek to position in seconds', true)),
            __param(3, Metadata_1.parameter('force execution (usually a scene has to finish before it can be called again)', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, Number, Boolean]),
            __metadata("design:returntype", Promise)
        ], ArtnetGnS.prototype, "sceneCall", null);
        __decorate([
            Metadata_1.callable('cancel scene'),
            __param(0, Metadata_1.parameter('scene name')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "sceneCancel", null);
        __decorate([
            Metadata_1.callable('is scene running?'),
            __param(0, Metadata_1.parameter('scene name')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "sceneIsRunning", null);
        __decorate([
            Metadata_1.callable('fade all groups to value'),
            __param(0, Metadata_1.parameter('target value. Normalised range: 0 .. 1')),
            __param(1, Metadata_1.parameter('duration in seconds')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number]),
            __metadata("design:returntype", Promise)
        ], ArtnetGnS.prototype, "groupAllFadeTo", null);
        __decorate([
            Metadata_1.callable("Animate Group ('chase', 'chase backwards')"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, String]),
            __metadata("design:returntype", Promise)
        ], ArtnetGnS.prototype, "groupAnimate", null);
        __decorate([
            Metadata_1.callable("Animate Fixture ('chase')"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, String]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "fixtureAnimate", null);
        __decorate([
            Metadata_1.callable('Reset setup (delete all groups and scenes)'),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "reset", null);
        return ArtnetGnS;
    }(Script_1.Script));
    exports.ArtnetGnS = ArtnetGnS;
    var ArtnetCrossfader = (function () {
        function ArtnetCrossfader(groupA, groupB, maxValueA, maxValueB) {
            this.maxValueA = 1;
            this.maxValueB = 1;
            this.fadeValue = 0;
            this.masterValue = 0;
            this.groupA = groupA;
            this.groupB = groupB;
            if (maxValueA)
                this.maxValueA = maxValueA;
            if (maxValueB)
                this.maxValueB = maxValueB;
        }
        ArtnetCrossfader.prototype.fadeTo = function (fadeValue, masterValue, duration) {
            if (fadeValue >= 0)
                this.fadeValue = fadeValue;
            if (masterValue >= 0)
                this.masterValue = masterValue;
            this.applyChanges(duration);
        };
        ArtnetCrossfader.prototype.applyChanges = function (duration) {
            this.groupA.fadeTo(this.masterValue * this.maxValueA * (1.0 - this.fadeValue), duration);
            this.groupB.fadeTo(this.masterValue * this.maxValueB * this.fadeValue, duration);
        };
        return ArtnetCrossfader;
    }());
    var ArtnetGroup = (function () {
        function ArtnetGroup() {
            this.mChannels = [];
            this.mFadeOnDuration = 1;
            this.mFadeOffDuration = 1;
            this.mOnValue = 1;
            this.mOffValue = 0;
            this.mPowerOn = false;
            this.currentValue = 0;
            this.duckValue = 0;
        }
        Object.defineProperty(ArtnetGroup.prototype, "value", {
            set: function (value) {
                this.currentValue = value;
                var effectiveValue = (1 - this.duckValue) * this.currentValue;
                for (var i = 0; i < this.mChannels.length; i++) {
                    var channel = this.mChannels[i];
                    channel.value = effectiveValue * channel.maxValue;
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ArtnetGroup.prototype, "power", {
            get: function () {
                return this.mPowerOn;
            },
            set: function (on) {
                this.currentValue = on ? this.mOnValue : this.mOffValue;
                var effectiveValue = (1 - this.duckValue) * this.currentValue;
                var duration = on ? this.mFadeOnDuration : this.mFadeOffDuration;
                for (var i = 0; i < this.mChannels.length; i++) {
                    var channel = this.mChannels[i];
                    channel.fadeTo(effectiveValue * channel.maxValue, duration);
                }
                this.mPowerOn = on;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ArtnetGroup.prototype, "channels", {
            get: function () {
                return this.mChannels;
            },
            enumerable: false,
            configurable: true
        });
        ArtnetGroup.prototype.addChannel = function (channel) {
            if (!channel.isOfTypeName('AnalogChannel'))
                return;
            var analogChannel = channel;
            this.mChannels.push(analogChannel);
        };
        ArtnetGroup.prototype.addChannels = function (channels) {
            for (var i = 0; i < channels.length; i++) {
                this.addChannel(channels[i]);
            }
        };
        ArtnetGroup.prototype.duck = function (duckValue, duration) {
            this.duckValue = duckValue;
            this.fadeTo(this.currentValue, duration);
        };
        ArtnetGroup.prototype.fadeTo = function (value, duration) {
            this.currentValue = value;
            var effectiveValue = (1 - this.duckValue) * this.currentValue;
            for (var i = 0; i < this.mChannels.length; i++) {
                var channel = this.mChannels[i];
                channel.fadeTo(effectiveValue * channel.maxValue, duration);
            }
            return wait(duration * MS_PER_S);
        };
        ArtnetGroup.prototype.setDefaults = function (fadeOnDuration, fadeOffDuration, onValue, offValue) {
            this.mFadeOnDuration = fadeOnDuration;
            this.mFadeOffDuration = fadeOffDuration;
            this.mOnValue = onValue;
            this.mOffValue = offValue;
        };
        return ArtnetGroup;
    }());
    var ArtnetScene = (function () {
        function ArtnetScene() {
            this.sceneItems = [];
            this.runObject = null;
            this.runCounter = 0;
        }
        Object.defineProperty(ArtnetScene.prototype, "duration", {
            get: function () {
                var max = 0;
                for (var i = 0; i < this.sceneItems.length; i++) {
                    var channel = this.sceneItems[i];
                    var total = channel.delay + channel.duration;
                    if (total > max)
                        max = total;
                }
                return max;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ArtnetScene.prototype, "isRunning", {
            get: function () {
                return this.runObject !== null;
            },
            enumerable: false,
            configurable: true
        });
        ArtnetScene.prototype.addChannel = function (channel, value, duration, delay) {
            this.addChannelInternal(channel, value, duration, delay);
            this.applyChanges();
        };
        ArtnetScene.prototype.addChannels = function (channels, value, duration, delay) {
            for (var i = 0; i < channels.length; i++) {
                this.addChannelInternal(channels[i], value, duration, delay);
            }
            this.applyChanges();
        };
        ArtnetScene.prototype.addGroup = function (group, value, duration, delay) {
            this.addGroupInternal(group, value, duration, delay);
            this.applyChanges();
        };
        ArtnetScene.prototype.addGroups = function (groups, value, duration, delay) {
            for (var i = 0; i < groups.length; i++) {
                this.addGroupInternal(groups[i], value, duration, delay);
            }
            this.applyChanges();
        };
        ArtnetScene.prototype.addCrossfader = function (crossfader, fadeValue, masterValue, duration, delay) {
            this.addCrossfaderInternal(crossfader, fadeValue, masterValue, duration, delay);
            this.applyChanges();
        };
        ArtnetScene.prototype.addCrossfaders = function (crossfaders, fadeValue, masterValue, duration, delay) {
            for (var i = 0; i < crossfaders.length; i++) {
                this.addCrossfaderInternal(crossfaders[i], fadeValue, masterValue, duration, delay);
            }
            this.applyChanges();
        };
        ArtnetScene.prototype.addExecute = function (realm, group, task, delay) {
            this.sceneItems.push(new ArtnetSceneExecute(realm, group, task, 0, delay));
            this.applyChanges();
        };
        ArtnetScene.prototype.applyChanges = function () {
            this.sceneItems.sort(function (a, b) {
                if (a.delay > b.delay)
                    return 1;
                if (b.delay > a.delay)
                    return -1;
                return 0;
            });
        };
        ArtnetScene.prototype.addChannelInternal = function (channel, value, duration, delay) {
            this.sceneItems.push(new ArtnetSceneChannel(channel, value, duration, delay));
        };
        ArtnetScene.prototype.addGroupInternal = function (group, value, duration, delay) {
            this.sceneItems.push(new ArtnetSceneGroup(group, value, duration, delay));
        };
        ArtnetScene.prototype.addCrossfaderInternal = function (crossfader, fadeValue, masterValue, duration, delay) {
            this.sceneItems.push(new ArtnetSceneCrossfade(crossfader, fadeValue, masterValue, duration, delay));
        };
        ArtnetScene.prototype.call = function (timefactor, seekTo, force) {
            var _this = this;
            this.sceneCallStartMs = Date.now();
            if (seekTo)
                this.sceneCallStartMs -= seekTo * MS_PER_S;
            if (this.callingScene && force) {
                if (this.debug)
                    console.log('stopping previous scene call');
                this.resolveSceneExecution();
            }
            if (!this.callingScene) {
                this.callingScene = new Promise(function (resolve, reject) {
                    _this.callingSceneResolver = resolve;
                    _this.callingSceneRejector = reject;
                    if (!timefactor)
                        timefactor = 1.0;
                    var duration = _this.duration * timefactor;
                    if (seekTo)
                        duration -= seekTo;
                    wait(duration * MS_PER_S + MS_PER_S).then(function () {
                        reject('scene timeout! (did not finish on time)');
                    });
                    wait(duration * MS_PER_S).then(function () {
                        _this.resolveSceneExecution();
                    });
                });
                this.runObject = new Object();
                this.runCounter++;
                this.executeScene(0, timefactor, this.runObject, this.runCounter);
            }
            return this.callingScene;
        };
        ArtnetScene.prototype.cancel = function () {
            if (this.callingScene) {
                this.resolveSceneExecution();
                this.runObject = null;
            }
        };
        ArtnetScene.prototype.executeScene = function (channelPos, timefactor, runObject, runCounter) {
            var _this = this;
            var nowMs = Date.now();
            var deltaTimeMs = nowMs - this.sceneCallStartMs;
            var sceneItem;
            if (this.debug)
                console.log('continuing scene at ' + deltaTimeMs + 'ms (#' + runCounter + ')');
            if (runObject !== this.runObject) {
                console.log('runID is wrong ' + runObject + ' vs ' + this.runObject);
                return;
            }
            var _loop_1 = function (i) {
                sceneItem = this_1.sceneItems[i];
                delay = sceneItem.delay * timefactor;
                deltaDelay = delay * MS_PER_S - deltaTimeMs;
                if (deltaDelay <= 0) {
                    sceneItem.call(timefactor * (deltaDelay < -MS_PER_S ? 0.001 : 1));
                    if (this_1.debug)
                        console.log('calling scene item ' + i + ' at ' + deltaTimeMs + 'ms (#' + runCounter + ')');
                }
                else {
                    wait(deltaDelay).then(function () {
                        var offset = i;
                        _this.executeScene(offset, timefactor, runObject, runCounter);
                    });
                    return { value: void 0 };
                }
            };
            var this_1 = this, delay, deltaDelay;
            for (var i = channelPos; i < this.sceneItems.length; i++) {
                var state_1 = _loop_1(i);
                if (typeof state_1 === "object")
                    return state_1.value;
            }
        };
        ArtnetScene.prototype.resolveSceneExecution = function () {
            if (this.callingSceneResolver)
                this.callingSceneResolver(true);
            delete this.callingSceneResolver;
            delete this.callingSceneRejector;
            delete this.callingScene;
        };
        return ArtnetScene;
    }());
    var ArtnetSceneItem = (function () {
        function ArtnetSceneItem(duration, delay) {
            this.duration = duration ? duration : 0;
            this.delay = delay ? delay : 0;
        }
        return ArtnetSceneItem;
    }());
    var ArtnetSceneChannel = (function (_super) {
        __extends(ArtnetSceneChannel, _super);
        function ArtnetSceneChannel(channel, value, duration, delay) {
            var _this = _super.call(this, duration, delay) || this;
            _this.channel = channel;
            _this.value = value;
            return _this;
        }
        ArtnetSceneChannel.prototype.call = function (timefactor) {
            this.channel.fadeTo(this.value * this.channel.maxValue, timefactor ? timefactor * this.duration : this.duration);
        };
        return ArtnetSceneChannel;
    }(ArtnetSceneItem));
    var ArtnetSceneGroup = (function (_super) {
        __extends(ArtnetSceneGroup, _super);
        function ArtnetSceneGroup(group, value, duration, delay) {
            var _this = _super.call(this, duration, delay) || this;
            _this.group = group;
            _this.value = value;
            return _this;
        }
        ArtnetSceneGroup.prototype.call = function (timefactor) {
            this.group.fadeTo(this.value, timefactor ? timefactor * this.duration : this.duration);
        };
        return ArtnetSceneGroup;
    }(ArtnetSceneItem));
    var ArtnetSceneCrossfade = (function (_super) {
        __extends(ArtnetSceneCrossfade, _super);
        function ArtnetSceneCrossfade(crossfader, fadeValue, masterValue, duration, delay) {
            var _this = _super.call(this, duration, delay) || this;
            _this.crossfader = crossfader;
            _this.fadeValue = fadeValue;
            _this.masterValue = masterValue;
            return _this;
        }
        ArtnetSceneCrossfade.prototype.call = function (timefactor) {
            this.crossfader.fadeTo(this.fadeValue, this.masterValue, timefactor ? timefactor * this.duration : this.duration);
        };
        return ArtnetSceneCrossfade;
    }(ArtnetSceneItem));
    var ArtnetSceneExecute = (function (_super) {
        __extends(ArtnetSceneExecute, _super);
        function ArtnetSceneExecute(realm, group, task, duration, delay) {
            var _this = _super.call(this, duration, delay) || this;
            _this.realm = realm;
            _this.group = group;
            _this.task = task;
            return _this;
        }
        ArtnetSceneExecute.prototype.call = function (factor) {
            if (factor > 0.9 && factor < 1.1) {
                Realm_1.Realm[this.realm].group[this.group][this.task].running = true;
            }
        };
        return ArtnetSceneExecute;
    }(ArtnetSceneItem));
});
