var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata", "../system/Spot"], function (require, exports, Driver_1, Metadata_1, Spot_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Guide_ID_Brainbox = void 0;
    var idParameterName = "GUIDE_ID";
    var sendUpdateIntervalMs = 500;
    var Guide_ID_Brainbox = (function (_super) {
        __extends(Guide_ID_Brainbox, _super);
        function Guide_ID_Brainbox(connection) {
            var _this = _super.call(this, connection) || this;
            _this.connection = connection;
            _this.lastTime = 0;
            _this.firstTime = true;
            _this.debugLogging = false;
            connection.autoConnect();
            if (connection.enabled) {
                _this.spotPath = connection.options || connection.addressString;
                if (!connection.options && isIpOrLocalhost(connection.addressString)) {
                    console.error("Missing driver option: Spot path must be specified when address is an IP or localhost");
                }
                else {
                    console.log("Using spot path: " + _this.spotPath);
                    _this.mySpot = Spot_1.Spot[_this.spotPath];
                    _this.connection.subscribe('textReceived', function (sender, msg) {
                        _this.onData(msg.text);
                    });
                    _this.connection.subscribe('finish', function () {
                        var _a;
                        (_a = _this.scheduledUpdate) === null || _a === void 0 ? void 0 : _a.cancel();
                        _this.scheduledUpdate = undefined;
                    });
                    _this.connection.subscribe('connect', function (sender, msg) {
                        if (msg) {
                            _this.log("Guide ID Brainbox connected");
                            _this.sendData("\r\n" + "console video 1");
                        }
                    });
                    _this.hookUpSpotSubs();
                    console.log("Guide ID Brainbox driver initialized use spot: " + _this.spotPath);
                }
            }
            return _this;
        }
        Guide_ID_Brainbox.prototype.hookUpSpotSubs = function () {
            var _this = this;
            this.paramPropAccessor = this.getProperty("Spot." + this.spotPath + ".parameter." + idParameterName, function (value) { return _this.onParameterChanged(value); });
            this.timePropAccessor = this.getProperty("Spot." + this.spotPath + ".time", function (value) { return _this.onTimeChange(value); });
            this.mySpot.subscribe('connect', function (sender, message) { return _this.onConnectChanged(sender, message); });
            this.mySpot.subscribe('finish', function () { return _this.onDisplaySpotFinished(); });
        };
        Guide_ID_Brainbox.prototype.debugLogEnable = function (enable) {
            this.debugLogging = enable;
        };
        Guide_ID_Brainbox.prototype.cancelHoldUpdate = function () {
            if (this.holdUpdate) {
                this.holdUpdate.cancel();
                this.holdUpdate = undefined;
            }
        };
        Guide_ID_Brainbox.prototype.onTimeChange = function (time) {
            this.timeRecived = time;
            if (this.timeRecived.dead) {
                this.log("Time flow is dead, stopping sync");
                this.stopSync();
                return;
            }
            this.log("Time changed: " + this.timeRecived.currentTime);
            if (this.firstTime) {
                this.startSync();
                this.firstTime = false;
                this.log("firstTime flag is now false, time updates will now be scheduled and loop detection will be active");
            }
            if (this.timeRecived.currentTime < this.lastTime) {
                this.log("Time went backwards, likely due to a  loop. Time: " + this.timeRecived.currentTime + " Last time: " + this.lastTime);
                this.startSync();
            }
            this.lastTime = this.timeRecived.currentTime;
        };
        Guide_ID_Brainbox.prototype.onDisplaySpotFinished = function () {
            this.mySpot = Spot_1.Spot[this.spotPath];
            this.hookUpSpotSubs();
        };
        Guide_ID_Brainbox.prototype.onParameterChanged = function (value) {
            this.cancelHoldUpdate();
            this.log("Parameter " + idParameterName + " changed to: " + value);
            this.startSync();
        };
        Guide_ID_Brainbox.prototype.onConnectChanged = function (sender, message) {
        };
        Guide_ID_Brainbox.prototype.onData = function (data) {
            this.log("Data received: " + data);
            var splitData = data.split(" ");
            var command = splitData[0];
            var value = splitData[1];
            this.log("Command recieved: " + command + " Value: " + value);
            this.log("Current video id on spot parameter: " + Spot_1.Spot[this.spotPath].parameter[idParameterName]);
            if (command === "videocode" && value === Spot_1.Spot[this.spotPath].parameter[idParameterName]) {
                var current = Spot_1.Spot[this.spotPath].active;
                if (current === false) {
                    Spot_1.Spot[this.spotPath].active = true;
                }
            }
        };
        Guide_ID_Brainbox.prototype.startSync = function () {
            this.sendData("\r\n" + "console video 1");
            this.sendData("brightsign code " + Spot_1.Spot[this.spotPath].parameter[idParameterName]);
            this.scheduleTimeUpdate();
        };
        Guide_ID_Brainbox.prototype.stopSync = function () {
            var _a;
            this.lastTime = 0;
            (_a = this.scheduledUpdate) === null || _a === void 0 ? void 0 : _a.cancel();
            this.scheduledUpdate = undefined;
            this.sendData("brightsign code 0");
            this.firstTime = true;
            this.log("Sync stopped, firstTime flag set to true");
        };
        Guide_ID_Brainbox.prototype.sendTimeUpdate = function (currentTime) {
            var data = "brightsign timestamp " + msToTime(currentTime);
            this.sendData(data);
        };
        Guide_ID_Brainbox.prototype.scheduleTimeUpdate = function () {
            var _this = this;
            if (this.scheduledUpdate)
                this.scheduledUpdate.cancel();
            this.sendTimeUpdate(this.timeRecived.currentTime);
            this.scheduledUpdate = wait(sendUpdateIntervalMs);
            this.scheduledUpdate.then(function () {
                if (Spot_1.Spot[_this.spotPath].playingBlock !== "")
                    _this.scheduleTimeUpdate();
            });
        };
        Guide_ID_Brainbox.prototype.sendData = function (data) {
            this.log("Sending data: " + data);
            if (this.connection.connected)
                this.connection.sendText(data);
        };
        Guide_ID_Brainbox.prototype.log = function () {
            var messages = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                messages[_i] = arguments[_i];
            }
            if (this.debugLogging)
                console.log(this.spotPath + " " + messages);
        };
        __decorate([
            (0, Metadata_1.callable)("Enable debug Logging"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Boolean]),
            __metadata("design:returntype", void 0)
        ], Guide_ID_Brainbox.prototype, "debugLogEnable", null);
        Guide_ID_Brainbox = __decorate([
            (0, Metadata_1.driver)('NetworkTCP', { port: 4001 }),
            (0, Metadata_1.driver)('SerialPort', { baudRate: 115200 }),
            __metadata("design:paramtypes", [Object])
        ], Guide_ID_Brainbox);
        return Guide_ID_Brainbox;
    }(Driver_1.Driver));
    exports.Guide_ID_Brainbox = Guide_ID_Brainbox;
    function isIpOrLocalhost(addr) {
        return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(addr) || addr === "localhost";
    }
    function msToTime(ms) {
        var hours = Math.floor(ms / 3600000);
        ms %= 3600000;
        var minutes = Math.floor(ms / 60000);
        ms %= 60000;
        var seconds = Math.floor(ms / 1000);
        var milliseconds = ms % 1000;
        function pad(num, size) {
            var s = String(num);
            while (s.length < size)
                s = "0" + s;
            return s;
        }
        return pad(hours, 2) + ":" +
            pad(minutes, 2) + ":" +
            pad(seconds, 2) + ":" +
            pad(milliseconds, 3);
    }
});
