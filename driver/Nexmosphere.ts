/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2021 by Mattias Andersson.
 */


import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {callable, driver} from "system_lib/Metadata";
import {PrimTypeSpecifier} from "../system/PubSub";

const kRfidPacketParser = /^XR\[P(.)(\d+)]$/; //parse RFID tag detection from XR-DR01 Rfid element
const kPortPacketParser = /^X(\d+)(A|B)\[(.+)]$/; //parse interfaceNumber and attached Data
const kProductCodeParser = /D(\d+)B\[\w+\=(.+)]$/; // Controllers response to a product code request (D003B[TYPE]) controller response D001B[TYPE=XRDR1  ]
const kNumInterfaces = 8; // Number of "interface channels" in the Nexmosphere box


// A simple map-like object type
interface Dictionary<TElem> { [id: string]: TElem; }

// A class constructor function
interface BaseInterfaceCtor<T> { new(driver: Nexmosphere, index: number): T ;}


@driver('NetworkTCP', {port: 4001})
export class Nexmosphere extends Driver<NetworkTCP> {

	// Map Nexmosphere model name to its implementation type
	private static interfaceRegistry: Dictionary<BaseInterfaceCtor<BaseInterface>>;

	private lastTag: TagInfo;	// Store most recent RFID taginfo here, awaiting the port message
	private readonly interfaces: BaseInterface[]; //Store the interface interfaces
	private pollIndex = 0;		// Most recently polled interface

	public constructor(private socket: NetworkTCP) {
		super(socket);
		this.interfaces = [];	// Filled by data returned from polling the Nexmosphere

		socket.autoConnect();
		// Listen for data from the Nexmosphere bus
		socket.subscribe('textReceived', (sender, message) => {
			if (message.text)
				this.handleMessage(message.text);
			// Else ignore empty message, sometimes resulting from separated CR/LF chars
		});


		// Poll for connected interfaces once connected
		socket.subscribe('connect', (sender, message) => {
			// Initiate polling once connected and only first time (may reconnect several times)
			if (message.type === 'Connection' && socket.connected && !this.pollIndex)
				this.pollNextPort();
		});
	}

	static registerInterface(ctor: BaseInterfaceCtor<BaseInterface>, ...modelName: string[] ) {
		if (!Nexmosphere.interfaceRegistry)
			Nexmosphere.interfaceRegistry = {};	// First time init
		modelName.forEach(function(name) {
			Nexmosphere.interfaceRegistry[name] = ctor;
		});
	}

	/*	Poll current port, then next one (if any) with some delay between each,
		since no reply if nothing connected
	 */
	private pollNextPort() {
		++this.pollIndex;	// Poll next index
		this.queryPortConfig(this.pollIndex);
		if (this.pollIndex <= kNumInterfaces) // Poll next one soon
			wait(100).then(() => this.pollNextPort());
	}

	/**
	 * Send a query for what's connected to port (1-based)
	 */
	private queryPortConfig(portNumber: number,) {
		var sensorMessage: string = (("000" + portNumber).slice(-3)); //pad index with leading zeros and convert to string.
		this.send("D" + sensorMessage + "B[TYPE]");
	}

	/**
	 * Send rew messages to the Nexmosphere controller
	 */
	@callable("Send raw string data to the Nexmosphere controller")
	send(rawData: string) {
		this.socket.sendText(rawData, "\r\n");
	}


	/**
	 * Look for the messages we care about and act on those.
	 */
	private handleMessage(msg: string) {
		console.debug("handleMessage", msg);
		var parseResult = kRfidPacketParser.exec(msg);
		if (parseResult) {
			// Just store first part until the port packet arrives
			this.lastTag = {
				isPlaced: parseResult[1] === 'B',
				tagNumber: parseInt(parseResult[2])
			};
		} else if ((parseResult = kPortPacketParser.exec(msg))) {
			// Incoming data from a sensor?
			const portNumber = parseInt(parseResult[1]); //get the recieving interface
			const dataRecieved = parseResult[3]; //get input data as string
			const index = portNumber - 1;
			const targetElem = this.interfaces[index];
			if (targetElem)
				targetElem.receiveData(dataRecieved, this.lastTag);
			else
				console.warn("Message from unexpected port", portNumber);
		} else if ((parseResult = kProductCodeParser.exec(msg))) {
			// Reply from the interface scan?
			const modelInfo: ModelInfo = {
				modelCode: parseResult[2].trim()  // Remove any trailing whitespace in the product code.
			}
			const portNumber = (parseResult[1]);
			const index = parseInt(portNumber) - 1;

			const ctor = Nexmosphere.interfaceRegistry[modelInfo.modelCode];
			if (ctor)
				this.interfaces[index] = new ctor(this, index);
			else {
				console.warn("Unknown interface model - using generic 'unknown' type", modelInfo.modelCode);
				this.interfaces[index] = new UnknownInterface(this, index);
			}

		} else {
			console.warn("Unknown command received from controller", msg)
		}
	}
}

/**
 * Model a single base element.
 */
abstract class BaseInterface {


	constructor(
		protected readonly driver: Nexmosphere,
		protected readonly index: number
	) {
		//console.log("Created", index, modelInfo.modelCode);
	}

	protected getNamePrefix() {
		return "iface_" + (this.index + 1);
	}

	abstract receiveData(data: string, tag?: TagInfo): void;
}

// Generic interface used when no matching type found, just providing its last data as a string
class UnknownInterface extends BaseInterface {

	private readonly propName: string;
	private propValue: string;

	constructor(driver: Nexmosphere, index: number) {
		super(driver, index);
		this.propName = this.getNamePrefix() + "_unknown";
		this.driver.property<string>(
			this.propName,
			{
				type: String,
				description: "Raw data last received from unknown device type",
				readOnly: true
			},
			setValue => {
				return this.propValue;
			}
		);
	}

	receiveData(data: string) {
		this.propValue = data;
		this.driver.changed(this.propName);
	}
}
// Instantiated manually, so no need to register

/**
 * RFID detector.
 */
class RfidInterface extends BaseInterface {

	private readonly tagPropName: string;
	private readonly placedPropName: string;
	private tagInfo: TagInfo = {
		tagNumber: 0,
		isPlaced: false
	}

	constructor(driver: Nexmosphere, index: number) {
		super(driver, index);
		this.tagPropName = this.getNamePrefix() + "_tagId";
		this.driver.property<number>(
			this.tagPropName,
			{
				type: Number,
				description: "Last recieved RFID tag ID",
				readOnly: true
			},
			setValue => {
				return this.tagInfo.tagNumber;
			}
		);

		this.placedPropName = this.getNamePrefix() + "_tagIsPlaced";
		this.driver.property<boolean>(
			this.placedPropName,
			{
				type: Boolean,
				description: "RFID tag is detected",
				readOnly: true
			},
			setValue => {
				return this.tagInfo.isPlaced;
			}
		);
	}

	receiveData(data: string, tag?: TagInfo) {
		// New info arrived from Nexmosphere device. Update state and fire changes, if any

		const oldInfo = this.tagInfo;
		this.tagInfo = tag;

		if (oldInfo.tagNumber !== tag.tagNumber)
			this.driver.changed(this.tagPropName);
		if (oldInfo.isPlaced !== tag.isPlaced)
			this.driver.changed(this.placedPropName);

		//console.log("Tag", tag.tagNumber, tag.isPlaced);
	}
}
Nexmosphere.registerInterface(RfidInterface, "XRDR1");


class ProximityInterface extends BaseInterface {
	private readonly propName: string;
	private propValue: number;

	constructor(driver: Nexmosphere, index: number) {
		super(driver, index);
		this.propName = this.getNamePrefix() + "_proximity";
		this.driver.property<number>(
			this.propName,
			{
				type: Number,
				description: "Proximity zone",
				readOnly: true
			},
			setValue => {
				return this.propValue;
			}
		);
	}

	receiveData(data: string) {
		this.propValue = parseInt(data);
		this.driver.changed(this.propName);
	}
}
Nexmosphere.registerInterface(ProximityInterface, "XY116", "XY146", "XY176");


/**
 *Modle a Gesture detector interface.
 */
class AirGestureInterface extends BaseInterface {
	private readonly propName: string;
	private propValue: string;

	constructor(driver: Nexmosphere, index: number) {
		super(driver, index);
		this.propName = this.getNamePrefix() + "_touch";
		this.driver.property<string>(
			this.propName,
			{
				type: String,
				description: "Touch detected",
				readOnly: true
			},
			() => this.propValue
		);
	}

	receiveData(data: string) {
		this.propValue = data;
		this.driver.changed(this.propName);
	}
}
Nexmosphere.registerInterface(AirGestureInterface, "XTEF650", "XTEF30", "XTEF630", "XTEF680");


/**
 *Model a single button.
 */
class Button {
	private state: boolean;

	constructor(private readonly name: string, private driver: Driver<NetworkTCP>) {
		driver.property<boolean>(
			this.name,
			{
				type: Boolean,
				description: this.name + " is pressed",
				readOnly: true
			},
			() => this.state
		);
	}

	setState(state: boolean) {
		const oldState = this.state;
		this.state = state;
		if (state !== oldState)
			this.driver.changed(this.name);
	}
}

/**
 *Modle a Quad Button detector interface.
 */
class QuadButtonInterface extends BaseInterface {

	private buttons: Button[];

	constructor(driver: Nexmosphere, index: number) {
		super(driver, index);
		this.buttons = [];
		for (var ix = 0; ix < 4; ++ix) {
			this.buttons.push(new Button(this.getNamePrefix() + "_btn_" + (ix + 1), this.driver));
			console.log("For buttons_" + (ix + 1));
		}
	}

	receiveData(data: string) {
		var bitMask = parseInt(data);
		bitMask = bitMask >> 1;	// Unsave useless LSBit
		for (var ix = 0; ix < 4; ++ix) {
			var isPressed: boolean = !!(bitMask & (1 << ix));
			this.buttons[ix].setState(isPressed);
		}
	}
}
Nexmosphere.registerInterface(QuadButtonInterface, "XTB4N");


/**
 *Modle a Motion detector interface.
 */
class MotionInterface extends BaseInterface {
	private readonly propName: string;
	private propValue: number;


	constructor(driver: Nexmosphere, index: number) {
		super(driver, index);
		this.propName = this.getNamePrefix() + "_motion";
		this.driver.property<number>(
			this.propName,
			{
				type: Number,
				description: "Motion detected",
				readOnly: true
			},
			() => this.propValue
		);
	}

	receiveData(data: string) {
		this.propValue = parseInt(data);
		this.driver.changed(this.propName);
	}
}
Nexmosphere.registerInterface(MotionInterface, "XY320");

/**
 * A basic property type used in the GenderInterface below, parametrized by its
 * PropType, and with a separate setValue method (since value from the outside
 * is read-only).
 */
class GenderSubProperty<PropType> {
	private value: PropType;

	constructor(
		private driver: Nexmosphere,
		private propName: string,
		description: string,
		type: PrimTypeSpecifier,
		initialValue: PropType
	) {
		this.value = initialValue;
		driver.property<PropType>(
			propName,
			{
				type: type,
				description: description,
				readOnly: true
			},
			() => this.value	// Getter only since I'm read-only
		);
	}

	/**
	 * Update my value, firing property change if this was news.
	 */
	setValue(poteniallyNewValue: PropType) {
		const oldValue = this.value;
		this.value = poteniallyNewValue;
		if (oldValue !== poteniallyNewValue) // This was news - fire change notification
			this.driver.changed(this.propName);
	}
}

/**
 *	Gender detector interface, indicating gender, age, gaze and some other tidbits about a person
 *	in front of the sensor (e.g., a camera).
 */
class GenderInterface extends BaseInterface {
	private static readonly kParser = /^(0|1)(M|F|U)(X|L|H)([0-7])(X|L|H)(L|C|R|U)/;
	private subProp: GenderSubProperty<any>[];

	constructor(driver: Nexmosphere, index: number) {
		super(driver, index);
		this.subProp = [];

		// CAUTION: Same number and order as in parser below!
		this.subProp.push(new GenderSubProperty<boolean>(
			driver,
			this.getNamePrefix() + "_is Person",
			"Person detected",
			String, false
		));

		this.subProp.push(new GenderSubProperty<string>(
			driver,
			this.getNamePrefix() + "_gender",
			"Gender; M=Male, F=Female, U=Unidentified",
			String, 'U'
		));

		this.subProp.push(new GenderSubProperty<string>(
			driver,
			this.getNamePrefix() + "_gender_confidence",
			"Confidence level; X=Very Low, L=Low, H=High",
			String, 'X'
		));

		this.subProp.push(new GenderSubProperty<number>(
			driver,
			this.getNamePrefix() + "_age",
			"Age range 0...7",
			Number, 0
		));

		this.subProp.push(new GenderSubProperty<string>(
			driver,
			this.getNamePrefix() + "_age_confidence",
			"Confidence level; X=Very Low, L=Low, H=High",
			String, 'X'
		));

		this.subProp.push(new GenderSubProperty<string>(
			driver,
			this.getNamePrefix() + "_gaze",
			"Gaze indication L=Left, C=Center, R=Right, U=Unidentified",
			String, 'U'
		));
	}

	/*	Parse out all info from single string, using kParser:

		P= Person detection 0= No Person, 1=Person detected
		G= M=Male, F=Female, U=Unidentified
		C= Confidence level gender X = Very Low, L=Low, H=High
		A= Age range estimation value between 0-7
		C= Confidence level age X = Very Low, L=Low, H=High
		G= Gaze indication L=Left, C=Center, R=Right, U=Unidentified
	 */
	receiveData(data: string) {
		//console.log(data);
		const parseResult = GenderInterface.kParser.exec(data);
		if (parseResult) {
			// CAUTION: Same number and order as in subProperty array!
			this.subProp[0].setValue(parseResult[0] === "1"); // true if 1 (there's a Person)
			this.subProp[1].setValue(parseResult[1]);
			this.subProp[2].setValue(parseResult[2]);
			this.subProp[3].setValue(parseInt(parseResult[3]));
			this.subProp[4].setValue(parseResult[4]);
			this.subProp[5].setValue(parseResult[5]);
		}
	}
}
Nexmosphere.registerInterface(GenderInterface, "XY510", "XY520");


/**
 * What we know about a single RFID tag placed on (or removed from) a sensor.
 */
interface TagInfo {
	tagNumber: number;
	isPlaced: boolean;
}

interface ModelInfo {
	modelCode: string;
	serialNo?: string;
}
