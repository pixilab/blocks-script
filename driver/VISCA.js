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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VISCA = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
let VISCA = class VISCA extends Driver_1.Driver {
    socket;
    props = {};
    informants = [];
    powerQuery;
    mReady = false;
    retainedStateProps = {};
    pollStateTimer;
    secondAckTimer;
    moveDirection;
    joystick;
    zoomVal;
    focusVal;
    lastRecalledPreset = 0;
    lastStoredPreset = 0;
    lastStoredPresetTimeout;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.autoConnect(true);
        this.joystick = new Joystick;
        this.powerQuery = new Query('PowerQ', [0x81, 9, 4, 0], this.addProp(new Power(this)));
        this.informants.push(this.powerQuery);
        this.informants.push(new Query('AutofocusQ', [0x81, 9, 4, 0x38], this.addProp(new Autofocus(this))));
        this.informants.push(new Query('ZoomQ', [0x81, 9, 4, 0x47], this.addProp(new Zoom(this))));
        this.informants.push(new Query('FocusQ', [0x81, 9, 4, 0x48], this.addProp(new Focus(this))));
        this.informants.push(new Query('PanTiltQ', [0x81, 9, 6, 0x12], this.addProp(new Pan(this)), this.addProp(new Tilt(this))));
        this.addProp(new PanSpeed(this));
        this.addProp(new TiltSpeed(this));
        this.addProp(new AdjustPan(this));
        this.addProp(new AdjustTilt(this));
        this.addProp(new AdjustZoom(this));
        this.addProp(new AdjustFocus(this));
        socket.subscribe('connect', (sender, message) => {
            if (message.type === 'Connection')
                this.onConnectStateChanged(sender.connected);
        });
        if (socket.connected)
            this.onConnectStateChanged(true);
        socket.subscribe('bytesReceived', (sender, message) => {
            this.gotDataFromCam(message.rawData);
        });
        this.init();
        socket.subscribe('finish', () => {
            this.stopPolling();
            if (this.pollStateTimer) {
                this.pollStateTimer.cancel();
                this.pollStateTimer = undefined;
            }
        });
    }
    addRetainedStateProp(propName) {
        this.retainedStateProps[propName] = true;
    }
    get ready() {
        return this.mReady;
    }
    set ready(value) {
        this.mReady = value;
    }
    recallPreset(preset) {
        this.preset = preset + 1;
    }
    get preset() {
        return this.lastRecalledPreset;
    }
    set preset(pres) {
        this.lastRecalledPreset = pres;
        if (pres > 0)
            this.send(new RecallPresetCmd(pres - 1));
    }
    get storePreset() {
        return this.lastStoredPreset;
    }
    set storePreset(pres) {
        this.lastStoredPreset = pres;
        if (pres > 0) {
            this.send(new StorePresetCmd(pres - 1));
            if (this.lastStoredPresetTimeout)
                this.lastStoredPresetTimeout.cancel();
            this.lastStoredPresetTimeout = wait(900);
            this.lastStoredPresetTimeout.then(() => {
                this.lastStoredPresetTimeout = undefined;
                this.lastStoredPreset = 0;
                this.changed('lastStoredPreset');
            });
        }
    }
    pollState() {
        if (!this.initialPollDone) {
            for (var inf of this.informants)
                this.send(inf);
        }
        else
            this.send(this.powerQuery);
    }
    pollStateSoon(howSoonMillis = 12000) {
        this.stopPolling();
        if (!this.pollStateTimer) {
            this.pollStateTimer = wait(howSoonMillis);
            this.pollStateTimer.then(() => {
                this.pollStateTimer = undefined;
                this.init();
            });
        }
    }
    addProp(prop) {
        this.props[prop.name] = prop;
        return prop;
    }
    propValue(propName) {
        const prop = this.props[propName];
        return prop.getValue();
    }
    propValueNum(propName) {
        return Math.round(this.propValue(propName));
    }
    getMoveDirection() {
        return this.moveDirection;
    }
    setJoystickPanAxis(val) {
        this.joystick.setPanAxis(val);
        this.calculateDirection();
    }
    setJoystickTiltAxis(val) {
        this.joystick.setTiltAxis(val);
        this.calculateDirection();
    }
    changeZoom(val) {
        this.zoomVal = val;
        this.send(new AdjustZoomCmd(this));
    }
    changeFocus(val) {
        this.focusVal = val;
        this.send(new AdjustFocusCmd(this));
    }
    calculateDirection() {
        if (this.joystick.getPanAxis() === 0 && this.joystick.getTiltAxis() === 0) {
            if (this.moveDirection !== "Stop") {
                this.moveDirection = "Stop";
                this.send(new MoveDirectionCmd(this));
            }
        }
        else {
            let jX = this.joystick.getPanAxis();
            let jY = this.joystick.getTiltAxis();
            let degrees = calculateAngle(jX, jY);
            let quantizedAngle = quantizeAngle(degrees);
            let newDirection = angleToDirection(quantizedAngle);
            this.moveDirection = newDirection;
            this.send(new MoveDirectionCmd(this));
        }
    }
    toSend = {};
    sendQ = [];
    fromCam = [];
    currInstr;
    sendTimeout;
    pollTimer;
    initialPollDone;
    init() {
        if (this.socket.connected && this.socket.enabled)
            this.poll();
    }
    onConnectStateChanged(connected) {
        this.fromCam = [];
        if (connected)
            this.poll();
        else
            this.stopPolling();
        this.changed(Power.propName);
    }
    stopPolling() {
        if (this.pollTimer)
            this.pollTimer.cancel();
        this.pollTimer = undefined;
        this.initialPollDone = false;
        for (var prop in this.props) {
            if (!this.retainedStateProps[prop])
                this.props[prop].reset();
        }
    }
    poll() {
        if (this.socket.enabled) {
            this.pollState();
            if (!this.pollTimer) {
                this.pollTimer = wait(10000 * 60);
                this.pollTimer.then(() => {
                    this.pollTimer = undefined;
                    if (this.socket.connected)
                        this.poll();
                });
            }
        }
    }
    send(instr) {
        const existing = this.toSend[instr.name];
        if (existing) {
            const qix = this.sendQ.indexOf(existing);
            if (qix >= 0)
                this.sendQ[qix] = instr;
            else
                console.error("sendQ out of whack");
        }
        else
            this.sendQ.push(instr);
        this.toSend[instr.name] = instr;
        this.sendNext();
    }
    sendNext() {
        if (!this.sendTimeout && this.socket.connected) {
            const toSend = this.sendQ.shift();
            if (toSend) {
                delete this.toSend[toSend.name];
                this.currInstr = toSend;
                this.socket.sendBytes(toSend.data);
                this.sendTimeout = wait(3000);
                this.sendTimeout.then(() => {
                    const instr = this.currInstr;
                    console.warn("Timed out sending", instr.name, bytesToString(instr.data));
                    this.sendTimeout = undefined;
                    this.currInstr = undefined;
                    this.sendNext();
                });
            }
        }
    }
    instrDone() {
        if (this.sendTimeout) {
            this.sendTimeout.cancel();
            this.sendTimeout = undefined;
        }
        this.currInstr = undefined;
        this.sendNext();
    }
    gotDataFromCam(bytes) {
        this.fromCam = this.fromCam.concat(bytes);
        const len = this.fromCam.length;
        if (len >= 3) {
            const packetEnd = this.fromCam.indexOf(0xff);
            if (packetEnd >= 2) {
                this.processDataFromCam(this.fromCam.splice(0, packetEnd + 1));
            }
        }
        const excess = len - 32;
        if (excess > 0) {
            this.fromCam.splice(0, excess);
            console.warn("Discarding excessive data", excess);
        }
    }
    processDataFromCam(packet) {
        const msg = packet[1];
        switch (msg) {
            case 0x41:
                break;
            case 0x51:
                this.secondAckTimer = wait(200);
                this.secondAckTimer.then(() => this.instrDone());
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
    }
    setInitialPollDone() {
        this.initialPollDone = true;
        this.ready = true;
    }
    currInstrFailed(error) {
        const instr = this.currInstr;
        if (instr) {
            if (this.propValue(Power.propName))
                instr.reportFailed(error);
        }
        else
            console.warn("Spurious error from camera", error);
    }
};
exports.VISCA = VISCA;
__decorate([
    (0, Metadata_1.property)("Set once camera considered ready to be controlled", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], VISCA.prototype, "ready", null);
__decorate([
    (0, Metadata_1.callable)("DEPRECATED - use preset property instead. Recall memory preset (0-based)"),
    __param(0, (0, Metadata_1.parameter)("Preset to recall; 0...254")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], VISCA.prototype, "recallPreset", null);
__decorate([
    (0, Metadata_1.min)(1),
    (0, Metadata_1.max)(64),
    (0, Metadata_1.property)("Recall preset (1-based)"),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], VISCA.prototype, "preset", null);
__decorate([
    (0, Metadata_1.min)(1),
    (0, Metadata_1.max)(64),
    (0, Metadata_1.property)("Store preset (1-based)"),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], VISCA.prototype, "storePreset", null);
exports.VISCA = VISCA = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 1259 }),
    __metadata("design:paramtypes", [Object])
], VISCA);
function bytesToString(bytes) {
    var result = '';
    var hasData = false;
    for (var byte of bytes) {
        if (hasData)
            result += ' ';
        if (byte < 0x10)
            result += '0';
        result += byte.toString(16);
        hasData = true;
    }
    return result;
}
class Instr {
    name;
    data;
    constructor(name, data) {
        this.name = name;
        this.data = data;
        data.push(0xff);
    }
    handleReply(reply) {
        this.reportFailed("UNEXPECTED REPLY");
    }
    reportFailed(error) {
        console.warn("Instruction failed; ", error, this.name, bytesToString(this.data));
    }
    static pushNibs(data, value, nibCount = 4) {
        while (nibCount--)
            data.push((value >> nibCount * 4) & 0xf);
        return data;
    }
}
class Query extends Instr {
    toInform;
    constructor(name, toSend, ...toInform) {
        super(name, toSend);
        this.toInform = toInform;
    }
    handleReply(reply) {
        for (var informer of this.toInform)
            informer.inform(reply);
    }
}
class PowerCmd extends Instr {
    constructor(on) {
        super('Power', [0x81, 1, 4, 0, on ? 2 : 3]);
    }
}
class AutofocusCmd extends Instr {
    constructor(on) {
        super('Autofocus', [0x81, 1, 4, 0x38, on ? 2 : 3]);
    }
}
class ZoomCmd extends Instr {
    constructor(value) {
        super('Zoom', Instr.pushNibs([0x81, 1, 4, 0x47], Math.round(value)));
    }
}
class FocusCmd extends Instr {
    constructor(value) {
        super('Focus', Instr.pushNibs([0x81, 1, 4, 0x48], Math.round(value)));
    }
}
class StorePresetCmd extends Instr {
    constructor(presetNumber) {
        const cmd = [0x81, 1, 4, 0x3f, 1, Math.round(Math.min(254, presetNumber))];
        super('RecallPreset', cmd);
    }
}
class RecallPresetCmd extends Instr {
    constructor(presetNumber) {
        const cmd = [0x81, 1, 4, 0x3f, 2, Math.round(Math.min(254, presetNumber))];
        super('RecallPreset', cmd);
    }
}
class PanTiltCmd extends Instr {
    constructor(owner) {
        const data = [0x81, 1, 6, 2];
        data.push(owner.propValueNum(PanSpeed.propName));
        data.push(owner.propValueNum(TiltSpeed.propName));
        Instr.pushNibs(data, owner.propValueNum(Pan.propName));
        Instr.pushNibs(data, owner.propValueNum(Tilt.propName));
        super('PanTilt', data);
    }
}
class MoveDirectionCmd extends Instr {
    constructor(owner) {
        const directions = {
            "Right": [0x02, 0x03, 0xFF],
            "UpRight": [0x02, 0x01, 0xFF],
            "Up": [0x03, 0x01, 0xFF],
            "UpLeft": [0x01, 0x01, 0xFF],
            "Left": [0x01, 0x03, 0xFF],
            "DownLeft": [0x01, 0x02, 0xFF],
            "Down": [0x03, 0x02, 0xFF],
            "DownRight": [0x02, 0x02, 0xFF],
            "Stop": [0x03, 0x03, 0xFF]
        };
        let direction = owner.getMoveDirection();
        let directionData = directions[direction];
        let speedsHex = speedsToHexArray([owner.joystick.getPanSpeed(), owner.joystick.getTiltSpeed()]);
        let data = [0x81, 0x01, 0x06, 0x01];
        data = data.concat(speedsHex);
        data = data.concat(directionData);
        super("DirectionCmd", data);
    }
}
class AdjustZoomCmd extends Instr {
    constructor(owner) {
        let numberHex;
        if (owner.zoomVal === 0) {
            numberHex = 0x00;
        }
        else {
            if (owner.zoomVal < 0)
                numberHex = mapNumber("Wide", Math.abs(owner.zoomVal));
            else
                numberHex = mapNumber("Tele", Math.abs(owner.zoomVal));
        }
        let data = [0x81, 0x01, 0x04, 0x07];
        data.push(numberHex);
        data.push(0xFF);
        super("AdjustZoomCmd", data);
    }
}
class AdjustFocusCmd extends Instr {
    constructor(owner) {
        let numberHex;
        if (owner.focusVal === 0) {
            numberHex = 0x00;
        }
        else {
            if (owner.focusVal < 0)
                numberHex = mapNumber("Far", Math.abs(owner.focusVal));
            else
                numberHex = mapNumber("Near", Math.abs(owner.focusVal));
        }
        let data = [0x81, 0x01, 0x04, 0x08];
        data.push(numberHex);
        data.push(0xFF);
        super("AdjustFocusCmd", data);
    }
}
class Property {
    owner;
    name;
    defaultState;
    state;
    constructor(owner, name, defaultState) {
        this.owner = owner;
        this.name = name;
        this.defaultState = defaultState;
    }
    inform(reply) {
    }
    reset() {
        const hadState = this.state;
        this.state = undefined;
        if (hadState !== undefined)
            this.owner.changed(this.name);
    }
    getValue() {
        return this.propGS();
    }
    propGS(val) {
        if (val !== undefined) {
            const news = val !== this.state;
            this.state = val;
            if (news)
                this.desiredStateChanged(val);
        }
        var result = this.state;
        if (result === undefined)
            result = this.defaultState;
        return result;
    }
    gotDeviceState(val) {
        if (val !== undefined && this.getValue() !== val) {
            this.state = val;
            this.owner.changed(this.name);
        }
        return val;
    }
    desiredStateChanged(state) {
    }
}
class NumProp extends Property {
    min;
    max;
    constructor(owner, name, defaultState, min, max) {
        super(owner, name, defaultState);
        this.min = min;
        this.max = max;
        owner.property(name, {
            type: Number,
            description: name,
            min: min,
            max: max
        }, num => this.propGS(num));
    }
    collectNibs(reply, nibCount, offs = 2) {
        var result = 0;
        for (var nib = nibCount; nib; --nib)
            result = (result << 4) + (reply[offs++] & 0x0f);
        if (nibCount === 4 && (result & 0x8000))
            result = result - 0x10000;
        if (result < this.min || result > this.max) {
            console.warn("Nupermic feedback out of whack", this.name, result);
            result = undefined;
        }
        return result;
    }
}
class Power extends Property {
    static propName = "power";
    constructor(owner) {
        super(owner, Power.propName, false);
        owner.addRetainedStateProp(Power.propName);
        owner.property(Power.propName, { type: Boolean }, val => this.propGS(val));
    }
    desiredStateChanged(state) {
        this.owner.send(new PowerCmd(state));
        if (state)
            this.owner.pollStateSoon();
        else
            this.owner.ready = false;
    }
    propGS(val) {
        return super.propGS(val) && this.owner.connected;
    }
    inform(reply) {
        const wasOn = this.getValue();
        if (this.gotDeviceState(reply[2] === 2) && !wasOn)
            this.owner.pollStateSoon();
    }
}
class Autofocus extends Property {
    static propName = "autofocus";
    constructor(owner) {
        super(owner, Autofocus.propName, false);
        owner.addRetainedStateProp(Autofocus.propName);
        owner.property(Autofocus.propName, { type: Boolean }, val => this.propGS(val));
    }
    desiredStateChanged(state) {
        this.owner.send(new AutofocusCmd(state));
        if (!state) {
            this.owner.send(new FocusCmd(this.owner.propValueNum(Focus.propName)));
        }
    }
    inform(reply) {
        this.gotDeviceState(reply[2] === 2);
    }
}
class Zoom extends NumProp {
    constructor(owner) {
        super(owner, "zoom", 0, 0, 0x4000);
    }
    desiredStateChanged(value) {
        this.owner.send(new ZoomCmd(value));
    }
    inform(reply) {
        this.gotDeviceState(this.collectNibs(reply, 4));
    }
}
class Focus extends NumProp {
    static propName = "focus";
    constructor(owner) {
        super(owner, Focus.propName, 0, 0, 2788);
    }
    desiredStateChanged(value) {
        if (!this.owner.propValue(Autofocus.propName))
            this.owner.send(new FocusCmd(value));
    }
    inform(reply) {
        this.gotDeviceState(this.collectNibs(reply, 4));
    }
}
class Pan extends NumProp {
    static propName = "pan";
    constructor(owner) {
        super(owner, Pan.propName, 0, -2448, 2448);
    }
    desiredStateChanged(value) {
        this.owner.send(new PanTiltCmd(this.owner));
    }
    inform(reply) {
        this.gotDeviceState(this.collectNibs(reply, 4));
    }
}
class Tilt extends NumProp {
    static propName = "tilt";
    constructor(owner) {
        super(owner, Tilt.propName, 0, -356, 1296);
    }
    desiredStateChanged(value) {
        this.owner.send(new PanTiltCmd(this.owner));
    }
    inform(reply) {
        const state = this.collectNibs(reply, 4, 6);
        if (state !== undefined) {
            this.gotDeviceState(state);
            this.owner.setInitialPollDone();
        }
    }
}
class AdjustPan extends NumProp {
    static propName = "adjustPan";
    constructor(owner) {
        super(owner, AdjustPan.propName, 0, -1, 1);
        owner.addRetainedStateProp(AdjustPan.propName);
    }
    desiredStateChanged(value) {
        this.owner.setJoystickPanAxis(value);
    }
}
class AdjustTilt extends NumProp {
    static propName = "adjustTilt";
    constructor(owner) {
        super(owner, AdjustTilt.propName, 0, -1, 1);
        owner.addRetainedStateProp(AdjustTilt.propName);
    }
    desiredStateChanged(value) {
        this.owner.setJoystickTiltAxis(value);
    }
}
class AdjustZoom extends NumProp {
    static propName = "adjustZoom";
    constructor(owner) {
        super(owner, AdjustZoom.propName, 0, -1, 1);
        owner.addRetainedStateProp(AdjustZoom.propName);
    }
    desiredStateChanged(value) {
        this.owner.changeZoom(value);
    }
}
class AdjustFocus extends NumProp {
    static propName = "adjustFocus";
    constructor(owner) {
        super(owner, AdjustFocus.propName, 0, -1, 1);
        owner.addRetainedStateProp(AdjustFocus.propName);
    }
    desiredStateChanged(value) {
        this.owner.changeFocus(value);
    }
}
class PanSpeed extends NumProp {
    static propName = "panSpeed";
    constructor(owner) {
        super(owner, PanSpeed.propName, 24, 1, 24);
        owner.addRetainedStateProp(PanSpeed.propName);
    }
}
class TiltSpeed extends NumProp {
    static propName = "tiltSpeed";
    constructor(owner) {
        super(owner, TiltSpeed.propName, 24, 1, 20);
        owner.addRetainedStateProp(TiltSpeed.propName);
    }
}
class Joystick {
    panAxis;
    panSpeed;
    tiltAxis;
    tiltSpeed;
    constructor() {
        this.panAxis = 0;
        this.panSpeed = 0;
        this.tiltAxis = 0;
        this.tiltSpeed = 0;
    }
    getPanAxis() {
        return this.panAxis;
    }
    setPanAxis(newVal) {
        this.panAxis = newVal;
        this.panSpeed = mapAbsoluteValue(newVal, [1, 24]);
    }
    getTiltAxis() {
        return this.tiltAxis;
    }
    setTiltAxis(newVal) {
        this.tiltAxis = newVal;
        this.tiltSpeed = mapAbsoluteValue(newVal, [1, 20]);
    }
    getPanSpeed() {
        return this.panSpeed;
    }
    getTiltSpeed() {
        return this.tiltSpeed;
    }
}
function calculateAngle(x, y) {
    if (x < -1 || x > 1 || y < -1 || y > 1) {
        throw new Error("X and Y values must be between -1 and 1.");
    }
    const radians = Math.atan2(y, x);
    let degrees = radians * (180 / Math.PI);
    if (degrees < 0) {
        degrees += 360;
    }
    degrees = (360 - degrees) % 360;
    return degrees;
}
function quantizeAngle(angle) {
    const quantized = Math.round(angle / 45) * 45;
    return quantized % 360;
}
function angleToDirection(angle) {
    const directions = {
        0: "Right",
        45: "UpRight",
        90: "Up",
        135: "UpLeft",
        180: "Left",
        225: "DownLeft",
        270: "Down",
        315: "DownRight"
    };
    return directions[angle];
}
function speedsToHexArray([num1, num2]) {
    let hexVal1 = `0x${num1.toString(16).toUpperCase()}`;
    let hexVal2 = `0x${num2.toString(16).toUpperCase()}`;
    return [parseInt(hexVal1), parseInt(hexVal2)];
}
function mapAbsoluteValue(value, range) {
    const [min, max] = range;
    const absoluteValue = Math.abs(value);
    const mappedValue = absoluteValue * (max - min) + min;
    return Math.round(mappedValue);
}
function mapNumber(type, input) {
    if (input < 0 || input > 1) {
        throw new Error('Input must be between 0 and 1');
    }
    const mappedNumber = Math.round(input * 7);
    let baseValue;
    if (type === 'Wide' || type === 'Near') {
        baseValue = 0x3;
    }
    else
        baseValue = 0x2;
    return (baseValue << 4) | mappedNumber;
}
