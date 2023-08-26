/*	Generic MQTT driver, mapping a configurable set of MQTT topics to Blocks properties.
	This driver MUST be configured by relevant JSON data to be meaningful. This
	data is specified using the "Custom Options" field in the Network device, and
	has the following structure:

	[{
		"property": "NumPropName",
		"subTopic": "some/sub/topicWithNumericValue",
		"description": "Descriptive text shown in Blocks editor",
		"readOnly": true,
		"dataType": "Number", "min": 1, "max": 10
	 }, {
		"property": "BoolPropName",
		"subTopic": "some/sub/topicWithBooleanValue",
		"dataType": "Boolean", "trueValue": "ON", "falseValue": "OFF"
	}, {
		"property": "StringPropName",
		"subTopic": "some/sub/setOnlyTopicWithStringValue",
		"dataType": "String",
		"writeOnly": true
	}]

	The outermost level is an array of objects. Each object represents one property. Each property
	has the following mandatory fields:

		property    The name of the property, as exposed by Blocks
		subTopic    The sub-topic providing the data. Multiple properties can have the same
					subTopic.

	and the following optional fields:

		readOnly    	Set to true to disallow setting the topic's data from Blocks (default is false)
		writeOnly   	Set to true to make property write only, skipping subTopic subscription
						(default is false).
		dataType    	One of the values "Number", "Boolean" or "String" (default is "String")
		description		Text you want to show to the user in the Blocks editor
		publishSubTopic	Set this if the sub topic for publishing is different from the sub
						topic for reading the value.
		jsonPath		If the device publishes the property in a JSON object, specify the "path" to
						the property in jsonPath. For example, if the device publishes
						{ "data": { "property": "VALUE" } } where VALUE is the property value, set
						jsonPath to ["data", "property"].
		jsonTemplate	To publish a property in a JSON object, specify a jsonTemplate. The
						template specifies the structure of the JSON object that will be published. All
						occurrences of the string "$BLOCKS$" (except for keys) will be replaced by the
						property value. To cast the property value to its dataType, use "#BLOCKS#"
						instead. Note that "$BLOCKS$" can be used multiple times inside a string
						containing other characters whereas "#BLOCKS#" cannot. Example:
						{ "data": { "inString": "Property $BLOCKS$ + $BLOCKS$", "value": "#BLOCKS#" } }

	and the following data type specific fields for "Number" type:

		initial		Initial value, provided for prop initially (default is min or 0)
		min         Minimum allowed numeric value (default is no limit)
		max         Maximum allowed numeric value (default is no limit)

	and the following data type specific fields for "Boolean" type:

		initial		Initial value, provided for prop initially (default is false)
		trueValue   String representing a true value (default is "true")
		falseValue  String representing a false value (default is "false")

	and the following data type specific fields for "Stromg" type:

		initial		Initial value, provided for prop initially (default is empty string)

	Enhanced by Melvin Manninen.
	Copyright (c) 2023 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {SGOptions} from "../system/PubSub";
import {MQTT} from "../system/Network";
import { Driver } from "../system_lib/Driver";
import {callable, driver} from "../system_lib/Metadata";
import {PrimitiveValue} from "../system_lib/ScriptBase";


type PrimValueType = "Number" | "Boolean" | "String";

type JSONPath = string[];
type JSONTemplate = any;

/**
 * Common settings for all properties in JSON config data
 */
interface PropSettings {
	property: string;
	subTopic: string;
	readOnly?: boolean;		// If true, topic can't be set from Blocks side, but will subscribe
	writeOnly?: boolean;	// If true, topic will not be subscribed to but can still be set
	dataType?:  PrimValueType;	// Default is "String"
	description?: string;	// Descriptive text shown in Blocks editor
	publishSubTopic?: string; // Different publish sub topic. If undefined, same as subTopic
	jsonPath?: JSONPath; // Path to nested JSON object holding the value
	jsonTemplate?: JSONTemplate; // Template for publishing JSON object
}

/**
 * Specific for "Number" type
 */
interface NumPropSettings extends PropSettings {
	initial?: number;	// Initial value of property
	min?: number;		// Default is no lower limit
	max?: number;		// Default is no upper limit
}

/**
 * Specific for "Boolean" type.
 */
interface BoolPropSettings extends PropSettings {
	initial?: boolean;		// Initial value of property
	trueValue?: string;		// Default is "true"
	falseValue?: string;	// Default is "false"
}

/**
 * Specific for "String" type.
 */
interface StringPropSettings extends PropSettings {
	initial?: string;		// Initial value of property
}

/**
 * Type of my enchanced property setter-getter function, where isFeedback
 * is set when value applied to property due to feedback FROM the topic,
 * in which case we shoud NOT send the value on the topic.
 */
type MySgFunc = (newValue?: PrimitiveValue, isFeedback?: boolean)=> PrimitiveValue;

/**
 * Data we keep in "subscribed" dictionary on subscribed-to topics.
 */
interface Subscriber {
	settings: PropSettings;	// Setting correpsonding to this prop
	handler: MySgFunc;		// Function called when new value received on topic
}

@driver('MQTT')
export class ConfigurableMQTT extends Driver<MQTT> {

	// Keeps track of all properties my - keyed by sub-topic
	private readonly properties: Dictionary<Subscriber[]> = {};

	public constructor(public mqtt: MQTT) {
		super(mqtt);
		if (mqtt.options) {
			try {
				const propSettingsList: PropSettings[] = JSON.parse(mqtt.options);
				if (Array.isArray(propSettingsList)) {
					this.doPropSettings(propSettingsList);
					this.doSubscribe();
				} else
					console.error("Custom Options invalid (expected an array)");
			} catch (parseError) {
				console.error("Can't parse Custom Options", parseError);
			}
		} else
			console.error("No Custom Options specified");
	}

	private doPropSettings(propSettingsList: PropSettings[]) {
		for (const ps of propSettingsList) {
			if (typeof ps.property !== "string" &&  typeof ps.subTopic !== "string")
				throw "Each property setting must have property and subTopic string items";
			const dataType = ps.dataType || "String";
			switch (dataType) {
			case "Number":
				this.makeNumProp(ps);
				break;
			case "Boolean":
				this.makeBoolProp(ps);
				break
			case "String":
				this.makeStrProp(ps);
				break;
			default:
				throw "Bad dataType " + dataType;
			}
		}
	}

	/**
	 * Subscribe to all properties except those marked writeOnly
	 */
	private doSubscribe() {
		for (const subTopic in this.properties) {
			for (const property of this.properties[subTopic]) {
				if (!property.settings.writeOnly) {
					this.mqtt.subscribeTopic(subTopic, (emitter, message) =>
						this.dataFromSubTopic(message.subTopic, message.text)
					);
					break;
				}
			}
		}
	}

	/**
	 * Data received from subTopic. Map to corresponding properties, coerce value to proper type
	 * and apply value to properties.
	 */
	private dataFromSubTopic(subTopic: string, data: string) {
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
				if (!hasParsedJson) { // Only need to parse once
					try {
						hasParsedJson = true;
						jsonData = JSON.parse(data);
					} catch (error) {
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
				} catch (error) {
					console.error("Invalid jsonPath for sub topic", subTopic);
					continue;
				}
			}
			try {
				const typedValue = ConfigurableMQTT.coerceToType(subscriber.settings, value);
				subscriber.handler(typedValue, true);	// Applies the value
				this.changed(subscriber.settings.property);	// Must fire change notifications myself here
			} catch (coercionError) {
				console.error("Unable to coerce to", subscriber.settings.dataType, value);
			}
		}
	}

	/**
	 * Coerce value to the type specified by settings, or throw,
	 */
	private static coerceToType(setting: PropSettings, rawValue: string): PrimitiveValue {
		let result: PrimitiveValue = rawValue;	// OK for string case
		switch (setting.dataType) {
		case 'Number':
			result = parseFloat(rawValue);
			if (isNaN(result))
				throw "Not a number";
			break;
		case "Boolean":
			result = ConfigurableMQTT.parseBool(<BoolPropSettings>setting, rawValue);
			break;
		}

		return result;
	}

	/**
	 * Interpret rawValue to a boolean according to setting.
	 */
	private static parseBool(setting: BoolPropSettings, rawValue: string): boolean {
		if (rawValue === (setting.trueValue || "true"))
			return true;
		if (rawValue === (setting.falseValue || "false"))
			return false;
		throw "Invalid boolean value";
	}

	/**
	 * Register this property under its subTopic with function to call to set value if data arrives
	 * on topic. Also establishes the corresponding property.
	 */
	private registerProp(ps: PropSettings, propOpts: SGOptions, sgFunc: MySgFunc) {
		if (!this.properties[ps.subTopic]) {
			this.properties[ps.subTopic] = [];
		}
		this.properties[ps.subTopic].push({
			settings: ps,
			handler: sgFunc
		});
		this.property(ps.property, propOpts, sgFunc);	// Inform Blocks about this property
	}

	private static optsFromPropSetting(ps: PropSettings): SGOptions {
		return {
			type: ps.dataType,
			readOnly: !!ps.readOnly,
			description: ps.description
		};
	}

	/**
	 * Make and advertize a numeric property according to ps.
	 */
	private makeNumProp(ps: NumPropSettings) {
		const opts = ConfigurableMQTT.optsFromPropSetting(ps);
		if (ps.min !== undefined)
			opts.min = ps.min;
		if (ps.max !== undefined)
			opts.max = ps.max;

		// Current property value held in closure, initialized to min or 0
		let currValue: number = ps.initial !== undefined ? ps.initial :
			opts.min !== undefined ? opts.min : 0;

		const sgFunc = (newValue?: number, isFeedback?: boolean) => {
			if ((isFeedback || !ps.readOnly) && newValue !== undefined) {
				// Clip value to min/max if specified
				if (ps.min !== undefined)
					newValue = Math.max(newValue, ps.min);
				if (ps.max !== undefined)
					newValue = Math.min(newValue, ps.max);
				currValue = newValue;
				if (!isFeedback)	// Don't send if called due to feedback
					this.sendValue(newValue.toString(), ps);
			}
			return currValue;
		}
		this.registerProp(ps, opts, sgFunc);
	}

	/**
	 * Make and advertize a boolean property according to ps.
	 */
	private makeBoolProp(ps: BoolPropSettings) {
		let currValue: boolean = ps.initial || false;
		const sgFunc = (newValue?: boolean, isFeedback?: boolean) => {
			if ((isFeedback || !ps.readOnly)  && newValue !== undefined) {
				currValue = newValue;
				let valueToSend = newValue ?
				(ps.trueValue || "true") :
				(ps.falseValue || "false");

				if (!isFeedback)	// Don't send if called due to feedback
					this.sendValue(valueToSend, ps);
			}
			return currValue;
		}
		this.registerProp(ps, ConfigurableMQTT.optsFromPropSetting(ps), sgFunc)
	}

	/**
	 * Make and advertize a string property according to ps.
	 */
	private makeStrProp(ps: StringPropSettings) {
		let currValue: string = ps.initial || "";
		const sgFunc = (newValue?: string, isFeedback?: boolean) => {
			if ((isFeedback || !ps.readOnly)  && newValue !== undefined) {
				currValue = newValue;
				if (!isFeedback)	// Don't send if called due to feedback
					this.sendValue(newValue, ps);
			}
			return currValue;
		}
		this.registerProp(ps, ConfigurableMQTT.optsFromPropSetting(ps), sgFunc)
	}

	/**
	 * Create string to publish from PropSettings. Throws if the jsonTemplate
	 * is invalid.
	 */
	private createValueToPublish(value: string, settings: PropSettings): string {
		if (!settings.jsonTemplate) {
			return value;
		}

		let typedValue: PrimitiveValue = ConfigurableMQTT.coerceToType(settings, value);

		return JSON.stringify(settings.jsonTemplate, (k, v) => { // Can throw
			if (typeof v === "string") {
				if (v === "#BLOCKS#") {
					return typedValue;
				}
				return v.replace(/\$BLOCKS\$/g, value);
			}
			return v;
		});
	}

	/**
	 * Returns string value from a JSONPath. Throws if the path is invalid.
	 */
	private getValueFromJSONPath(jsonObj: any, jsonPath: JSONPath): string {
		let subObj = jsonObj;

		for (const jsonKey of jsonPath) {
			if (!(jsonKey in subObj)) {
				throw "Invalid JSON path";
			}
			subObj = subObj[jsonKey];
		}
		return subObj.toString();
	}

	/**
	 * Send a property value to a subTopic.
	 */
	private sendValue(value: string, ps: PropSettings) {
		try {
			let valueToPublish = this.createValueToPublish(value, ps);
			this.mqtt.sendText(valueToPublish, ps.publishSubTopic ? ps.publishSubTopic : ps.subTopic);
		}
		catch (jsonTemplateError) {
			console.error("Invalid jsonTemplate");
		}
	}

	/*	Send text string to broker on specified sub-topic.
		*/
		@callable("Send raw text data to subTopic")
		sendText(text: string, subTopic: string): void {
			this.mqtt.sendText(text, subTopic);
	}
}

/**
 * A "dictionary" type, using a string as key.
 */
export interface Dictionary<TElem> {
	[id: string]: TElem;
}
