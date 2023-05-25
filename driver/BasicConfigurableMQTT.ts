/*	Generic MQTT mapping a configurable set of MQTT topics to Blocks properties.
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
		subTopic    The sub-topic providing the data

	and the following optional fields:

		readOnly    Set to true to disallow setting the topic's data from Blocks (default is false)
		dataType    One of the values "Number", "Boolean" or "String" (default is "String")
		desciption	Text you want to show to the user in the Blocks editor

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

	Copyright (c) 2023 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {SGOptions} from "../system/PubSub";
import {MQTT} from "../system/Network";
import { Driver } from "../system_lib/Driver";
import {callable, driver, property} from "../system_lib/Metadata";
import {PrimitiveValue} from "../system_lib/ScriptBase";


type PrimValueType = "Number" | "Boolean" | "String";

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
export class BasicConfigurableMQTT extends Driver<MQTT> {

	// Keeps track of all properties my - keyed by sub-topic
	private readonly properties: Dictionary<Subscriber> = {};

    public constructor(public mqtt: MQTT) {
        super(mqtt);
        if (mqtt.options) {
			try {
				const propSettingsList: PropSettings[] = JSON.parse(mqtt.options);
				if (Array.isArray(propSettingsList)) {
					this.doPropSettings(propSettingsList);
					this.init();
				} else
					console.error("Custom Options incalid (expected an array)");
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
	 * I've scanned settings and established properties. Set up to subscribe to topics when
	 * connected.
	 */
	private init() {
		if (this.mqtt.connected)	// Was connected initially
			this.doSubscribe();
		this.mqtt.subscribe('connect', (emitter, message) => {
			if (message.type === "Connection" &&  this.mqtt.connected) // Just became connected (or re-connected)
				this.doSubscribe();
		});
	}

	/**
	 * Subscribe to all properties except those marked writeOnly
	 */
	private doSubscribe() {
		for (const subTopic in this.properties) {
			if (!this.properties[subTopic].settings.writeOnly) {
				this.mqtt.subscribeTopic(subTopic, (emitter, message) =>
					this.dataFromSubTopic(message.subTopic, message.text)
				);
			}
		}
	}

	/**
	 * Data received from subTopic. Map to corresponding property, coerce value to proper type
	 * and apply value to prop.
	 */
	private dataFromSubTopic(subTopic: string, value: string) {
		const subscriber = this.properties[subTopic];
		if (subscriber) {
			try {
				const typedValue = BasicConfigurableMQTT.coerceToType(subscriber.settings, value);
				subscriber.handler(typedValue, true);	// Applies the value
				this.changed(subscriber.settings.property);	// Must fire change notifications myself here
			} catch (coercionError) {
				console.error("Unable to coerce to", subscriber.settings.dataType, value);
			}
		} else
			console.error("Data from unexpected subtopic", subTopic);
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
			result = BasicConfigurableMQTT.parseBool(<BoolPropSettings>setting, rawValue);
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
		this.properties[ps.subTopic] = {
			settings: ps,
			handler: sgFunc
		};
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
		const opts = BasicConfigurableMQTT.optsFromPropSetting(ps);
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
					this.mqtt.sendText(newValue.toString(), ps.subTopic);
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
					this.mqtt.sendText(valueToSend, ps.subTopic);
			}
			return currValue;
		}
		this.registerProp(ps, BasicConfigurableMQTT.optsFromPropSetting(ps), sgFunc)
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
					this.mqtt.sendText(newValue, ps.subTopic);
			}
			return currValue;
		}
		this.registerProp(ps, BasicConfigurableMQTT.optsFromPropSetting(ps), sgFunc)
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
