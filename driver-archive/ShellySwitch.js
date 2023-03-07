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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ShellySwitch = void 0;
    var ShellySwitch = (function (_super) {
        __extends(ShellySwitch, _super);
        function ShellySwitch(mqtt) {
            var _this = _super.call(this, mqtt) || this;
            _this.mqtt = mqtt;
            _this.mConnected = false;
            _this.mOnline = false;
            var kRelayCount = 1;
            var kInputCount = 1;
            var mMaxRelaySwitchCount = 4;
            if (mqtt.options) {
                var options = JSON.parse(mqtt.options);
                kRelayCount = Math.max(1, Math.min(mMaxRelaySwitchCount, options.relays || 1));
                kInputCount = Math.max(1, Math.min(mMaxRelaySwitchCount, options.inputs || 1));
            }
            _this.relay = _this.indexedProperty("relay", Relay);
            for (var rix = 0; rix < kRelayCount; ++rix)
                _this.relay.push(new Relay(_this, rix));
            _this.input = _this.indexedProperty("input", Input);
            for (var six = 0; six < kInputCount; ++six)
                _this.input.push(new Input(_this, six));
            mqtt.subscribeTopic("online", function (sender, message) {
                _this.setOnline(message.text === 'true');
            });
            return _this;
        }
        Object.defineProperty(ShellySwitch.prototype, "connected", {
            get: function () {
                return this.mConnected;
            },
            set: function (value) {
                this.mConnected = value;
            },
            enumerable: false,
            configurable: true
        });
        ShellySwitch.prototype.setOnline = function (online) {
            if (this.mOnline !== online) {
                this.mOnline = online;
                this.updateConnected();
            }
        };
        ShellySwitch.prototype.updateConnected = function () {
            this.connected = this.mOnline && this.mqtt.connected;
        };
        __decorate([
            (0, Metadata_1.property)("Connected to broker and device online", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], ShellySwitch.prototype, "connected", null);
        ShellySwitch = __decorate([
            (0, Metadata_1.driver)('MQTT'),
            __metadata("design:paramtypes", [Object])
        ], ShellySwitch);
        return ShellySwitch;
    }(Driver_1.Driver));
    exports.ShellySwitch = ShellySwitch;
    var Relay = (function () {
        function Relay(owner, index) {
            var _this = this;
            this.owner = owner;
            this.mEnergized = false;
            this.inFeedback = false;
            owner.mqtt.subscribeTopic("relay/" + index, function (sender, message) {
                owner.setOnline(true);
                _this.inFeedback = true;
                _this.energize = message.text === 'on';
                _this.inFeedback = false;
            });
        }
        Object.defineProperty(Relay.prototype, "energize", {
            get: function () {
                return this.mEnergized;
            },
            set: function (value) {
                this.mEnergized = value;
                if (!this.inFeedback)
                    this.owner.mqtt.sendText(value ? "on" : "off", "relay/0/command");
            },
            enumerable: false,
            configurable: true
        });
        __decorate([
            (0, Metadata_1.property)("True if output relay is energized"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], Relay.prototype, "energize", null);
        return Relay;
    }());
    var Input = (function () {
        function Input(owner, index) {
            var _this = this;
            this.mActive = false;
            owner.mqtt.subscribeTopic("input/" + index, function (sender, message) {
                owner.setOnline(true);
                _this.active = message.text === '1';
            });
        }
        Object.defineProperty(Input.prototype, "active", {
            get: function () {
                return this.mActive;
            },
            set: function (value) {
                this.mActive = value;
            },
            enumerable: false,
            configurable: true
        });
        __decorate([
            (0, Metadata_1.property)("True if input switch is closed", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], Input.prototype, "active", null);
        return Input;
    }());
});
