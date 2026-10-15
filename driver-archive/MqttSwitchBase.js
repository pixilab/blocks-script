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
exports.InputBase = exports.OutputBase = exports.MqttSwitchBase = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
class MqttSwitchBase extends Driver_1.Driver {
    mqtt;
    mConnected = false;
    mOnline = false;
    constructor(mqtt) {
        super(mqtt);
        this.mqtt = mqtt;
    }
    initialize() {
        const kMaxIOCount = 32;
        let outputCount = 4;
        let inputCount = 4;
        const rawOptions = this.mqtt.options;
        if (rawOptions) {
            let options = JSON.parse(rawOptions);
            outputCount = Math.max(0, Math.min(kMaxIOCount, options.outputs || 0));
            inputCount = Math.max(0, Math.min(kMaxIOCount, options.inputs || 0));
        }
        for (let rix = 0; rix < outputCount; ++rix)
            this.output.push(this.makeOutput(rix));
        for (let six = 0; six < inputCount; ++six)
            this.input.push(this.makeInput(six));
        this.mqtt.subscribeTopic("online", (sender, message) => {
            this.setOnline(message.text === 'true');
        });
    }
    get connected() {
        return this.mConnected;
    }
    set connected(value) {
        this.mConnected = value;
    }
    setOnline(online) {
        if (this.mOnline !== online) {
            this.mOnline = online;
            this.updateConnected();
        }
    }
    updateConnected() {
        this.connected = this.mOnline && this.mqtt.connected;
    }
}
exports.MqttSwitchBase = MqttSwitchBase;
__decorate([
    (0, Metadata_1.property)("Connected to broker and device online", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], MqttSwitchBase.prototype, "connected", null);
class OutputBase {
    owner;
    index;
    active = false;
    inFeedback = false;
    constructor(owner, index) {
        this.owner = owner;
        this.index = index;
    }
    init() {
        this.owner.mqtt.subscribeTopic(this.feedbackTopic(), (sender, message) => {
            this.owner.setOnline(true);
            const newState = this.parseFeedback(message.text);
            this.inFeedback = true;
            this.on = newState;
            this.inFeedback = false;
        });
    }
    get on() {
        return this.active;
    }
    set on(value) {
        this.active = value;
        if (!this.inFeedback)
            this.sendCommand(value);
    }
}
exports.OutputBase = OutputBase;
__decorate([
    (0, Metadata_1.property)("True if output is active"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], OutputBase.prototype, "on", null);
class InputBase {
    owner;
    index;
    mActive = false;
    constructor(owner, index) {
        this.owner = owner;
        this.index = index;
    }
    init() {
        this.owner.mqtt.subscribeTopic(this.feedbackTopic(), (sender, message) => {
            this.owner.setOnline(true);
            this.active = this.parseFeedback(message.text);
        });
    }
    get active() {
        return this.mActive;
    }
    set active(value) {
        this.mActive = value;
    }
}
exports.InputBase = InputBase;
__decorate([
    (0, Metadata_1.property)("True if input switch is closed", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], InputBase.prototype, "active", null);
