var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
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
define(["require", "exports", "system_lib/Metadata", "system_lib/Driver"], function (require, exports, Metadata_1, Driver_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BoseControlSpace59 = void 0;
    var BoseControlSpace59 = (function (_super) {
        __extends(BoseControlSpace59, _super);
        function BoseControlSpace59(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mParamSet = 0;
            _this.mStandBy = false;
            socket.autoConnect();
            _this.toSend = {};
            _this.toSend = {};
            socket.subscribe('connect', function (sender, msg) {
                if (_this.pendingSend) {
                    _this.pendingSend.cancel();
                    _this.pendingSend = undefined;
                }
                if (sender.connected && Object.keys(_this.toSend).length)
                    _this.sendSoon();
            });
            var rawOpts = socket.options;
            if (rawOpts) {
                try {
                    var opts = JSON.parse(rawOpts);
                    if (_this.validOptions(opts))
                        _this.applyOptions(opts);
                    else
                        console.error("Invalid options - ignored");
                }
                catch (error) {
                    console.error("Invalid driver options", error);
                }
            }
            else
                console.warn("No options specified - will provide basic properties only");
            return _this;
        }
        BoseControlSpace59.prototype.validOptions = function (opts) {
            if (opts.gain) {
                var setting1 = opts.gain[0];
                if (setting1.name)
                    return true;
            }
            return false;
        };
        BoseControlSpace59.prototype.applyOptions = function (opts) {
            for (var _i = 0, _a = opts.gain; _i < _a.length; _i++) {
                var gain = _a[_i];
                new GainLevel(this, gain);
                new GainMute(this, gain);
            }
        };
        Object.defineProperty(BoseControlSpace59.prototype, "standBy", {
            get: function () {
                return this.mStandBy;
            },
            set: function (stby) {
                this.mStandBy = stby;
                this.requestSendCmd(new StbyCmd(stby));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BoseControlSpace59.prototype, "parameterSet", {
            get: function () {
                return this.mParamSet;
            },
            set: function (setNum) {
                setNum = Math.round(setNum);
                this.mParamSet = setNum;
                this.requestSendCmd(new ParamSetCmd(setNum));
            },
            enumerable: false,
            configurable: true
        });
        BoseControlSpace59.prototype.sendString = function (toSend) {
            return this.socket.sendText(toSend);
        };
        BoseControlSpace59.prototype.requestSendCmd = function (cmd) {
            if (cmd) {
                if (Object.keys(this.toSend).length === 0)
                    this.sendSoon();
                this.toSend[cmd.getKey()] = cmd;
            }
        };
        BoseControlSpace59.prototype.sendSoon = function (howSoonMillis) {
            var _this = this;
            if (howSoonMillis === void 0) { howSoonMillis = 10; }
            if (!this.pendingSend) {
                this.pendingSend = wait(howSoonMillis);
                this.pendingSend.then(function () {
                    _this.pendingSend = undefined;
                    if (_this.socket.connected)
                        _this.sendNow();
                });
            }
        };
        BoseControlSpace59.prototype.sendNow = function () {
            var _this = this;
            var sendNow = this.toSend;
            if (Object.keys(sendNow).length > 0) {
                this.toSend = {};
                var cmdStr = '';
                for (var cmdKey in sendNow) {
                    var cmd = sendNow[cmdKey].getCmdStr();
                    ;
                    cmdStr += cmd;
                }
                this.socket.sendText(cmdStr).catch(function (error) {
                    console.warn("Failed sending command", error);
                    for (var cmdKey in sendNow) {
                        if (!_this.toSend[cmdKey])
                            _this.toSend[cmdKey] = sendNow[cmdKey];
                    }
                    _this.sendSoon(3000);
                });
            }
        };
        __decorate([
            Metadata_1.property("Standby power mode"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], BoseControlSpace59.prototype, "standBy", null);
        __decorate([
            Metadata_1.property("Recall Parameter Set"),
            Metadata_1.min(0),
            Metadata_1.max(255),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], BoseControlSpace59.prototype, "parameterSet", null);
        __decorate([
            Metadata_1.callable("Send raw command string, automatically terminated by CR"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], BoseControlSpace59.prototype, "sendString", null);
        BoseControlSpace59 = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 10055 }),
            __metadata("design:paramtypes", [Object])
        ], BoseControlSpace59);
        return BoseControlSpace59;
    }(Driver_1.Driver));
    exports.BoseControlSpace59 = BoseControlSpace59;
    var Command = (function () {
        function Command(baseCmd) {
            this.baseCmd = baseCmd;
        }
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
        ParamSetCmd.prototype.getCmdStr = function () {
            return this.baseCmd + this.value.toString(16);
        };
        return ParamSetCmd;
    }(Command));
    var ModuleGainLevel = (function (_super) {
        __extends(ModuleGainLevel, _super);
        function ModuleGainLevel(name, value) {
            var _this = _super.call(this, "SA " + '"' + name + '">1=') || this;
            _this.value = value;
            return _this;
        }
        ModuleGainLevel.prototype.getCmdStr = function () {
            return this.baseCmd + ModuleGainLevel.constrainValue(this.value).toString();
        };
        ModuleGainLevel.constrainValue = function (value) {
            value = Math.max(ModuleGainLevel.kMin, Math.min(ModuleGainLevel.kMax, value));
            var result = Math.round(value * 2) / 2;
            return result.toString();
        };
        ModuleGainLevel.kMin = -60.5;
        ModuleGainLevel.kMax = 12;
        return ModuleGainLevel;
    }(Command));
    var GainLevel = (function () {
        function GainLevel(owner, gain) {
            var _this = this;
            this.value = -20;
            this.name = gain.name;
            owner.property(gain.name + "_level", {
                type: "Number",
                description: "Gain level, dB",
                min: ModuleGainLevel.kMin,
                max: ModuleGainLevel.kMax
            }, function (newValue) {
                if (newValue !== undefined) {
                    _this.value = newValue;
                    var cmd = new ModuleGainLevel(_this.name, newValue);
                    owner.requestSendCmd(cmd);
                }
                return _this.value;
            });
        }
        return GainLevel;
    }());
    var ModuleGainMute = (function (_super) {
        __extends(ModuleGainMute, _super);
        function ModuleGainMute(name, value) {
            var _this = _super.call(this, "SA " + '"' + name + '">2=') || this;
            _this.value = value;
            return _this;
        }
        ModuleGainMute.prototype.getCmdStr = function () {
            return this.baseCmd + (this.value ? 'O' : 'F');
        };
        return ModuleGainMute;
    }(Command));
    var GainMute = (function () {
        function GainMute(owner, gain) {
            var _this = this;
            this.value = false;
            this.name = gain.name;
            owner.property(gain.name + "_mute", { type: "Boolean", description: "Gain mute", }, function (newValue) {
                if (newValue !== undefined) {
                    _this.value = newValue;
                    var cmd = new ModuleGainMute(_this.name, newValue);
                    owner.requestSendCmd(cmd);
                }
                return _this.value;
            });
        }
        return GainMute;
    }());
    function normToGain(norm) {
        var kMin = -60.5;
        var kMax = 12;
        var kRange = kMax - kMin;
        var result = kRange * norm;
        result = Math.round(result * 2) / 2 + kMin;
        return result.toString();
    }
});
