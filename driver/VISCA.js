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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.VISCA = void 0;
    var VISCA = (function (_super) {
        __extends(VISCA, _super);
        function VISCA(socket) {
            var _this = _super.call(this, socket) || this;
            _this.props = {};
            _this.informants = [];
            _this.commander = new Commander(socket);
            socket.autoConnect();
            _this.informants.push(new Query('PowerQ', [0x81, 9, 4, 0], _this.addProp(new Power(_this))));
            _this.informants.push(new Query('AutofocusQ', [0x81, 9, 4, 0x38], _this.addProp(new Autofocus(_this))));
            _this.informants.push(new Query('ZoomQ', [0x81, 9, 4, 0x47], _this.addProp(new Zoom(_this))));
            _this.informants.push(new Query('FocusQ', [0x81, 9, 4, 0x48], _this.addProp(new Focus(_this))));
            _this.informants.push(new Query('PanTiltQ', [0x81, 9, 6, 0x12], _this.addProp(new Pan(_this)), _this.addProp(new Tilt(_this))));
            _this.addProp(new PanSpeed(_this));
            _this.addProp(new TiltSpeed(_this));
            _this.pollState();
            return _this;
        }
        VISCA.prototype.pollState = function () {
            for (var _i = 0, _a = this.informants; _i < _a.length; _i++) {
                var inf = _a[_i];
                this.commander.send(inf);
            }
        };
        VISCA.prototype.pollStateSoon = function (howSoonMillis) {
            var _this = this;
            if (howSoonMillis === void 0) { howSoonMillis = 8000; }
            if (!this.pollStateTimer) {
                this.pollStateTimer = wait(howSoonMillis);
                this.pollStateTimer.then(function () {
                    _this.pollStateTimer = undefined;
                    _this.pollState();
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
        VISCA = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 1259 }),
            __metadata("design:paramtypes", [Object])
        ], VISCA);
        return VISCA;
    }(Driver_1.Driver));
    exports.VISCA = VISCA;
    var Commander = (function () {
        function Commander(socket) {
            var _this = this;
            this.socket = socket;
            this.toSend = {};
            this.sendQ = [];
            this.fromCam = [];
            socket.autoConnect(true);
            socket.subscribe('connect', function (sender, message) {
                if (message.type === 'Connection')
                    _this.onConnectStateChanged(sender.connected);
            });
            if (socket.connected)
                this.onConnectStateChanged(true);
            socket.subscribe('bytesReceived', function (sender, message) {
                _this.gotDataFromCam(message.rawData);
            });
        }
        Commander.prototype.onConnectStateChanged = function (connected) {
            this.fromCam = [];
            if (connected)
                this.sendNext();
        };
        Commander.prototype.send = function (instr) {
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
        Commander.prototype.sendNext = function () {
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
        Commander.prototype.instrDone = function () {
            this.currInstr = undefined;
            this.sendNext();
        };
        Commander.prototype.gotDataFromCam = function (bytes) {
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
        Commander.prototype.processDataFromCam = function (packet) {
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
        Commander.prototype.currInstrFailed = function (error) {
            var instr = this.currInstr;
            if (instr)
                instr.reportFailed(error);
            else
                console.warn("Spurious error from camera", error);
        };
        return Commander;
    }());
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
        Property.prototype.getValue = function () {
            return this.propGS();
        };
        Property.prototype.propGS = function (val) {
            if (val !== undefined) {
                var news = val !== this.wanted;
                this.wanted = val;
                this.state = val;
                if (news)
                    this.desiredStateChanged(val);
            }
            var result = this.state;
            if (result === undefined)
                result = this.wanted;
            if (result === undefined)
                result = this.defaultState;
            return result;
        };
        Property.prototype.setState = function (val) {
            if (this.getValue() !== val) {
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
        NumProp.prototype.setState = function (val) {
            return _super.prototype.setState.call(this, val);
        };
        NumProp.collectNibs = function (reply, nibCount, offs) {
            if (offs === void 0) { offs = 2; }
            var result = 0;
            for (var nib = nibCount; nib; --nib)
                result = (result << 4) + (reply[offs++] & 0x0f);
            if (nibCount === 4 && (result & 0x8000))
                result = result - 0x10000;
            return result;
        };
        return NumProp;
    }(Property));
    var Power = (function (_super) {
        __extends(Power, _super);
        function Power(owner) {
            var _this = _super.call(this, owner, "power", false) || this;
            owner.property("power", { type: Boolean }, function (val) { return _this.propGS(val); });
            return _this;
        }
        Power.prototype.desiredStateChanged = function (state) {
            this.owner.commander.send(new PowerCmd(state));
            if (state)
                this.owner.pollStateSoon();
        };
        Power.prototype.inform = function (reply) {
            this.setState(reply[2] === 2);
        };
        return Power;
    }(Property));
    var Autofocus = (function (_super) {
        __extends(Autofocus, _super);
        function Autofocus(owner) {
            var _this = _super.call(this, owner, Autofocus.propName, false) || this;
            owner.property(Autofocus.propName, { type: Boolean }, function (val) { return _this.propGS(val); });
            return _this;
        }
        Autofocus.prototype.desiredStateChanged = function (state) {
            this.owner.commander.send(new AutofocusCmd(state));
            if (!state) {
                this.owner.commander.send(new FocusCmd(this.owner.propValueNum(Focus.propName)));
            }
        };
        Autofocus.prototype.inform = function (reply) {
            this.setState(reply[2] === 2);
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
            this.owner.commander.send(new ZoomCmd(value));
        };
        Zoom.prototype.inform = function (reply) {
            this.setState(NumProp.collectNibs(reply, 4));
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
                this.owner.commander.send(new FocusCmd(value));
        };
        Focus.prototype.inform = function (reply) {
            this.setState(NumProp.collectNibs(reply, 4));
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
            this.owner.commander.send(new PanTiltCmd(this.owner));
        };
        Pan.prototype.inform = function (reply) {
            this.setState(NumProp.collectNibs(reply, 4));
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
            this.owner.commander.send(new PanTiltCmd(this.owner));
        };
        Tilt.prototype.inform = function (reply) {
            var state = NumProp.collectNibs(reply, 4, 6);
            this.setState(state);
        };
        Tilt.propName = "tilt";
        return Tilt;
    }(NumProp));
    var PanSpeed = (function (_super) {
        __extends(PanSpeed, _super);
        function PanSpeed(owner) {
            return _super.call(this, owner, PanSpeed.propName, 24, 1, 24) || this;
        }
        PanSpeed.propName = "panSpeed";
        return PanSpeed;
    }(NumProp));
    var TiltSpeed = (function (_super) {
        __extends(TiltSpeed, _super);
        function TiltSpeed(owner) {
            return _super.call(this, owner, TiltSpeed.propName, 24, 1, 20) || this;
        }
        TiltSpeed.propName = "tiltSpeed";
        return TiltSpeed;
    }(NumProp));
});
