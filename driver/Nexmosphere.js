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
    exports.Nexmosphere = void 0;
    var kRfidPacketParser = /^XR\[P(.)(\d+)]$/;
    var kPortPacketParser = /^X(\d+)(A|B)\[(.+)]$/;
    var kProductCodeParser = /D(\d+)B\[\w+\=(.+)]$/;
    var kNumInterfaces = 8;
    var Nexmosphere = (function (_super) {
        __extends(Nexmosphere, _super);
        function Nexmosphere(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.pollIndex = 0;
            _this.awake = false;
            _this.interfaces = [];
            socket.autoConnect();
            socket.subscribe('textReceived', function (sender, message) {
                if (message.text) {
                    if (_this.awake)
                        _this.handleMessage(message.text);
                    else {
                        _this.awake = true;
                        _this.pollIndex = 0;
                    }
                }
            });
            socket.subscribe('connect', function (sender, message) {
                if (message.type === 'Connection' && socket.connected) {
                    if (!_this.pollIndex)
                        _this.pollNext();
                }
                else {
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
            ++this.pollIndex;
            this.queryPortConfig(this.pollIndex);
            var pollAgain = false;
            if (this.pollIndex <= kNumInterfaces)
                pollAgain = true;
            else if (!this.interfaces.length) {
                this.pollIndex = 0;
                pollAgain = true;
            }
            if (pollAgain)
                wait(this.pollIndex > 1 ? 150 : 600).then(function () { return _this.pollNext(); });
        };
        Nexmosphere.prototype.queryPortConfig = function (portNumber) {
            var sensorMessage = (("000" + portNumber).slice(-3));
            this.send("D" + sensorMessage + "B[TYPE]");
        };
        Nexmosphere.prototype.send = function (rawData) {
            this.socket.sendText(rawData, "\r\n");
        };
        Nexmosphere.prototype.reInitialize = function () {
            _super.prototype.reInitialize.call(this);
        };
        Nexmosphere.prototype.handleMessage = function (msg) {
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
                var index = portNumber - 1;
                var targetElem = this.interfaces[index];
                if (targetElem)
                    targetElem.receiveData(dataRecieved, this.lastTag);
                else
                    console.warn("Message from unexpected port", portNumber);
            }
            else if ((parseResult = kProductCodeParser.exec(msg))) {
                var modelInfo = {
                    modelCode: parseResult[2].trim()
                };
                var portNumber = (parseResult[1]);
                var index = parseInt(portNumber) - 1;
                var ctor = Nexmosphere_1.interfaceRegistry[modelInfo.modelCode];
                if (ctor)
                    this.interfaces[index] = new ctor(this, index);
                else {
                    console.warn("Unknown interface model - using generic 'unknown' type", modelInfo.modelCode);
                    this.interfaces[index] = new UnknownInterface(this, index);
                }
            }
            else {
                console.warn("Unknown command received from controller", msg);
            }
        };
        var Nexmosphere_1;
        __decorate([
            Metadata_1.callable("Send raw string data to the Nexmosphere controller"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], Nexmosphere.prototype, "send", null);
        __decorate([
            Metadata_1.callable("Re-initialize driver, after changing device configuration"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], Nexmosphere.prototype, "reInitialize", null);
        Nexmosphere = Nexmosphere_1 = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 4001 }),
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
    var AirGestureInterface = (function (_super) {
        __extends(AirGestureInterface, _super);
        function AirGestureInterface(driver, index) {
            var _this = _super.call(this, driver, index) || this;
            _this.propName = _this.getNamePrefix() + "_touch";
            _this.driver.property(_this.propName, {
                type: String,
                description: "Touch detected",
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
        function Button(name, driver) {
            var _this = this;
            this.name = name;
            this.driver = driver;
            driver.property(this.name, {
                type: Boolean,
                description: this.name + " is pressed",
                readOnly: true
            }, function () { return _this.state; });
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
                _this.buttons.push(new Button(_this.getNamePrefix() + "_btn_" + (ix + 1), _this.driver));
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
        return QuadButtonInterface;
    }(BaseInterface));
    Nexmosphere.registerInterface(QuadButtonInterface, "XTB4N");
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
});
