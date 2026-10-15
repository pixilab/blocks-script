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
var Wyrestorm_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wyrestorm = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
const SimpleFile_1 = require("../system/SimpleFile");
let Wyrestorm = class Wyrestorm extends Driver_1.Driver {
    static { Wyrestorm_1 = this; }
    socket;
    static connections;
    mDeviceName;
    mMyConnection;
    mConnected;
    mMultiviewConfig;
    mCurrentLayout;
    mApplyTilesDebounce;
    mDevicePower = false;
    tiles;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        this.mDeviceName = socket.name;
        if (!Wyrestorm_1.connections)
            Wyrestorm_1.connections = {};
        this.mMyConnection = Wyrestorm_1.getConnection(socket);
        this.listenConnected();
        const configFile = this.getConfigFileName();
        SimpleFile_1.SimpleFile.exists(configFile).then(result => {
            if (result === 1) {
                SimpleFile_1.SimpleFile.readJson(configFile).then(config => this.setupMultiView(config));
            }
            else {
                this.setupSingleView();
            }
        });
        socket.subscribe('finish', () => {
            Wyrestorm_1.removeConnection(this.mMyConnection);
        });
    }
    set power(value) {
        this.mDevicePower = value;
        let pw = "off";
        if (value) {
            pw = "on";
        }
        this.mMyConnection.doCommand(`config set device sinkpower ${pw} ${this.mDeviceName}`);
    }
    get power() {
        return this.mDevicePower;
    }
    setupMultiView(config) {
        this.mMultiviewConfig = config;
        let currentLayout;
        this.property('layout', { description: 'Set a layout by name as defined in config json.' }, (value) => {
            if (value && currentLayout !== value) {
                currentLayout = value;
                this.setLayout(value);
            }
            return currentLayout;
        });
        this.tiles = this.indexedProperty('tiles', Tile);
        for (let i = 0; i < 9; i++) {
            this.tiles.push(new Tile(i, () => this.scheduleApplyLayout()));
        }
    }
    setupSingleView() {
        let currentSource;
        this.property('source', { description: 'Alias for source (TX) we want to display' }, (value) => {
            let newSource = currentSource;
            if (value !== undefined)
                newSource = value === '' ? null : value;
            if (currentSource !== newSource) {
                currentSource = newSource;
                console.log(`Setting single source to ${currentSource}`);
                this.mMyConnection.doCommand(`matrix set ${currentSource} ${this.mDeviceName}`);
            }
            return currentSource;
        });
    }
    setLayout(layoutName) {
        this.mCurrentLayout = this.mMultiviewConfig.layouts[layoutName];
        if (!this.mCurrentLayout) {
            console.error(`No layout with name "${layoutName}" configured.`);
            return;
        }
        for (let i in this.mCurrentLayout.tiles) {
            let tile = this.mCurrentLayout.tiles[i];
            this.tiles[i].source = tile.source;
        }
        this.scheduleApplyLayout();
    }
    scheduleApplyLayout() {
        if (this.mApplyTilesDebounce)
            this.mApplyTilesDebounce.cancel();
        this.mApplyTilesDebounce = wait(250);
        this.mApplyTilesDebounce.then(() => this.applyLayout());
    }
    applyLayout() {
        this.mApplyTilesDebounce = undefined;
        if (this.mCurrentLayout) {
            let command = `mview set ${this.mDeviceName} ${this.mCurrentLayout.style}`;
            const tiles = this.tiles;
            for (let tileIx in this.mCurrentLayout.tiles) {
                let tile = tiles[tileIx];
                let tileConfig = this.mCurrentLayout.tiles[tileIx];
                command += ` ${tile.source}:${tileConfig.x}_${tileConfig.y}_${tileConfig.width}_${tileConfig.height}:${tileConfig.scale}`;
            }
            this.mMyConnection.doCommand(command);
        }
        else
            console.error('No layout has been specified, do that before trying to set sources on tiles.');
    }
    getConfigFileName() {
        return `Wyrestorm.${this.mDeviceName}.json`;
    }
    static getConnection(socket) {
        const ip = socket.address;
        let connection = this.connections[ip];
        if (!connection) {
            connection = new Connection(socket);
            this.connections[ip] = connection;
        }
        connection.addNumUsers();
        return connection;
    }
    static removeConnection(connection) {
        const existingConnection = this.connections[connection.getIP()];
        if (existingConnection && existingConnection.removeNumUsers() === 0) {
            delete this.connections[connection.getIP()];
        }
    }
    listenConnected() {
        const setGetConnected = (value) => {
            if (value !== undefined) {
                this.mConnected = value;
            }
            return this.mConnected;
        };
        this.property('connected', { description: 'If this device is connected' }, setGetConnected);
        this.mMyConnection.socket.subscribe('connect', (sender, message) => {
            if (message.type === 'Connection')
                this.mConnected = sender.connected;
        });
    }
};
exports.Wyrestorm = Wyrestorm;
__decorate([
    (0, Metadata_1.property)("Send HDMI-CEC command to power on/off the device"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], Wyrestorm.prototype, "power", null);
exports.Wyrestorm = Wyrestorm = Wyrestorm_1 = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 23 }),
    __metadata("design:paramtypes", [Object])
], Wyrestorm);
class Tile {
    tileIx;
    applyChanges;
    mSource;
    constructor(tileIx, applyChanges) {
        this.tileIx = tileIx;
        this.applyChanges = applyChanges;
    }
    set source(value) {
        let newSource = this.mSource;
        if ((value === null && this.mSource === undefined) ||
            (value === '' && this.mSource !== null)) {
            newSource = null;
        }
        else if (value !== null) {
            newSource = value;
        }
        if (newSource !== this.mSource) {
            this.mSource = newSource;
            this.applyChanges();
        }
    }
    get source() {
        return this.mSource;
    }
}
__decorate([
    (0, Metadata_1.property)('Source for tile'),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], Tile.prototype, "source", null);
class Connection {
    mSocket;
    mNumUsers;
    constructor(mSocket) {
        this.mSocket = mSocket;
        mSocket.autoConnect();
        mSocket.subscribe('textReceived', (sender, message) => {
            if (message.text.indexOf('failure') !== -1)
                console.log(message.text);
        });
    }
    doCommand(command) {
        this.mSocket.sendText(command, '\r\n');
    }
    addNumUsers() {
        this.mNumUsers++;
    }
    removeNumUsers() {
        this.mNumUsers--;
        return this.mNumUsers;
    }
    getIP() {
        return this.mSocket.address;
    }
    disconnect() {
        this.mSocket.disconnect();
    }
    get socket() {
        return this.mSocket;
    }
}
