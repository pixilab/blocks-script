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
    exports.ConfigurableMQTT = void 0;
    var ConfigurableMQTT = exports.ConfigurableMQTT = (function (_super) {
        __extends(ConfigurableMQTT, _super);
        function ConfigurableMQTT(mqtt) {
            var _this = _super.call(this, mqtt) || this;
            _this.mqtt = mqtt;
            _this.properties = {};
            if (mqtt.options) {
                try {
                    var propSettingsList = JSON.parse(mqtt.options);
                    if (Array.isArray(propSettingsList)) {
                        _this.doPropSettings(propSettingsList);
                        _this.doSubscribe();
                    }
                    else
                        console.error("Custom Options invalid (expected an array)");
                }
                catch (parseError) {
                    console.error("Can't parse Custom Options", parseError);
                }
            }
            else
                console.error("No Custom Options specified");
            return _this;
        }
        ConfigurableMQTT_1 = ConfigurableMQTT;
        ConfigurableMQTT.prototype.doPropSettings = function (propSettingsList) {
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
        ConfigurableMQTT.prototype.doSubscribe = function () {
            var _this = this;
            for (var subTopic in this.properties) {
                for (var _i = 0, _a = this.properties[subTopic]; _i < _a.length; _i++) {
                    var property = _a[_i];
                    if (!property.settings.writeOnly) {
                        this.mqtt.subscribeTopic(subTopic, function (emitter, message) {
                            return _this.dataFromSubTopic(message.subTopic, message.text);
                        });
                        break;
                    }
                }
            }
        };
        ConfigurableMQTT.prototype.dataFromSubTopic = function (subTopic, data) {
            var subscribers = this.properties[subTopic];
            var hasParsedJson = false;
            var wasInvalidJsonData = false;
            var jsonData;
            for (var _i = 0, subscribers_1 = subscribers; _i < subscribers_1.length; _i++) {
                var subscriber = subscribers_1[_i];
                if (subscriber.settings.writeOnly) {
                    continue;
                }
                var value = data;
                if (subscriber.settings.jsonPath) {
                    if (!hasParsedJson) {
                        try {
                            hasParsedJson = true;
                            jsonData = JSON.parse(data);
                        }
                        catch (error) {
                            console.error("Invalid JSON data from", subTopic);
                            wasInvalidJsonData = true;
                            continue;
                        }
                    }
                    else if (wasInvalidJsonData) {
                        console.error("Invalid JSON data from", subTopic);
                        continue;
                    }
                    try {
                        value = this.getValueFromJSONPath(jsonData, subscriber.settings.jsonPath);
                    }
                    catch (error) {
                        console.error("Invalid jsonPath for sub topic", subTopic);
                        continue;
                    }
                }
                try {
                    var typedValue = ConfigurableMQTT_1.coerceToType(subscriber.settings, value);
                    subscriber.handler(typedValue, true);
                    this.changed(subscriber.settings.property);
                }
                catch (coercionError) {
                    console.error("Unable to coerce to", subscriber.settings.dataType, value);
                }
            }
        };
        ConfigurableMQTT.coerceToType = function (setting, rawValue) {
            var result = rawValue;
            switch (setting.dataType) {
                case 'Number':
                    result = parseFloat(rawValue);
                    if (isNaN(result))
                        throw "Not a number";
                    break;
                case "Boolean":
                    result = ConfigurableMQTT_1.parseBool(setting, rawValue);
                    break;
            }
            return result;
        };
        ConfigurableMQTT.parseBool = function (setting, rawValue) {
            if (rawValue === (setting.trueValue || "true"))
                return true;
            if (rawValue === (setting.falseValue || "false"))
                return false;
            throw "Invalid boolean value";
        };
        ConfigurableMQTT.prototype.registerProp = function (ps, propOpts, sgFunc) {
            if (!this.properties[ps.subTopic]) {
                this.properties[ps.subTopic] = [];
            }
            this.properties[ps.subTopic].push({
                settings: ps,
                handler: sgFunc
            });
            this.property(ps.property, propOpts, sgFunc);
        };
        ConfigurableMQTT.optsFromPropSetting = function (ps) {
            return {
                type: ps.dataType,
                readOnly: !!ps.readOnly,
                description: ps.description
            };
        };
        ConfigurableMQTT.prototype.makeNumProp = function (ps) {
            var _this = this;
            var opts = ConfigurableMQTT_1.optsFromPropSetting(ps);
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
                        _this.sendValue(newValue.toString(), ps);
                }
                return currValue;
            };
            this.registerProp(ps, opts, sgFunc);
        };
        ConfigurableMQTT.prototype.makeBoolProp = function (ps) {
            var _this = this;
            var currValue = ps.initial || false;
            var sgFunc = function (newValue, isFeedback) {
                if ((isFeedback || !ps.readOnly) && newValue !== undefined) {
                    currValue = newValue;
                    var valueToSend = newValue ?
                        (ps.trueValue || "true") :
                        (ps.falseValue || "false");
                    if (!isFeedback)
                        _this.sendValue(valueToSend, ps);
                }
                return currValue;
            };
            this.registerProp(ps, ConfigurableMQTT_1.optsFromPropSetting(ps), sgFunc);
        };
        ConfigurableMQTT.prototype.makeStrProp = function (ps) {
            var _this = this;
            var currValue = ps.initial || "";
            var sgFunc = function (newValue, isFeedback) {
                if ((isFeedback || !ps.readOnly) && newValue !== undefined) {
                    currValue = newValue;
                    if (!isFeedback)
                        _this.sendValue(newValue, ps);
                }
                return currValue;
            };
            this.registerProp(ps, ConfigurableMQTT_1.optsFromPropSetting(ps), sgFunc);
        };
        ConfigurableMQTT.prototype.createValueToPublish = function (value, settings) {
            if (!settings.jsonTemplate) {
                return value;
            }
            var typedValue = ConfigurableMQTT_1.coerceToType(settings, value);
            return JSON.stringify(settings.jsonTemplate, function (k, v) {
                if (typeof v === "string") {
                    if (v === "#BLOCKS#") {
                        return typedValue;
                    }
                    return v.replace(/\$BLOCKS\$/g, value);
                }
                return v;
            });
        };
        ConfigurableMQTT.prototype.getValueFromJSONPath = function (jsonObj, jsonPath) {
            var subObj = jsonObj;
            for (var _i = 0, jsonPath_1 = jsonPath; _i < jsonPath_1.length; _i++) {
                var jsonKey = jsonPath_1[_i];
                if (!(jsonKey in subObj)) {
                    throw "Invalid JSON path";
                }
                subObj = subObj[jsonKey];
            }
            return subObj.toString();
        };
        ConfigurableMQTT.prototype.sendValue = function (value, ps) {
            try {
                var valueToPublish = this.createValueToPublish(value, ps);
                this.mqtt.sendText(valueToPublish, ps.publishSubTopic ? ps.publishSubTopic : ps.subTopic);
            }
            catch (jsonTemplateError) {
                console.error("Invalid jsonTemplate");
            }
        };
        ConfigurableMQTT.prototype.sendText = function (text, subTopic) {
            this.mqtt.sendText(text, subTopic);
        };
        var ConfigurableMQTT_1;
        __decorate([
            (0, Metadata_1.callable)("Send raw text data to subTopic"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String]),
            __metadata("design:returntype", void 0)
        ], ConfigurableMQTT.prototype, "sendText", null);
        ConfigurableMQTT = ConfigurableMQTT_1 = __decorate([
            (0, Metadata_1.driver)('MQTT'),
            __metadata("design:paramtypes", [Object])
        ], ConfigurableMQTT);
        return ConfigurableMQTT;
    }(Driver_1.Driver));
});
