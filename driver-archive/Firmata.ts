/*
    Driver for communicating with serial devices using the Firmata protocol. Digital inputs/outputs
    and analog inputs are exposed as properties in Blocks. The driver implements digital in/out,
    analog in, PWM and servos as specified by Firmata Protocol version 2.6.0. The driver has been
    tested with StandardFirmata 2.5.9 on an Arduino Uno.

    The driver must be properly configured before it can be used. The pins/channels/servos to be
    used must be specified in the "Custom Options" field in the Network device. Below is a sample
    configuration covering the JSON syntax and all possible settings:
    
    {
        "samplingInterval": 100,        // - How often to send analog samples in milliseconds
                                        //   (0-16383 ms). Default is 100 ms.
        "digital": [                    // - Array of digital input/output pins.
            {
                "pin": 0,               // - The pin number (0-127).
                "property": "Button",   // - The name of the Blocks property.
                "output": false,        // - Is this an output or input pin? Default is false.
                "pullup": true          // - Enable built-in pull-up? Default is true. N/A for outputs.
            },
            {
                "pin": 1,
                "property": "Relay",
                "output": true
            }
        ],
        "analog": [                     // - Array of analog channels. Note that channel != pin, see:
                                        //   https://github.com/firmata/protocol/blob/master/protocol.md#data-message-expansion
            {
                "channel": 3,           // - The channel number (0-15).
                "property": "Temp",     // - The name of the Blocks property.
                "threshold": 5,         // - The change required in the reported value for
                                        //   reporting property change in Blocks. Default is 1. 
                "maxValue": 12345       // - The reported value (0-16383) corresponding to
                                        //   normalized value 1. Default is 1023.
            }
        ],
        "pwm": [                        // - Array of PWM pins.
            {
                "pin": 3,               // - The pin number (0-127).
                "property": "PWM",      // - The name of the Blocks property.
                "maxValue": 256         // - Value corresponding to 100% duty cycle. Default 255.
            }
        ],
        "servos": [                     // - Array of servos.
            {
                "pin": 10,              // - The pin number (0-127).
                "property": "Servo",    // - The name of the Blocks property.
                "minPulse": 500,        // - The PWM pulse width in microseconds corresponding to
                                        //   0 degrees. Default is 544.
                "maxPulse": 2500        // - The PWM pulse width in microseconds corresponding to 
                                        //   180 degrees. Default is 2400.
            }
        ]
    }
 
    Copyright (c) 2023 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
    melvinm1 2023-08-01
*/

import { SerialPort } from "../system/Network";
import { Driver } from "../system_lib/Driver";
import { callable, driver } from "../system_lib/Metadata";

interface Dictionary<TElem> {
	[id: string]: TElem;
}

interface Config {
    samplingInterval?: number;
    digital?: DigitalPinConfig[];
    analog?: AnalogChannelConfig[];
    pwm?: PWMPinConfig[];
    servos?: ServoConfig[];
}

interface DigitalPinConfig {
    pin: number;
    property: string;
    output?: boolean;
    pullup?: boolean;
}

interface AnalogChannelConfig {
    channel: number;
    property: string;
    threshold?: number;
    maxValue?: number;
}

interface PWMPinConfig {
    pin: number;
    property: string;
    maxValue?: number;
}

interface ServoConfig {
    pin: number;
    property: string;
    minPulse?: number;
    maxPulse?: number;
}

enum PinMode { // Supported Firmata pin modes
    Input = 0,
    Output = 1,
    Analog = 2,
    PWM = 3,
    Servo = 4,
    Pullup = 11
}

type SetterGetterFunction<T> = (newValue?: T, isFeedback?: boolean)=> T;

interface DigitalPin {
    number: number; // Pin number
    property: string; // Blocks property name
    mode: PinMode.Pullup | PinMode.Input | PinMode.Output;
    setterGetter: SetterGetterFunction<boolean>;
}

interface AnalogChannel {
    number: number; // Channel number
    property: string; // Blocks property name
    threshold: number; // Change threshold
    maxValue: number; // Max integer
    reportedValue: number; // Internal not normalized value
    setterGetter: SetterGetterFunction<number>;
}

interface PWMPin {
    number: number; // Pin number
    property: string; // Blocks property name
    setterGetter: SetterGetterFunction<number>;
}

interface Servo {
    pinNumber: number; // Pin number
    property: string; // Blocks property name
    minPulse: number; // PWM pulse width in microseconds for 0 degrees
    maxPulse: number; // PWM pulse width in microseconds for 180 degrees
    setterGetter: SetterGetterFunction<number>;
}

type ConnType = SerialPort; // NetworkTCP | SerialPort;

//@driver("NetworkTCP", { port: 27016 })
@driver("SerialPort", { baudRate: 57600 })
export class Firmata extends Driver<ConnType> {
    static readonly PROTOCOL_VERSION = 0xF9;
    static readonly SET_PIN_MODE = 0xF4;
    static readonly SET_DIGITAL_PIN_VALUE = 0xF5;
    static readonly TOGGLE_DIGITAL_REPORTING = 0xD0;
    static readonly TOGGLE_ANALOG_REPORTING = 0xC0;
    static readonly ANALOG_MESSAGE = 0xE0;
    static readonly DIGITAL_MESSAGE = 0x90;
    static readonly SAMPLING_INTERVAL = 0x7A;
    static readonly SYSTEM_RESET = 0xFF;
    static readonly START_SYSEX = 0xF0;
    static readonly END_SYSEX = 0xF7;
    static readonly ANALOG_MAPPING_QUERY = 0x69;
    static readonly ANALOG_MAPPING_RESPONSE = 0x6A;
    static readonly SERVO_CONFIG = 0x70;
    static readonly EXTENDED_ANALOG = 0x6F;

    private readonly digitalPins: Dictionary<DigitalPin> = {}; // Keyed by pin number
    private readonly analogChannels: Dictionary<AnalogChannel> = {}; // Keyed by channel number
    private readonly pwmPins: Dictionary<PWMPin> = {}; // Keyed by pin number
    private readonly servos: Dictionary<Servo> = {}; // Keyed by pin number
    private samplingInterval: number = 100; // ms (read from config)

    constructor(private connection: ConnType) {
        super(connection);
        
        try {
            let config = JSON.parse(this.connection.options) as Config;
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
                this.report(); // Reconnected
            }
        });
        this.beginReceive();
    }

    @callable("Sends System Reset message (0xFF) to the device.")
    public reset(): void {
        this.connection.sendBytes([Firmata.SYSTEM_RESET]);
    }

    /**
     * Reads the configuration and creates properties for the specified
     * pins/channels/etc.
     */
    private readConfig(config: Config): void {
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

    /**
     * Registers a digital pin in this.digitalPins and creates corresponding
     * Blocks property.
     */
    private registerDigitalPinProperty(pinConfig: DigitalPinConfig): void {
        if (!this.isValidPinNumber(pinConfig.pin)) {
            throw "Invalid pin number!";
        }
        let pinNumber = pinConfig.pin;
        let property = pinConfig.property;
        let mode = pinConfig.output ? PinMode.Output : 
            pinConfig.pullup === undefined || pinConfig.pullup ? 
                PinMode.Pullup : PinMode.Input;
        let value = false; // Value held in closure
        let sgFunction = (newValue?: boolean, isFeedback?: boolean): boolean => {
            if (newValue !== undefined) {
                value = newValue;
                if (!isFeedback && mode === PinMode.Output) {
                    this.connection.sendBytes([ // Report new output value
                        Firmata.SET_DIGITAL_PIN_VALUE,
                        pinNumber,
                        newValue ? 1 : 0
                    ]);
                }
            }
            return value;
        };

        this.property(
            property,
            { type: Boolean, readOnly: mode !== PinMode.Output }, 
            sgFunction
        );
        this.digitalPins[pinNumber] = {
            number: pinNumber,
            property: property,
            mode: mode,
            setterGetter: sgFunction
        }
    }

    /**
     * Registers an analog channel in this.analogChannels and creates
     * corresponding Blocks property.
     */
    private registerAnalogChannelProperty(
        channelConfig: AnalogChannelConfig
    ): void {
        if (!this.isValidAnalogChannelNumber(channelConfig.channel)) {
            throw "Invalid channel number!";
        }
        let value = 0;
        let sgFunction = (newValue?: number): number => {
            if (newValue !== undefined) {
                value = newValue;
            }
            return value;
        }

        this.property(
            channelConfig.property, 
            { type: Number, readOnly: true, min: 0, max: 1 },
            sgFunction
        );
        this.analogChannels[channelConfig.channel] = {
            number: channelConfig.channel,
            property: channelConfig.property,
            threshold: channelConfig.threshold !== undefined ? 
                channelConfig.threshold : 1,
            maxValue: channelConfig.maxValue !== undefined ? 
                channelConfig.maxValue : 1023, // Default for Arduino
            reportedValue: value,
            setterGetter: sgFunction
        }
    }

    /**
     * Registers a PWM pin in this.pwmPins and creates corresponding Blocks 
     * property.
     */
    private registerPWMPinProperty(pwmPinConfig: PWMPinConfig): void {
        if (!this.isValidPinNumber(pwmPinConfig.pin)) {
            throw "Invalid PWM pin number!";
        }
        let maxValue = pwmPinConfig.maxValue !== undefined ? 
            pwmPinConfig.maxValue : 255; // 255 default for Arduino
        let value = 0;
        let sgFunction = (newValue?: number): number => {
            if (newValue !== undefined) {
                value = newValue;

                let toSend = Math.round(value * maxValue);
                this.connection.sendBytes([
                    Firmata.START_SYSEX,
                    Firmata.EXTENDED_ANALOG,
                    pwmPinConfig.pin,
                    toSend & 0x7F,
                    (toSend >> 7) & 0x7F,
                    Firmata.END_SYSEX
                ]);
            }
            return value;
        }

        this.property(
            pwmPinConfig.property, 
            { type: Number, min: 0, max: 1 },
            sgFunction
        );
        this.pwmPins[pwmPinConfig.pin] = {
            number: pwmPinConfig.pin,
            property: pwmPinConfig.property,
            setterGetter: sgFunction
        }
    }

    /**
     * Registers a servo in this.servos and creates corresponding Blocks
     * property.
     */
    private registerServoProperty(servoConfig: ServoConfig): void {
        if (!this.isValidPinNumber(servoConfig.pin)) {
            throw "Invalid servo pin number!";
        }
        let value = 0;
        let sgFunction = (newValue?: number): number => {
            if (newValue !== undefined) {
                value = newValue;

                let degrees = Math.round(value * 180);
                this.connection.sendBytes([
                    Firmata.START_SYSEX,
                    Firmata.EXTENDED_ANALOG,
                    servoConfig.pin,
                    degrees & 0x7F,
                    (degrees >> 7) & 0x7F,
                    Firmata.END_SYSEX
                ]);
            }
            return value;
        }
        this.property(
            servoConfig.property, 
            { type: Number, readOnly: false, min: 0, max: 1 },
            sgFunction
        );
        this.servos[servoConfig.pin] = {
            pinNumber: servoConfig.pin,
            property: servoConfig.property,
            minPulse: servoConfig.minPulse !== undefined ? 
                servoConfig.minPulse : 544, // Default for Arduino
            maxPulse: servoConfig.maxPulse !== undefined ? 
                servoConfig.maxPulse : 2400, // Default for Arduino
            setterGetter: sgFunction
        }
    }

    /**
     * Called when (re)connected to the device.
     */
    private report(): void {
        this.queryAnalogMapping(); // Will report analog pins after response
        this.reportDigitalPins();
        this.reportPWMPins();
        this.reportServos();
        this.reportSamplingInterval();
        this.enableDigitalReporting();
        this.enableAnalogReporting();
    }

    /**
     * Sends an analog mapping query.
     */
    private queryAnalogMapping(): void {
        this.connection.sendBytes([
            Firmata.START_SYSEX,
            Firmata.ANALOG_MAPPING_QUERY,
            Firmata.END_SYSEX
        ]);
    }

    /**
     * Reports the pin modes for all digital pins and sets the value of all 
     * digital output pins.
     */
    private reportDigitalPins(): void {
        for (const key in this.digitalPins) {
            let pin = this.digitalPins[key];
            
            this.connection.sendBytes([
                Firmata.SET_PIN_MODE,
                pin.number,
                pin.mode
            ]);
            pin.setterGetter(pin.setterGetter()); // Set to current value
        }
    }

    /**
     * Reports the pin mode and sets the value of all PWM pins.
     */
    private reportPWMPins(): void {
        for (const key in this.pwmPins) {
            let pin = this.pwmPins[key];

            this.connection.sendBytes([
                Firmata.SET_PIN_MODE,
                pin.number,
                PinMode.PWM
            ]);
            pin.setterGetter(pin.setterGetter()); // Set to current value
        }
    }

    /**
     * Reports the pin mode, configuration and values for all servos.
     */
    private reportServos(): void {
        for (const key in this.servos) {
            let servo = this.servos[key];

            this.connection.sendBytes([
                Firmata.START_SYSEX,
                Firmata.SERVO_CONFIG,
                servo.pinNumber,
                servo.minPulse & 0x7F,
                (servo.minPulse >> 7) & 0x7F,
                servo.maxPulse & 0x7F,
                (servo.maxPulse >> 7) & 0x7F,
                Firmata.END_SYSEX
            ]);
            this.connection.sendBytes([
                Firmata.SET_PIN_MODE,
                servo.pinNumber,
                PinMode.Servo
            ]);
            servo.setterGetter(servo.setterGetter()); // Set to current value
        }
    }

    /**
     * Reports the sampling interval.
     */
    private reportSamplingInterval(): void {
        this.connection.sendBytes([
            Firmata.START_SYSEX,
            Firmata.SAMPLING_INTERVAL,
            this.samplingInterval & 0x7F,
            (this.samplingInterval >> 7) & 0x7F,
            Firmata.END_SYSEX
        ]);
    }

    /**
     * Enables reporting of digital pins. Reporting can only be enabled for
     * digital *ports* (= 8 pins), so reporting is enabled for all required
     * ports.
     */
    private enableDigitalReporting(): void {
        // reported[port] === true if the port has already been reported
        let reported: Dictionary<boolean> = {};

        for (const key in this.digitalPins) {
            let pin = this.digitalPins[key];
            
            if (pin.mode !== PinMode.Output) {
                let port = pin.number >> 3;

                if (!reported[port]) {
                    this.connection.sendBytes([
                        Firmata.TOGGLE_DIGITAL_REPORTING | port, 
                        1 // Enable
                    ]);
                    reported[port] = true;
                }
            }
        }
    }

    /**
     * Enables reporting of analog channels.
     */
    private enableAnalogReporting(): void {
        for (const key in this.analogChannels) {
            let channel = this.analogChannels[key];

            this.connection.sendBytes([
                Firmata.TOGGLE_ANALOG_REPORTING | channel.number, 
                1 // Enable
            ]);
        }
    }

    /**
     * Starts receiving bytes.
     */
    private beginReceive() {
        let readBuffer: number[] = [];

        this.connection.subscribe("bytesReceived", (emitter, message) => {
            for (const byte of message.rawData) {
                readBuffer.push(byte);

                if (byte === Firmata.END_SYSEX) {
                    if (readBuffer[0] !== Firmata.START_SYSEX) {
                        readBuffer.pop();
                        continue; // Received unwanted END_SYSEX
                    }
                }
                else if (byte & 0x80) {
                    readBuffer = [byte]; // Start of new message
                }
                
                if (readBuffer[0] === Firmata.START_SYSEX) { // Reading sysex
                    if (readBuffer[readBuffer.length - 1] === Firmata.END_SYSEX) {
                        this.handleSysexMessage(readBuffer);
                        readBuffer = [];
                    }
                }
                else if (readBuffer[0] === Firmata.PROTOCOL_VERSION) {
                    if (readBuffer.length === 3) {
                        this.handleProtocolVersionMessage(readBuffer);
                        readBuffer = [];
                    }
                }
                else if ((readBuffer[0] & 0xF0) === Firmata.DIGITAL_MESSAGE) {
                    if (readBuffer.length === 3) {
                        this.handleDigitalReportMessage(readBuffer);
                        readBuffer = [];
                    }
                }
                else if ((readBuffer[0] & 0xF0) === Firmata.ANALOG_MESSAGE) {
                    if (readBuffer.length === 3) {
                        this.handleAnalogReportMessage(readBuffer);
                        readBuffer = [];
                    }
                }
                else {
                    readBuffer.pop(); // Not interested
                }        
            }
        });
    }

    /**
     * Handles a system exclusive (sysex) message.
     */
    private handleSysexMessage(bytes: number[]): void {
        if (bytes.length > 2 && 
            bytes[1] === Firmata.ANALOG_MAPPING_RESPONSE) {
            this.handleAnalogMappingResponseMessage(bytes);
        }
    }

    /**
     * Handles an ANALOG_MAPPING_RESPONSE system exclusive message.
     * Reports analog input pins.
     */
    private handleAnalogMappingResponseMessage(bytes: number[]): void {
        for (let pin = 0; pin < bytes.length - 3; pin++) {
            let channelNumber = bytes[pin + 2];

            if (channelNumber in this.analogChannels) {
                this.connection.sendBytes([ // Report analog pin
                    Firmata.SET_PIN_MODE,
                    pin, 
                    PinMode.Analog
                ]);
            }
        }
    }

    /**
     * Handles a DIGITAL_MESSAGE report message.
     */
    private handleDigitalReportMessage(bytes: number[]): void {
        let port = bytes[0] & 0xF;
        let pinOffset = port * 8;
        let bitmask = bytes[1] | (bytes[2] << 7); // Port (8 pins) bitmask

        for (let i = 0; i < 7; i++) { // For each pin in port
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

    /**
     * Handles an ANALOG_MESSAGE report message.
     */
    private handleAnalogReportMessage(bytes: number[]): void {
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

    /**
     * Handles a PROTOCOL_VERSION message.
     */
    private handleProtocolVersionMessage(bytes: number[]): void {
        this.report(); // Reconnected
    }

    private isValidPinNumber(pin: number): boolean {
        return pin >= 0 && pin < 128;
    }

    private isValidAnalogChannelNumber(channel: number): boolean {
        return channel >= 0 && channel < 16;
    }
}
