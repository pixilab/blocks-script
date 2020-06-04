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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.QSYS = void 0;
    var split = require("lib/split-string");
    var Mapping;
    (function (Mapping) {
        Mapping[Mapping["Position"] = 0] = "Position";
        Mapping[Mapping["Value"] = 1] = "Value";
    })(Mapping || (Mapping = {}));
    var QSYS = (function (_super) {
        __extends(QSYS, _super);
        function QSYS(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.controls = [
                { controlName: 'masterGain' },
                { controlName: 'Name with Space', propertyName: 'nameWithSpace' },
                { controlName: 'rawProp', mapping: Mapping.Value },
            ];
            _this.mConnected = false;
            _this.props = {};
            _this.controlToProp = {};
            _this.asFeedback = false;
            for (var _i = 0, _a = _this.controls; _i < _a.length; _i++) {
                var control = _a[_i];
                var prop = {
                    controlName: control.controlName,
                    propertyName: control.propertyName ? control.propertyName : control.controlName,
                    mapping: control.mapping ? control.mapping : Mapping.Position,
                    value: 0
                };
                _this.props[prop.propertyName] = prop;
                _this.controlToProp[prop.controlName] = prop;
            }
            socket.subscribe('connect', function (sender, message) {
                console.info('connect msg', message.type);
                _this.connectStateChanged();
            });
            socket.subscribe('textReceived', function (sender, msg) {
                return _this.textReceived(msg.text);
            });
            socket.autoConnect();
            _this.mConnected = socket.connected;
            if (_this.mConnected)
                _this.setupConnection();
            _this.keepAlive();
            return _this;
        }
        Object.defineProperty(QSYS.prototype, "masterGain", {
            get: function () { return this.propGetter('masterGain'); },
            set: function (val) { this.propSetter('masterGain', val); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QSYS.prototype, "nameWithSpace", {
            get: function () { return this.propGetter('nameWithSpace'); },
            set: function (val) { this.propSetter('nameWithSpace', val); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QSYS.prototype, "rawProp", {
            get: function () { return this.propGetter('rawProp'); },
            set: function (val) { this.propSetter('rawProp', val); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QSYS.prototype, "connected", {
            get: function () {
                return this.mConnected;
            },
            set: function (online) {
                this.mConnected = online;
            },
            enumerable: false,
            configurable: true
        });
        QSYS.prototype.propSetter = function (propertyName, val) {
            var prop = this.props[propertyName];
            if (!prop)
                return;
            if (!this.asFeedback) {
                var command = prop.mapping == Mapping.Position ? "csp" : "csv";
                this.tell(command + ' "' + prop.controlName + '" ' + val);
            }
            prop.value = val;
        };
        QSYS.prototype.propGetter = function (propertyName) {
            return this.props[propertyName].value;
        };
        QSYS.prototype.controlSetPosition = function (id, position) {
            this.tell('csp "' + id + '" ' + position);
        };
        QSYS.prototype.controlSetPositionRamp = function (id, position, rampTime) {
            this.tell('cspr "' + id + '" ' + position + ' ' + rampTime);
        };
        QSYS.prototype.controlSetString = function (id, cString) {
            this.tell('css "' + id + '" "' + cString + '"');
        };
        QSYS.prototype.controlSetValue = function (id, value) {
            this.tell('csv "' + id + '" ' + value);
        };
        QSYS.prototype.controlSetValueRamp = function (id, value, rampTime) {
            this.tell('csvr "' + id + '" ' + value + ' ' + rampTime);
        };
        QSYS.prototype.controlTrigger = function (id) {
            this.tell('ct "' + id + '"');
        };
        QSYS.prototype.snapshotLoad = function (sBank, sNum, rampTime) {
            this.tell('ssl "' + sBank + '" ' + sNum + ' ' + rampTime);
        };
        QSYS.prototype.snapshotSave = function (sBank, sNum) {
            this.tell('sss "' + sBank + '" ' + sNum);
        };
        QSYS.prototype.connectStateChanged = function () {
            console.info("connectStateChanged", this.socket.connected);
            this.connected = this.socket.connected;
            if (this.socket.connected)
                this.setupConnection();
        };
        QSYS.prototype.keepAlive = function () {
            var _this = this;
            this.statusPoller = wait(19 * 1000);
            this.statusPoller.then(function () {
                if (_this.connected)
                    _this.tell("sg");
                _this.keepAlive();
            });
        };
        QSYS.prototype.setupConnection = function () {
            this.tell('cgc 1');
            for (var _i = 0, _a = this.controls; _i < _a.length; _i++) {
                var controlName = _a[_i].controlName;
                this.tell('cga 1 "' + controlName + '"');
            }
            this.tell('cgsna 1 50');
        };
        QSYS.prototype.tell = function (data) {
            this.socket.sendText(data + "\n");
        };
        QSYS.prototype.parseReply = function (reply) {
            var keep = function (value, state) {
                return value !== '\\' && (value !== '"' || state.prev() === '\\');
            };
            return split(reply, { quotes: ['"'], separator: ' ', keep: keep });
        };
        QSYS.prototype.textReceived = function (text) {
            var pieces = this.parseReply(text);
            if (pieces && pieces.length >= 1) {
                var cmd = pieces[0];
                if (cmd === "cv") {
                    var prop = this.controlToProp[pieces[1]];
                    if (!prop) {
                        console.warn('Received cv for unknown property ' + pieces[1]);
                        return;
                    }
                    var value = prop.mapping == Mapping.Value ? pieces[3] : pieces[4];
                    this.asFeedback = true;
                    this[prop.propertyName] = parseFloat(value);
                    this.asFeedback = false;
                }
                else if (cmd === "cmv" || cmd === "cmvv" || cmd === "cvv") {
                }
                else if (cmd === "sr" || cmd === "cgpa" || cmd === "login_success") {
                }
                else if (cmd === "cro" ||
                    cmd === "core_not_active" ||
                    cmd === "bad_change_group_handle" ||
                    cmd === "bad_command" ||
                    cmd === "bad_id" ||
                    cmd === "login_failed" ||
                    cmd === "login_required" ||
                    cmd === "too_many_change_groups") {
                    console.warn("Received error", text);
                }
                else {
                    console.warn("Unknown response from device", text);
                }
            }
            else
                console.warn("Unparsable reply from device", text);
        };
        __decorate([
            Meta.property("Master Gain"),
            Meta.min(0),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], QSYS.prototype, "masterGain", null);
        __decorate([
            Meta.property("Name with Space"),
            Meta.min(0),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], QSYS.prototype, "nameWithSpace", null);
        __decorate([
            Meta.property("Raw Prop"),
            Meta.min(-100),
            Meta.max(20),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], QSYS.prototype, "rawProp", null);
        __decorate([
            Meta.property("Connected to Q-SYS", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], QSYS.prototype, "connected", null);
        __decorate([
            Meta.callable("Control Set Position"),
            __param(0, Meta.parameter("Control ID")),
            __param(1, Meta.parameter("Control Position")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number]),
            __metadata("design:returntype", void 0)
        ], QSYS.prototype, "controlSetPosition", null);
        __decorate([
            Meta.callable("Control Set Position Ramp"),
            __param(0, Meta.parameter("Control ID")),
            __param(1, Meta.parameter("Control Position")),
            __param(2, Meta.parameter("Ramp time")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, Number]),
            __metadata("design:returntype", void 0)
        ], QSYS.prototype, "controlSetPositionRamp", null);
        __decorate([
            Meta.callable("Control Set String"),
            __param(0, Meta.parameter("Control ID")),
            __param(1, Meta.parameter("Control String")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String]),
            __metadata("design:returntype", void 0)
        ], QSYS.prototype, "controlSetString", null);
        __decorate([
            Meta.callable("Control Set Value"),
            __param(0, Meta.parameter("Control ID")),
            __param(1, Meta.parameter("Control Value")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number]),
            __metadata("design:returntype", void 0)
        ], QSYS.prototype, "controlSetValue", null);
        __decorate([
            Meta.callable("Control Set Value Ramp"),
            __param(0, Meta.parameter("Control ID")),
            __param(1, Meta.parameter("Control Value")),
            __param(2, Meta.parameter("Ramp time")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, Number]),
            __metadata("design:returntype", void 0)
        ], QSYS.prototype, "controlSetValueRamp", null);
        __decorate([
            Meta.callable("Control Trigger"),
            __param(0, Meta.parameter("Control ID")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], QSYS.prototype, "controlTrigger", null);
        __decorate([
            Meta.callable("Snapshot Load"),
            __param(0, Meta.parameter("Snapshot Bank")),
            __param(1, Meta.parameter("Snapshot Number")),
            __param(2, Meta.parameter("Ramp Time")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, Number]),
            __metadata("design:returntype", void 0)
        ], QSYS.prototype, "snapshotLoad", null);
        __decorate([
            Meta.callable("Snapshot Save"),
            __param(0, Meta.parameter("Snapshot Bank")),
            __param(1, Meta.parameter("Snapshot Number")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number]),
            __metadata("design:returntype", void 0)
        ], QSYS.prototype, "snapshotSave", null);
        QSYS = __decorate([
            Meta.driver('NetworkTCP', { port: 1702 }),
            __metadata("design:paramtypes", [Object])
        ], QSYS);
        return QSYS;
    }(Driver_1.Driver));
    exports.QSYS = QSYS;
});
