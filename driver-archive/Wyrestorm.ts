/*
 * Copyright (c) 2021 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import { NetworkTCP } from "system/Network";
import { Driver } from "system_lib/Driver";
import { driver, property } from "system_lib/Metadata";
import { SimpleFile } from '../system/SimpleFile';
import { IndexedProperty } from '../system_lib/ScriptBase';

@driver('NetworkTCP', { port: 23 })
export class Wyrestorm extends Driver<NetworkTCP> {

	/**
	 * Keeps track of the connections for all drivers with the same IP address,
	 * since more than one can share the same connection via TCP (telnet).
	 */
	protected static connections: Dictionary<Connection>;

	/**
	 * Same as the "Device Name" under "Manage > TCP/UDP Devices".
	 * IMPORTANT NOTICE: Must have the same name as the decoder we're controlling.
	 */
	private readonly mDeviceName: string;

	/**
	 * Containing the TCP connection to the Wyrestorm controller,
	 * this can be shared with other drivers using the same controller.
	 */
	private readonly mMyConnection: Connection;

	private mConnected: boolean; // If I'm connected to the device.
	private mMultiviewConfig: IMultiViewConfig // Configuration for a multiview decoder
	private mCurrentLayout: ILayout; // The currently selected layout if multiview
	private mApplyTilesDebounce: CancelablePromise<void>; // Applying the tile layout when resolving
	private mDevicePower: boolean = false; // Power state on the device attached to HDMI

	/**
	 * Properties for each tile on a multiview decoder.
	 * Must have the same name as the indexed property.
	 */
	private tiles: IndexedProperty<Tile>;

	public constructor(
		private socket: NetworkTCP
	) {
		super(socket);
		this.mDeviceName = socket.name;

		if (!Wyrestorm.connections)
			Wyrestorm.connections = {};

		this.mMyConnection = Wyrestorm.getConnection(socket);
		this.listenConnected();

		/**
		 * Check if config file for my me exists, the config file is based
		 * on the alias of the multiview decoder we want to control.
		 * I.e. Wyrestorm.LED.json
		 *
		 * If we are to control a single view decoder, this file should
		 * NOT exist.
		 */
		const configFile = this.getConfigFileName();
		SimpleFile.exists(configFile).then(
			result => {
				if (result === 1) {
					SimpleFile.readJson(configFile).then(
						config => this.setupMultiView(config)
					);
				} else { // The file is not found, we're controlling a single view decoder
					this.setupSingleView();
				}
			}
		);

		/**
		 * Remove me from the connection when I get unmounted.
		 */
		socket.subscribe('finish', () => {
			Wyrestorm.removeConnection(this.mMyConnection);
		});
	}
	
	@property("Send HDMI-CEC command to power on/off the device")
	public set power(value: boolean) {
		this.mDevicePower = value;
		let pw = "off";
		if (value) {
			pw = "on";
		}
		this.mMyConnection.doCommand(`config set device sinkpower ${ pw } ${ this.mDeviceName }`);
	}
	public get power(): boolean {
		return this.mDevicePower;
	}

	/**
	 * Setup properties and indexed properties (tiles) for multi view.
	 */
	private setupMultiView(config: IMultiViewConfig): void {
		this.mMultiviewConfig = config;

		let currentLayout: string;
		this.property<string>(
			'layout',
			{ description: 'Set a layout by name as defined in config json.' },
			(value: string): string => {
				if (value && currentLayout !== value) {
					currentLayout = value;
					this.setLayout(value);
				}

				return currentLayout;
			}
		);

		this.tiles = this.indexedProperty<Tile>(
			'tiles',
			Tile
		);
		for (let i = 0; i < 9; i++) {
			this.tiles.push(
				new Tile(
					i,
					() => this.scheduleApplyLayout()
				)
			);
		}
	}

	/**
	 * Setup properties for single view.
	 */
	private setupSingleView(): void {
		let currentSource: string;
		this.property<string>(
			'source',
			{ description: 'Alias for source (TX) we want to display' },
			(value: string): string => {
				let newSource = currentSource;
				if (value !== undefined)
					newSource = value === '' ? null : value;

				if (currentSource !== newSource) { // This is news
					currentSource = newSource;
					console.log(`Setting single source to ${ currentSource }`);
					this.mMyConnection.doCommand(`matrix set ${ currentSource } ${ this.mDeviceName }`);
				}

				return currentSource;
			}
		);
	}

	/**
	 * Setting a layout by name on my decoder as configured in JSON, if found,
	 * otherwise do nothing.
	 */
	private setLayout(layoutName: string): void {
		this.mCurrentLayout = this.mMultiviewConfig.layouts[layoutName];
		if (!this.mCurrentLayout) {
			console.error(`No layout with name "${ layoutName }" configured.`);
			return;
		}

		/**
		 * Applying sources from the tile config to the source of the tiles
		 * in the tiles indexed property.
		 */
		for (let i in this.mCurrentLayout.tiles) {
			let tile = this.mCurrentLayout.tiles[i];
			this.tiles[i].source = tile.source;
		}

		this.scheduleApplyLayout();
	}

	/**
	 * Schedule a layout change to fire in 250ms, if no other changes
	 * is made to the layout since then.
	 */
	private scheduleApplyLayout(): void {
		if (this.mApplyTilesDebounce)
			this.mApplyTilesDebounce.cancel();

		this.mApplyTilesDebounce = wait(250);
		this.mApplyTilesDebounce.then(() => this.applyLayout());
	}

	/**
	 * Applies the current layout, possibly changing the sources of one or more tiles.
	 */
	private applyLayout(): void {
		this.mApplyTilesDebounce = undefined;

		if (this.mCurrentLayout) {
			let command = `mview set ${this.mDeviceName} ${this.mCurrentLayout.style}`;
			const tiles = this.tiles;
			for (let tileIx in this.mCurrentLayout.tiles) {
				let tile = tiles[tileIx];
				let tileConfig = this.mCurrentLayout.tiles[tileIx];
				command += ` ${ tile.source }:${ tileConfig.x }_${ tileConfig.y }_${ tileConfig.width }_${ tileConfig.height }:${ tileConfig.scale }`;
			}

			this.mMyConnection.doCommand(command);
		} else
			console.error('No layout has been specified, do that before trying to set sources on tiles.');
	}

	/**
	 * Returns the configuration file name for multi view decoders.
	 */
	private getConfigFileName(): string {
		return `Wyrestorm.${this.mDeviceName}.json`;
	}

	/**
	 * Returning an existing connection from the connection pool, keying on the IP
	 * of the associated driver instance, creating one if it doesn't exist.
	 * Also adding to the number of users on that connection.
	 */
	protected static getConnection(socket: NetworkTCP): Connection {
		const ip = socket.address;
		let connection = this.connections[ip];
		if (!connection) {
			connection = new Connection(socket);
			this.connections[ip] = connection;
		}
		connection.addNumUsers();
		return connection;
	}

	/**
	 * Removing a user from the connection, if it reaches zero, delete the connection.
	 */
	protected static removeConnection(connection: Connection): void {
		const existingConnection = this.connections[connection.getIP()];
		if (existingConnection && existingConnection.removeNumUsers() === 0) {
			delete this.connections[connection.getIP()];
		}
	}

	/**
	 * Overlay the connected property since more devices can share the same
	 * connection to the device.
	 */
	private listenConnected() {
		const setGetConnected = (value: boolean): boolean => {
			if (value !== undefined) {
				this.mConnected = value;
			}
			return this.mConnected;
		};
		this.property<boolean>(
			'connected',
			{ description: 'If this device is connected' },
			setGetConnected
		);
		this.mMyConnection.socket.subscribe(
			'connect',
			(
				sender: NetworkTCP,
				message: {
					type: 'Connection' |		// Connection state changed (check with isConnected)
						'ConnectionFailed'	// Connection attempt failed
				}
			) => {
				if (message.type === 'Connection')
					this.mConnected = sender.connected;
			}
		)
	}
}

class Tile {

	// The current source alias visible on this tile.
	private mSource: string;

	constructor(
		private tileIx: number,
		private applyChanges: () => void
	) {
	}

	@property('Source for tile')
	public set source(value: string) {
		let newSource: string = this.mSource;
		if (
			(value === null && this.mSource === undefined) ||
			(value === '' && this.mSource !== null)
		) {
			newSource = null;
		} else if (value !== null) {
			newSource = value;
		}

		if (newSource !== this.mSource) { // This is news.
			this.mSource = newSource;
			this.applyChanges();
		}
	}
	public get source(): string {
		return this.mSource;
	}
}

/**
 * Containg the TCP connection to a controller, to also be used by
 * other driver instances that wants to communicate to the same device.
 */
class Connection {

	// Number of users (driver instances) the currently are using my TCP connection.
	private mNumUsers: number;

	constructor(
		private mSocket: NetworkTCP
	) {
		mSocket.autoConnect();

		/**
		 * Listen for messages from the controller, if a message is containing
		 * the word "failure", log it as an error,
		 */
		mSocket.subscribe(
			'textReceived',
			(
				sender: NetworkTCP,
				message: {
					text: string // The text string that was received (excluding line terminator)
				}
			) => {
				if (message.text.indexOf('failure') !== -1)
					console.log(message.text);
			}
		);
	}

	public doCommand(command: string): void {
		this.mSocket.sendText(command, '\r\n');
	}

	public addNumUsers(): void {
		this.mNumUsers++;
	}
	public removeNumUsers(): number {
		this.mNumUsers--;
		return this.mNumUsers;
	}

	public getIP(): string {
		return this.mSocket.address;
	}

	public disconnect() {
		this.mSocket.disconnect();
	}

	public get socket(): NetworkTCP {
		return this.mSocket;
	}
}

interface IMultiViewConfig {
	layouts: Dictionary<ILayout>;
}

interface ILayout {
	style: string; // Tile or overlay
	tiles: ITile[]; // An array containing one tile per element.
}

interface ITile {
	/**
	 * The source to show in this tile.
	 * 	null = keep the same source as before
	 * 	"" = no source
	 * 	"SOURCE ALIAS" = specific source by alias
	 */
	source: string;
	x: number;
	y: number;
	width: number;
	height: number;
	/*
	 * Should the source should be contained within the tile (fit)
	 * or cover the entire tile (stretch).
	 */
	scale: 'fit' | 'stretch';
}

// A simple typed dictionary type, using a string as key
interface Dictionary<TElem> {
	[id: string]: TElem;
}
