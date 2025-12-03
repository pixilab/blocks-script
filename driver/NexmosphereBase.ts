/*	PIXILAB Blocks driver for the Nexmosphere line of controllers and elements:
https://nexmosphere.com/technology/xperience-platform/

Base driver for the various kinds of Nexmosphere interfaces, collecting the
common functionality. Note that this isn't the driver the user sees. If you're
looking for that, you probably want the Nexmosphere.ts file instead, or one
of the other subclasses.

This base class provides:
- Unified message parsing and handling for all Nexmosphere protocols
- Support for multiple transport types (NetworkTCP, NetworkUDP, SerialPort)
- Dynamic interface discovery and registration
- Automatic ing for attached elements
- RFID tag detection and processing
- Common interface implementations for various Nexmosphere elements

Transport Support:
- NetworkTCP: Connection-oriented with autoConnect and lifecycle events
- SerialPort: Connection-oriented with autoConnect and lifecycle events  
- NetworkUDP: Connectionless transport use unique listening port for each device and configure the device respectively.

Interface Discovery:
The driver can operate in two modes:
1. Automatic Discovery: Polls interface ports to detect connected elements
2. Manual Configuration: Uses JSON configuration to specify exact interfaces

Configuration option examples:
- Number only: 8 (sets number of ports to poll, just type the number og ports to poll in Driver Options)
- Interface array json (depricated but available for backwards compatibility): 
[{
	"modelCode": "XTB4N",
	"ifaceNo": 1,
	"name": "Buttons"
},{
	"modelCode": "XWL56",
	"ifaceNo": 2,
	"name": "Led"
},{
	"modelCode": "XY116",
	"ifaceNo": 3,
	"name": "Distance"
}]

A more future proof configuration scheme is implemented, use this for any new setups:
	"interfaces": [
		{
			"modelCode": "XTB4N",
			"ifaceNo": 1,
			"name": "Buttons"
		},
		{
			"modelCode": "XWL56",
			"ifaceNo": 2,
			"name": "Led"
		},
		{
			"modelCode": "XY116",
			"ifaceNo": 3,
			"name": "Distance"
		}
	]
}

This allows extending the options for future use, device is implemented as an example, 
it will filter UDP messages based on device ID in cases UDP is forced to use same listeningport:
{
	"device": {
		"udpDeviceID": "00:08:DC:74:B0:2E"
	},
	"interfaces": [
		{
			"modelCode": "XTB4N",
			"ifaceNo": 1,
			"name": "Buttons"
		},
		{
			"modelCode": "XWL56",
			"ifaceNo": 2,
			"name": "Led"
		},
		{
			"modelCode": "XY116",
			"ifaceNo": 3,
			"name": "Distance"
		}
	]
}
The interface "name" settings above are optional, but will make the property paths more
readable and independent of which port the element is connected to on the controller.
If specified, names MUST be unique within the controller.

Currently supported Interface Types (Elements):
- RFID/NFC readers (XRDR1, XRDW2)
- LED controllers (XWC56, XWL56, LightMark, X-Wave, RGBW, MonoLed) 
- Proximity sensors (XY116, XY146, XY176, XY240, XY241)
- Button interfaces (XTB4N, XTB4N6, XT4FW6)
- Motion detectors (XY320)
- Gesture sensors (XTEF650, XTEF30, XTEF630, XTEF680)
- Gender/age detection cameras (XY510, XY520)
- Audio switches Analog: XDW-A50, Opticalx4, Analogx4)
- Lidar sensors (XLIDAR, XQL2, XQL5)
- Dot sensors I/O: XDW-I36,XDW-I56  Analog:  Digital, Temp/Humidity, Light, Angle: XZA40 )
- Wired pickup sensors ("DOTWIREPICKUP","XSNAPPER","XDWX16", "XDWX26", "XDWX36", "XDWX36C", "XDBX16", "XDBX26", "XDBX36", "XDBX36C",
	"XSWX16", "XSWX26", "XSWX36", "XSBX16", "XSBX26", "XSBX36", "XLFWX16", "XLFWX26","XLFWX36", "XLFBX16", "XLFBX26", "XLFBX36"
	"XLCWX16", "XLCWX26", "XLCWX36","XLCBX16", "XLCBX26", "XLCBX36"
-Wireless pickup sensors ("WIRELESSPICKUP"," XFP3W", "XF-P3B", "XF-P3N")
- And a generic UnknownInterface for unsupported types

Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
Created 2021 by Mattias Andersson.
Contributors:Samuel Waltz, NoParking (Added Lidar support. Thanks!)

v.1.1: 
- Added UDP support. 
- Split into baseclass and subclasses for allowing different transport and controller configurations.
- enhanceds support for LightMark, RGB, RGBW, X-Wave, MonoLed built-in interfaces.
- added support more interfaces.
- added send queue to avoid message loss. (Nexmocontrollera can be quite sensitive to message floods)
*/


import {NetworkTCP, NetworkUDP, SerialPort} from "system/Network";
import { Driver } from "system_lib/Driver";
import { callable, driver, max, min, parameter, property } from "system_lib/Metadata";
import { AggregateElem } from "../system_lib/ScriptBase";


// Parse RFID tag detection from XR-DR01 Rfid element
const kRfidPacketParser = /^XR\[P(.)(\d+)]/;

// Parse X talk interfaceNumber and attached Data
const kXTalkPacketParser = /^X(\d+)([AB])\[(.+)]/;

// Parse X talk interfaceNumber and attached Data
const kCtrlPacketParser = /^([PS])(\d+)([AB])\[(.+)]/;

// Controllers response to a product code request (D003B[TYPE]) controller response D001B[TYPE=XRDR1  ]

const kProductCodeParser = /D(\d+)B\[\w+=([^\]]+)]/;
const kUdpPacketParser = /^FROMID=([0-9A-F]{2}(?::[0-9A-F]{2}){5}):(.+)/;
const kUdpRuntimeParser = /RUNTIME=(\d+)HOUR/;
const NEXMOSPHERE_COMMAND_DELAY_MS = 280;

let  _debugLogging = false;	// Controls verbose logging

// A simple map-like object type
export interface Dictionary<TElem> { [id: string]: TElem; }
type SimplePropConstructor = BooleanConstructor | NumberConstructor | StringConstructor;
export type PortType = NetworkTCP | NetworkUDP | SerialPort;	// I accept either type of backend
export type ConnType = NetworkTCP | SerialPort;	// Connectype types I support

// A class constructor function
interface BaseInterfaceCtor<T> { new(driver: NexmosphereBase<PortType>, index: number, channel?:string): T; }

/**
 * Common part of message for all PortTypes
 */
interface IncomingTextMsg {
	text: string;
}

export abstract class NexmosphereBase<P extends PortType> extends Driver<P> {

	// Maps Nexmosphere model name to its implementation type
	private static interfaceRegistry: Dictionary<BaseInterfaceCtor<BaseInterface>>;


	protected pollEnabled = true;      // Config: true unless interfaces hardcoded
	private pollStopped = false;       // Runtime: set true when timeout / manual stop
	private pollQueryCount = 0;        // Individual polls sent
	private readonly maxPollRounds = 10; // Full rounds (numInterfaces each) before timeout
	protected numInterfaces = 8; // Number of "interface channels" in the Nexmosphere controller.

	private lastTag: TagInfo;	// Most recently received RFID TagInfo, awaiting the port message
	protected pollIndex = 0;		// Most recently polled interface
	private awake = false;		// Set once we receive first data from device
	protected udpConnected:boolean = false; // Connection status, as determined by subclass
	protected readonly interface: BaseInterface[]; // Interfaces discovered, keyed by 0-based index
	private readonly element: Dictionary<BaseInterface>; // Named aggregate properties for each interface
	private udpResponsTestInterval: CancelablePromise<void>; // Holds the interval timer 
	private waitingForUdpHartbeat = false;
	private dynProps: Record<string, any> = {};
	private	myDeviceID: string = "";
	private msgQueue: Array<() => Promise<void>> = [];
	private isBusyProcessingQueue = false;
	
	

	protected constructor(protected port: P, numbOfInterfaces?: number) {
		super(port);
		this.element = this.namedAggregateProperty("element", BaseInterface);
		this.interface = [];
		if (port.enabled){
		// Check if the driver has been configured with any options, and if so, parse them.
			if (port.options ) {
				const options = JSON.parse(port.options);
				if (typeof options === "number") {	
					this.numInterfaces = options;	// overrides number of interfaces since it is specified in the json obj
					this.pollEnabled = true;
				}
				if (typeof options === "object") {
					if (options.device?.udpDeviceID){  //Has device ID for UDP alternative options configuration scheme.
						 this.myDeviceID = options.device.udpDeviceID;		
						 log("Using hardcoded device ID for UDP:", this.myDeviceID);
					}
					if (options.interfaces?.length > 0) {
						this.addInterfaces(options.interfaces);
					} else {
						this.addInterfaces(options); //Assume options is the interfaces array
					}
				}
			}	
		console.log("Driver enabled");
		if (numbOfInterfaces){	// for subclasses to override the number of port
			log("Subclass has number of  ports: " + numbOfInterfaces)
			this.numInterfaces = numbOfInterfaces;
		}	
		}
	}
	private addInterfaces(ifaces: IfaceInfo[]){
		this.pollEnabled = false;
					for (let iface of ifaces) {
						log("Specified interfaces", iface.ifaceNo, iface.modelCode, iface.name);
						this.addInterface(iface.ifaceNo, iface.modelCode, iface.name);
					}
	}
	
	/**
	 * Connection status, as determined by subclass.
	 */
	@property("Connected to Nexmosphere device", true)
	public get connected(): boolean {
		return this.considerConnected();
	}

	/** Ret true if using UDP transport.
	 * 
	*/
	protected isUDP(){
		return this.port.isOfTypeName("NetworkUDP")
	}

	/**
	 * Ret true if I have any interfaces.
	 */
	protected hasInterfaces() {
		return !!this.interface.length;
	}


	protected setUdpConnected(val:boolean){
        if (this.udpConnected === val) return;
        const prev = this.udpConnected;
        log("Setting UDP connected to", val);
        this.udpConnected = val;
        this.changed("connected");
        // On first transition to connected, restart polling if previously stopped
        if (val && !prev && this.pollStopped) {
            log("UDP reconnected - resetting polling");
            this.pollStopped = false;
            this.pollQueryCount = 0;
            this.pollIndex = 0;
            if (this.pollEnabled) this.pollNext();
        }
    }
	

	/* Strip off any leading ID info from incoming message in UDP case */
	protected stripFromId(input:string):string {
		const lastColonIndex = input.lastIndexOf(":");
		if (lastColonIndex === -1) return input; // no colon found
		return input.slice(lastColonIndex + 1);
	
	}

	/**
	 * Return true if to be considered "connected" (whatever that means in the particular
	 * subclass case, which especially in the case of UDP is more complex since
	 * there's no underlying connetion, but the state here may need to be inferred
	 * from the most recent response from the device or similar.
	 */
	protected considerConnected(): boolean {
		return this.udpConnected;
	}

	static registerInterface(ctor: BaseInterfaceCtor<BaseInterface>, ...modelName: string[]) {
		if (!NexmosphereBase.interfaceRegistry)
			NexmosphereBase.interfaceRegistry = {};	// First time init
		modelName.forEach(function (name) {
			NexmosphereBase.interfaceRegistry[name] = ctor;
		});
	}

	/**
	 * Initializes the connection and polling for TCP or Serial transports.
	 */
	protected initConnection(port: ConnType) {
		
		(<any>this.port).autoConnect();
	
			// Poll for connected interfaces once connected (not if hardcoded by Driver options
			port.subscribe('connect', (sender, message) => {
			// Initiate polling once connected and only first time (may reconnect several times)
			if (message.type === 'Connection' && port.connected) { // Just connected
				log("Connected", this.pollEnabled)
				 // Reset polling after (re)connect
                if (this.pollStopped) {
                    log("Reconnected - resetting polling");
                    this.pollStopped = false;
                    this.pollQueryCount = 0;
                    this.pollIndex = 0;
                }
				if (!this.pollIndex && this.pollEnabled)	// Not yet polled for interfaces and polling is enabled
					this.pollNext();	// Get started
			} else {	// Connection failed or disconnected
				log("Disconnected")
				if (!this.interface.length)	// Got NO interfaces - re-start polling on next connect
					this.pollIndex = 0;
			}
		});
		
		(<any>this.port).subscribe('textReceived', (sender: P, message: IncomingTextMsg) => {
		if (!message.text) return;
		if (!this.awake) {
			this.awake = true;
			this.pollIndex = 0;
		}
		this.handleMessage(message.text);
		});
	}
	
	protected initUdp() {
		// Fix initUdp subscription
	(<any>this.port).subscribe('textReceived', (sender: P, message: IncomingTextMsg) => {
		if (!message.text) return;
		log("Incoming data in subscription", message.text);
		this.setUdpConnected(true);
		if (!this.awake) {
			this.awake = true;
			this.pollIndex = 0;
			this.waitingForUdpHartbeat = false;
			if (this.pollEnabled) this.pollNext();
		}
    this.handleMessage(message.text);
});
		this.subscribe('finish', () => {
		this.stopUdpHartbeat();
		this.setUdpConnected(false);
		console.log("Driver disabled, shutdown");
		})
		this.initDynamicProp("runtime", Number);
		this.initDynamicProp("deviceID", String);
		this.sendUdpHartbeat()
		
	}

private initDynamicProp(
	propname: string,
	type: SimplePropConstructor,
	...onSetCallbacks: ((value: any) => void)[]
) {
	this.property(
		propname,
		{ type },
		(sv) => {
			if (sv !== undefined) {
				if (this.dynProps[propname] !== sv) {
					this.dynProps[propname] = sv;
					this.changed(propname);
					// Call all provided callbacks
					for (const cb of onSetCallbacks) {
						cb(sv);
					}
				}
			}
			return this.dynProps[propname];
		}
	);
}
	

	private sendUdpHartbeat() {
		// Send immediately, then every X seconds (adjust as needed)
		log("Scheduling next UDP hartbeat poll", this.port.enabled);
		this.send("N000B[RUNTIME?]");
		this.waitingForUdpHartbeat = true;
		this.udpResponsTestInterval = wait(5000);
		this.udpResponsTestInterval.then(()=> {
		if (this.waitingForUdpHartbeat && this.considerConnected()){ //We have not seen devivce for X sec, set status to false
			console.log(" UDP hartbeat reply missing, change connected status false");
			this.setUdpConnected(false);
		}
		this.sendUdpHartbeat();
		});
		
	}

	
	private stopUdpHartbeat() {
		log("Stopping UDP hartbeat polling");
		if (this.udpResponsTestInterval) {
				this.udpResponsTestInterval.cancel();
				this.udpResponsTestInterval = undefined;
		}     
	}
	

	/*	Poll next port, then next one (if any) with some delay between each.
	*/
	protected pollNext() {
		if (!this.pollEnabled) return;
        if (this.pollStopped) return;
        if (!this.considerConnected()) return;

        // Timeout check (no interfaces found after maxPollRounds full cycles)
        const fullRounds = Math.floor(this.pollQueryCount / this.numInterfaces);
        if (fullRounds >= this.maxPollRounds && !this.interface.length) {
            log("Polling timeout after", fullRounds, "rounds - stopping");
            this.pollStopped = true;
            return;
        }
		let ix = this.pollIndex + 1 | 0; // |0 forces integer value

		//Jumping to the next expected portrange if using an XM system with shop-bus.
		if (ix % 10 === 9) {	// Skip all checks unless ix ends in 9 (which seems to be invariant)
			const tens = Math.round(ix / 10);
			if (ix < 200) {
				switch (tens) {
					case 0:
						ix = 111;	// Big jump from 9 up to 111
						break;
					case 11:		// These ones skip from 119 to 121, etc
					case 12:
					case 13:
					case 14:
					case 15:
						ix += 2;
						break;
					case 16:
						ix = 211;
						break;
				}
			} else {	// Deal with 200 and up
				switch (tens % 10) {	// All the rest are the same based on 2nd index digit
					case 1:		// Small skip - same as above
					case 2:
					case 3:
					case 4:
						ix += 2;
						break;
					case 5:
						if (ix >= 959)
							throw "Port number is out of range for the device."
						ix += 311 - 259;	// Larger incremental jump, e.g. from 259 to 311
						break;
				}
			}
		}
		this.pollIndex = ix;
		this.queryPortConfig(ix);
		this.pollQueryCount++;
		let pollAgain = false;
		log("Poll again?:" + pollAgain, this.pollIndex, this.numInterfaces, this.considerConnected())
		if (this.pollIndex < this.numInterfaces) // Poll next one soon
			pollAgain = true;
		else if (!this.interface.length) {	// Restart poll if no fish so far
			this.pollIndex = 0;
			pollAgain = true;
		}
		if (pollAgain && !this.pollStopped && this.considerConnected())
			wait(500).then(() => this.pollNext());
	}


	/**
	* Send a query for what's connected to port (1-based)
	*/
	private queryPortConfig(portNumber: number) {
		let typeQuery = padVal(portNumber,3) // Pad index with leading zeroes
		typeQuery = "D" + typeQuery + "B[TYPE]";
		log("Query ", typeQuery);
		this.send(typeQuery,true); //Send with priority
	}

	/**
	* Send raw messages to the Nexmosphere controller
	*/
@callable("Send raw string data to the Nexmosphere controller")
send(rawData: string, priority: boolean = false) {
    log("Queue msg: ", rawData);

    const task = async () => {
		if (this.isUDP())
        this.port.sendText(rawData + "\r\n");
		else
		this.port.sendText(rawData , "\r\n");	
        log("Send msg: ", rawData);
    };
this.msgQueue.push(task)
    if (priority) {
        // ⭐ Insert at front of queue
        this.msgQueue.unshift(task);
    } else {
        // normal message
        this.msgQueue.push(task);
    }

    this.processQueue();
}
	
	async processQueue() {
		if (this.isBusyProcessingQueue) return;
		this.isBusyProcessingQueue= true;

		while (this.msgQueue.length > 0) {
			log("Processing queue, length:", this.msgQueue.length);
			if (this.msgQueue.length > 20) {
            console.warn(
                `Nexmosphere command queue is growing! Current size: ${this.msgQueue.length}`
            );
        }
			const task = this.msgQueue.shift();
			if (task) await task();
			await commandDelay(); // enforce spacing between commands
		}

		this.isBusyProcessingQueue = false;
}

	// Expose reInitialize to tasks to re-build set of dynamic properties
	@callable("Re-initialize driver, after changing device configuration")
	reInitialize() {
		super.reInitialize();
	}

	// Expose reInitialize to tasks to re-build set of dynamic properties
	@callable("Enable logging ")
	debugLogging(value: boolean) {
		_debugLogging = value;
		console.log("Nexmosphere debug logging enabled:", _debugLogging);
	}


	protected handleMessage(msg: string) {
		log("Raw data recieved in handleMessage", msg);


		// Map of regex → handler
		const handlers: [RegExp, PacketHandler][] = [
			[kUdpPacketParser, (parseResult) => {
				log("UDP Packet parsed in handler", msg);
				const innerMsg = parseResult[2];
				const id = parseResult[1];

				if (!this.dynProps["deviceID"]){ // No deviceID set yet
					if (innerMsg.indexOf("RUNTIME=") && !this.myDeviceID){ //Runtime message and no hardcoded deviceID from options	
						this.dynProps["deviceID"] = id; //Use senders ID as deviceID when no hardcoded ID set from options	
						console.log("Setting deviceID from UDP sender", id);
					} else if (this.myDeviceID){
							this.dynProps["deviceID"] = this.myDeviceID;  //Use the hardcoded deviceID from options
						console.log("Using hardcoded deviceID for UDP:", this.myDeviceID);
					}
				}
				if (this.dynProps["deviceID"] !== id) {
					log("Ignoring UDP message from other device", id, "expected", this.dynProps["deviceID"]);
					return; //Early out - not my device
    }
				this.handleMessage(innerMsg); // Recursive handling of inner message if from known deviceID	
				
				
			}],
			[kRfidPacketParser, (parseResult) => {
				log("RFID tag event parsed in handler", msg);
				this.lastTag = {
					isPlaced: parseResult[1] === "B",
					tagNumber: parseInt(parseResult[2])
				};
			}],
			[kXTalkPacketParser, (parseResult) => {
				const portNumber = parseInt(parseResult[1]);
				const dataReceived = parseResult[3];
				log("Xtalk data parsed in handler from port", portNumber, "Data", dataReceived);
				const interfacePort = this.interface[portNumber - 1];
				if (interfacePort) {
					interfacePort.receiveData(dataReceived, this.lastTag);
				} else {
					console.warn("Message from unexpected port", portNumber);
				}
			}],
			[kCtrlPacketParser, (parseResult) => {
				const msgType = parseResult[1];
				const portNumber = parseInt(parseResult[2]);
				const dataReceived = parseResult[4];
				log("Controller message of type",msgType,"parsed in handler from port", portNumber, "Data", dataReceived);
				//We pass those messages to the general controller message handler defined in sublass
				this.handleControllerMessage(dataReceived);
			
				
			}],
			[kProductCodeParser, (parseResult) => {
				log("TypeQReply parsed in handler", msg);
				const modelCode = parseResult[2].trim();
				const portNumber = parseInt(parseResult[1]);
				this.addInterface(portNumber, modelCode);
			}],
			[kUdpRuntimeParser, (parseResult) => {
			log("UDP Hartbeat reply parsed in handler", msg);
				if (this.isUDP() && this.waitingForUdpHartbeat) {
					const runtimeHours = parseInt(parseResult[1]);
					if (this.dynProps["runtime"] === runtimeHours) return; // No change
					this.dynProps["runtime"] = runtimeHours;
					this.changed("runtime");
				}
				this.waitingForUdpHartbeat = false;    
			}]
		];

		// Iterate through handlers
		for (const [regex, handler] of handlers) {
			const parseResult = regex.exec(msg);
			if (parseResult) {
				handler(parseResult, msg);
				return; // Stop after first match
			}
		}
		// If no handlers matched
		console.warn("Unknown command received from controller", typeof msg, msg);
	}

	protected handleControllerMessage(message: string) {
			// To be implemented by subclasses
			return
	}

	/**
	 * Find subclass matching modelCode and instantiate proper BaseInterface subclass.
	 */
	private addInterface(
		portNumber: number,	// 1-based interface/port number
		modelCode: string, // Nexmosphere's element model code
		name?: string,	  // optional name (from Config Options)
		channel?: string 	// optional channelname e.g. for RGBW elements
	) {
		const ix = portNumber - 1;
		let ctor = NexmosphereBase.interfaceRegistry[modelCode];
		if (!ctor) {
			console.warn("Unknown interface model - using generic 'unknown' type", modelCode);
			ctor = UnknownInterface;
		}
		// Make it accessible both by name and 0-based interface index
		log("Adding interface", portNumber, modelCode, name || "", channel ||  "");
		const iface = new ctor(this, ix, channel);
		let ifaceName = name;
		let ifaceChannel = channel;
		if (!ifaceName) {	// Synthesize a name
			ifaceName = iface.userFriendlyName();
			if (!(iface instanceof UnknownInterface)) // Skip funky FFF... "model code"
				ifaceName = ifaceName + '_' + modelCode;
			ifaceName = ifaceName + '_' + portNumber
			if (ifaceChannel)
				ifaceName = ifaceName + '_' + ifaceChannel;
		}

		this.interface[ix] = this.element[ifaceName] = iface;
	}

	protected addBuiltInInterfaces(specialPorts: BuiltInElements){
		for (const specialPort of specialPorts){
            log("Adding controller onboard interface", specialPort[0], specialPort[1], specialPort[2]);
			this.addInterface(specialPort[1], specialPort[0],undefined, specialPort[2]);
        }
	}
}
/**
 * Nexmosphere requires >= 50 ms delay after each command
 * (in practice the needed delay seems to be longer)
 */

function commandDelay(): Promise<void> {
	return new Promise<void>((resolve) => {
		wait(NEXMOSPHERE_COMMAND_DELAY_MS).then(() => {
			resolve();
		});
	});
}
/**
 * Interface base class.
 */
class BaseInterface extends AggregateElem {
	protected _channel: string;
	protected _command: string;
	protected readonly collectors: Dictionary<{ buffer: string; timer: CancelablePromise<void>,blocked:boolean | null }> = {};

	constructor(
		protected readonly driver: NexmosphereBase<PortType>,
		protected readonly index: number,
		protected readonly name?: string,
		protected readonly channel?: string
	) {
		super();
		this._channel = channel;
	}
	/* Returns 1-based interface number as string, padded to 3 digits */
	protected ifaceNo(): string {
        return padVal(this.index + 1);
    }




	protected sendData(data: string) { 
		this.driver.send(data);
	}
	receiveData(data: string, tag?: TagInfo): void {
		console.log("Unexpected data recieved on interface " + this.index + " " + data);
	}
	protected createBurstCollector(
	name: string,
	sendFn: (s: string) => void,
	delay = 20,
	prefix: string = '',
	suffix: string = '',
	maxLength: number = Infinity
	) {
	if (!this.collectors[name]) {
		this.collectors[name] = { buffer: '', timer: null, blocked: false };
	}

	return (ch: string) => {
		const collector = this.collectors[name];

		// Ignore input if burst is blocked
		if (collector.blocked) return;

		collector.buffer += ch;

		// If max length reached, send immediately and block further input until next burst
		if (collector.buffer.length >= maxLength) {
		sendFn(prefix + collector.buffer.slice(0, maxLength) + suffix);
		collector.buffer = '';
		collector.blocked = true;

		// Reset blocked status after delay
		if (collector.timer) collector.timer.cancel();
		collector.timer = wait(delay);
		collector.timer
			.then(() => {
			collector.blocked = false;
			collector.timer = null;
			})
			.catch(() => {});
		return;
		}

		// Normal timer flush
		if (collector.timer) collector.timer.cancel();
		collector.timer = wait(delay);
		collector.timer
		.then(() => {
			if (collector.buffer) {
			sendFn(prefix + collector.buffer);
			collector.buffer = '';
			}
			collector.timer = null;
		})
		.catch(() => {});
	};
	}


	userFriendlyName() {
		return "Unknown";
	}
}

// Generic interface used when no matching type found, just providing its last data as a string
class UnknownInterface extends BaseInterface {
	private propValue: string;

	@property("Raw data last received from unknown device type", true)
	get unknown() {
		return this.propValue;
	}
	set unknown(value: string) {
		this.propValue = value;
	}

	receiveData(data: string) {
		this.unknown = data;
	}
}
// Instantiated manually, so no need to register

/**
 * RFID detector.
 */
class RfidInterface extends BaseInterface {

	private mTagNumber = 0;
	private mIsPlaced = false;

	@property("Last recieved RFID tag ID", false)
	get tagNumber(): number {
		return this.mTagNumber;
	}
	set tagNumber(value: number) {
		this.mTagNumber = value;
	}

	@property("RFID tag is detected", true)
	get isPlaced(): boolean { return this.mIsPlaced; }
	set isPlaced(value: boolean) { this.mIsPlaced = value; }

	receiveData(data: string, tag?: TagInfo) {
		this.isPlaced = tag.isPlaced
		this.tagNumber = tag.tagNumber;
	}

	userFriendlyName() {
		return "RFID";
	}
}
NexmosphereBase.registerInterface(RfidInterface, "XRDR1");

class NfcInterface extends BaseInterface {
	private lastTagEvent: string = "";

	// Property backing
	private mTagUID = "";
	private mIsPlaced = false;

	@property("Last recieved tag UID", false)
	get tagUID(): string { return this.mTagUID; }
	set tagUID(value: string) { this.mTagUID = value; }

	@property("A tag is placed", true)
	get isPlaced(): boolean { return this.mIsPlaced; }
	set isPlaced(value: boolean) { this.mIsPlaced = value; }


	receiveData(data: string) {
		console.log(data);
		let splitData = data.split(":");
		const newTagData = splitData[1];
		const newTagEvent = splitData[0];
		this.lastTagEvent = newTagEvent;

		switch (newTagEvent) {
			case "TD=UID":
				this.isPlaced = true;
				this.tagUID = newTagData;
				break;
			case "TR=UID":
				this.isPlaced = false
				break;
			default:
				super.receiveData(data);
				break;
		}
	}

	userFriendlyName() {
		return "NFC";
	}
}
NexmosphereBase.registerInterface(NfcInterface, "XRDW2");

class XWaveLedInterface extends BaseInterface {
	

	@property('X-Wave api command to send e.g. "290C99"')
	get X_Wave_Command(): string { return this._command; }
	set X_Wave_Command(value: string) {  //Keep using old prop name for backwards compatibility
		this.sendData("X" + this.ifaceNo() + "B[" + value + "]")
		this._command = value;
	}
	

@callable("Define a custom color")
	defineColor(
		@parameter("color id 0-15") color: number ,
		@parameter("red 0-255") red: number, 
		@parameter("green 0-255") green: number,
		@parameter("blue 0-255") blue: number){
			const c = toHex(limitedVal(color, 0, 15), 1);	
			const rr = toHex(limitedVal(red, 0,255));
			const gg = toHex(limitedVal(green, 0,255));
			const bb = toHex(limitedVal(blue, 0,255));
			const cmd = "1" + c + rr  + gg + bb;
			this. X_Wave_Command = cmd;	
	}

	@callable("Set state (single ramp)")
	setSingleRamp(
		@parameter("LED Brightness 0-99") brightness: number, 
		@parameter("color 0-15") color: number,	
		@parameter("ramptime 0-99(x0.1s)") ramp: number){
		const bb = padVal(limitedVal(brightness, 0,99),2);
		const c = toHex(limitedVal(color, 0, 15),1);	
		const tt = padVal(limitedVal(ramp, 0, 99),2);
		
		//[2IICTT]
		let cmd = "2"+ bb + c + tt;
		this.X_Wave_Command = cmd;
	}

	
	@callable("Set state (pulsing)")
	setPulsing(
		@parameter("State 1 LED Brightness 0-99",) brightness1: number, 
		@parameter("State 1 color 0-15") color1: number,	
		@parameter("State 1 time 1-99(x0.1s)") time1: number,
		@parameter("State 2 LED Brightness 0-99") brightness2: number, 
		@parameter("State 2 color 0-15") color2: number,	
		@parameter("State 2 time 1-99(x0.1s)") time2: number,
		@parameter("Number of repeats 0=infinite 0-99") repeats: number = 0,
		@parameter("Ramp time 2-99 must be smaller than time 1 and time 2") ramp: number,
		
	){
		const II1 = padVal(limitedVal(brightness1, 0,99),2);
		const c1 = toHex(limitedVal(color1, 0, 15), 1);	
		const tt1 = padVal(limitedVal(time1, 0, 99),2);
		const II2 = padVal(limitedVal(brightness2, 0,99),2);
		const c2 = toHex(limitedVal(color2, 0, 15), 1);	
		const tt2 = padVal(limitedVal(time2, 0, 99),2);
		const nn = padVal(limitedVal(repeats, 0, 99),2);
		const rr = padVal(limitedVal(ramp, 2, Math.min(parseInt(tt1), parseInt(tt2), 99)),2); //Max 99 but must be smaller than both times
		
		
		let cmd = "3" + II1 + c1 + tt1 + "01" + "0" + II2 + c2 + tt2 + nn + rr;;
		
		this.X_Wave_Command = cmd;	
	}
	@callable("Set state (wave)")
	setWave(
		@parameter("State 1 LED Brightness 0-99") brightness1: number, 
		@parameter("State 1 color 0-15") color1: number,	
		@parameter("State 1 animation duration 1-99(x0.1s)") duration: number,
		@parameter("Program 00-01 (sinewave) or 51-59 (discrete)00 = Symmetrical sinewave   01 = Asymmetrical sinewave51-59 = Discrete running light (1-9 LEDs “running”)") program: number,
		@parameter("Option  indicates direction  -  01-04 1 = Left   2 = Right   3 = Outwards   4 = Inwards") option: number,
		@parameter("State 2 LED Brightness 0-99") brightness2: number, 
		@parameter("State 2 color 0-15") color2: number,		
		@parameter("Numb er of LEDs in animation 1-99") leds: number,
		
	){
		const bb1 = padVal(limitedVal(brightness1, 0,99),2);
		const c1 = toHex(limitedVal(color1, 0, 15), 1);	
		const dd  = padVal(limitedVal(duration, 1, 99),2);
		const pp = padVal(limitedVal(program, 0, 59),2);
		const o = limitedVal(option, 1, 4);
		const bb2 = padVal(limitedVal(brightness2, 0,99),2);
		const c2 = toHex(limitedVal(color2, 0, 15), 1);
		const nn = padVal(limitedVal(leds, 1, 99),2);
			
		//X002B[45033011506001]
		//[4IICDDPPOIICUULL]
		let cmd = "4" + bb1 + c1 + dd + pp + o + bb2 + c2 + "00" + nn;
	

		this.X_Wave_Command = cmd;	
	}

	userFriendlyName() {
		return "LED";
	}
}
NexmosphereBase.registerInterface(XWaveLedInterface, "XWC56", "XWL56", "XW");


const stateTooltip = "Define as Segment state 0-4 (Will translate to api designators '&', '+', '-', '$', '%') defaults to 0 = background ('&')"
const segmentStateDesignator = ['&','+', '-', '$', '%'];
class LightmarkLedInterface extends BaseInterface {


@property("Lightmark command to send ('Cc=ARRGGBB]') e.g 'Cc=100FF1F', if read it will return last sent command.")
	get command(): string { return this._command }		
	set command(cmd: string) {
		this.sendCommand(cmd); 
		this._command = cmd;
	}
	

@callable("Define a custom color")
	defineColor(
		@parameter("color id 0-15") color: number ,
		@parameter("red 0-255") red: number, 
		@parameter("green 0-255") green: number,
		@parameter("blue 0-255") blue: number,
		@parameter("white 0-255") white: number)	 {
			const c = toHex(limitedVal(color, 0, 15), 1);	
			const rr = toHex(limitedVal(red, 0,255));
			const gg = toHex(limitedVal(green, 0,255));
			const bb = toHex(limitedVal(blue, 0,255));
			const ww = toHex(limitedVal(white, 0,255));
			const cmd = "Cc=" + c + rr  + gg + bb + ww;
			this.command = "B["+ cmd + "]";	
	}
	
@callable("Set state (single ramp)")
	setSingleRamp(
		@parameter("LED Brightness 0-99") brightness: number, 
		@parameter("color 0-15") color: number,	
		@parameter("ramptime 0-99(x0.1s)") ramp: number,
		@parameter(stateTooltip,true) state: number = 0

	){
		const bb = padVal(limitedVal(brightness, 0, 99),2);
		const c = toHex(limitedVal(color, 0, 15), 1);	
		const tt = padVal(limitedVal(ramp, 0, 99),2);
		const ss = limitedVal(state, 0, 4);
		//[Lc=RBBCTT]
		let cmd = "R"+ bb + c + tt;
		if (ss)
			cmd = "Ss=" + segmentStateDesignator[state]  + cmd;
		else
			cmd = "Lc=" + cmd;

		this.command = "B["+ cmd + "]";
	}
@callable("Set state (pulsing)")
	setPulsing(
		@parameter("State 1 LED Brightness 0-99") brightness1: number, 
		@parameter("State 1 color 0-15") color1: number,	
		@parameter("State 1 time 1-99(x0.1s)") time1: number,
		@parameter("State 2 LED Brightness 0-99") brightness2: number, 
		@parameter("State 2 color 0-15") color2: number,	
		@parameter("State 2 time 1-99(x0.1s)") time2: number,
		@parameter("Number of repeats 0=infinite 0-99") repeats: number = 0,
		@parameter("Ramp time 2-99 must be smaller than time 1 and time 2") ramp: number,
		@parameter(stateTooltip,true) state: number = 0
	){
		const bb1 = padVal(limitedVal(brightness1, 0, 99),2);
		const c1 = toHex(limitedVal(color1, 0, 15), 1);	
		const tt1 = padVal(limitedVal(time1, 0, 99),2);
		const bb2 = padVal(limitedVal(brightness2, 0, 99),2);
		const c2 = toHex(limitedVal(color2, 0, 15), 1);	
		const tt2 = padVal(limitedVal(time2, 0, 99),2);
		const nn = padVal(limitedVal(repeats, 0, 99),2);
		const rr = padVal(limitedVal(ramp, 2, Math.min(parseInt(tt1), parseInt(tt2), 99)),2); //Max 99 but must be smaller than both times
		const ss = limitedVal(state, 0, 4);
		//Lc=PBBCTTPPOBBCTTNNRR
		let cmd = "P" + bb1 + c1 + tt1 + "01" + "0" + bb2 + c2 + tt2 + nn + rr;;
		
		if (ss)
			cmd = "Ss=" + segmentStateDesignator[state]  + cmd;
		else
		   cmd = "Lc=" + cmd

		this.command = "B["+ cmd + "]";
	}

	@callable("Set state (wave)")
	setWave(
		@parameter("State 1 LED Brightness 0-99") brightness1: number, 
		@parameter("State 1 color 0-15") color1: number,	
		@parameter("State 1 animation duration 1-99(x0.1s)") duration: number,
		@parameter("Program 00-01 (sinewave) or 51-59 (discrete)00 = Symmetrical sinewave   01 = Asymmetrical sinewave51-59 = Discrete running light (1-9 LEDs “running”)") program: number,
		@parameter("Option  indicates direction  -  01-04 1 = Left   2 = Right   3 = Outwards   4 = Inwards") option: number,
		@parameter("State 2 LED Brightness 0-99") brightness2: number, 
		@parameter("State 2 color 0-15") color2: number,		
		@parameter("Number of LEDs in animation 1-99") leds: number,
		@parameter(stateTooltip,true) state: number = 0
	){
		const bb1 = padVal(limitedVal(brightness1, 0, 99),2);
		const c1 = toHex(limitedVal(color1, 0, 15), 1);	
		const d  = padVal(limitedVal(duration, 1, 99),2);
		const pp = padVal(limitedVal(program, 0, 59),2);
		const o = limitedVal(option, 1, 4);
		const bb2 = padVal(limitedVal(brightness2, 0, 99),2);
		const c2 = toHex(limitedVal(color2, 0, 15), 1);
		const nn = padVal(limitedVal(leds, 1, 99),2);
		const ss = limitedVal(state, 0, 4);	
		
		//Lc=WBBCDDPPOBBCRRNN
		let cmd = "W" + bb1 + c1 + d + pp + o + bb2 + c2 + "00" + nn;
		if (ss)
			cmd = "Ss=" + segmentStateDesignator[state]  + cmd;
		else
		   cmd = "Lc=" + cmd

		this.command = "B["+ cmd + "]";
	}

	// Burst collector for segment definition, to allow defining multiple segments with repeated callable
	private send = (s: string) => {this.command = s; };
	private addSegment = this.createBurstCollector('segment', this.send, 25, "[Sd=","]",26);
	
	@callable("Define segment")
	defineSegment(
		@parameter("Add LED segment length 1-15 use multiple callables in same task to configure many segments") segment: number,){	 
	
	this.addSegment(toHex(limitedVal(segment, 1, 15), 1));
	}	

	// Burst collector for state setting, to allow setting multiple segments with repeated callable
	private addStates = this.createBurstCollector('state', this.send, 25,"[Sd=","]");
	@callable("Set segment to stored state, run callable repeatedly to assign each state to groups of segments (5 is max)", )
	setState(
		@parameter("Send to segments (as defined) names a,b,c and so on in order they been defined e.g 'adf' or 'bdt'. Defaults to '#' for all other segments") segments: string = "#",
		@parameter(stateTooltip,true) state: number = 0)
{
		const ss = limitedVal(state, 0, 4);	
		const segs = segments.replace(/[^a-zA-Z#]/g, '');
		this.addStates(segmentStateDesignator[ss] + segs );
	}
	@callable("Set animation fade transition 1-100 and they represent steps of 20mS.")
	setAnimationFadeTime(
	@parameter("Fade time 1-100 (x0.02s)") fadetime: number,
	@parameter(stateTooltip,true) state: number = 0)
	{
		const ss = limitedVal(state, 0, 4);
		const ft = limitedVal(fadetime, 1, 100);
		const cmd = ss + 15 + ":" + ft;
		this.command = "S[" + cmd + "]";
	}

	@callable("Set state fade transition 1-100 and they represent steps of 20mS.")
	setStateFadeTime(
	@parameter("Fade time 1-100 (x0.02s)") fadetime: number,
	@parameter(stateTooltip,true) state: number = 0)
	{
		const ss = limitedVal(state, 0, 4);
		const ft = limitedVal(fadetime, 1, 100);
		const cmd = ss + 20 + ":" + ft;
		this.command = "S[" + cmd + "]";
	}

	@callable("Set state fade transition 1-100 and they represent steps of 20mS.")
	setSegmentBlend(
	@parameter("Blend width 1-6 LEDs") blendWidth: number,
	@parameter(stateTooltip,true) state: number = 0)
	{
		const ss = limitedVal(state, 0, 4);
		const ft = limitedVal(blendWidth, 1, 6);
		const cmd = ss + 25 + ":" + ft;
		this.command = "S[" + cmd + "]";
	}
	sendCommand(cmd: string) {
		this.sendData("X" + this.ifaceNo() + cmd)
	}
	userFriendlyName() {
		return "LED";
	}
}
NexmosphereBase.registerInterface(LightmarkLedInterface, "LightMark");

class RGBInterface extends BaseInterface {

	constructor(driver: NexmosphereBase<PortType>, index: number, channel?: string) {
		super(driver, index,undefined, channel);
		
	}

	@property("RGB command to send e.g 'A 0 80 5' or 'B 255 0 0', if read it will return last sent command.")
	get command(): string { return this._command; }
	set command(cmd: string) {
		this.sendCommand(cmd); 
		this._command = cmd;
	}

	@callable("Define a new RGB color on this controller")
	defineColor(
		@parameter("color 1-9" ) color: number ,
		@parameter("red 0-100") red: number, 
		@parameter("green 0-100") green: number,
		@parameter("blue 0-100") blue: number
	){
		const c = limitedVal(color, 1, 9);	
		const r = padVal(limitedVal(red, 0,100));
		const g = padVal(limitedVal(green, 0,100));
		const b = padVal(limitedVal(blue, 0,100));
		const cmd = c + " " + r + " " + g + " " + b;
		this.command = cmd;
			
	}

	@callable("Set RGB output (single ramp)")
	setSingleRamp(
		@parameter("color 1-9" ) color: number ,
		@parameter("brightness 0-100") brightness: number, 
		@parameter("ramptime 0-999(x0.1s)") ramp: number,
		@parameter("Send to channel defaults to all",true) channel: number | 0,
		
	){
		const c1 = limitedVal(color, 1, 9);	
		const br = padVal(limitedVal(brightness, 0,100));
		const r1 = padVal(limitedVal(ramp, 0, 999));
		const ch = channel ? channel:"X" ;
		const cmd = ch + " " + c1 + " " + br + " " + r1;
		this.command = cmd;
			
	}

	@callable("Set RGB output (pulsing)")
	setPulsing(
		@parameter("Ramp 1 color 1-9" ) color1: number ,
		@parameter("Ramp 2 brightness 0-100") brightness1: number, 
		@parameter("Ramp 2 time 0-999(x0.1s)") ramp1: number,
		@parameter("Ramp 2 color 1-9" ) color2: number ,
		@parameter("Ramp 2 brightness 0-100") brightness2: number, 
		@parameter("Ramp 2 time 0-999(x0.1s)") ramp2: number,
		@parameter("Send to channel defaults to all",true) channel: number | 0,
		
	){
		const c1 = limitedVal(color1, 1, 9);	
		const br1 = padVal(limitedVal(brightness1, 0,100));
		const ra1 = padVal(limitedVal(ramp1, 0, 999));
		const c2 = limitedVal(color2, 1, 9);	
		const br2 = padVal(limitedVal(brightness2, 0,100));
		const ra2 = padVal(limitedVal(ramp2, 0, 999));
		const ch = channel ? channel:"X" ;
		const cmd = ch + " " + c1 + " " + br1 + " " + ra1+ " " + c2 + " " + br2 + " " + ra2;
		this.command = cmd;
			
	}
	userFriendlyName() {
		return "LED";
	}

	sendCommand(cmd: string) {
		this.sendData("G" + this.ifaceNo() + "B[" + cmd + "]")
	}	
}
NexmosphereBase.registerInterface(RGBInterface, "RGB", "EM6", "SM115" );

class RGBWInterface extends BaseInterface {



	constructor(driver: NexmosphereBase<PortType>, index: number, channel?: string) {
		super(driver, index,undefined, channel);
		
	}

	@property("RGBW command to send e.g 'A 0 80 5' or 'B 255 0 0 255', if read it will return last sent command.")
	get command(): string { return this._command; }
	set command(cmd: string) {
		this.sendCommand(cmd); 
		this._command = cmd;
	}
	

	@callable("Define a new RGBW color on this controller")
	defineColor(
		@parameter("color 1-9" ) color: number ,
		@parameter("red 0-100") red: number, 
		@parameter("green 0-100") green: number,
		@parameter("blue 0-100") blue: number,
		@parameter("white 0-100") white: number
	)	
	{
		const c = limitedVal(color, 1, 9);	
		const r = padVal(limitedVal(red, 0,100));
		const g = padVal(limitedVal(green, 0,100));
		const b = padVal(limitedVal(blue, 0,100));
		const w = padVal(limitedVal(white, 0,100));
		const cmd = c + " " + r + " " + g + " " + b + " " + w;
		this.command = cmd;	
	}

	@callable("Set RGBW output (single ramp)")
	setSingleRamp(
		@parameter("color 1-9" ) color: number ,
		@parameter("brightness 0-100") brightness: number, 
		@parameter("ramptime 0-999(x0.1s)") ramp: number,
		@parameter("Send to channel defaults to all",true) channel: number | 0,
	)
	{
		const c1 = limitedVal(color, 1, 9);	
		const br = padVal(limitedVal(brightness, 0,100));
		const r1 = padVal(limitedVal(ramp, 0, 999));
		const ch = channel ? channel:"X" ;
		const cmd = ch + " " + c1 + " " + br + " " + r1;
		this.command = cmd;
			
	}

	@callable("Set RGBW output (pulsing) ")
	setPulsing(
		@parameter("Ramp 1 color 1-9" ) color1: number ,
		@parameter("Ramp 2 brightness 0-100") brightness1: number, 
		@parameter("Ramp 2 time 0-999(x0.1s)") ramp1: number,
		@parameter("Ramp 2 color 1-9" ) color2: number ,
		@parameter("Ramp 2 brightness 0-100") brightness2: number, 
		@parameter("Ramp 2 time 0-999(x0.1s)") ramp2: number,
		@parameter("Send to channel defaults to all",true) channel: number | 0,
	)
	{
		const c1 = limitedVal(color1, 1, 9);	
		const br1 = padVal(limitedVal(brightness1, 0,100));
		const ra1 = padVal(limitedVal(ramp1, 0, 999));
		const c2 = limitedVal(color2, 1, 9);	
		const br2 = padVal(limitedVal(brightness2, 0,100));
		const ra2 = padVal(limitedVal(ramp2, 0, 999));
		const ch = channel ? channel:"X" ;
		const cmd = ch + " " + c1 + " " + br1 + " " + ra1+ " " + c2 + " " + br2 + " " + ra2;
		this.command = cmd;
			
	}

	userFriendlyName() {
		return "LED";
	}

	sendCommand(cmd: string) {
		this.sendData("G" + this.ifaceNo() + "B[" + cmd + "]")
	}
}	

NexmosphereBase.registerInterface(RGBWInterface, "RGBW");


class MonoLedInterface extends BaseInterface {

	constructor(driver: NexmosphereBase<PortType>, index: number) {
		super(driver, index,undefined);
	
	}
	@property("Monoled command to send e.g '384' or '13823' consult API manual, if read it will return last sent command.")
	get command(): string { return this._command; }
	set command(cmd: string) {
		this.sendCommand(cmd); 
		this._command = cmd;
	}

	@callable("Set Monoled output (single ramp)")
	setOutput(
		@parameter("brightness 0-100") brightness: number, 
		@parameter("ramptime 0-15(seconds) automatically limited by fixed ramp steps in device, consult API manual") ramp: number,
	)
	{
		log("Setting monoled output", brightness, ramp);
		const br = limitedVal(brightness, 0,100,2.55);
		const r = (limitedVal(ramp, 0, 15,1,false));
		log("Calculated values", br, r, Math.floor(15/r));
		const cmd = 256 * Math.floor(15/r)+ br; 
		this.command = cmd.toString();
			
	}
	
	sendCommand(cmd: string) {
		this.sendData("G" + this.ifaceNo() + "A[" + cmd + "]")
	}

	userFriendlyName() {
		return "LED";
	}
}

NexmosphereBase.registerInterface(MonoLedInterface, "MonoLed");


class QuadAudioSwitch extends BaseInterface {
	
	private switches: Record<string, any> = {};

	constructor(driver: NexmosphereBase<PortType>, index: number) {
		super(driver, index);
		for (let i = 1; i <= 4; i++) { //Init switches
    	this.switches[`sw${i}`] = false;
}
	
	}

	@property("Switch 1 state", false)
	get sw1(): boolean {
		return this.switches.sw1;
	}
	set sw1(value: boolean) {
		if (this.switches.sw1 === value) return; 
		this.switches.sw1 = value;
		this.updateAndSend();
	}
	@property("Switch 2 state", false)
	get sw2(): boolean {
		return this.switches.sw2;
	}
	set sw2(value: boolean) {
		if (this.switches.sw2 === value) return; 
		this.switches.sw2 = value;
		this.updateAndSend();
	}
	@property("Switch 3 state", false)
	get sw3(): boolean {
		return this.switches.sw3;
	}
	set sw3(value: boolean) {
		if (this.switches.sw3 === value) return; 
		this.switches.sw3 = value;
		this.updateAndSend();
	}
	@property("Switch 4 state", false)
	get sw4(): boolean {
		return this.switches.sw4;
	}
	set sw4(value: boolean) {
		if (this.switches.sw4 === value) return; 
		this.switches.sw4 = value;
		this.updateAndSend();
	}
	
	@callable("Turn all switches ON/OFF")
	setAllSwitches(value:boolean) { 
	for (let i = 1; i <= 4; i++) {
    	this.switches[`sw${i}`] = value; //Set all switches	
		this.changed(`sw${i}`); //Update blocks on the change
		}
	this.updateAndSend();
	}

	/* Update the bitmask and send new command */
	updateAndSend(){
	const { sw1, sw2, sw3, sw4 } = this.switches;
	console.log("Updating audio switch states", sw1, sw2, sw3, sw4), this.switches;
	const data =
		(sw1 ? 1 : 0) |
		(sw2 ? 2 : 0) |
		(sw3 ? 4 : 0) |
		(sw4 ? 8 : 0);
  	
	this.sendData("G" + this.ifaceNo() +"[" + data + "]");
	}
 
	userFriendlyName() {
		return "AudioSwitch";
	}
}
NexmosphereBase.registerInterface(QuadAudioSwitch, "Opticalx4", "Analogx4");

class AudioSwitch extends BaseInterface {
	
	
	private mSw:boolean = false;

	constructor(driver: NexmosphereBase<PortType>, index: number) {
		super(driver, index);
	
	}
		@property("Switch 1 state", false)
	get sw1(): boolean {
		return this.mSw;
	}
	set sw1(value: boolean) {
		if (this.mSw === value) return; 
		const cmd = value ? 1 : 0;
		this.sendData("G" + this.ifaceNo() +"[" + cmd + "]");
		this.mSw = value;

		
	}	
	userFriendlyName() {
		return "AudioSwitch";
	}
}
NexmosphereBase.registerInterface(AudioSwitch, "Optical", "Analog");

/**
* Proximity sensors
*/
class ProximityInterface extends BaseInterface {
	private mProximity: number = 0;

	@property("Proximity zone", true)
	get proximity(): number { return this.mProximity; }
	set proximity(value: number) { this.mProximity = value; }

	receiveData(data: string) {
		this.proximity = parseInt(data);
	}

	userFriendlyName() {
		return "Prox";
	}
}
NexmosphereBase.registerInterface(ProximityInterface, "XY116", "XY146", "XY176", "XY");

/**
* Proximity sensors Time of Flight versions
*/
class TimeOfFlightInterface extends BaseInterface {
	private mProximity: number = 0;
	private mAirButton: boolean = false;
	private mRawData: string = "";
	private mTrigger1: boolean = false;
	private mTrigger2: boolean = false;
	private mTrigger3: boolean = false;
	private mTrigger4: boolean = false;
	private mTrigger5: boolean = false;
	private mTrigger6: boolean = false;
	private mTrigger7: boolean = false;
	private mTrigger8: boolean = false;
	private mTrigger9: boolean = false;
	private mTrigger10: boolean = false;

	@property("Proximity zone", true)
	get proximity(): number { return this.mProximity; }
	set proximity(value: number) { this.mProximity = value; }

	@property("Air Button", true)
	get airButton(): boolean { return this.mAirButton; }
	set airButton(value: boolean) { this.mAirButton = value; }

	@property("Raw data last received", true)
	get rawData(): string { return this.mRawData; }
	set rawData(value: string) { this.mRawData = value; }

	@property("Proximity 1 or below", true)
	get triggerOn1(): boolean { return this.mTrigger1; }
	set triggerOn1(value: boolean) { this.mTrigger1 = value; }

	@property("Proximity 2 or below", true)
	get triggerOn2(): boolean { return this.mTrigger2; }
	set triggerOn2(value: boolean) { this.mTrigger2 = value; }

	@property("Proximity 3 or below", true)
	get triggerOn3(): boolean { return this.mTrigger3; }
	set triggerOn3(value: boolean) { this.mTrigger3 = value; }

	@property("Proximity 4 or below", true)
	get triggerOn4(): boolean { return this.mTrigger4; }
	set triggerOn4(value: boolean) { this.mTrigger4 = value; }

	@property("Proximity 5 or below", true)
	get triggerOn5(): boolean { return this.mTrigger5; }
	set triggerOn5(value: boolean) { this.mTrigger5 = value; }

	@property("Proximity 6 or below", true)
	get triggerOn6(): boolean { return this.mTrigger6; }
	set triggerOn6(value: boolean) { this.mTrigger6 = value; }

	@property("Proximity 7 or below", true)
	get triggerOn7(): boolean { return this.mTrigger7; }
	set triggerOn7(value: boolean) { this.mTrigger7 = value; }

	@property("Proximity 8 or below", true)
	get triggerOn8(): boolean { return this.mTrigger8; }
	set triggerOn8(value: boolean) { this.mTrigger8 = value; }

	@property("Proximity 9 or below", true)
	get triggerOn9(): boolean { return this.mTrigger9; }
	set triggerOn9(value: boolean) { this.mTrigger9 = value; }

	@property("Proximity 10 or below", true)
	get triggerOn10(): boolean { return this.mTrigger10; }
	set triggerOn10(value: boolean) { this.mTrigger10 = value; }

	receiveData(data: string) {
		const splitData = data.split("=");
		const sensorValue = splitData[1];
		this.rawData = data;
		switch (sensorValue) {
			case "AB":
				this.airButton = true;
				this.proximity = 1; //We define AB as zone 1
				break;
			case "XX":
				this.airButton = false;
				this.proximity = 999; //We define indefinite as zone 999
				break;
			default:	// Assume others are zone numbers
				const proximity = parseInt(sensorValue);
				if (!isNaN(proximity)) {
					this.proximity = parseInt(sensorValue);
					this.airButton = false;
				}
				break;
		}
		this.triggerOn1 = this.proximity <= 1;
		this.triggerOn2 = this.proximity <= 2;
		this.triggerOn3 = this.proximity <= 3;
		this.triggerOn4 = this.proximity <= 4;
		this.triggerOn5 = this.proximity <= 5;
		this.triggerOn6 = this.proximity <= 6;
		this.triggerOn7 = this.proximity <= 7;
		this.triggerOn8 = this.proximity <= 8;
		this.triggerOn9 = this.proximity <= 9;
		this.triggerOn10 = this.proximity <= 10;

	}

	userFriendlyName() {
		return "TOF";
	}
}
NexmosphereBase.registerInterface(TimeOfFlightInterface, "XY240","XY241");

/**
 *Modle a Gesture detector interface.
 */
class AirGestureInterface extends BaseInterface {
	private mGesture = "";

	@property("Gesture detected", true)
	get gesture(): string { return this.mGesture; }
	set gesture(value: string) { this.mGesture = value; }

	receiveData(data: string) {
		this.gesture = data;
	}

	userFriendlyName() {
		return "Air";
	}
}
NexmosphereBase.registerInterface(AirGestureInterface, "XTEF650", "XTEF30", "XTEF630", "XTEF680");


/**
 *Model a single button.
 */
interface Button {
	state: boolean;
	ledData: number;
}

const kButtonDescr = "Button pressed";
const kLedDescr = "0=off, 1=fast, 2=slow or 3=on"
/**
 *Modle a Quad Button detector interface.
 */
class QuadButtonInterface extends BaseInterface {
	private static readonly kNumButtons = 4;	// Must match number of property pairs defined below
	private readonly buttons: Button[];

	constructor(driver: NexmosphereBase<PortType>, index: number) {
		super(driver, index);
		this.buttons = [];
		for (let ix = 0; ix < QuadButtonInterface.kNumButtons; ++ix)
			this.buttons.push({ state: false, ledData: 0 });
	}

	@property(kButtonDescr, true)
	get button1(): boolean { return this.getBtn(1); }
	set button1(value: boolean) { this.setBtn(1, value); }

	@property(kLedDescr) @min(0) @max(3)
	get led1(): number { return this.getLed(1); }
	set led1(value: number) { this.setLed(1, value); }


	@property(kButtonDescr, true)
	get button2(): boolean { return this.getBtn(2); }
	set button2(value: boolean) { this.setBtn(2, value); }

	@property(kLedDescr) @min(0) @max(3)
	get led2(): number { return this.getLed(2); }
	set led2(value: number) { this.setLed(2, value); }


	@property(kButtonDescr, true)
	get button3(): boolean { return this.getBtn(3); }
	set button3(value: boolean) { this.setBtn(3, value); }

	@property(kLedDescr) @min(0) @max(3)
	get led3(): number { return this.getLed(3); }
	set led3(value: number) { this.setLed(3, value); }


	@property(kButtonDescr, true)
	get button4(): boolean { return this.getBtn(4); }
	set button4(value: boolean) { this.setBtn(4, value); }

	@property(kLedDescr) @min(0) @max(3)
	get led4(): number { return this.getLed(4); }
	set led4(value: number) { this.setLed(4, value); }

	// Yes, some ugly repetition above, but aggregates only do static properties

	private getBtn(oneBasedIx: number): boolean {
		return this.buttons[oneBasedIx - 1].state;
	}

	private setBtn(oneBasedIx: number, state: boolean) {
		this.buttons[oneBasedIx - 1].state = state;
	}

	private getLed(oneBasedIx: number): number {
		return this.buttons[oneBasedIx - 1].ledData;
	}

	private setLed(oneBasedIx: number, state: number) {
		this.buttons[oneBasedIx - 1].ledData = state & 3;
		this.ledStatusChanged();
	}

	/**
	 * Update button state from received data bitmask.
	 */
	receiveData(data: string) {
		let bitMask = parseInt(data);
		bitMask = bitMask >> 1;	// Unsave useless LSBit
		for (let ix = 0; ix < this.buttons.length; ++ix) {
			let isPressed: boolean = !!(bitMask & (1 << ix));
			const btn = this.buttons[ix];
			if (btn.state !== isPressed) {
				btn.state = isPressed;
				// Just fire explicitly since we assign to backing store
				this.changed("button" + (ix + 1));
			}
		}
	}

	/**
	 * Send new LED status to device.
	 */
	private ledStatusChanged() {
		let toSend = 0;
		const buttons = this.buttons;
		for (let ix = 0; ix < buttons.length; ++ix)
			toSend |= buttons[ix].ledData << ix * 2;
		this.sendCmd(toSend.toString());
	}

	private sendCmd(data: string) {
		this.driver.send("X" + this.ifaceNo() + "A[" + data + "]");
	}

	userFriendlyName() {
		return "Btn";
	}
}
NexmosphereBase.registerInterface(QuadButtonInterface, "XTB4N", "XTB4N6", "XT4FW6", "XT4");


/**
 * Motion detector interface.
 */
class MotionInterface extends BaseInterface {
	private mMotion: number = 0;

	@property("Motion detected", true)
	set motion(value: number) { this.mMotion = value; }
	get motion(): number { return this.mMotion; }

	receiveData(data: string) {
		this.motion = parseInt(data);
	}

	userFriendlyName() {
		return "Motion";
	}
}
NexmosphereBase.registerInterface(MotionInterface, "XY320");


/*
 *	Gender detector interface, indicating gender, age, gaze and some other tidbits about a person
 *	in front of the sensor (e.g., a camera).
 */
class GenderInterface extends BaseInterface {
	private static readonly kParser = /^(0|1)(M|F|U)(X|L|H)([0-8])(X|L|H)(L|C|R|U)/;
	// private subProp: GenderSubProperty<any>[];
	private mIsPerson = false;
	private mGender = 'U';
	private mGenderConfidence = 'X';
	private mAge = 0;
	private mAgeConfidence = 'X'
	private mGaze = 'U';

	@property("Person detected", true)
	get isPerson(): boolean { return this.mIsPerson; }
	set isPerson(value: boolean) { this.mIsPerson = value; }

	@property("M=Male, F=Female, U=Unidentified", true)
	get gender(): string { return this.mGender; }
	set gender(value: string) { this.mGender = value; }

	@property("X=Very Low, L=Low, H=High", true)
	get genderConfidence(): string { return this.mGenderConfidence; }
	set genderConfidence(value: string) { this.mGenderConfidence = value; }

	@property("Age range 0...8", true)
	get age(): number { return this.mAge; }
	set age(value: number) { this.mAge = value; }

	@property("X=Very Low, L=Low, H=High", true)
	get ageConfidence(): string { return this.mAgeConfidence; }
	set ageConfidence(value: string) { this.mAgeConfidence = value; }

	@property("L=Left, C=Center, R=Right, U=Unidentified", true)
	get gaze(): string { return this.mGaze; }
	set gaze(value: string) { this.mGaze = value; }

	/*	Parse out all info from single string, using kParser:

		P= Person detection 0= No Person, 1=Person detected
		G= M=Male, F=Female, U=Unidentified
		C= Confidence level gender X = Very Low, L=Low, H=High
		A= Age range estimation value between 0-8
		C= Confidence level age X = Very Low, L=Low, H=High
		G= Gaze indication L=Left, C=Center, R=Right, U=Unidentified
	*/
	receiveData(data: string) {
		const parseResult = GenderInterface.kParser.exec(data);
		if (parseResult) {
			this.isPerson = parseResult[0] === "1"; // true if 1 (there's a Person)
			this.gender = parseResult[1];
			this.genderConfidence = parseResult[2];
			this.age = parseInt(parseResult[3]);
			this.ageConfidence = parseResult[4];
			this.gaze = parseResult[5];
		}
	}

	userFriendlyName() {
		return "Gender";
	}
}
NexmosphereBase.registerInterface(GenderInterface, "XY510", "XY520");

/**
 * Lidar Sensor
 */
class LidarInterface extends BaseInterface {
	private static readonly kParser = /^ZONE(\d{2})=(ENTER|EXIT):(\d{2})$/;
	private static readonly kParserWithoutCount = /^ZONE(\d{2})=(ENTER|EXIT)$/;

	private mZone: number[] = [
		0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
		0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
		0, 0, 0, 0,
	];
	private _ready = false;
	private _cmdResponseWaiter: CmdResponseWaiter;

	@property("Ready for setup (e.g. use this as trigger for a setup Task)", true)
	get ready(): boolean { return this._ready; }
	set ready(value: boolean) { this._ready = value; }

	@property(kZoneDescr, true)
	get zone01(): number { return this.mZone[0]; }
	set zone01(value: number) { this.mZone[0] = value; }
	@property(kZoneDescr, true)
	get zone02(): number { return this.mZone[1]; }
	set zone02(value: number) { this.mZone[1] = value; }
	@property(kZoneDescr, true)
	get zone03(): number { return this.mZone[2]; }
	set zone03(value: number) { this.mZone[2] = value; }
	@property(kZoneDescr, true)
	get zone04(): number { return this.mZone[3]; }
	set zone04(value: number) { this.mZone[3] = value; }
	@property(kZoneDescr, true)
	get zone05(): number { return this.mZone[4]; }
	set zone05(value: number) { this.mZone[4] = value; }
	@property(kZoneDescr, true)
	get zone06(): number { return this.mZone[5]; }
	set zone06(value: number) { this.mZone[5] = value; }
	@property(kZoneDescr, true)
	get zone07(): number { return this.mZone[6]; }
	set zone07(value: number) { this.mZone[6] = value; }
	@property(kZoneDescr, true)
	get zone08(): number { return this.mZone[7]; }
	set zone08(value: number) { this.mZone[7] = value; }
	@property(kZoneDescr, true)
	get zone09(): number { return this.mZone[8]; }
	set zone09(value: number) { this.mZone[8] = value; }
	@property(kZoneDescr, true)
	get zone10(): number { return this.mZone[9]; }
	set zone10(value: number) { this.mZone[9] = value; }
	@property(kZoneDescr, true)
	get zone11(): number { return this.mZone[10]; }
	set zone11(value: number) { this.mZone[10] = value; }
	@property(kZoneDescr, true)
	get zone12(): number { return this.mZone[11]; }
	set zone12(value: number) { this.mZone[11] = value; }
	@property(kZoneDescr, true)
	get zone13(): number { return this.mZone[12]; }
	set zone13(value: number) { this.mZone[12] = value; }
	@property(kZoneDescr, true)
	get zone14(): number { return this.mZone[13]; }
	set zone14(value: number) { this.mZone[13] = value; }
	@property(kZoneDescr, true)
	get zone15(): number { return this.mZone[14]; }
	set zone15(value: number) { this.mZone[14] = value; }
	@property(kZoneDescr, true)
	get zone16(): number { return this.mZone[15]; }
	set zone16(value: number) { this.mZone[15] = value; }
	@property(kZoneDescr, true)
	get zone17(): number { return this.mZone[16]; }
	set zone17(value: number) { this.mZone[16] = value; }
	@property(kZoneDescr, true)
	get zone18(): number { return this.mZone[17]; }
	set zone18(value: number) { this.mZone[17] = value; }
	@property(kZoneDescr, true)
	get zone19(): number { return this.mZone[18]; }
	set zone19(value: number) { this.mZone[18] = value; }
	@property(kZoneDescr, true)
	get zone20(): number { return this.mZone[19]; }
	set zone20(value: number) { this.mZone[19] = value; }
	@property(kZoneDescr, true)
	get zone21(): number { return this.mZone[20]; }
	set zone21(value: number) { this.mZone[20] = value; }
	@property(kZoneDescr, true)
	get zone22(): number { return this.mZone[21]; }
	set zone22(value: number) { this.mZone[21] = value; }
	@property(kZoneDescr, true)
	get zone23(): number { return this.mZone[22]; }
	set zone23(value: number) { this.mZone[22] = value; }
	@property(kZoneDescr, true)
	get zone24(): number { return this.mZone[23]; }
	set zone24(value: number) { this.mZone[23] = value; }

	@callable("define field of interest")
	defField(
		@parameter("list of 3 to 10 corner coordinates in cm - e.g. '[0,10], [22,300], [-22,400]'") corners: string,
	): Promise<void> {
		const coordinates = this.parseAndValidateCoordinates(corners);
		return this.defineFieldOfInterest(coordinates);
	}
	@callable("define field of interest as rectangle")
	defFieldAsRect(
		@parameter("min x in cm") minX: number,
		@parameter("min y in cm") minY: number,
		@parameter("max x in cm") maxX: number,
		@parameter("max y in cm") maxY: number,
	): Promise<void> {
		const x1 = Math.min(minX, maxX);
		const x2 = Math.max(minX, maxX);
		const y1 = Math.min(minY, maxY);
		const y2 = Math.max(minY, maxY);
		const coordinates = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
		if (x1 < -999 || x2 > 999 || y1 < -999 || y2 > 999) {
			throw new Error("x and y values must be between -999 and 999.");
		}
		return this.defineFieldOfInterest(coordinates);
	}

	@callable("define activation zone")
	defZone(
		@parameter("Zone ID (1-24)") zoneId: number,
		@parameter("X in cm") x: number,
		@parameter("Y in cm") y: number,
		@parameter("width in cm") width: number,
		@parameter("height in cm") height: number,
	): Promise<void> {
		return this.sendCmdB(
			this.cmdActivationZone(zoneId, x, y, width, height),
			RESPONSE_SETTINGS_STORED
		);
	}

	@callable("set zone delay")
	setZoneDelay(
		@parameter("Zone ID (1-24)") zoneId: number,
		@parameter("delay in frames\n(XQ-L2: 1 frame = ~140 ms XQ-L5: 1 frame = ~100 ms)") delay: number,
	): Promise<void> {
		return this.sendCmdB(this.cmdSetZoneDelay(zoneId, delay));
	}

	@callable("set zone min object size")
	setZoneMinSize(
		@parameter("Zone ID (1-24)") zoneId: number,
		@parameter("min object size in cm") size: number,
	): Promise<void> {
		return this.sendCmdB(this.cmdSetZoneMinObjectSize(zoneId, size));
	}

	@callable("set zone max object size")
	setZoneMaxSize(
		@parameter("Zone ID (1-24)") zoneId: number,
		@parameter("max object size in cm") size: number,
	): Promise<void> {
		return this.sendCmdB(this.cmdSetZoneMaxObjectSize(zoneId, size));
	}

	@callable("clear zone parameters (delay, min/max object size)")
	clearZone(
		@parameter("Zone ID (1-24)") zoneId: number,
	): Promise<void> {
		return this.sendCmdB(this.cmdClearZone(zoneId));
	}

	@callable("clear parameters for all zones (delay, min/max object size)")
	clearAllZones(): Promise<void> {
		return this.sendCmdB(this.cmdClearAllZones());
	}


	@callable("set detection / output mode (see sensor manual)")
	setDetectionMode(
		@parameter("1=single detection, 2=multi detection (equals mode 3 from manual!)") mode: number,
	): Promise<void> {
		switch (mode) {
			case 1:
				return this.sendCmdS("4:1");
			case 2:
				return this.sendCmdS("4:3");
			default:
				throw new Error("Invalid detection mode");
		}
	}


	constructor(
		driver: NexmosphereBase<PortType>,
		index: number
	) {
		super(driver, index);
		wait(2300).then(() => {
			this.ready = true;
		})
	}

	receiveData(data: string, tag?: TagInfo) {
		if (this._cmdResponseWaiter && this._cmdResponseWaiter.expectedResponse == data) {
			this._cmdResponseWaiter.register(data);
			this._cmdResponseWaiter = null;
			return;
		}
		const parseResult = LidarInterface.kParser.exec(data);
		if (parseResult) {
			const zoneId = parseInt(parseResult[1]);
			const enterOrExit: EnterExit = parseResult[2] as EnterExit;
			const zoneObjectCount = parseInt(parseResult[3]);

			this.mZone[zoneId - 1] = zoneObjectCount;
			this.changed("zone" + this.pad(zoneId, 2));
			log("Zone " + zoneId + " " + enterOrExit + " " + zoneObjectCount);
			return;
		}
		const parseResultWithoutCount = LidarInterface.kParserWithoutCount.exec(data);
		if (parseResultWithoutCount) {
			const zoneId = parseInt(parseResultWithoutCount[1]);
			const enterOrExit: EnterExit = parseResultWithoutCount[2] as EnterExit;

			this.mZone[zoneId - 1] += enterOrExit === "ENTER" ? 1 : -1;
			const label = "zone" + this.pad(zoneId, 2);
			this.changed(label);
			return;
		}
	}
	userFriendlyName(): string {
		return "Lidar";
	}

	private async defineFieldOfInterest(coordinates: number[][]): Promise<void> {
		for (let i = 0; i < coordinates.length; ++i) {
			await this.sendCmdB(
				this.cmdFieldOfInterestCorner(i + 1, coordinates[i][0], coordinates[i][1]),
				RESPONSE_SETTINGS_STORED
			);
		}
		await this.sendCmdB(this.cmdRecalculateFieldOfInterest());
	}

	private async sendCmdS(command: string, expectedResponse: string = null): Promise<void> {
		await this.sendCmd(command, expectedResponse, "S");
	}
	private async sendCmdB(command: string, expectedResponse: string = null): Promise<void> {
		await this.sendCmd(command, expectedResponse, "B");
	}
	private async sendCmd(command: string, expectedResponse: string = null, prefix: "B" | "S"): Promise<void> {
		const raw = this.package(command, prefix);
		this.driver.send(raw);
		log("sending command: '" + raw + "'");
		if (expectedResponse) {
			return new Promise<void>((resolve, reject) => {
				this._cmdResponseWaiter = new CmdResponseWaiter(
					command, expectedResponse,
					result => {
						log("resolved via response");
						resolve();
						this._cmdResponseWaiter = null;
					},
					reason => {
						this._cmdResponseWaiter = null;
						reject("Timeout waiting for response ... !");
					}
				);
			});
		} else {
			await commandDelay();
			log("resolved via timeout");
		}
	}

	private cmdFieldOfInterestCorner(i: number, x: number, y: number): string {
		return "FOICORNER" + this.pad(i, 2) + "=" + this.signedPad(x, 3) + "," + this.signedPad(y, 3);
	}
	private cmdRecalculateFieldOfInterest(): string {
		return "RECALCULATEFOI";
	}
	private cmdActivationZone(zoneId: number, x: number, y: number, width: number, height: number): string {
		return "ZONE" + this.pad(zoneId, 2) + "=" +
			this.signedPad(x, 3) + "," +
			this.signedPad(y, 3) + "," +
			this.pad(width, 3) + "," +
			this.pad(height, 3);
	}

	private cmdSetZoneDelay(zoneId: number, delay: number): string {
		return "ZONE" + this.pad(zoneId, 2) + "DELAY=" + this.pad(delay, 2);
	}
	private cmdSetZoneMinObjectSize(zoneId: number, minObjectSize: number): string {
		return "ZONE" + this.pad(zoneId, 2) + "MINSIZE=" + this.pad(minObjectSize, 2);
	}
	private cmdSetZoneMaxObjectSize(zoneId: number, maxObjectSize: number): string {
		return "ZONE" + this.pad(zoneId, 2) + "MAXSIZE=" + this.pad(maxObjectSize, 2);
	}
	private cmdClearZone(zoneId: number): string {
		return "ZONE" + this.pad(zoneId, 2) + "=CLEAR";
	}
	private cmdClearAllZones(): string {
		return "CLEARALLZONES";
	}
	private cmdAskZones(): string {
		return "ZONES?";
	}
	private packageB(command: string): string { return this.package(command, "B"); }
	private packageS(command: string): string { return this.package(command, "S"); }
	private package(command: string, prefix: "B" | "S"): string {
		return "X" + this.pad(this.index + 1, 3) + prefix + "[" + command + "]";
	}

	private parseAndValidateCoordinates(input: string): number[][] {
		// Match array-like groups of two numbers `[num1,num2]`
		const coordinateRegex = /\[(-?\d+),\s*(-?\d+)]/g;
		const coordinatePartsRegex = /\[(-?\d+),\s*(-?\d+)]/;

		// Extracting matches into an array
		const matches = [...input.match(coordinateRegex)];

		// Check the number of coordinate pairs (must be 3-10)
		if (matches.length < 3 || matches.length > 10) {
			throw new Error("Input must contain 3 to 10 coordinate pairs.");
		}

		// Map the matches into number arrays and validate each value's range
		const coordinates = matches.map(match => {
			const reMatch = coordinatePartsRegex.exec(match);
			const x = parseInt(reMatch[1]);
			const y = parseInt(reMatch[2]);

			if (x < -999 || x > 999 || y < -999 || y > 999) {
				throw new Error("Coordinates must have x and y values between -999 and 999.");
			}

			return [x, y];
		});

		return coordinates;
	}


	/**
	 * Pads a given number with leading zeroes to match the specified length
	 * without using `padStart`.
	 *
	 * @param num - The number to be padded.
	 * @param length - The desired total length of the resulting string.
	 * @param padChar - defaults to "0"
	 * @returns The number as a string, padded with leading zeroes.
	 */
	private pad(num: number, length: number, padChar: string = "0"): string {
		let numStr = num.toString();
		while (numStr.length < length) numStr = padChar + numStr;
		return numStr;
	}
	private signedPad(num: number, length: number): string {
		const isPositive = num >= 0;
		return (isPositive ? "+" : "-") + this.pad(Math.abs(num), length);
	}

}
const kZoneDescr = "Zone occupied";
const RESPONSE_SETTINGS_STORED = "SETTINGS-STORED";
type EnterExit = "ENTER" | "EXIT";
/**
 * Nexmosphere requires >= 50 ms delay after each command
 * (in practice the needed delay seems to be longer)
 */

class CmdResponseWaiter {
	private _done = false;

	constructor(
		public readonly cmd: string,
		public readonly expectedResponse: string,
		private readonly _resolve: (result: ICmdResult) => void,
		private readonly _reject: (reason: any) => void,
		_timeoutMs: number = 1000,
	) {
		wait(_timeoutMs).then(() => {
			if (this._done) return;
			this._done = true;
			this._reject(new Error("Timeout"));
		});

	}
	public register(response: string): void {
		if (response === this.expectedResponse) {
			if (this._done) return;
			this._done = true;
			this._resolve({
				response: response,
				sender: this,
			});
		}
	}
}
interface ICmdResult {
	response: string,
	sender: CmdResponseWaiter,
}
NexmosphereBase.registerInterface(LidarInterface, "XQL2", "XQL5");

class AnalogInputInterface extends BaseInterface {
	private mValue: number = 0;
	private mNormalize: boolean = false;
	private mInMin: number = 0;
	private mInMax: number = 20;
	private mOutMin: number = 0;
	private mOutMax: number = 1;	

	@property("Analog input value", true)
	get value(): number { return this.mValue; }
	set value(value: number) { this.mValue = value; }

	@callable(" Send settings command to the element")
	sendSettingsCmd(@parameter("Commande to send e.g. 4:3 or 7:8") command: string) {
		this.sendData("X" + this.ifaceNo() +"S[" + command + "]");
	}
	@callable(" Send settings command to the element")
	sendSetRangesCmd(@parameter("Command to send e.g. [CR06:BOT=0510 or CR06:TOP=0514]") command: string) {
		this.sendData("X" + this.ifaceNo() +"B[" + command + "]");
	}

	@callable("Configure Analog Input")
	normalizedAnalogInput(
		@parameter("Normalize (false)",true) normalize: boolean,
		@parameter("Lowest expected input value  (0)",true) inMin: number,
		@parameter("Highest expected input value(20)",true) inMax: number,
		@parameter("Lower Lowest Output value (0)",true) outMin: number,
		@parameter("Highest output value (1)",true) outMax: number
	){
		
		this.mNormalize = normalize || false; ;
		this.mInMin = inMin | 0;
		this.mInMax = inMax | 20;
		this.mOutMin = outMin | 0;
		this.mOutMax = outMax | 1;
			
	}
	
	receiveData(data: string) {
		const inputVal = Number(data.split("=")[1]);
		log("Analog input received", inputVal, normalize(inputVal, this.mInMin, this.mInMax, this.mOutMin, this.mOutMax));
		const finalVal = this.mNormalize ? normalize(inputVal, this.mInMin, this.mInMax, this.mOutMin, this.mOutMax) : inputVal;
		this.value = finalVal;
	}
	userFriendlyName() {
		return "AnalogIn";
	}
}
NexmosphereBase.registerInterface(AnalogInputInterface, "AnalogIn","XDWA50");

class IoInterface extends BaseInterface {
	private mState: boolean = false;
	

	@property("IO state")
	get state(): boolean { return this.mState; }
	set state(value: boolean) { 
		if (this.mState === value) return;
		this.sendData("X" + this.ifaceNo() +"A[" + (value ? "1" : "0") + "]");
		this.mState = value;
	}

	@callable(" Set IO LED state, see api for details")
	sendLedCmd(
		@parameter("1=on, 2=off or e.g. 3009912=ramp, 4009910=pulse") cmd: string) {
		this.sendData("X" + this.ifaceNo() +"L[" + cmd + "]");
	}

	receiveData(data: string) {
		log("IO input received", data);
		this.mState = data === "1";
		this.changed("state");
	}
	userFriendlyName() {
		return "AnalogIn";
	}
}
NexmosphereBase.registerInterface(IoInterface, "IO","XDWI36","XDWI56");

class EncoderInterface extends BaseInterface {
	private mDirection:string = "";
	private mValue: number = 0;
	private mAbsValue: number = 0;
	

	@property("Direction CW or CCW", true)
	get direction(): string { return this.mDirection}
	set direction(value: string) {this.mDirection = value}

	@property("Delta", true) 
	get value(): number { return this.mValue}
	set value(value: number) { this.mValue = value }

	@property("Absolute Value", false)
	get absoluteValue(): number { return this.mAbsValue}
	set absoluteValue(value: number) {this.mAbsValue = value }

	@callable(" Send setting, see api for details")
	sendSettings(
		@parameter("Setting, e.g. 1:1 or 10:1") cmd: string) {
		this.sendData("X" + this.ifaceNo() +"S[" + cmd + "]");
	}

	receiveData(data: string) {
		log("Encoder input received", data);
		const splitData = data.split("=");
		const prefix = splitData[0];
		if (prefix === "Av") {
			// Absolute value update
			this.absoluteValue = parseInt(splitData[1]);
			return;
		}
		if (prefix === "Rd") {
			const sensorValue = splitData[1];
			const parts = sensorValue.split(":");
			this.direction = parts[0];// Direction CW or CCW
			const increment = this.direction === "CW"
			this.value = Number(parts[1])
			log("Increment value", this.value, this.value, -this.value);
			this.absoluteValue = this.mAbsValue + (increment ? Number(parts[1]): -Number(parts[1]));
		}
	}
	userFriendlyName() {
		return "Encoder";
	}
}
NexmosphereBase.registerInterface(EncoderInterface, "ENCODER","XDWE60");

class AngleInterface extends BaseInterface {
	private mXAngle:number = 0
	private mYAngle: number = 0;
	private mZAngle: number = 0;
	private mTriggerFromPosition: number = 0;

	receiveData(data: string) {
			log("Angle input received", data);
			const parts = data.split("=");
			const prefix = parts[0]
			const values = parts[1].split(",");
			
		switch (prefix) {
			case "O":
				this.xAngle = Number(values[0]);
				this.yAngle = Number(values[1]);
				this.zAngle = Number(values[2]);
				break;

			case "X":
				this.xAngle = Number(values[0]);
				break;

			case "Y":
				this.yAngle = Number(values[0]);
				break;

			case "Z":
				this.zAngle = Number(values[0]);
				break;

			case "P":
				this.triggerFromPosition = Number(values[0]);
				break;

			default:
				console.log("Unknown Angle prefix: ", prefix)
				break;
		}
	}

	@property("X Angle", true)
	get xAngle(): number { return this.mXAngle}
	set xAngle(value: number) { this.mXAngle = value}
	@property("Y Angle", true)
	get yAngle(): number { return this.mYAngle}
	set yAngle(value: number) { this.mYAngle = value}
	@property("Z Angle", true)
	get zAngle(): number { return this.mZAngle}
	set zAngle(value: number) { this.mZAngle = value}
	@property("Trigger from stored position", true)
	get triggerFromPosition(): number { return this.mTriggerFromPosition}
	set triggerFromPosition(value: number) { this.mTriggerFromPosition = value}
	
	@callable("Send setting, see api for details")
	sendSettings(
		@parameter("Setting, e.g. 1:1 or 9:2") cmd: string) {
		this.sendData("X" + this.ifaceNo() +"S[" + cmd + "]");
	}

	@callable("Store current position")
	storePosition(
		@parameter("Position number 1-8") posNo: number) {
		this.sendData("X" + this.ifaceNo() +"B[STORE=P" + limitedVal(posNo,1,8) + "]");
	}
	@callable(" Clears stored position")
	clearPosition(
		@parameter("Position number 1-8, 0 for all") posNo: number) {
			let value:string = ""
			if (posNo = 0)
				value = "ALL"
			else
				value = String(limitedVal(posNo,1,8))

		this.sendData("X" + this.ifaceNo() +"B[CLEAR=P" + value +"]");
		}
	@callable("Factory reset")
	resetToFactorySettings() {
		this.sendData("X" + this.ifaceNo() +"B[FACTORYRESET]");
	}
	userFriendlyName() {
		return "Angle";
	}
}

NexmosphereBase.registerInterface(AngleInterface, "ANGLE","XZA40");


class TemperatureInterface extends BaseInterface {
	private mHumidity:number = 0
	private mTemperature: number = 0;


	receiveData(data: string) {
			log("Temperature input received", data);
			const parts = data.split("=");
			const prefix = parts[0]
			const value = parts[1]
if (prefix === "Hr" || prefix === "Hv") {
	this.humidity = Number(value);
	return
}
if (prefix === "Tr" || prefix === "Tv") {
	this.temperature = Number(value);
	return
}
	
	}
	@property("Humidity", true)
	get humidity(): number { return this.mHumidity}
	set humidity(value: number) { this.mHumidity = value}

	@property("Temperature", true)
	get temperature(): number { return this.mTemperature}
	set temperature(value: number) { this.mTemperature = value}
	
	@callable(" Send setting, see api for details")
	sendSettings(
		@parameter("Setting, e.g. 1:1 or 4:5") cmd: string) {
		this.sendData("X" + this.ifaceNo() +"S[" + cmd + "]");
	}
	@callable("Update value request")
	updateValues(
		@parameter("0=all(*) 1=Humidity 2=Temperature",true) cmd: number |0
	) {
		const options: { [key: number]: string } ={
			0:"ALL?",
			1:"HUMI?",
			2:"TEMP?"
		}
		const limitCmd = limitedVal(cmd,0,2,1,false);
		this.sendData("X" + this.ifaceNo() +"B[" + options[limitCmd] + "]");
	}
	
	userFriendlyName() {
		return "Temperature";
	}
}

NexmosphereBase.registerInterface(TemperatureInterface, "TEMP","XET50");


class AmbientLightInterface extends BaseInterface {
	private mIntencity:number = 0



	receiveData(data: string) {
			log("Ambient light input received", data);
			const parts = data.split("=");
			const prefix = parts[0]
			const value = parts[1]
if (prefix === "Ar" || prefix === "Av") {
	this.intencity = Number(value);
	return
}

	
	}
	@property("intencity", true)
	get intencity(): number { return this.mIntencity}
	set intencity(value: number) { this.mIntencity = value}


	
	@callable(" Send setting, see api for details")
	sendSettings(
		@parameter("Setting, e.g. 1:2 or 6:1") cmd: string) {
		this.sendData("X" + this.ifaceNo() +"S[" + cmd + "]");
	}
	@callable("Update value request")
	updateValues(
	
	) {
		this.sendData("X" + this.ifaceNo() +"B[LUX?]");
	}
	
	userFriendlyName() {
		return "AmbientLight";
	}
}

NexmosphereBase.registerInterface(AmbientLightInterface, "AMBIENTLIGHT","XEA20");

class LightInterface extends BaseInterface {
	private mLight:number = 0



	receiveData(data: string) {
			log("Ambient light input received", data);
	this.light = Number(data);
	return
	}

	@property("Detected light", true)
	get light(): number { return this.mLight}
	set light(value: number) { this.mLight = value}


	
	@callable(" Send setting, see api for details")
	sendSettings(
		@parameter("Setting, e.g. 1:2 or 6:1") cmd: string) {
		this.sendData("X" + this.ifaceNo() +"S[" + cmd + "]");
	}

	userFriendlyName() {
		return "Light";
	}
}

NexmosphereBase.registerInterface(LightInterface, "LIGHT","XZL20");

class ColorInterface extends BaseInterface {
	private mLight:number = 0
	private mSaturation:number = 0
	private mHue:number = 0
	private mReflection: number = 0
	private mCalibrating: boolean = false;
	private mHasObject: boolean = false;


	receiveData(data: string) {
			log("Ambient light input received", data);
	const parts = data.split("=");
	const prefix = parts[0]
	const value = parts[1]
	switch (prefix) {
		case "Hv":
			this.hue = Number(value);
			break;

		case "Sv":
			this.saturation = Number(value);
			break;

		case "Lv":
			this.light = Number(value);
			break;

		case "Rv":
			this.reflection = Number(value);
			break;

		case "CALI":
			this.calibrating = !(value === "DONE"); //Finished calibration
			break;
		case "Cv":
			if (value === "XXX,XXX,XXX"){
				this.hasObject = false;
				return
			}
			this.hasObject = true;
			const parts = value.split(",")
			this.hue = Number(parts[0]);
			this.saturation = Number(parts[1]);
			this.light = Number(parts[2]);
			break;
				

	


		default:
			console.log("Unsupported color prefix: ", prefix)
			break;
	}
}

	@property("Detected light", true)
	get light(): number { return this.mLight}
	set light(value: number) { this.mLight = value}
	@property("Detected saturation", true)
	get saturation(): number { return this.mSaturation}
	set saturation(value: number) { this.mSaturation = value}
	@property("Detected hue", true)
	get hue(): number { return this.mHue}
	set hue(value: number) { this.mHue = value}
	@property("Detected reflection", true)
	get reflection(): number { return this.mReflection}
	set reflection(value: number) { this.mReflection = value}
	@property("Calibrating", true)
	get calibrating(): boolean { return this.mCalibrating}
	set calibrating(value: boolean) { this.mCalibrating = value}
	@property("Has object detected", true)
	get hasObject(): boolean { return this.mHasObject}
	set hasObject(value: boolean) { this.mHasObject = value}

	@callable("Update value request")
	updateValues(
		@parameter("0=ALL but REFLECTION(*) 1=HSL 2=SAT 3=LIGHT 4=REFLECTION",true) cmd: number |0
	) {
		const options: { [key: number]: string } ={
			0:"ALL?",
			1:"HSL?",
			2:"SAT?",
			3:"LIGHT?",
			4:"REFL?"
		}
		const limitCmd = limitedVal(cmd,0,2,1,false);
		this.sendData("X" + this.ifaceNo() +"B[" + options[limitCmd] + "]");
	}
	@callable("Calibrate background")
	calibrateBackground() {
		this.sendData("X" + this.ifaceNo() +"B[CALI=BG]")
		this.calibrating = true;
	}
	@callable("Calibrate white reference")
	calibrateWhite() {
		this.sendData("X" + this.ifaceNo() +"B[CALI=WH]")
		this.calibrating = true;
	}
	@callable("Factory reset")
	resetToFactorySettings() {
		this.sendData("X" + this.ifaceNo() +"B[FACTORYRESET]");
	}
	@callable("Set intencity of measuring light")
	setLedIntencity(
		@parameter("Intencity 0-100", true) intencity: number
	) {
		const limitedIntencity = padVal(limitedVal(intencity,0,100,1,false));
		this.sendData("X" + this.ifaceNo() +"B[LED=" + limitedIntencity + "]");
	}
	@callable("Set measuring time")
	setMeasuringTime(
		@parameter("Time in ms 1-5", true) timeMs: number
	) {
		const limitedTime = limitedVal(timeMs,1,5,1,false);
		this.sendData("X" + this.ifaceNo() +"B[MEASURE=" + limitedTime + "]");
	}
	
	@callable(" Send setting, see api for details")
	sendSettings(
		@parameter("Setting, e.g. 1:2 or 6:1") cmd: string) {
		this.sendData("X" + this.ifaceNo() +"S[" + cmd + "]");
	}

	userFriendlyName() {
		return "Color";
	}
}

NexmosphereBase.registerInterface(ColorInterface, "COLOR","XZH60");


class ShelfWeightInterface extends BaseInterface {
	private mWeight: number = 0;
	private mPickupTrigger: boolean = false;
	private mAnomalyCount: number = 0;
	private mAnomalyDetected: boolean = false;
	private mStockLevel: number = 0;
	private mStockChange: number = 0;
	private mCalibrating: boolean = false;
	
	@property("Anomaly count", true)
	get anomalyCount(): number { return this.mAnomalyCount; }
	set anomalyCount(value: number) { this.mAnomalyCount = value; }
	@property("Anomaly detected", true)
	get anomalyDetected(): boolean { return this.mAnomalyDetected; }
	set anomalyDetected(value: boolean) { this.mAnomalyDetected = value; }
	@property("Stock level", true)
	get stockLevel(): number { return this.mStockLevel; }
	set stockLevel(value: number) { this.mStockLevel = value; }
	@property("Stock change", true)
	get stockChange(): number { return this.mStockChange; }
	set stockChange(value: number) { this.mStockChange = value; }	
	@property("Pickup trigger")
	get pickupTrigger(): boolean { return this.mPickupTrigger; }
	set pickupTrigger(value: boolean) { this.mPickupTrigger = value; }
	@property("Weight value", true)
	get weight(): number { return this.mWeight; }
	set weight(value: number) { this.mWeight = value; }
	@property("Calibrating", true)
	get calibrating(): boolean { return this.mCalibrating; }
	set calibrating(value: boolean) { this.mCalibrating = value; }

	@callable(" Send setting, see api for details")
	sendSettings(
		@parameter("Setting, e.g. 1:2 or 6:1") cmd: string) {
		this.sendData("X" + this.ifaceNo() +"S[" + cmd + "]");
	}

	@callable("Request stock level")
	requestStockLevel() {
		this.sendData("X" + this.ifaceNo() +"B[STOCK?]");
	}
	@callable("Set current stock level")
	setStock(
		@parameter("Stock level 0-999") stockLevel: number
	) {
		this.stockLevel = limitedVal(stockLevel,0,999);
		this.sendData("X" + this.ifaceNo() +"B[STOCKSET=" + padVal(limitedVal(stockLevel,0,999),3) + "]");
	}

	@callable("Set itemwight")
	setItemWeight(
		@parameter("Item weight 1-999 kg") itemWeight: number
	) {
		this.sendData("X" + this.ifaceNo() +"B[ITEMWEIGHT=" + padVal(limitedVal(itemWeight,1,999,1,false),3,3) + "]");
	}
	@callable("Store stock item weight")
	stockMeasure(
		@parameter("Number of items to measure stock weight for (1-999)", true) itemCount: number
	) {
		this.sendData("X" + this.ifaceNo() +"B[STOCKMEASURE=" + padVal(limitedVal(itemCount,1,999,1,true)) + "]");
	}
	
	@callable("Calibrate base weight (Zero,Tara)")
	calibrateTara() {
		this.sendData("X" + this.ifaceNo() +"B[CALIBRATE=BASE]");
		this.calibrating = true;
	}
	@callable("Calibrate reference weight")
	calibrateReferenceWeight(
		@parameter("Reference weight recommended 5-10 kg", true) referenceWeight: number
	) {
		this.sendData("X" + this.ifaceNo() +"B[CALIBRATE=" + padVal(limitedVal(referenceWeight,1,999,1,false),3,3) + "]");
		this.calibrating = true;
	}

	receiveData(data: string) {
		log("Weight input receivedd", data);
		const parts = data.split("=");
		const prefix = parts[0]
		const value = parts[1]
		if (prefix.indexOf("ANOMALY") === 0) {  //Special case for anomaly messages
    		const num = Number(prefix.slice("ANOMALY".length)); // extract the number
			this.anomalyCount = num;
			this.anomalyDetected = value === "DETECTED";
    	return;
		}
		switch (prefix) {
			case "STOCKCHANGE":
				
				break;

			case "STOCK":
				
				break;

			case "PICKUP":
				this.pickupTrigger = true;
				
				break;
				case "WEIGHT":
				this.weight = Number(value);
				break;
			case "CALIBRATION":
				this.calibrating = !(value === "DONE"); //Finished calibration
				break;
			

			default:
				console.log("Unsupported color prefix: ", prefix)
				break;
		}
}
	userFriendlyName() {
		return "ShelfWeight";
	}
}
NexmosphereBase.registerInterface(ShelfWeightInterface, "SHELFWEIGHT","X-S4x","X-S8x");

class BarWeightInterface extends BaseInterface {

	private mWeight: number = 0;
	private mCalibrating: boolean = false;
	private mWeightDifference: number = 0;
	private mAnomalyDetected: boolean = false;
	private mLiftedItems: boolean[] = [false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false];
		
	@property("Weight value", true)
	get weight(): number { return this.mWeight; }
	set weight(value: number) { this.mWeight = value; }
	@property("Calibrating", true)
	get calibrating(): boolean { return this.mCalibrating; }
	set calibrating(value: boolean) { this.mCalibrating = value; }
	@property("Weight difference", true)
	get weightDifference(): number { return this.mWeightDifference; }
	set weightDifference(value: number) { this.mWeightDifference = value; }	
	@property("Anomaly detected", true)
	get anomalyDetected(): boolean { return this.mAnomalyDetected; }
	set anomalyDetected(value: boolean) { this.mAnomalyDetected = value; }
	@property("LiftedItem_1", true)
	get liftedItem_1(): boolean { return this.mLiftedItems[0]; }
	set liftedItem_1(value: boolean) { this.mLiftedItems[0] = value; }
	@property("LiftedItem_2", true)
	get liftedItem_2(): boolean { return this.mLiftedItems[1]; }
	set liftedItem_2(value: boolean) { this.mLiftedItems[1] = value; }
	@property("LiftedItem_3", true)
	get liftedItem_3(): boolean { return this.mLiftedItems[2]; }
	set liftedItem_3(value: boolean) { this.mLiftedItems[2] = value; }					
	@property("LiftedItem_4", true)		
	get liftedItem_4(): boolean { return this.mLiftedItems[3]; }
	set liftedItem_4(value: boolean) { this.mLiftedItems[3] = value; }
	@property("LiftedItem_5", true)
	get liftedItem_5(): boolean { return this.mLiftedItems[4]; }
	set liftedItem_5(value: boolean) { this.mLiftedItems[4] = value; }	
	@property("LiftedItem_6", true)
	get liftedItem_6(): boolean { return this.mLiftedItems[5]; }
	set liftedItem_6(value: boolean) { this.mLiftedItems[5] = value; }	
	@property("LiftedItem_7", true)
	get liftedItem_7(): boolean { return this.mLiftedItems[6]; }
	set liftedItem_7(value: boolean) { this.mLiftedItems[6] = value; }	
	@property("LiftedItem_8", true)
	get liftedItem_8(): boolean { return this.mLiftedItems[7]; }
	set liftedItem_8(value: boolean) { this.mLiftedItems[7] = value; }	
	@property("LiftedItem_9", true)
	get liftedItem_9(): boolean { return this.mLiftedItems[8]; }
	set liftedItem_9(value: boolean) { this.mLiftedItems[8] = value; }	
	@property("LiftedItem_10", true)
	get liftedItem_10(): boolean { return this.mLiftedItems[9]; }
	set liftedItem_10(value: boolean) { this.mLiftedItems[9] = value; }
	@property("LiftedItem_11", true)		
	get liftedItem_11(): boolean { return this.mLiftedItems[10]; }
	set liftedItem_11(value: boolean) { this.mLiftedItems[10] = value; }	
	@property("LiftedItem_12", true)
	get liftedItem_12(): boolean { return this.mLiftedItems[11]; }
	set liftedItem_12(value: boolean) { this.mLiftedItems[11] = value; }	
	@property("LiftedItem_13", true)
	get liftedItem_13(): boolean { return this.mLiftedItems[12]; }
	set liftedItem_13(value: boolean) { this.mLiftedItems[12] = value; }	
	@property("LiftedItem_14", true)
	get liftedItem_14(): boolean { return this.mLiftedItems[13]; }
	set liftedItem_14(value: boolean) { this.mLiftedItems[13] = value; }	
	@property("LiftedItem_15", true)
	get liftedItem_15(): boolean { return this.mLiftedItems[14]; }
	set liftedItem_15(value: boolean) { this.mLiftedItems[14] = value; }	
	@property("LiftedItem_16", true)
	get liftedItem_16(): boolean { return this.mLiftedItems[15]; }
	set liftedItem_16(value: boolean) { this.mLiftedItems[15] = value; }		


	@callable("Request weight")
	requestWeight() {
		this.sendData("X" + this.ifaceNo() +"B[WEIGHT?]");
	}
	@callable(" Send setting, see api for details")
	sendSettings(
		@parameter("Setting, e.g. 1:2 or 6:1") cmd: string) {
		this.sendData("X" + this.ifaceNo() +"S[" + cmd + "]");
	}

	@callable("Calibrate base weight (Zero,Tara)")
	calibrateTara() {
		this.sendData("X" + this.ifaceNo() +"B[CALIBRATE=BASE]");
		this.calibrating = true;
	}
	@callable("Calibrate reference weight in grams")
	calibrateReferenceWeight(
		@parameter("Reference weight recommended 500-1000 grams", true) referenceWeight: number
	) {
		this.sendData("X" + this.ifaceNo() +"B[CALIBRATE=" + padVal(limitedVal(referenceWeight,1,999,1,false),5,1) + "]");
		this.calibrating = true;
	}


	@callable("Set item weight in grams")
	setItemWeight(
		@parameter("Item number 1-16") itemNo: number,
		@parameter("Item weight 1-9999.9 grams") itemWeight: number
	) {
		this.sendData("X" + this.ifaceNo() +"B[ITEM" + padVal(itemNo,2) + "WEIGHT=" + padVal(limitedVal(itemWeight,1,9999,1,false),5,1) + "]");
	}	

	@callable("Measure a custom items weight")
	measureCustomItemWeight(
		@parameter("Item number 1-16") itemNo: number,
		@parameter("Number of items to measure weight for (1-999)", true) itemCount: number
	) {

    const padded =
        itemCount > 0
        ? "=" + padVal(limitedVal(itemCount, 1, 999, 1, true))
        : "";

    this.sendData(
        "X" +
        this.ifaceNo() +
        "B[ITEM" +
        padVal(itemNo,2) +
		"MEASURE" +
        padded +
        "]"
    );
}

	@callable("Clear a custom item name and weight")
	clearCustomItem(
		@parameter("Item number 1-16") itemNo: number
	) {
		this.sendData("X" + this.ifaceNo() +"B[CLEARITEM=" + itemNo + "]");
	}
	@callable("Clear all custom item names and weights")
	clearAllCustomItems() {
		this.sendData("X" + this.ifaceNo() +"B[CLEARALLITEMS]");
	}
	@callable("Factory reset")
	resetToFactorySettings() {
		this.sendData("X" + this.ifaceNo() +"B[FACTORYRESET]");
	}


	receiveData(data: string) {	
		log("Bar weight input received", data);
		const parts = data.split("=");
		const prefix = parts[0]
		const value = parts[1]
		switch (prefix) {
			case "WEIGHT":
				this.weight = Number(value);
				break;
			case "WEIGHTDIFF":
				this.weightDifference = Number(value);
				break;
			case "ANOMALY":
				this.anomalyDetected = value === "DETECTED";
				break;
			case "CALIBRATION":
				this.calibrating = !(value === "DONE"); //Finished calibration
				break;
			case "ITEM":
				// Example: ITEM01=NAME:Water Bottle,WEIGHT:1500.0
				const itemParts = value.split(",");
				const itemInfo: { [key: string]: string } = {};
				itemParts.forEach(part => {
					const [key, val] = part.split(":");
					itemInfo[key] = val;
				});
				// Here you can store or process itemInfo as needed
				console.log("Received item info: ", itemInfo);
				break;
			case"PU":
				// Pickup trigger for item number
				const pickItemNo = Number(value);
				log(pickItemNo)
				if (pickItemNo >= 1 && pickItemNo <= 16) {
					this.mLiftedItems[pickItemNo - 1] = true;
					this.changed("liftedItem_" + pickItemNo);
				}
				break;	
			case"PB":
				// Putback trigger for item number
				const putItemNo = Number(value);
				if (putItemNo >= 1 && putItemNo <= 16) {
					this.mLiftedItems[putItemNo - 1] = false;
					this.changed("liftedItem_" + putItemNo);
				}
				break;
			case "ERROR":
				console.log("Bar Weight Error: ", value);
				break;
			default:
				console.log("Unsupported Bar weight prefix: ", prefix)
				break;
		}
		
		
	}
	userFriendlyName(): string {
		return "BarWeight";
	}
}

NexmosphereBase.registerInterface(BarWeightInterface, "BARWEIGHT","XZ-W11","XZ-W21","XZ-W51");

class WirePickup extends BaseInterface {
	private mPickup: boolean = false;
	private mAlarm: boolean = false;
	
	@property("Alarm state", true)
	get alarm(): boolean { return this.mAlarm; }
	set alarm(value: boolean) { this.mAlarm = value; }	
	@property("Pickup state", true)
	get pickup(): boolean { return this.mPickup; }
	set pickup(value: boolean) { this.mPickup = value; }

	receiveData(data: string) {
		let value = Number(data);
	this.alarm = (value & 4) !== 0;
	this.pickup = (value & 3) !== 0;
	}
	
	sendSettings(
	@parameter("Setting, e.g. 1:2 or 4:7") cmd: string) {
	this.sendData("X" + this.ifaceNo() +"S[" + cmd + "]");
	}
userFriendlyName(): string {
		return "PickUp";
	}
}
NexmosphereBase.registerInterface(WirePickup, "DOTWIREPICKUP","XSNAPPER","XDWX16", "XDWX26", "XDWX36", "XDWX36C", "XDBX16", "XDBX26", "XDBX36", "XDBX36C",
	"XSWX16", "XSWX26", "XSWX36", "XSBX16", "XSBX26", "XSBX36", "XLFWX16", "XLFWX26","XLFWX36", "XLFBX16", "XLFBX26", "XLFBX36", "XLCWX16", "XLCWX26", "XLCWX36","XLCBX16", "XLCBX26", "XLCBX36");



class WirelessPickup extends BaseInterface {
	private mPickup: boolean = false;

	@property("Pickup state", true)
	get pickup(): boolean { return this.mPickup; }
	set pickup(value: boolean) { this.mPickup = value; }
@callable("Enable pairing mode for wireless pickup sensors")
	pairingMode() {
		this.sendData("X" + this.ifaceNo() +"B[PAIR]");
	}
@callable("Unpair this wireless pickup sensor")
	unPaire() {
		this.sendData("X" + this.ifaceNo() +"B[UNPAIR]");
	}
	receiveData(data: string) {
		let value = Number(data);
	
	this.pickup = (value & 3) !== 0;
	}
	
	sendSettings(
	@parameter("Setting, e.g. 5:1 or 8:1") cmd: string) {
	this.sendData("X" + this.ifaceNo() +"S[" + cmd + "]");
	}
userFriendlyName(): string {
		return "PickUp";
	}
}
NexmosphereBase.registerInterface(WirelessPickup, "WIRELESSPICKUP"," XFP3W", "XF-P3B", "XF-P3N");

/**
 * Special controllers with built internal element ports.
 */
export type BuiltInElements = [string, number, string?][];

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

interface IfaceInfo {
	modelCode: string;
	ifaceNo: number;
	name?: string;
}

type PacketHandler = (parseResult: RegExpExecArray, msg: string) => void;


export function padVal(
    num: number,
    width: number = 3,
    decimalWidth?: number
): string {
    let str = String(num);

    // Check if number has decimals (no includes)
    const dot = str.indexOf('.');
    
    // No decimal part → behave like before
    if (dot === -1) {
        while (str.length < width) {
            str = "0" + str;
        }
        return str;
    }

    // Split into integer and decimal
    const parts = str.split('.');
    let intPart = parts[0];
    let decPart = parts[1];

    // Pad integer part
    while (intPart.length < width) {
        intPart = "0" + intPart;
    }

    // If decimalWidth not set → return unmodified decimals
    if (!decimalWidth) {
        return intPart + "." + decPart;
    }

    // ROUND to decimalWidth
    const rounded = Number(num).toFixed(decimalWidth); // string like "4.006"
    const rParts = rounded.split('.');

    const roundedInt = rParts[0];
    let roundedDec = rParts[1];

    // In case rounding added digits to integer part (e.g., 9.999 → 10.000)
    let finalInt = roundedInt;
    while (finalInt.length < width) {
        finalInt = "0" + finalInt;
    }

    // Ensure decimal padding (usually correct already)
    while (roundedDec.length < decimalWidth) {
        roundedDec = roundedDec + "0";
    }

    return finalInt + "." + roundedDec;
}

	/* Converts a number to hex string with optional width padding (default 2) */
export function toHex(num: number, width: number = 2): string {
	let hex = num.toString(16);
	if (width > 0) {
		hex = ('00000000' + hex).slice(-width); // pad manually
	}
	return hex
	}

/* Limits value to min max and applies optional factor defaults to 1 
default rounds to nearest integer, !!scaled after clamping!!*/
export function limitedVal(
    num: number,
    minVal: number,
    maxVal: number,
    scale: number = 1,
    round: boolean = true
): number {
    const clamped = Math.max(minVal, Math.min(maxVal, num)) * scale;
    return round ? Math.round(clamped) : clamped;
}
/* Normalizes a value from one range to another */
export function normalize(value:number, inMin:number, inMax:number, outMin?:number | 0, outMax?:number | 1) {
    return outMin + ((value - inMin) * (outMax - outMin)) / (inMax - inMin);
}

/**
 Log messages, allowing my logging to be easily disabled in one place.
 */
export function log(...messages: any[]) {
	if (true)
		// Set to false to disable verbose logging
		console.log(messages);
}