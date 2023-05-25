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
define(["require", "exports", "../system_lib/Driver", "../system_lib/Metadata"], function (require, exports, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BasicConfigurableMQTT = void 0;
    var BasicConfigurableMQTT = (function (_super) {
        __extends(BasicConfigurableMQTT, _super);
        function BasicConfigurableMQTT(mqtt) {
            var _this = _super.call(this, mqtt) || this;
            _this.mqtt = mqtt;
            _this.properties = {};
            if (mqtt.options) {
                try {
                    var propSettingsList = JSON.parse(mqtt.options);
                    if (Array.isArray(propSettingsList)) {
                        _this.doPropSettings(propSettingsList);
                        _this.init();
                    }
                    else
                        console.error("Custom Options incalid (expected an array)");
                }
                catch (parseError) {
                    console.error("Can't parse Custom Options", parseError);
                }
            }
            else
                console.error("No Custom Options specified");
            return _this;
        }
        BasicConfigurableMQTT_1 = BasicConfigurableMQTT;
        BasicConfigurableMQTT.prototype.doPropSettings = function (propSettingsList) {
            for (var _i = 0, propSettingsList_1 = propSettingsList; _i < propSettingsList_1.length; _i++) {
                var ps = propSettingsList_1[_i];
                if (typeof ps.property !== "string" && typeof ps.subTopic !== "string")
                    throw "Each property setting must have property and subTopic string items";
                var dataType = ps.dataType || "String";
                switch (dataType) {
                    case "Number":
                        this.makeNumProp(ps);
                        break;
                    case "Boolean":
                        this.makeBoolProp(ps);
                        break;
                    case "String":
                        this.makeStrProp(ps);
                        break;
                    default:
                        throw "Bad dataType " + dataType;
                }
            }
        };
        BasicConfigurableMQTT.prototype.init = function () {
            var _this = this;
            if (this.mqtt.connected)
                this.doSubscribe();
            this.mqtt.subscribe('connect', function (emitter, message) {
                if (message.type === "Connection" && _this.mqtt.connected)
                    _this.doSubscribe();
            });
        };
        BasicConfigurableMQTT.prototype.doSubscribe = function () {
            var _this = this;
            for (var subTopic in this.properties) {
                if (!this.properties[subTopic].settings.writeOnly) {
                    this.mqtt.subscribeTopic(subTopic, function (emitter, message) {
                        return _this.dataFromSubTopic(message.subTopic, message.text);
                    });
                }
            }
        };
        BasicConfigurableMQTT.prototype.dataFromSubTopic = function (subTopic, value) {
            var subscriber = this.properties[subTopic];
            if (subscriber) {
                try {
                    var typedValue = BasicConfigurableMQTT_1.coerceToType(subscriber.settings, value);
                    subscriber.handler(typedValue, true);
                    this.changed(subscriber.settings.property);
                }
                catch (coercionError) {
                    console.error("Unable to coerce to", subscriber.settings.dataType, value);
                }
            }
            else
                console.error("Data from unexpected subtopic", subTopic);
        };
        BasicConfigurableMQTT.coerceToType = function (setting, rawValue) {
            var result = rawValue;
            switch (setting.dataType) {
                case 'Number':
                    result = parseFloat(rawValue);
                    if (isNaN(result))
                        throw "Not a number";
                    break;
                case "Boolean":
                    result = BasicConfigurableMQTT_1.parseBool(setting, rawValue);
                    break;
            }
            return result;
        };
        BasicConfigurableMQTT.parseBool = function (setting, rawValue) {
            if (rawValue === (setting.trueValue || "true"))
                return true;
            if (rawValue === (setting.falseValue || "false"))
                return false;
            throw "Invalid boolean value";
        };
        BasicConfigurableMQTT.prototype.registerProp = function (ps, propOpts, sgFunc) {
            this.properties[ps.subTopic] = {
                settings: ps,
                handler: sgFunc
            };
            this.property(ps.property, propOpts, sgFunc);
        };
        BasicConfigurableMQTT.optsFromPropSetting = function (ps) {
            return {
                type: ps.dataType,
                readOnly: !!ps.readOnly,
                description: ps.description
            };
        };
        BasicConfigurableMQTT.prototype.makeNumProp = function (ps) {
            var _this = this;
            var opts = BasicConfigurableMQTT_1.optsFromPropSetting(ps);
            if (ps.min !== undefined)
                opts.min = ps.min;
            if (ps.max !== undefined)
                opts.max = ps.max;
            var currValue = ps.initial !== undefined ? ps.initial :
                opts.min !== undefined ? opts.min : 0;
            var sgFunc = function (newValue, isFeedback) {
                if ((isFeedback || !ps.readOnly) && newValue !== undefined) {
                    if (ps.min !== undefined)
                        newValue = Math.max(newValue, ps.min);
                    if (ps.max !== undefined)
                        newValue = Math.min(newValue, ps.max);
                    currValue = newValue;
                    if (!isFeedback)
                        _this.mqtt.sendText(newValue.toString(), ps.subTopic);
                }
                return currValue;
            };
            this.registerProp(ps, opts, sgFunc);
        };
        BasicConfigurableMQTT.prototype.makeBoolProp = function (ps) {
            var _this = this;
            var currValue = ps.initial || false;
            var sgFunc = function (newValue, isFeedback) {
                if ((isFeedback || !ps.readOnly) && newValue !== undefined) {
                    currValue = newValue;
                    var valueToSend = newValue ?
                        (ps.trueValue || "true") :
                        (ps.falseValue || "false");
                    if (!isFeedback)
                        _this.mqtt.sendText(valueToSend, ps.subTopic);
                }
                return currValue;
            };
            this.registerProp(ps, BasicConfigurableMQTT_1.optsFromPropSetting(ps), sgFunc);
        };
        BasicConfigurableMQTT.prototype.makeStrProp = function (ps) {
            var _this = this;
            var currValue = ps.initial || "";
            var sgFunc = function (newValue, isFeedback) {
                if ((isFeedback || !ps.readOnly) && newValue !== undefined) {
                    currValue = newValue;
                    if (!isFeedback)
                        _this.mqtt.sendText(newValue, ps.subTopic);
                }
                return currValue;
            };
            this.registerProp(ps, BasicConfigurableMQTT_1.optsFromPropSetting(ps), sgFunc);
        };
        BasicConfigurableMQTT.prototype.sendText = function (text, subTopic) {
            this.mqtt.sendText(text, subTopic);
        };
        var BasicConfigurableMQTT_1;
        __decorate([
            (0, Metadata_1.callable)("Send raw text data to subTopic"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String]),
            __metadata("design:returntype", void 0)
        ], BasicConfigurableMQTT.prototype, "sendText", null);
        BasicConfigurableMQTT = BasicConfigurableMQTT_1 = __decorate([
            (0, Metadata_1.driver)('MQTT'),
            __metadata("design:paramtypes", [Object])
        ], BasicConfigurableMQTT);
        return BasicConfigurableMQTT;
    }(Driver_1.Driver));
    exports.BasicConfigurableMQTT = BasicConfigurableMQTT;
});
