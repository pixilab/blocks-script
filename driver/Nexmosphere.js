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
    exports.Nexmosphere = void 0;
    var kRfidPacketParser = /^XR\[P(.)(\d+)]$/;
    var kPortPacketParser = /^X(\d+)(A|B)\[(.+)]$/;
    var kProductCodeParser = /D(\d+)B\[\w+\=(.+)]$/;
    var Nexmosphere = (function (_super) {
        __extends(Nexmosphere, _super);
        function Nexmosphere(connection) {
            var _this = _super.call(this, connection) || this;
            _this.connection = connection;
            _this.specifiedInterfaces = [];
            _this.pollEnabled = true;
            _this.numInterfaces = 8;
            _this.pollIndex = 0;
            _this.awake = false;
            _this.interfaces = [];
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
                        _this.addInterface(iface.ifaceNo, iface.modelCode);
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
                    if (!_this.interfaces.length)
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
            else if (!this.interfaces.length) {
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
                var targetElem = this.interfaces[index];
                if (targetElem)
                    targetElem.receiveData(dataRecieved, this.lastTag);
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
            if (ctor)
                this.interfaces[ix] = new ctor(this, ix);
            else {
                console.warn("Unknown interface model - using generic 'unknown' type", modelCode);
                this.interfaces[ix] = new UnknownInterface(this, ix);
            }
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
    exports.Nexmosphere = Nexmosphere;
    var BaseInterface = (function () {
        function BaseInterface(driver, index) {
            this.driver = driver;
            this.index = index;
        }
        BaseInterface.prototype.getNamePrefix = function () {
            return "iface_" + (this.index + 1);
        };
        return BaseInterface;
    }());
    var UnknownInterface = (function (_super) {
        __extends(UnknownInterface, _super);
        function UnknownInterface(driver, index) {
            var _this = _super.call(this, driver, index) || this;
            _this.propName = _this.getNamePrefix() + "_unknown";
            _this.driver.property(_this.propName, {
                type: String,
                description: "Raw data last received from unknown device type",
                readOnly: true
            }, function (setValue) {
                return _this.propValue;
            });
            return _this;
        }
        UnknownInterface.prototype.receiveData = function (data) {
            this.propValue = data;
            this.driver.changed(this.propName);
        };
        return UnknownInterface;
    }(BaseInterface));
    var RfidInterface = (function (_super) {
        __extends(RfidInterface, _super);
        function RfidInterface(driver, index) {
            var _this = _super.call(this, driver, index) || this;
            _this.tagInfo = {
                tagNumber: 0,
                isPlaced: false
            };
            _this.tagPropName = _this.getNamePrefix() + "_tagId";
            _this.driver.property(_this.tagPropName, {
                type: Number,
                description: "Last recieved RFID tag ID",
                readOnly: true
            }, function (setValue) {
                return _this.tagInfo.tagNumber;
            });
            _this.placedPropName = _this.getNamePrefix() + "_tagIsPlaced";
            _this.driver.property(_this.placedPropName, {
                type: Boolean,
                description: "RFID tag is detected",
                readOnly: true
            }, function (setValue) {
                return _this.tagInfo.isPlaced;
            });
            return _this;
        }
        RfidInterface.prototype.receiveData = function (data, tag) {
            var oldInfo = this.tagInfo;
            this.tagInfo = tag;
            if (oldInfo.tagNumber !== tag.tagNumber)
                this.driver.changed(this.tagPropName);
            if (oldInfo.isPlaced !== tag.isPlaced)
                this.driver.changed(this.placedPropName);
        };
        return RfidInterface;
    }(BaseInterface));
    Nexmosphere.registerInterface(RfidInterface, "XRDR1");
    var NfcInterface = (function (_super) {
        __extends(NfcInterface, _super);
        function NfcInterface(driver, index) {
            var _this = _super.call(this, driver, index) || this;
            _this.nfcTagInfo = {
                tagUID: "",
                isPlaced: false,
                tagNumber: 0,
                tagLabel: ""
            };
            _this.lastTagEvent = "";
            _this.uidPropName = _this.getNamePrefix() + "_nfcTagUid";
            _this.driver.property(_this.uidPropName, {
                type: String,
                description: "Last recieved NFC tag UID",
                readOnly: true
            }, function (setValue) {
                return _this.nfcTagInfo.tagUID;
            });
            _this.noPropName = _this.getNamePrefix() + "_nfcTagNo";
            _this.driver.property(_this.noPropName, {
                type: Number,
                description: "NFC tag number",
                readOnly: true
            }, function (setValue) {
                return _this.nfcTagInfo.tagNumber;
            });
            _this.labelPropName = _this.getNamePrefix() + "_nfcLbl";
            _this.driver.property(_this.labelPropName, {
                type: String,
                description: "NFC tag label 1",
                readOnly: true
            }, function (setValue) {
                return _this.nfcTagInfo.tagLabel;
            });
            _this.placedPropName = _this.getNamePrefix() + "_nfcTagIsPlaced";
            _this.driver.property(_this.placedPropName, {
                type: Boolean,
                description: "NFC tag is placed",
                readOnly: true
            }, function (setValue) {
                return _this.nfcTagInfo.isPlaced;
            });
            _this.sendDeviceDefaultSetting();
            return _this;
        }
        NfcInterface.prototype.sendDeviceDefaultSetting = function () {
            var myIfaceNo = (("000" + (this.index + 1)).slice(-3));
            var defaultSetting = "X" + myIfaceNo + "S[10:6]";
            this.driver.send(defaultSetting);
            console.log("NFC default setting sent");
        };
        NfcInterface.prototype.receiveData = function (data) {
            console.log(data);
            var splitData = data.split(":");
            var newTagData = splitData[1];
            var newTagEvent = splitData[0];
            if (this.lastTagEvent === "TD=UID" && newTagEvent === "TR=UID") {
                this.sendDeviceDefaultSetting();
            }
            this.lastTagEvent = newTagEvent;
            switch (newTagEvent) {
                case "TD=UID":
                    this.nfcTagInfo.isPlaced = true;
                    this.nfcTagInfo.tagUID = newTagData;
                    break;
                case "TD=TNR":
                    this.nfcTagInfo.tagNumber = parseInt(newTagData);
                    break;
                case "TD=LB1":
                    this.nfcTagInfo.tagLabel = newTagData;
                    this.driver.changed(this.uidPropName);
                    this.driver.changed(this.labelPropName);
                    this.driver.changed(this.noPropName);
                    this.driver.changed(this.placedPropName);
                    break;
                case "TR=LB1":
                    this.nfcTagInfo.isPlaced = false;
                    this.driver.changed(this.placedPropName);
                    break;
                case "TR=UID":
                case "TR=TNR":
                    break;
                default:
                    console.log("Unrecognised data recieved at " + this.getNamePrefix() + ": " + newTagEvent);
                    break;
            }
        };
        return NfcInterface;
    }(BaseInterface));
    Nexmosphere.registerInterface(NfcInterface, "XRDW2");
    var XWaveLedInterface = (function (_super) {
        __extends(XWaveLedInterface, _super);
        function XWaveLedInterface(driver, index) {
            var _this = _super.call(this, driver, index) || this;
            _this.propName = _this.getNamePrefix() + "_X-Wave_Command";
            _this.driver.property(_this.propName, {
                type: String,
                description: "Command",
                readOnly: false
            }, function (setValue) {
                if (setValue !== undefined) {
                    _this.propValue = setValue;
                    _this.sendData(_this.propValue);
                }
                return _this.propValue;
            });
            return _this;
        }
        XWaveLedInterface.prototype.receiveData = function (data) {
            console.log("Unexpected data recieved on " + this.getNamePrefix() + " " + data);
        };
        XWaveLedInterface.prototype.sendData = function (data) {
            var myIfaceNo = (("000" + (this.index + 1)).slice(-3));
            var message = "X" + myIfaceNo + "B[" + data + "]";
            this.driver.send(message);
        };
        return XWaveLedInterface;
    }(BaseInterface));
    Nexmosphere.registerInterface(XWaveLedInterface, "XWC56", "XWL56");
    var ProximityInterface = (function (_super) {
        __extends(ProximityInterface, _super);
        function ProximityInterface(driver, index) {
            var _this = _super.call(this, driver, index) || this;
            _this.propName = _this.getNamePrefix() + "_proximity";
            _this.driver.property(_this.propName, {
                type: Number,
                description: "Proximity zone",
                readOnly: true
            }, function (setValue) {
                return _this.propValue;
            });
            return _this;
        }
        ProximityInterface.prototype.receiveData = function (data) {
            this.propValue = parseInt(data);
            this.driver.changed(this.propName);
        };
        return ProximityInterface;
    }(BaseInterface));
    Nexmosphere.registerInterface(ProximityInterface, "XY116", "XY146", "XY176");
    var TimeOfFlightInterface = (function (_super) {
        __extends(TimeOfFlightInterface, _super);
        function TimeOfFlightInterface(driver, index) {
            var _this = _super.call(this, driver, index) || this;
            _this.zonePropName = _this.getNamePrefix() + "_time_of_flightproximity";
            _this.buttonPropName = _this.getNamePrefix() + "_air_button";
            _this.zonePropValue = 8;
            _this.btnPropValue = false;
            _this.driver.property(_this.zonePropName, {
                type: Number,
                description: "Proximity zone",
                readOnly: true
            }, function (setValue) {
                return _this.zonePropValue;
            });
            _this.driver.property(_this.buttonPropName, {
                type: Boolean,
                description: "Air Button",
                readOnly: true
            }, function (setValue) {
                return _this.btnPropValue;
            });
            return _this;
        }
        TimeOfFlightInterface.prototype.receiveData = function (data) {
            var splitData = data.split("=");
            var sensorValue = splitData[1];
            switch (sensorValue) {
                case "AB":
                    this.btnPropValue = true;
                    this.driver.changed(this.buttonPropName);
                    break;
                case "XX":
                    if (this.btnPropValue) {
                        this.btnPropValue = false;
                        this.driver.changed(this.buttonPropName);
                    }
                    this.zonePropValue = 8;
                    this.driver.changed(this.zonePropName);
                    break;
                case "01":
                case "02":
                case "03":
                case "04":
                case "05":
                case "06":
                case "07":
                    this.zonePropValue = parseInt(sensorValue);
                    this.driver.changed(this.zonePropName);
                    if (this.btnPropValue) {
                        this.btnPropValue = false;
                        this.driver.changed(this.buttonPropName);
                    }
                    break;
                default:
                    break;
            }
        };
        return TimeOfFlightInterface;
    }(BaseInterface));
    Nexmosphere.registerInterface(TimeOfFlightInterface, "XY241");
    var AirGestureInterface = (function (_super) {
        __extends(AirGestureInterface, _super);
        function AirGestureInterface(driver, index) {
            var _this = _super.call(this, driver, index) || this;
            _this.propName = _this.getNamePrefix() + "_gesture";
            _this.driver.property(_this.propName, {
                type: String,
                description: "Gesture detected",
                readOnly: true
            }, function () { return _this.propValue; });
            return _this;
        }
        AirGestureInterface.prototype.receiveData = function (data) {
            this.propValue = data;
            this.driver.changed(this.propName);
        };
        return AirGestureInterface;
    }(BaseInterface));
    Nexmosphere.registerInterface(AirGestureInterface, "XTEF650", "XTEF30", "XTEF630", "XTEF680");
    var Button = (function () {
        function Button(name, owner, ix, driver) {
            var _this = this;
            this.name = name;
            this.owner = owner;
            this.driver = driver;
            this.ledPropname = name + "_led_cmd";
            this.ledData = 0;
            this.state = false;
            driver.property(this.name, {
                type: Boolean,
                description: this.name + " is pressed",
                readOnly: true
            }, function () { return _this.state; });
            driver.property(this.ledPropname, {
                type: Number,
                description: "0=off, 1=fast, 2=slow or 3=on",
                readOnly: false,
                min: 0,
                max: 3
            }, function (setValue) {
                if (setValue !== undefined) {
                    _this.ledData = setValue & 3;
                    _this.owner.ledStatusChanged();
                }
                return _this.ledData;
            });
        }
        Button.prototype.setState = function (state) {
            var oldState = this.state;
            this.state = state;
            if (state !== oldState)
                this.driver.changed(this.name);
        };
        return Button;
    }());
    var QuadButtonInterface = (function (_super) {
        __extends(QuadButtonInterface, _super);
        function QuadButtonInterface(driver, index) {
            var _this = _super.call(this, driver, index) || this;
            _this.buttons = [];
            for (var ix = 0; ix < 4; ++ix) {
                _this.buttons.push(new Button(_this.getNamePrefix() + "_btn_" + (ix + 1), _this, ix, driver));
            }
            return _this;
        }
        QuadButtonInterface.prototype.receiveData = function (data) {
            var bitMask = parseInt(data);
            bitMask = bitMask >> 1;
            for (var ix = 0; ix < 4; ++ix) {
                var isPressed = !!(bitMask & (1 << ix));
                this.buttons[ix].setState(isPressed);
            }
        };
        QuadButtonInterface.prototype.ledStatusChanged = function () {
            var toSend = 0;
            var buttons = this.buttons;
            for (var ix = 0; ix < buttons.length; ++ix) {
                toSend |= buttons[ix].ledData << ix * 2;
            }
            this.sendCmd(toSend.toString());
        };
        QuadButtonInterface.prototype.sendCmd = function (data) {
            var myIfaceNo = (("000" + (this.index + 1)).slice(-3));
            var command = "X" + myIfaceNo + "A[" + data + "]";
            this.driver.send(command);
            console.log(command);
        };
        return QuadButtonInterface;
    }(BaseInterface));
    Nexmosphere.registerInterface(QuadButtonInterface, "XTB4N", "XTB4N6", "XT4FW6");
    var MotionInterface = (function (_super) {
        __extends(MotionInterface, _super);
        function MotionInterface(driver, index) {
            var _this = _super.call(this, driver, index) || this;
            _this.propName = _this.getNamePrefix() + "_motion";
            _this.driver.property(_this.propName, {
                type: Number,
                description: "Motion detected",
                readOnly: true
            }, function () { return _this.propValue; });
            return _this;
        }
        MotionInterface.prototype.receiveData = function (data) {
            this.propValue = parseInt(data);
            this.driver.changed(this.propName);
        };
        return MotionInterface;
    }(BaseInterface));
    Nexmosphere.registerInterface(MotionInterface, "XY320");
    var GenderSubProperty = (function () {
        function GenderSubProperty(driver, propName, description, type, initialValue) {
            var _this = this;
            this.driver = driver;
            this.propName = propName;
            this.value = initialValue;
            driver.property(propName, {
                type: type,
                description: description,
                readOnly: true
            }, function () { return _this.value; });
        }
        GenderSubProperty.prototype.setValue = function (poteniallyNewValue) {
            var oldValue = this.value;
            this.value = poteniallyNewValue;
            if (oldValue !== poteniallyNewValue)
                this.driver.changed(this.propName);
        };
        return GenderSubProperty;
    }());
    var GenderInterface = (function (_super) {
        __extends(GenderInterface, _super);
        function GenderInterface(driver, index) {
            var _this = _super.call(this, driver, index) || this;
            _this.subProp = [];
            _this.subProp.push(new GenderSubProperty(driver, _this.getNamePrefix() + "_is Person", "Person detected", String, false));
            _this.subProp.push(new GenderSubProperty(driver, _this.getNamePrefix() + "_gender", "Gender; M=Male, F=Female, U=Unidentified", String, 'U'));
            _this.subProp.push(new GenderSubProperty(driver, _this.getNamePrefix() + "_gender_confidence", "Confidence level; X=Very Low, L=Low, H=High", String, 'X'));
            _this.subProp.push(new GenderSubProperty(driver, _this.getNamePrefix() + "_age", "Age range 0...7", Number, 0));
            _this.subProp.push(new GenderSubProperty(driver, _this.getNamePrefix() + "_age_confidence", "Confidence level; X=Very Low, L=Low, H=High", String, 'X'));
            _this.subProp.push(new GenderSubProperty(driver, _this.getNamePrefix() + "_gaze", "Gaze indication L=Left, C=Center, R=Right, U=Unidentified", String, 'U'));
            return _this;
        }
        GenderInterface.prototype.receiveData = function (data) {
            var parseResult = GenderInterface.kParser.exec(data);
            if (parseResult) {
                this.subProp[0].setValue(parseResult[0] === "1");
                this.subProp[1].setValue(parseResult[1]);
                this.subProp[2].setValue(parseResult[2]);
                this.subProp[3].setValue(parseInt(parseResult[3]));
                this.subProp[4].setValue(parseResult[4]);
                this.subProp[5].setValue(parseResult[5]);
            }
        };
        GenderInterface.kParser = /^(0|1)(M|F|U)(X|L|H)([0-7])(X|L|H)(L|C|R|U)/;
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
