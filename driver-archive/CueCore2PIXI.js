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
define(["require", "exports", "../system_lib/Driver", "../system_lib/Metadata", "../system_lib/ScriptBase"], function (require, exports, Driver_1, Metadata_1, ScriptBase_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CueCore2PIXI = void 0;
    var Playback = (function (_super) {
        __extends(Playback, _super);
        function Playback(index, owner) {
            var _this = _super.call(this) || this;
            _this.index = index;
            _this.owner = owner;
            _this._active = false;
            _this._cue = 1;
            _this._intensity = 1;
            _this._rate = 0;
            return _this;
        }
        Object.defineProperty(Playback.prototype, "active", {
            get: function () {
                return this._active;
            },
            set: function (newValue) {
                this._active = newValue;
                if (!this.owner.feedback) {
                    if (newValue) {
                        this.sendCommand("jump", this._cue);
                    }
                    else {
                        this.sendCommand("release");
                    }
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Playback.prototype, "cue", {
            get: function () {
                return this._cue;
            },
            set: function (newValue) {
                this._cue = newValue;
                if (!this.owner.feedback && this._active) {
                    this.sendCommand("jump", newValue);
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Playback.prototype, "intensity", {
            get: function () {
                return this._intensity;
            },
            set: function (newValue) {
                this._intensity = newValue;
                if (!this.owner.feedback) {
                    this.sendCommand("intensity", newValue);
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Playback.prototype, "rate", {
            get: function () {
                return this._rate;
            },
            set: function (newValue) {
                this._rate = newValue;
                if (!this.owner.feedback) {
                    this.sendCommand("rate", newValue);
                }
            },
            enumerable: false,
            configurable: true
        });
        Playback.prototype.sendCommand = function (command, value) {
            var toSend = "core-pb-" + this.index + "-" + command;
            if (value !== undefined) {
                toSend += "=" + value;
            }
            this.owner.connection.sendText(toSend);
        };
        __decorate([
            (0, Metadata_1.property)("True to start playback, false to stop playback."),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], Playback.prototype, "active", null);
        __decorate([
            (0, Metadata_1.property)("Playback cue"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], Playback.prototype, "cue", null);
        __decorate([
            (0, Metadata_1.property)("Playback intensity"),
            (0, Metadata_1.min)(0),
            (0, Metadata_1.max)(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], Playback.prototype, "intensity", null);
        __decorate([
            (0, Metadata_1.property)("Playback rate"),
            (0, Metadata_1.min)(-1),
            (0, Metadata_1.max)(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], Playback.prototype, "rate", null);
        return Playback;
    }(ScriptBase_1.AggregateElem));
    var CueCore2PIXI = (function (_super) {
        __extends(CueCore2PIXI, _super);
        function CueCore2PIXI(connection) {
            var _this = _super.call(this, connection) || this;
            _this.connection = connection;
            _this.feedback = false;
            _this.cmdHandlers = {};
            _this._connected = false;
            _this._intensity = 1;
            _this._rate = 0;
            _this._fade = 0;
            _this.playbacks = _this.namedAggregateProperty("playbacks", Playback);
            _this.init();
            return _this;
        }
        CueCore2PIXI_1 = CueCore2PIXI;
        Object.defineProperty(CueCore2PIXI.prototype, "connected", {
            get: function () {
                return this._connected;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CueCore2PIXI.prototype, "intensity", {
            get: function () {
                return this._intensity;
            },
            set: function (newValue) {
                this._intensity = newValue;
                if (!this.feedback) {
                    this.connection.sendText("core-pb-intensity=" + newValue);
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CueCore2PIXI.prototype, "rate", {
            get: function () {
                return this._rate;
            },
            set: function (newValue) {
                this._rate = newValue;
                if (!this.feedback) {
                    this.connection.sendText("core-pb-rate=" + newValue);
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CueCore2PIXI.prototype, "fade", {
            get: function () {
                return this._fade;
            },
            set: function (newValue) {
                this._fade = newValue;
                if (!this.feedback) {
                    this.connection.sendText("core-pb-fade=" + newValue);
                }
            },
            enumerable: false,
            configurable: true
        });
        CueCore2PIXI.prototype.init = function () {
            var _this = this;
            var _loop_1 = function (i) {
                var playback = new Playback(i, this_1);
                this_1.playbacks["playback" + i] = playback;
                this_1.cmdHandlers["core-pb-" + i + "-intensity"] =
                    function (strValue) {
                        playback.intensity = parseFloat(strValue);
                    };
                this_1.cmdHandlers["core-pb-" + i + "-rate"] =
                    function (strValue) {
                        playback.rate = parseFloat(strValue);
                    };
                this_1.cmdHandlers["core-pb-" + i + "-cue"] =
                    function (strValue) {
                        playback.cue = parseInt(strValue);
                    };
                this_1.cmdHandlers["core-pb-" + i + "-active"] =
                    function (strValue) {
                        playback.active = strValue === "On";
                    };
            };
            var this_1 = this;
            for (var i = 1; i < 7; ++i) {
                _loop_1(i);
            }
            this.cmdHandlers["core-pb-intensity"] = function (strValue) {
                _this.intensity = parseFloat(strValue);
            };
            this.cmdHandlers["core-pb-rate"] = function (strValue) {
                _this.rate = parseFloat(strValue);
            };
            this.cmdHandlers["core-pb-fade"] = function (strValue) {
                _this.fade = parseInt(strValue);
            };
            this.connection.subscribe("textReceived", function (emitter, message) {
                if (!_this._connected) {
                    _this._connected = true;
                    _this.changed("connected");
                    _this.sendState();
                }
                _this.lastReceived = Date.now();
                _this.handleMessage(message.text);
            });
            this.pollForever();
        };
        CueCore2PIXI.prototype.handleMessage = function (message) {
            var _a = message.split("="), cmd = _a[0], value = _a[1];
            if (cmd in this.cmdHandlers) {
                this.feedback = true;
                try {
                    this.cmdHandlers[cmd](value);
                }
                finally {
                    this.feedback = false;
                }
            }
        };
        CueCore2PIXI.prototype.sendState = function () {
            for (var key in this.playbacks) {
                var playback = this.playbacks[key];
                playback.rate = playback.rate;
                playback.intensity = playback.intensity;
                playback.cue = playback.cue;
                playback.active = playback.active;
            }
            this.intensity = this._intensity;
            this.rate = this._rate;
            this.fade = this._fade;
        };
        CueCore2PIXI.prototype.pollForever = function () {
            var _this = this;
            var prevReceived = this.lastReceived;
            wait(10).then(function () {
                _this.connection.sendText("core-hello");
                wait(CueCore2PIXI_1.POLL_RATE).then(function () {
                    if (_this._connected && _this.lastReceived === prevReceived) {
                        _this._connected = false;
                        _this.changed("connected");
                    }
                    _this.pollForever();
                });
            });
        };
        var CueCore2PIXI_1;
        CueCore2PIXI.POLL_RATE = 5000;
        __decorate([
            (0, Metadata_1.property)(),
            __metadata("design:type", Object),
            __metadata("design:paramtypes", [])
        ], CueCore2PIXI.prototype, "connected", null);
        __decorate([
            (0, Metadata_1.property)("Master intensity"),
            (0, Metadata_1.min)(0),
            (0, Metadata_1.max)(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CueCore2PIXI.prototype, "intensity", null);
        __decorate([
            (0, Metadata_1.property)("Master rate"),
            (0, Metadata_1.min)(-1),
            (0, Metadata_1.max)(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CueCore2PIXI.prototype, "rate", null);
        __decorate([
            (0, Metadata_1.property)("Master fade time (seconds)"),
            (0, Metadata_1.min)(0),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CueCore2PIXI.prototype, "fade", null);
        CueCore2PIXI = CueCore2PIXI_1 = __decorate([
            (0, Metadata_1.driver)("NetworkUDP", { port: 7000, rcvPort: 7001 }),
            __metadata("design:paramtypes", [Object])
        ], CueCore2PIXI);
        return CueCore2PIXI;
    }(Driver_1.Driver));
    exports.CueCore2PIXI = CueCore2PIXI;
});
