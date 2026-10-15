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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SamsungMDC = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
const kHeaderData = 0xAA;
const kAckData = 0x41;
let SamsungMDC = class SamsungMDC extends Driver_1.Driver {
    socket;
    mId = 0;
    discarded;
    poller;
    correctionRetry;
    powerProp;
    volumeProp;
    inputProp;
    propList;
    currCmd;
    currResolver;
    currRejector;
    cmdTimeout;
    receivedData;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        if (socket.enabled) {
            socket.autoConnect(true);
            socket.enableWakeOnLAN();
            this.propList = [];
            this.propList.push(this.powerProp = new Power(this));
            this.inputProp = new NumProp(this, "input", "Source input number; HDMI1=33, HDMI2=34, URL=99", 0x14, 0x21, 9, 99);
            this.propList.push(this.inputProp);
            this.propList.push(this.volumeProp = new Volume(this));
            socket.subscribe('connect', (sender, message) => this.connectStateChanged(message.type));
            socket.subscribe('bytesReceived', (sender, msg) => this.dataReceived(msg.rawData));
            socket.subscribe('finish', sender => this.discard());
            if (socket.connected)
                this.pollNow();
        }
    }
    isOfTypeName(typeName) {
        return typeName === "SamsungMDC" ? this : null;
    }
    wakeUp() {
        this.socket.wakeOnLAN();
    }
    set id(id) {
        this.mId = id;
    }
    get id() {
        return this.mId;
    }
    discard() {
        this.discarded = true;
        this.cancelPollAndRetry();
    }
    cancelPollAndRetry() {
        if (this.poller) {
            this.poller.cancel();
            this.poller = undefined;
        }
        if (this.correctionRetry) {
            this.correctionRetry.cancel();
            this.correctionRetry = undefined;
        }
        if (this.cmdTimeout) {
            this.cmdTimeout.cancel();
            this.cmdTimeout = undefined;
        }
    }
    errorMsg(...messages) {
        messages.unshift(this.socket.fullName);
        console.error(messages);
    }
    warnMsg(...messages) {
        messages.unshift(this.socket.fullName);
        console.warn(messages);
    }
    getPropToSend() {
        for (let p of this.propList)
            if (p.needsCorrection())
                return p;
    }
    sendCorrection() {
        if (this.okToSendNewCommand()) {
            const prop = this.getPropToSend();
            if (prop) {
                if (prop.canSendOffline() || (this.powerProp.getCurrent() && this.socket.connected)) {
                    debugMsg("sendCorrection prop", prop.name, "from", prop.getCurrent(), "to", prop.get());
                    const promise = prop.correct();
                    if (promise) {
                        promise.catch(() => {
                            if (this.getPropToSend())
                                this.retryCorrectionSoon();
                        });
                    }
                    else
                        this.retryCorrectionSoon();
                }
            }
        }
        else
            debugMsg("sendCorrection NOT", this.currCmd);
    }
    okToSendNewCommand() {
        return !this.discarded && !this.currCmd && !this.correctionRetry;
    }
    retryCorrectionSoon() {
        if (!this.correctionRetry && !this.discarded) {
            this.correctionRetry = wait(500);
            this.correctionRetry.then(() => {
                this.correctionRetry = undefined;
                this.sendCorrection();
            });
        }
    }
    connectStateChanged(type) {
        debugMsg("connectStateChanged", type, this.socket.connected);
        if (type === 'Connection') {
            if (!this.socket.connected)
                this.cancelPollAndRetry();
            else
                this.pollNow();
        }
        else if (type === 'ConnectionFailed')
            this.powerProp.updateCurrent(false);
    }
    pollSoon(howSoonMillis = 5333) {
        if (!this.discarded) {
            this.poller = wait(howSoonMillis);
            this.poller.then(() => {
                this.poller = undefined;
                if (this.okToSendNewCommand())
                    this.pollNow();
                else
                    this.pollSoon(600);
            });
        }
    }
    pollNow() {
        this.startRequest(new Command("status", this.id, 0x00)).then(reply => {
            if (reply.length >= 4) {
                debugMsg("Got status pollSoon reply", reply);
                this.powerProp.updateCurrent(!!reply[0]);
                let volNorm = reply[1];
                if (volNorm == 0xff)
                    volNorm = 0;
                volNorm = volNorm / 100;
                this.volumeProp.updateCurrent(volNorm);
                this.inputProp.updateCurrent(reply[3]);
            }
        });
        this.pollSoon();
    }
    dataReceived(rawData) {
        let buf = this.receivedData;
        rawData = this.makeJSArray(rawData);
        buf = this.receivedData = buf ? buf.concat(rawData) : rawData;
        debugMsg("Got some data back");
        if (buf.length > 5 + 1) {
            if (this.currCmd) {
                if (buf[0] !== kHeaderData)
                    this.currCmdErr('Invalid header in reply');
                else if (buf[4] === kAckData) {
                    let responseType = buf[1];
                    if (buf[1] === 0xff) {
                        responseType = buf[5];
                        if (responseType === this.currCmd.cmdType) {
                            const numParams = buf[3] - (5 - 3);
                            const paramOffs = 5 + 1;
                            if (buf.length >= paramOffs + numParams) {
                                this.requestSuccess(buf.slice(paramOffs, paramOffs + numParams));
                                debugMsg("ACK for cmd type", responseType);
                            }
                        }
                        else
                            this.currCmdErr('Unexpected response type ' + responseType);
                    }
                    else
                        this.currCmdErr('Unexpected response command' + responseType);
                }
                else
                    this.currCmdErr('NAK response');
            }
            else
                this.warnMsg("Unexpected data from device", rawData.toString());
        }
    }
    currCmdErr(excuse) {
        this.requestFailure(excuse + ' ' + this.currCmd.toString());
    }
    startRequest(cmd) {
        this.currCmd = cmd;
        this.receivedData = undefined;
        this.socket.sendBytes(cmd.getBytes());
        const result = new Promise((resolve, reject) => {
            this.currResolver = resolve;
            this.currRejector = reject;
        });
        this.cmdTimeout = wait(10000);
        this.cmdTimeout.then(() => {
            this.requestFailure("Timeout for " + cmd);
            if (cmd.name !== 'power') {
                this.socket.disconnect();
                this.powerProp.updateCurrent(false);
            }
        });
        return result;
    }
    requestSuccess(result) {
        debugMsg("Request succeded", this.currCmd.name);
        if (this.currResolver)
            this.currResolver(result);
        this.requestClear();
        asap(() => this.sendCorrection());
    }
    requestFailure(msg) {
        debugMsg("Request failed", msg || this.currCmd.name);
        const rejector = this.currRejector;
        this.requestClear();
        if (rejector)
            rejector(msg);
    }
    requestClear() {
        if (this.cmdTimeout)
            this.cmdTimeout.cancel();
        this.cmdTimeout = undefined;
        this.currCmd = undefined;
        this.currRejector = undefined;
        this.currResolver = undefined;
        this.receivedData = undefined;
    }
};
exports.SamsungMDC = SamsungMDC;
__decorate([
    (0, Metadata_1.property)("The target ID (rarely used over network)"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(254),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], SamsungMDC.prototype, "id", null);
exports.SamsungMDC = SamsungMDC = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 1515 }),
    __metadata("design:paramtypes", [Object])
], SamsungMDC);
class Command {
    name;
    cmdType;
    cmd;
    constructor(name, id, cmdType, paramByte) {
        this.name = name;
        this.cmdType = cmdType;
        const cmd = [];
        cmd.push(kHeaderData);
        cmd.push(cmdType);
        cmd.push(id);
        if (paramByte !== undefined) {
            cmd.push(1);
            paramByte = Math.max(0, Math.round(paramByte)) & 0xff;
            cmd.push(paramByte);
        }
        else
            cmd.push(0);
        let checksum = 0;
        const count = cmd.length;
        for (let ix = 1; ix < count; ++ix)
            checksum += cmd[ix];
        cmd.push(checksum & 0xff);
        this.cmd = cmd;
    }
    getBytes() {
        return this.cmd;
    }
    toString() {
        return this.name + ' ' + this.cmd.toString();
    }
}
class Prop {
    driver;
    name;
    cmdByte;
    current;
    wanted;
    constructor(driver, type, name, description, cmdByte, current) {
        this.driver = driver;
        this.name = name;
        this.cmdByte = cmdByte;
        this.current = current;
        driver.property(name, {
            type: type,
            description: description,
        }, setValue => {
            if (setValue !== undefined) {
                if (this.set(setValue))
                    this.driver.sendCorrection();
            }
            return this.get();
        });
    }
    canSendOffline() {
        return false;
    }
    get() {
        return this.wanted != undefined ? this.wanted : this.current;
    }
    getCurrent() {
        return this.current;
    }
    set(state) {
        const news = this.wanted !== state;
        this.wanted = state;
        return news;
    }
    updateCurrent(newState) {
        const lastCurrent = this.current;
        this.current = newState;
        if (lastCurrent !== newState && newState !== undefined) {
            debugMsg("updateCurrent", this.cmdByte, newState);
            if (lastCurrent === this.wanted) {
                this.wanted = newState;
                this.notifyListeners();
                debugMsg("updateCurrent wag dog", this.name, newState);
            }
            else if (this.wanted === undefined)
                this.notifyListeners();
        }
    }
    notifyListeners() {
        this.driver.changed(this.name);
    }
    needsCorrection() {
        return this.wanted !== undefined &&
            this.current !== this.wanted;
    }
    correctWithValue(value) {
        return this.correct2(new Command(this.name, this.driver.id, this.cmdByte, value));
    }
    correct2(cmd) {
        const wanted = this.wanted;
        const result = this.driver.startRequest(cmd);
        result.then(() => {
            this.current = wanted;
            debugMsg("correct2 succeeded for command type", this.cmdByte, "with wanted value", wanted);
        });
        return result;
    }
}
class BoolProp extends Prop {
    constructor(driver, propName, description, cmdByte, current) {
        super(driver, Boolean, propName, description, cmdByte, current);
    }
    correct() {
        return this.correctWithValue(this.wanted ? 1 : 0);
    }
}
class Power extends BoolProp {
    constructor(driver) {
        super(driver, "power", "Power display on/off", 0x11, false);
    }
    canSendOffline() {
        return this.wanted;
    }
    correct() {
        if (this.wanted)
            this.driver.wakeUp();
        return super.correct();
    }
}
class NumProp extends Prop {
    min;
    max;
    constructor(driver, propName, description, cmdByte, current, min = 0, max = 1) {
        super(driver, Number, propName, description, cmdByte, current);
        this.min = min;
        this.max = max;
    }
    correct(wantedValue = this.wanted) {
        return this.correctWithValue(wantedValue);
    }
    set(v) {
        if (v < this.min || v > this.max) {
            console.error("Value out of range for", this.name, v);
            return false;
        }
        return super.set(v);
    }
}
class Volume extends NumProp {
    constructor(driver) {
        super(driver, "volume", "Volume level, normalized 0...1", 0x12, 1);
    }
    correct() {
        return super.correct(this.wanted * 100);
    }
}
function debugMsg(...messages) {
}
