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
exports.ShellySwitchGen2 = void 0;
const Metadata_1 = require("../system_lib/Metadata");
const MqttSwitchBase_1 = require("./MqttSwitchBase");
let ShellySwitchGen2 = class ShellySwitchGen2 extends MqttSwitchBase_1.MqttSwitchBase {
    mqtt;
    output;
    input;
    constructor(mqtt) {
        super(mqtt);
        this.mqtt = mqtt;
        this.output = this.indexedProperty("output", Output);
        this.input = this.indexedProperty("input", Input);
        super.initialize();
    }
    makeInput(ix) {
        return new Input(this, ix);
    }
    makeOutput(ix) {
        return new Output(this, ix);
    }
};
exports.ShellySwitchGen2 = ShellySwitchGen2;
exports.ShellySwitchGen2 = ShellySwitchGen2 = __decorate([
    (0, Metadata_1.driver)('MQTT'),
    __metadata("design:paramtypes", [Object])
], ShellySwitchGen2);
class Output extends MqttSwitchBase_1.OutputBase {
    constructor(owner, index) {
        super(owner, index);
        this.init();
    }
    sendCommand(energize) {
        this.owner.mqtt.sendText(energize ? "on" : "off", "command/switch:" + this.index);
    }
    feedbackTopic() {
        return "status/switch:" + this.index;
    }
    parseFeedback(feedback) {
        const json = JSON.parse(feedback);
        return json.output === true;
    }
}
class Input extends MqttSwitchBase_1.InputBase {
    constructor(owner, index) {
        super(owner, index);
        this.init();
    }
    feedbackTopic() {
        return "status/input:" + this.index;
    }
    parseFeedback(feedback) {
        const json = JSON.parse(feedback);
        return json.state === true;
    }
}
