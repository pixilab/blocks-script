/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2021 by Mattias Andersson.
 */


import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {callable, driver, min} from "system_lib/Metadata";
import {PrimTypeSpecifier} from "../system/PubSub";
import {PrimitiveValue} from "../system_lib/ScriptBase";

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
	private readonly interfaces: BaseInterface[]; // Holds the interfaces discovered
	private pollIndex = 0;		// Most recently polled interface
	private awake = false;		// Set once we receive first data from device

	public constructor(private socket: NetworkTCP) {
		super(socket);
		this.interfaces = [];	// Filled by data returned from polling the Nexmosphere

		socket.autoConnect();
		// Listen for data from the Nexmosphere bus
		socket.subscribe('textReceived', (sender, message) => {
			if (message.text) { // Ignore empty message, sometimes caused by separated CR/LF chars
				if (this.awake)
					this.handleMessage(message.text);
				else {
					// First data from device - reset polling and consider me awake now
					this.awake = true;
					this.pollIndex = 0;
				}
			}
		});

		// Poll for connected interfaces once connected
		socket.subscribe('connect', (sender, message) => {
			// Initiate polling once connected and only first time (may reconnect several times)
			if (message.type === 'Connection' && socket.connected) { // Just connected
				if (!this.pollIndex)	// Not yet polled for interfaces
					this.pollNext();	// Get started
			} else {	// COnnection failed or disconnected
				if (!this.interfaces.length)	// Got NO interfaces - re-start polling on next connect
					this.pollIndex = 0;
			}
		});
	}

	static registerInterface(ctor: BaseInterfaceCtor<BaseInterface>, ...modelName: string[] ) {
		if (!Nexmosphere.interfaceRegistry)
			Nexmosphere.interfaceRegistry = {};	// First time init
		modelName.forEach(function(name) {
			Nexmosphere.interfaceRegistry[name] = ctor;
		});
	}

	/*	Poll next port, then next one (if any) with some delay between each.
	*/
	private pollNext() {
		++this.pollIndex;	// Poll next index
		this.queryPortConfig(this.pollIndex);
		let pollAgain = false;
		if (this.pollIndex <= kNumInterfaces) // Poll next one soon
			pollAgain = true;
		else if (!this.interfaces.length) {	// Restart poll if no fish so far
			this.pollIndex = 0;
			pollAgain = true;
		}
		if (pollAgain && this.socket.connected)
			wait(500).then(() => this.pollNext());
	}

	/**
	 * Send a query for what's connected to port (1-based)
	 */
	private queryPortConfig(portNumber: number,) {
		var sensorMessage: string = (("000" + portNumber).slice(-3)); // Pad index with leading zeroes
		sensorMessage = "D" + sensorMessage + "B[TYPE]";
		log("QQuery", sensorMessage);
		this.send(sensorMessage);
	}

	/**
	 * Send raw messages to the Nexmosphere controller
	 */
	@callable("Send raw string data to the Nexmosphere controller")
	send(rawData: string) {
		this.socket.sendText(rawData, "\r\n");
	}

	// Expose reInitialize to tasks to re-build set of dynamic properties
	@callable("Re-initialize driver, after changing device configuration")
	reInitialize() {
		super.reInitialize();
	}

	/**
	 * Look for the messages we care about and act on those.
	 */
	private handleMessage(msg: string) {
		//console.log("handleMessage", msg);

		var parseResult = kRfidPacketParser.exec(msg);
		if (parseResult) {
			// Just store first part until the port packet arrives
			this.lastTag = {
				isPlaced: parseResult[1] === 'B',
				tagNumber: parseInt(parseResult[2])
			};
		} else if ((parseResult = kPortPacketParser.exec(msg))) {
			// Incoming data from a sensor
			const portNumber = parseInt(parseResult[1]); //get the recieving interface
			const dataRecieved = parseResult[3]; //get input data as string
			const index = portNumber - 1;
			const targetElem = this.interfaces[index];
			if (targetElem)
				targetElem.receiveData(dataRecieved, this.lastTag);
			else
				console.warn("Message from unexpected port", portNumber);
		} else if ((parseResult = kProductCodeParser.exec(msg))) {
			// Reply from the interface scan
			log("QReply", msg);
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
	protected constructor(
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

/**
 * NFC detector.
 */
class NfcInterface extends BaseInterface {

	private readonly uidPropName: string;
	private readonly placedPropName: string;
	private readonly noPropName: string;
	private readonly labelPropName: string;
	private readonly writeLabelPropName: string;
	private readonly writeNoPropName: string;
	private nfcTagInfo: NfcTagInfo = {
		tagUID: "",
		isPlaced: false,
		tagNumber: 0,
		tagLabel: ""
	}
	private lastTagEvent: string = "";

	constructor(driver: Nexmosphere, index: number) {
		super(driver, index);
		this.uidPropName = this.getNamePrefix() + "_nfcTagUid";
		this.driver.property<string>(
			this.uidPropName,
			{
				type: String,
				description: "Last recieved NFC tag UID",
				readOnly: true
			},
			setValue => {
				return this.nfcTagInfo.tagUID;
			}
		);

		this.noPropName = this.getNamePrefix() + "_nfcTagNo";
		this.driver.property<number>(
			this.noPropName,
			{
				type: Number,
				description: "NFC tag number",
				readOnly: true
			},
			setValue => {
				return this.nfcTagInfo.tagNumber;
			}
		);

		this.labelPropName = this.getNamePrefix() + "_nfcLbl";
		this.driver.property<string>(
			this.labelPropName,
			{
				type: String,
				description: "NFC tag label 1",
				readOnly: true
			},
			setValue => {
				return this.nfcTagInfo.tagLabel;
			}
		);

		this.placedPropName = this.getNamePrefix() + "_nfcTagIsPlaced";
		this.driver.property<boolean>(
			this.placedPropName,
			{
				type: Boolean,
				description: "NFC tag is placed",
				readOnly: true
			},
			setValue => {
				return this.nfcTagInfo.isPlaced;
			}
		);
		this.sendDeviceDefaultSetting();

	}


	/* Set the wanted mode of the NFC driver */
	sendDeviceDefaultSetting() {

			let myIfaceNo = (("000" + (this.index+1)).slice(-3));  // Pad index with leading zeroes
			let defaultSetting = "X" + myIfaceNo + "S[10:6]"; //i.e X001S[10:6] returns UID, TNR and LB1 at every new scan.
			this.driver.send(defaultSetting);
			//console.log("NFC default setting sent");
	}
	receiveData(data: string) {

		let splitData = data.split(":");
		const newTagData = splitData[1];
		const newTagEvent = splitData[0];

		//Reset the defultDevice setting if lost i.e from restarting the controller.
		if (this.lastTagEvent === "TD=UID" && newTagEvent === "TR=UID") {
			this.sendDeviceDefaultSetting();
		}

		this.lastTagEvent = newTagEvent;

		switch (newTagEvent) {
			case "TD=UID":
				this.nfcTagInfo.isPlaced = true;
				this.nfcTagInfo.tagUID = newTagData;
				break;

			case "TD=TNR":
				this.nfcTagInfo.tagNumber = parseInt(newTagData);
				break;

			case "TD=LB1":
				this.nfcTagInfo.tagLabel = newTagData;
				//We wait til last expected information packet to arrive before we fire changed.
				this.driver.changed(this.uidPropName)
				this.driver.changed(this.labelPropName)
				this.driver.changed(this.noPropName)
				this.driver.changed(this.placedPropName)
				break;

			case "TR=LB1":
				this.nfcTagInfo.isPlaced = false
				this.driver.changed(this.placedPropName)
				break;
			case "TR=UID":
			case "TR=TNR":
					//ignore
				break;
			default:
				console.log("Unrecognised data recieved at " + this.getNamePrefix() + ": " + newTagEvent);
				break;
		}
	}
}
Nexmosphere.registerInterface(NfcInterface, "XRDW2");

/* XWaveLed*/

class XWaveLedInterface extends BaseInterface {
	private readonly propName: string;
	private propValue: string;

	constructor(driver: Nexmosphere, index: number) {
		super(driver, index);
		this.propName = this.getNamePrefix() + "_X-Wave_Command";
		this.driver.property<string>(
			this.propName,
			{
				type: String,
				description: "Command",
				readOnly: false
			},
			setValue => {
				if (setValue !== undefined) {
					this.propValue = setValue;
					this.sendData(this.propValue)
				}
				return this.propValue;
			}
		);

	}
	receiveData(data: string) {
		console.log("Unexpected data recieved on " + this.getNamePrefix() + " " + data);
	}

	sendData(data:string) {

		let myIfaceNo = (("000" + (this.index+1)).slice(-3));
		let message = "X" + myIfaceNo + "B[" + data +"]";
		this.driver.send(message);

	}
}
Nexmosphere.registerInterface(XWaveLedInterface, "XWC56", "XWL56");

/**
* Proximity sensors
*/
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
* Proximity sensors Time of Flight versions
*/
class TimeOfFlightInterface extends BaseInterface {
	private readonly zonePropName: string;
	private readonly buttonPropName: string;
	private zonePropValue: number;
	private btnPropValue: boolean;

	constructor(driver: Nexmosphere, index: number) {
		super(driver, index);
		this.zonePropName = this.getNamePrefix() + "_time_of_flightproximity";
		this.buttonPropName = this.getNamePrefix() + "_air_button";
		this.zonePropValue = 8;
		this.btnPropValue = false;
		this.driver.property<number>(
			this.zonePropName,
			{
				type: Number,
				description: "Proximity zone",
				readOnly: true
			},
			setValue => {
				return this.zonePropValue;
			}
		);
		this.driver.property<boolean>(
			this.buttonPropName,
			{
				type: Boolean,
				description: "Air Button",
				readOnly: true
			},
			setValue => {
				return this.btnPropValue;
			}
		);
	}

	receiveData(data: string) {
		const splitData = data.split("=");
		const sensorValue = splitData[1];

		switch (sensorValue) {
			case "AB":
				this.btnPropValue = true;
				this.driver.changed(this.buttonPropName);
				break;
			case "XX":
				if (this.btnPropValue){
					this.btnPropValue = false;
					this.driver.changed(this.buttonPropName);
				}
				this.zonePropValue = 8; //We define indefinite as zone 8
				this.driver.changed(this.zonePropName);
				break;
			case "01":
			case "02":
			case "03":
			case "04":
			case "05":
			case "06":
			case "07":
				this.zonePropValue = parseInt(sensorValue);
				this.driver.changed(this.zonePropName);
				if (this.btnPropValue){
					this.btnPropValue = false;
					this.driver.changed(this.buttonPropName);
				}
				break;


			default:
				break;
		}
	}
}
Nexmosphere.registerInterface(TimeOfFlightInterface, "XY241");

/**
 *Modle a Gesture detector interface.
 */
class AirGestureInterface extends BaseInterface {
	private readonly propName: string;
	private propValue: string;

	constructor(driver: Nexmosphere, index: number) {
		super(driver, index);
		this.propName = this.getNamePrefix() + "_gesture";
		this.driver.property<string>(
			this.propName,
			{
				type: String,
				description: "Gesture detected",
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
	public ledData:number;
	private ledPropname:string;

	constructor(private readonly name: string, private owner: QuadButtonInterface, ix: number, private driver: Nexmosphere) {

		this.ledPropname = name + "_led_cmd";
		this.ledData = 0
		this.state = false

		driver.property<boolean>(
			this.name,
			{
				type: Boolean,
				description: this.name + " is pressed",
				readOnly: true
			},
			() => this.state
		);
		driver.property<number>(
			this.ledPropname,
			{
				type: Number,
				description: "0=off, 1=fast, 2=slow or 3=on",
				readOnly: false,
				min: 0,
				max: 3
			},
			setValue => {
				if (setValue !== undefined) {
					this.ledData = setValue & 3;
					this.owner.ledStatusChanged();
				}
				return this.ledData;
			}
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
			this.buttons.push(new Button(this.getNamePrefix() + "_btn_" + (ix + 1), this, ix, driver));
			// console.log("For buttons_" + (ix + 1));
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

	ledStatusChanged(){
		var toSend = 0;
		const buttons = this.buttons;
		for (let ix = 0; ix < buttons.length; ++ix) {
			toSend |= buttons[ix].ledData << ix*2;
		}
		this.sendCmd(toSend.toString());
	}
	sendCmd(data:string) {

		let myIfaceNo = (("000" + (this.index+1)).slice(-3));
		let command = "X" + myIfaceNo + "A[" + data +"]";
		this.driver.send(command);
		console.log(command);
	}
}
Nexmosphere.registerInterface(QuadButtonInterface, "XTB4N", "XTB4N6","XT4FW6"
	// ,"\xFF\xFF\xFF\xFF\xFF\xFF\xFF"
)
/*	NOTE: "\xFF\xFF\xFF\xFF\xFF\xFF\xFF" is how the built-in quad button interface of the XN-165 presents
	itself. There was a suggestion to alwayw interpret this as QuadButtonInterface. But since this
	actually means "unknown device" in general, that was deemed a Bad Idea. If you want to make
	the built-in quad button interface of the XN-165 behave that way, then uncomment that line above
	and recompile the driver.

	Nexmosphere have indicated they may provide a better way of determining this in the future.

	Another idea here would be to make this driver configurable using the Custom Options field, where
	you could then manually specify how each of the ports on the hub is configured, rather than relying
	on querying the hub for this (which can be somewhat flaky depending on the order things are
	connected/powered).
*/


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
class GenderSubProperty<PropType extends PrimitiveValue> {
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

/*
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

interface NfcTagInfo {
	tagUID: string;
	isPlaced: boolean;
	tagNumber: number;
	tagLabel: string;
}

interface ModelInfo {
	modelCode: string;
	serialNo?: string;
}

/**
 Log messages, allowing my logging to be easily disabled in one place.
 */
 const DEBUG = false;	// Controls verbose logging
 function log(...messages: any[]) {
	if (DEBUG)
		// Set to false to disable my logging
		console.info(messages);
}
