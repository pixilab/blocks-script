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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
define(["require", "exports", "system_lib/Metadata", "system_lib/Driver"], function (require, exports, Metadata_1, Driver_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.StoltzenTyphoon = void 0;
    var StoltzenTyphoon = exports.StoltzenTyphoon = (function (_super) {
        __extends(StoltzenTyphoon, _super);
        function StoltzenTyphoon(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mParamSet = 0;
            _this.mStandBy = false;
            _this.toSend = {};
            _this.micMuteState = {};
            _this.micVolumeState = {};
            return _this;
        }
        Object.defineProperty(StoltzenTyphoon.prototype, "muteInput01", {
            get: function () {
                return this.getMicMuteState('Input#mute#0');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Input#mute#0', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeInput01", {
            get: function () {
                return this.getMicVolumeState('Input#gain#0');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Input#gain#0', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteInput02", {
            get: function () {
                return this.getMicMuteState('Input#mute#1');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Input#mute#1', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeInput02", {
            get: function () {
                return this.getMicVolumeState('Input#gain#1');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Input#gain#1', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteInput03", {
            get: function () {
                return this.getMicMuteState('Input#mute#2');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Input#mute#2', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeInput03", {
            get: function () {
                return this.getMicVolumeState('Input#gain#2');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Input#gain#2', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteInput04", {
            get: function () {
                return this.getMicMuteState('Input#mute#3');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Input#mute#3', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeInput04", {
            get: function () {
                return this.getMicVolumeState('Input#gain#3');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Input#gain#3', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteInput05", {
            get: function () {
                return this.getMicMuteState('Input#mute#4');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Input#mute#4', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeInput05", {
            get: function () {
                return this.getMicVolumeState('Input#gain#4');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Input#gain#4', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteInput06", {
            get: function () {
                return this.getMicMuteState('Input#mute#5');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Input#mute#5', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeInput06", {
            get: function () {
                return this.getMicVolumeState('Input#gain#5');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Input#gain#5', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteInput07", {
            get: function () {
                return this.getMicMuteState('Input#mute#6');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Input#mute#6', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeInput07", {
            get: function () {
                return this.getMicVolumeState('Input#gain#6');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Input#gain#6', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteInput08", {
            get: function () {
                return this.getMicMuteState('Input#mute#7');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Input#mute#7', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeInput08", {
            get: function () {
                return this.getMicVolumeState('Input#gain#7');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Input#gain#7', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteInput09", {
            get: function () {
                return this.getMicMuteState('Input#mute#8');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Input#mute#8', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeInput09", {
            get: function () {
                return this.getMicVolumeState('Input#gain#8');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Input#gain#8', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteInput10", {
            get: function () {
                return this.getMicMuteState('Input#mute#9');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Input#mute#9', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeInput10", {
            get: function () {
                return this.getMicVolumeState('Input#gain#9');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Input#gain#9', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteInput11", {
            get: function () {
                return this.getMicMuteState('Input#mute#10');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Input#mute#10', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeInput11", {
            get: function () {
                return this.getMicVolumeState('Input#gain#10');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Input#gain#10', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteInput12", {
            get: function () {
                return this.getMicMuteState('Input#mute#11');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Input#mute#11', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeInput12", {
            get: function () {
                return this.getMicVolumeState('Input#gain#11');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Input#gain#11', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteOutput01", {
            get: function () {
                return this.getMicMuteState('output#mute#0');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('output#mute#0', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeOutput01", {
            get: function () {
                return this.getMicVolumeState('output#gain#0');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('output#gain#0', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteOutput02", {
            get: function () {
                return this.getMicMuteState('output#mute#1');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('output#mute#1', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeOutput02", {
            get: function () {
                return this.getMicVolumeState('output#gain#1');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('output#gain#1', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteOutput03", {
            get: function () {
                return this.getMicMuteState('output#mute#2');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('output#mute#2', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeOutput03", {
            get: function () {
                return this.getMicVolumeState('output#gain#2');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('output#gain#2', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteOutput04", {
            get: function () {
                return this.getMicMuteState('output#mute#3');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('output#mute#3', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeOutput04", {
            get: function () {
                return this.getMicVolumeState('output#gain#3');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('output#gain#3', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteOutput05", {
            get: function () {
                return this.getMicMuteState('output#mute#4');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('output#mute#4', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeOutput05", {
            get: function () {
                return this.getMicVolumeState('output#gain#4');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('output#gain#4', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteOutput06", {
            get: function () {
                return this.getMicMuteState('output#mute#5');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('output#mute#5', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeOutput06", {
            get: function () {
                return this.getMicVolumeState('output#gain#5');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('output#gain#5', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteOutput07", {
            get: function () {
                return this.getMicMuteState('output#mute#6');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('output#mute#6', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeOutput07", {
            get: function () {
                return this.getMicVolumeState('output#gain#6');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('output#gain#6', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteOutput08", {
            get: function () {
                return this.getMicMuteState('output#mute#7');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('output#mute#7', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeOutput08", {
            get: function () {
                return this.getMicVolumeState('output#gain#7');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('output#gain#7', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteOutput09", {
            get: function () {
                return this.getMicMuteState('output#mute#8');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('output#mute#8', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeOutput09", {
            get: function () {
                return this.getMicVolumeState('output#gain#8');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('output#gain#8', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteOutput10", {
            get: function () {
                return this.getMicMuteState('output#mute#9');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('output#mute#9', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeOutput10", {
            get: function () {
                return this.getMicVolumeState('output#gain#9');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('output#gain#9', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteOutput11", {
            get: function () {
                return this.getMicMuteState('output#mute#10');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('output#mute#10', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeOutput11", {
            get: function () {
                return this.getMicVolumeState('output#gain#10');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('output#gain#10', volume));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "muteOutput12", {
            get: function () {
                return this.getMicMuteState('output#mute#11');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('output#mute#11', mute));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(StoltzenTyphoon.prototype, "volumeOutput12", {
            get: function () {
                return this.getMicVolumeState('output#gain#11');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('output#gain#11', volume));
            },
            enumerable: false,
            configurable: true
        });
        StoltzenTyphoon.prototype.getMicMuteCmd = function (name, mute) {
            this.micMuteState[name] = mute;
            return new MicMute(name, mute);
        };
        StoltzenTyphoon.prototype.getMicMuteState = function (name) {
            return this.micMuteState[name] || false;
        };
        StoltzenTyphoon.prototype.getMicVolumeCmd = function (name, volume) {
            volume = Math.round(volume);
            var oldState = this.micVolumeState[name];
            if (volume !== oldState) {
                this.micVolumeState[name] = volume;
                return new MicVolume(name, volume);
            }
        };
        StoltzenTyphoon.prototype.getMicVolumeState = function (name) {
            return this.micVolumeState[name] || 0;
        };
        StoltzenTyphoon.prototype.sendString = function (toSend) {
            return this.socket.sendText(toSend);
        };
        StoltzenTyphoon.prototype.RecallPreset = function (toSend) {
            return this.socket.sendText("scene: toggle #" + (toSend - 1));
        };
        StoltzenTyphoon.prototype.SavePreset = function (toSend) {
            return this.socket.sendText("scene:save#" + (toSend - 1));
        };
        StoltzenTyphoon.prototype.setGain = function (channel, gain) {
            return this.socket.sendText("set:input#sens#" + (channel - 1) + "#" + gain);
        };
        StoltzenTyphoon.prototype.requestSendCmd = function (cmd) {
            if (cmd) {
                if (Object.keys(this.toSend).length === 0)
                    this.sendSoon();
                this.toSend[cmd.getKey()] = cmd;
            }
        };
        StoltzenTyphoon.prototype.sendSoon = function (howSoonMillis) {
            var _this = this;
            if (howSoonMillis === void 0) { howSoonMillis = 10; }
            if (!this.pendingSend) {
                this.pendingSend = wait(howSoonMillis);
                this.pendingSend.then(function () {
                    _this.pendingSend = undefined;
                    _this.sendNow();
                });
            }
        };
        StoltzenTyphoon.prototype.sendNow = function () {
            var sendNow = this.toSend;
            if (Object.keys(sendNow).length > 0) {
                this.toSend = {};
                var cmdStr = '';
                for (var cmdKey in sendNow) {
                    var cmd = sendNow[cmdKey].getCmdStr();
                    ;
                    cmdStr += cmd;
                }
                this.socket.sendText(cmdStr);
            }
        };
        __decorate([
            (0, Metadata_1.property)("Mute Input01"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteInput01", null);
        __decorate([
            (0, Metadata_1.property)("Volume Input01"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeInput01", null);
        __decorate([
            (0, Metadata_1.property)("Mute Input02"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteInput02", null);
        __decorate([
            (0, Metadata_1.property)("Volume Input02"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeInput02", null);
        __decorate([
            (0, Metadata_1.property)("Mute Input03"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteInput03", null);
        __decorate([
            (0, Metadata_1.property)("Volume Input03"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeInput03", null);
        __decorate([
            (0, Metadata_1.property)("Mute Input04"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteInput04", null);
        __decorate([
            (0, Metadata_1.property)("Volume Input04"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeInput04", null);
        __decorate([
            (0, Metadata_1.property)("Mute Input05"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteInput05", null);
        __decorate([
            (0, Metadata_1.property)("Volume Input05"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeInput05", null);
        __decorate([
            (0, Metadata_1.property)("Mute Input06"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteInput06", null);
        __decorate([
            (0, Metadata_1.property)("Volume Input06"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeInput06", null);
        __decorate([
            (0, Metadata_1.property)("Mute Input07"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteInput07", null);
        __decorate([
            (0, Metadata_1.property)("Volume Input07"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeInput07", null);
        __decorate([
            (0, Metadata_1.property)("Mute Input08"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteInput08", null);
        __decorate([
            (0, Metadata_1.property)("Volume Input08"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeInput08", null);
        __decorate([
            (0, Metadata_1.property)("Mute Input09"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteInput09", null);
        __decorate([
            (0, Metadata_1.property)("Volume Input09"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeInput09", null);
        __decorate([
            (0, Metadata_1.property)("Mute Input10"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteInput10", null);
        __decorate([
            (0, Metadata_1.property)("Volume Input10"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeInput10", null);
        __decorate([
            (0, Metadata_1.property)("Mute Input11"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteInput11", null);
        __decorate([
            (0, Metadata_1.property)("Volume Input11"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeInput11", null);
        __decorate([
            (0, Metadata_1.property)("Mute Input12"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteInput12", null);
        __decorate([
            (0, Metadata_1.property)("Volume Input12"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeInput12", null);
        __decorate([
            (0, Metadata_1.property)("Mute Output01"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteOutput01", null);
        __decorate([
            (0, Metadata_1.property)("Volume Output01"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeOutput01", null);
        __decorate([
            (0, Metadata_1.property)("Mute Output02"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteOutput02", null);
        __decorate([
            (0, Metadata_1.property)("Volume Output02"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeOutput02", null);
        __decorate([
            (0, Metadata_1.property)("Mute Output03"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteOutput03", null);
        __decorate([
            (0, Metadata_1.property)("Volume Output03"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeOutput03", null);
        __decorate([
            (0, Metadata_1.property)("Mute Output04"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteOutput04", null);
        __decorate([
            (0, Metadata_1.property)("Volume Output04"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeOutput04", null);
        __decorate([
            (0, Metadata_1.property)("Mute Output05"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteOutput05", null);
        __decorate([
            (0, Metadata_1.property)("Volume Output05"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeOutput05", null);
        __decorate([
            (0, Metadata_1.property)("Mute Output06"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteOutput06", null);
        __decorate([
            (0, Metadata_1.property)("Volume Output06"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeOutput06", null);
        __decorate([
            (0, Metadata_1.property)("Mute Output07"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteOutput07", null);
        __decorate([
            (0, Metadata_1.property)("Volume Output07"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeOutput07", null);
        __decorate([
            (0, Metadata_1.property)("Mute Output08"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteOutput08", null);
        __decorate([
            (0, Metadata_1.property)("Volume Output08"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeOutput08", null);
        __decorate([
            (0, Metadata_1.property)("Mute Output09"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteOutput09", null);
        __decorate([
            (0, Metadata_1.property)("Volume Output09"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeOutput09", null);
        __decorate([
            (0, Metadata_1.property)("Mute Output10"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteOutput10", null);
        __decorate([
            (0, Metadata_1.property)("Volume Output10"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeOutput10", null);
        __decorate([
            (0, Metadata_1.property)("Mute Output11"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteOutput11", null);
        __decorate([
            (0, Metadata_1.property)("Volume Output11"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeOutput11", null);
        __decorate([
            (0, Metadata_1.property)("Mute Output12"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], StoltzenTyphoon.prototype, "muteOutput12", null);
        __decorate([
            (0, Metadata_1.property)("Volume Output12"),
            (0, Metadata_1.min)(-72),
            (0, Metadata_1.max)(12),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], StoltzenTyphoon.prototype, "volumeOutput12", null);
        __decorate([
            (0, Metadata_1.callable)("Send raw command string"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], StoltzenTyphoon.prototype, "sendString", null);
        __decorate([
            (0, Metadata_1.callable)("Recall preset number (slot 1 to 16)"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], StoltzenTyphoon.prototype, "RecallPreset", null);
        __decorate([
            (0, Metadata_1.callable)("Save setting as preset number 1 to 16"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], StoltzenTyphoon.prototype, "SavePreset", null);
        __decorate([
            (0, Metadata_1.callable)("Set input gain ch.1-12, value 0-16. 3dB step pr. value. Must save preset to remember"),
            __param(0, (0, Metadata_1.parameter)("Channel to set 1-12")),
            __param(1, (0, Metadata_1.parameter)("Gain to set value 0-16")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number]),
            __metadata("design:returntype", void 0)
        ], StoltzenTyphoon.prototype, "setGain", null);
        StoltzenTyphoon = __decorate([
            (0, Metadata_1.driver)('NetworkUDP', { port: 50000 }),
            __metadata("design:paramtypes", [Object])
        ], StoltzenTyphoon);
        return StoltzenTyphoon;
    }(Driver_1.Driver));
    var Command = (function () {
        function Command(baseCmd) {
            this.baseCmd = baseCmd;
        }
        Command.prototype.getKey = function () {
            return this.baseCmd;
        };
        return Command;
    }());
    var MicVolume = (function (_super) {
        __extends(MicVolume, _super);
        function MicVolume(name, value) {
            var _this = _super.call(this, 'set:' + name + '#') || this;
            _this.value = value;
            return _this;
        }
        MicVolume.prototype.getCmdStr = function () {
            return this.baseCmd + this.value.toFixed(0);
        };
        return MicVolume;
    }(Command));
    var MicMute = (function (_super) {
        __extends(MicMute, _super);
        function MicMute(name, mute) {
            var _this = _super.call(this, 'set:' + name + '#') || this;
            _this.mute = mute;
            return _this;
        }
        MicMute.prototype.getCmdStr = function () {
            return this.baseCmd + (this.mute ? '1' : '0');
        };
        return MicMute;
    }(Command));
    function normVolume(normValue) {
        var value = Math.round(normValue * 120);
        return Math.max(0, Math.min(value, 144));
    }
});
