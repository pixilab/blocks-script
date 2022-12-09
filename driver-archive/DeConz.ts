/*	Driver for the Dresden Electronicx DeConz zigbee gateway, based on its REST API
	https://github.com/dresden-elektronik/deconz-rest-plugin

	Provides functions for controlling lights and groups individually
	Publishes a number of dynamic properties per light group, allowing buttons/sliders
	to be bound to those.

	IMPORTANT: To use this driver, you must first add it to Blocks and configure it so
	its "Connected" status turns green. Then, in the PhosCon web app, under Gateway,
	Advanced, click the button to authorize the control. Successful authorization is
	indicated by my "authorized" property.

	Copyright (c) 2019 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */


import {NetworkTCP} from "system/Network";
import {SimpleFile} from "system/SimpleFile";
import {SimpleHTTP} from "system/SimpleHTTP";
import {Driver} from "system_lib/Driver";
import * as Meta from "system_lib/Metadata";
import {callable, driver, parameter} from "system_lib/Metadata";

@driver('NetworkTCP', { port: 8080 })
export class DeConz extends Driver<NetworkTCP> {
	private readonly configFileName: string
	private readonly baseUrl: string;	// Base URL for making REST calls
	private keyedBasedUrl?: string;		// Once obtained
	private loggedAuthFail: boolean;	// To not nag

	private mConnected = false;	// Until I know
	private mAuthorized = false;
	private alive: boolean;		// Set to false if socket dies (then so do I)
	private config?: Config;	// Once obtained
	private poller: CancelablePromise<void>;	// Polling timer, if any
	private deferredSender: CancelablePromise<void>;	// Send commands soon
	private cmdInFlight: boolean;	// Set while sending a command and not yet received ack

	private devices: NamedItems<Device>;
	private groups: NamedItems<Group>;

	private whenSentlast = new Date();	// When command was last sent, to not send too often
	private readonly kMinTimeBetweenCommands = 160;	// Minimum mS time between back-to-back commands

	// Commands ready to send, keyed by target device/group name
	private pendingCommands: Dictionary<DeviceState> = {};

	public constructor(private socket: NetworkTCP) {
		super(socket);
		// I explicitly do NOT auto-connect since I use discrete HTTP requests
		this.configFileName = 'DeConzDriver_' + socket.name;
		this.alive = true;
		this.baseUrl = 'http://' + socket.address + ':' + socket.port + '/api';

		// read auth code from file, containing a Config object
		SimpleFile.read(this.configFileName).then(rawData => {
			var config: Config = JSON.parse(rawData);
			if (config && config.authCode)	// Data seems good
				this.config = config;
		}); // Else config will be obtained by 1st poll

		if (socket.enabled) {
			socket.subscribe('finish', sender => {
				this.alive = false;
				if (this.poller)	// Shut down any poll in flight
					this.poller.cancel();
				if (this.deferredSender)	// Same for deferred transmission
					this.deferredSender.cancel();
			});
			this.requestPoll(100);
		}
	}

	/*	Indicates that the DeCONZ gateway has responded favorably to request.
		If not, the driver will attempt to call the top level /api endpoint
		every now and then until it succeeds.
	 */
	@Meta.property("Authorized to control", true)
	public get authorized(): boolean {
		return this.mAuthorized;
	}
	public set authorized(value: boolean) {
		if (this.mAuthorized && !value)
			console.warn("Became unauthorized");
		this.mAuthorized = value;
		this.checkReadyToSend();
	}

	@Meta.property("Connected successfully to device", true)
	public get connected(): boolean {
		return this.mConnected;
	}
	public set connected(value: boolean) {
		this.mConnected = value;
		this.checkReadyToSend();
	}

	@callable("Refresh device and group info")
	public refresh() {
		if (this.connected && this.authorized) {
			this.getDevices();
			this.getGroups();
		}
	}

	@callable("Turn target on or off")
	public setOn(
		@parameter("device or group name") target: string,
		@parameter("state (false to turn off)") on: boolean
	) {
		this.sendCommandSoon(target).on = on;
	}

	@callable("Set/Fade brightness and (optionally) CIE color")
	public setBrightness(
		@parameter("device or group name") target: string,
		@parameter("level 0...1") brightness: number,
		@parameter("transition, in seconds", true) time?: number,
		@parameter("0...1", true) cieX?: number,
		@parameter("0...1", true) cieY?: number
	) {
		const state = this.sendCommandSoon(target);
		state.on = brightness > 0;
		state.bri = Math.floor(clip(brightness) * 255);
		this.setTime(state, time, 0);
		if (cieX !== undefined)
			state.xy = [clip(cieX), clip(cieY)];
	}

	@callable("Set the color temperature")
	public setColorTemperature(
		@parameter("device or group name") target: string,
		@parameter("2000...6500") kelvin: number,
		@parameter("transition, in seconds", true) time?: number,
	) {
		const kMin = 2000;
		const kMax = 6500;
		var kOutMin = 153;	// These seem to map backwards to input range
		var kOutMax = 500;
		// Clip to allowed range
		kelvin = Math.max(kMin, Math.min(kMax, kelvin));
		var state = this.sendCommandSoon(target);
		// I inverse the normalized value to account for the backward mapping
		var normalized = 1 - (kelvin - kMin) / (kMax - kMin);
		state.ct = Math.floor(normalized * (kOutMax - kOutMin) + kOutMin);
		this.setTime(state, time, 0.1);
	}

	@callable("Set/Fade the Hue and Saturation")
	public setHueSaturation(
		@parameter("device or group name") target: string,
		@parameter("0...1") hue: number,
		@parameter("0...1") saturation: number,
		@parameter("transition, in seconds", true) time?: number
	) {
		this.setHueState(target, hue);
		const state = this.setSaturationState(target, saturation);
		this.setTime(state, time, 0.1);
	}

	private setHueState(target: string, normalizedHue: number): DeviceState {
		const state = this.sendCommandSoon(target);
		state.hue = Math.floor(clip(normalizedHue) * 65535);
		return state;
	}

	private setSaturationState(target: string, normalizedSat: number): DeviceState {
		const state = this.sendCommandSoon(target);
		state.sat = Math.floor(clip(normalizedSat) * 255);
		return state;
	}

	/**
	 * Set transitiontime in state to specified time (if any), else to default time.
	 */
	private setTime(onState: DeviceState, timeInSeconds?: number, defaultTimeInSeconds = 0) {
		if (timeInSeconds !== undefined)
			onState.transitiontime = Math.floor(Math.max(timeInSeconds, 0) * 10);
		else
			onState.transitiontime = Math.floor(defaultTimeInSeconds * 10);
	}

	private requestPoll(howSoon: number) {
		if (!this.poller && this.alive) {
			this.poller = wait(howSoon);
			this.poller.then(() => {
				this.poller = undefined;	// Now taken
				if (this.config)
					this.regularPoll();
				else // Need to obtain config object first
					this.authenticationPoll();
				this.requestPoll(3000);	// Set up to poll again soon
			});
		}
	}

	/**
	 * Attempt to authenticate with the device, thus obtaining the autCode for
	 * my config.
	 */
	private authenticationPoll() {
		SimpleHTTP.newRequest(this.baseUrl).post(
			'{"devicetype": "pixilab-blocks" }'
		).then(response=> {
			this.connected = true;
			if (response.status === 200) {
				var authResponse: AuthResponse[] = JSON.parse(response.data);
				if (authResponse && authResponse.length) {
					if (authResponse[0].success)
						this.gotAuthCode(authResponse[0].success.username);
				}
			} else {
				this.authorized = false;
				if (response.status === 403) {
					if (!this.loggedAuthFail) {
						console.error("In Phoscon app, click Settings, Gateway, Advanced, Authenticate app")
						this.loggedAuthFail = true;	// Log that error only once per session
					}
				}
			}
		}).catch(error => this.requestFailed(error));
	}


	/**
	 * Received authorization code - set as my config, consider me authorized
	 * and persist config to file.
	 */
	private gotAuthCode(authCode: string) {
		this.config = {authCode: authCode};
		this.keyedBasedUrl = undefined;	// Must be recomputed
		SimpleFile.write(this.configFileName, JSON.stringify(this.config));
		this.authorized = true;
	}

	/**
	 * Do some polling of the gateway to see if it's still there.
	 */
	private regularPoll() {
		if (!this.devices)
			this.getDevices();
		else if (!this.groups)
			this.getGroups();
		this.checkReadyToSend();
	}

	/*	See if I'm all up and running. If so, send any pending commands that may have arrived
		during startup.
	 */
	private checkReadyToSend() {
		if (this.devices && this.groups && this.connected && this.authorized)
			this.sendPendingCommands();
	}

	/**
	 * Register a command (with data poked into returned DeviceState) for
	 * destination, which may be a device or a group.
	 */
	private sendCommandSoon(destination: string): DeviceState {
		var result = this.pendingCommands[destination];
		if (!result) // No already existing command to same target - make blank one
			result = this.pendingCommands[destination] = <DeviceState>{};
		if (!this.sendInProgress()) {
			this.sendPendingCommandsSoon();
		} // Else transmission already in progress - will tag along later
		return result;
	}

	private sendPendingCommandsSoon() {
		if (this.havePendingCommands()) {
			const now = new Date();
			const howLongAgo = now.getTime() - this.whenSentlast.getTime();
			var delay = 50;	// Send this soon if no recent send
			// Extra wait if positive (negative if waited long enough already)
			const extraWait = this.kMinTimeBetweenCommands - howLongAgo;
			if (extraWait > 0) {
				delay += extraWait;	// Add in extra wait
				// console.log("Extra wait", delay);
			}
			this.deferredSender = wait(delay);
			this.deferredSender.then(() => {
				this.deferredSender = undefined;
				this.sendPendingCommands();
				this.whenSentlast = new Date();
			});
		}
	}

	/**
	 * return true if there are pending commands to send.
	 */
	private havePendingCommands() {
		for (var cmd in this.pendingCommands)
			return true;
		return false;
	}

	/**
	 * I consider command transmission in progress if there's either
	 * a deferredSender waiting to fire or a cmdInFlight. In both
	 * these cases, the next command will be sent soon automatically
	 * without any further ado.
	 */
	private sendInProgress() {
		return !!this.deferredSender || this.cmdInFlight;
	}

	/**
	 * Send any commands waiting to be sent.
	 */
	private sendPendingCommands() {
		if (!this.alive) {	// No can do
			this.pendingCommands = {};	// Just discard all commands
			return;
		}
		for (var dest in this.pendingCommands) {
			if (this.pendingCommands.hasOwnProperty(dest)) {
				// console.info("Sending to", dest);
				const cmd = this.pendingCommands[dest];
				delete this.pendingCommands[dest];	// Now taken
				var typeUrlSeg: string;
				var cmdUrlSeg: string;
				var targetItem: Named;
				// Look for device name first, then group name
				if (targetItem = this.devices.byName[dest]) {
					typeUrlSeg = 'lights/';
					cmdUrlSeg = '/state';
				} else if (targetItem = this.groups.byName[dest]) {
					typeUrlSeg = 'groups/';
					cmdUrlSeg = '/action';
				} else {
					console.warn("Device/group not found", dest);
					continue;	// Try next command
				}
				const url = this.getKeyedUrlBase() + typeUrlSeg + targetItem.id + cmdUrlSeg;
				this.cmdInFlight = true;
				const cmdStr = JSON.stringify(cmd);
				// console.log("Sent command",url);
				SimpleHTTP.newRequest(url).put(cmdStr).catch(error =>
					console.warn("Failed sending command", error, url, cmdStr)
				).finally(() => {
					this.cmdInFlight = false;	// Done with that command
					// console.warn("Sent", dest);
					this.sendPendingCommandsSoon();	// Send any newly accumulated commands
				});
				return;	// Next taken through "finally" above
			}
		}
	}

	/**
	 * get and cache the complete list of lights
	 */
	private getDevices() {
		SimpleHTTP.newRequest(this.getKeyedUrlBase() + 'lights').get().then(response => {
			this.connected = true;
			if (response.status === 200) {
				this.authorized = true;
				var devices: Dictionary<Device> = JSON.parse(response.data);
				if (devices)
					this.devices = new NamedItems<Device>(devices);
				else
					console.warn("Missing lights data");
			} else {
				console.warn("Lights error response", response.status);
				if (response.status === 403)
					this.unauthorize();
			}
		}).catch(error => this.requestFailed(error));
	}

	/**
	 * get and cache the complete list of groups
	 */
	private getGroups() {
		SimpleHTTP.newRequest(this.getKeyedUrlBase() + 'groups').get().then(response => {
			this.connected = true;
			if (response.status === 200) {
				const oldGroups = this.groups ? this.groups.byName : {};	// To publish props for newly added
				var groups: Dictionary<Group> = JSON.parse(response.data);
				if (groups) {	// Got new set of groups
					this.groups = new NamedItems<Group>(groups);
					this.publishGroupPropsForNew(oldGroups);
				} else
					console.warn("Missing group data");
			} else {
				console.warn("Groups error response", response.status);
				if (response.status === 403)
					this.unauthorize();
			}
		}).catch(error => this.requestFailed(error));
	}

	/**
	 * Publish props for all groups not in oldGroups.
	 */
	private publishGroupPropsForNew(oldGroups : Dictionary<Group>) {
		for (const newGroupName in this.groups.byName) {
			if (!oldGroups[newGroupName])
				this.publishGroupProps(newGroupName);
		}
	}

	/**
	 * Make composite name for each group property
	 */
	private static grpPropNameBrightness(groupName: string) {
		return groupName+'_brt';
	}

	private static grpPropNameOn(groupName: string) {
		return groupName+'_on';
	}

	private static grpPropNameHue(groupName: string) {
		return groupName+'_hue';
	}

	private static grpPropNameSaturation(groupName: string) {
		return groupName+'_sat';
	}

	/**
	 * Publish props for specified group.
	 */
	private publishGroupProps(newGroupName: string) {
		// console.log("Group added", newGroupName);

		/*	We really have no idea on the initial/current state of group properties...
			Also, we may want to unify this statis with what's set by functions above,
			in which case it may make more sense to effectuate through these properties
			from those functions rather than the other way around. Later...
		*/
		var on = true;
		var brightess = 1;
		var hue = 1;
		var saturation = 0;

		this.property<number>(DeConz.grpPropNameBrightness(newGroupName), {type: Number, description: "Group Brightness"}, setValue => {
			if (setValue !== undefined) {
				brightess = setValue;
				this.setBrightness(newGroupName, setValue, 0.2)
			}
			return brightess;
		});

		this.property<boolean>(DeConz.grpPropNameOn(newGroupName), {type: Boolean, description: "Group On"}, setValue => {
			if (setValue !== undefined) {
				on = setValue;
				this.setOn(newGroupName, on);
			}
			return on;
		});

		this.property<number>(DeConz.grpPropNameHue(newGroupName), {type: Number, description: "Group Hue"}, setValue => {
			if (setValue !== undefined) {
				hue = setValue;
				this.setHueState(newGroupName, setValue);
			}
			return hue;
		});

		this.property<number>(DeConz.grpPropNameSaturation(newGroupName), {type: Number, description: "Group Saturation"}, setValue => {
			if (setValue !== undefined) {
				saturation = setValue;
				this.setSaturationState(newGroupName, setValue);
			}
			return saturation;
		});
	}

	/**
	 * Force me to become unauthorized, dropping my config data, to force re-authorization.
	 */
	private unauthorize() {
		this.authorized = false;
		this.config = undefined;
		console.warn("Unauthorized due to 403");
	}

	/*	Get the request URI base, including the authorization code, with a terminating
		slash.
	 */
	private getKeyedUrlBase(): string|undefined {
		if (!this.keyedBasedUrl && this.config)
			this.keyedBasedUrl = this.baseUrl + '/' + this.config.authCode + '/';
		return this.keyedBasedUrl;
	}

	private requestFailed(error: string) {
		this.connected = false;
		console.warn(error);
	}
}

/**
 * Clip value to normalized 0...1 range.
 */
function clip(value?: number) {
	value = value || 0;	// Default to 0 if no value passed in
	return Math.max(0, Math.min(1, value));
}

/**
 * A double-map providing access to items either by ID or by name.
 */
class NamedItems<T extends Named> {
	byId: Dictionary<T>;
	byName: Dictionary<T>;

	constructor(items: Dictionary<T>) {
		this.byId = items;	// Keyed by ID in src data - use as is
		// Also keyed ny name
		this.byName = {};
		for (var key in items) {
			const item = items[key];
			item.id = key;	// Make sure ID is set
			this.byName[item.name] = item;
		}
	}
}

// What's stored in my config file
interface Config {
	authCode: string;
}

// A simple typed dictionary type, using a string as key
export interface Dictionary<TElem> {
	[id: string]: TElem;
}

/*	The following interfaces define what's returned from the DeCONZ gateway.
 */

interface AuthResponse {
	success: {
		username: string;	// Authentication key to use for further requests
	}
}

interface Named {
	name: string;
	id: string;
}

interface Device {		// Aka "Light"
	name: string,		// E.g. "Osram Plug"
	id: string;
	etag: string,
	hascolor: boolean,
	manufacturername: string, // E.g. "OSRAM",
	modelid: string,	// E.g. "Plug 01",
	state: DeviceState,
	swversion: string,	// E.g. "V1.04.12"
	type: string,		// E.g. "On/Off plug-in unit"
	uniqueid: string	// E.g., "7c:b0:3e:aa:00:b0:d5:49-03"
}

interface DeviceState {	// Aka Lamp State
	alert: string,
	bri: number,
	colormode: string,
	ct: number,
	effect: string,
	hue: number,
	on: boolean,
	reachable: boolean,
	sat: number,
	xy: number[]
	transitiontime: number;	// in 0.1 second steps (send only)
}

interface Group {
	name: string,		// Given name of this group
	id: string;
	devicemembership: any[],
 	etag: string,
	type: string,
	lights: string[],	// IDs of devices in group
 	scenes: any[],
	action: Action
}

interface Action {
    bri: number,
    colormode: string,
    ct: number,
    effect: string,
    hue: number,
    on: boolean,
    sat: number,
    scene: any,
    xy: number[]	// 2 elements, X and Y
}

