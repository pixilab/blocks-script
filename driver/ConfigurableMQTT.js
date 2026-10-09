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
var ConfigurableMQTT_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurableMQTT = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
let ConfigurableMQTT = ConfigurableMQTT_1 = class ConfigurableMQTT extends Driver_1.Driver {
    mqtt;
    properties = {};
    constructor(mqtt) {
        super(mqtt);
        this.mqtt = mqtt;
        if (mqtt.options) {
            try {
                const propSettingsList = JSON.parse(mqtt.options);
                if (Array.isArray(propSettingsList)) {
                    this.doPropSettings(propSettingsList);
                    this.doSubscribe();
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
    }
    doPropSettings(propSettingsList) {
        for (const ps of propSettingsList) {
            if (typeof ps.property !== "string" && typeof ps.subTopic !== "string")
                throw "Each property setting must have property and subTopic string items";
            const dataType = ps.dataType || "String";
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
    }
    doSubscribe() {
        for (const subTopic in this.properties) {
            for (const property of this.properties[subTopic]) {
                if (!property.settings.writeOnly) {
                    this.mqtt.subscribeTopic(subTopic, (emitter, message) => this.dataFromSubTopic(message.subTopic, message.text));
                    break;
                }
            }
        }
    }
    dataFromSubTopic(subTopic, data) {
        const subscribers = this.properties[subTopic];
        let hasParsedJson = false;
        let wasInvalidJsonData = false;
        let jsonData;
        for (const subscriber of subscribers) {
            if (subscriber.settings.writeOnly) {
                continue;
            }
            let value = data;
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
                const typedValue = ConfigurableMQTT_1.coerceToType(subscriber.settings, value);
                subscriber.handler(typedValue, true);
                this.changed(subscriber.settings.property);
            }
            catch (coercionError) {
                console.error("Unable to coerce to", subscriber.settings.dataType, value);
            }
        }
    }
    static coerceToType(setting, rawValue) {
        let result = rawValue;
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
    }
    static parseBool(setting, rawValue) {
        if (rawValue === (setting.trueValue || "true"))
            return true;
        if (rawValue === (setting.falseValue || "false"))
            return false;
        throw "Invalid boolean value";
    }
    registerProp(ps, propOpts, sgFunc) {
        if (!this.properties[ps.subTopic]) {
            this.properties[ps.subTopic] = [];
        }
        this.properties[ps.subTopic].push({
            settings: ps,
            handler: sgFunc
        });
        this.property(ps.property, propOpts, sgFunc);
    }
    static optsFromPropSetting(ps) {
        return {
            type: ps.dataType,
            readOnly: !!ps.readOnly,
            description: ps.description
        };
    }
    makeNumProp(ps) {
        const opts = ConfigurableMQTT_1.optsFromPropSetting(ps);
        if (ps.min !== undefined)
            opts.min = ps.min;
        if (ps.max !== undefined)
            opts.max = ps.max;
        let currValue = ps.initial !== undefined ? ps.initial :
            opts.min !== undefined ? opts.min : 0;
        const sgFunc = (newValue, isFeedback) => {
            if ((isFeedback || !ps.readOnly) && newValue !== undefined) {
                if (ps.min !== undefined)
                    newValue = Math.max(newValue, ps.min);
                if (ps.max !== undefined)
                    newValue = Math.min(newValue, ps.max);
                currValue = newValue;
                if (!isFeedback)
                    this.sendValue(newValue.toString(), ps);
            }
            return currValue;
        };
        this.registerProp(ps, opts, sgFunc);
    }
    makeBoolProp(ps) {
        let currValue = ps.initial || false;
        const sgFunc = (newValue, isFeedback) => {
            if ((isFeedback || !ps.readOnly) && newValue !== undefined) {
                currValue = newValue;
                let valueToSend = newValue ?
                    (ps.trueValue || "true") :
                    (ps.falseValue || "false");
                if (!isFeedback)
                    this.sendValue(valueToSend, ps);
            }
            return currValue;
        };
        this.registerProp(ps, ConfigurableMQTT_1.optsFromPropSetting(ps), sgFunc);
    }
    makeStrProp(ps) {
        let currValue = ps.initial || "";
        const sgFunc = (newValue, isFeedback) => {
            if ((isFeedback || !ps.readOnly) && newValue !== undefined) {
                currValue = newValue;
                if (!isFeedback)
                    this.sendValue(newValue, ps);
            }
            return currValue;
        };
        this.registerProp(ps, ConfigurableMQTT_1.optsFromPropSetting(ps), sgFunc);
    }
    createValueToPublish(value, settings) {
        if (!settings.jsonTemplate) {
            return value;
        }
        let typedValue = ConfigurableMQTT_1.coerceToType(settings, value);
        return JSON.stringify(settings.jsonTemplate, (k, v) => {
            if (typeof v === "string") {
                if (v === "#BLOCKS#") {
                    return typedValue;
                }
                return v.replace(/\$BLOCKS\$/g, value);
            }
            return v;
        });
    }
    getValueFromJSONPath(jsonObj, jsonPath) {
        let subObj = jsonObj;
        for (const jsonKey of jsonPath) {
            if (!(jsonKey in subObj)) {
                throw "Invalid JSON path";
            }
            subObj = subObj[jsonKey];
        }
        return subObj.toString();
    }
    sendValue(value, ps) {
        try {
            let valueToPublish = this.createValueToPublish(value, ps);
            this.mqtt.sendText(valueToPublish, ps.publishSubTopic ? ps.publishSubTopic : ps.subTopic);
        }
        catch (jsonTemplateError) {
            console.error("Invalid jsonTemplate");
        }
    }
    sendText(text, subTopic) {
        this.mqtt.sendText(text, subTopic);
    }
};
exports.ConfigurableMQTT = ConfigurableMQTT;
__decorate([
    (0, Metadata_1.callable)("Send raw text data to subTopic"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ConfigurableMQTT.prototype, "sendText", null);
exports.ConfigurableMQTT = ConfigurableMQTT = ConfigurableMQTT_1 = __decorate([
    (0, Metadata_1.driver)('MQTT'),
    __metadata("design:paramtypes", [Object])
], ConfigurableMQTT);
