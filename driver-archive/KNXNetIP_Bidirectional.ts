/*
	Two-way KNXNet-IP driver.
	
	Copyright (c) 2026 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.

DRIVER USER INSTRUCTIONS

Configuration is provided via the device's "Driver Custom Options" field in Blocks.
Paste the JSON configuration directly into that field.

────────────────────────────────────────────────────────────────────────────────
PROPERTY TYPES
────────────────────────────────────────────────────────────────────────────────

"analog"  — Numeric value. Supported KNX main types:
  (none)  Legacy normalized 0..1 (same as 5.001)
  5.001   Normalized percentage 0..1
  5.003   Angle 0..360°
  5.xxx   Unsigned 1-byte integer (0..255)
  6.xxx   Signed 1-byte integer (-128..127)
  7.xxx   Unsigned 2-byte integer
  8.xxx   Signed 2-byte integer
  9.xxx   2-byte KNX float (e.g., temperature, lux)
  12.xxx  Unsigned 4-byte integer
  13.xxx  Signed 4-byte integer
  14.xxx  4-byte IEEE 754 float

"digital" — Boolean on/off value. KNX datatype 1.001.

"scenes"  — Scene recall. Sends a single-byte scene number (0..maxScene, default 63).

────────────────────────────────────────────────────────────────────────────────
ADDRESS FIELDS
────────────────────────────────────────────────────────────────────────────────

"addr"        Required. Three-part KNX group address [main, middle, sub] for sending writes.
"statusAddr"  Optional. Separate group address used for passive monitoring and startup reads.
              If omitted, "addr" is used for both sending and status monitoring.

On startup the driver sends a GroupValueRead to each property's status address so that
current bus values are fetched immediately. Use "startupReadIntervalMs" if several
devices respond simultaneously and collide on the KNX bus.

────────────────────────────────────────────────────────────────────────────────
CONFIGURATION OPTIONS
────────────────────────────────────────────────────────────────────────────────

responseTimeout        (ms, default 5000)   How long to wait for a KNXnet/IP response
                                            before resetting the connection.
startupReadIntervalMs  (ms, default 200)    Delay between consecutive startup GroupValueReads.
                                            Increase (e.g. 200–300) if some devices miss their
                                            initial read due to simultaneous bus responses.
connectTestIntervalMs  (ms, default 30000)  Keepalive interval for connection-state requests.
maxFailedConnectAttempts (default 2)        Failed connection attempts before clearing
                                            the "connected" property in Blocks.
debugLogging           (boolean, default false) Enable verbose debug logging to the console.
                                            Set to true in the config/options while diagnosing.

────────────────────────────────────────────────────────────────────────────────
CALLABLES
────────────────────────────────────────────────────────────────────────────────

setOnOff(addr1, addr2, addr3, on)         Send GroupValueWrite (boolean) to a group address.
setScene(addr1, addr2, addr3, scene)      Recall a scene number (0..63 by default).
enforceProps()                            Re-send all current dynamic property values to KNX.
sendGroupValueRead(addr1, addr2, addr3)   Send a GroupValueRead (for diagnostics).

────────────────────────────────────────────────────────────────────────────────
EXAMPLE CONFIGURATION
────────────────────────────────────────────────────────────────────────────────

{
  "responseTimeout": 5000,
  "startupReadIntervalMs": 200,
  "analog": [
    {
      "name": "DimLevel",
      "description": "Dimmer 0–100%",
      "addr": [1, 2, 101],
      "type": "5.001"
    },
    {
      "name": "RoomTemp",
      "description": "Room temperature as 2-byte KNX float",
      "addr": [1, 2, 111],
      "statusAddr": [1, 2, 211],
      "type": "9.001"
    }
  ],
  "digital": [
    {
      "name": "LightSwitch",
      "description": "Main light on/off",
      "addr": [1, 2, 100],
      "statusAddr": [1, 2, 200]
    }
  ],
  "scenes": [
    {
      "name": "LobbyLights",
      "addr": [1, 2, 120],
      "description": "Lobby lighting scene recall",
      "maxScene": 31
    }
  ]
}
*/

import {callable, parameter, driver, property} from "system_lib/Metadata";
import {Driver} from "system_lib/Driver";
import {NetworkUDP} from "system/Network";
import {SimpleFile} from "system/SimpleFile";

let debugLoggingEnabled = false;

const enum State {
	DISCONNECTED,				// Initial (virgin) state
	CONNECTING,
	CONNECTIONSTATE_REQUESTED,	// Have received CONNECT_RESPONSE, and sent CONNECTIONSTATE_REQUEST
	CONNECTED_IDLE,				// Have received CONNECTIONSTATE_RESPONSE and is just idle
	TUNNELING					// Have sent TUNNELLING_REQUEST, awaiting TUNNEL_RESPONSE
}

const enum Command {
	SEARCH_REQUEST = 0x0201,
	SEARCH_RESPONSE = 0x0202,
	DESCRIPTION_REQUEST = 0x0203,
	DESCRIPTION_RESPONSE = 0x0204,
	CONNECTION_REQUEST = 0x0205,
	CONNECTION_RESPONSE = 0x0206,
	CONNECTIONSTATE_REQUEST = 0x0207,
	CONNECTIONSTATE_RESPONSE = 0x0208,
	DISCONNECT_REQUEST = 0x0209,
	DISCONNECT_RESPONSE = 0x020A,
	TUNNEL_REQUEST = 0x0420,
	TUNNEL_RESPONSE = 0x0421,
	DEVICE_CONFIGURATION_REQUEST = 0x0310,
	DEVICE_CONFIGURATION_ACK = 0x0311,
	ROUTING_INDICATION = 0x0530
}

interface QueuedCommand {
	handler: (cmd: QueuedCommand) => void;
	seqId?: number;	// Assigned once sent, to verify in ack
	debugLabel?: string;
}

interface AddressedCmd extends QueuedCommand {
	destAddr: number; 	// What's returned by calcAddr
}

interface ReadCmd extends AddressedCmd {
	isRead: true;
}

interface OnOffCmd extends AddressedCmd {
	on: boolean;
}

interface ValueCmd extends AddressedCmd {
	payload: number[];
}

/**
 * Base property definition shared by all property types.
 */
interface IBaseProp {
	addr: number[];		// KNX bus address to send to (must be 3 values)
	statusAddr?: number[];	// Optional KNX status address to read/monitor
	description?: string;
}
interface IAnalog extends IBaseProp {
	name: string;	// Name property will be published under
	type?: string;	// KNX value type, supporting scalar numeric KNX main types
}
interface IDigital extends IBaseProp {
	name: string;	// Name property will be published under
	type?: '1.xxx';	// KNX value type, to support other flavors (1.xxx is default)
}

/**
 * Structure of the driver configuration (from Driver Custom Options).
 */
interface IConfig {
	responseTimeout?: number;        // ms; how long to wait for a KNXnet/IP response
	startupReadIntervalMs?: number;  // ms delay between consecutive startup GroupValueReads
	connectTestIntervalMs?: number;  // ms keepalive interval for connection-state requests
	maxFailedConnectAttempts?: number; // failed attempts before clearing the connected property
	debugLogging?: boolean;          // enable verbose debug logging (default false)
	analog?: IAnalog[];
	digital?: IDigital[];
	scenes?: IScene[];
}

interface IScene extends IBaseProp {
	name: string;
	description?: string;
	maxScene?: number; // maximum scene number supported (default 63)
}

@driver('NetworkUDP', { port: 3671, rcvPort:32331 })
export class KNXNetIP_Bidirectional extends Driver<NetworkUDP> {
	private state: State = State.DISCONNECTED;	// Update ONLY through setState
	private channelId: number;	// Once received in CONNECT_RESPONSE
	private seqCount = 0;		// Tunneling command sequence counter (incremented for each send)
	private mConnected = false;
	private connectAttempts = 0;
	private cmdQueue: QueuedCommand[] = [];
	private timer?: CancelablePromise<void>;	// Set if have pending timer to checkStateSoon
	private errCount = 0;		// To reset connection after too many consecutive errors
	private dynProps: DynProp[] = [];
	private statusProps: {[address: number]: DynProp} = {};
	private connTimeoutWarned = false;	// To not nag on failed connection attempts
	private pendingStartupReads = false;
	private responseTimeout = 5000;
	private startupReadIntervalMs = 200; // ms delay between consecutive startup GroupValueReads
	private debugLastDisconnectRequest?: { when: number; reconnect: boolean };
	private readonly persistedDisconnectFile: string;
	private probeTimer?: CancelablePromise<void>;
	private probeInterval = 30000;    // keepalive probe interval in ms, configurable
	private probeMaxFailures = 2;     // connect failures before flagging unreachable
	private probeFailures = 0;
	private lastProbeInitiated = false;
	private disconnectAttempts = 0;
	private disconnectTimer?: CancelablePromise<void>;
	private readonly MAX_DISCONNECT_ATTEMPTS = 3;
	private orphanedChannels: number[] = []; // channels we've already sent disconnect for
	private pendingValidationChannelId?: number;  // persisted channel being validated on startup
	private pendingValidationSeqCount = 0;        // seqCount to restore if persisted channel is reused

	public constructor(private socket: NetworkUDP) {
		super(socket);
		this.persistedDisconnectFile = 'KNXNetIP/lastDisconnect_' + this.socket.name + '.json';
		this.loadConfig();
		// Start periodic probe timer (will only actively attempt connections when appropriate)
		this.startProbe();
		
		// Persisted pending-disconnect cleanup is attempted only when socket is enabled.
		// The driver object may be recreated even when socket is disabled; avoid touching
		// files or logging about prior disconnects in that case.
		if (socket.enabled) {	// Don't fire up socket listener and state polling unless enabled
			console.log("KNXNetIP driver starting up for device", socket.name, "on port", socket.listenerPort);
			if (!this.socket.listenerPort)
				throw "Listening port not specified (e.g, 32331)"

			// On startup, check whether a previous tunnel channel can be reused.
			// If the gateway still knows about it (CONNECTIONSTATE_RESPONSE with no error), adopt it
			// so we avoid burning a new slot. Otherwise send a disconnect to free it and connect fresh.
			SimpleFile.exists(this.persistedDisconnectFile).then(exists => {
				if (exists === 1) {
					SimpleFile.readJson(this.persistedDisconnectFile).then((data: any) => {
						if (data && data.channelId) {
							debugLog('Found persisted channelId', data.channelId, '- probing gateway to validate/reuse');
							this.pendingValidationChannelId = data.channelId;
							this.pendingValidationSeqCount = data.seqCount || 0;
							this.sendConnectionStateFor(data.channelId);
							// If no response within responseTimeout, abandon validation and connect fresh
							wait(this.responseTimeout).then(() => {
								if (this.pendingValidationChannelId === data.channelId) {
									debugLog('Channel validation timed out for channel', data.channelId, '- starting fresh');
									this.pendingValidationChannelId = undefined;
									this.sendDisconnectFor(data.channelId);
									SimpleFile.delete(this.persistedDisconnectFile).catch(() => {});
									this.checkStateSoon(0);
								}
							});
							// Don't call checkStateSoon here - wait for validation to complete
							return;
						}
						// File existed but had no channelId - connect normally
						this.checkStateSoon(0);
					}).catch(() => {
						this.checkStateSoon(0);
					});
				} else {
					// No persisted file - connect normally
					this.checkStateSoon(0);
				}
			}).catch(() => {
				this.checkStateSoon(0);
			});

			socket.subscribe('bytesReceived', (sender, message) => {
				debugLog("bytesReceived", message.rawData.length);
				try {
					this.processReply(message.rawData);
					this.errCount = 0;
				} catch (error) {
					console.error(error);
					// Reset state after "too many errors"
					if (++this.errCount > 5) {
						this.errCount = 0;
						this.sendDisconnectRequest();
					}
				}
			});
			// Initial connect is now scheduled inside the SimpleFile.exists callback above.

			// Script shut down - ensure tunnel is disconnected and cancel timers to avoid leaking
			socket.subscribe('finish', () => {
				debugLog("finish - driver shutting down, persisting channelID and sequence for next instance to try to reuse");
				// Mark not connected immediately so UI reflects tunnel closure
				this.connected = false;
				try {
					if (this.channelId) {
						// Do NOT attempt to send DISCONNECT_REQUEST while shutting down —
						// persist the pending disconnect so the next instance can clean it up.
						// This avoids the risk of the disconnect request not going out at all due to shutdown timing, which would leave the gateway hanging with an open session until it times out on its end.
						// This occure when we disable the driver in blocks. The socket will not be able to sent out the disconnect in this case.
					SimpleFile.write(this.persistedDisconnectFile, JSON.stringify({ channelId: this.channelId, seqCount: this.seqCount, when: Date.now(), reconnect: false })).catch(() => {});
					}
				} catch (e) {
					console.error('Error while sending disconnect on finish', e);
				}
				this.cancelTimer();
				if (this.probeTimer) {
					this.probeTimer.cancel();
					this.probeTimer = undefined;
				}
			});
		}
	}

	/**
	 * Start periodic connection probe to maintain reachability state.
	 */
	private startProbe() {
		// Always schedule next probe even if one is already pending
		if (this.probeTimer)
			return;
		this.probeTimer = wait(this.probeInterval);
		this.probeTimer.then(() => {
			this.probeTimer = undefined;
			try {
				if (!this.socket)
					return;
				// Only attempt a probe if socket is enabled and we are currently disconnected
				if (this.socket.enabled && this.state === State.DISCONNECTED) {
					this.lastProbeInitiated = true;
					// Trigger connection attempt immediately
					this.checkStateSoon(0);
				}
			} catch (e) {
				console.error('Error in probe tick', e);
			}
			// Schedule next probe
			this.startProbe();
		});
	}

	/**
	 * Load configuration from socket.options (Driver Custom Options field in Blocks).
	 */
	private loadConfig() {
		try {
			const opts: any = (this.socket as any).options;
			if (opts) {
				let cfg = opts;
				if (typeof cfg === 'string')
					cfg = JSON.parse(cfg);
				this.processConfig(cfg);
			}
		} catch (err) {
			console.error('Invalid socket.options for KNXNetIP driver', err);
		}
	}

	private processConfig(config: IConfig) {
		if (config.responseTimeout !== undefined)
			this.responseTimeout = Math.max(500, config.responseTimeout);
		if (config.connectTestIntervalMs !== undefined)
			this.probeInterval = Math.max(1000, config.connectTestIntervalMs);
		if (config.maxFailedConnectAttempts !== undefined)
			this.probeMaxFailures = Math.max(1, config.maxFailedConnectAttempts);
		if (config.startupReadIntervalMs !== undefined)
			this.startupReadIntervalMs = Math.max(0, config.startupReadIntervalMs);
		debugLoggingEnabled = !!config.debugLogging; // always assign; defaults to false if not set

		if (config.analog) {
			for (const analog of config.analog) {	// Define one analog property per entry
				if (isSupportedAnalogType(analog.type)) {
					const prop = new AnalogProp(this, analog);
					this.dynProps.push(prop);
					this.registerStatusProp(prop);
				}
				else
					debugLog("Unsupported analog type", analog.type);
			}
		}
		if (config.digital) {
			for (const digital of config.digital) {	// Define one digital property per entry
				if (!digital.type || digital.type.charAt(0) === "1") { // Only type we know of for now
					const prop = new DigitalProp(this, digital);
					this.dynProps.push(prop);
					this.registerStatusProp(prop);
				}
				else
					debugLog("Unsupported digital type", digital.type);
			}
		}

		// Scenes: recallable scene group addresses (0..63 default)
		if (config.scenes) {
			for (const scene of config.scenes) {
				const prop = new SceneProp(this, scene);
				this.dynProps.push(prop);
				this.registerStatusProp(prop);
			}
		}

		// Config loading is async, so the connection may already be up by now.
		// In that case, queue the same initial status reads here as well.
		if (this.connected)
			this.requestInitialStatuses();

	}

	private registerStatusProp(prop: DynProp) {
		const statusAddr = prop.getStatusAddr();
		if (statusAddr !== undefined)
			this.statusProps[statusAddr] = prop;
	}

	@property("Connection established", true)
	get connected(): boolean {
		// Connected reflects whether we currently hold a tunnelling session
		return this.mConnected;
	}

	set connected(value: boolean) {
		if (value === this.mConnected)
			return;
		this.mConnected = value;
	}

	/**
	 * Hook up a timer to check my state and move me forward "soon" (in mS).
	 */
	private checkStateSoon(howSoon = this.responseTimeout) {
		this.cancelTimer();	// Kill any pre-existing timeout
		if (this.socket.enabled) {	// Don't hook up timer if communication is disabled
			this.timer = wait(howSoon);
			this.timer.then(() => {
				this.timer = undefined;	// Now taken
				switch (this.state) {
				case State.DISCONNECTED:
					if (this.socket.enabled) {
						this.sendConnectRequest();
						this.setState(State.CONNECTING);
						this.checkStateSoon();	// Make sure I succeed reasonably soon
					}
					break;
				case State.TUNNELING:		// Presumably failed doing state's work fast enough
				case State.CONNECTIONSTATE_REQUESTED:
					const queued = this.cmdQueue[0];
					console.error("Response too slow in state " + this.state,
						queued ? queued.debugLabel : "no queued command",
						queued && queued.seqId !== undefined ? queued.seqId : "no seqId");
					this.resetConnection("response timeout in state " + this.state);
					break;
				case State.CONNECTING:
					if (!this.connTimeoutWarned) {
						console.warn("CONNECTING timeout");
						this.connTimeoutWarned = true;	// Do not nag in log
					}
					this.resetConnection("connecting timeout");
					break;
				case State.CONNECTED_IDLE:	// Keep connection alive by sending conn state requests every now and then
					this.sendConnectionStateRequest();
					this.connTimeoutWarned = false;
					break;
				}
			});
		}
	}

	private cancelTimer() {
		if (this.timer) {
			this.timer.cancel();	// Kill any pre-existing timeout
			this.timer = undefined;
		}
	}

	/**
	 * Connection considered "failed". Revert to DISCONNECTED and check back soon to attempt
	 * to re-connect.
	 */
	private resetConnection(reason = "unspecified") {
		debugLog("resetConnection", reason, "state", this.state,
			"channelId", this.channelId || 0,
			"queueHead", this.cmdQueue.length ? this.cmdQueue[0].debugLabel : "empty");
		// If this reset was triggered by a probe-initiated attempt, mark a probe failure
		if (this.lastProbeInitiated) {
			this.lastProbeInitiated = false;
			this.probeFailures = (this.probeFailures || 0) + 1;
			debugLog('probe: connection attempt failed, failures:', this.probeFailures);
			if (this.probeFailures >= this.probeMaxFailures) {
				this.probeFailures = 0;
				debugLog('probe: max failures exceeded');
			}
		}
		// If we were merely trying to CONNECT and got a timeout, back off rather than
		// aggressively retrying every `responseTimeout` ms. This avoids tight 5s loops
		// when the gateway is unreachable.
		if (this.state === State.CONNECTING && !this.channelId) {
			this.connectAttempts = (this.connectAttempts || 0) + 1;
			const backoff = Math.min(60000, this.connectAttempts * 5000); // linear backoff up to 60s
			debugLog('connect attempt failed, backing off', backoff, 'ms (attempts)', this.connectAttempts);
			this.setState(State.DISCONNECTED);
			this.checkStateSoon(backoff);
			return;
		}
		if (this.channelId) {
			// Send best-effort DISCONNECT to free the gateway tunnel slot immediately.
			// Fire-and-forget: don't wait for ack before reconnecting.
			this.sendDisconnectFor(this.channelId);
			this.channelId = 0;
		}
		this.setState(State.DISCONNECTED);
		if (this.socket && this.socket.enabled)
			this.checkStateSoon();
	}

	/**
	 * Change my state. Also determines if I'm considered connected.
	 */
	private setState(state: State) {
		debugLog("setState", state);
		this.state = state;
		// Set internal session flag via setter to ensure side effects are applied.
		this.connected = state >= State.CONNECTIONSTATE_REQUESTED && state <= State.TUNNELING;
		if (state === State.CONNECTED_IDLE) { // In "connected & idle" state
			if (this.pendingStartupReads)
				this.requestInitialStatuses();
			// Only send queued command now if we are still in CONNECTED_IDLE.
			// A prior call to queueCmd during requestInitialStatuses may already have
			// started sending and transitioned the state to TUNNELING, so re-check.
			if (this.cmdQueue.length && this.state === State.CONNECTED_IDLE)
				this.sendQueuedCommand();	// Do so and set checkStateSoon for that command
			// Only start the keepalive timer if we are STILL idle after the above.
			// If sendQueuedCommand transitioned us to TUNNELING, its own checkStateSoon
			// already set the response-timeout timer — don't override it with 30 s.
			if (this.state === State.CONNECTED_IDLE)
				this.checkStateSoon(30000); // send connection state request regularly
		}
	}

	private requestInitialStatuses() {
		this.pendingStartupReads = false;
		debugLog('requestInitialStatuses: dynProps count', this.dynProps.length);
		if (this.startupReadIntervalMs > 0) {
			// Space out startup reads to avoid KNX bus collision when multiple devices
			// need to respond simultaneously. Each read is queued after a delay.
			let delay = 0;
			for (const dynProp of this.dynProps) {
				try {
					const addr = dynProp.getStatusAddr();
					debugLog('requestInitialStatuses: requesting status for', formatAddr(addr), delay ? '(delay ' + delay + 'ms)' : '');
				} catch (e) {}
				if (delay === 0) {
					dynProp.requestCurrentValue();
				} else {
					const dp = dynProp;
					wait(delay).then(() => dp.requestCurrentValue());
				}
				delay += this.startupReadIntervalMs;
			}
		} else {
			for (const dynProp of this.dynProps) {
				try {
					const addr = dynProp.getStatusAddr();
					debugLog('requestInitialStatuses: requesting status for', formatAddr(addr));
				} catch (e) {
					debugLog('requestInitialStatuses: dynProp has no status addr');
				}
				dynProp.requestCurrentValue();
			}
		}
	}

	private sendQueuedCommand() {
		if (this.cmdQueue.length && this.mConnected) {
			const toSend = this.cmdQueue[0];
			debugLog("sendQueuedCommand", toSend.debugLabel || "unnamed");
			// Defensive: if this command already has a seqId it was already sent.
			if (toSend.seqId !== undefined) {
				debugLog("sendQueuedCommand: command already sent, skipping", toSend.debugLabel || "unnamed", "seq", toSend.seqId);
				return;
			}
			// Command left in queue until acked
			toSend.handler(toSend);
			this.setState(State.TUNNELING);
			this.checkStateSoon();	// In case ack doesn't arrive on time
		}
	}

	private processReply(reply: number[]) {
		if (!reply || reply.length < 6)
			return; // Ignore empty/short packets; not a valid KNXnet/IP frame
		if (reply[0] !== 0x06 || reply[1] !== 0x10)
			throw "Invalid Header";
		const command = get16bit(reply, 2);
		const expectedLength = get16bit(reply, 4);
		if (expectedLength !== reply.length)
			throw "Invalid reply expectedLength, expected " + expectedLength + ' got ' + reply.length;
		// Channel ID sits at index 7 for tunnel messages (structure header), index 6 for all others
		const pktChannel = (command === Command.TUNNEL_REQUEST || command === Command.TUNNEL_RESPONSE)
			? reply[7] : reply[6];
		const chMismatch = this.channelId && pktChannel !== this.channelId ? ' *** CHANNEL MISMATCH ***' : '';
		debugLog("Cmd from gateway", describeKnxNetIpCommand(command),
			'pktCh:', pktChannel, 'ourCh:', this.channelId || 0, chMismatch);
		// If the gateway addresses a channel that isn't ours, it's an orphaned session from a
		// previous (hot-reloaded) driver instance. Send a one-shot disconnect to free that slot.
		if (this.channelId && pktChannel !== this.channelId && pktChannel > 0) {
			if (this.orphanedChannels.indexOf(pktChannel) < 0) {
				this.orphanedChannels.push(pktChannel);
				console.warn('KNXNetIP: orphaned channel', pktChannel, '- sending disconnect to free slot (ourCh:', this.channelId, ')');
				this.sendDisconnectFor(pktChannel);
			}
		}
		switch (command) {
		case Command.CONNECTION_RESPONSE:
			this.gotConnectionResponse(reply);
			break;
		case Command.CONNECTIONSTATE_RESPONSE:
			this.gotConnectionStateResponse(reply);
			this.connTimeoutWarned = false;
			break;
		case Command.TUNNEL_RESPONSE:
			this.gotTunnelResponse(reply);
			break;
		case Command.TUNNEL_REQUEST:
			this.gotTunnelRequest(reply);
			break;
		case Command.DISCONNECT_REQUEST:
			this.gotDisconnectRequest(reply);
			break;
		case Command.DISCONNECT_RESPONSE:
			this.gotDisconnectResponse(reply);
			break;
		default:	// Log and ignore unknown commands for now
			debugLog("Unknown msg from gateway", command, describeKnxNetIpCommand(command), reply);
			break;
		}
	}

	/**
	 * Peer wants to disconnect from me. Just ack that request and consider me disconnected.
	 */
	private gotDisconnectRequest(packet: number[]) {
		const reqChannelId = packet[6];
		debugLog("gotDisconnectRequest", 'pktCh:', reqChannelId, 'ourCh:', this.channelId || 0);
		if (reqChannelId === this.channelId) 	// Handle only if my current channel ID
			this.setState(State.DISCONNECTED);

		// Always respond to not leave the remote end hanging
		const disconnectResponse = [0x06, 0x10, 0x02, 0x0a, 0x00, 0x08, reqChannelId, 0x00];
		this.socket.sendBytes(setLength(disconnectResponse));
	}

	private gotDisconnectResponse(packet: number[]) {
		const reqChannelId = packet[6];
		const error = packet[7];
		debugLog("gotDisconnectResponse", { reqChannelId, error, errorText: describeKnxNetIpError(error) });
		// If this was for our current channel, consider disconnected now
		if (reqChannelId === this.channelId) {
			debugLog("Disconnect acknowledged for channel", this.channelId);
			this.channelId = 0;
			this.disconnectAttempts = 0;
			if (this.disconnectTimer) {
				this.disconnectTimer.cancel();
				this.disconnectTimer = undefined;
			}
			this.setState(State.DISCONNECTED);
			// Remove persisted pending disconnect if present
			SimpleFile.delete(this.persistedDisconnectFile).catch(() => {});
		}
		if (this.debugLastDisconnectRequest)
			debugLog("lastDisconnectRequest", this.debugLastDisconnectRequest);
	}

	/**
	 * Got connection response. Verify no error and pick up channel ID to use subsequently.
	 * If all is well, bump my state and send a CONNECTIONSTATE_REQUEST.
	 */
	private gotConnectionResponse(packet: number[]) {
		const error = packet[7];
		if (error)
			throw "Connection response error " + error + ' (' + describeKnxNetIpError(error) + ')';
		this.verifyState(State.CONNECTING);
		const prevChannelId = this.channelId || 0;
		this.channelId = packet[6];
		debugLog("gotConnectionResponse: new channelId", this.channelId, prevChannelId ? '(was ' + prevChannelId + ')' : '');
		if (this.lastProbeInitiated) {
			debugLog('probe: connection response received');
			this.probeFailures = 0;
			this.lastProbeInitiated = false;
		}
		this.pendingStartupReads = true;
		this.sendConnectionStateRequest();
	}

	private verifyState(expectedState: State) {
		if (this.state !== expectedState)
			throw "Packet unexpected in state. Expected " + expectedState + ' had ' + this.state;
	}

	private gotConnectionStateResponse(packet: number[]) {
		const pktChannel = packet[6];
		const error = packet[7];
		debugLog("gotConnectionStateResponse", 'pktCh:', pktChannel, 'ourCh:', this.channelId || 0,
			error ? 'err:' + describeKnxNetIpError(error) : 'ok');

		// Check if this is a response to our startup validation probe
		if (this.pendingValidationChannelId && pktChannel === this.pendingValidationChannelId) {
			this.pendingValidationChannelId = undefined;
			SimpleFile.delete(this.persistedDisconnectFile).catch(() => {});
			if (!error) {
				// Channel is still alive on the gateway — adopt it
				console.log('KNXNetIP: reusing persisted channel', pktChannel, 'seqCount', this.pendingValidationSeqCount);
				this.channelId = pktChannel;
				this.seqCount = this.pendingValidationSeqCount;
				this.pendingStartupReads = true;
				this.setState(State.CONNECTED_IDLE);
			} else {
				// Channel is gone — free the slot and open a fresh one
				debugLog('Persisted channel', pktChannel, 'no longer valid:', describeKnxNetIpError(error), '- connecting fresh');
				this.sendDisconnectFor(pktChannel);
				this.checkStateSoon(0);
			}
			return;
		}

		// Normal connection-keepalive response
		if (error)
			throw "Connection state response error " + error + ' (' + describeKnxNetIpError(error) + ')';
		this.verifyState(State.CONNECTIONSTATE_REQUESTED);
		this.setState(State.CONNECTED_IDLE);
	}

	private gotTunnelResponse(packet: number[]) {
		const pktChannel = packet[7];
		const seqId = packet[8];
		const error = packet[9];
		const queue = this.cmdQueue;
		debugLog("gotTunnelResponse", 'pktCh:', pktChannel, 'ourCh:', this.channelId || 0,
			'seq:', seqId, queue.length ? queue[0].debugLabel : 'empty queue');
		if (error)
			throw "Tunnel response error " + error + ' (' + describeKnxNetIpError(error) + ')';
		this.verifyState(State.TUNNELING);
		if (queue.length && queue[0].seqId === seqId) {
			// Ack of most recently sent command - now consider done
			queue.shift();	// Remove from queue
			this.setState(State.CONNECTED_IDLE);
		}
	}

	/**
	 * Just ack the "reverse tunnel request". We don't support it, but must respond to
	 * keep peer happy.
	 */
	private gotTunnelRequest(packet: number[]) {
		const pktChannel = packet[7];
		const pktSeq = packet[8];
		debugLog("gotTunnelRequest", 'pktCh:', pktChannel, 'ourCh:', this.channelId || 0, 'seq:', pktSeq);
		this.processInboundTunnelRequest(packet);
		this.sendTunnelAck(pktChannel, pktSeq);
	}

	private processInboundTunnelRequest(packet: number[]) {
		const cemiStart = 10;
		if (packet.length <= cemiStart + 1)
			return;

		const messageCode = packet[cemiStart];
		if (messageCode !== 0x29) {
			// 0x2E = L_DATA.con (gateway confirming our frame hit the bus), 0x11 = L_DATA.req, etc.
			debugLog('gotTunnelRequest: ignoring messageCode', '0x' + messageCode.toString(16));
			return;
		}

		const addInfoLength = packet[cemiStart + 1];
		const frameStart = cemiStart + 2 + addInfoLength;
		if (packet.length <= frameStart + 7)
			return;

		const destAddr = get16bit(packet, frameStart + 4);
		const dataLength = packet[frameStart + 6];
		const apduOffset = frameStart + 7;
		if (packet.length <= apduOffset + 1)
			return;

		const apduFirst = packet[apduOffset];
		const apduSecond = packet[apduOffset + 1];
		const apci = ((apduFirst & 0x03) << 2) | ((apduSecond >> 6) & 0x03);
		debugLog("gotTunnelRequest apci", apci, formatAddr(destAddr));
		if (apci !== 1 && apci !== 2) {
			debugLog('gotTunnelRequest: ignoring apci', apci, '(not GroupValueResponse/Write) for', formatAddr(destAddr));
			return;
		}

		const dynProp = this.statusProps[destAddr];
		if (!dynProp) {
			debugLog('No status prop for address', formatAddr(destAddr));
			return;
		}

		let payload: number[];
		if (dataLength <= 1)
			payload = [apduSecond & 0x3f];
		else {
			if (packet.length <= apduOffset + dataLength)
				return;
			payload = copyBytes(packet, apduOffset + 2, apduOffset + dataLength + 1);
		}

		debugLog('Inbound status payload for', formatAddr(destAddr), payload);
		dynProp.updateCurrentValue(payload);
		debugLog('GroupValue', formatAddr(destAddr), '=', dynProp.getCurrentValue());
	}

	private sendConnectRequest() {
		const listenerPort = this.socket.listenerPort;

		const connReq = [
			0x06,0x10,
			Command.CONNECTION_REQUEST >> 8, Command.CONNECTION_REQUEST & 0xff,	// CONNECTION_REQUEST
			0x00,0x1a,	// Total length

			0x08,0x01,	// Connection HPAI length
			0,0,0,0,	// Response IP address (any)
			listenerPort >> 8, listenerPort & 0xff,

			0x08,0x01,	// Tunnelling HPAI length
			0,0,0,0,	// Response IP address (any)
			listenerPort >> 8, listenerPort & 0xff,	// Using same port fwiw (not interested in return data)
			0x04,0x04,0x02,0x00	// CRI
		];
		this.socket.sendBytes(setLength(connReq));
		this.seqCount = 0;	// New session established
		this.errCount = 0;
		// Reset connect attempts counter on active send
		this.connectAttempts = 0;
	}

	private sendConnectionStateRequest() {
		this.sendConnectionStateFor(this.channelId);
		this.setState(State.CONNECTIONSTATE_REQUESTED);
		this.checkStateSoon();
	}

	/**
	 * Send CONNECTIONSTATE_REQUEST for any channelId without changing driver state.
	 * Used to validate a persisted channel on startup before deciding to reuse or discard it.
	 */
	private sendConnectionStateFor(channelId: number) {
		if (!channelId) return;
		const listenerPort = this.socket.listenerPort;
		const connStateReq = [
			0x06, 0x10,
			Command.CONNECTIONSTATE_REQUEST >> 8, Command.CONNECTIONSTATE_REQUEST & 0xff,
			0x00, 0x10,
			channelId, 0x00,
			0x08, 0x01,
			0, 0, 0, 0,
			listenerPort >> 8, listenerPort & 0xff
		];
		this.socket.sendBytes(setLength(connStateReq));
	}

	/**
	 * Send a DISCONNECT_REQUEST.
	 */
	private sendDisconnectRequest(reconnect = true, persist = false) {
		if (!this.channelId)
			return; // nothing to do
		const listenerPort = this.socket.listenerPort;
		debugLog("sendDisconnectRequest attempt", this.disconnectAttempts + 1, "for channel", this.channelId);
		const disconnReq = [ 
			0x06, 0x10,
			Command.DISCONNECT_REQUEST >> 8, Command.DISCONNECT_REQUEST & 0xff,
			0x00, 0x10,	// Total length

			this.channelId, 0x00,	// Connection HPAI
			0x08,	// HPAI length
			0x01,	// Host Protocol Code 0x01 -> IPV4_UDP, 0x02 -> IPV6_TCP */
			0, 0, 0, 0,	// Response IP address (any) 
			listenerPort >> 8, listenerPort & 0xff
		];
		this.socket.sendBytes(setLength(disconnReq)); 
		// Record that we asked to disconnect
		this.debugLastDisconnectRequest = { when: Date.now(), reconnect };
		// Persist the pending disconnect so other instances can try to clean up
		if (persist) {
			SimpleFile.write(this.persistedDisconnectFile, JSON.stringify({ channelId: this.channelId, when: this.debugLastDisconnectRequest.when, reconnect })).catch(() => {});
		}
		// Track attempts and schedule retry/backoff if no response
		this.disconnectAttempts = (this.disconnectAttempts || 0) + 1;
		if (this.disconnectTimer)
			this.disconnectTimer.cancel();
		const timer = wait(this.responseTimeout);
		this.disconnectTimer = timer;
		timer.then(() => {
			this.disconnectTimer = undefined;
			if (!this.channelId) {
				// Already cleared by response handler
				this.disconnectAttempts = 0;
				return;
			}
			if (this.disconnectAttempts < this.MAX_DISCONNECT_ATTEMPTS) {
				debugLog("Disconnect not acknowledged, retrying", this.disconnectAttempts + 1);
				this.sendDisconnectRequest(reconnect);
			} else {
				debugLog("Disconnect not acknowledged after max attempts, clearing channel and moving to DISCONNECTED",
					"channel", this.channelId);
				// Give up trying to get an ack and clear local state to avoid permanent blocking.
				this.channelId = 0;
				this.disconnectAttempts = 0;
				this.setState(State.DISCONNECTED);
			}
		});
		// If reconnect requested, keep state machine ticking
		if (reconnect)
			this.checkStateSoon();
	}

	/**
	 * Send a best-effort DISCONNECT_REQUEST for an arbitrary channelId without
	 * modifying this.channelId or driver state. Used to release orphaned gateway slots.
	 */
	private sendDisconnectFor(channelId: number) {
		if (!channelId) return;
		const listenerPort = this.socket.listenerPort;
		const disconnReq = [
			0x06, 0x10,
			Command.DISCONNECT_REQUEST >> 8, Command.DISCONNECT_REQUEST & 0xff,
			0x00, 0x10,
			channelId, 0x00,
			0x08, 0x01,
			0, 0, 0, 0,
			listenerPort >> 8, listenerPort & 0xff
		];
		try {
			this.socket.sendBytes(setLength(disconnReq));
			debugLog('sendDisconnectFor channel', channelId);
		} catch (e) {
			debugLog('sendDisconnectFor: error sending for channel', channelId, e);
		}
	}

	/**
	 * Turn item at address addr1/addr2/addr3 (e.g., 4/0/0) on or off
	 */
	@callable("Send on/off command specified addr1/addr2/addr3")
	public setOnOff(
		addr1: number, addr2: number, addr3: number,
		on: boolean
	) {
		const cmd: OnOffCmd = {
			handler: this.sendOnOff.bind(this),
			destAddr: calcAddr(addr1, addr2, addr3),
			debugLabel: 'setOnOff ' + addr1 + '/' + addr2 + '/' + addr3,
			on: on
		};
		this.queueCmd(cmd);
	}

	/**
	 * Turn item at address addr1/addr2/addr3 (e.g., 4/0/0) on or off
	 */
	@callable("Recall scene for addr1/addr2/addr3")
	public setScene(
		addr1: number, addr2: number, addr3: number,
		@parameter("Scene 0…63 to recall (may be off-by-1)") scene: number
	) {
		scene = Math.min(Math.max(0, scene), 63);
		const cmd: ValueCmd = {
			handler: this.sendGroupValueWrite.bind(this),
			destAddr: calcAddr(addr1, addr2, addr3),
			debugLabel: 'setScene ' + addr1 + '/' + addr2 + '/' + addr3,
			payload: [scene]
		};
		this.queueCmd(cmd);
	}

	public requestGroupRead(addr: number) {
		debugLog('requestGroupRead', formatAddr(addr));
		const cmd: ReadCmd = {
			handler: this.sendGroupRead.bind(this),
			destAddr: addr,
			debugLabel: 'GroupValueRead ' + formatAddr(addr),
			isRead: true
		};
		this.queueCmd(cmd);
	}

	@callable("Send a KNX GroupValueRead to addr1/addr2/addr3 for debugging")
	public sendGroupValueRead(
		addr1: number, addr2: number, addr3: number
	) {
		const addr = calcAddr(addr1, addr2, addr3);
		this.requestGroupRead(addr);
	}

	private sendGroupRead(cmd: ReadCmd) {
		debugLog('sendGroupRead', formatAddr(cmd.destAddr));
		cmd.seqId = this.seqCount;
		this.sendTunReq([
			0,0,0,0,0,0,0,0,0,0,

			0x11,
			0x00,
			0xbc,
			0xe0,
			0x00,
			0x00,
			cmd.destAddr >> 8, cmd.destAddr & 0xff,
			0x01,
			0x00,
			0x00
		]);
	}

	/**
	 * Enfore all my dynamic property values by sending them anew. This is useful if
	 * some other external actor have messed with those values, to get them
	 * back to where I believe they are.
	 *
	 * CAUTION: I send ALL values. If there's a very large number of dynamic properties,
	 * you may need to allow for a larger send queue (see queueCmd below).
	 */
	@callable("Send all my dynamic property values")
	public enforceProps() {
		if (this.connected) {
			for (const dynProp of this.dynProps)
				dynProp.sendWantedValue();
		}
	}

	/**
	 * Enqueue a command to be sent ASAP (awaiting connection, pending acks, etc).
	 */
	queueCmd(cmd: QueuedCommand) {
		if ((cmd as ReadCmd).isRead) {
			// Deduplicate pending reads for the same destination to avoid repeated
			// GroupValueRead flood during startup.
			const dest = (cmd as AddressedCmd).destAddr;
			for (let i = 0; i < this.cmdQueue.length; ++i) {
				const existing = this.cmdQueue[i] as AddressedCmd;
				if (existing && (existing as ReadCmd).isRead && existing.destAddr === dest) {
					debugLog('Duplicate read already queued, skipping', formatAddr(dest));
					return;
				}
			}
			this.cmdQueue.push(cmd);
		} else {
			let insertAt = this.cmdQueue.length;
			while (insertAt > 0 && (this.cmdQueue[insertAt - 1] as ReadCmd).isRead)
				--insertAt;
			this.cmdQueue.splice(insertAt, 0, cmd);
		}
		if (this.cmdQueue.length > 50) {
			debugLog("Excessive command buffering - discarding old");
			this.cmdQueue.shift();
		}
		if (this.state === State.CONNECTED_IDLE)
			this.sendQueuedCommand();	// I'm currently idle, so can send right away
		// Do not auto-connect on queued commands; the tunnel should be established
		// at driver startup when `socket.enabled` or via probe. This avoids unexpected
		// connections when callers merely enqueue reads/writes.
		// Else will do so once state changes back to idle
	}

	/**
	 * Turn item at address addr1/addr2/addr3 (e.g., 4/0/0) on or off
	 */
	sendOnOff(cmd: OnOffCmd) {
		cmd.seqId = this.seqCount;
		this.sendTunReq([
			0,0,0,0,0,0,0,0,0,0,	// Header backpatched here in sendTunReq

			// cEMI frame
			0x11, /* message code, 11: Data Service transmitting */
			0x00, /* add. info length (0 bytes) */
			0xbc, /* control byte */
			0xe0, /* DRL byte */
			0x00, /* hi-byte source individual address */
			0x00, /* lo-byte source (replace throw IP-Gateway) */
			cmd.destAddr >> 8, cmd.destAddr & 0xff,
			0x01, /* number of data bytes following */
			0x00, /* tpdu */
			cmd.on ? 0x81 : 0x80 /* 81: switch on, 80: off */
		]);
	}

	/**
	 * Send any non-boolean KNX GroupValueWrite payload.
	 */
	sendGroupValueWrite(cmd: ValueCmd) {
		cmd.seqId = this.seqCount;
		const payload = cmd.payload;
		this.sendTunReq([
			0,0,0,0,0,0,0,0,0,0,	// Header backpatched here in sendTunReq

			// cEMI frame
			0x11, /* message code, 11: Data Service transmitting */
			0x00, /* add. info length (0 bytes) */
			0xbc, /* control byte */
			0xe0, /* DRL byte */
			0x00, /* hi-byte source individual address */
			0x00, /* lo-byte source (replace throw IP-Gateway) */
			cmd.destAddr >> 8, cmd.destAddr & 0xff,
			payload.length + 0x01, /* number of data bytes following */
			0x00, /* tpdu */
			0x80,
			...payload
		]);
	}

	/**
	 * Send a "tunnel request", after defining the fixed headers and length fields
	 */
	private sendTunReq(tunReq: number[]) {
		// Do not send tunnelling requests if socket is disabled or no channel
		if (!this.socket.enabled) {
			debugLog('socket disabled; dropping tunnel request');
			return;
		}
		if (!this.channelId) {
			debugLog('no channel established; dropping tunnel request');
			return;
		}
		tunReq[0] = 0x06;	// Tunneling header
		tunReq[1] = 0x10;
		tunReq[2] = Command.TUNNEL_REQUEST >> 8;
		tunReq[3] = Command.TUNNEL_REQUEST & 0xff;

		// Connection Header
		tunReq[6] = 4;		// Structure length
		tunReq[7] = this.channelId;
		tunReq[8] = this.seqCount;
		tunReq[9] = 0;			// Reserved

		debugLog('sendTunReq channel', this.channelId, 'seq', this.seqCount);
		this.socket.sendBytes(setLength(tunReq));
		this.seqCount = ((this.seqCount + 1) & 0xff);	// Incremented ready for next
	}

	/* TUNNEL_RESPONSE, sent in response to a TUNNELLING_REQUEST from gateway */
	private sendTunnelAck(channelId: number, seqCount: number) {
		const tunAck = [
			/* Header (6 Bytes) */
			0x06, /* Header Length */
			0x10, /* KNXnet version (1.0) */
			Command.TUNNEL_RESPONSE >> 8, Command.TUNNEL_RESPONSE & 0xff,
			0x00, /* hi-byte total length */
			0x0A, /* lo-byte total lengt 10 bytes */

			/* ConnectionHeader (4 Bytes) */
			0x04, /* 04 - Structure length */
			channelId, /* given channel id */
			seqCount, /* 01 the sequence counter from 7th: receive a TUNNELLING_REQUEST */
			0x00 /* 00 our error code */
		];
		this.socket.sendBytes(setLength(tunAck));
	}
}

/**
 * Dynamic properties that can be enforced through enforceProps.
 */
interface DynProp {
	sendWantedValue(): void;
	requestCurrentValue(): void;
	getStatusAddr(): number | undefined;
	updateCurrentValue(rawValue: number[]): void;
	getCurrentValue(): number | boolean;
}

/**
 * An analog property, with a normalized value 0...1, sent as a 0...255 value.
 */
class AnalogProp implements DynProp {
	private wantedValue = 0;	// Most recently set value
	private currValue: number;	// Sent value (may lag if prop changed frequently)
	private delayedSendTimer: CancelablePromise<void>;
	private readonly cmdAddr: number;
	private readonly statusAddr?: number;
	private readonly propName: string;
	private readonly valueCodec: AnalogValueCodec;

	constructor(private owner: KNXNetIP_Bidirectional, private analog: IAnalog) {
		this.propName = 'analog_' + analog.name;
		this.cmdAddr = calcAddr(analog.addr[0], analog.addr[1], analog.addr[2]);
		this.statusAddr = calcOptionalAddr(analog.statusAddr);
		this.valueCodec = getAnalogValueCodec(analog.type);
		owner.property<number>(
			this.propName,
			{
				type: "Number",
				description: analog.description || this.valueCodec.description,
				min: this.valueCodec.min,
				max: this.valueCodec.max
			},
			setValue => {	// Function that handles both SETting and GETting a value
				if (setValue !== undefined) {	// Is SET call
					setValue = clamp(setValue, this.valueCodec.min, this.valueCodec.max);
					this.wantedValue = setValue;
					if (this.currValue !== setValue) {	// This is news - send it soon
						if (!this.delayedSendTimer) {
							// Debounce send requests to not overflow send queue
							this.delayedSendTimer = wait(150); // An arbitrary time
							this.delayedSendTimer.then(() => {
								this.delayedSendTimer = undefined;	// Now taken
								this.sendWantedValue();
								this.currValue = this.wantedValue;	// Consider applied now
							});
						}
					}
				}
				return this.wantedValue;	// Value from GET (also on SET, which is fine)
			}
		)
	}

	requestCurrentValue() {
		this.owner.requestGroupRead(this.getStatusAddr());
	}

	getStatusAddr(): number {
		return this.statusAddr !== undefined ? this.statusAddr : this.cmdAddr;
	}

	updateCurrentValue(rawValue: number[]) {
		if (rawValue.length !== this.valueCodec.byteLength)
			return;
		const decoded = this.valueCodec.decode(rawValue);
		this.wantedValue = decoded;
		this.currValue = decoded;
		if (this.delayedSendTimer) {
			this.delayedSendTimer.cancel();
			this.delayedSendTimer = undefined;
		}
		this.owner.changed(this.propName);
	}

	getCurrentValue(): number { return this.wantedValue; }

	/**
	 * Send my wanted value to KNX bus.
	 */
	sendWantedValue() {
		const owner = this.owner;
		const cmd: ValueCmd = {
			handler: owner.sendGroupValueWrite.bind(owner),
			destAddr: this.cmdAddr,
			debugLabel: this.propName,
			payload: this.valueCodec.encode(this.wantedValue)
		};
		owner.queueCmd(cmd);
	}
}
/**
 * An analog property, with a normalized value 0...1, sent as a 0...100 percentage.
 */
class DigitalProp implements DynProp {
	private wantedValue = false;	// Most recently set value
	private readonly cmdAddr: number;
	private readonly statusAddr?: number;
	private readonly propName: string;

	constructor(private owner: KNXNetIP_Bidirectional, private digital: IDigital) {
		this.propName = 'digital_' + digital.name;
		this.cmdAddr = calcAddr(digital.addr[0], digital.addr[1], digital.addr[2]);
		this.statusAddr = calcOptionalAddr(digital.statusAddr);
		owner.property<boolean>(
			this.propName,
			{
				type: "Boolean",
				description: digital.description || "An digital (on/off) channel value"
			},
			setValue => {	// Function that handles both SETting and GETting a value
				if (setValue !== undefined) {	// Is SET call
					this.wantedValue = setValue;
					this.sendWantedValue();
				}
				return this.wantedValue;	// Value from GET (also on SET, which is fine)
			}
		)
	}

	requestCurrentValue() {
		this.owner.requestGroupRead(this.getStatusAddr());
	}

	getStatusAddr(): number {
		return this.statusAddr !== undefined ? this.statusAddr : this.cmdAddr;
	}

	updateCurrentValue(rawValue: number[]) {
		this.wantedValue = !!((rawValue[0] || 0) & 0x01);
		this.owner.changed(this.propName);
	}

	getCurrentValue(): boolean { return this.wantedValue; }

	/**
	 * Send my wanted value to KNX bus.
	 */
	sendWantedValue() {
		const owner = this.owner;
		const cmd: OnOffCmd = {
			handler: owner.sendOnOff.bind(owner),
			destAddr: this.cmdAddr,
			debugLabel: this.propName,
			on: this.wantedValue
		};
		owner.queueCmd(cmd);
	}
}

/**
 * Scene property: recallable scene number (0..maxScene)
 */
class SceneProp implements DynProp {
	private wantedValue = 0;
	private readonly cmdAddr: number;
	private readonly statusAddr?: number;
	private readonly propName: string;
	private readonly maxScene: number;

	constructor(private owner: KNXNetIP_Bidirectional, private scene: IScene) {
		this.propName = 'scene_' + scene.name;
		this.cmdAddr = calcAddr(scene.addr[0], scene.addr[1], scene.addr[2]);
		this.statusAddr = calcOptionalAddr(scene.statusAddr);
		this.maxScene = scene.maxScene !== undefined ? Math.max(1, scene.maxScene) : 63;

		owner.property<number>(
			this.propName,
			{
				type: "Number",
				description: scene.description || "Scene recall property",
				min: 0,
				max: this.maxScene
			},
			setValue => {
				if (setValue !== undefined) {
					const v = Math.min(Math.max(0, Math.floor(setValue)), this.maxScene);
					this.wantedValue = v;
					// Send scene recall as single byte payload
					const cmd: ValueCmd = {
						handler: this.owner.sendGroupValueWrite.bind(this.owner),
						destAddr: this.cmdAddr,
						debugLabel: this.propName,
						payload: [v]
					};
					this.owner.queueCmd(cmd);
				}
				return this.wantedValue;
			}
		);
	}

	requestCurrentValue() {
		if (this.statusAddr === undefined)
			return;
		this.owner.requestGroupRead(this.getStatusAddr());
	}

	getStatusAddr(): number {
		return this.statusAddr !== undefined ? this.statusAddr : this.cmdAddr;
	}

	updateCurrentValue(rawValue: number[]) {
		if (!rawValue || rawValue.length < 1)
			return;
		this.wantedValue = rawValue[0] & 0x3f; // scene number in low 6 bits typically
		this.owner.changed(this.propName);
	}

	getCurrentValue(): number { return this.wantedValue; }

	sendWantedValue() {
		const cmd: ValueCmd = {
			handler: this.owner.sendGroupValueWrite.bind(this.owner),
			destAddr: this.cmdAddr,
			debugLabel: this.propName,
			payload: [this.wantedValue]
		};
		this.owner.queueCmd(cmd);
	}
}

/**
 * Turn addr1/addr2/addr3 into 16 bit value "group address" using the proper formula
 *
 */
function calcAddr(addr1: number, addr2: number, addr3: number) {
	addr1 = Math.min(Math.max(0, addr1), 31);
	addr2 = Math.min(Math.max(0, addr2), 7);
	addr3 = Math.min(Math.max(0, addr3), 255);

	return addr1 * 2048 + addr2 * 256 + addr3;
}

function calcOptionalAddr(addr?: number[]) {
	if (!addr || addr.length !== 3)
		return undefined;
	return calcAddr(addr[0], addr[1], addr[2]);
}

function describeKnxNetIpError(error: number) {
	switch (error) {
	case 0x00: return 'No error';
	case 0x21: return 'Host protocol type not supported';
	case 0x22: return 'Version not supported';
	case 0x23: return 'Sequence number out of order';
	case 0x24: return 'No more connections';
	case 0x25: return 'No more unique connections';
	case 0x26: return 'Data connection error';
	case 0x27: return 'KNX connection error';
	case 0x28: return 'Tunnelling layer not supported';
	case 0x29: return 'Connection type not supported';
	case 0x2d: return 'Connection option not supported';
	case 0x2e: return 'No more tunnelling addresses';
	case 0x2f: return 'Connection request error';
	default: return 'Unknown KNXnet/IP error';
	}
}

function describeKnxNetIpCommand(command: number) {
	switch (command) {
	case Command.SEARCH_REQUEST: return 'SEARCH_REQUEST';
	case Command.SEARCH_RESPONSE: return 'SEARCH_RESPONSE';
	case Command.DESCRIPTION_REQUEST: return 'DESCRIPTION_REQUEST';
	case Command.DESCRIPTION_RESPONSE: return 'DESCRIPTION_RESPONSE';
	case Command.CONNECTION_REQUEST: return 'CONNECTION_REQUEST';
	case Command.CONNECTION_RESPONSE: return 'CONNECTION_RESPONSE';
	case Command.CONNECTIONSTATE_REQUEST: return 'CONNECTIONSTATE_REQUEST';
	case Command.CONNECTIONSTATE_RESPONSE: return 'CONNECTIONSTATE_RESPONSE';
	case Command.DISCONNECT_REQUEST: return 'DISCONNECT_REQUEST';
	case Command.DISCONNECT_RESPONSE: return 'DISCONNECT_RESPONSE';
	case Command.TUNNEL_REQUEST: return 'TUNNEL_REQUEST';
	case Command.TUNNEL_RESPONSE: return 'TUNNEL_RESPONSE';
	case Command.DEVICE_CONFIGURATION_REQUEST: return 'DEVICE_CONFIGURATION_REQUEST';
	case Command.DEVICE_CONFIGURATION_ACK: return 'DEVICE_CONFIGURATION_ACK';
	case Command.ROUTING_INDICATION: return 'ROUTING_INDICATION';
	default: return 'UNKNOWN_COMMAND';
	}
}

function copyBytes(packet: ArrayLike<number>, start: number, end: number) {
	const result: number[] = [];
	for (let ix = start; ix < end; ++ix)
		result.push(packet[ix]);
	return result;
}

function formatAddr(addr: number) {
	const addr1 = Math.floor(addr / 2048);
	const addr2 = Math.floor((addr % 2048) / 256);
	const addr3 = addr % 256;
	return addr1 + '/' + addr2 + '/' + addr3;
}

interface AnalogValueCodec {
	byteLength: number;
	min: number;
	max: number;
	description: string;
	encode(value: number): number[];
	decode(rawValue: number[]): number;
}

function isSupportedAnalogType(type?: string) {
	const mainType = getMainType(type);
	return mainType === undefined || mainType === 5 || mainType === 6 || mainType === 7 ||
		mainType === 8 || mainType === 9 || mainType === 12 || mainType === 13 || mainType === 14;
}

function getAnalogValueCodec(type?: string): AnalogValueCodec {
	const mainType = getMainType(type);
	switch (mainType) {
	case undefined:
		return {
			byteLength: 1,
			min: 0,
			max: 1,
			description: "An analog channel value (normalized)",
			encode: value => [Math.round(clamp(value, 0, 1) * 255)],
			decode: rawValue => clamp(firstByte(rawValue), 0, 255) / 255
		};
	case 5:
		if (type === "5.001") {
			return {
				byteLength: 1,
				min: 0,
				max: 1,
				description: "An analog channel value (normalized)",
				encode: value => [Math.round(clamp(value, 0, 1) * 255)],
				decode: rawValue => clamp(firstByte(rawValue), 0, 255) / 255
			};
		}
		if (type === "5.003") {
			return {
				byteLength: 1,
				min: 0,
				max: 360,
				description: "An angle value in degrees",
				encode: value => [Math.round(clamp(value, 0, 360) * 255 / 360)],
				decode: rawValue => clamp(firstByte(rawValue), 0, 255) * 360 / 255
			};
		}
		return {
			byteLength: 1,
			min: 0,
			max: 255,
			description: "An unsigned 1-byte analog KNX value",
			encode: value => [Math.round(clamp(value, 0, 255))],
			decode: rawValue => clamp(firstByte(rawValue), 0, 255)
		};
	case 6:
		return {
			byteLength: 1,
			min: -128,
			max: 127,
			description: "A signed 1-byte analog KNX value",
			encode: value => [toUint8(Math.round(clamp(value, -128, 127)))],
			decode: rawValue => toInt8(firstByte(rawValue))
		};
	case 7:
		return makeUnsignedIntCodec(2, "An unsigned 2-byte KNX value");
	case 8:
		return makeSignedIntCodec(2, "A signed 2-byte KNX value");
	case 9:
		return {
			byteLength: 2,
			min: -670760.96,
			max: 670760.96,
			description: "A 2-byte KNX floating-point value",
			encode: value => encodeKnxFloat16(clamp(value, -670760.96, 670760.96)),
			decode: rawValue => decodeKnxFloat16(rawValue)
		};
	case 12:
		return makeUnsignedIntCodec(4, "An unsigned 4-byte KNX value");
	case 13:
		return makeSignedIntCodec(4, "A signed 4-byte KNX value");
	case 14:
		return {
			byteLength: 4,
			min: -3.40282347e+38,
			max: 3.40282347e+38,
			description: "A 4-byte KNX floating-point value",
			encode: value => encodeFloat32(clamp(value, -3.40282347e+38, 3.40282347e+38)),
			decode: rawValue => decodeFloat32(rawValue)
		};
	default:
		return {
			byteLength: 1,
			min: 0,
			max: 255,
			description: "An unsigned 1-byte analog KNX value",
			encode: value => [Math.round(clamp(value, 0, 255))],
			decode: rawValue => clamp(firstByte(rawValue), 0, 255)
		};
	}
}

function getMainType(type?: string) {
	if (!type)
		return undefined;
	return Number(type.split('.')[0]);
}

function makeUnsignedIntCodec(byteLength: number, description: string): AnalogValueCodec {
	const bits = byteLength * 8;
	const max = Math.pow(2, bits) - 1;
	return {
		byteLength: byteLength,
		min: 0,
		max: max,
		description: description,
		encode: value => encodeUnsignedBytes(Math.round(clamp(value, 0, max)), byteLength),
		decode: rawValue => decodeUnsignedBytes(rawValue, byteLength)
	};
}

function makeSignedIntCodec(byteLength: number, description: string): AnalogValueCodec {
	const bits = byteLength * 8;
	const min = -Math.pow(2, bits - 1);
	const max = Math.pow(2, bits - 1) - 1;
	return {
		byteLength: byteLength,
		min: min,
		max: max,
		description: description,
		encode: value => encodeSignedBytes(Math.round(clamp(value, min, max)), byteLength),
		decode: rawValue => decodeSignedBytes(rawValue, byteLength)
	};
}

function firstByte(rawValue: number[]) {
	return rawValue.length ? rawValue[0] : 0;
}

function encodeUnsignedBytes(value: number, byteLength: number) {
	const result: number[] = [];
	for (let byteIx = byteLength - 1; byteIx >= 0; --byteIx) {
		result[byteIx] = value & 0xff;
		value = Math.floor(value / 256);
	}
	return result;
}

function decodeUnsignedBytes(rawValue: number[], byteLength: number) {
	let result = 0;
	for (let ix = 0; ix < byteLength; ++ix)
		result = result * 256 + (rawValue[ix] || 0);
	return result;
}

function encodeSignedBytes(value: number, byteLength: number) {
	const bits = byteLength * 8;
	if (value < 0)
		value += Math.pow(2, bits);
	return encodeUnsignedBytes(value, byteLength);
}

function decodeSignedBytes(rawValue: number[], byteLength: number) {
	const bits = byteLength * 8;
	const unsignedValue = decodeUnsignedBytes(rawValue, byteLength);
	const signBit = Math.pow(2, bits - 1);
	return unsignedValue >= signBit ? unsignedValue - Math.pow(2, bits) : unsignedValue;
}

function encodeKnxFloat16(value: number) {
	if (!value)
		return [0, 0];
	const sign = value < 0 ? 1 : 0;
	let mantissa = Math.round(Math.abs(value) * 100);
	let exponent = 0;
	while (mantissa > 2047 && exponent < 15) {
		mantissa = Math.round(mantissa / 2);
		++exponent;
	}
	if (sign)
		mantissa = (2048 - mantissa) & 0x07ff;
	const encoded = (sign << 15) | (exponent << 11) | mantissa;
	return [encoded >> 8, encoded & 0xff];
}

function decodeKnxFloat16(rawValue: number[]) {
	const data = decodeUnsignedBytes(rawValue, 2);
	const exponent = (data >> 11) & 0x0f;
	let mantissa = data & 0x07ff;
	if (mantissa & 0x0400)
		mantissa -= 0x0800;
	return 0.01 * mantissa * Math.pow(2, exponent);
}

function encodeFloat32(value: number) {
	const buffer = new ArrayBuffer(4);
	const view = new DataView(buffer);
	view.setFloat32(0, value, false);
	return [view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)];
}

function decodeFloat32(rawValue: number[]) {
	const buffer = new ArrayBuffer(4);
	const view = new DataView(buffer);
	for (let ix = 0; ix < 4; ++ix)
		view.setUint8(ix, rawValue[ix] || 0);
	return view.getFloat32(0, false);
}

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function toUint8(value: number) {
	return value & 0xff;
}

function toInt8(value: number) {
	return value > 127 ? value - 256 : value;
}

/**
 * Set the total length in pkg as byte at offset 4 and 5.
 */

 function setLength(pkg: number[]) {
	const length = pkg.length;
	pkg[4] = length >> 8;
	pkg[5] = length & 0xff;
	debugLog("About to send cmd", pkg[2], pkg[3]);
	return pkg;
}

/**
 * Return 16 bit data from high/low order bytes beginning at offs into rawData.
 */
function get16bit(rawData: number[], offs: number) {
	return (rawData[offs] << 8) + rawData[offs+1];
}

/**
Internal "verbose" log function, making my logging easy to turn on/off in one place.
*/
function debugLog(...args: any[]) {
	if (!debugLoggingEnabled)
		return;
	const parts: string[] = [];
	for (let i = 0; i < args.length; ++i)
		parts.push(String(args[i]));
	console.log(parts.join(' '));
}
