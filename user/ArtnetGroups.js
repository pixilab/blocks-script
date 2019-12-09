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
    var split = require("lib/split-string");
    var ArtnetGroups = (function (_super) {
        __extends(ArtnetGroups, _super);
        function ArtnetGroups(env) {
            var _this = _super.call(this, env) || this;
            _this.mFadeOnDuration = 1.2;
            _this.mFadeOffDuration = 5.0;
            _this.mLightOffValue = 0.0;
            _this.mMinChannel = MIN_CHANNEL;
            _this.mMaxChannel = MAX_CHANNEL;
            _this.mDebug = false;
            _this.mValue = 0.0;
            _this.mChannelNamePrefix = CHANNEL_NAME_PREFIX;
            _this.mChannelNameDigits = CHANNEL_NAME_DIGITS;
            _this.groups = {};
            _this.fixtureChannelNames = {};
            console.log('ArtnetGroups instantiated');
            return _this;
        }
        Object.defineProperty(ArtnetGroups.prototype, "debug", {
            get: function () {
                return this.mDebug;
            },
            set: function (value) {
                this.mDebug = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ArtnetGroups.prototype, "value", {
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
        ArtnetGroups.prototype.setFixtureChannelNames = function (fixtureNames, channelNames) {
            var fixtureNameList = this.getStringArray(fixtureNames);
            var channelNameList = this.getStringArray(channelNames);
            for (var i = 0; i < fixtureNameList.length; i++) {
                this.fixtureChannelNames[fixtureNameList[i]] = channelNameList;
            }
        };
        ArtnetGroups.prototype.fadeFixture = function (fixtureName, value, duration) {
            if (!Artnet_1.Artnet[fixtureName])
                return;
            var channelNameList = this.getFixtureChannelNames(fixtureName);
            this.fadeFixtureByChannelNames(fixtureName, channelNameList, value, duration);
        };
        ArtnetGroups.prototype.fadeFixtureChannels = function (fixtureName, channelNames, value, duration) {
            var channelNameList = this.getStringArray(channelNames);
            this.fadeFixtureByChannelNames(fixtureName, channelNameList, value, duration);
        };
        ArtnetGroups.prototype.fadeGroupTo = function (groupName, value, duration) {
            var _a;
            (_a = this.getGroup(groupName)) === null || _a === void 0 ? void 0 : _a.fadeTo(value, duration);
        };
        ArtnetGroups.prototype.setGroupValue = function (groupName, value) {
            var group = this.getGroup(groupName);
            if (!group)
                return;
            group.value = value;
        };
        ArtnetGroups.prototype.addFixtureSettings = function (channelNamePrefix, minChannel, maxChannel, channelNameDigits) {
            this.mChannelNamePrefix = channelNamePrefix;
            this.mMinChannel = minChannel;
            this.mMaxChannel = maxChannel;
            var neededDigits = maxChannel.toString().length;
            this.mChannelNameDigits = Math.max(channelNameDigits, neededDigits);
        };
        ArtnetGroups.prototype.reset = function () {
            this.groups = {};
            this.fixtureChannelNames = {};
        };
        ArtnetGroups.prototype.addFixtures = function (fixtureNames, groupName) {
            var fixtureNameList = this.getStringArray(fixtureNames);
            for (var i = 0; i < fixtureNameList.length; i++) {
                var fixtureName = fixtureNameList[i];
                var channelNameList = this.getFixtureChannelNames(fixtureName);
                this.getGroup(groupName).addChannels(fixtureName, channelNameList);
            }
        };
        ArtnetGroups.prototype.addFixtureChannels = function (fixtureNames, channelNames, groupName) {
            var fixtureNameList = this.getStringArray(fixtureNames);
            var channelNameList = this.getStringArray(channelNames);
            for (var f = 0; f < fixtureNameList.length; f++) {
                var fixtureName = fixtureNameList[f];
                for (var i = 0; i < channelNameList.length; i++) {
                    this.addChannel(fixtureName, channelNameList[i], groupName);
                }
            }
        };
        ArtnetGroups.prototype.addChannels = function (fixtureChannelList, groupName) {
            var fixtureChannelParts = this.getStringArrayArray(fixtureChannelList);
            for (var i = 0; i < fixtureChannelParts.length; i++) {
                var fixtureName = fixtureChannelParts[i][0].trim();
                var channelName = fixtureChannelParts[i][1].trim();
                this.addChannel(fixtureName, channelName, groupName);
            }
        };
        ArtnetGroups.prototype.addChannel = function (fixtureName, channelName, groupName) {
            this.getGroup(groupName).addChannel(fixtureName, channelName);
        };
        ArtnetGroups.prototype.massFadeTo = function (value, duration) {
            if (value > 1.0)
                value = value / 255.0;
            for (var key in this.groups) {
                this.groups[key].fadeTo(value, duration);
            }
        };
        ArtnetGroups.prototype.resetAllLights = function () {
            for (var key in this.groups) {
                this.groups[key].fadeTo(this.mLightOffValue, this.mFadeOffDuration);
            }
        };
        ArtnetGroups.prototype.animateGroup = function (groupName, delay, style) {
            if (style == 'chase') {
                var channels = this.getGroupChannels(groupName);
                this.recursiveChase(channels, delay);
            }
        };
        ArtnetGroups.prototype.animateFixture = function (fixtureName, delay, style) {
            if (style == 'chase') {
                var channels = this.getFixtureChannels(fixtureName, '');
                this.recursiveChase(channels, delay);
            }
        };
        ArtnetGroups.prototype.recursiveValue = function (channels, pos, value, delay) {
            var _this = this;
            if (pos == channels.length)
                return;
            wait(delay / 2 * 1000).then(function () {
                channels[pos].fadeTo(value, delay);
                _this.recursiveValue(channels, pos + 1, value, delay);
            });
        };
        ArtnetGroups.prototype.recursiveChase = function (channels, delay) {
            var _this = this;
            this.recursiveValue(channels, 0, 1, delay);
            wait(delay * 1000).then(function () {
                _this.recursiveValue(channels, 0, _this.mLightOffValue, delay);
            });
        };
        ArtnetGroups.prototype.fadeFixtureByChannelNames = function (fixtureName, channelNames, value, duration) {
            var _a;
            if (!Artnet_1.Artnet[fixtureName])
                return;
            for (var i = 0; i < channelNames.length; i++) {
                (_a = Artnet_1.Artnet[fixtureName][channelNames[i]]) === null || _a === void 0 ? void 0 : _a.fadeTo(value, duration);
            }
        };
        ArtnetGroups.prototype.padStart = function (value, minLength, padWith) {
            var result = value;
            while (result.length < minLength) {
                result = padWith + result;
            }
            return result;
        };
        ArtnetGroups.prototype.getFixtures = function (fixtureNames) {
            var fixtureNameList = this.getStringArray(fixtureNames);
            var fixtures = [];
            for (var i = 0; i < fixtureNameList.length; i++) {
                var fixtureName = fixtureNameList[i];
                var fixture = Artnet_1.Artnet[fixtureName];
                if (fixture)
                    fixtures.push(fixture);
            }
            return fixtures;
        };
        ArtnetGroups.prototype.getFixtureChannels = function (fixtureName, channelNames) {
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
        ArtnetGroups.prototype.getFixtureChannelNames = function (fixtureName) {
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
        ArtnetGroups.prototype.getGroup = function (groupName) {
            if (!this.groups[groupName]) {
                this.groups[groupName] = new ArtnetGroup();
            }
            return this.groups[groupName];
        };
        ArtnetGroups.prototype.getGroupChannels = function (groupName) {
            var group = this.getGroup(groupName);
            if (!group)
                return [];
            return group.channels;
        };
        ArtnetGroups.prototype.getStringArray = function (list) {
            var result = [];
            try {
                result = JSON.parse('[' + list + ']');
                return result;
            }
            catch (e) {
            }
            var listParts = split(list, { separator: ',', quotes: true, brackets: { '[': ']' } });
            for (var i = 0; i < listParts.length; i++) {
                var listPart = listParts[i].trim();
                result.push(listPart);
            }
            return result;
        };
        ArtnetGroups.prototype.getStringArrayArray = function (list) {
            var result = [];
            try {
                result = JSON.parse('[' + list + ']');
                return result;
            }
            catch (e) {
            }
            var listParts = split(list, { separator: ',', quotes: true, brackets: { '[': ']' } });
            for (var i = 0; i < listParts.length; i++) {
                var listPart = listParts[i].trim();
                if (this.isEncodedArray(listPart)) {
                    var array = split(listPart.substr(1, listPart.length - 2), { separator: ',', quotes: true, brackets: { '[': ']' } });
                    result.push(array);
                }
            }
            return result;
        };
        ArtnetGroups.prototype.isEncodedArray = function (possibleArray) {
            if (possibleArray.length < 2)
                return false;
            return possibleArray[0] == '[' && possibleArray[possibleArray.length - 1] == ']';
        };
        ArtnetGroups.prototype.random = function (min, max) {
            return Math.random() * (max - min) + min;
        };
        ArtnetGroups.prototype.randomInt = function (min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        };
        __decorate([
            Metadata_1.property('Debug Mode on/off'),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], ArtnetGroups.prototype, "debug", null);
        __decorate([
            Metadata_1.property('All Lights To Value'),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], ArtnetGroups.prototype, "value", null);
        __decorate([
            Metadata_1.callable('set channel names for fixtures (fx with of type)'),
            __param(0, Metadata_1.parameter('fixtureName, fixtureName, fixtureName')),
            __param(1, Metadata_1.parameter('channelName, channelName, channelName')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String]),
            __metadata("design:returntype", void 0)
        ], ArtnetGroups.prototype, "setFixtureChannelNames", null);
        __decorate([
            Metadata_1.callable('fade fixture'),
            __param(0, Metadata_1.parameter('fixture name')),
            __param(1, Metadata_1.parameter("Wanted Value")),
            __param(2, Metadata_1.parameter("Fade Duration in seconds")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGroups.prototype, "fadeFixture", null);
        __decorate([
            Metadata_1.callable('fade fixture'),
            __param(0, Metadata_1.parameter('fixture name')),
            __param(1, Metadata_1.parameter('"channelName, channelName, channelName"')),
            __param(2, Metadata_1.parameter("Wanted Value")),
            __param(3, Metadata_1.parameter("Fade Duration in seconds")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, Number, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGroups.prototype, "fadeFixtureChannels", null);
        __decorate([
            Metadata_1.callable('fade group'),
            __param(0, Metadata_1.parameter('group name')),
            __param(1, Metadata_1.parameter('target value')),
            __param(2, Metadata_1.parameter('fade duration in seconds')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGroups.prototype, "fadeGroupTo", null);
        __decorate([
            Metadata_1.callable('set group value'),
            __param(0, Metadata_1.parameter('group name')),
            __param(1, Metadata_1.parameter('value')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGroups.prototype, "setGroupValue", null);
        __decorate([
            Metadata_1.callable('settings for addFixture and addFixtures'),
            __param(0, Metadata_1.parameter('defaults to "' + CHANNEL_NAME_PREFIX + '"')),
            __param(1, Metadata_1.parameter('defaults to ' + MIN_CHANNEL)),
            __param(2, Metadata_1.parameter('defaults to ' + MAX_CHANNEL)),
            __param(3, Metadata_1.parameter('defaults to ' + CHANNEL_NAME_DIGITS + '. If maxChannel is too large, this value will be automatically adjusted to fit maxChannel')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGroups.prototype, "addFixtureSettings", null);
        __decorate([
            Metadata_1.callable('Reset setup (delete all groups)'),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], ArtnetGroups.prototype, "reset", null);
        __decorate([
            Metadata_1.callable('Add complete fixtures to group (channel names have to follow the naming scheme "L_01, L_02, L_03, L_04, L_05")'),
            __param(0, Metadata_1.parameter('fixtureName, fixtureName, fixtureName')),
            __param(1, Metadata_1.parameter('name of group')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String]),
            __metadata("design:returntype", void 0)
        ], ArtnetGroups.prototype, "addFixtures", null);
        __decorate([
            Metadata_1.callable('Add channels of fixture to group'),
            __param(0, Metadata_1.parameter('fixtureName, fixtureName, fixtureName')),
            __param(1, Metadata_1.parameter('"channelName, channelName, channelName"')),
            __param(2, Metadata_1.parameter('name of group')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, String]),
            __metadata("design:returntype", void 0)
        ], ArtnetGroups.prototype, "addFixtureChannels", null);
        __decorate([
            Metadata_1.callable('Add channels of fixture to group'),
            __param(0, Metadata_1.parameter('"[fixtureName, channelName],[fixtureName, channelName]"')),
            __param(1, Metadata_1.parameter('name of group')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String]),
            __metadata("design:returntype", void 0)
        ], ArtnetGroups.prototype, "addChannels", null);
        __decorate([
            Metadata_1.callable('Add specific channel to group'),
            __param(0, Metadata_1.parameter('name of fixture')),
            __param(1, Metadata_1.parameter('name of channel')),
            __param(2, Metadata_1.parameter('name of group')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, String]),
            __metadata("design:returntype", void 0)
        ], ArtnetGroups.prototype, "addChannel", null);
        __decorate([
            Metadata_1.callable("Fade all lights To Value"),
            __param(0, Metadata_1.parameter("Wanted Value")),
            __param(1, Metadata_1.parameter("Fade Duration in seconds")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number]),
            __metadata("design:returntype", void 0)
        ], ArtnetGroups.prototype, "massFadeTo", null);
        __decorate([
            Metadata_1.callable("Reset All Lights"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], ArtnetGroups.prototype, "resetAllLights", null);
        __decorate([
            Metadata_1.callable("Animate Group ('chase')"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, String]),
            __metadata("design:returntype", void 0)
        ], ArtnetGroups.prototype, "animateGroup", null);
        __decorate([
            Metadata_1.callable("Animate Fixture ('chase')"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, String]),
            __metadata("design:returntype", void 0)
        ], ArtnetGroups.prototype, "animateFixture", null);
        return ArtnetGroups;
    }(Script_1.Script));
    exports.ArtnetGroups = ArtnetGroups;
    var ArtnetGroup = (function () {
        function ArtnetGroup() {
            this.mChannels = [];
        }
        Object.defineProperty(ArtnetGroup.prototype, "value", {
            set: function (value) {
                for (var i = 0; i < this.mChannels.length; i++) {
                    var channel = this.mChannels[i];
                    channel.value = channel.maxValue > 1 ? value * 255.0 : value;
                }
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
        ArtnetGroup.prototype.addFixture = function (fixtureName, channelNamePrefix, min, max) {
            if (!Artnet_1.Artnet[fixtureName])
                return;
            for (var i = min; i < max; i++) {
                var channelName = channelNamePrefix + (i < 10 ? '0' : '') + i;
                this.addChannel(fixtureName, channelName);
            }
        };
        ArtnetGroup.prototype.addChannels = function (fixtureName, channelNames) {
            if (!Artnet_1.Artnet[fixtureName])
                return;
            for (var i = 0; i < channelNames.length; i++) {
                this.addChannel(fixtureName, channelNames[i]);
            }
        };
        ArtnetGroup.prototype.addChannel = function (fixtureName, channelName) {
            var fixture = Artnet_1.Artnet[fixtureName];
            if (!fixture)
                return;
            var channel = fixture[channelName];
            if (!channel)
                return;
            if (!channel.isOfTypeName('AnalogChannel'))
                return;
            var analogChannel = channel;
            this.mChannels.push(analogChannel);
        };
        ArtnetGroup.prototype.fadeTo = function (value, duration) {
            for (var i = 0; i < this.mChannels.length; i++) {
                var channel = this.mChannels[i];
                channel.fadeTo(channel.maxValue > 1 ? value * 255.0 : value, duration);
            }
        };
        return ArtnetGroup;
    }());
});
