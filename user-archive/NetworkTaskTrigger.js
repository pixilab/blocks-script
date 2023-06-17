var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
define(["require", "exports", "../system_lib/Script", "../system_lib/Metadata", "../system/SimpleServer", "../system/Realm"], function (require, exports, Script_1, Metadata_1, SimpleServer_1, Realm_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NetworkTaskTrigger = void 0;
    var PORT = 3042;
    var DEBUG = false;
    var NetworkTaskTrigger = (function (_super) {
        __extends(NetworkTaskTrigger, _super);
        function NetworkTaskTrigger(env) {
            var _this = _super.call(this, env) || this;
            _this.discarded = false;
            _this.inited = false;
            _this.whiteRealms = {};
            _this.clients = [];
            env.subscribe('finish', function () { return _this.discard(); });
            return _this;
        }
        NetworkTaskTrigger.prototype.whiteList = function (realm, group, task) {
            if (!realm)
                throw "Realm not specified";
            var rd = this.whiteRealms[realm] || (this.whiteRealms[realm] = {});
            if (group) {
                var gd = rd[group] || (rd[group] = {});
                if (task) {
                    if (!gd[task])
                        gd[task] = true;
                }
            }
            this.init();
        };
        NetworkTaskTrigger.prototype.init = function () {
            var _this = this;
            if (!this.inited) {
                this.inited = true;
                var listener = SimpleServer_1.SimpleServer.newTextServer(PORT, 3);
                listener.subscribe('client', function (sender, message) {
                    if (!_this.discarded)
                        _this.clients.push(new Client(_this, message.connection));
                });
            }
        };
        NetworkTaskTrigger.prototype.discard = function () {
            this.discarded = true;
            this.clients.forEach(function (connection) { return connection.shutDown(true); });
        };
        NetworkTaskTrigger.prototype.lostClient = function (client) {
            var ix = this.clients.indexOf(client);
            if (ix >= 0)
                this.clients.splice(ix, 1);
        };
        NetworkTaskTrigger.prototype.handleMessage = function (message) {
            var pieces = message.split('.').reverse();
            var numPieces = pieces.length;
            if (numPieces > 3 || numPieces < 1)
                throw "Wrong number of items specified";
            var taskName = pieces[0];
            var realmName = pieces[2];
            if (!realmName) {
                realmName = getSingleEntry(this.whiteRealms);
                if (!realmName)
                    throw "realm unspecified and can't be inferred";
            }
            var groupName = pieces[1];
            if (!groupName) {
                groupName = getSingleEntry(this.whiteRealms[realmName]);
                if (!groupName)
                    throw "group unspecified and can't be inferred";
            }
            if (!this.approved(realmName, groupName, taskName))
                throw "not white-listed";
            var realm = Realm_1.Realm[realmName];
            if (!realm)
                throw "realm doesn't exist";
            var group = realm.group[groupName];
            if (!group)
                throw "group doesn't exist";
            var task = group[taskName];
            if (!task)
                throw "task doesn't exist";
            log("Starting task", realmName, groupName, taskName);
            task.running = true;
        };
        NetworkTaskTrigger.prototype.approved = function (realm, group, task) {
            var groupDict = this.whiteRealms[realm];
            if (!groupDict)
                return false;
            if (!hasAnyEntry(groupDict))
                return true;
            var taskDict = groupDict[group];
            if (!taskDict)
                return false;
            if (!hasAnyEntry(taskDict))
                return true;
            return taskDict[task];
        };
        __decorate([
            (0, Metadata_1.callable)("Allow Tasks to be triggered from outside"),
            __param(0, (0, Metadata_1.parameter)("Name of Realm containing tasks")),
            __param(1, (0, Metadata_1.parameter)("Optional name of Group containing tasks", true)),
            __param(2, (0, Metadata_1.parameter)("Optional name of Task that may be triggered", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, String]),
            __metadata("design:returntype", void 0)
        ], NetworkTaskTrigger.prototype, "whiteList", null);
        return NetworkTaskTrigger;
    }(Script_1.Script));
    exports.NetworkTaskTrigger = NetworkTaskTrigger;
    function getSingleEntry(dict) {
        var item = null;
        for (var key in dict) {
            if (dict.hasOwnProperty(key)) {
                if (item)
                    return null;
                item = key;
            }
        }
        return item;
    }
    function hasAnyEntry(dict) {
        for (var key in dict) {
            if (dict.hasOwnProperty(key))
                return true;
        }
        return false;
    }
    var Client = (function () {
        function Client(owner, connection) {
            var _this = this;
            this.owner = owner;
            this.connection = connection;
            connection.subscribe('finish', function (connection) { return _this.shutDown(); });
            connection.subscribe('textReceived', function (sender, message) {
                try {
                    _this.owner.handleMessage(message.text);
                }
                catch (error) {
                    console.error("Failed message", message.text, "due to", error);
                    if (DEBUG)
                        _this.connection.sendText("Error: " + error);
                }
            });
            log("Client connected");
        }
        Client.prototype.shutDown = function (disconnect) {
            if (disconnect)
                this.connection.disconnect();
            this.owner.lostClient(this);
            log("Client gone");
        };
        return Client;
    }());
    function log() {
        var messages = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            messages[_i] = arguments[_i];
        }
        if (DEBUG)
            console.info(messages);
    }
});
