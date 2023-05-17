/*
 * Copyright (c) 2023 Mika Raunio <mika@diago.global>. Licensed under the MIT License.
 */

import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import * as Meta from "system_lib/Metadata";

/*
 * This driver talks to a Leuze BPS 8 SM 100-01 via a TCP serial server,
 * using Leuze binary protocol 1.
 *
 * The driver exposes the tape position as well as the sensor status bits
 * via read-only properties. Poll and timeout intervals are configurable
 * with the constants POLL_INTERVAL and TIMEOUT defined below. Diagnostic
 * code and marker bar code retrieval are not implemented.
 *
 * Other Leuze devices implementing the same binary protocol should work as
 * well. For other Leuze (poll-based) protocols, adapt the protocol-specific
 * methods at the end of the file.
 *
 * For cyclical output devices, see the case study referenced below for
 * inspiration.
 *
 * - - - - -
 *
 * Based on the PIXILAB case study at:
 * https://pixilab.se/docs/blocks/advanced_scripting/example1
 *
 * which in turn is based on an original implementation by Sierk Janszen,
 * Wilfred de Zoete and Jean-Paul Coenraad at Rapenburg Plaza.
 *
 * - - - - -
 *
 * A Moxa NPort P5150A serial server was used for development, but any similar
 * device offering a raw TCP stream should work.
 *
 * When using the Moxa NPort, be sure to set up the device for "TCP Server"
 * operation mode, and disable data framing.
 *
 * - - - - -
 *
 * References:
 *
 * - Leuze BPS 8 SM 100-01 user manual (page numbers refer to 2020-10-20 edition):
 * https://files.leuze.com/Volumes/Volume0/opasdata/d100001/medias/docus/178/$v8/UM_BPS8_en_50105556.pdf
 *
 * - Moxa NPort 5000 Series user manual:
 * https://cdn-cms.azureedge.net/getmedia/fab19816-d8c7-4ce7-ab2d-89df8b1d25bc/moxa-nport-5000-series-manual-v6.8.pdf
 *
 */

// --- Type declarations

type ReadQuality = 0|1|2|3;

// -- Constants

// Poll messages are sent to the device every POLL_INTERVAL ms as long as
// replies are received. If no data is received in TIMEOUT ms, the normal
// poll cycle is interrupted, and a message is sent only at TIMEOUT intervals
// until a reply is received again.

const POLL_INTERVAL = 200;  // Poll interval in milliseconds
const TIMEOUT       = 2000; // Timeout delay in milliseconds

const DEFAULT_PORT  = 4001; // TCP serial server default port, 4001 for Moxa


@Meta.driver('NetworkTCP', { port: DEFAULT_PORT })
export class LeuzeBPS8 extends Driver<NetworkTCP> {

	// --- Private instance variables

	// Properties
	private mConnected = false;
	private mPosition: number = 0;
	private mInternalError = false;
	private mTapeError = false;
	private mDiagnosticDataExist = false;
	private mMarkerBarCodePresent = false;
	private mStandbyState = false;
	private mReadQuality: ReadQuality = 3;
	private mReadQualityString: string = '';
	private mReadTimeout = false;

	// Timers
	private pollTimer: CancelablePromise<void>;
	private timeoutTimer: CancelablePromise<void>;

	// --- Expose Blocks properties

	// Connected to TCP Server
	@Meta.property("Connected to TCP server", true)
	public set connected(val: boolean) { this.mConnected = val; }
	public get connected() { return this.mConnected; }

	// Sensor position
	@Meta.property("Sensor position (in mm)", true)
	public set position(val: number) { this.mPosition = val; }
	public get position() { return this.mPosition; }

	// Internal error
	@Meta.property("Leuze indicates internal error", true)
	public set internalError(val: boolean) { this.mInternalError = val; }
	public get internalError() { return this.mInternalError; }

	// Tape error
	@Meta.property("Leuze indicates tape error", true)
	public set tapeError(val: boolean) { this.mTapeError = val; }
	public get tapeError() { return this.mTapeError; }

	// Diagnostic data exist
	@Meta.property("Leuze indicates diagnostic data logged", true)
	public set diagnosticDataExist(val: boolean) { this.mDiagnosticDataExist = val; }
	public get diagnosticDataExist() { return this.mDiagnosticDataExist; }

	// Marker bar code present
	@Meta.property("Leuze indicates marker bar code in memory", true)
	public set markerBarCodePresent(val: boolean) { this.mMarkerBarCodePresent = val; }
	public get markerBarCodePresent() { return this.mMarkerBarCodePresent; }

	// Standby state
	@Meta.property("Leuze indicates device in standby state", true)
	public set standbyState(val: boolean) { this.mStandbyState = val; }
	public get standbyState() { return this.mStandbyState; }

	// Reading quality numeric value
	@Meta.property("Read quality", true)
	public set readQuality(val: ReadQuality) { this.mReadQuality = val; }
	public get readQuality() { return this.mReadQuality; }

	// Reading quality as string
	@Meta.property("Read quality string", true)
	public set readQualityString(val: string) { this.mReadQualityString = val; }
	public get readQualityString() { return this.mReadQualityString; }

	// Read timeout
	@Meta.property("Read timeout", true)
	public set readTimeout(val: boolean) { this.mReadTimeout = val; }
	public get readTimeout() { return this.mReadTimeout; }

	// --- Constructor

	public constructor(private socket: NetworkTCP) {
		super(socket);

		socket.subscribe('connect', () => this.connectStateChanged());
		socket.subscribe('bytesReceived', (_, msg) => this.bytesReceived(msg.rawData));
		socket.subscribe('finish', () => this.tearDownConnection());

		socket.autoConnect(true); // Use automatic connection mechanism in rawBytesMode
		this.connected = socket.connected; // May already be connected
		if (this.connected) {
			this.setupConnection(); // If so, start polling right away
		}
	}

	// --- Connection setup and teardown

	private setupConnection() {
		if (this.pollTimer) {
			this.pollTimer.cancel();
		}
		this.runPollLoop();
		if (this.timeoutTimer) {
			this.timeoutTimer.cancel();
		}
		this.runTimeoutLoop();
	}

	private tearDownConnection() {
		if (this.pollTimer) {
			this.pollTimer.cancel();
			this.pollTimer = undefined;
		}
		if (this.timeoutTimer) {
			this.timeoutTimer.cancel();
			this.timeoutTimer = undefined;
		}
	}

	// --- Event handlers, poll and timeout loops

	private runPollLoop() {
		this.leuzeSendPoll();
		this.pollTimer = wait(POLL_INTERVAL);
		this.pollTimer.then(() => this.runPollLoop());
	}

	private runTimeoutLoop() {
		this.timeoutTimer = wait(TIMEOUT);
		this.timeoutTimer.then(() => {
			if (!this.readTimeout) {
				this.readTimeout = true;
				console.warn(`Timeout, no data received from device in ${TIMEOUT} ms`);
			}
			if (this.pollTimer) {
				this.pollTimer.cancel();
				this.pollTimer = undefined;
			}
			this.leuzeSendPoll();
			this.runTimeoutLoop();
		})
	}

	private bytesReceived(bytes: number[]) {
		// console.info('Received', this.toBinary(bytes));
		this.leuzeProcessData(bytes);
		if (this.timeoutTimer) {
			this.timeoutTimer.cancel();
		}
		this.runTimeoutLoop();
		if (this.readTimeout) {
			this.readTimeout = false;
			console.warn('Cleared timeout condition');
		}
		if (!this.pollTimer) {
			this.runPollLoop();
		}
	}

	private connectStateChanged() {
		console.info("Connect state changed to", this.socket.connected);
		this.connected = this.socket.connected; // Propagate state to clients
		if (this.socket.connected) {
			this.setupConnection();
		} else {
			this.tearDownConnection();
		}
	}

	// --- Helpers

	private send(data: number[]) {
		// console.info('Send', this.toBinary(data));
		this.socket.sendBytes(data);
	}

	private toBinary(input: number[]): string {
		const padToOctet = (s: string): string => ('00000000' + s).substring(s.length);
		const output: string[] = [];
		for (var i = 0; i < input.length; i++) {
			output.push(padToOctet(input[i].toString(2)));
		}
		return output.join(' ');
	}

	/* Modify the methods methods below to adapt the driver to your Leuze device */

	// --- Leuze BPS 8 binary protocol 1

	private leuzeSendPoll() {
		// See manual section 9.1.2, pp. 62-63.
		//
		// Send a request with bit 3 (Request position information) set.
		// Second byte a repetition of the first one, as checksum.
		this.send([0x08, 0x08]);
	}

	private leuzeProcessData(data: number[]) {
		// See manual section 9.1.3, pp. 63-64.
		//
		// The response message consists of 6 bytes as follows:
		//
		// 0 s    status
		// 1 d1   data byte 1
		// 2 d2   data byte 2
		// 3 d3   data byte 3
		// 4 d4   data byte 4
		// 5 c    checksum: XOR of bytes 0-4
		//

		const NUM_OCTETS = 6;

		// Bitmasks for parsing the status byte
		const ERR   = 0x01;
		const OUT   = 0x02;
		const D     = 0x04;
		const MM    = 0x08;
		const SLEEP = 0x10;
		const Q     = 0x60;

		// Reading quality status strings
		const readQualityStrings = { 0: '> 75%', 1: '50% - 75%', 2: '25% - 50%', 3: '< 25%' }

		if (data.length != NUM_OCTETS) {
			console.warn(`Discarded reply with incorrect length: expected ${NUM_OCTETS} bytes, received ${data.length}`);
			return;
		}
		const [s, d1, d2, d3, d4, c] = data;
		if ((s ^ d1 ^ d2 ^ d3 ^ d4) != c) {
			console.warn('Discarded reply with incorrect checksum');
			return;
		}

		this.internalError = !!(s & ERR);
		this.tapeError = !!(s & OUT);
		this.diagnosticDataExist = !!(s & D);
		this.markerBarCodePresent = !!(s & MM);
		this.standbyState = !!(s & SLEEP);
		const readQuality = <ReadQuality>((s & Q) >> 5);
		this.readQuality = readQuality;
		this.readQualityString = readQualityStrings[readQuality];
		// Use Int32Array for two's complement handling
		this.position = new Int32Array([(d1 << 24) + (d2 << 16) + (d3 << 8) + d4])[0];
	}
}
