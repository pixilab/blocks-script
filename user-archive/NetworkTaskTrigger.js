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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkTaskTrigger = void 0;
const Script_1 = require("../system_lib/Script");
const Metadata_1 = require("../system_lib/Metadata");
const SimpleServer_1 = require("../system/SimpleServer");
const Realm_1 = require("../system/Realm");
const PORT = 3042;
const DEBUG = false;
class NetworkTaskTrigger extends Script_1.Script {
    whiteRealms;
    clients;
    discarded = false;
    inited = false;
    constructor(env) {
        super(env);
        this.whiteRealms = {};
        this.clients = [];
        env.subscribe('finish', () => this.discard());
    }
    whiteList(realm, group, task) {
        if (!realm)
            throw "Realm not specified";
        const rd = this.whiteRealms[realm] || (this.whiteRealms[realm] = {});
        if (group) {
            const gd = rd[group] || (rd[group] = {});
            if (task) {
                if (!gd[task])
                    gd[task] = true;
            }
        }
        this.init();
    }
    init() {
        if (!this.inited) {
            this.inited = true;
            const listener = SimpleServer_1.SimpleServer.newTextServer(PORT, 3);
            listener.subscribe('client', (sender, message) => {
                if (!this.discarded)
                    this.clients.push(new Client(this, message.connection));
            });
        }
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
    handleMessage(message) {
        const pieces = message.split('.').reverse();
        const numPieces = pieces.length;
        if (numPieces > 3 || numPieces < 1)
            throw "Wrong number of items specified";
        const taskName = pieces[0];
        let realmName = pieces[2];
        if (!realmName) {
            realmName = getSingleEntry(this.whiteRealms);
            if (!realmName)
                throw "realm unspecified and can't be inferred";
        }
        let groupName = pieces[1];
        if (!groupName) {
            groupName = getSingleEntry(this.whiteRealms[realmName]);
            if (!groupName)
                throw "group unspecified and can't be inferred";
        }
        if (!this.approved(realmName, groupName, taskName))
            throw "not white-listed";
        const realm = Realm_1.Realm[realmName];
        if (!realm)
            throw "realm doesn't exist";
        const group = realm.group[groupName];
        if (!group)
            throw "group doesn't exist";
        const task = group[taskName];
        if (!task)
            throw "task doesn't exist";
        log("Starting task", realmName, groupName, taskName);
        task.running = true;
    }
    approved(realm, group, task) {
        const groupDict = this.whiteRealms[realm];
        if (!groupDict)
            return false;
        if (!hasAnyEntry(groupDict))
            return true;
        const taskDict = groupDict[group];
        if (!taskDict)
            return false;
        if (!hasAnyEntry(taskDict))
            return true;
        return taskDict[task];
    }
}
exports.NetworkTaskTrigger = NetworkTaskTrigger;
__decorate([
    (0, Metadata_1.callable)("Allow Tasks to be triggered from outside"),
    __param(0, (0, Metadata_1.parameter)("Name of Realm containing tasks")),
    __param(1, (0, Metadata_1.parameter)("Optional name of Group containing tasks", true)),
    __param(2, (0, Metadata_1.parameter)("Optional name of Task that may be triggered", true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], NetworkTaskTrigger.prototype, "whiteList", null);
function getSingleEntry(dict) {
    var item = null;
    for (const key in dict) {
        if (dict.hasOwnProperty(key)) {
            if (item)
                return null;
            item = key;
        }
    }
    return item;
}
function hasAnyEntry(dict) {
    for (const key in dict) {
        if (dict.hasOwnProperty(key))
            return true;
    }
    return false;
}
class Client {
    owner;
    connection;
    constructor(owner, connection) {
        this.owner = owner;
        this.connection = connection;
        connection.subscribe('finish', connection => this.shutDown());
        connection.subscribe('textReceived', (sender, message) => {
            try {
                this.owner.handleMessage(message.text);
            }
            catch (error) {
                console.error("Failed message", message.text, "due to", error);
                if (DEBUG)
                    this.connection.sendText("Error: " + error);
            }
        });
        log("Client connected");
    }
    shutDown(disconnect) {
        if (disconnect)
            this.connection.disconnect();
        this.owner.lostClient(this);
        log("Client gone");
    }
}
function log(...messages) {
    if (DEBUG)
        console.info(messages);
}
