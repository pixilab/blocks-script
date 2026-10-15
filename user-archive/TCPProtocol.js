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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TCPProtocol = void 0;
const Script_1 = require("../system_lib/Script");
const SimpleServer_1 = require("../system/SimpleServer");
const SimpleFile_1 = require("../system/SimpleFile");
const Metadata_1 = require("../system_lib/Metadata");
class TCPProtocol extends Script_1.Script {
    clients;
    discarded = false;
    pathApprover;
    constructor(env) {
        super(env);
        this.clients = [];
        this.clearConfig();
        this.reload();
        SimpleServer_1.SimpleServer.newTextServer(3041, 10, 4096)
            .subscribe('client', (sender, message) => {
            if (!this.discarded)
                this.clients.push(new Client(this, message.connection));
        });
        env.subscribe('finish', () => this.discard());
    }
    reload() {
        SimpleFile_1.SimpleFile.readJson('TCPProtocol.json')
            .then(config => this.applyConfig(config))
            .catch(error => this.configError("reading file", error));
    }
    applyConfig(config) {
        try {
            if (config.paths && config.paths.length) {
                this.pathApprover = new WhiteBlackList(config.paths, config.type === 'whitelist');
            }
            else
                throw "Configuration has no paths";
        }
        catch (error) {
            this.configError("bad data", error);
        }
    }
    configError(message, error) {
        console.error("Configuration failed -", message, error, "No security is applied!");
        this.clearConfig();
    }
    clearConfig() {
        this.pathApprover = new WhiteBlackList();
    }
    discard() {
        this.discarded = true;
        this.clients.forEach(connection => connection.shutDown(true));
    }
    lostClient(client) {
        const ix = this.clients.indexOf(client);
        if (ix >= 0)
            this.clients.splice(ix, 1);
    }
}
exports.TCPProtocol = TCPProtocol;
__decorate([
    (0, Metadata_1.callable)("Re-load configuration data"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TCPProtocol.prototype, "reload", null);
class WhiteBlackList {
    whiteList;
    listedPaths;
    constructor(paths, isWhiteList) {
        this.listedPaths = {};
        if (!paths)
            this.whiteList = false;
        else {
            this.whiteList = !!isWhiteList;
            for (var path of paths) {
                if (typeof path === 'string')
                    this.listedPaths[path] = true;
                else
                    throw "White/black list path invalid";
            }
        }
    }
    isApprovedPath(path) {
        const isListed = !!this.listedPaths[path];
        return this.whiteList ? isListed : !isListed;
    }
}
class Client {
    owner;
    connection;
    openProps;
    subscribedProps;
    sendProps;
    pendingSend;
    constructor(owner, connection) {
        this.owner = owner;
        this.connection = connection;
        this.openProps = {};
        this.subscribedProps = {};
        this.sendProps = {};
        connection.subscribe('textReceived', (connection, message) => this.handleMessage(message.text));
        connection.subscribe('finish', connection => this.shutDown());
    }
    shutDown(disconnect) {
        if (disconnect)
            this.connection.disconnect();
        if (this.pendingSend)
            this.pendingSend.cancel();
        for (const key in this.openProps)
            this.openProps[key].close();
        this.owner.lostClient(this);
    }
    handleMessage(rawMessage) {
        var msg;
        try {
            msg = JSON.parse(rawMessage);
        }
        catch (exception) {
            console.warn("Message not valid JSON", rawMessage);
            return;
        }
        if (Array.isArray(msg))
            msg.forEach(cmd => this.handleCommand(cmd));
        else
            this.handleCommand(msg);
    }
    handleCommand(msg) {
        switch (msg.type) {
            case 'set':
            case 'prop':
                this.handleSet(msg);
                break;
            case 'add':
                this.handleAdd(msg);
                break;
            case 'subscribe':
            case 'sub':
                this.handleSubscribe(msg);
                break;
            case 'unsubscribe':
            case 'unsub':
                this.handleUnsubscribe(msg);
                break;
            default:
                console.warn("Unexpected message type", msg.type);
                break;
        }
    }
    handleSet(cmd) {
        if (this.owner.pathApprover.isApprovedPath(cmd.path))
            this.getProp(cmd.path).value = cmd.value;
        else
            console.warn("Permission denied for path", cmd.path);
    }
    handleAdd(cmd) {
        if (this.owner.pathApprover.isApprovedPath(cmd.path)) {
            const accessor = this.getProp(cmd.path);
            if (accessor.available) {
                const typeName = typeof accessor.value;
                const addValueType = typeof cmd.value;
                if (addValueType === typeName) {
                    switch (typeName) {
                        case "number":
                        case "string":
                            accessor.value += cmd.value;
                            break;
                        default:
                            console.warn("Unsupported type for 'add'", typeName, "for path", cmd.path);
                            break;
                    }
                }
                else
                    console.warn("Incompatible value type", addValueType, "for path", cmd.path);
            }
            else
                console.warn("Can't add to unavailable property", cmd.path);
        }
        else
            console.warn("Permission denied for path", cmd.path);
    }
    handleSubscribe(cmd) {
        if (!this.subscribedProps[cmd.path]) {
            this.subscribedProps[cmd.path] = true;
            const accessor = this.getProp(cmd.path);
            if (accessor.available)
                this.tellPropValue(cmd.path, accessor.value);
        }
    }
    handleUnsubscribe(cmd) {
        const path = cmd.path;
        this.getProp(path).close();
        delete this.openProps[path];
        delete this.sendProps[path];
        delete this.subscribedProps[path];
    }
    getProp(path) {
        let result = this.openProps[path];
        if (!result) {
            this.openProps[path] = result = this.owner.getProperty(path, change => {
                if (this.subscribedProps[path])
                    this.tellPropValue(path, change);
            });
        }
        return result;
    }
    tellPropValue(path, value) {
        this.sendProps[path] = value;
        this.sendValuesSoon();
    }
    sendValuesSoon() {
        if (!this.pendingSend) {
            this.pendingSend = wait(50);
            this.pendingSend.then(() => {
                this.pendingSend = undefined;
                this.sendValuesNow();
            });
        }
    }
    sendValuesNow() {
        let toSend = [];
        const sendProps = this.sendProps;
        for (let key in sendProps) {
            const value = sendProps[key];
            delete sendProps[key];
            toSend.push({ type: "prop", path: key, value: value });
            if (toSend.length >= 20) {
                this.sendValuesSoon();
                break;
            }
        }
        if (toSend.length)
            this.connection.sendText(JSON.stringify(toSend));
    }
}
