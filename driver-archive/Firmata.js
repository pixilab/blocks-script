"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var Firmata_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Firmata = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
var PinMode;
(function (PinMode) {
    PinMode[PinMode["Input"] = 0] = "Input";
    PinMode[PinMode["Output"] = 1] = "Output";
    PinMode[PinMode["Analog"] = 2] = "Analog";
    PinMode[PinMode["PWM"] = 3] = "PWM";
    PinMode[PinMode["Servo"] = 4] = "Servo";
    PinMode[PinMode["Pullup"] = 11] = "Pullup";
})(PinMode || (PinMode = {}));
let Firmata = class Firmata extends Driver_1.Driver {
    static { Firmata_1 = this; }
    connection;
    static PROTOCOL_VERSION = 0xF9;
    static SET_PIN_MODE = 0xF4;
    static SET_DIGITAL_PIN_VALUE = 0xF5;
    static TOGGLE_DIGITAL_REPORTING = 0xD0;
    static TOGGLE_ANALOG_REPORTING = 0xC0;
    static ANALOG_MESSAGE = 0xE0;
    static DIGITAL_MESSAGE = 0x90;
    static SAMPLING_INTERVAL = 0x7A;
    static SYSTEM_RESET = 0xFF;
    static START_SYSEX = 0xF0;
    static END_SYSEX = 0xF7;
    static ANALOG_MAPPING_QUERY = 0x69;
    static ANALOG_MAPPING_RESPONSE = 0x6A;
    static SERVO_CONFIG = 0x70;
    static EXTENDED_ANALOG = 0x6F;
    digitalPins = {};
    analogChannels = {};
    pwmPins = {};
    servos = {};
    samplingInterval = 100;
    constructor(connection) {
        super(connection);
        this.connection = connection;
        try {
            let config = JSON.parse(this.connection.options);
            this.readConfig(config);
        }
        catch (parseError) {
            throw "Could not parse JSON configuration!";
        }
        let rawBytesMode = true;
        connection.autoConnect(rawBytesMode);
        if (connection.connected) {
            this.report();
        }
        connection.subscribe("connect", (emitter, message) => {
            if (message.type === "Connection" && connection.connected) {
                this.report();
            }
        });
        this.beginReceive();
    }
    reset() {
        this.connection.sendBytes([Firmata_1.SYSTEM_RESET]);
    }
    readConfig(config) {
        if (config.digital) {
            for (const pinConfig of config.digital) {
                this.registerDigitalPinProperty(pinConfig);
            }
        }
        if (config.analog) {
            for (const channelConfig of config.analog) {
                this.registerAnalogChannelProperty(channelConfig);
            }
        }
        if (config.pwm) {
            for (const pwmPinConfig of config.pwm) {
                this.registerPWMPinProperty(pwmPinConfig);
            }
        }
        if (config.servos) {
            for (const servoConfig of config.servos) {
                this.registerServoProperty(servoConfig);
            }
        }
        if (config.samplingInterval !== undefined &&
            typeof config.samplingInterval === "number") {
            this.samplingInterval = config.samplingInterval;
        }
    }
    registerDigitalPinProperty(pinConfig) {
        if (!this.isValidPinNumber(pinConfig.pin)) {
            throw "Invalid pin number!";
        }
        let pinNumber = pinConfig.pin;
        let property = pinConfig.property;
        let mode = pinConfig.output ? PinMode.Output :
            pinConfig.pullup === undefined || pinConfig.pullup ?
                PinMode.Pullup : PinMode.Input;
        let value = false;
        let sgFunction = (newValue, isFeedback) => {
            if (newValue !== undefined) {
                value = newValue;
                if (!isFeedback && mode === PinMode.Output) {
                    this.connection.sendBytes([
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
    }
    registerAnalogChannelProperty(channelConfig) {
        if (!this.isValidAnalogChannelNumber(channelConfig.channel)) {
            throw "Invalid channel number!";
        }
        let value = 0;
        let sgFunction = (newValue) => {
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
    }
    registerPWMPinProperty(pwmPinConfig) {
        if (!this.isValidPinNumber(pwmPinConfig.pin)) {
            throw "Invalid PWM pin number!";
        }
        let maxValue = pwmPinConfig.maxValue !== undefined ?
            pwmPinConfig.maxValue : 255;
        let value = 0;
        let sgFunction = (newValue) => {
            if (newValue !== undefined) {
                value = newValue;
                let toSend = Math.round(value * maxValue);
                this.connection.sendBytes([
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
    }
    registerServoProperty(servoConfig) {
        if (!this.isValidPinNumber(servoConfig.pin)) {
            throw "Invalid servo pin number!";
        }
        let value = 0;
        let sgFunction = (newValue) => {
            if (newValue !== undefined) {
                value = newValue;
                let degrees = Math.round(value * 180);
                this.connection.sendBytes([
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
    }
    report() {
        this.queryAnalogMapping();
        this.reportDigitalPins();
        this.reportPWMPins();
        this.reportServos();
        this.reportSamplingInterval();
        this.enableDigitalReporting();
        this.enableAnalogReporting();
    }
    queryAnalogMapping() {
        this.connection.sendBytes([
            Firmata_1.START_SYSEX,
            Firmata_1.ANALOG_MAPPING_QUERY,
            Firmata_1.END_SYSEX
        ]);
    }
    reportDigitalPins() {
        for (const key in this.digitalPins) {
            let pin = this.digitalPins[key];
            this.connection.sendBytes([
                Firmata_1.SET_PIN_MODE,
                pin.number,
                pin.mode
            ]);
            pin.setterGetter(pin.setterGetter());
        }
    }
    reportPWMPins() {
        for (const key in this.pwmPins) {
            let pin = this.pwmPins[key];
            this.connection.sendBytes([
                Firmata_1.SET_PIN_MODE,
                pin.number,
                PinMode.PWM
            ]);
            pin.setterGetter(pin.setterGetter());
        }
    }
    reportServos() {
        for (const key in this.servos) {
            let servo = this.servos[key];
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
    }
    reportSamplingInterval() {
        this.connection.sendBytes([
            Firmata_1.START_SYSEX,
            Firmata_1.SAMPLING_INTERVAL,
            this.samplingInterval & 0x7F,
            (this.samplingInterval >> 7) & 0x7F,
            Firmata_1.END_SYSEX
        ]);
    }
    enableDigitalReporting() {
        let reported = {};
        for (const key in this.digitalPins) {
            let pin = this.digitalPins[key];
            if (pin.mode !== PinMode.Output) {
                let port = pin.number >> 3;
                if (!reported[port]) {
                    this.connection.sendBytes([
                        Firmata_1.TOGGLE_DIGITAL_REPORTING | port,
                        1
                    ]);
                    reported[port] = true;
                }
            }
        }
    }
    enableAnalogReporting() {
        for (const key in this.analogChannels) {
            let channel = this.analogChannels[key];
            this.connection.sendBytes([
                Firmata_1.TOGGLE_ANALOG_REPORTING | channel.number,
                1
            ]);
        }
    }
    beginReceive() {
        let readBuffer = [];
        this.connection.subscribe("bytesReceived", (emitter, message) => {
            for (const byte of message.rawData) {
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
                        this.handleSysexMessage(readBuffer);
                        readBuffer = [];
                    }
                }
                else if (readBuffer[0] === Firmata_1.PROTOCOL_VERSION) {
                    if (readBuffer.length === 3) {
                        this.handleProtocolVersionMessage(readBuffer);
                        readBuffer = [];
                    }
                }
                else if ((readBuffer[0] & 0xF0) === Firmata_1.DIGITAL_MESSAGE) {
                    if (readBuffer.length === 3) {
                        this.handleDigitalReportMessage(readBuffer);
                        readBuffer = [];
                    }
                }
                else if ((readBuffer[0] & 0xF0) === Firmata_1.ANALOG_MESSAGE) {
                    if (readBuffer.length === 3) {
                        this.handleAnalogReportMessage(readBuffer);
                        readBuffer = [];
                    }
                }
                else {
                    readBuffer.pop();
                }
            }
        });
    }
    handleSysexMessage(bytes) {
        if (bytes.length > 2 &&
            bytes[1] === Firmata_1.ANALOG_MAPPING_RESPONSE) {
            this.handleAnalogMappingResponseMessage(bytes);
        }
    }
    handleAnalogMappingResponseMessage(bytes) {
        for (let pin = 0; pin < bytes.length - 3; pin++) {
            let channelNumber = bytes[pin + 2];
            if (channelNumber in this.analogChannels) {
                this.connection.sendBytes([
                    Firmata_1.SET_PIN_MODE,
                    pin,
                    PinMode.Analog
                ]);
            }
        }
    }
    handleDigitalReportMessage(bytes) {
        let port = bytes[0] & 0xF;
        let pinOffset = port * 8;
        let bitmask = bytes[1] | (bytes[2] << 7);
        const PIN_NUMBERS = 8;
        for (let i = 0; i < PIN_NUMBERS; i++) {
            let pinNumber = pinOffset + i;
            let pin = this.digitalPins[pinNumber];
            if (pin && pin.mode !== PinMode.Output) {
                let newValue = (bitmask & 1) === 1;
                pin.setterGetter(newValue, true);
                this.changed(pin.property);
            }
            bitmask = bitmask >> 1;
        }
    }
    handleAnalogReportMessage(bytes) {
        let channelNumber = bytes[0] & 0xF;
        let channel = this.analogChannels[channelNumber];
        if (channel) {
            let newValue = bytes[1] + (bytes[2] << 7);
            let prevValue = channel.reportedValue;
            if (Math.abs(newValue - prevValue) >= channel.threshold) {
                let normalized = newValue / channel.maxValue;
                channel.reportedValue = newValue;
                channel.setterGetter(normalized, true);
                this.changed(channel.property);
            }
        }
    }
    handleProtocolVersionMessage(bytes) {
        this.report();
    }
    isValidPinNumber(pin) {
        return pin >= 0 && pin < 128;
    }
    isValidAnalogChannelNumber(channel) {
        return channel >= 0 && channel < 16;
    }
};
exports.Firmata = Firmata;
__decorate([
    (0, Metadata_1.callable)("Sends System Reset message (0xFF) to the device."),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Firmata.prototype, "reset", null);
exports.Firmata = Firmata = Firmata_1 = __decorate([
    (0, Metadata_1.driver)("SerialPort", { baudRate: 57600 }),
    __metadata("design:paramtypes", [Object])
], Firmata);
