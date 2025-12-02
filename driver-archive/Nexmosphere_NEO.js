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
define(["require", "exports", "system_lib/Metadata", "./NexmosphereBase", "system_lib/ScriptBase"], function (require, exports, Metadata_1, NexmosphereBase_1, ScriptBase_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Nexmosphere_NEO = void 0;
    var kNumInterfaces = 4;
    var kNumOutputs = 4;
    var Nexmosphere_NEO = (function (_super) {
        __extends(Nexmosphere_NEO, _super);
        function Nexmosphere_NEO(port) {
            var _this = _super.call(this, port, kNumInterfaces) || this;
            _this.handlers = {
                'OUTPUT': function (s) {
                    (0, NexmosphereBase_1.log)('handle OUTPUT', s);
                    var ix = "OUTPUT".length;
                    var numChar = s.charAt(ix);
                    var num = parseInt(numChar, 10);
                    if (num != num || num < 1 || num > kNumOutputs) {
                        console.warn('Unexpected number after OUTPUT:', numChar);
                        return;
                    }
                    var data = s.slice(ix + 1);
                    var key = "output".concat(num);
                    _this.messageRouter(key, data);
                },
                'TIME': function (s) { (0, NexmosphereBase_1.log)('handle TIME=', s); },
                'FWVERSION=': function (s) { (0, NexmosphereBase_1.log)('FWVERSION=', s); },
                'WATCHDOG': function (s) { (0, NexmosphereBase_1.log)('WATCHDOG', s); },
                'DEVICE': function (s) { (0, NexmosphereBase_1.log)('DEVICEUSAGE=', s); },
                'INPUT': function (s) {
                    (0, NexmosphereBase_1.log)('handle INPUT=', s);
                    _this.messageRouter('input', s);
                },
                'SCHED': function (s) { (0, NexmosphereBase_1.log)('SCHED', s); },
                'RUNTIME': function (s) { (0, NexmosphereBase_1.log)('RUNTIME', s); },
                'OPERATIONTIME': function (s) { (0, NexmosphereBase_1.log)('OPERATIONTIME', s); },
                'MODEL': function (s) {
                    (0, NexmosphereBase_1.log)('MODEL', s);
                    if (_this.outstandingModelQuery) {
                        try {
                            _this.outstandingModelQuery.cancel();
                        }
                        catch (_) { }
                        _this.outstandingModelQuery = undefined;
                    }
                    var command = s.split('=')[1];
                    for (var key in _this.modelHandlers) {
                        if (key === command) {
                            _this.modelHandlers[key]();
                            return;
                        }
                    }
                }
            };
            _this.modelHandlers = {
                'NEO320': function () {
                    (0, NexmosphereBase_1.log)('handle NEO320');
                    _this.setupOutputs(2);
                },
                'NEO520': function () {
                    (0, NexmosphereBase_1.log)('handle NEO520');
                    _this.setupOutputs(2);
                },
                'NEO620': function () {
                    (0, NexmosphereBase_1.log)('handle NEO620');
                    _this.setupOutputs(2);
                    _this.neo['sensmi'] = new NeoSensmi(_this);
                },
                'NEO340': function () {
                    (0, NexmosphereBase_1.log)('handle NEO340');
                    _this.setupOutputs(4);
                },
                'NEO540': function () {
                    (0, NexmosphereBase_1.log)('handle NEO540');
                    _this.setupOutputs(4);
                },
                'NEO640': function () {
                    (0, NexmosphereBase_1.log)('handle NEO640');
                    _this.setupOutputs(4);
                    _this.neo['sensmi'] = new NeoSensmi(_this);
                },
            };
            _this.initConnection(port);
            _this.neo = _this.namedAggregateProperty("neo", NeoOutput || NeoDevice || NeoRuntime || NeoDiagnostic || NeoSoftfuse || NeoWatchdog || NeoSchedule || NeoPwrXtalk || NeoSensmi);
            _this.initNeo();
            return _this;
        }
        Nexmosphere_NEO.prototype.initNeo = function () {
            var _this = this;
            this.setTime();
            if (this.port.enabled) {
                this.send("P000B[MODEL?]");
                if (this.outstandingModelQuery) {
                    try {
                        this.outstandingModelQuery.cancel();
                    }
                    catch (_) { }
                    this.outstandingModelQuery = undefined;
                }
                this.outstandingModelQuery = wait(500);
                this.outstandingModelQuery
                    .then(function () {
                    (0, NexmosphereBase_1.log)("Model query timed out, setting up default outputs");
                    _this.handleControllerMessage("MODEL=NEO640");
                }).catch(function () {
                });
                this.neo['input'] = new NeoDevice(this);
            }
        };
        Nexmosphere_NEO.prototype.considerConnected = function () {
            return this.port.connected;
        };
        Nexmosphere_NEO.prototype.setupOutputs = function (noOutputs) {
            for (var i = 0; i < noOutputs; i++) {
                this.neo["output".concat(i + 1)] = new NeoOutput(this, i + 1);
            }
        };
        Nexmosphere_NEO.prototype.setTime = function (now) {
            if (!now)
                now = new Date();
            var timeStr = (0, NexmosphereBase_1.padVal)(now.getHours(), 2) + "." +
                (0, NexmosphereBase_1.padVal)(now.getMinutes(), 2) + "." +
                (0, NexmosphereBase_1.padVal)(now.getSeconds(), 2) + "-" +
                (0, NexmosphereBase_1.padVal)(now.getDate(), 2) + "/" +
                (0, NexmosphereBase_1.padVal)((now.getMonth() + 1), 2) + "/" +
                (0, NexmosphereBase_1.padVal)(now.getFullYear(), 4);
            (0, NexmosphereBase_1.log)("Setting Neo time to servertime:", timeStr);
            this.send("S000B[TIME=" + timeStr + "]");
        };
        Nexmosphere_NEO.prototype.handleControllerMessage = function (str) {
            for (var key in this.handlers) {
                if (str.indexOf(key) === 0) {
                    this.handlers[key](str);
                    return;
                }
            }
        };
        Nexmosphere_NEO.prototype.messageRouter = function (key, data) {
            var neoEntry = this.neo[key];
            if (neoEntry) {
                neoEntry.recieveData(data);
            }
            else {
                console.warn("No Neo output registered for", key);
            }
        };
        Nexmosphere_NEO.prototype.setContOutputMetrix = function (timeInSeconds) {
            if (timeInSeconds === void 0) { timeInSeconds = 0; }
            if (timeInSeconds > 0) {
                this.send("P000B[AUTOSEND=OUTPUTS:ALL:" + (0, NexmosphereBase_1.padVal)(timeInSeconds, 4) + "]");
            }
            else {
                this.send("P000B[AUTOSEND=OUTPUTS:ALL:OFF]");
            }
        };
        Nexmosphere_NEO.prototype.setContInputMetrix = function (timeInSeconds) {
            if (timeInSeconds === void 0) { timeInSeconds = 0; }
            if (timeInSeconds > 0) {
                this.send("P000B[AUTOSEND=INPUT:ALL:" + (0, NexmosphereBase_1.padVal)(timeInSeconds, 4) + "]");
            }
            else {
                this.send("P000B[AUTOSEND=INPUT:ALL:OFF]");
            }
        };
        __decorate([
            (0, Metadata_1.callable)("Enable continious updates of output metrics"),
            __param(0, (0, Metadata_1.parameter)("Enable continious update at interval 0 or no value for off", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], Nexmosphere_NEO.prototype, "setContOutputMetrix", null);
        __decorate([
            (0, Metadata_1.callable)("Enable continious updates of input metrics"),
            __param(0, (0, Metadata_1.parameter)("Enable continious update at interval 0 or no value for off", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], Nexmosphere_NEO.prototype, "setContInputMetrix", null);
        Nexmosphere_NEO = __decorate([
            (0, Metadata_1.driver)('NetworkTCP', { port: 4001 }),
            (0, Metadata_1.driver)('SerialPort', { baudRate: 115200 }),
            __metadata("design:paramtypes", [Object])
        ], Nexmosphere_NEO);
        return Nexmosphere_NEO;
    }(NexmosphereBase_1.NexmosphereBase));
    exports.Nexmosphere_NEO = Nexmosphere_NEO;
    var NeoBaseClass = (function (_super) {
        __extends(NeoBaseClass, _super);
        function NeoBaseClass(driver, ix) {
            var _this = _super.call(this) || this;
            _this.index = 0;
            _this.handlers = {};
            _this.driver = driver;
            if (ix !== undefined)
                _this.index = ix;
            return _this;
        }
        NeoBaseClass.prototype.sendData = function (data) {
            this.driver.send(data);
        };
        NeoBaseClass.prototype.recieveData = function (str) {
            (0, NexmosphereBase_1.log)("Data received in NeoBaseClass reviceData:", str);
            var keyValuePair = str.split("=");
            var keyInStr = keyValuePair[0] || "EMPTY";
            (0, NexmosphereBase_1.log)("Parsed key:", keyInStr);
            var value = keyValuePair[1];
            for (var key in this.handlers) {
                if (keyInStr.indexOf(key) === 0) {
                    this.handlers[keyInStr](value);
                    return;
                }
            }
            console.warn("No matching output handler for:", str);
        };
        return NeoBaseClass;
    }(ScriptBase_1.AggregateElem));
    var NeoDevice = (function (_super) {
        __extends(NeoDevice, _super);
        function NeoDevice(owner, ix) {
            var _this = _super.call(this, owner, ix) || this;
            _this._voltage = 0;
            _this._current = 0;
            _this._power = 0;
            _this._usage = 0;
            _this.handlers = {
                'INPUTCURRENT': function (s) {
                    (0, NexmosphereBase_1.log)('handle INPUTCURRENT=', s);
                    _this.inputCurrent = parseFloat(s.replace(",", "."));
                },
                'INPUTVOLTAGE': function (s) {
                    (0, NexmosphereBase_1.log)('handle INPUTVOLTAGE=', s);
                    _this.inputVoltage = parseFloat(s.replace(",", "."));
                },
                'INPUTPOWER': function (s) {
                    (0, NexmosphereBase_1.log)('handle INPUTPOWER=', s);
                    _this.inputPower = parseFloat(s.replace(",", "."));
                },
                'INPUTUSAGE': function (s) {
                    (0, NexmosphereBase_1.log)('handle INPUTUSAGE=', s);
                    _this.inputUsage = parseFloat(s.replace(",", "."));
                }
            };
            return _this;
        }
        NeoDevice.prototype.updateInputMeasurements = function () {
            this.sendData("P000B[INPUTVOLTAGE?]");
            this.sendData("P000B[INPUTCURRENT?]");
            this.sendData("P000B[INPUTPOWER?]");
            this.sendData("P000B[INPUTUSAGE?]");
        };
        NeoDevice.prototype.resetInputUsage = function () {
            this.sendData("P000B[INPUT=USAGERESET]");
        };
        Object.defineProperty(NeoDevice.prototype, "inputVoltage", {
            get: function () { return this._voltage; },
            set: function (value) {
                if (value != this._voltage)
                    this._voltage = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(NeoDevice.prototype, "inputCurrent", {
            get: function () { return this._current; },
            set: function (value) {
                (0, NexmosphereBase_1.log)("Setting input current to:", value);
                if (value != this._current)
                    this._current = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(NeoDevice.prototype, "inputPower", {
            get: function () { return this._power; },
            set: function (value) {
                if (value != this._power)
                    this._power = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(NeoDevice.prototype, "inputUsage", {
            get: function () { return this._power; },
            set: function (value) {
                if (value != this._usage)
                    this._usage = value;
            },
            enumerable: false,
            configurable: true
        });
        __decorate([
            (0, Metadata_1.callable)("Update input measurements"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], NeoDevice.prototype, "updateInputMeasurements", null);
        __decorate([
            (0, Metadata_1.callable)("Reset input usage to zero"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], NeoDevice.prototype, "resetInputUsage", null);
        __decorate([
            (0, Metadata_1.property)("Input Voltage", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], NeoDevice.prototype, "inputVoltage", null);
        __decorate([
            (0, Metadata_1.property)("Input Current", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], NeoDevice.prototype, "inputCurrent", null);
        __decorate([
            (0, Metadata_1.property)("Input Power", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], NeoDevice.prototype, "inputPower", null);
        __decorate([
            (0, Metadata_1.property)("Input Energy Usage", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], NeoDevice.prototype, "inputUsage", null);
        return NeoDevice;
    }(NeoBaseClass));
    var NeoRuntime = (function (_super) {
        __extends(NeoRuntime, _super);
        function NeoRuntime() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return NeoRuntime;
    }(NeoBaseClass));
    var NeoDiagnostic = (function (_super) {
        __extends(NeoDiagnostic, _super);
        function NeoDiagnostic() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return NeoDiagnostic;
    }(NeoBaseClass));
    var NeoSoftfuse = (function (_super) {
        __extends(NeoSoftfuse, _super);
        function NeoSoftfuse() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return NeoSoftfuse;
    }(NeoBaseClass));
    var NeoWatchdog = (function (_super) {
        __extends(NeoWatchdog, _super);
        function NeoWatchdog() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return NeoWatchdog;
    }(NeoBaseClass));
    var NeoSchedule = (function (_super) {
        __extends(NeoSchedule, _super);
        function NeoSchedule() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return NeoSchedule;
    }(NeoBaseClass));
    var NeoPwrXtalk = (function (_super) {
        __extends(NeoPwrXtalk, _super);
        function NeoPwrXtalk() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return NeoPwrXtalk;
    }(NeoBaseClass));
    var NeoSensmi = (function (_super) {
        __extends(NeoSensmi, _super);
        function NeoSensmi() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        NeoSensmi.prototype.configureSensmi = function (deviceName, cuid, country, area, city) {
            this.sendData("SENSMI[PROV=ON]");
            this.sendData("SENSMI[DEVICENAME=" + deviceName + "]");
            this.sendData("SENSMI[CUID=" + cuid + "]");
            if (country)
                this.sendData("SENSMI[COUNTRY=" + country + "]");
            if (area)
                this.sendData("SENSMI[AREA=" + area + "]");
            if (city)
                this.sendData("SENSMI[CITY=" + city + "]");
            this.sendData("SENSMI[PROV=SAVE]");
            this.sendData("SENSMI[PROV=OFF]");
        };
        __decorate([
            (0, Metadata_1.callable)("Configure SensMI connection"),
            __param(0, (0, Metadata_1.parameter)("Device Name")),
            __param(1, (0, Metadata_1.parameter)("CUID, customer user id")),
            __param(2, (0, Metadata_1.parameter)("Country", true)),
            __param(3, (0, Metadata_1.parameter)("Area", true)),
            __param(4, (0, Metadata_1.parameter)("City", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, String, String, String]),
            __metadata("design:returntype", void 0)
        ], NeoSensmi.prototype, "configureSensmi", null);
        return NeoSensmi;
    }(NeoBaseClass));
    var NeoOutput = (function (_super) {
        __extends(NeoOutput, _super);
        function NeoOutput(owner, ix) {
            var _this = _super.call(this, owner, ix) || this;
            _this.mIx = 0;
            _this.mRelay = true;
            _this.mCurrent = 0;
            _this.mPower = 0;
            _this.mUsage = 0;
            _this.mVoltage = 0;
            _this.handlers = {
                'EMPTY': function (s) {
                    (0, NexmosphereBase_1.log)('handle status (EMPTY)', s);
                    _this.mRelay = s === "ON";
                    _this.changed("relay");
                },
                'USAGE': function (s) {
                    (0, NexmosphereBase_1.log)('handle USAGE', s);
                    _this.usage = parseFloat(s.replace(",", "."));
                },
                'POWER': function (s) {
                    (0, NexmosphereBase_1.log)('handle POWER', s);
                    _this.power = parseFloat(s.replace(",", "."));
                },
                'CURRENT': function (s) {
                    (0, NexmosphereBase_1.log)('handle CURRENT', s);
                    _this.current = parseFloat(s.replace(",", "."));
                },
                'VOLTAGE': function (s) {
                    (0, NexmosphereBase_1.log)('handle VOLTAGE', s);
                    _this.voltage = parseFloat(s.replace(",", "."));
                }
            };
            _this.mIx = ix;
            _this.owner = owner;
            return _this;
        }
        Object.defineProperty(NeoOutput.prototype, "relay", {
            get: function () { return this.mRelay; },
            set: function (value) {
                if (this.mRelay === value)
                    return;
                this.mRelay = value;
                this.owner.send("P000B[OUTPUT" + +this.mIx + "=" + (value ? "ON" : "OFF") + "]");
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(NeoOutput.prototype, "voltage", {
            get: function () { return this.mVoltage; },
            set: function (value) {
                if (value != this.mVoltage)
                    this.mVoltage = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(NeoOutput.prototype, "current", {
            get: function () { return this.mCurrent; },
            set: function (value) {
                if (value != this.mCurrent)
                    this.mCurrent = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(NeoOutput.prototype, "power", {
            get: function () { return this.mPower; },
            set: function (value) {
                if (value != this.mPower)
                    this.mPower = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(NeoOutput.prototype, "usage", {
            get: function () { return this.mUsage; },
            set: function (value) {
                if (value != this.mUsage)
                    this.mUsage = value;
            },
            enumerable: false,
            configurable: true
        });
        NeoOutput.prototype.resetUsage = function () {
            this.usage = 0;
            this.sendData("P000B[OUTPUT" + this.mIx + "USAGERESET]");
        };
        NeoOutput.prototype.updateMetrics = function () {
            this.sendData("P000B[OUTPUT" + this.mIx + "CURRENT?]");
            this.sendData("P000B[OUTPUT" + this.mIx + "POWER?]");
            this.sendData("P000B[OUTPUT" + this.mIx + "USAGE?]");
            this.sendData("P000B[OUTPUT" + this.mIx + "VOLTAGE?]");
        };
        __decorate([
            (0, Metadata_1.property)("Output relay", false),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], NeoOutput.prototype, "relay", null);
        __decorate([
            (0, Metadata_1.property)("Output voltage", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], NeoOutput.prototype, "voltage", null);
        __decorate([
            (0, Metadata_1.property)("Output current", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], NeoOutput.prototype, "current", null);
        __decorate([
            (0, Metadata_1.property)("Output power", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], NeoOutput.prototype, "power", null);
        __decorate([
            (0, Metadata_1.property)("Output energy usage", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], NeoOutput.prototype, "usage", null);
        __decorate([
            (0, Metadata_1.callable)("Reset energy usage to zero"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], NeoOutput.prototype, "resetUsage", null);
        __decorate([
            (0, Metadata_1.callable)("Update output metrics properties"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], NeoOutput.prototype, "updateMetrics", null);
        return NeoOutput;
    }(NeoBaseClass));
});
