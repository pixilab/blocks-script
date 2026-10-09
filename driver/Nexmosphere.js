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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var Nexmosphere_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Nexmosphere = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
const ScriptBase_1 = require("../system_lib/ScriptBase");
const kRfidPacketParser = /^XR\[P(.)(\d+)]$/;
const kPortPacketParser = /^X(\d+)([AB])\[(.+)]$/;
const kProductCodeParser = /D(\d+)B\[\w+=(.+)]$/;
let Nexmosphere = class Nexmosphere extends Driver_1.Driver {
    static { Nexmosphere_1 = this; }
    connection;
    static interfaceRegistry;
    specifiedInterfaces = [];
    pollEnabled = true;
    numInterfaces = 8;
    lastTag;
    pollIndex = 0;
    awake = false;
    interface;
    element;
    constructor(connection) {
        super(connection);
        this.connection = connection;
        this.element = this.namedAggregateProperty("element", BaseInterface);
        this.interface = [];
        if (connection.options) {
            const options = JSON.parse(connection.options);
            if (typeof options === "number") {
                this.numInterfaces = options;
                this.pollEnabled = true;
            }
            if (typeof options === "object") {
                this.specifiedInterfaces = options;
                this.pollEnabled = false;
                for (let iface of this.specifiedInterfaces) {
                    log("Specified interfaces", iface.ifaceNo, iface.modelCode, iface.name);
                    this.addInterface(iface.ifaceNo, iface.modelCode, iface.name);
                }
            }
        }
        connection.autoConnect();
        connection.subscribe('textReceived', (sender, message) => {
            if (message.text) {
                if (this.awake)
                    this.handleMessage(message.text);
                else {
                    this.awake = true;
                    this.pollIndex = 0;
                }
            }
        });
        connection.subscribe('connect', (sender, message) => {
            if (message.type === 'Connection' && connection.connected) {
                log("Connected", this.pollEnabled);
                if (!this.pollIndex && this.pollEnabled)
                    this.pollNext();
            }
            else {
                log("Disconnected");
                if (!this.interface.length)
                    this.pollIndex = 0;
            }
        });
    }
    static registerInterface(ctor, ...modelName) {
        if (!Nexmosphere_1.interfaceRegistry)
            Nexmosphere_1.interfaceRegistry = {};
        modelName.forEach(function (name) {
            Nexmosphere_1.interfaceRegistry[name] = ctor;
        });
    }
    pollNext() {
        let ix = this.pollIndex + 1 | 0;
        if (ix % 10 === 9) {
            const tens = Math.round(ix / 10);
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
        let pollAgain = false;
        if (this.pollIndex < this.numInterfaces)
            pollAgain = true;
        else if (!this.interface.length) {
            this.pollIndex = 0;
            pollAgain = true;
        }
        if (pollAgain && this.connection.connected)
            wait(500).then(() => this.pollNext());
    }
    queryPortConfig(portNumber) {
        let sensorMessage = (("000" + portNumber).slice(-3));
        sensorMessage = "D" + sensorMessage + "B[TYPE]";
        log("QQuery", sensorMessage);
        this.send(sensorMessage);
    }
    send(rawData) {
        this.connection.sendText(rawData, "\r\n");
    }
    reInitialize() {
        super.reInitialize();
    }
    handleMessage(msg) {
        log("Data from device", msg);
        let parseResult = kRfidPacketParser.exec(msg);
        if (parseResult) {
            this.lastTag = {
                isPlaced: parseResult[1] === 'B',
                tagNumber: parseInt(parseResult[2])
            };
        }
        else if ((parseResult = kPortPacketParser.exec(msg))) {
            const portNumber = parseInt(parseResult[1]);
            const dataRecieved = parseResult[3];
            log("Incoming data from port", portNumber, "Data", dataRecieved);
            const index = portNumber - 1;
            const interfacePort = this.interface[index];
            if (interfacePort)
                interfacePort.receiveData(dataRecieved, this.lastTag);
            else
                console.warn("Message from unexpected port", portNumber);
        }
        else if ((parseResult = kProductCodeParser.exec(msg))) {
            log("QReply", msg);
            const modelInfo = {
                modelCode: parseResult[2].trim()
            };
            const portNumber = (parseResult[1]);
            this.addInterface(parseInt(portNumber), modelInfo.modelCode);
        }
        else {
            console.warn("Unknown command received from controller", msg);
        }
    }
    addInterface(portNumber, modelCode, name) {
        const ix = portNumber - 1;
        let ctor = Nexmosphere_1.interfaceRegistry[modelCode];
        if (!ctor) {
            console.warn("Unknown interface model - using generic 'unknown' type", modelCode);
            ctor = UnknownInterface;
        }
        const iface = new ctor(this, ix);
        let ifaceName = name;
        if (!ifaceName) {
            ifaceName = iface.userFriendlyName();
            if (!(iface instanceof UnknownInterface))
                ifaceName = ifaceName + '_' + modelCode;
            ifaceName = ifaceName + '_' + portNumber;
        }
        this.interface[ix] = this.element[ifaceName] = iface;
    }
};
exports.Nexmosphere = Nexmosphere;
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
exports.Nexmosphere = Nexmosphere = Nexmosphere_1 = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 4001 }),
    (0, Metadata_1.driver)('SerialPort', { baudRate: 115200 }),
    __metadata("design:paramtypes", [Object])
], Nexmosphere);
class BaseInterface extends ScriptBase_1.AggregateElem {
    driver;
    index;
    constructor(driver, index) {
        super();
        this.driver = driver;
        this.index = index;
    }
    receiveData(data, tag) {
        console.warn("Unexpected data recieved on interface " + this.index + " " + data);
    }
    userFriendlyName() {
        return "Unknown";
    }
}
class UnknownInterface extends BaseInterface {
    propValue;
    get unknown() {
        return this.propValue;
    }
    set unknown(value) {
        this.propValue = value;
    }
    receiveData(data) {
        this.unknown = data;
    }
}
__decorate([
    (0, Metadata_1.property)("Raw data last received from unknown device type", true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], UnknownInterface.prototype, "unknown", null);
class RfidInterface extends BaseInterface {
    mTagNumber = 0;
    mIsPlaced = false;
    get tagNumber() {
        return this.mTagNumber;
    }
    set tagNumber(value) {
        this.mTagNumber = value;
    }
    get isPlaced() { return this.mIsPlaced; }
    set isPlaced(value) { this.mIsPlaced = value; }
    receiveData(data, tag) {
        this.isPlaced = tag.isPlaced;
        this.tagNumber = tag.tagNumber;
    }
    userFriendlyName() {
        return "RFID";
    }
}
__decorate([
    (0, Metadata_1.property)("Last recieved RFID tag ID", false),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], RfidInterface.prototype, "tagNumber", null);
__decorate([
    (0, Metadata_1.property)("RFID tag is detected", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], RfidInterface.prototype, "isPlaced", null);
Nexmosphere.registerInterface(RfidInterface, "XRDR1");
class NfcInterface extends BaseInterface {
    lastTagEvent = "";
    mTagUID = "";
    mIsPlaced = false;
    get tagUID() { return this.mTagUID; }
    set tagUID(value) { this.mTagUID = value; }
    get isPlaced() { return this.mIsPlaced; }
    set isPlaced(value) { this.mIsPlaced = value; }
    receiveData(data) {
        log(data);
        let splitData = data.split(":");
        const newTagData = splitData[1];
        const newTagEvent = splitData[0];
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
                super.receiveData(data);
                break;
        }
    }
    userFriendlyName() {
        return "NFC";
    }
}
__decorate([
    (0, Metadata_1.property)("Last recieved tag UID", false),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], NfcInterface.prototype, "tagUID", null);
__decorate([
    (0, Metadata_1.property)("A tag is placed", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], NfcInterface.prototype, "isPlaced", null);
Nexmosphere.registerInterface(NfcInterface, "XRDW2");
class XWaveLedInterface extends BaseInterface {
    mX_Wave_Command = "";
    set X_Wave_Command(value) {
        this.sendData(value);
        this.mX_Wave_Command = value;
    }
    get X_Wave_Command() { return this.mX_Wave_Command; }
    sendData(data) {
        const myIfaceNo = (("000" + (this.index + 1)).slice(-3));
        const message = "X" + myIfaceNo + "B[" + data + "]";
        this.driver.send(message);
    }
    userFriendlyName() {
        return "LED";
    }
}
__decorate([
    (0, Metadata_1.property)("Command sent"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], XWaveLedInterface.prototype, "X_Wave_Command", null);
Nexmosphere.registerInterface(XWaveLedInterface, "XWC56", "XWL56");
class ProximityInterface extends BaseInterface {
    mProximity = 0;
    get proximity() { return this.mProximity; }
    set proximity(value) { this.mProximity = value; }
    receiveData(data) {
        this.proximity = parseInt(data);
    }
    userFriendlyName() {
        return "Prox";
    }
}
__decorate([
    (0, Metadata_1.property)("Proximity zone", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], ProximityInterface.prototype, "proximity", null);
Nexmosphere.registerInterface(ProximityInterface, "XY116", "XY146", "XY176");
class TimeOfFlightInterface extends BaseInterface {
    mProximity;
    mAirButton;
    mRawData;
    mTrigger1 = false;
    mTrigger2 = false;
    mTrigger3 = false;
    mTrigger4 = false;
    mTrigger5 = false;
    mTrigger6 = false;
    mTrigger7 = false;
    mTrigger8 = false;
    mTrigger9 = false;
    mTrigger10 = false;
    get proximity() { return this.mProximity; }
    set proximity(value) { this.mProximity = value; }
    get airButton() { return this.mAirButton; }
    set airButton(value) { this.mAirButton = value; }
    get rawData() { return this.mRawData; }
    set rawData(value) { this.mRawData = value; }
    get triggerOn1() { return this.mTrigger1; }
    set triggerOn1(value) { this.mTrigger1 = value; }
    get triggerOn2() { return this.mTrigger2; }
    set triggerOn2(value) { this.mTrigger2 = value; }
    get triggerOn3() { return this.mTrigger3; }
    set triggerOn3(value) { this.mTrigger3 = value; }
    get triggerOn4() { return this.mTrigger4; }
    set triggerOn4(value) { this.mTrigger4 = value; }
    get triggerOn5() { return this.mTrigger5; }
    set triggerOn5(value) { this.mTrigger5 = value; }
    get triggerOn6() { return this.mTrigger6; }
    set triggerOn6(value) { this.mTrigger6 = value; }
    get triggerOn7() { return this.mTrigger7; }
    set triggerOn7(value) { this.mTrigger7 = value; }
    get triggerOn8() { return this.mTrigger8; }
    set triggerOn8(value) { this.mTrigger8 = value; }
    get triggerOn9() { return this.mTrigger9; }
    set triggerOn9(value) { this.mTrigger9 = value; }
    get triggerOn10() { return this.mTrigger10; }
    set triggerOn10(value) { this.mTrigger10 = value; }
    receiveData(data) {
        const splitData = data.split("=");
        const sensorValue = splitData[1];
        this.rawData = data;
        switch (sensorValue) {
            case "AB":
                this.airButton = true;
                this.proximity = 1;
                break;
            case "XX":
                this.airButton = false;
                this.proximity = 999;
                break;
            default:
                const proximity = parseInt(sensorValue);
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
        this.triggerOn8 = this.proximity <= 8;
        this.triggerOn9 = this.proximity <= 9;
        this.triggerOn10 = this.proximity <= 10;
    }
    userFriendlyName() {
        return "TOF";
    }
}
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
__decorate([
    (0, Metadata_1.property)("Proximity 8 or below", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], TimeOfFlightInterface.prototype, "triggerOn8", null);
__decorate([
    (0, Metadata_1.property)("Proximity 9 or below", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], TimeOfFlightInterface.prototype, "triggerOn9", null);
__decorate([
    (0, Metadata_1.property)("Proximity 10 or below", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], TimeOfFlightInterface.prototype, "triggerOn10", null);
Nexmosphere.registerInterface(TimeOfFlightInterface, "XY240", "XY241");
class AirGestureInterface extends BaseInterface {
    mGesture = "";
    get gesture() { return this.mGesture; }
    set gesture(value) { this.mGesture = value; }
    receiveData(data) {
        this.gesture = data;
    }
    userFriendlyName() {
        return "Air";
    }
}
__decorate([
    (0, Metadata_1.property)("Gesture detected", true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], AirGestureInterface.prototype, "gesture", null);
Nexmosphere.registerInterface(AirGestureInterface, "XTEF650", "XTEF30", "XTEF630", "XTEF680");
const kButtonDescr = "Button pressed";
const kLedDescr = "0=off, 1=fast, 2=slow or 3=on";
class QuadButtonInterface extends BaseInterface {
    static kNumButtons = 4;
    buttons;
    constructor(driver, index) {
        super(driver, index);
        this.buttons = [];
        for (let ix = 0; ix < QuadButtonInterface.kNumButtons; ++ix)
            this.buttons.push({ state: false, ledData: 0 });
    }
    get button1() { return this.getBtn(1); }
    set button1(value) { this.setBtn(1, value); }
    get led1() { return this.getLed(1); }
    set led1(value) { this.setLed(1, value); }
    get button2() { return this.getBtn(2); }
    set button2(value) { this.setBtn(2, value); }
    get led2() { return this.getLed(2); }
    set led2(value) { this.setLed(2, value); }
    get button3() { return this.getBtn(3); }
    set button3(value) { this.setBtn(3, value); }
    get led3() { return this.getLed(3); }
    set led3(value) { this.setLed(3, value); }
    get button4() { return this.getBtn(4); }
    set button4(value) { this.setBtn(4, value); }
    get led4() { return this.getLed(4); }
    set led4(value) { this.setLed(4, value); }
    getBtn(oneBasedIx) {
        return this.buttons[oneBasedIx - 1].state;
    }
    setBtn(oneBasedIx, state) {
        this.buttons[oneBasedIx - 1].state = state;
    }
    getLed(oneBasedIx) {
        return this.buttons[oneBasedIx - 1].ledData;
    }
    setLed(oneBasedIx, state) {
        this.buttons[oneBasedIx - 1].ledData = state & 3;
        this.ledStatusChanged();
    }
    receiveData(data) {
        let bitMask = parseInt(data);
        bitMask = bitMask >> 1;
        for (let ix = 0; ix < this.buttons.length; ++ix) {
            let isPressed = !!(bitMask & (1 << ix));
            const btn = this.buttons[ix];
            if (btn.state !== isPressed) {
                btn.state = isPressed;
                this.changed("button" + (ix + 1));
            }
        }
    }
    ledStatusChanged() {
        let toSend = 0;
        const buttons = this.buttons;
        for (let ix = 0; ix < buttons.length; ++ix)
            toSend |= buttons[ix].ledData << ix * 2;
        this.sendCmd(toSend.toString());
    }
    sendCmd(data) {
        let myIfaceNo = (("000" + (this.index + 1)).slice(-3));
        let command = "X" + myIfaceNo + "A[" + data + "]";
        this.driver.send(command);
    }
    userFriendlyName() {
        return "Btn";
    }
}
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
Nexmosphere.registerInterface(QuadButtonInterface, "XTB4N", "XTB4N6", "XT4FW6");
class MotionInterface extends BaseInterface {
    mMotion = 0;
    set motion(value) { this.mMotion = value; }
    get motion() { return this.mMotion; }
    receiveData(data) {
        this.motion = parseInt(data);
    }
    userFriendlyName() {
        return "Motion";
    }
}
__decorate([
    (0, Metadata_1.property)("Motion detected", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], MotionInterface.prototype, "motion", null);
Nexmosphere.registerInterface(MotionInterface, "XY320");
class GenderInterface extends BaseInterface {
    static kParser = /^(0|1)(M|F|U)(X|L|H)([0-8])(X|L|H)(L|C|R|U)/;
    mIsPerson = false;
    mGender = 'U';
    mGenderConfidence = 'X';
    mAge = 0;
    mAgeConfidence = 'X';
    mGaze = 'U';
    get isPerson() { return this.mIsPerson; }
    set isPerson(value) { this.mIsPerson = value; }
    get gender() { return this.mGender; }
    set gender(value) { this.mGender = value; }
    get genderConfidence() { return this.mGenderConfidence; }
    set genderConfidence(value) { this.mGenderConfidence = value; }
    get age() { return this.mAge; }
    set age(value) { this.mAge = value; }
    get ageConfidence() { return this.mAgeConfidence; }
    set ageConfidence(value) { this.mAgeConfidence = value; }
    get gaze() { return this.mGaze; }
    set gaze(value) { this.mGaze = value; }
    receiveData(data) {
        const parseResult = GenderInterface.kParser.exec(data);
        if (parseResult) {
            this.isPerson = parseResult[0] === "1";
            this.gender = parseResult[1];
            this.genderConfidence = parseResult[2];
            this.age = parseInt(parseResult[3]);
            this.ageConfidence = parseResult[4];
            this.gaze = parseResult[5];
        }
    }
    userFriendlyName() {
        return "Gender";
    }
}
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
    (0, Metadata_1.property)("Age range 0...8", true),
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
Nexmosphere.registerInterface(GenderInterface, "XY510", "XY520");
class LidarInterface extends BaseInterface {
    static kParser = /^ZONE(\d{2})=(ENTER|EXIT):(\d{2})$/;
    static kParserWithoutCount = /^ZONE(\d{2})=(ENTER|EXIT)$/;
    mZone = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0,
    ];
    _ready = false;
    _cmdResponseWaiter;
    get ready() { return this._ready; }
    set ready(value) { this._ready = value; }
    get zone01() { return this.mZone[0]; }
    set zone01(value) { this.mZone[0] = value; }
    get zone02() { return this.mZone[1]; }
    set zone02(value) { this.mZone[1] = value; }
    get zone03() { return this.mZone[2]; }
    set zone03(value) { this.mZone[2] = value; }
    get zone04() { return this.mZone[3]; }
    set zone04(value) { this.mZone[3] = value; }
    get zone05() { return this.mZone[4]; }
    set zone05(value) { this.mZone[4] = value; }
    get zone06() { return this.mZone[5]; }
    set zone06(value) { this.mZone[5] = value; }
    get zone07() { return this.mZone[6]; }
    set zone07(value) { this.mZone[6] = value; }
    get zone08() { return this.mZone[7]; }
    set zone08(value) { this.mZone[7] = value; }
    get zone09() { return this.mZone[8]; }
    set zone09(value) { this.mZone[8] = value; }
    get zone10() { return this.mZone[9]; }
    set zone10(value) { this.mZone[9] = value; }
    get zone11() { return this.mZone[10]; }
    set zone11(value) { this.mZone[10] = value; }
    get zone12() { return this.mZone[11]; }
    set zone12(value) { this.mZone[11] = value; }
    get zone13() { return this.mZone[12]; }
    set zone13(value) { this.mZone[12] = value; }
    get zone14() { return this.mZone[13]; }
    set zone14(value) { this.mZone[13] = value; }
    get zone15() { return this.mZone[14]; }
    set zone15(value) { this.mZone[14] = value; }
    get zone16() { return this.mZone[15]; }
    set zone16(value) { this.mZone[15] = value; }
    get zone17() { return this.mZone[16]; }
    set zone17(value) { this.mZone[16] = value; }
    get zone18() { return this.mZone[17]; }
    set zone18(value) { this.mZone[17] = value; }
    get zone19() { return this.mZone[18]; }
    set zone19(value) { this.mZone[18] = value; }
    get zone20() { return this.mZone[19]; }
    set zone20(value) { this.mZone[19] = value; }
    get zone21() { return this.mZone[20]; }
    set zone21(value) { this.mZone[20] = value; }
    get zone22() { return this.mZone[21]; }
    set zone22(value) { this.mZone[21] = value; }
    get zone23() { return this.mZone[22]; }
    set zone23(value) { this.mZone[22] = value; }
    get zone24() { return this.mZone[23]; }
    set zone24(value) { this.mZone[23] = value; }
    defField(corners) {
        const coordinates = this.parseAndValidateCoordinates(corners);
        return this.defineFieldOfInterest(coordinates);
    }
    defFieldAsRect(minX, minY, maxX, maxY) {
        const x1 = Math.min(minX, maxX);
        const x2 = Math.max(minX, maxX);
        const y1 = Math.min(minY, maxY);
        const y2 = Math.max(minY, maxY);
        const coordinates = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
        if (x1 < -999 || x2 > 999 || y1 < -999 || y2 > 999) {
            throw new Error("x and y values must be between -999 and 999.");
        }
        return this.defineFieldOfInterest(coordinates);
    }
    defZone(zoneId, x, y, width, height) {
        return this.sendCmdB(this.cmdActivationZone(zoneId, x, y, width, height), RESPONSE_SETTINGS_STORED);
    }
    setZoneDelay(zoneId, delay) {
        return this.sendCmdB(this.cmdSetZoneDelay(zoneId, delay));
    }
    setZoneMinSize(zoneId, size) {
        return this.sendCmdB(this.cmdSetZoneMinObjectSize(zoneId, size));
    }
    setZoneMaxSize(zoneId, size) {
        return this.sendCmdB(this.cmdSetZoneMaxObjectSize(zoneId, size));
    }
    clearZone(zoneId) {
        return this.sendCmdB(this.cmdClearZone(zoneId));
    }
    clearAllZones() {
        return this.sendCmdB(this.cmdClearAllZones());
    }
    setDetectionMode(mode) {
        switch (mode) {
            case 1:
                return this.sendCmdS("4:1");
            case 2:
                return this.sendCmdS("4:3");
            default:
                throw new Error("Invalid detection mode");
        }
    }
    constructor(driver, index) {
        super(driver, index);
        wait(2300).then(() => {
            this.ready = true;
        });
    }
    receiveData(data, tag) {
        if (this._cmdResponseWaiter && this._cmdResponseWaiter.expectedResponse == data) {
            this._cmdResponseWaiter.register(data);
            this._cmdResponseWaiter = null;
            return;
        }
        const parseResult = LidarInterface.kParser.exec(data);
        if (parseResult) {
            const zoneId = parseInt(parseResult[1]);
            const enterOrExit = parseResult[2];
            const zoneObjectCount = parseInt(parseResult[3]);
            this.mZone[zoneId - 1] = zoneObjectCount;
            this.changed("zone" + this.pad(zoneId, 2));
            log("Zone " + zoneId + " " + enterOrExit + " " + zoneObjectCount);
            return;
        }
        const parseResultWithoutCount = LidarInterface.kParserWithoutCount.exec(data);
        if (parseResultWithoutCount) {
            const zoneId = parseInt(parseResultWithoutCount[1]);
            const enterOrExit = parseResultWithoutCount[2];
            this.mZone[zoneId - 1] += enterOrExit === "ENTER" ? 1 : -1;
            const label = "zone" + this.pad(zoneId, 2);
            this.changed(label);
            return;
        }
    }
    userFriendlyName() {
        return "Lidar";
    }
    async defineFieldOfInterest(coordinates) {
        for (let i = 0; i < coordinates.length; ++i) {
            await this.sendCmdB(this.cmdFieldOfInterestCorner(i + 1, coordinates[i][0], coordinates[i][1]), RESPONSE_SETTINGS_STORED);
        }
        await this.sendCmdB(this.cmdRecalculateFieldOfInterest());
    }
    async sendCmdS(command, expectedResponse = null) {
        await this.sendCmd(command, expectedResponse, "S");
    }
    async sendCmdB(command, expectedResponse = null) {
        await this.sendCmd(command, expectedResponse, "B");
    }
    async sendCmd(command, expectedResponse = null, prefix) {
        const raw = this.package(command, prefix);
        this.driver.send(raw);
        log("sending command: '" + raw + "'");
        if (expectedResponse) {
            return new Promise((resolve, reject) => {
                this._cmdResponseWaiter = new CmdResponseWaiter(command, expectedResponse, result => {
                    log("resolved via response");
                    resolve();
                    this._cmdResponseWaiter = null;
                }, reason => {
                    this._cmdResponseWaiter = null;
                    reject("Timeout waiting for response ... !");
                });
            });
        }
        else {
            await commandDelay();
            log("resolved via timeout");
        }
    }
    cmdFieldOfInterestCorner(i, x, y) {
        return "FOICORNER" + this.pad(i, 2) + "=" + this.signedPad(x, 3) + "," + this.signedPad(y, 3);
    }
    cmdRecalculateFieldOfInterest() {
        return "RECALCULATEFOI";
    }
    cmdActivationZone(zoneId, x, y, width, height) {
        return "ZONE" + this.pad(zoneId, 2) + "=" +
            this.signedPad(x, 3) + "," +
            this.signedPad(y, 3) + "," +
            this.pad(width, 3) + "," +
            this.pad(height, 3);
    }
    cmdSetZoneDelay(zoneId, delay) {
        return "ZONE" + this.pad(zoneId, 2) + "DELAY=" + this.pad(delay, 2);
    }
    cmdSetZoneMinObjectSize(zoneId, minObjectSize) {
        return "ZONE" + this.pad(zoneId, 2) + "MINSIZE=" + this.pad(minObjectSize, 2);
    }
    cmdSetZoneMaxObjectSize(zoneId, maxObjectSize) {
        return "ZONE" + this.pad(zoneId, 2) + "MAXSIZE=" + this.pad(maxObjectSize, 2);
    }
    cmdClearZone(zoneId) {
        return "ZONE" + this.pad(zoneId, 2) + "=CLEAR";
    }
    cmdClearAllZones() {
        return "CLEARALLZONES";
    }
    cmdAskZones() {
        return "ZONES?";
    }
    packageB(command) { return this.package(command, "B"); }
    packageS(command) { return this.package(command, "S"); }
    package(command, prefix) {
        return "X" + this.pad(this.index + 1, 3) + prefix + "[" + command + "]";
    }
    parseAndValidateCoordinates(input) {
        const coordinateRegex = /\[(-?\d+),\s*(-?\d+)]/g;
        const coordinatePartsRegex = /\[(-?\d+),\s*(-?\d+)]/;
        const matches = [...input.match(coordinateRegex)];
        if (matches.length < 3 || matches.length > 10) {
            throw new Error("Input must contain 3 to 10 coordinate pairs.");
        }
        const coordinates = matches.map(match => {
            const reMatch = coordinatePartsRegex.exec(match);
            const x = parseInt(reMatch[1]);
            const y = parseInt(reMatch[2]);
            if (x < -999 || x > 999 || y < -999 || y > 999) {
                throw new Error("Coordinates must have x and y values between -999 and 999.");
            }
            return [x, y];
        });
        return coordinates;
    }
    pad(num, length, padChar = "0") {
        let numStr = num.toString();
        while (numStr.length < length)
            numStr = padChar + numStr;
        return numStr;
    }
    signedPad(num, length) {
        const isPositive = num >= 0;
        return (isPositive ? "+" : "-") + this.pad(Math.abs(num), length);
    }
}
__decorate([
    (0, Metadata_1.property)("Ready for setup (e.g. use this as trigger for a setup Task)", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LidarInterface.prototype, "ready", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone01", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone02", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone03", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone04", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone05", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone06", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone07", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone08", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone09", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone10", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone11", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone12", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone13", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone14", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone15", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone16", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone17", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone18", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone19", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone20", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone21", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone22", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone23", null);
__decorate([
    (0, Metadata_1.property)(kZoneDescr, true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LidarInterface.prototype, "zone24", null);
__decorate([
    (0, Metadata_1.callable)("define field of interest"),
    __param(0, (0, Metadata_1.parameter)("list of 3 to 10 corner coordinates in cm - e.g. '[0,10], [22,300], [-22,400]'")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LidarInterface.prototype, "defField", null);
__decorate([
    (0, Metadata_1.callable)("define field of interest as rectangle"),
    __param(0, (0, Metadata_1.parameter)("min x in cm")),
    __param(1, (0, Metadata_1.parameter)("min y in cm")),
    __param(2, (0, Metadata_1.parameter)("max x in cm")),
    __param(3, (0, Metadata_1.parameter)("max y in cm")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number, Number]),
    __metadata("design:returntype", Promise)
], LidarInterface.prototype, "defFieldAsRect", null);
__decorate([
    (0, Metadata_1.callable)("define activation zone"),
    __param(0, (0, Metadata_1.parameter)("Zone ID (1-24)")),
    __param(1, (0, Metadata_1.parameter)("X in cm")),
    __param(2, (0, Metadata_1.parameter)("Y in cm")),
    __param(3, (0, Metadata_1.parameter)("width in cm")),
    __param(4, (0, Metadata_1.parameter)("height in cm")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number, Number, Number]),
    __metadata("design:returntype", Promise)
], LidarInterface.prototype, "defZone", null);
__decorate([
    (0, Metadata_1.callable)("set zone delay"),
    __param(0, (0, Metadata_1.parameter)("Zone ID (1-24)")),
    __param(1, (0, Metadata_1.parameter)("delay in frames\n(XQ-L2: 1 frame = ~140 ms XQ-L5: 1 frame = ~100 ms)")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], LidarInterface.prototype, "setZoneDelay", null);
__decorate([
    (0, Metadata_1.callable)("set zone min object size"),
    __param(0, (0, Metadata_1.parameter)("Zone ID (1-24)")),
    __param(1, (0, Metadata_1.parameter)("min object size in cm")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], LidarInterface.prototype, "setZoneMinSize", null);
__decorate([
    (0, Metadata_1.callable)("set zone max object size"),
    __param(0, (0, Metadata_1.parameter)("Zone ID (1-24)")),
    __param(1, (0, Metadata_1.parameter)("max object size in cm")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], LidarInterface.prototype, "setZoneMaxSize", null);
__decorate([
    (0, Metadata_1.callable)("clear zone parameters (delay, min/max object size)"),
    __param(0, (0, Metadata_1.parameter)("Zone ID (1-24)")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], LidarInterface.prototype, "clearZone", null);
__decorate([
    (0, Metadata_1.callable)("clear parameters for all zones (delay, min/max object size)"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LidarInterface.prototype, "clearAllZones", null);
__decorate([
    (0, Metadata_1.callable)("set detection / output mode (see sensor manual)"),
    __param(0, (0, Metadata_1.parameter)("1=single detection, 2=multi detection (equals mode 3 from manual!)")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], LidarInterface.prototype, "setDetectionMode", null);
const kZoneDescr = "Zone occupied";
const RESPONSE_SETTINGS_STORED = "SETTINGS-STORED";
const NEXMOSPHERE_COMMAND_DELAY_MS = 280;
function commandDelay() {
    return new Promise((resolve) => {
        wait(NEXMOSPHERE_COMMAND_DELAY_MS).then(() => {
            resolve();
        });
    });
}
class CmdResponseWaiter {
    cmd;
    expectedResponse;
    _resolve;
    _reject;
    _done = false;
    constructor(cmd, expectedResponse, _resolve, _reject, _timeoutMs = 1000) {
        this.cmd = cmd;
        this.expectedResponse = expectedResponse;
        this._resolve = _resolve;
        this._reject = _reject;
        wait(_timeoutMs).then(() => {
            if (this._done)
                return;
            this._done = true;
            this._reject(new Error("Timeout"));
        });
    }
    register(response) {
        if (response === this.expectedResponse) {
            if (this._done)
                return;
            this._done = true;
            this._resolve({
                response: response,
                sender: this,
            });
        }
    }
}
Nexmosphere.registerInterface(LidarInterface, "XQL2", "XQL5");
const DEBUG = false;
function log(...messages) {
    if (DEBUG)
        console.info(messages);
}
