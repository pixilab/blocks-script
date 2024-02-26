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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TimecodeLTC = void 0;
    var kTypeMap = {
        "24": { parName: "24", fps: 24 },
        "25": { parName: "25", fps: 25 },
        "29.97_drop": { parName: "df", fps: 29.97 },
        "29.97_nondrop": { parName: "ndf", fps: 29.97 },
        "30": { parName: "30", fps: 30 }
    };
    var TimecodeLTC = exports.TimecodeLTC = (function (_super) {
        __extends(TimecodeLTC, _super);
        function TimecodeLTC(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mType = "25";
            _this.mTime = new TimeFlow(0, 0);
            _this.mSpeed = 0;
            _this.mVolume = 0;
            _this.mOffset = 0;
            _this.mOffsetMs = 0;
            _this.mResetOnStop = false;
            _this.mConnected = false;
            _this.lastDataTime = 0;
            _this.isReset = false;
            if (socket.options) {
                var config = JSON.parse(socket.options);
                if (config.type)
                    _this.mType = config.type.toString();
                var offs = config.offset;
                if (offs && typeof offs === "number")
                    _this.offset = offs;
            }
            var typePropOpts = {
                type: "Enum",
                description: "Expected type of timecode",
                enumValues: [
                    "24",
                    "25",
                    "29.97_drop",
                    "29.97_nondrop",
                    "30"
                ]
            };
            _this.property("type", typePropOpts, function (newValue) {
                if (_this.mType !== newValue && kTypeMap[newValue]) {
                    _this.mType = newValue;
                    _this.applySettingsSoon();
                }
                return _this.mType;
            });
            socket.subscribe('textReceived', function (emitter, message) {
                _this.dataReceived(message.text.trim());
            });
            _this.applySettingsSoon();
            return _this;
        }
        Object.defineProperty(TimecodeLTC.prototype, "time", {
            get: function () { return this.mTime; },
            set: function (t) { this.mTime = t; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimecodeLTC.prototype, "speed", {
            get: function () { return this.mSpeed; },
            set: function (value) { this.mSpeed = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimecodeLTC.prototype, "volume", {
            get: function () { return this.mVolume; },
            set: function (value) { this.mVolume = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimecodeLTC.prototype, "connected", {
            get: function () { return this.mConnected; },
            set: function (value) { this.mConnected = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimecodeLTC.prototype, "offset", {
            get: function () { return this.mOffset; },
            set: function (value) {
                this.mOffset = value;
                this.mOffsetMs = Math.round(value * 1000);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimecodeLTC.prototype, "resetOnStop", {
            get: function () { return this.mResetOnStop; },
            set: function (value) {
                this.mResetOnStop = value;
                if (!value)
                    this.isReset = false;
            },
            enumerable: false,
            configurable: true
        });
        TimecodeLTC.prototype.applySettingsSoon = function (howSoon) {
            var _this = this;
            if (howSoon === void 0) { howSoon = 100; }
            if (this.settingsTimer)
                this.settingsTimer.cancel();
            this.settingsTimer = wait(howSoon);
            this.settingsTimer.then(function () { return _this.applySettings(); });
        };
        TimecodeLTC.prototype.applySettings = function () {
            var kinterval = 2000;
            var settings = "i/" + kinterval +
                "/t/" + kTypeMap[this.mType].parName +
                "/p/" + this.socket.listenerPort +
                "/n/1/c/0/w/150";
            this.socket.sendText(settings);
            if (this.getMonotonousMillis() - this.lastDataTime >= kinterval * 2)
                this.connected = false;
            this.applySettingsSoon(5000);
        };
        TimecodeLTC.prototype.dataReceived = function (msg) {
            var itemPairs = msg.split('/');
            var pieceCount = itemPairs.length;
            if (pieceCount % 2 || pieceCount < 8)
                console.error("Invalid data from peer", msg);
            var item = {};
            for (var ix = 0; ix < pieceCount; ix += 2)
                item[itemPairs[ix]] = itemPairs[ix + 1];
            var version = parseFloat(item['v']);
            if (version < 1.1) {
                if (!this.toldOldversion) {
                    console.error("Requires version 1.1 or later of the timecode-reader program");
                    this.toldOldversion = true;
                }
                return;
            }
            this.toldOldversion = false;
            var sigLevel = item['l'];
            if (sigLevel) {
                var val = ((parseFloat(sigLevel) + 64) / 64);
                this.volume = Math.max(0, Math.min(1, val));
            }
            var now = this.getMonotonousMillis();
            var frameNum = item['n'];
            if (frameNum) {
                this.updateTime(now, parseFloat(item['s']), parseInt(frameNum), parseInt(item['t']), item['a'] === '1');
            }
            this.connected = true;
            this.lastDataTime = now;
        };
        TimecodeLTC.prototype.updateTime = function (serverTime, speed, frameNum, sampleTime, abrupt) {
            var _this = this;
            var millis = Math.round(frameNum / kTypeMap[this.mType].fps * 1000);
            var playing = speed > 0;
            if (!playing && this.isReset)
                return;
            this.isReset = false;
            var playingStateChanged = playing !== !!this.speed;
            if (playingStateChanged)
                abrupt = true;
            var elapsedDelta = 0;
            if (abrupt || !playing) {
                if (this.time.rate !== speed || this.time.position !== millis) {
                    this.time = new TimeFlow(millis, speed, undefined, false);
                }
            }
            else {
                var elapsedServerTime = (serverTime - this.lastServerTime) * this.speed;
                var elapsedSampleTime = sampleTime - this.lastSampleTime;
                elapsedDelta = elapsedServerTime - elapsedSampleTime;
                millis += elapsedDelta + this.mOffsetMs;
                this.time = new TimeFlow(millis, speed, undefined, false);
            }
            if (playingStateChanged) {
                if (!playing) {
                    if (this.mResetOnStop) {
                        this.resetOnStopTimer = wait(400);
                        this.resetOnStopTimer.then(function () {
                            _this.resetOnStopTimer = undefined;
                            _this.time = new TimeFlow(0, 0, undefined, false);
                            _this.isReset = true;
                        });
                    }
                }
                else if (this.resetOnStopTimer) {
                    this.resetOnStopTimer.cancel();
                    this.resetOnStopTimer = undefined;
                    this.isReset = false;
                }
            }
            this.speed = speed;
            this.lastSampleTime = sampleTime;
            this.lastServerTime = serverTime - elapsedDelta;
        };
        __decorate([
            (0, Metadata_1.property)("The current time position", true),
            __metadata("design:type", TimeFlow),
            __metadata("design:paramtypes", [TimeFlow])
        ], TimecodeLTC.prototype, "time", null);
        __decorate([
            (0, Metadata_1.property)("Playback rate, with 1 being normal", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], TimecodeLTC.prototype, "speed", null);
        __decorate([
            (0, Metadata_1.property)("Signal volume, with 1 being 'overload'", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], TimecodeLTC.prototype, "volume", null);
        __decorate([
            (0, Metadata_1.property)("Received data from peer", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimecodeLTC.prototype, "connected", null);
        __decorate([
            (0, Metadata_1.property)("Offset added to timecode received, in seconds. May be negative."),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], TimecodeLTC.prototype, "offset", null);
        __decorate([
            (0, Metadata_1.property)("Auto reset time position to 0 when timecode stops"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimecodeLTC.prototype, "resetOnStop", null);
        TimecodeLTC = __decorate([
            (0, Metadata_1.driver)('NetworkUDP', { port: 1632, rcvPort: 1633 }),
            __metadata("design:paramtypes", [Object])
        ], TimecodeLTC);
        return TimecodeLTC;
    }(Driver_1.Driver));
});
