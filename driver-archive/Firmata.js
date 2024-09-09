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
define(["require", "exports", "../system_lib/Driver", "../system_lib/Metadata"], function (require, exports, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Firmata = void 0;
    var PinMode;
    (function (PinMode) {
        PinMode[PinMode["Input"] = 0] = "Input";
        PinMode[PinMode["Output"] = 1] = "Output";
        PinMode[PinMode["Analog"] = 2] = "Analog";
        PinMode[PinMode["PWM"] = 3] = "PWM";
        PinMode[PinMode["Servo"] = 4] = "Servo";
        PinMode[PinMode["Pullup"] = 11] = "Pullup";
    })(PinMode || (PinMode = {}));
    var Firmata = exports.Firmata = (function (_super) {
        __extends(Firmata, _super);
        function Firmata(connection) {
            var _this = _super.call(this, connection) || this;
            _this.connection = connection;
            _this.digitalPins = {};
            _this.analogChannels = {};
            _this.pwmPins = {};
            _this.servos = {};
            _this.samplingInterval = 100;
            try {
                var config = JSON.parse(_this.connection.options);
                _this.readConfig(config);
            }
            catch (parseError) {
                throw "Could not parse JSON configuration!";
            }
            var rawBytesMode = true;
            connection.autoConnect(rawBytesMode);
            if (connection.connected) {
                _this.report();
            }
            connection.subscribe("connect", function (emitter, message) {
                if (message.type === "Connection" && connection.connected) {
                    _this.report();
                }
            });
            _this.beginReceive();
            return _this;
        }
        Firmata_1 = Firmata;
        Firmata.prototype.reset = function () {
            this.connection.sendBytes([Firmata_1.SYSTEM_RESET]);
        };
        Firmata.prototype.readConfig = function (config) {
            if (config.digital) {
                for (var _i = 0, _a = config.digital; _i < _a.length; _i++) {
                    var pinConfig = _a[_i];
                    this.registerDigitalPinProperty(pinConfig);
                }
            }
            if (config.analog) {
                for (var _b = 0, _c = config.analog; _b < _c.length; _b++) {
                    var channelConfig = _c[_b];
                    this.registerAnalogChannelProperty(channelConfig);
                }
            }
            if (config.pwm) {
                for (var _d = 0, _e = config.pwm; _d < _e.length; _d++) {
                    var pwmPinConfig = _e[_d];
                    this.registerPWMPinProperty(pwmPinConfig);
                }
            }
            if (config.servos) {
                for (var _f = 0, _g = config.servos; _f < _g.length; _f++) {
                    var servoConfig = _g[_f];
                    this.registerServoProperty(servoConfig);
                }
            }
            if (config.samplingInterval !== undefined &&
                typeof config.samplingInterval === "number") {
                this.samplingInterval = config.samplingInterval;
            }
        };
        Firmata.prototype.registerDigitalPinProperty = function (pinConfig) {
            var _this = this;
            if (!this.isValidPinNumber(pinConfig.pin)) {
                throw "Invalid pin number!";
            }
            var pinNumber = pinConfig.pin;
            var property = pinConfig.property;
            var mode = pinConfig.output ? PinMode.Output :
                pinConfig.pullup === undefined || pinConfig.pullup ?
                    PinMode.Pullup : PinMode.Input;
            var value = false;
            var sgFunction = function (newValue, isFeedback) {
                if (newValue !== undefined) {
                    value = newValue;
                    if (!isFeedback && mode === PinMode.Output) {
                        _this.connection.sendBytes([
                            Firmata_1.SET_DIGITAL_PIN_VALUE,
                            pinNumber,
                            newValue ? 1 : 0
                        ]);
                    }
                }
                return value;
            };
            this.property(property, { type: Boolean, readOnly: mode !== PinMode.Output }, sgFunction);
            this.digitalPins[pinNumber] = {
                number: pinNumber,
                property: property,
                mode: mode,
                setterGetter: sgFunction
            };
        };
        Firmata.prototype.registerAnalogChannelProperty = function (channelConfig) {
            if (!this.isValidAnalogChannelNumber(channelConfig.channel)) {
                throw "Invalid channel number!";
            }
            var value = 0;
            var sgFunction = function (newValue) {
                if (newValue !== undefined) {
                    value = newValue;
                }
                return value;
            };
            this.property(channelConfig.property, { type: Number, readOnly: true, min: 0, max: 1 }, sgFunction);
            this.analogChannels[channelConfig.channel] = {
                number: channelConfig.channel,
                property: channelConfig.property,
                threshold: channelConfig.threshold !== undefined ?
                    channelConfig.threshold : 1,
                maxValue: channelConfig.maxValue !== undefined ?
                    channelConfig.maxValue : 1023,
                reportedValue: value,
                setterGetter: sgFunction
            };
        };
        Firmata.prototype.registerPWMPinProperty = function (pwmPinConfig) {
            var _this = this;
            if (!this.isValidPinNumber(pwmPinConfig.pin)) {
                throw "Invalid PWM pin number!";
            }
            var maxValue = pwmPinConfig.maxValue !== undefined ?
                pwmPinConfig.maxValue : 255;
            var value = 0;
            var sgFunction = function (newValue) {
                if (newValue !== undefined) {
                    value = newValue;
                    var toSend = Math.round(value * maxValue);
                    _this.connection.sendBytes([
                        Firmata_1.START_SYSEX,
                        Firmata_1.EXTENDED_ANALOG,
                        pwmPinConfig.pin,
                        toSend & 0x7F,
                        (toSend >> 7) & 0x7F,
                        Firmata_1.END_SYSEX
                    ]);
                }
                return value;
            };
            this.property(pwmPinConfig.property, { type: Number, min: 0, max: 1 }, sgFunction);
            this.pwmPins[pwmPinConfig.pin] = {
                number: pwmPinConfig.pin,
                property: pwmPinConfig.property,
                setterGetter: sgFunction
            };
        };
        Firmata.prototype.registerServoProperty = function (servoConfig) {
            var _this = this;
            if (!this.isValidPinNumber(servoConfig.pin)) {
                throw "Invalid servo pin number!";
            }
            var value = 0;
            var sgFunction = function (newValue) {
                if (newValue !== undefined) {
                    value = newValue;
                    var degrees = Math.round(value * 180);
                    _this.connection.sendBytes([
                        Firmata_1.START_SYSEX,
                        Firmata_1.EXTENDED_ANALOG,
                        servoConfig.pin,
                        degrees & 0x7F,
                        (degrees >> 7) & 0x7F,
                        Firmata_1.END_SYSEX
                    ]);
                }
                return value;
            };
            this.property(servoConfig.property, { type: Number, readOnly: false, min: 0, max: 1 }, sgFunction);
            this.servos[servoConfig.pin] = {
                pinNumber: servoConfig.pin,
                property: servoConfig.property,
                minPulse: servoConfig.minPulse !== undefined ?
                    servoConfig.minPulse : 544,
                maxPulse: servoConfig.maxPulse !== undefined ?
                    servoConfig.maxPulse : 2400,
                setterGetter: sgFunction
            };
        };
        Firmata.prototype.report = function () {
            this.queryAnalogMapping();
            this.reportDigitalPins();
            this.reportPWMPins();
            this.reportServos();
            this.reportSamplingInterval();
            this.enableDigitalReporting();
            this.enableAnalogReporting();
        };
        Firmata.prototype.queryAnalogMapping = function () {
            this.connection.sendBytes([
                Firmata_1.START_SYSEX,
                Firmata_1.ANALOG_MAPPING_QUERY,
                Firmata_1.END_SYSEX
            ]);
        };
        Firmata.prototype.reportDigitalPins = function () {
            for (var key in this.digitalPins) {
                var pin = this.digitalPins[key];
                this.connection.sendBytes([
                    Firmata_1.SET_PIN_MODE,
                    pin.number,
                    pin.mode
                ]);
                pin.setterGetter(pin.setterGetter());
            }
        };
        Firmata.prototype.reportPWMPins = function () {
            for (var key in this.pwmPins) {
                var pin = this.pwmPins[key];
                this.connection.sendBytes([
                    Firmata_1.SET_PIN_MODE,
                    pin.number,
                    PinMode.PWM
                ]);
                pin.setterGetter(pin.setterGetter());
            }
        };
        Firmata.prototype.reportServos = function () {
            for (var key in this.servos) {
                var servo = this.servos[key];
                this.connection.sendBytes([
                    Firmata_1.START_SYSEX,
                    Firmata_1.SERVO_CONFIG,
                    servo.pinNumber,
                    servo.minPulse & 0x7F,
                    (servo.minPulse >> 7) & 0x7F,
                    servo.maxPulse & 0x7F,
                    (servo.maxPulse >> 7) & 0x7F,
                    Firmata_1.END_SYSEX
                ]);
                this.connection.sendBytes([
                    Firmata_1.SET_PIN_MODE,
                    servo.pinNumber,
                    PinMode.Servo
                ]);
                servo.setterGetter(servo.setterGetter());
            }
        };
        Firmata.prototype.reportSamplingInterval = function () {
            this.connection.sendBytes([
                Firmata_1.START_SYSEX,
                Firmata_1.SAMPLING_INTERVAL,
                this.samplingInterval & 0x7F,
                (this.samplingInterval >> 7) & 0x7F,
                Firmata_1.END_SYSEX
            ]);
        };
        Firmata.prototype.enableDigitalReporting = function () {
            var reported = {};
            for (var key in this.digitalPins) {
                var pin = this.digitalPins[key];
                if (pin.mode !== PinMode.Output) {
                    var port = pin.number >> 3;
                    if (!reported[port]) {
                        this.connection.sendBytes([
                            Firmata_1.TOGGLE_DIGITAL_REPORTING | port,
                            1
                        ]);
                        reported[port] = true;
                    }
                }
            }
        };
        Firmata.prototype.enableAnalogReporting = function () {
            for (var key in this.analogChannels) {
                var channel = this.analogChannels[key];
                this.connection.sendBytes([
                    Firmata_1.TOGGLE_ANALOG_REPORTING | channel.number,
                    1
                ]);
            }
        };
        Firmata.prototype.beginReceive = function () {
            var _this = this;
            var readBuffer = [];
            this.connection.subscribe("bytesReceived", function (emitter, message) {
                for (var _i = 0, _a = message.rawData; _i < _a.length; _i++) {
                    var byte = _a[_i];
                    readBuffer.push(byte);
                    if (byte === Firmata_1.END_SYSEX) {
                        if (readBuffer[0] !== Firmata_1.START_SYSEX) {
                            readBuffer.pop();
                            continue;
                        }
                    }
                    else if (byte & 0x80) {
                        readBuffer = [byte];
                    }
                    if (readBuffer[0] === Firmata_1.START_SYSEX) {
                        if (readBuffer[readBuffer.length - 1] === Firmata_1.END_SYSEX) {
                            _this.handleSysexMessage(readBuffer);
                            readBuffer = [];
                        }
                    }
                    else if (readBuffer[0] === Firmata_1.PROTOCOL_VERSION) {
                        if (readBuffer.length === 3) {
                            _this.handleProtocolVersionMessage(readBuffer);
                            readBuffer = [];
                        }
                    }
                    else if ((readBuffer[0] & 0xF0) === Firmata_1.DIGITAL_MESSAGE) {
                        if (readBuffer.length === 3) {
                            _this.handleDigitalReportMessage(readBuffer);
                            readBuffer = [];
                        }
                    }
                    else if ((readBuffer[0] & 0xF0) === Firmata_1.ANALOG_MESSAGE) {
                        if (readBuffer.length === 3) {
                            _this.handleAnalogReportMessage(readBuffer);
                            readBuffer = [];
                        }
                    }
                    else {
                        readBuffer.pop();
                    }
                }
            });
        };
        Firmata.prototype.handleSysexMessage = function (bytes) {
            if (bytes.length > 2 &&
                bytes[1] === Firmata_1.ANALOG_MAPPING_RESPONSE) {
                this.handleAnalogMappingResponseMessage(bytes);
            }
        };
        Firmata.prototype.handleAnalogMappingResponseMessage = function (bytes) {
            for (var pin = 0; pin < bytes.length - 3; pin++) {
                var channelNumber = bytes[pin + 2];
                if (channelNumber in this.analogChannels) {
                    this.connection.sendBytes([
                        Firmata_1.SET_PIN_MODE,
                        pin,
                        PinMode.Analog
                    ]);
                }
            }
        };
        Firmata.prototype.handleDigitalReportMessage = function (bytes) {
            var port = bytes[0] & 0xF;
            var pinOffset = port * 8;
            var bitmask = bytes[1] | (bytes[2] << 7);
            var PIN_NUMBERS = 8;
            for (var i = 0; i < PIN_NUMBERS; i++) {
                var pinNumber = pinOffset + i;
                var pin = this.digitalPins[pinNumber];
                if (pin && pin.mode !== PinMode.Output) {
                    var newValue = (bitmask & 1) === 1;
                    pin.setterGetter(newValue, true);
                    this.changed(pin.property);
                }
                bitmask = bitmask >> 1;
            }
        };
        Firmata.prototype.handleAnalogReportMessage = function (bytes) {
            var channelNumber = bytes[0] & 0xF;
            var channel = this.analogChannels[channelNumber];
            if (channel) {
                var newValue = bytes[1] + (bytes[2] << 7);
                var prevValue = channel.reportedValue;
                if (Math.abs(newValue - prevValue) >= channel.threshold) {
                    var normalized = newValue / channel.maxValue;
                    channel.reportedValue = newValue;
                    channel.setterGetter(normalized, true);
                    this.changed(channel.property);
                }
            }
        };
        Firmata.prototype.handleProtocolVersionMessage = function (bytes) {
            this.report();
        };
        Firmata.prototype.isValidPinNumber = function (pin) {
            return pin >= 0 && pin < 128;
        };
        Firmata.prototype.isValidAnalogChannelNumber = function (channel) {
            return channel >= 0 && channel < 16;
        };
        var Firmata_1;
        Firmata.PROTOCOL_VERSION = 0xF9;
        Firmata.SET_PIN_MODE = 0xF4;
        Firmata.SET_DIGITAL_PIN_VALUE = 0xF5;
        Firmata.TOGGLE_DIGITAL_REPORTING = 0xD0;
        Firmata.TOGGLE_ANALOG_REPORTING = 0xC0;
        Firmata.ANALOG_MESSAGE = 0xE0;
        Firmata.DIGITAL_MESSAGE = 0x90;
        Firmata.SAMPLING_INTERVAL = 0x7A;
        Firmata.SYSTEM_RESET = 0xFF;
        Firmata.START_SYSEX = 0xF0;
        Firmata.END_SYSEX = 0xF7;
        Firmata.ANALOG_MAPPING_QUERY = 0x69;
        Firmata.ANALOG_MAPPING_RESPONSE = 0x6A;
        Firmata.SERVO_CONFIG = 0x70;
        Firmata.EXTENDED_ANALOG = 0x6F;
        __decorate([
            (0, Metadata_1.callable)("Sends System Reset message (0xFF) to the device."),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], Firmata.prototype, "reset", null);
        Firmata = Firmata_1 = __decorate([
            (0, Metadata_1.driver)("SerialPort", { baudRate: 57600 }),
            __metadata("design:paramtypes", [Object])
        ], Firmata);
        return Firmata;
    }(Driver_1.Driver));
});
