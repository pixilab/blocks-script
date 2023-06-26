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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata", "../system_lib/Metadata"], function (require, exports, Driver_1, Metadata_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.VISCA = void 0;
    var VISCA = (function (_super) {
        __extends(VISCA, _super);
        function VISCA(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.props = {};
            _this.informants = [];
            _this.mReady = false;
            _this.retainedStateProps = {};
            _this.toSend = {};
            _this.sendQ = [];
            _this.fromCam = [];
            socket.autoConnect(true);
            _this.powerQuery = new Query('PowerQ', [0x81, 9, 4, 0], _this.addProp(new Power(_this)));
            _this.informants.push(_this.powerQuery);
            _this.informants.push(new Query('AutofocusQ', [0x81, 9, 4, 0x38], _this.addProp(new Autofocus(_this))));
            _this.informants.push(new Query('ZoomQ', [0x81, 9, 4, 0x47], _this.addProp(new Zoom(_this))));
            _this.informants.push(new Query('FocusQ', [0x81, 9, 4, 0x48], _this.addProp(new Focus(_this))));
            _this.informants.push(new Query('PanTiltQ', [0x81, 9, 6, 0x12], _this.addProp(new Pan(_this)), _this.addProp(new Tilt(_this))));
            _this.addProp(new PanSpeed(_this));
            _this.addProp(new TiltSpeed(_this));
            socket.subscribe('connect', function (sender, message) {
                if (message.type === 'Connection')
                    _this.onConnectStateChanged(sender.connected);
            });
            if (socket.connected)
                _this.onConnectStateChanged(true);
            socket.subscribe('bytesReceived', function (sender, message) {
                _this.gotDataFromCam(message.rawData);
            });
            _this.init();
            socket.subscribe('finish', function () {
                _this.stopPolling();
                if (_this.pollStateTimer) {
                    _this.pollStateTimer.cancel();
                    _this.pollStateTimer = undefined;
                }
            });
            return _this;
        }
        VISCA.prototype.addRetainedStateProp = function (propName) {
            this.retainedStateProps[propName] = true;
        };
        Object.defineProperty(VISCA.prototype, "ready", {
            get: function () {
                return this.mReady;
            },
            set: function (value) {
                this.mReady = value;
            },
            enumerable: false,
            configurable: true
        });
        VISCA.prototype.recallPreset = function (preset) {
            this.send(new RecallPresetCmd(preset));
        };
        VISCA.prototype.pollState = function () {
            if (!this.initialPollDone) {
                for (var _i = 0, _a = this.informants; _i < _a.length; _i++) {
                    var inf = _a[_i];
                    this.send(inf);
                }
            }
            else
                this.send(this.powerQuery);
        };
        VISCA.prototype.pollStateSoon = function (howSoonMillis) {
            var _this = this;
            if (howSoonMillis === void 0) { howSoonMillis = 12000; }
            this.stopPolling();
            if (!this.pollStateTimer) {
                this.pollStateTimer = wait(howSoonMillis);
                this.pollStateTimer.then(function () {
                    _this.pollStateTimer = undefined;
                    _this.init();
                });
            }
        };
        VISCA.prototype.addProp = function (prop) {
            this.props[prop.name] = prop;
            return prop;
        };
        VISCA.prototype.propValue = function (propName) {
            var prop = this.props[propName];
            return prop.getValue();
        };
        VISCA.prototype.propValueNum = function (propName) {
            return Math.round(this.propValue(propName));
        };
        VISCA.prototype.init = function () {
            if (this.socket.connected && this.socket.enabled)
                this.poll();
        };
        VISCA.prototype.onConnectStateChanged = function (connected) {
            this.fromCam = [];
            if (connected)
                this.poll();
            else
                this.stopPolling();
            this.changed(Power.propName);
        };
        VISCA.prototype.stopPolling = function () {
            if (this.pollTimer)
                this.pollTimer.cancel();
            this.pollTimer = undefined;
            this.initialPollDone = false;
            for (var prop in this.props) {
                if (!this.retainedStateProps[prop])
                    this.props[prop].reset();
            }
        };
        VISCA.prototype.poll = function () {
            var _this = this;
            if (this.socket.enabled) {
                this.pollState();
                if (!this.pollTimer) {
                    this.pollTimer = wait(1000 * 60);
                    this.pollTimer.then(function () {
                        _this.pollTimer = undefined;
                        if (_this.socket.connected)
                            _this.poll();
                    });
                }
            }
        };
        VISCA.prototype.send = function (instr) {
            var existing = this.toSend[instr.name];
            if (existing) {
                var qix = this.sendQ.indexOf(existing);
                if (qix >= 0)
                    this.sendQ[qix] = instr;
                else
                    console.error("sendQ out of whack");
            }
            else
                this.sendQ.push(instr);
            this.toSend[instr.name] = instr;
            this.sendNext();
        };
        VISCA.prototype.sendNext = function () {
            var _this = this;
            if (!this.sendTimeout && this.socket.connected) {
                var toSend = this.sendQ.shift();
                if (toSend) {
                    delete this.toSend[toSend.name];
                    this.currInstr = toSend;
                    this.socket.sendBytes(toSend.data);
                    this.sendTimeout = wait(3000);
                    this.sendTimeout.then(function () {
                        var instr = _this.currInstr;
                        console.warn("Timed out sending", instr.name, bytesToString(instr.data));
                        _this.sendTimeout = undefined;
                        _this.currInstr = undefined;
                        _this.sendNext();
                    });
                }
            }
        };
        VISCA.prototype.instrDone = function () {
            this.currInstr = undefined;
            this.sendNext();
        };
        VISCA.prototype.gotDataFromCam = function (bytes) {
            this.fromCam = this.fromCam.concat(bytes);
            var len = this.fromCam.length;
            if (len >= 3) {
                var packetEnd = this.fromCam.indexOf(0xff);
                if (packetEnd >= 2) {
                    this.processDataFromCam(this.fromCam.splice(0, packetEnd + 1));
                    if (this.sendTimeout) {
                        this.sendTimeout.cancel();
                        this.sendTimeout = undefined;
                    }
                    this.instrDone();
                }
            }
            var excess = len - 32;
            if (excess > 0) {
                this.fromCam.splice(0, excess);
                console.warn("Discarding excessive data", excess);
            }
        };
        VISCA.prototype.processDataFromCam = function (packet) {
            var msg = packet[1];
            switch (msg) {
                case 0x41:
                    this.instrDone();
                    break;
                case 0x51:
                    break;
                case 0x60:
                    this.currInstrFailed("SYNTAX ERROR " + packet[2]);
                    this.instrDone();
                    break;
                case 0x61:
                    this.currInstrFailed("CAN'T EXECUTE");
                    this.instrDone();
                    break;
                case 0x50:
                    if (this.currInstr) {
                        this.currInstr.handleReply(packet);
                        this.instrDone();
                        break;
                    }
                default:
                    console.warn("Unexpected data from camera", bytesToString(packet));
                    break;
            }
        };
        VISCA.prototype.setInitialPollDone = function () {
            this.initialPollDone = true;
            this.ready = true;
        };
        VISCA.prototype.currInstrFailed = function (error) {
            var instr = this.currInstr;
            if (instr) {
                if (this.propValue(Power.propName))
                    instr.reportFailed(error);
            }
            else
                console.warn("Spurious error from camera", error);
        };
        __decorate([
            (0, Metadata_1.property)("Set once camera considered ready to be controlled", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], VISCA.prototype, "ready", null);
        __decorate([
            Meta.callable("Recall memory preset"),
            __param(0, (0, Metadata_1.parameter)("Preset to recall; 0...254")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], VISCA.prototype, "recallPreset", null);
        VISCA = __decorate([
            (0, Metadata_1.driver)('NetworkTCP', { port: 1259 }),
            __metadata("design:paramtypes", [Object])
        ], VISCA);
        return VISCA;
    }(Driver_1.Driver));
    exports.VISCA = VISCA;
    function bytesToString(bytes) {
        var result = '';
        var hasData = false;
        for (var _i = 0, bytes_1 = bytes; _i < bytes_1.length; _i++) {
            var byte = bytes_1[_i];
            if (hasData)
                result += ' ';
            if (byte < 0x10)
                result += '0';
            result += byte.toString(16);
            hasData = true;
        }
        return result;
    }
    var Instr = (function () {
        function Instr(name, data) {
            this.name = name;
            this.data = data;
            data.push(0xff);
        }
        Instr.prototype.handleReply = function (reply) {
            this.reportFailed("UNEXPECTED REPLY");
        };
        Instr.prototype.reportFailed = function (error) {
            console.warn("Instruction failed; ", error, this.name, bytesToString(this.data));
        };
        Instr.pushNibs = function (data, value, nibCount) {
            if (nibCount === void 0) { nibCount = 4; }
            while (nibCount--)
                data.push((value >> nibCount * 4) & 0xf);
            return data;
        };
        return Instr;
    }());
    var Query = (function (_super) {
        __extends(Query, _super);
        function Query(name, toSend) {
            var toInform = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                toInform[_i - 2] = arguments[_i];
            }
            var _this = _super.call(this, name, toSend) || this;
            _this.toInform = toInform;
            return _this;
        }
        Query.prototype.handleReply = function (reply) {
            for (var _i = 0, _a = this.toInform; _i < _a.length; _i++) {
                var informer = _a[_i];
                informer.inform(reply);
            }
        };
        return Query;
    }(Instr));
    var PowerCmd = (function (_super) {
        __extends(PowerCmd, _super);
        function PowerCmd(on) {
            return _super.call(this, 'Power', [0x81, 1, 4, 0, on ? 2 : 3]) || this;
        }
        return PowerCmd;
    }(Instr));
    var AutofocusCmd = (function (_super) {
        __extends(AutofocusCmd, _super);
        function AutofocusCmd(on) {
            return _super.call(this, 'Autofocus', [0x81, 1, 4, 0x38, on ? 2 : 3]) || this;
        }
        return AutofocusCmd;
    }(Instr));
    var ZoomCmd = (function (_super) {
        __extends(ZoomCmd, _super);
        function ZoomCmd(value) {
            return _super.call(this, 'Zoom', Instr.pushNibs([0x81, 1, 4, 0x47], Math.round(value))) || this;
        }
        return ZoomCmd;
    }(Instr));
    var FocusCmd = (function (_super) {
        __extends(FocusCmd, _super);
        function FocusCmd(value) {
            return _super.call(this, 'Focus', Instr.pushNibs([0x81, 1, 4, 0x48], Math.round(value))) || this;
        }
        return FocusCmd;
    }(Instr));
    var RecallPresetCmd = (function (_super) {
        __extends(RecallPresetCmd, _super);
        function RecallPresetCmd(presetNumber) {
            var _this = this;
            var cmd = [0x81, 1, 4, 0x3f, 2, Math.round(Math.min(254, presetNumber))];
            _this = _super.call(this, 'RecallPreset', cmd) || this;
            return _this;
        }
        return RecallPresetCmd;
    }(Instr));
    var PanTiltCmd = (function (_super) {
        __extends(PanTiltCmd, _super);
        function PanTiltCmd(owner) {
            var _this = this;
            var data = [0x81, 1, 6, 2];
            data.push(owner.propValueNum(PanSpeed.propName));
            data.push(owner.propValueNum(TiltSpeed.propName));
            Instr.pushNibs(data, owner.propValueNum(Pan.propName));
            Instr.pushNibs(data, owner.propValueNum(Tilt.propName));
            _this = _super.call(this, 'PanTilt', data) || this;
            return _this;
        }
        return PanTiltCmd;
    }(Instr));
    var Property = (function () {
        function Property(owner, name, defaultState) {
            this.owner = owner;
            this.name = name;
            this.defaultState = defaultState;
        }
        Property.prototype.inform = function (reply) {
        };
        Property.prototype.reset = function () {
            var hadState = this.state;
            this.state = undefined;
            if (hadState !== undefined)
                this.owner.changed(this.name);
        };
        Property.prototype.getValue = function () {
            return this.propGS();
        };
        Property.prototype.propGS = function (val) {
            if (val !== undefined) {
                var news = val !== this.state;
                this.state = val;
                if (news)
                    this.desiredStateChanged(val);
            }
            var result = this.state;
            if (result === undefined)
                result = this.defaultState;
            return result;
        };
        Property.prototype.gotDeviceState = function (val) {
            if (val !== undefined && this.getValue() !== val) {
                this.state = val;
                this.owner.changed(this.name);
            }
            return val;
        };
        Property.prototype.desiredStateChanged = function (state) {
        };
        return Property;
    }());
    var NumProp = (function (_super) {
        __extends(NumProp, _super);
        function NumProp(owner, name, defaultState, min, max) {
            var _this = _super.call(this, owner, name, defaultState) || this;
            _this.min = min;
            _this.max = max;
            owner.property(name, {
                type: Number,
                description: name,
                min: min,
                max: max
            }, function (num) { return _this.propGS(num); });
            return _this;
        }
        NumProp.prototype.collectNibs = function (reply, nibCount, offs) {
            if (offs === void 0) { offs = 2; }
            var result = 0;
            for (var nib = nibCount; nib; --nib)
                result = (result << 4) + (reply[offs++] & 0x0f);
            if (nibCount === 4 && (result & 0x8000))
                result = result - 0x10000;
            if (result < this.min || result > this.max) {
                console.warn("Nupermic feedback out of whack", this.name, result);
                result = undefined;
            }
            return result;
        };
        return NumProp;
    }(Property));
    var Power = (function (_super) {
        __extends(Power, _super);
        function Power(owner) {
            var _this = _super.call(this, owner, Power.propName, false) || this;
            owner.addRetainedStateProp(Power.propName);
            owner.property(Power.propName, { type: Boolean }, function (val) { return _this.propGS(val); });
            return _this;
        }
        Power.prototype.desiredStateChanged = function (state) {
            this.owner.send(new PowerCmd(state));
            if (state)
                this.owner.pollStateSoon();
            else
                this.owner.ready = false;
        };
        Power.prototype.propGS = function (val) {
            return _super.prototype.propGS.call(this, val) && this.owner.connected;
        };
        Power.prototype.inform = function (reply) {
            var wasOn = this.getValue();
            if (this.gotDeviceState(reply[2] === 2) && !wasOn)
                this.owner.pollStateSoon();
        };
        Power.propName = "power";
        return Power;
    }(Property));
    var Autofocus = (function (_super) {
        __extends(Autofocus, _super);
        function Autofocus(owner) {
            var _this = _super.call(this, owner, Autofocus.propName, false) || this;
            owner.addRetainedStateProp(Autofocus.propName);
            owner.property(Autofocus.propName, { type: Boolean }, function (val) { return _this.propGS(val); });
            return _this;
        }
        Autofocus.prototype.desiredStateChanged = function (state) {
            this.owner.send(new AutofocusCmd(state));
            if (!state) {
                this.owner.send(new FocusCmd(this.owner.propValueNum(Focus.propName)));
            }
        };
        Autofocus.prototype.inform = function (reply) {
            this.gotDeviceState(reply[2] === 2);
        };
        Autofocus.propName = "autofocus";
        return Autofocus;
    }(Property));
    var Zoom = (function (_super) {
        __extends(Zoom, _super);
        function Zoom(owner) {
            return _super.call(this, owner, "zoom", 0, 0, 0x4000) || this;
        }
        Zoom.prototype.desiredStateChanged = function (value) {
            this.owner.send(new ZoomCmd(value));
        };
        Zoom.prototype.inform = function (reply) {
            this.gotDeviceState(this.collectNibs(reply, 4));
        };
        return Zoom;
    }(NumProp));
    var Focus = (function (_super) {
        __extends(Focus, _super);
        function Focus(owner) {
            return _super.call(this, owner, Focus.propName, 0, 0, 2788) || this;
        }
        Focus.prototype.desiredStateChanged = function (value) {
            if (!this.owner.propValue(Autofocus.propName))
                this.owner.send(new FocusCmd(value));
        };
        Focus.prototype.inform = function (reply) {
            this.gotDeviceState(this.collectNibs(reply, 4));
        };
        Focus.propName = "focus";
        return Focus;
    }(NumProp));
    var Pan = (function (_super) {
        __extends(Pan, _super);
        function Pan(owner) {
            return _super.call(this, owner, Pan.propName, 0, -2448, 2448) || this;
        }
        Pan.prototype.desiredStateChanged = function (value) {
            this.owner.send(new PanTiltCmd(this.owner));
        };
        Pan.prototype.inform = function (reply) {
            this.gotDeviceState(this.collectNibs(reply, 4));
        };
        Pan.propName = "pan";
        return Pan;
    }(NumProp));
    var Tilt = (function (_super) {
        __extends(Tilt, _super);
        function Tilt(owner) {
            return _super.call(this, owner, Tilt.propName, 0, -356, 1296) || this;
        }
        Tilt.prototype.desiredStateChanged = function (value) {
            this.owner.send(new PanTiltCmd(this.owner));
        };
        Tilt.prototype.inform = function (reply) {
            var state = this.collectNibs(reply, 4, 6);
            if (state !== undefined) {
                this.gotDeviceState(state);
                this.owner.setInitialPollDone();
            }
        };
        Tilt.propName = "tilt";
        return Tilt;
    }(NumProp));
    var PanSpeed = (function (_super) {
        __extends(PanSpeed, _super);
        function PanSpeed(owner) {
            var _this = _super.call(this, owner, PanSpeed.propName, 24, 1, 24) || this;
            owner.addRetainedStateProp(PanSpeed.propName);
            return _this;
        }
        PanSpeed.propName = "panSpeed";
        return PanSpeed;
    }(NumProp));
    var TiltSpeed = (function (_super) {
        __extends(TiltSpeed, _super);
        function TiltSpeed(owner) {
            var _this = _super.call(this, owner, TiltSpeed.propName, 24, 1, 20) || this;
            owner.addRetainedStateProp(TiltSpeed.propName);
            return _this;
        }
        TiltSpeed.propName = "tiltSpeed";
        return TiltSpeed;
    }(NumProp));
});
