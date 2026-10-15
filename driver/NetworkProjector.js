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
exports.NumState = exports.BoolState = exports.State = exports.NetworkProjector = void 0;
const Metadata_1 = require("../system_lib/Metadata");
const Driver_1 = require("../system_lib/Driver");
class NetworkProjector extends Driver_1.Driver {
    socket;
    awake;
    discarded;
    connecting;
    poller;
    connectDly;
    correctionRetry;
    connectionTimeout;
    keepAlive = true;
    connTimeout = 3000;
    pollInterval = 21333;
    failedToConnect = false;
    _power;
    propList;
    currCmd;
    currResolver;
    currRejector;
    cmdTimeout;
    sendFailedReported;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        this.propList = [];
        this.awake = false;
        socket.subscribe('connect', (sender, message) => {
            if (message.type === 'Connection') {
                if (this.socket.connected && this.keepAlive)
                    this.infoMsg("connected");
                else if (!this.socket.connected && this.keepAlive && this.socket.enabled)
                    this.warnMsg("connection dropped", message.type);
                this.connectStateChanged();
            }
        });
        socket.subscribe('textReceived', (sender, msg) => {
            this.resetTimeout();
            this.textReceived(msg.text);
        });
        socket.subscribe('finish', () => this.discard());
    }
    setKeepAlive(newState) {
        if (newState && !this.keepAlive && this.connectionTimeout) {
            this.connectionTimeout.cancel();
            this.connectionTimeout = undefined;
        }
        this.keepAlive = newState;
    }
    setPollFrequency(millis) {
        this.pollInterval = millis;
    }
    addState(state) {
        this.propList.push(state);
        state.setDriver(this);
    }
    isOfTypeName(typeName) {
        return typeName === "NetworkProjector" ? this : null;
    }
    set power(on) {
        if (this._power.set(on))
            this.sendCorrection();
    }
    get power() {
        return this._power.get();
    }
    sendText(text) {
        if (this.socket.enabled) {
            this.resetTimeout();
            if (this.socket.connected)
                return this.socket.sendText(text, this.getDefaultEoln());
            else {
                return this.attemptConnect().then(() => this.socket.sendText(text, this.getDefaultEoln()));
            }
        }
    }
    getDefaultEoln() {
        return undefined;
    }
    get connected() {
        return this.awake;
    }
    set connected(conn) {
        this.awake = conn;
    }
    discard() {
        this.discarded = true;
        if (this.poller) {
            this.poller.cancel();
            this.poller = undefined;
        }
        if (this.correctionRetry) {
            this.correctionRetry.cancel();
            this.correctionRetry = undefined;
        }
        if (this.connectionTimeout) {
            this.connectionTimeout.cancel();
            this.connectionTimeout = undefined;
        }
        if (this.connectDly) {
            this.connectDly.cancel();
            this.connectDly = undefined;
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
    infoMsg(...messages) {
        messages.unshift(this.socket.fullName);
        console.info(messages);
    }
    reqToSend() {
        for (var p of this.propList)
            if (p.needsCorrection())
                return p;
    }
    okToSendCommand() {
        return !this.currCmd;
    }
    sendCorrection() {
        if (!this.keepAlive && !this.awake) {
            this.attemptConnect(true);
            return false;
        }
        if (!this.okToSendCommand() || !this.awake) {
            return false;
        }
        const req = this.reqToSend();
        if (req) {
            if (!this.socket.connected) {
                if (!this.connectDly)
                    this.attemptConnect();
            }
            else {
                this.resetTimeout();
                req.correct(this)
                    .then(() => this.sendFailedReported = false, () => {
                    if (this.reqToSend())
                        this.retryCorrectionSoon();
                });
                return true;
            }
        }
        return false;
    }
    retryCorrectionSoon() {
        if (!this.correctionRetry) {
            this.correctionRetry = wait(20000);
            this.correctionRetry.then(() => {
                this.correctionRetry = undefined;
                this.sendCorrection();
            });
        }
    }
    attemptConnect(sendCorrection) {
        if (!this.socket.connected && !this.connecting && this.socket.enabled) {
            const connPromise = this.socket.connect();
            connPromise.then(() => this.justConnected(sendCorrection), error => this.connectStateChanged());
            this.connecting = true;
            return connPromise;
        }
        return Promise.resolve();
    }
    justConnected(sendCorrection) {
        if (!this.keepAlive) {
            this.failedToConnect = false;
            this.resetTimeout();
            if (sendCorrection)
                this.sendCorrection();
        }
    }
    resetTimeout() {
        if (!this.keepAlive) {
            if (this.connectionTimeout)
                this.connectionTimeout.cancel();
            this.connectionTimeout = wait(this.connTimeout);
            this.connectionTimeout.then(() => {
                this.socket.disconnect();
            });
        }
    }
    connectStateChanged() {
        this.connecting = false;
        if (!this.socket.connected) {
            if (this.keepAlive) {
                this.connected = false;
                this.connectSoon();
            }
            else {
                if (this.failedToConnect) {
                    this.warnMsg("connection dropped");
                    this.connected = false;
                    this.connectSoon();
                }
                else
                    this.failedToConnect = true;
            }
            if (this.correctionRetry)
                this.correctionRetry.cancel();
            if (this.reqToSend())
                this.connectSoon();
        }
    }
    disconnectAndTryAgainSoon(howSoonMillis) {
        if (this.socket.connected)
            this.socket.disconnect();
        this.connectSoon(howSoonMillis);
    }
    disconnect() {
        if (this.socket.connected)
            this.socket.disconnect();
    }
    connectSoon(howSoonMillis) {
        if (!this.connectDly) {
            this.connectDly = wait(howSoonMillis || 8000);
            this.connectDly.then(() => {
                this.connectDly = undefined;
                this.attemptConnect();
            });
        }
    }
    poll() {
        if (this.socket.enabled) {
            this.poller = wait(this.pollInterval);
            this.poller.then(() => {
                var continuePolling = true;
                if (!this.socket.connected) {
                    if (!this.connecting && !this.connectDly)
                        this.attemptConnect();
                }
                else
                    continuePolling = this.pollStatus();
                if (continuePolling && !this.discarded)
                    this.poll();
            });
        }
    }
    pollStatus() {
        return false;
    }
    sendFailed(err) {
        if (!this.sendFailedReported) {
            this.warnMsg("Failed sending command", this.currCmd, err);
            this.sendFailedReported = true;
        }
        const rejector = this.currRejector;
        if (rejector)
            rejector("Send failed with " + err + ", for " + this.currCmd);
        this.requestFinished();
        if (!rejector)
            this.sendCorrection();
    }
    startRequest(cmd) {
        this.currCmd = cmd;
        const result = new Promise((resolve, reject) => {
            this.currResolver = resolve;
            this.currRejector = reject;
        });
        this.cmdTimeout = wait(4000);
        this.cmdTimeout.then(() => this.requestFailure("Timeout for " + cmd));
        return result;
    }
    requestSuccess(result) {
        if (this.currResolver)
            this.currResolver(result);
        this.requestClear();
    }
    requestFailure(msg) {
        if (this.power)
            this.warnMsg("Request failed", msg);
        const rejector = this.currRejector;
        this.requestClear();
        if (rejector)
            rejector(msg);
    }
    requestFinished() {
        if (this.currRejector)
            this.requestFailure("Request failed for unspecific reason");
    }
    requestClear() {
        if (this.cmdTimeout)
            this.cmdTimeout.cancel();
        delete this.cmdTimeout;
        delete this.currCmd;
        delete this.currRejector;
        delete this.currResolver;
    }
}
exports.NetworkProjector = NetworkProjector;
__decorate([
    (0, Metadata_1.property)("Power on/off"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], NetworkProjector.prototype, "power", null);
__decorate([
    (0, Metadata_1.callable)("Send raw command string to device"),
    __param(0, (0, Metadata_1.parameter)("What to send")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NetworkProjector.prototype, "sendText", null);
__decorate([
    (0, Metadata_1.property)("True if device is considered to be online", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], NetworkProjector.prototype, "connected", null);
class State {
    baseCmd;
    propName;
    correctionApprover;
    current;
    wanted;
    driver;
    constructor(baseCmd, propName, correctionApprover) {
        this.baseCmd = baseCmd;
        this.propName = propName;
        this.correctionApprover = correctionApprover;
    }
    setDriver(driver) {
        this.driver = driver;
    }
    get() {
        return this.wanted != undefined ? this.wanted : this.current;
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
            if (lastCurrent === this.wanted) {
                this.wanted = newState;
                this.notifyListeners();
            }
            else if (this.wanted === undefined)
                this.notifyListeners();
        }
    }
    getCurrent() {
        return this.current;
    }
    notifyListeners() {
        if (this.driver && this.propName)
            this.driver.changed(this.propName);
    }
    needsCorrection() {
        return this.wanted !== undefined &&
            this.current !== this.wanted &&
            (!this.correctionApprover || this.correctionApprover());
    }
    correct2(drvr, arg) {
        const wanted = this.wanted;
        const result = drvr.request(this.baseCmd, arg);
        result.then(() => {
            this.current = wanted;
        });
        return result;
    }
}
exports.State = State;
class BoolState extends State {
    correct(drvr) {
        return this.correct2(drvr, this.wanted ? '1' : '0');
    }
}
exports.BoolState = BoolState;
class NumState extends State {
    baseCmd;
    min;
    max;
    constructor(baseCmd, propName, min, max, correctionApprover) {
        super(baseCmd, propName, correctionApprover);
        this.baseCmd = baseCmd;
        this.min = min;
        this.max = max;
    }
    correct(drvr) {
        return this.correct2(drvr, this.wanted.toString());
    }
    updateCurrent(newState) {
        if (!isNaN(newState))
            super.updateCurrent(newState);
    }
    needsCorrection() {
        return !isNaN(this.wanted) && super.needsCorrection();
    }
    set(v) {
        if (!(typeof v === 'number') || isNaN(v)) {
            console.error("NetworkProjector value not numeric", this.baseCmd, v);
            return false;
        }
        if (v < this.min || v > this.max) {
            console.error("NetworkProjector value out of range for", this.baseCmd, v);
            return false;
        }
        return super.set(v);
    }
    get() {
        var result = super.get();
        if (typeof result !== 'number' || isNaN(result)) {
            console.warn("NetworkProjector unknown/invalid current value for", this.propName, result);
            result = undefined;
        }
        return result;
    }
}
exports.NumState = NumState;
