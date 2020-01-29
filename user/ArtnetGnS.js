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
define(["require", "exports", "system/Artnet", "system_lib/Script", "system_lib/Metadata"], function (require, exports, Artnet_1, Script_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var CHANNEL_NAME_PREFIX = 'L_';
    var CHANNEL_NAME_DIGITS = 2;
    var MIN_CHANNEL = 1;
    var MAX_CHANNEL = 42;
    var MS_PER_S = 1000;
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
            _this.groups = {};
            _this.scenes = {};
            _this.fixtureChannelNames = {};
            _this.crossfadeGroups = {};
            return _this;
        }
        Object.defineProperty(ArtnetGnS.prototype, "groupValue", {
            get: function () {
                return this.mValue;
            },
            set: function (value) {
                if (value > 1.0)
                    value = value / 255.0;
                for (var key in this.groups) {
                    this.groups[key].value = value;
                }
                this.mValue = value;
            },
            enumerable: true,
            configurable: true
        });
        ArtnetGnS.prototype.fixtureSetChannelNames = function (fixtureNames, channelNames) {
            var fixtureNameList = this.getStringArray(fixtureNames);
            var channelNameList = this.getStringArray(channelNames);
            for (var i = 0; i < fixtureNameList.length; i++) {
                this.fixtureChannelNames[fixtureNameList[i]] = channelNameList;
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
        ArtnetGnS.prototype.groupFadeTo = function (groupName, value, duration) {
            var group = this.getGroup(groupName, false);
            return group ? group.fadeTo(value, duration ? duration : this.mFadeDuration) : undefined;
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
        ArtnetGnS.prototype.fixtureSetDefaults = function (channelNamePrefix, minChannel, maxChannel, channelNameDigits) {
            this.mChannelNamePrefix = channelNamePrefix;
            this.mMinChannel = minChannel;
            this.mMaxChannel = maxChannel;
            var neededDigits = maxChannel.toString().length;
            this.mChannelNameDigits = Math.max(channelNameDigits, neededDigits);
        };
        ArtnetGnS.prototype.reset = function () {
            this.fixtureChannelNames = {};
            this.groups = {};
            this.scenes = {};
            this.crossfadeGroups = {};
        };
        ArtnetGnS.prototype.groupAddFixtures = function (fixtureNames, groupName) {
            var channels = this.getFixturesChannels(fixtureNames);
            this.getGroup(groupName, true).addChannels(channels);
        };
        ArtnetGnS.prototype.groupAddChannels = function (fixtureNames, channelNames, groupName) {
            var channels = this.getFixturesChannels(fixtureNames, channelNames);
            this.getGroup(groupName, true).addChannels(channels);
        };
        ArtnetGnS.prototype.crossfadeAdd = function (groupName, groupNameA, groupNameB, maxValueA, maxValueB) {
            var groupA = this.getGroup(groupNameA, false);
            var groupB = this.getGroup(groupNameB, false);
            if (groupA && groupB) {
                this.crossfadeGroups[groupName] = new CrossfadeGroup(groupA, groupB, maxValueA, maxValueB);
                this.publishCrossfadeGroupProps(groupName);
            }
        };
        ArtnetGnS.prototype.crossfadeSetCrossfade = function (groupName, value) {
            var crossfadeGroup = this.crossfadeGroups[groupName];
            if (!crossfadeGroup)
                return;
            crossfadeGroup.crossfade = value;
        };
        ArtnetGnS.prototype.crossfadeSetMasterValue = function (groupName, value) {
            var crossfadeGroup = this.crossfadeGroups[groupName];
            if (!crossfadeGroup)
                return;
            crossfadeGroup.masterValue = value;
        };
        ArtnetGnS.prototype.crossfadeTo = function (groupName, value, duration) {
            var group = this.crossfadeGroups[groupName];
            return group ? group.crossfadeTo(value, duration ? duration : this.mFadeDuration) : undefined;
        };
        ArtnetGnS.prototype.crossfadeMasterValueTo = function (groupName, value, duration) {
            var group = this.crossfadeGroups[groupName];
            return group ? group.masterValueTo(value, duration ? duration : this.mFadeDuration) : undefined;
        };
        ArtnetGnS.prototype.sceneAddFixtures = function (sceneName, fixtureNames, value, duration, delay) {
            var channels = this.getAnalogChannels(this.getFixturesChannels(fixtureNames));
            this.getScene(sceneName, true).addChannels(channels, value, duration, delay);
        };
        ArtnetGnS.prototype.sceneAddChannels = function (sceneName, fixtureNames, channelNames, value, duration, delay) {
            var channels = this.getAnalogChannels(this.getFixturesChannels(fixtureNames, channelNames));
            this.getScene(sceneName, true).addChannels(channels, value, duration, delay);
        };
        ArtnetGnS.prototype.sceneCall = function (sceneName, timefactor) {
            var scene = this.getScene(sceneName, false);
            if (timefactor) {
                if (timefactor <= 0.0)
                    return;
                timefactor = 1.0 / timefactor;
            }
            return scene ? scene.call(timefactor) : undefined;
        };
        ArtnetGnS.prototype.groupAllFadeTo = function (value, duration) {
            if (value > 1.0)
                value = value / 255.0;
            for (var key in this.groups) {
                this.groups[key].fadeTo(value, duration);
            }
            return wait(duration * MS_PER_S);
        };
        ArtnetGnS.prototype.groupAllLightsReset = function () {
            for (var key in this.groups) {
                this.groups[key].fadeTo(this.mLightOffValue, this.mFadeDuration);
            }
            return wait(this.mFadeDuration * MS_PER_S);
        };
        ArtnetGnS.prototype.groupAnimate = function (groupName, delay, style) {
            if (style == 'chase') {
                var channels = this.getGroupChannels(groupName);
                this.recursiveChase(channels, delay);
            }
        };
        ArtnetGnS.prototype.fixtureAnimate = function (fixtureName, delay, style) {
            if (style == 'chase') {
                var channels = this.getAnalogChannels(this.getFixtureChannels(fixtureName, ''));
                this.recursiveChase(channels, delay);
            }
        };
        ArtnetGnS.sanitizePropName = function (propName) {
            return propName.replace(/[^\w\-]/g, '-');
        };
        ArtnetGnS.grpPropNameValue = function (groupName) {
            return this.sanitizePropName('gr_' + groupName + '_val');
        };
        ArtnetGnS.grpPropNamePower = function (groupName) {
            return this.sanitizePropName('gr_' + groupName + '_pwr');
        };
        ArtnetGnS.scnPropNameTrigger = function (sceneName) {
            return this.sanitizePropName('sc_' + sceneName + '_trigger');
        };
        ArtnetGnS.cfgrpPropNameCrossfade = function (groupName) {
            return this.sanitizePropName('cfgr_' + groupName + '_crossfade');
        };
        ArtnetGnS.cfgrpPropNameMasterValue = function (groupName) {
            return this.sanitizePropName('cfgr_' + groupName + '_master');
        };
        ArtnetGnS.prototype.publishGroupProps = function (groupName) {
            var _this = this;
            var value = 0;
            var power = false;
            this.property(ArtnetGnS.grpPropNameValue(groupName), { type: Number, description: "Group Value 0..1" }, function (setValue) {
                if (setValue !== undefined) {
                    value = setValue;
                    _this.groupSetValue(groupName, setValue);
                }
                return value;
            });
            this.property(ArtnetGnS.grpPropNamePower(groupName), { type: Boolean, description: "Group Power on/off" }, function (setValue) {
                if (setValue !== undefined) {
                    power = setValue;
                    _this.groupSetPower(groupName, power);
                }
                return power;
            });
        };
        ArtnetGnS.prototype.publishCrossfadeGroupProps = function (groupName) {
            var _this = this;
            var masterValue = 0;
            var crossfade = 0;
            this.property(ArtnetGnS.cfgrpPropNameMasterValue(groupName), { type: Number, description: "Master Value 0..1" }, function (setValue) {
                if (setValue !== undefined) {
                    masterValue = setValue;
                    _this.crossfadeSetMasterValue(groupName, masterValue);
                }
                return masterValue;
            });
            this.property(ArtnetGnS.cfgrpPropNameCrossfade(groupName), { type: Number, description: "Crossfade 0..1" }, function (setValue) {
                if (setValue !== undefined) {
                    crossfade = setValue;
                    _this.crossfadeSetCrossfade(groupName, crossfade);
                }
                return crossfade;
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
            wait(delay / 2 * 1000).then(function () {
                var channel = channels[pos];
                channel.fadeTo(value * channel.maxValue, delay);
                _this.recursiveValue(channels, pos + 1, value, delay);
            });
        };
        ArtnetGnS.prototype.recursiveChase = function (channels, delay) {
            var _this = this;
            this.recursiveValue(channels, 0, 1, delay);
            wait(delay * 1000).then(function () {
                _this.recursiveValue(channels, 0, _this.mLightOffValue, delay);
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
            if (this.fixtureChannelNames[fixtureName]) {
                channelNameList = this.fixtureChannelNames[fixtureName];
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
            if (!this.groups[groupName] && createIfMissing) {
                this.groups[groupName] = new ArtnetGroup();
                this.publishGroupProps(groupName);
            }
            return this.groups[groupName];
        };
        ArtnetGnS.prototype.getGroupChannels = function (groupName) {
            var group = this.getGroup(groupName, false);
            if (!group)
                return [];
            return group.channels;
        };
        ArtnetGnS.prototype.getScene = function (sceneName, createIfMissing) {
            if (!this.scenes[sceneName] && createIfMissing) {
                this.scenes[sceneName] = new ArtnetScene();
                this.publishSceneProps(sceneName);
            }
            return this.scenes[sceneName];
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
        __decorate([
            Metadata_1.property('all groups to value'),
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
            Metadata_1.callable('fade group'),
            __param(0, Metadata_1.parameter('group name')),
            __param(1, Metadata_1.parameter('target value. Normalised range: 0 .. 1')),
            __param(2, Metadata_1.parameter('fade duration in seconds', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, Number]),
            __metadata("design:returntype", Promise)
        ], ArtnetGnS.prototype, "groupFadeTo", null);
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
            Metadata_1.callable('Reset setup (delete all groups and scenes)'),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "reset", null);
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
            Metadata_1.callable('Add crossfade group. Allows crossfade between group A and B. Features master value.'),
            __param(0, Metadata_1.parameter('name for crossfade group')),
            __param(1, Metadata_1.parameter('name of group A')),
            __param(2, Metadata_1.parameter('name of group B')),
            __param(3, Metadata_1.parameter('max value group A (0..1)', true)),
            __param(4, Metadata_1.parameter('max value group B (0..1)', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, String, Number, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "crossfadeAdd", null);
        __decorate([
            __param(0, Metadata_1.parameter('name of crossfade group')),
            __param(1, Metadata_1.parameter('crossfade (0..1)')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "crossfadeSetCrossfade", null);
        __decorate([
            __param(0, Metadata_1.parameter('name of crossfade group')),
            __param(1, Metadata_1.parameter('master value (0..1)')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "crossfadeSetMasterValue", null);
        __decorate([
            Metadata_1.callable('Crossfade group crossfade'),
            __param(0, Metadata_1.parameter('name of crossfade group')),
            __param(1, Metadata_1.parameter('crossfade (0..1)')),
            __param(2, Metadata_1.parameter('fade duration in seconds', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "crossfadeTo", null);
        __decorate([
            Metadata_1.callable('Crossfade group master value'),
            __param(0, Metadata_1.parameter('name of crossfade group')),
            __param(1, Metadata_1.parameter('master value (0..1)')),
            __param(2, Metadata_1.parameter('fade duration in seconds', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "crossfadeMasterValueTo", null);
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
            Metadata_1.callable('call scene'),
            __param(0, Metadata_1.parameter('scene name')),
            __param(1, Metadata_1.parameter('time factor (> 1 faster, < 1 slower)', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number]),
            __metadata("design:returntype", Promise)
        ], ArtnetGnS.prototype, "sceneCall", null);
        __decorate([
            Metadata_1.callable('fade all groups to value'),
            __param(0, Metadata_1.parameter('target value. Normalised range: 0 .. 1')),
            __param(1, Metadata_1.parameter('duration in seconds')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number]),
            __metadata("design:returntype", Promise)
        ], ArtnetGnS.prototype, "groupAllFadeTo", null);
        __decorate([
            Metadata_1.callable("Reset All Lights"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", Promise)
        ], ArtnetGnS.prototype, "groupAllLightsReset", null);
        __decorate([
            Metadata_1.callable("Animate Group ('chase')"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, String]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "groupAnimate", null);
        __decorate([
            Metadata_1.callable("Animate Fixture ('chase')"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, String]),
            __metadata("design:returntype", void 0)
        ], ArtnetGnS.prototype, "fixtureAnimate", null);
        return ArtnetGnS;
    }(Script_1.Script));
    exports.ArtnetGnS = ArtnetGnS;
    var CrossfadeGroup = (function () {
        function CrossfadeGroup(groupA, groupB, maxValueA, maxValueB) {
            this.maxValueA = 1;
            this.maxValueB = 1;
            this.currentCrossfade = 0;
            this.currentMasterValue = 0;
            this.groupA = groupA;
            this.groupB = groupB;
            if (maxValueA)
                this.maxValueA = maxValueA;
            if (maxValueB)
                this.maxValueB = maxValueB;
        }
        Object.defineProperty(CrossfadeGroup.prototype, "crossfade", {
            set: function (value) {
                this.crossfadeTo(value, 0);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CrossfadeGroup.prototype, "masterValue", {
            set: function (value) {
                this.masterValueTo(value, 0);
            },
            enumerable: true,
            configurable: true
        });
        CrossfadeGroup.prototype.crossfadeTo = function (value, duration) {
            this.currentCrossfade = value;
            this.applyChanges(duration);
        };
        CrossfadeGroup.prototype.masterValueTo = function (value, duration) {
            this.currentMasterValue = value;
            this.applyChanges(duration);
        };
        CrossfadeGroup.prototype.applyChanges = function (duration) {
            this.groupA.fadeTo(this.currentMasterValue * this.maxValueA * (1.0 - this.currentCrossfade), duration);
            this.groupB.fadeTo(this.currentMasterValue * this.maxValueB * this.currentCrossfade, duration);
        };
        return CrossfadeGroup;
    }());
    var ArtnetGroup = (function () {
        function ArtnetGroup() {
            this.mChannels = [];
            this.mFadeOnDuration = 1;
            this.mFadeOffDuration = 1;
            this.mOnValue = 1;
            this.mOffValue = 0;
            this.mPowerOn = false;
        }
        Object.defineProperty(ArtnetGroup.prototype, "value", {
            set: function (value) {
                for (var i = 0; i < this.mChannels.length; i++) {
                    var channel = this.mChannels[i];
                    channel.value = value * channel.maxValue;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ArtnetGroup.prototype, "power", {
            get: function () {
                return this.mPowerOn;
            },
            set: function (on) {
                var value = on ? this.mOnValue : this.mOffValue;
                var duration = on ? this.mFadeOnDuration : this.mFadeOffDuration;
                for (var i = 0; i < this.mChannels.length; i++) {
                    var channel = this.mChannels[i];
                    channel.fadeTo(value * channel.maxValue, duration);
                }
                this.mPowerOn = on;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ArtnetGroup.prototype, "channels", {
            get: function () {
                return this.mChannels;
            },
            enumerable: true,
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
        ArtnetGroup.prototype.fadeTo = function (value, duration) {
            for (var i = 0; i < this.mChannels.length; i++) {
                var channel = this.mChannels[i];
                channel.fadeTo(value * channel.maxValue, duration);
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
            this.sceneChannels = [];
        }
        Object.defineProperty(ArtnetScene.prototype, "duration", {
            get: function () {
                var max = 0;
                for (var i = 0; i < this.sceneChannels.length; i++) {
                    var channel = this.sceneChannels[i];
                    var total = channel.delay + channel.duration;
                    if (total > max)
                        max = total;
                }
                return max;
            },
            enumerable: true,
            configurable: true
        });
        ArtnetScene.prototype.addChannels = function (channels, value, duration, delay) {
            for (var i = 0; i < channels.length; i++) {
                this.addChannelInternal(channels[i], value, duration, delay);
            }
            this.applyChanges();
        };
        ArtnetScene.prototype.addChannel = function (channel, value, duration, delay) {
            this.addChannelInternal(channel, value, duration, delay);
            this.applyChanges();
        };
        ArtnetScene.prototype.applyChanges = function () {
            this.sceneChannels.sort(function (a, b) {
                if (a.delay > b.delay)
                    return 1;
                if (b.delay > a.delay)
                    return -1;
                return 0;
            });
        };
        ArtnetScene.prototype.addChannelInternal = function (channel, value, duration, delay) {
            this.sceneChannels.push(new ArtnetSceneChannel(channel, value, duration, delay));
        };
        ArtnetScene.prototype.call = function (timefactor) {
            var _this = this;
            this.sceneCallStartMs = Date.now();
            if (!this.callingScene) {
                this.callingScene = new Promise(function (resolve, reject) {
                    _this.callingSceneResolver = resolve;
                    _this.callingSceneRejector = reject;
                    if (!timefactor)
                        timefactor = 1.0;
                    var duration = _this.duration * timefactor;
                    wait(duration * MS_PER_S + MS_PER_S).then(function () {
                        reject('scene timeout! (did not finish on time)');
                    });
                    wait(duration * MS_PER_S).then(function () {
                        _this.resolveSceneExecution();
                    });
                });
                this.executeScene(0, timefactor);
            }
            return this.callingScene;
        };
        ArtnetScene.prototype.executeScene = function (channelPos, timefactor) {
            var _this = this;
            var nowMs = Date.now();
            var deltaTimeMs = nowMs - this.sceneCallStartMs;
            var sceneChannel;
            var _loop_1 = function (i) {
                sceneChannel = this_1.sceneChannels[i];
                delay = sceneChannel.delay * timefactor;
                deltaDelay = delay * MS_PER_S - deltaTimeMs;
                if (deltaDelay <= 0) {
                    sceneChannel.call(timefactor);
                }
                else {
                    wait(deltaDelay).then(function () {
                        _this.executeScene(i, timefactor);
                    });
                    return { value: void 0 };
                }
            };
            var this_1 = this, delay, deltaDelay;
            for (var i = channelPos; i < this.sceneChannels.length; i++) {
                var state_1 = _loop_1(i);
                if (typeof state_1 === "object")
                    return state_1.value;
            }
        };
        ArtnetScene.prototype.resolveSceneExecution = function () {
            this.callingSceneResolver(true);
            delete this.callingSceneResolver;
            delete this.callingSceneRejector;
            delete this.callingScene;
        };
        return ArtnetScene;
    }());
    var ArtnetSceneChannel = (function () {
        function ArtnetSceneChannel(channel, value, duration, delay) {
            this.channel = channel;
            this.value = value;
            this.duration = duration ? duration : 0;
            this.delay = delay ? delay : 0;
        }
        ArtnetSceneChannel.prototype.call = function (timefactor) {
            this.channel.fadeTo(this.value * this.channel.maxValue, timefactor ? timefactor * this.duration : this.duration);
        };
        return ArtnetSceneChannel;
    }());
});
