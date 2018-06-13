/*
 * Copyright (c) 2018 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
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
define(["require", "exports", "system_lib/Metadata", "system_lib/Driver"], function (require, exports, Metadata_1, Driver_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
    Basic driver for BOSE BoseControlSpace (e.g. PowerMatch 4250).
    */
    var BoseControlSpace = (function (_super) {
        __extends(BoseControlSpace, _super);
        function BoseControlSpace(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            // Property values, so they cn be read back
            _this.mParamSet = 0;
            _this.mStandBy = false;
            socket.autoConnect();
            _this.toSend = {};
            _this.micMuteState = {};
            _this.micVolumeState = {};
            socket.subscribe('connect', function (sender, msg) {
                // Connection state changed
                if (_this.pendingSend) {
                    _this.pendingSend.cancel();
                    _this.pendingSend = undefined;
                    // …so it will be re-initiated when connection restored
                }
                if (sender.connected && Object.keys(_this.toSend).length)
                    _this.sendSoon(); // Now connected - attempt to send
            });
            return _this;
        }
        Object.defineProperty(BoseControlSpace.prototype, "standBy", {
            get: function () {
                return this.mStandBy;
            },
            set: function (stby) {
                this.mStandBy = stby;
                this.requestSendCmd(new StbyCmd(stby));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "parameterSet", {
            get: function () {
                return this.mParamSet;
            },
            set: function (setNum) {
                setNum = Math.round(setNum);
                this.mParamSet = setNum;
                this.requestSendCmd(new ParamSetCmd(setNum));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "muteMic1", {
            get: function () {
                return this.getMicMuteState('Mic1');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Mic1', mute));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "volumeMic1", {
            get: function () {
                return this.getMicVolumeState('Mic1');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Mic1', volume));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "muteMic2", {
            get: function () {
                return this.getMicMuteState('Mic2');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Mic2', mute));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "volumeMic2", {
            get: function () {
                return this.getMicVolumeState('Mic2');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Mic2', volume));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "muteMic3", {
            get: function () {
                return this.getMicMuteState('Mic3');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Mic3', mute));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "volumeMic3", {
            get: function () {
                return this.getMicVolumeState('Mic3');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Mic3', volume));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "muteMic4", {
            get: function () {
                return this.getMicMuteState('Mic4');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Mic4', mute));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "volumeMic4", {
            get: function () {
                return this.getMicVolumeState('Mic4');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Mic4', volume));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "muteMic5", {
            get: function () {
                return this.getMicMuteState('Mic5');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Mic5', mute));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "volumeMic5", {
            get: function () {
                return this.getMicVolumeState('Mic5');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Mic5', volume));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "muteMic6", {
            get: function () {
                return this.getMicMuteState('Mic6');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Mic6', mute));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "volumeMic6", {
            get: function () {
                return this.getMicVolumeState('Mic6');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Mic6', volume));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "muteMic7", {
            get: function () {
                return this.getMicMuteState('Mic7');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Mic7', mute));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "volumeMic7", {
            get: function () {
                return this.getMicVolumeState('Mic7');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Mic7', volume));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "muteMic8", {
            get: function () {
                return this.getMicMuteState('Mic8');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Mic8', mute));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "volumeMic8", {
            get: function () {
                return this.getMicVolumeState('Mic8');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Mic8', volume));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "muteMic9", {
            get: function () {
                return this.getMicMuteState('Mic9');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Mic9', mute));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "volumeMic9", {
            get: function () {
                return this.getMicVolumeState('Mic9');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Mic9', volume));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "muteMic10", {
            get: function () {
                return this.getMicMuteState('Mic10');
            },
            set: function (mute) {
                this.requestSendCmd(this.getMicMuteCmd('Mic10', mute));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace.prototype, "volumeMic10", {
            get: function () {
                return this.getMicVolumeState('Mic10');
            },
            set: function (volume) {
                this.requestSendCmd(this.getMicVolumeCmd('Mic10', volume));
            },
            enumerable: true,
            configurable: true
        });
        BoseControlSpace.prototype.getMicMuteCmd = function (name, mute) {
            this.micMuteState[name] = mute;
            return new MicMute(name, mute);
        };
        BoseControlSpace.prototype.getMicMuteState = function (name) {
            return this.micMuteState[name] || false;
        };
        BoseControlSpace.prototype.getMicVolumeCmd = function (name, volume) {
            volume = Math.round(volume);
            var oldState = this.micVolumeState[name];
            if (volume !== oldState) {
                this.micVolumeState[name] = volume;
                return new MicVolume(name, volume);
            }
        };
        BoseControlSpace.prototype.getMicVolumeState = function (name) {
            return this.micVolumeState[name] || 0;
        };
        BoseControlSpace.prototype.sendString = function (toSend) {
            return this.socket.sendText(toSend);
        };
        /**
         Set the volume to a normalized value in range 0...1.2, which maps
         to -60 ... +12 dB.
         */
        BoseControlSpace.prototype.setVolume = function (slot, channel, normValue) {
            this.requestSendCmd(new VolumeCmd(slot, channel, normVolume(normValue)));
        };
        /**
         Set the group level 1…64 to a normalized value in range 0...1, which maps
         to -60 ... 0 dB. I also allow "boost" by sepcifying a value greater than 1, which
         can be used to boost the signal to at most +12dB on supporting devices.
         */
        BoseControlSpace.prototype.setGroupLevel = function (group, normValue) {
            group = Math.max(1, Math.min(group, 64));
            this.requestSendCmd(new GroupLevelCmd(group, normVolume(normValue)));
        };
        /**
         Request a command to be sent. Will schedule a send operation soon.
         Note that a new Command with same key as an existing one will
         replace the existing one, making it send only the last one
         with same key.
         */
        BoseControlSpace.prototype.requestSendCmd = function (cmd) {
            if (cmd) {
                if (Object.keys(this.toSend).length === 0)
                    this.sendSoon();
                this.toSend[cmd.getKey()] = cmd;
            }
        };
        /**
         Attempt to make sure commands in toSend are sent soon.
         */
        BoseControlSpace.prototype.sendSoon = function (howSoonMillis) {
            var _this = this;
            if (howSoonMillis === void 0) { howSoonMillis = 10; }
            if (!this.pendingSend) {
                this.pendingSend = wait(howSoonMillis);
                this.pendingSend.then(function () {
                    _this.pendingSend = undefined; // Now taken
                    if (_this.socket.connected)
                        _this.sendNow();
                    // Else will try once connected
                });
            }
        };
        /**
         Attempt to send all commands in toSend. If fails, then restore to toSend
         and try again soon.
         */
        BoseControlSpace.prototype.sendNow = function () {
            var _this = this;
            var sendNow = this.toSend; // Pick up all we're to send
            if (Object.keys(sendNow).length > 0) {
                this.toSend = {}; // To accumulate new commands that may appear meanwhile
                var cmdStr = ''; // Concat commands for ALL to send now here
                for (var cmdKey in sendNow) {
                    var cmd = sendNow[cmdKey].getCmdStr();
                    ;
                    // console.log(cmd);
                    cmdStr += cmd;
                    cmdStr += '\r'; // Each command terminated by Carriage Return
                }
                this.socket.sendText(cmdStr, null).catch(function (error) {
                    console.warn("Error send command", error);
                    /*	Failed sending for some reason. Put back sendNow commands into
                        this.toSend unless superseded. Then try again soon.
                     */
                    for (var cmdKey in sendNow) {
                        if (!_this.toSend[cmdKey])
                            _this.toSend[cmdKey] = sendNow[cmdKey]; // Put failed command back
                    }
                    _this.sendSoon(3000); // Try again later
                });
            }
        };
        return BoseControlSpace;
    }(Driver_1.Driver));
    __decorate([
        Metadata_1.property("Standby power mode"),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], BoseControlSpace.prototype, "standBy", null);
    __decorate([
        Metadata_1.property("Parameter set"),
        Metadata_1.min(0), Metadata_1.max(255),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], BoseControlSpace.prototype, "parameterSet", null);
    __decorate([
        Metadata_1.property("Mute Mic1"),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], BoseControlSpace.prototype, "muteMic1", null);
    __decorate([
        Metadata_1.property("Volume Mic1"), Metadata_1.min(-60), Metadata_1.max(12),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], BoseControlSpace.prototype, "volumeMic1", null);
    __decorate([
        Metadata_1.property("Mute Mic2"),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], BoseControlSpace.prototype, "muteMic2", null);
    __decorate([
        Metadata_1.property("Volume Mic2"), Metadata_1.min(-60), Metadata_1.max(12),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], BoseControlSpace.prototype, "volumeMic2", null);
    __decorate([
        Metadata_1.property("Mute Mic3"),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], BoseControlSpace.prototype, "muteMic3", null);
    __decorate([
        Metadata_1.property("Volume Mic3"), Metadata_1.min(-60), Metadata_1.max(12),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], BoseControlSpace.prototype, "volumeMic3", null);
    __decorate([
        Metadata_1.property("Mute Mic4"),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], BoseControlSpace.prototype, "muteMic4", null);
    __decorate([
        Metadata_1.property("Volume Mic4"), Metadata_1.min(-60), Metadata_1.max(12),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], BoseControlSpace.prototype, "volumeMic4", null);
    __decorate([
        Metadata_1.property("Mute Mic5"),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], BoseControlSpace.prototype, "muteMic5", null);
    __decorate([
        Metadata_1.property("Volume Mic5"), Metadata_1.min(-60), Metadata_1.max(12),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], BoseControlSpace.prototype, "volumeMic5", null);
    __decorate([
        Metadata_1.property("Mute Mic6"),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], BoseControlSpace.prototype, "muteMic6", null);
    __decorate([
        Metadata_1.property("Volume Mic6"), Metadata_1.min(-60), Metadata_1.max(12),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], BoseControlSpace.prototype, "volumeMic6", null);
    __decorate([
        Metadata_1.property("Mute Mic7"),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], BoseControlSpace.prototype, "muteMic7", null);
    __decorate([
        Metadata_1.property("Volume Mic7"), Metadata_1.min(-60), Metadata_1.max(12),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], BoseControlSpace.prototype, "volumeMic7", null);
    __decorate([
        Metadata_1.property("Mute Mic8"),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], BoseControlSpace.prototype, "muteMic8", null);
    __decorate([
        Metadata_1.property("Volume Mic8"), Metadata_1.min(-60), Metadata_1.max(12),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], BoseControlSpace.prototype, "volumeMic8", null);
    __decorate([
        Metadata_1.property("Mute Mic9"),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], BoseControlSpace.prototype, "muteMic9", null);
    __decorate([
        Metadata_1.property("Volume Mic9"), Metadata_1.min(-60), Metadata_1.max(12),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], BoseControlSpace.prototype, "volumeMic9", null);
    __decorate([
        Metadata_1.property("Mute Mic10"),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], BoseControlSpace.prototype, "muteMic10", null);
    __decorate([
        Metadata_1.property("Volume Mic10"), Metadata_1.min(-60), Metadata_1.max(12),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], BoseControlSpace.prototype, "volumeMic10", null);
    __decorate([
        Metadata_1.callable("Send raw command string, automatically terminated by CR"),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String]),
        __metadata("design:returntype", void 0)
    ], BoseControlSpace.prototype, "sendString", null);
    __decorate([
        Metadata_1.callable("Set the volume of slot and channel to normalized value"),
        __param(0, Metadata_1.parameter("Slot to set")),
        __param(1, Metadata_1.parameter("Channel to set")),
        __param(2, Metadata_1.parameter("Value (0…1.2)")),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number, Number]),
        __metadata("design:returntype", void 0)
    ], BoseControlSpace.prototype, "setVolume", null);
    __decorate([
        Metadata_1.callable("Set the level of specified group to normalized value"),
        __param(0, Metadata_1.parameter("Group to set (1…64)")),
        __param(1, Metadata_1.parameter("Value (0…1.2)")),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", void 0)
    ], BoseControlSpace.prototype, "setGroupLevel", null);
    BoseControlSpace = __decorate([
        Metadata_1.driver('NetworkTCP', { port: 10055 }),
        __metadata("design:paramtypes", [Object])
    ], BoseControlSpace);
    exports.BoseControlSpace = BoseControlSpace;
    /**
     * Model each command its own subclass of Command, able to render itself into
     * the required command string to send to the device.
     */
    var Command = (function () {
        function Command(baseCmd) {
            this.baseCmd = baseCmd;
        }
        // Base cmd also used as key (to not overwrite new values with old failed sends)
        Command.prototype.getKey = function () {
            return this.baseCmd;
        };
        return Command;
    }());
    var StbyCmd = (function (_super) {
        __extends(StbyCmd, _super);
        function StbyCmd(stby) {
            var _this = _super.call(this, "SY ") || this;
            _this.stby = stby;
            return _this;
        }
        // Append S or N for Standby or Normal
        StbyCmd.prototype.getCmdStr = function () {
            return this.baseCmd + (this.stby ? 'S' : 'N');
        };
        return StbyCmd;
    }(Command));
    var ParamSetCmd = (function (_super) {
        __extends(ParamSetCmd, _super);
        function ParamSetCmd(value) {
            var _this = _super.call(this, "SS ") || this;
            _this.value = value;
            return _this;
        }
        // Append hex value
        ParamSetCmd.prototype.getCmdStr = function () {
            return this.baseCmd + this.value.toString(16);
        };
        return ParamSetCmd;
    }(Command));
    var GroupLevelCmd = (function (_super) {
        __extends(GroupLevelCmd, _super);
        function GroupLevelCmd(channel, value) {
            var _this = _super.call(this, "SG " + channel.toString(16) + ',') || this;
            _this.value = value;
            return _this;
        }
        // Append hex value
        GroupLevelCmd.prototype.getCmdStr = function () {
            return this.baseCmd + this.value.toString(16);
        };
        return GroupLevelCmd;
    }(Command));
    var VolumeCmd = (function (_super) {
        __extends(VolumeCmd, _super);
        function VolumeCmd(slot, channel, value) {
            var _this = _super.call(this, "SV " + slot.toString(16) + ',' + channel.toString(16)) || this;
            _this.value = value;
            return _this;
        }
        // Append comma and hex value
        VolumeCmd.prototype.getCmdStr = function () {
            return this.baseCmd + ',' + this.value.toString(16);
        };
        return VolumeCmd;
    }(Command));
    var MicVolume = (function (_super) {
        __extends(MicVolume, _super);
        function MicVolume(name, value) {
            var _this = _super.call(this, 'SA"' + name + '">1=') || this;
            _this.value = value;
            return _this;
        }
        MicVolume.prototype.getCmdStr = function () {
            return this.baseCmd + this.value.toFixed(1);
        };
        return MicVolume;
    }(Command));
    var MicMute = (function (_super) {
        __extends(MicMute, _super);
        function MicMute(name, mute) {
            var _this = _super.call(this, 'SA"' + name + '">2=') || this;
            _this.mute = mute;
            return _this;
        }
        MicMute.prototype.getCmdStr = function () {
            return this.baseCmd + (this.mute ? 'O' : 'F');
        };
        return MicMute;
    }(Command));
    /**
     * Return normalized "volume" value 0…1 as 0…120, with possible overshoot for larger than 1
     * input value up to 1.2. This corresponds to 0h(-60dB) to 90h(+12dB) in 0.5dB steps
     * (0-144 dec), where 120 is at 0dB.
     */
    function normVolume(normValue) {
        var value = Math.round(normValue * 120); // 0.5 db steps
        return Math.max(0, Math.min(value, 144)); // Clip to allowed range
    }
});
