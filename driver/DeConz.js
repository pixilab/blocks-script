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
define(["require", "exports", "system/SimpleFile", "system/SimpleHTTP", "system_lib/Driver", "system_lib/Metadata", "system_lib/Metadata"], function (require, exports, SimpleFile_1, SimpleHTTP_1, Driver_1, Meta, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DeConz = void 0;
    var DeConz = (function (_super) {
        __extends(DeConz, _super);
        function DeConz(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mConnected = false;
            _this.mAuthorized = false;
            _this.whenSentlast = new Date();
            _this.kMinTimeBetweenCommands = 160;
            _this.pendingCommands = {};
            _this.configFileName = 'DeConzDriver_' + socket.name;
            _this.alive = true;
            _this.baseUrl = 'http://' + socket.address + ':' + socket.port + '/api';
            SimpleFile_1.SimpleFile.read(_this.configFileName).then(function (rawData) {
                var config = JSON.parse(rawData);
                if (config && config.authCode)
                    _this.config = config;
            });
            if (socket.enabled) {
                socket.subscribe('finish', function (sender) {
                    _this.alive = false;
                    if (_this.poller)
                        _this.poller.cancel();
                    if (_this.deferredSender)
                        _this.deferredSender.cancel();
                });
                _this.requestPoll(100);
            }
            return _this;
        }
        DeConz_1 = DeConz;
        Object.defineProperty(DeConz.prototype, "authorized", {
            get: function () {
                return this.mAuthorized;
            },
            set: function (value) {
                if (this.mAuthorized && !value)
                    console.warn("Became unauthorized");
                this.mAuthorized = value;
                this.checkReadyToSend();
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(DeConz.prototype, "connected", {
            get: function () {
                return this.mConnected;
            },
            set: function (value) {
                this.mConnected = value;
                this.checkReadyToSend();
            },
            enumerable: false,
            configurable: true
        });
        DeConz.prototype.refresh = function () {
            if (this.connected && this.authorized) {
                this.getDevices();
                this.getGroups();
            }
        };
        DeConz.prototype.setOn = function (target, on) {
            this.sendCommandSoon(target).on = on;
        };
        DeConz.prototype.setBrightness = function (target, brightness, time, cieX, cieY) {
            var state = this.sendCommandSoon(target);
            state.on = brightness > 0;
            state.bri = Math.floor(clip(brightness) * 255);
            this.setTime(state, time, 0);
            if (cieX !== undefined)
                state.xy = [clip(cieX), clip(cieY)];
        };
        DeConz.prototype.setColorTemperature = function (target, kelvin, time) {
            var kMin = 2000;
            var kMax = 6500;
            var kOutMin = 153;
            var kOutMax = 500;
            kelvin = Math.max(kMin, Math.min(kMax, kelvin));
            var state = this.sendCommandSoon(target);
            var normalized = 1 - (kelvin - kMin) / (kMax - kMin);
            state.ct = Math.floor(normalized * (kOutMax - kOutMin) + kOutMin);
            this.setTime(state, time, 0.1);
        };
        DeConz.prototype.setHueSaturation = function (target, hue, saturation, time) {
            this.setHueState(target, hue);
            var state = this.setSaturationState(target, saturation);
            this.setTime(state, time, 0.1);
        };
        DeConz.prototype.setHueState = function (target, normalizedHue) {
            var state = this.sendCommandSoon(target);
            state.hue = Math.floor(clip(normalizedHue) * 65535);
            return state;
        };
        DeConz.prototype.setSaturationState = function (target, normalizedSat) {
            var state = this.sendCommandSoon(target);
            state.sat = Math.floor(clip(normalizedSat) * 255);
            return state;
        };
        DeConz.prototype.setTime = function (onState, timeInSeconds, defaultTimeInSeconds) {
            if (defaultTimeInSeconds === void 0) { defaultTimeInSeconds = 0; }
            if (timeInSeconds !== undefined)
                onState.transitiontime = Math.floor(Math.max(timeInSeconds, 0) * 10);
            else
                onState.transitiontime = Math.floor(defaultTimeInSeconds * 10);
        };
        DeConz.prototype.requestPoll = function (howSoon) {
            var _this = this;
            if (!this.poller && this.alive) {
                this.poller = wait(howSoon);
                this.poller.then(function () {
                    _this.poller = undefined;
                    if (_this.config)
                        _this.regularPoll();
                    else
                        _this.authenticationPoll();
                    _this.requestPoll(3000);
                });
            }
        };
        DeConz.prototype.authenticationPoll = function () {
            var _this = this;
            SimpleHTTP_1.SimpleHTTP.newRequest(this.baseUrl).post('{"devicetype": "pixilab-blocks" }').then(function (response) {
                _this.connected = true;
                if (response.status === 200) {
                    var authResponse = JSON.parse(response.data);
                    if (authResponse && authResponse.length) {
                        if (authResponse[0].success)
                            _this.gotAuthCode(authResponse[0].success.username);
                    }
                }
                else {
                    _this.authorized = false;
                    if (response.status === 403) {
                        if (!_this.loggedAuthFail) {
                            console.error("In Phoscon app, click Settings, Gateway, Advanced, Authenticate app");
                            _this.loggedAuthFail = true;
                        }
                    }
                }
            }).catch(function (error) { return _this.requestFailed(error); });
        };
        DeConz.prototype.gotAuthCode = function (authCode) {
            this.config = { authCode: authCode };
            this.keyedBasedUrl = undefined;
            SimpleFile_1.SimpleFile.write(this.configFileName, JSON.stringify(this.config));
            this.authorized = true;
        };
        DeConz.prototype.regularPoll = function () {
            if (!this.devices)
                this.getDevices();
            else if (!this.groups)
                this.getGroups();
            this.checkReadyToSend();
        };
        DeConz.prototype.checkReadyToSend = function () {
            if (this.devices && this.groups && this.connected && this.authorized)
                this.sendPendingCommands();
        };
        DeConz.prototype.sendCommandSoon = function (destination) {
            var result = this.pendingCommands[destination];
            if (!result)
                result = this.pendingCommands[destination] = {};
            if (!this.sendInProgress()) {
                this.sendPendingCommandsSoon();
            }
            return result;
        };
        DeConz.prototype.sendPendingCommandsSoon = function () {
            var _this = this;
            if (this.havePendingCommands()) {
                var now = new Date();
                var howLongAgo = now.getTime() - this.whenSentlast.getTime();
                var delay = 50;
                var extraWait = this.kMinTimeBetweenCommands - howLongAgo;
                if (extraWait > 0) {
                    delay += extraWait;
                }
                this.deferredSender = wait(delay);
                this.deferredSender.then(function () {
                    _this.deferredSender = undefined;
                    _this.sendPendingCommands();
                    _this.whenSentlast = new Date();
                });
            }
        };
        DeConz.prototype.havePendingCommands = function () {
            for (var cmd in this.pendingCommands)
                return true;
            return false;
        };
        DeConz.prototype.sendInProgress = function () {
            return !!this.deferredSender || this.cmdInFlight;
        };
        DeConz.prototype.sendPendingCommands = function () {
            var _this = this;
            if (!this.alive) {
                this.pendingCommands = {};
                return;
            }
            var _loop_1 = function () {
                if (this_1.pendingCommands.hasOwnProperty(dest)) {
                    var cmd = this_1.pendingCommands[dest];
                    delete this_1.pendingCommands[dest];
                    if (targetItem = this_1.devices.byName[dest]) {
                        typeUrlSeg = 'lights/';
                        cmdUrlSeg = '/state';
                    }
                    else if (targetItem = this_1.groups.byName[dest]) {
                        typeUrlSeg = 'groups/';
                        cmdUrlSeg = '/action';
                    }
                    else {
                        console.warn("Device/group not found", dest);
                        return "continue";
                    }
                    var url_1 = this_1.getKeyedUrlBase() + typeUrlSeg + targetItem.id + cmdUrlSeg;
                    this_1.cmdInFlight = true;
                    var cmdStr_1 = JSON.stringify(cmd);
                    SimpleHTTP_1.SimpleHTTP.newRequest(url_1).put(cmdStr_1).catch(function (error) {
                        return console.warn("Failed sending command", error, url_1, cmdStr_1);
                    }).finally(function () {
                        _this.cmdInFlight = false;
                        _this.sendPendingCommandsSoon();
                    });
                    return { value: void 0 };
                }
            };
            var this_1 = this, typeUrlSeg, cmdUrlSeg, targetItem;
            for (var dest in this.pendingCommands) {
                var state_1 = _loop_1();
                if (typeof state_1 === "object")
                    return state_1.value;
            }
        };
        DeConz.prototype.getDevices = function () {
            var _this = this;
            SimpleHTTP_1.SimpleHTTP.newRequest(this.getKeyedUrlBase() + 'lights').get().then(function (response) {
                _this.connected = true;
                if (response.status === 200) {
                    _this.authorized = true;
                    var devices = JSON.parse(response.data);
                    if (devices)
                        _this.devices = new NamedItems(devices);
                    else
                        console.warn("Missing lights data");
                }
                else {
                    console.warn("Lights error response", response.status);
                    if (response.status === 403)
                        _this.unauthorize();
                }
            }).catch(function (error) { return _this.requestFailed(error); });
        };
        DeConz.prototype.getGroups = function () {
            var _this = this;
            SimpleHTTP_1.SimpleHTTP.newRequest(this.getKeyedUrlBase() + 'groups').get().then(function (response) {
                _this.connected = true;
                if (response.status === 200) {
                    var oldGroups = _this.groups ? _this.groups.byName : {};
                    var groups = JSON.parse(response.data);
                    if (groups) {
                        _this.groups = new NamedItems(groups);
                        _this.publishGroupPropsForNew(oldGroups);
                    }
                    else
                        console.warn("Missing group data");
                }
                else {
                    console.warn("Groups error response", response.status);
                    if (response.status === 403)
                        _this.unauthorize();
                }
            }).catch(function (error) { return _this.requestFailed(error); });
        };
        DeConz.prototype.publishGroupPropsForNew = function (oldGroups) {
            for (var newGroupName in this.groups.byName) {
                if (!oldGroups[newGroupName])
                    this.publishGroupProps(newGroupName);
            }
        };
        DeConz.grpPropNameBrightness = function (groupName) {
            return groupName + '_brt';
        };
        DeConz.grpPropNameOn = function (groupName) {
            return groupName + '_on';
        };
        DeConz.grpPropNameHue = function (groupName) {
            return groupName + '_hue';
        };
        DeConz.grpPropNameSaturation = function (groupName) {
            return groupName + '_sat';
        };
        DeConz.prototype.publishGroupProps = function (newGroupName) {
            var _this = this;
            var on = true;
            var brightess = 1;
            var hue = 1;
            var saturation = 0;
            this.property(DeConz_1.grpPropNameBrightness(newGroupName), { type: Number, description: "Group Brightness" }, function (setValue) {
                if (setValue !== undefined) {
                    brightess = setValue;
                    _this.setBrightness(newGroupName, setValue, 0.2);
                }
                return brightess;
            });
            this.property(DeConz_1.grpPropNameOn(newGroupName), { type: Boolean, description: "Group On" }, function (setValue) {
                if (setValue !== undefined) {
                    on = setValue;
                    _this.setOn(newGroupName, on);
                }
                return on;
            });
            this.property(DeConz_1.grpPropNameHue(newGroupName), { type: Number, description: "Group Hue" }, function (setValue) {
                if (setValue !== undefined) {
                    hue = setValue;
                    _this.setHueState(newGroupName, setValue);
                }
                return hue;
            });
            this.property(DeConz_1.grpPropNameSaturation(newGroupName), { type: Number, description: "Group Saturation" }, function (setValue) {
                if (setValue !== undefined) {
                    saturation = setValue;
                    _this.setSaturationState(newGroupName, setValue);
                }
                return saturation;
            });
        };
        DeConz.prototype.unauthorize = function () {
            this.authorized = false;
            this.config = undefined;
            console.warn("Unauthorized due to 403");
        };
        DeConz.prototype.getKeyedUrlBase = function () {
            if (!this.keyedBasedUrl && this.config)
                this.keyedBasedUrl = this.baseUrl + '/' + this.config.authCode + '/';
            return this.keyedBasedUrl;
        };
        DeConz.prototype.requestFailed = function (error) {
            this.connected = false;
            console.warn(error);
        };
        var DeConz_1;
        __decorate([
            Meta.property("Authorized to control", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], DeConz.prototype, "authorized", null);
        __decorate([
            Meta.property("Connected successfully to device", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], DeConz.prototype, "connected", null);
        __decorate([
            Metadata_1.callable("Refresh device and group info"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], DeConz.prototype, "refresh", null);
        __decorate([
            Metadata_1.callable("Turn target on or off"),
            __param(0, Metadata_1.parameter("device or group name")),
            __param(1, Metadata_1.parameter("state (false to turn off)")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Boolean]),
            __metadata("design:returntype", void 0)
        ], DeConz.prototype, "setOn", null);
        __decorate([
            Metadata_1.callable("Set/Fade brightness and (optionally) CIE color"),
            __param(0, Metadata_1.parameter("device or group name")),
            __param(1, Metadata_1.parameter("level 0...1")),
            __param(2, Metadata_1.parameter("transition, in seconds", true)),
            __param(3, Metadata_1.parameter("0...1", true)),
            __param(4, Metadata_1.parameter("0...1", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], DeConz.prototype, "setBrightness", null);
        __decorate([
            Metadata_1.callable("Set the color temperature"),
            __param(0, Metadata_1.parameter("device or group name")),
            __param(1, Metadata_1.parameter("2000...6500")),
            __param(2, Metadata_1.parameter("transition, in seconds", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, Number]),
            __metadata("design:returntype", void 0)
        ], DeConz.prototype, "setColorTemperature", null);
        __decorate([
            Metadata_1.callable("Set/Fade the Hue and Saturation"),
            __param(0, Metadata_1.parameter("device or group name")),
            __param(1, Metadata_1.parameter("0...1")),
            __param(2, Metadata_1.parameter("0...1")),
            __param(3, Metadata_1.parameter("transition, in seconds", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], DeConz.prototype, "setHueSaturation", null);
        DeConz = DeConz_1 = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 8080 }),
            __metadata("design:paramtypes", [Object])
        ], DeConz);
        return DeConz;
    }(Driver_1.Driver));
    exports.DeConz = DeConz;
    function clip(value) {
        value = value || 0;
        return Math.max(0, Math.min(1, value));
    }
    var NamedItems = (function () {
        function NamedItems(items) {
            this.byId = items;
            this.byName = {};
            for (var key in items) {
                var item = items[key];
                item.id = key;
                this.byName[item.name] = item;
            }
        }
        return NamedItems;
    }());
});
