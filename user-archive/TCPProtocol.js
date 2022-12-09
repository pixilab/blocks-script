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
define(["require", "exports", "system_lib/Script", "system/SimpleServer", "system/SimpleFile", "../system_lib/Metadata"], function (require, exports, Script_1, SimpleServer_1, SimpleFile_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TCPProtocol = void 0;
    var TCPProtocol = (function (_super) {
        __extends(TCPProtocol, _super);
        function TCPProtocol(env) {
            var _this = _super.call(this, env) || this;
            _this.discarded = false;
            _this.clients = [];
            _this.clearConfig();
            _this.reload();
            SimpleServer_1.SimpleServer.newTextServer(3041, 10, 4096)
                .subscribe('client', function (sender, message) {
                if (!_this.discarded)
                    _this.clients.push(new Client(_this, message.connection));
            });
            env.subscribe('finish', function () { return _this.discard(); });
            return _this;
        }
        TCPProtocol.prototype.reload = function () {
            var _this = this;
            SimpleFile_1.SimpleFile.readJson('TCPProtocol.json')
                .then(function (config) { return _this.applyConfig(config); })
                .catch(function (error) { return _this.configError("reading file", error); });
        };
        TCPProtocol.prototype.applyConfig = function (config) {
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
        };
        TCPProtocol.prototype.configError = function (message, error) {
            console.error("Configuration failed -", message, error, "No security is applied!");
            this.clearConfig();
        };
        TCPProtocol.prototype.clearConfig = function () {
            this.pathApprover = new WhiteBlackList();
        };
        TCPProtocol.prototype.discard = function () {
            this.discarded = true;
            this.clients.forEach(function (connection) { return connection.shutDown(true); });
        };
        TCPProtocol.prototype.lostClient = function (client) {
            var ix = this.clients.indexOf(client);
            if (ix >= 0)
                this.clients.splice(ix, 1);
        };
        __decorate([
            (0, Metadata_1.callable)("Re-load configuration data"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], TCPProtocol.prototype, "reload", null);
        return TCPProtocol;
    }(Script_1.Script));
    exports.TCPProtocol = TCPProtocol;
    var WhiteBlackList = (function () {
        function WhiteBlackList(paths, isWhiteList) {
            this.listedPaths = {};
            if (!paths)
                this.whiteList = false;
            else {
                this.whiteList = !!isWhiteList;
                for (var _i = 0, paths_1 = paths; _i < paths_1.length; _i++) {
                    var path = paths_1[_i];
                    if (typeof path === 'string')
                        this.listedPaths[path] = true;
                    else
                        throw "White/black list path invalid";
                }
            }
        }
        WhiteBlackList.prototype.isApprovedPath = function (path) {
            var isListed = !!this.listedPaths[path];
            return this.whiteList ? isListed : !isListed;
        };
        return WhiteBlackList;
    }());
    var Client = (function () {
        function Client(owner, connection) {
            var _this = this;
            this.owner = owner;
            this.connection = connection;
            this.openProps = {};
            this.subscribedProps = {};
            this.sendProps = {};
            connection.subscribe('textReceived', function (connection, message) {
                return _this.handleMessage(message.text);
            });
            connection.subscribe('finish', function (connection) { return _this.shutDown(); });
        }
        Client.prototype.shutDown = function (disconnect) {
            if (disconnect)
                this.connection.disconnect();
            if (this.pendingSend)
                this.pendingSend.cancel();
            for (var key in this.openProps)
                this.openProps[key].close();
            this.owner.lostClient(this);
        };
        Client.prototype.handleMessage = function (rawMessage) {
            var _this = this;
            var msg;
            try {
                msg = JSON.parse(rawMessage);
            }
            catch (exception) {
                console.warn("Message not valid JSON", rawMessage);
                return;
            }
            if (Array.isArray(msg))
                msg.forEach(function (cmd) { return _this.handleCommand(cmd); });
            else
                this.handleCommand(msg);
        };
        Client.prototype.handleCommand = function (msg) {
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
        };
        Client.prototype.handleSet = function (cmd) {
            if (this.owner.pathApprover.isApprovedPath(cmd.path))
                this.getProp(cmd.path).value = cmd.value;
            else
                console.warn("Permission denied for path", cmd.path);
        };
        Client.prototype.handleAdd = function (cmd) {
            if (this.owner.pathApprover.isApprovedPath(cmd.path)) {
                var accessor = this.getProp(cmd.path);
                if (accessor.available) {
                    var typeName = typeof accessor.value;
                    var addValueType = typeof cmd.value;
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
        };
        Client.prototype.handleSubscribe = function (cmd) {
            if (!this.subscribedProps[cmd.path]) {
                this.subscribedProps[cmd.path] = true;
                var accessor = this.getProp(cmd.path);
                if (accessor.available)
                    this.tellPropValue(cmd.path, accessor.value);
            }
        };
        Client.prototype.handleUnsubscribe = function (cmd) {
            var path = cmd.path;
            this.getProp(path).close();
            delete this.openProps[path];
            delete this.sendProps[path];
            delete this.subscribedProps[path];
        };
        Client.prototype.getProp = function (path) {
            var _this = this;
            var result = this.openProps[path];
            if (!result) {
                this.openProps[path] = result = this.owner.getProperty(path, function (change) {
                    if (_this.subscribedProps[path])
                        _this.tellPropValue(path, change);
                });
            }
            return result;
        };
        Client.prototype.tellPropValue = function (path, value) {
            this.sendProps[path] = value;
            this.sendValuesSoon();
        };
        Client.prototype.sendValuesSoon = function () {
            var _this = this;
            if (!this.pendingSend) {
                this.pendingSend = wait(50);
                this.pendingSend.then(function () {
                    _this.pendingSend = undefined;
                    _this.sendValuesNow();
                });
            }
        };
        Client.prototype.sendValuesNow = function () {
            var toSend = [];
            var sendProps = this.sendProps;
            for (var key in sendProps) {
                var value = sendProps[key];
                delete sendProps[key];
                toSend.push({ type: "prop", path: key, value: value });
                if (toSend.length >= 20) {
                    this.sendValuesSoon();
                    break;
                }
            }
            if (toSend.length)
                this.connection.sendText(JSON.stringify(toSend));
        };
        return Client;
    }());
});
