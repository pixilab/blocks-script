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
define(["require", "exports", "system_lib/Metadata", "./MqttSwitchBase"], function (require, exports, Metadata_1, MqttSwitchBase_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ShellySwitchGen1 = void 0;
    var ShellySwitchGen1 = (function (_super) {
        __extends(ShellySwitchGen1, _super);
        function ShellySwitchGen1(mqtt) {
            var _this = _super.call(this, mqtt) || this;
            _this.mqtt = mqtt;
            _this.output = _this.indexedProperty("relay", Output);
            _this.input = _this.indexedProperty("input", Input);
            _super.prototype.initialize.call(_this);
            return _this;
        }
        ShellySwitchGen1.prototype.makeInput = function (ix) {
            return new Input(this, ix);
        };
        ShellySwitchGen1.prototype.makeOutput = function (ix) {
            return new Output(this, ix);
        };
        ShellySwitchGen1 = __decorate([
            (0, Metadata_1.driver)('MQTT'),
            __metadata("design:paramtypes", [Object])
        ], ShellySwitchGen1);
        return ShellySwitchGen1;
    }(MqttSwitchBase_1.MqttSwitchBase));
    exports.ShellySwitchGen1 = ShellySwitchGen1;
    var Output = (function (_super) {
        __extends(Output, _super);
        function Output(owner, index) {
            var _this = _super.call(this, owner, index) || this;
            _this.init();
            return _this;
        }
        Output.prototype.sendCommand = function (energize) {
            this.owner.mqtt.sendText(energize ? "on" : "off", "relay/" + this.index + "/command");
        };
        Output.prototype.feedbackTopic = function () {
            return "relay/" + this.index;
        };
        Output.prototype.parseFeedback = function (feedback) {
            return feedback === 'on';
        };
        return Output;
    }(MqttSwitchBase_1.OutputBase));
    var Input = (function (_super) {
        __extends(Input, _super);
        function Input(owner, index) {
            var _this = _super.call(this, owner, index) || this;
            _this.init();
            return _this;
        }
        Input.prototype.feedbackTopic = function () {
            return "input/" + this.index;
        };
        Input.prototype.parseFeedback = function (feedback) {
            return feedback === '1';
        };
        return Input;
    }(MqttSwitchBase_1.InputBase));
});
