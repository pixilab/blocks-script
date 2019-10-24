/*	Driver for the Dresden Electronicx DeConz zigbee gateway, based on its REST API
    https://github.com/dresden-elektronik/deconz-rest-plugin

    Provides functions for controlling lights and groups individually
    Publishes a number of dynamic properties per light group, allowing buttons/sliders
    to be bound to those.

    IMPORTANT: To use this driver, you must first add it to Blocks and configure it so
    its "Connected" status turns green. Then, in the PhosCon web app, under Gateway,
    Advanced, click the button to authorize the control. Successful authorization is
    indicated by my "authorized" property.

    Copyright (c) 2019 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
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
    var DeConz = DeConz_1 = (function (_super) {
        __extends(DeConz, _super);
        function DeConz(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mConnected = false; // Until I know
            _this.mAuthorized = false;
            _this.whenSentlast = new Date(); // When command was last sent, to not send too often
            _this.kMinTimeBetweenCommands = 160; // Minimum mS time between back-to-back commands
            // Commands ready to send, keyed by target device/group name
            _this.pendingCommands = {};
            // I explicitly do NOT auto-connect since I use discrete HTTP requests
            _this.configFileName = 'DeConzDriver_' + socket.name;
            _this.alive = true;
            _this.baseUrl = 'http://' + socket.address + ':' + socket.port + '/api';
            // read auth code from file, containing a Config object
            SimpleFile_1.SimpleFile.read(_this.configFileName).then(function (rawData) {
                var config = JSON.parse(rawData);
                if (config && config.authCode)
                    _this.config = config;
            }); // Else config will be obtained by 1st poll
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
        Object.defineProperty(DeConz.prototype, "authorized", {
            /*	Indicates that the DeCONZ gateway has responded favorably to request.
                If not, the driver will attempt to call the top level /api endpoint
                every now and then until it succeeds.
             */
            get: function () {
                return this.mAuthorized;
            },
            set: function (value) {
                if (this.mAuthorized && !value)
                    console.warn("Became unauthorized");
                this.mAuthorized = value;
                this.checkReadyToSend();
            },
            enumerable: true,
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
            enumerable: true,
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
            var kOutMin = 153; // These seem to map backwards to input range
            var kOutMax = 500;
            // Clip to allowed range
            kelvin = Math.max(kMin, Math.min(kMax, kelvin));
            var state = this.sendCommandSoon(target);
            // I inverse the normalized value to account for the backward mapping
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
        /**
         * Set transitiontime in state to specified time (if any), else to default time.
         */
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
                    _this.poller = undefined; // Now taken
                    if (_this.config)
                        _this.regularPoll();
                    else
                        _this.authenticationPoll();
                    _this.requestPoll(3000); // Set up to poll again soon
                });
            }
        };
        /**
         * Attempt to authenticate with the device, thus obtaining the autCode for
         * my config.
         */
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
                            _this.loggedAuthFail = true; // Log that error only once per session
                        }
                    }
                }
            }).catch(function (error) { return _this.requestFailed(error); });
        };
        /**
         * Received authorization code - set as my config, consider me authorized
         * and persist config to file.
         */
        DeConz.prototype.gotAuthCode = function (authCode) {
            this.config = { authCode: authCode };
            this.keyedBasedUrl = undefined; // Must be recomputed
            SimpleFile_1.SimpleFile.write(this.configFileName, JSON.stringify(this.config));
            this.authorized = true;
        };
        /**
         * Do some polling of the gateway to see if it's still there.
         */
        DeConz.prototype.regularPoll = function () {
            if (!this.devices)
                this.getDevices();
            else if (!this.groups)
                this.getGroups();
            this.checkReadyToSend();
        };
        /*	See if I'm all up and running. If so, send any pending commands that may have arrived
            during startup.
         */
        DeConz.prototype.checkReadyToSend = function () {
            if (this.devices && this.groups && this.connected && this.authorized)
                this.sendPendingCommands();
        };
        /**
         * Register a command (with data poked into returned DeviceState) for
         * destination, which may be a device or a group.
         */
        DeConz.prototype.sendCommandSoon = function (destination) {
            var result = this.pendingCommands[destination];
            if (!result)
                result = this.pendingCommands[destination] = {};
            if (!this.sendInProgress()) {
                this.sendPendingCommandsSoon();
            } // Else transmission already in progress - will tag along later
            return result;
        };
        DeConz.prototype.sendPendingCommandsSoon = function () {
            var _this = this;
            if (this.havePendingCommands()) {
                var now = new Date();
                var howLongAgo = now.getTime() - this.whenSentlast.getTime();
                var delay = 50; // Send this soon if no recent send
                // Extra wait if positive (negative if waited long enough already)
                var extraWait = this.kMinTimeBetweenCommands - howLongAgo;
                if (extraWait > 0) {
                    delay += extraWait; // Add in extra wait
                    // console.log("Extra wait", delay);
                }
                this.deferredSender = wait(delay);
                this.deferredSender.then(function () {
                    _this.deferredSender = undefined;
                    _this.sendPendingCommands();
                    _this.whenSentlast = new Date();
                });
            }
        };
        /**
         * return true if there are pending commands to send.
         */
        DeConz.prototype.havePendingCommands = function () {
            for (var cmd in this.pendingCommands)
                return true;
            return false;
        };
        /**
         * I consider command transmission in progress if there's either
         * a deferredSender waiting to fire or a cmdInFlight. In both
         * these cases, the next command will be sent soon automatically
         * without any further ado.
         */
        DeConz.prototype.sendInProgress = function () {
            return !!this.deferredSender || this.cmdInFlight;
        };
        /**
         * Send any commands waiting to be sent.
         */
        DeConz.prototype.sendPendingCommands = function () {
            var _this = this;
            if (!this.alive) {
                this.pendingCommands = {}; // Just discard all commands
                return;
            }
            var _loop_1 = function () {
                if (this_1.pendingCommands.hasOwnProperty(dest)) {
                    // console.info("Sending to", dest);
                    var cmd = this_1.pendingCommands[dest];
                    delete this_1.pendingCommands[dest]; // Now taken
                    // Look for device name first, then group name
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
                    // console.log("Sent command",url);
                    SimpleHTTP_1.SimpleHTTP.newRequest(url_1).put(cmdStr_1).catch(function (error) {
                        return console.warn("Failed sending command", error, url_1, cmdStr_1);
                    }).finally(function () {
                        _this.cmdInFlight = false; // Done with that command
                        // console.warn("Sent", dest);
                        _this.sendPendingCommandsSoon(); // Send any newly accumulated commands
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
        /**
         * get and cache the complete list of lights
         */
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
        /**
         * get and cache the complete list of groups
         */
        DeConz.prototype.getGroups = function () {
            var _this = this;
            SimpleHTTP_1.SimpleHTTP.newRequest(this.getKeyedUrlBase() + 'groups').get().then(function (response) {
                _this.connected = true;
                if (response.status === 200) {
                    var oldGroups = _this.groups ? _this.groups.byName : {}; // To publish props for newly added
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
        /**
         * Publish props for all groups not in oldGroups.
         */
        DeConz.prototype.publishGroupPropsForNew = function (oldGroups) {
            for (var newGroupName in this.groups.byName) {
                if (!oldGroups[newGroupName])
                    this.publishGroupProps(newGroupName);
            }
        };
        /**
         * Make composite name for each group property
         */
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
        /**
         * Publish props for specified group.
         */
        DeConz.prototype.publishGroupProps = function (newGroupName) {
            // console.log("Group added", newGroupName);
            var _this = this;
            /*	We really have no idea on the initial/current state of group properties...
                Also, we may want to unify this statis with what's set by functions above,
                in which case it may make more sense to effectuate through these properties
                from those functions rather than the other way around. Later...
            */
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
        /**
         * Force me to become unauthorized, dropping my config data, to force re-authorization.
         */
        DeConz.prototype.unauthorize = function () {
            this.authorized = false;
            this.config = undefined;
            console.warn("Unauthorized due to 403");
        };
        /*	Get the request URI base, including the authorization code, with a terminating
            slash.
         */
        DeConz.prototype.getKeyedUrlBase = function () {
            if (!this.keyedBasedUrl && this.config)
                this.keyedBasedUrl = this.baseUrl + '/' + this.config.authCode + '/';
            return this.keyedBasedUrl;
        };
        DeConz.prototype.requestFailed = function (error) {
            this.connected = false;
            console.warn(error);
        };
        return DeConz;
    }(Driver_1.Driver));
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
    exports.DeConz = DeConz;
    /**
     * Clip value to normalized 0...1 range.
     */
    function clip(value) {
        value = value || 0; // Default to 0 if no value passed in
        return Math.max(0, Math.min(1, value));
    }
    /**
     * A double-map providing access to items either by ID or by name.
     */
    var NamedItems = (function () {
        function NamedItems(items) {
            this.byId = items; // Keyed by ID in src data - use as is
            // Also keyed ny name
            this.byName = {};
            for (var key in items) {
                var item = items[key];
                item.id = key; // Make sure ID is set
                this.byName[item.name] = item;
            }
        }
        return NamedItems;
    }());
    var DeConz_1;
});
