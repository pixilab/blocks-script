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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata", "../system_lib/ScriptBase"], function (require, exports, Driver_1, Metadata_1, ScriptBase_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Nexmosphere = void 0;
    var kRfidPacketParser = /^XR\[P(.)(\d+)]$/;
    var kPortPacketParser = /^X(\d+)([AB])\[(.+)]$/;
    var kProductCodeParser = /D(\d+)B\[\w+=(.+)]$/;
    var Nexmosphere = exports.Nexmosphere = (function (_super) {
        __extends(Nexmosphere, _super);
        function Nexmosphere(connection) {
            var _this = _super.call(this, connection) || this;
            _this.connection = connection;
            _this.specifiedInterfaces = [];
            _this.pollEnabled = true;
            _this.numInterfaces = 8;
            _this.pollIndex = 0;
            _this.awake = false;
            _this.element = _this.namedAggregateProperty("element", BaseInterface);
            _this.interface = [];
            if (connection.options) {
                var options = JSON.parse(connection.options);
                if (typeof options === "number") {
                    _this.numInterfaces = options;
                    _this.pollEnabled = true;
                }
                if (typeof options === "object") {
                    _this.specifiedInterfaces = options;
                    _this.pollEnabled = false;
                    for (var _i = 0, _a = _this.specifiedInterfaces; _i < _a.length; _i++) {
                        var iface = _a[_i];
                        log("Specified interfaces", iface.ifaceNo, iface.modelCode, iface.name);
                        _this.addInterface(iface.ifaceNo, iface.modelCode, iface.name);
                    }
                }
            }
            connection.autoConnect();
            connection.subscribe('textReceived', function (sender, message) {
                if (message.text) {
                    if (_this.awake)
                        _this.handleMessage(message.text);
                    else {
                        _this.awake = true;
                        _this.pollIndex = 0;
                    }
                }
            });
            connection.subscribe('connect', function (sender, message) {
                if (message.type === 'Connection' && connection.connected) {
                    log("Connected", _this.pollEnabled);
                    if (!_this.pollIndex && _this.pollEnabled)
                        _this.pollNext();
                }
                else {
                    log("Disconnected");
                    if (!_this.interface.length)
                        _this.pollIndex = 0;
                }
            });
            return _this;
        }
        Nexmosphere_1 = Nexmosphere;
        Nexmosphere.registerInterface = function (ctor) {
            var modelName = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                modelName[_i - 1] = arguments[_i];
            }
            if (!Nexmosphere_1.interfaceRegistry)
                Nexmosphere_1.interfaceRegistry = {};
            modelName.forEach(function (name) {
                Nexmosphere_1.interfaceRegistry[name] = ctor;
            });
        };
        Nexmosphere.prototype.pollNext = function () {
            var _this = this;
            var ix = this.pollIndex + 1 | 0;
            if (ix % 10 === 9) {
                var tens = Math.round(ix / 10);
                if (ix < 200) {
                    switch (tens) {
                        case 0:
                            ix = 111;
                            break;
                        case 11:
                        case 12:
                        case 13:
                        case 14:
                        case 15:
                            ix += 2;
                            break;
                        case 16:
                            ix = 211;
                            break;
                    }
                }
                else {
                    switch (tens % 10) {
                        case 1:
                        case 2:
                        case 3:
                        case 4:
                            ix += 2;
                            break;
                        case 5:
                            if (ix >= 959)
                                throw "Port number is out of range for the device.";
                            ix += 311 - 259;
                            break;
                    }
                }
            }
            this.pollIndex = ix;
            this.queryPortConfig(ix);
            var pollAgain = false;
            if (this.pollIndex < this.numInterfaces)
                pollAgain = true;
            else if (!this.interface.length) {
                this.pollIndex = 0;
                pollAgain = true;
            }
            if (pollAgain && this.connection.connected)
                wait(500).then(function () { return _this.pollNext(); });
        };
        Nexmosphere.prototype.queryPortConfig = function (portNumber) {
            var sensorMessage = (("000" + portNumber).slice(-3));
            sensorMessage = "D" + sensorMessage + "B[TYPE]";
            log("QQuery", sensorMessage);
            this.send(sensorMessage);
        };
        Nexmosphere.prototype.send = function (rawData) {
            this.connection.sendText(rawData, "\r\n");
        };
        Nexmosphere.prototype.reInitialize = function () {
            _super.prototype.reInitialize.call(this);
        };
        Nexmosphere.prototype.handleMessage = function (msg) {
            log("Data from device", msg);
            var parseResult = kRfidPacketParser.exec(msg);
            if (parseResult) {
                this.lastTag = {
                    isPlaced: parseResult[1] === 'B',
                    tagNumber: parseInt(parseResult[2])
                };
            }
            else if ((parseResult = kPortPacketParser.exec(msg))) {
                var portNumber = parseInt(parseResult[1]);
                var dataRecieved = parseResult[3];
                log("Incoming data from port", portNumber, "Data", dataRecieved);
                var index = portNumber - 1;
                var interfacePort = this.interface[index];
                if (interfacePort)
                    interfacePort.receiveData(dataRecieved, this.lastTag);
                else
                    console.warn("Message from unexpected port", portNumber);
            }
            else if ((parseResult = kProductCodeParser.exec(msg))) {
                log("QReply", msg);
                var modelInfo = {
                    modelCode: parseResult[2].trim()
                };
                var portNumber = (parseResult[1]);
                this.addInterface(parseInt(portNumber), modelInfo.modelCode);
            }
            else {
                console.warn("Unknown command received from controller", msg);
            }
        };
        Nexmosphere.prototype.addInterface = function (portNumber, modelCode, name) {
            var ix = portNumber - 1;
            var ctor = Nexmosphere_1.interfaceRegistry[modelCode];
            if (!ctor) {
                console.warn("Unknown interface model - using generic 'unknown' type", modelCode);
                ctor = UnknownInterface;
            }
            var iface = new ctor(this, ix);
            var ifaceName = name;
            if (!ifaceName) {
                ifaceName = iface.userFriendlyName();
                if (!(iface instanceof UnknownInterface))
                    ifaceName = ifaceName + '_' + modelCode;
                ifaceName = ifaceName + '_' + portNumber;
            }
            this.interface[ix] = this.element[ifaceName] = iface;
        };
        var Nexmosphere_1;
        __decorate([
            (0, Metadata_1.callable)("Send raw string data to the Nexmosphere controller"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], Nexmosphere.prototype, "send", null);
        __decorate([
            (0, Metadata_1.callable)("Re-initialize driver, after changing device configuration"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], Nexmosphere.prototype, "reInitialize", null);
        Nexmosphere = Nexmosphere_1 = __decorate([
            (0, Metadata_1.driver)('NetworkTCP', { port: 4001 }),
            (0, Metadata_1.driver)('SerialPort', { baudRate: 115200 }),
            __metadata("design:paramtypes", [Object])
        ], Nexmosphere);
        return Nexmosphere;
    }(Driver_1.Driver));
    var BaseInterface = (function (_super) {
        __extends(BaseInterface, _super);
        function BaseInterface(driver, index) {
            var _this = _super.call(this) || this;
            _this.driver = driver;
            _this.index = index;
            return _this;
        }
        BaseInterface.prototype.receiveData = function (data, tag) {
            console.log("Unexpected data recieved on interface " + this.index + " " + data);
        };
        BaseInterface.prototype.userFriendlyName = function () {
            return "Unknown";
        };
        return BaseInterface;
    }(ScriptBase_1.AggregateElem));
    var UnknownInterface = (function (_super) {
        __extends(UnknownInterface, _super);
        function UnknownInterface() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(UnknownInterface.prototype, "unknown", {
            get: function () {
                return this.propValue;
            },
            set: function (value) {
                this.propValue = value;
            },
            enumerable: false,
            configurable: true
        });
        UnknownInterface.prototype.receiveData = function (data) {
            this.unknown = data;
        };
        __decorate([
            (0, Metadata_1.property)("Raw data last received from unknown device type", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], UnknownInterface.prototype, "unknown", null);
        return UnknownInterface;
    }(BaseInterface));
    var RfidInterface = (function (_super) {
        __extends(RfidInterface, _super);
        function RfidInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mTagNumber = 0;
            _this.mIsPlaced = false;
            return _this;
        }
        Object.defineProperty(RfidInterface.prototype, "tagNumber", {
            get: function () {
                return this.mTagNumber;
            },
            set: function (value) {
                this.mTagNumber = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(RfidInterface.prototype, "isPlaced", {
            get: function () { return this.mIsPlaced; },
            set: function (value) { this.mIsPlaced = value; },
            enumerable: false,
            configurable: true
        });
        RfidInterface.prototype.receiveData = function (data, tag) {
            this.isPlaced = tag.isPlaced;
            this.tagNumber = tag.tagNumber;
        };
        RfidInterface.prototype.userFriendlyName = function () {
            return "RFID";
        };
        __decorate([
            (0, Metadata_1.property)("Last recieved RFID tag ID", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], RfidInterface.prototype, "tagNumber", null);
        __decorate([
            (0, Metadata_1.property)("RFID tag is detected", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], RfidInterface.prototype, "isPlaced", null);
        return RfidInterface;
    }(BaseInterface));
    Nexmosphere.registerInterface(RfidInterface, "XRDR1");
    var NfcInterface = (function (_super) {
        __extends(NfcInterface, _super);
        function NfcInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.lastTagEvent = "";
            _this.mTagUID = "";
            _this.mIsPlaced = false;
            return _this;
        }
        Object.defineProperty(NfcInterface.prototype, "tagUID", {
            get: function () { return this.mTagUID; },
            set: function (value) { this.mTagUID = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(NfcInterface.prototype, "isPlaced", {
            get: function () { return this.mIsPlaced; },
            set: function (value) { this.mIsPlaced = value; },
            enumerable: false,
            configurable: true
        });
        NfcInterface.prototype.receiveData = function (data) {
            console.log(data);
            var splitData = data.split(":");
            var newTagData = splitData[1];
            var newTagEvent = splitData[0];
            this.lastTagEvent = newTagEvent;
            switch (newTagEvent) {
                case "TD=UID":
                    this.isPlaced = true;
                    this.tagUID = newTagData;
                    break;
                case "TR=UID":
                    this.isPlaced = false;
                    break;
                default:
                    _super.prototype.receiveData.call(this, data);
                    break;
            }
        };
        NfcInterface.prototype.userFriendlyName = function () {
            return "NFC";
        };
        __decorate([
            (0, Metadata_1.property)("Last recieved tag UID", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], NfcInterface.prototype, "tagUID", null);
        __decorate([
            (0, Metadata_1.property)("A tag is placed", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], NfcInterface.prototype, "isPlaced", null);
        return NfcInterface;
    }(BaseInterface));
    Nexmosphere.registerInterface(NfcInterface, "XRDW2");
    var XWaveLedInterface = (function (_super) {
        __extends(XWaveLedInterface, _super);
        function XWaveLedInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mX_Wave_Command = "";
            return _this;
        }
        Object.defineProperty(XWaveLedInterface.prototype, "X_Wave_Command", {
            get: function () { return this.mX_Wave_Command; },
            set: function (value) {
                this.sendData(value);
                this.mX_Wave_Command = value;
            },
            enumerable: false,
            configurable: true
        });
        XWaveLedInterface.prototype.sendData = function (data) {
            var myIfaceNo = (("000" + (this.index + 1)).slice(-3));
            var message = "X" + myIfaceNo + "B[" + data + "]";
            this.driver.send(message);
        };
        XWaveLedInterface.prototype.userFriendlyName = function () {
            return "LED";
        };
        __decorate([
            (0, Metadata_1.property)("Command sent"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], XWaveLedInterface.prototype, "X_Wave_Command", null);
        return XWaveLedInterface;
    }(BaseInterface));
    Nexmosphere.registerInterface(XWaveLedInterface, "XWC56", "XWL56");
    var ProximityInterface = (function (_super) {
        __extends(ProximityInterface, _super);
        function ProximityInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mProximity = 0;
            return _this;
        }
        Object.defineProperty(ProximityInterface.prototype, "proximity", {
            get: function () { return this.mProximity; },
            set: function (value) { this.mProximity = value; },
            enumerable: false,
            configurable: true
        });
        ProximityInterface.prototype.receiveData = function (data) {
            this.proximity = parseInt(data);
        };
        ProximityInterface.prototype.userFriendlyName = function () {
            return "Prox";
        };
        __decorate([
            (0, Metadata_1.property)("Proximity zone", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], ProximityInterface.prototype, "proximity", null);
        return ProximityInterface;
    }(BaseInterface));
    Nexmosphere.registerInterface(ProximityInterface, "XY116", "XY146", "XY176");
    var TimeOfFlightInterface = (function (_super) {
        __extends(TimeOfFlightInterface, _super);
        function TimeOfFlightInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mTrigger1 = false;
            _this.mTrigger2 = false;
            _this.mTrigger3 = false;
            _this.mTrigger4 = false;
            _this.mTrigger5 = false;
            _this.mTrigger6 = false;
            _this.mTrigger7 = false;
            return _this;
        }
        Object.defineProperty(TimeOfFlightInterface.prototype, "proximity", {
            get: function () { return this.mProximity; },
            set: function (value) { this.mProximity = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "airButton", {
            get: function () { return this.mAirButton; },
            set: function (value) { this.mAirButton = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "rawData", {
            get: function () { return this.mRawData; },
            set: function (value) { this.mRawData = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "triggerOn1", {
            get: function () { return this.mTrigger1; },
            set: function (value) { this.mTrigger1 = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "triggerOn2", {
            get: function () { return this.mTrigger2; },
            set: function (value) { this.mTrigger2 = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "triggerOn3", {
            get: function () { return this.mTrigger3; },
            set: function (value) { this.mTrigger3 = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "triggerOn4", {
            get: function () { return this.mTrigger4; },
            set: function (value) { this.mTrigger4 = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "triggerOn5", {
            get: function () { return this.mTrigger5; },
            set: function (value) { this.mTrigger5 = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "triggerOn6", {
            get: function () { return this.mTrigger6; },
            set: function (value) { this.mTrigger6 = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "triggerOn7", {
            get: function () { return this.mTrigger7; },
            set: function (value) { this.mTrigger7 = value; },
            enumerable: false,
            configurable: true
        });
        TimeOfFlightInterface.prototype.receiveData = function (data) {
            var splitData = data.split("=");
            var sensorValue = splitData[1];
            this.rawData = data;
            switch (sensorValue) {
                case "AB":
                    this.airButton = true;
                    this.proximity = 1;
                    break;
                case "XX":
                    this.airButton = false;
                    this.proximity = 8;
                    break;
                default:
                    var proximity = parseInt(sensorValue);
                    if (!isNaN(proximity)) {
                        this.proximity = parseInt(sensorValue);
                        this.airButton = false;
                    }
                    break;
            }
            this.triggerOn1 = this.proximity <= 1;
            this.triggerOn2 = this.proximity <= 2;
            this.triggerOn3 = this.proximity <= 3;
            this.triggerOn4 = this.proximity <= 4;
            this.triggerOn5 = this.proximity <= 5;
            this.triggerOn6 = this.proximity <= 6;
            this.triggerOn7 = this.proximity <= 7;
        };
        TimeOfFlightInterface.prototype.userFriendlyName = function () {
            return "TOF";
        };
        __decorate([
            (0, Metadata_1.property)("Proximity zone", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], TimeOfFlightInterface.prototype, "proximity", null);
        __decorate([
            (0, Metadata_1.property)("Air Button", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimeOfFlightInterface.prototype, "airButton", null);
        __decorate([
            (0, Metadata_1.property)("Raw data last received", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], TimeOfFlightInterface.prototype, "rawData", null);
        __decorate([
            (0, Metadata_1.property)("Proximity 1 or below", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimeOfFlightInterface.prototype, "triggerOn1", null);
        __decorate([
            (0, Metadata_1.property)("Proximity 2 or below", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimeOfFlightInterface.prototype, "triggerOn2", null);
        __decorate([
            (0, Metadata_1.property)("Proximity 3 or below", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimeOfFlightInterface.prototype, "triggerOn3", null);
        __decorate([
            (0, Metadata_1.property)("Proximity 4 or below", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimeOfFlightInterface.prototype, "triggerOn4", null);
        __decorate([
            (0, Metadata_1.property)("Proximity 5 or below", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimeOfFlightInterface.prototype, "triggerOn5", null);
        __decorate([
            (0, Metadata_1.property)("Proximity 6 or below", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimeOfFlightInterface.prototype, "triggerOn6", null);
        __decorate([
            (0, Metadata_1.property)("Proximity 7 or below", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimeOfFlightInterface.prototype, "triggerOn7", null);
        return TimeOfFlightInterface;
    }(BaseInterface));
    Nexmosphere.registerInterface(TimeOfFlightInterface, "XY241");
    var AirGestureInterface = (function (_super) {
        __extends(AirGestureInterface, _super);
        function AirGestureInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mGesture = "";
            return _this;
        }
        Object.defineProperty(AirGestureInterface.prototype, "gesture", {
            get: function () { return this.mGesture; },
            set: function (value) { this.mGesture = value; },
            enumerable: false,
            configurable: true
        });
        AirGestureInterface.prototype.receiveData = function (data) {
            this.gesture = data;
        };
        AirGestureInterface.prototype.userFriendlyName = function () {
            return "Air";
        };
        __decorate([
            (0, Metadata_1.property)("Gesture detected", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], AirGestureInterface.prototype, "gesture", null);
        return AirGestureInterface;
    }(BaseInterface));
    Nexmosphere.registerInterface(AirGestureInterface, "XTEF650", "XTEF30", "XTEF630", "XTEF680");
    var kButtonDescr = "Button pressed";
    var kLedDescr = "0=off, 1=fast, 2=slow or 3=on";
    var QuadButtonInterface = (function (_super) {
        __extends(QuadButtonInterface, _super);
        function QuadButtonInterface(driver, index) {
            var _this = _super.call(this, driver, index) || this;
            _this.buttons = [];
            for (var ix = 0; ix < QuadButtonInterface.kNumButtons; ++ix)
                _this.buttons.push({ state: false, ledData: 0 });
            return _this;
        }
        Object.defineProperty(QuadButtonInterface.prototype, "button1", {
            get: function () { return this.getBtn(1); },
            set: function (value) { this.setBtn(1, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QuadButtonInterface.prototype, "led1", {
            get: function () { return this.getLed(1); },
            set: function (value) { this.setLed(1, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QuadButtonInterface.prototype, "button2", {
            get: function () { return this.getBtn(2); },
            set: function (value) { this.setBtn(2, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QuadButtonInterface.prototype, "led2", {
            get: function () { return this.getLed(2); },
            set: function (value) { this.setLed(2, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QuadButtonInterface.prototype, "button3", {
            get: function () { return this.getBtn(3); },
            set: function (value) { this.setBtn(3, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QuadButtonInterface.prototype, "led3", {
            get: function () { return this.getLed(3); },
            set: function (value) { this.setLed(3, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QuadButtonInterface.prototype, "button4", {
            get: function () { return this.getBtn(4); },
            set: function (value) { this.setBtn(4, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QuadButtonInterface.prototype, "led4", {
            get: function () { return this.getLed(4); },
            set: function (value) { this.setLed(4, value); },
            enumerable: false,
            configurable: true
        });
        QuadButtonInterface.prototype.getBtn = function (oneBasedIx) {
            return this.buttons[oneBasedIx - 1].state;
        };
        QuadButtonInterface.prototype.setBtn = function (oneBasedIx, state) {
            this.buttons[oneBasedIx - 1].state = state;
        };
        QuadButtonInterface.prototype.getLed = function (oneBasedIx) {
            return this.buttons[oneBasedIx - 1].ledData;
        };
        QuadButtonInterface.prototype.setLed = function (oneBasedIx, state) {
            this.buttons[oneBasedIx - 1].ledData = state & 3;
            this.ledStatusChanged();
        };
        QuadButtonInterface.prototype.receiveData = function (data) {
            var bitMask = parseInt(data);
            bitMask = bitMask >> 1;
            for (var ix = 0; ix < this.buttons.length; ++ix) {
                var isPressed = !!(bitMask & (1 << ix));
                var btn = this.buttons[ix];
                if (btn.state !== isPressed) {
                    btn.state = isPressed;
                    this.changed("button" + (ix + 1));
                }
            }
        };
        QuadButtonInterface.prototype.ledStatusChanged = function () {
            var toSend = 0;
            var buttons = this.buttons;
            for (var ix = 0; ix < buttons.length; ++ix)
                toSend |= buttons[ix].ledData << ix * 2;
            this.sendCmd(toSend.toString());
        };
        QuadButtonInterface.prototype.sendCmd = function (data) {
            var myIfaceNo = (("000" + (this.index + 1)).slice(-3));
            var command = "X" + myIfaceNo + "A[" + data + "]";
            this.driver.send(command);
            console.log(command);
        };
        QuadButtonInterface.prototype.userFriendlyName = function () {
            return "Btn";
        };
        QuadButtonInterface.kNumButtons = 4;
        __decorate([
            (0, Metadata_1.property)(kButtonDescr, true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], QuadButtonInterface.prototype, "button1", null);
        __decorate([
            (0, Metadata_1.property)(kLedDescr),
            (0, Metadata_1.min)(0),
            (0, Metadata_1.max)(3),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], QuadButtonInterface.prototype, "led1", null);
        __decorate([
            (0, Metadata_1.property)(kButtonDescr, true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], QuadButtonInterface.prototype, "button2", null);
        __decorate([
            (0, Metadata_1.property)(kLedDescr),
            (0, Metadata_1.min)(0),
            (0, Metadata_1.max)(3),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], QuadButtonInterface.prototype, "led2", null);
        __decorate([
            (0, Metadata_1.property)(kButtonDescr, true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], QuadButtonInterface.prototype, "button3", null);
        __decorate([
            (0, Metadata_1.property)(kLedDescr),
            (0, Metadata_1.min)(0),
            (0, Metadata_1.max)(3),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], QuadButtonInterface.prototype, "led3", null);
        __decorate([
            (0, Metadata_1.property)(kButtonDescr, true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], QuadButtonInterface.prototype, "button4", null);
        __decorate([
            (0, Metadata_1.property)(kLedDescr),
            (0, Metadata_1.min)(0),
            (0, Metadata_1.max)(3),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], QuadButtonInterface.prototype, "led4", null);
        return QuadButtonInterface;
    }(BaseInterface));
    Nexmosphere.registerInterface(QuadButtonInterface, "XTB4N", "XTB4N6", "XT4FW6");
    var MotionInterface = (function (_super) {
        __extends(MotionInterface, _super);
        function MotionInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mMotion = 0;
            return _this;
        }
        Object.defineProperty(MotionInterface.prototype, "motion", {
            get: function () { return this.mMotion; },
            set: function (value) { this.mMotion = value; },
            enumerable: false,
            configurable: true
        });
        MotionInterface.prototype.receiveData = function (data) {
            this.motion = parseInt(data);
        };
        MotionInterface.prototype.userFriendlyName = function () {
            return "Motion";
        };
        __decorate([
            (0, Metadata_1.property)("Motion detected", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], MotionInterface.prototype, "motion", null);
        return MotionInterface;
    }(BaseInterface));
    Nexmosphere.registerInterface(MotionInterface, "XY320");
    var GenderInterface = (function (_super) {
        __extends(GenderInterface, _super);
        function GenderInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mIsPerson = false;
            _this.mGender = 'U';
            _this.mGenderConfidence = 'X';
            _this.mAge = 0;
            _this.mAgeConfidence = 'X';
            _this.mGaze = 'U';
            return _this;
        }
        Object.defineProperty(GenderInterface.prototype, "isPerson", {
            get: function () { return this.mIsPerson; },
            set: function (value) { this.mIsPerson = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GenderInterface.prototype, "gender", {
            get: function () { return this.mGender; },
            set: function (value) { this.mGender = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GenderInterface.prototype, "genderConfidence", {
            get: function () { return this.mGenderConfidence; },
            set: function (value) { this.mGenderConfidence = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GenderInterface.prototype, "age", {
            get: function () { return this.mAge; },
            set: function (value) { this.mAge = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GenderInterface.prototype, "ageConfidence", {
            get: function () { return this.mAgeConfidence; },
            set: function (value) { this.mAgeConfidence = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GenderInterface.prototype, "gaze", {
            get: function () { return this.mGaze; },
            set: function (value) { this.mGaze = value; },
            enumerable: false,
            configurable: true
        });
        GenderInterface.prototype.receiveData = function (data) {
            var parseResult = GenderInterface.kParser.exec(data);
            if (parseResult) {
                this.isPerson = parseResult[0] === "1";
                this.gender = parseResult[1];
                this.genderConfidence = parseResult[2];
                this.age = parseInt(parseResult[3]);
                this.ageConfidence = parseResult[4];
                this.gaze = parseResult[5];
            }
        };
        GenderInterface.prototype.userFriendlyName = function () {
            return "Gender";
        };
        GenderInterface.kParser = /^(0|1)(M|F|U)(X|L|H)([0-7])(X|L|H)(L|C|R|U)/;
        __decorate([
            (0, Metadata_1.property)("Person detected", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], GenderInterface.prototype, "isPerson", null);
        __decorate([
            (0, Metadata_1.property)("M=Male, F=Female, U=Unidentified", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], GenderInterface.prototype, "gender", null);
        __decorate([
            (0, Metadata_1.property)("X=Very Low, L=Low, H=High", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], GenderInterface.prototype, "genderConfidence", null);
        __decorate([
            (0, Metadata_1.property)("Age range 0...7", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], GenderInterface.prototype, "age", null);
        __decorate([
            (0, Metadata_1.property)("X=Very Low, L=Low, H=High", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], GenderInterface.prototype, "ageConfidence", null);
        __decorate([
            (0, Metadata_1.property)("L=Left, C=Center, R=Right, U=Unidentified", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], GenderInterface.prototype, "gaze", null);
        return GenderInterface;
    }(BaseInterface));
    Nexmosphere.registerInterface(GenderInterface, "XY510", "XY520");
    var DEBUG = false;
    function log() {
        var messages = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            messages[_i] = arguments[_i];
        }
        if (DEBUG)
            console.info(messages);
    }
});
