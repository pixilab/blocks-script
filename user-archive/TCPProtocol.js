/*	This user script adds a basic TCP-based control protocol to Blocks, suitable for use from
    external control systems (Crestron, AMX, etc) where a plain TCP connection is the preferred
    means of communication. It provides direct access to all properties in Blocks using the same
    property paths as used inside Blocks itself (e.g., in a button binding). Properties can be
    set or subscribed to, so youäll be notified when the property's value changes.

    To use, simply connect to port 3041 on your Blocks server and send a command. Tty it out
    using a telnet client like this:

        telnet 10.1.0.10 3041

    Replace the IP address above with the correct IP address of your Blocks server.
    Commands are specified using JSON syntax. To set a value of a property, type the
    following into your telnet session:

    { "type": "prop", "path": "Artnet.aurora.Red.value", "value": 0.2}

    Valid message types are "prop", "sub" (for subscription) and "unsub" (to end a
    subscription). Multiple commands can be sent together by wrapping them in a JSON
    array. For example, to subscribe to two properties, do this:

[{ "type": "sub", "path": "Artnet.aurora.Red.value"},{ "type": "sub", "path": "Artnet.aurora.Green.value"}]

    The entire command must be entered as a single string, with a newline ONLY at the end. Do not
    put newlines inside the string. The maximum length of such a string is 4096 characters. Split
    commands into multiple strings to send more.

    Since a plain TCP connection provides no security, a while/black-list mechanism is provided,
    allowing you to explicitly state which properties that may (or may not) be set through
    the protocol. This mechanism does not currently limit which properties can be subscribed to.
    Specify this as a JSON file located at script/files/TCPProtocol.json, containing data
    as described by the TCPProtocolConfig interface below. If no configuration file is provided,
    this protocol provides unfettered access to ALL properties (which will be indicated by a
    log message).

    Copyright (c) 2022 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
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
    var TCPProtocol = /** @class */ (function (_super) {
        __extends(TCPProtocol, _super);
        function TCPProtocol(env) {
            var _this = _super.call(this, env) || this;
            _this.discarded = false; // I've began shutting myself down
            _this.clients = [];
            _this.clearConfig();
            _this.reload(); // Load configuration file
            /*	Listen for new connections on my port. I allow for fairly large messages
                since I accept multiple commands as JSON array, so this may be useful.
                I limit the max number of connections somewhat arbitrarily to a
                smaller-than-default value, since I expect in the vast majority of
                cases I'm really expected to handle a single connection only.
             */
            SimpleServer_1.SimpleServer.newTextServer(3041, 10, 4096)
                .subscribe('client', function (sender, message) {
                if (!_this.discarded)
                    _this.clients.push(new Client(_this, message.connection));
            });
            // Handle "script shut-down" by discarding all connections
            env.subscribe('finish', function () { return _this.discard(); });
            return _this;
        }
        TCPProtocol.prototype.reload = function () {
            var _this = this;
            SimpleFile_1.SimpleFile.readJson('TCPProtocol.json')
                .then(function (config) { return _this.applyConfig(config); })
                .catch(function (error) { return _this.configError("reading file", error); });
        };
        /**
         * Apply configuration data if valid.
         */
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
        /**
         * Configuration error. Log error message and reset configuration.
         */
        TCPProtocol.prototype.configError = function (message, error) {
            console.error("Configuration failed -", message, error, "No security is applied!");
            this.clearConfig();
        };
        /**
         * Clear configuration as if no config file existed.
         */
        TCPProtocol.prototype.clearConfig = function () {
            this.pathApprover = new WhiteBlackList();
        };
        /**
         * I'm being discarded. Close all my connections.
         */
        TCPProtocol.prototype.discard = function () {
            this.discarded = true;
            this.clients.forEach(function (connection) { return connection.shutDown(true); });
        };
        /**
         * Callback from client when he goes away, to let me know.
         */
        TCPProtocol.prototype.lostClient = function (client) {
            var ix = this.clients.indexOf(client);
            if (ix >= 0)
                this.clients.splice(ix, 1);
        };
        __decorate([
            Metadata_1.callable("Re-load configuration data"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], TCPProtocol.prototype, "reload", null);
        return TCPProtocol;
    }(Script_1.Script));
    exports.TCPProtocol = TCPProtocol;
    /**
     * Manage the white/black-listing of paths.
     */
    var WhiteBlackList = /** @class */ (function () {
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
        /**
         * Return true if path is approved according to my settings.
         */
        WhiteBlackList.prototype.isApprovedPath = function (path) {
            var isListed = !!this.listedPaths[path];
            return this.whiteList ? isListed : !isListed;
        };
        return WhiteBlackList;
    }());
    /**
     * Represents and manages a single client connection.
     */
    var Client = /** @class */ (function () {
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
        /**
         * Shut down this connection. Used when script is being shut down as well as when the
         * connection is closed by its peer.
         */
        Client.prototype.shutDown = function (disconnect) {
            if (disconnect)
                this.connection.disconnect();
            if (this.pendingSend)
                this.pendingSend.cancel();
            this.owner.lostClient(this);
        };
        /**
         * Process raw message string, presumably in JSON format
         */
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
            if (Array.isArray(msg)) // Multiple messages - apply to each
                msg.forEach(function (cmd) { return _this.handleCommand(cmd); });
            else
                this.handleCommand(msg);
        };
        /**
         * Handle a single message, based on its type.
         */
        Client.prototype.handleCommand = function (msg) {
            switch (msg.type) {
                case 'prop':
                    this.handleSetProp(msg);
                    break;
                case 'sub':
                    this.handleSubscribe(msg);
                    break;
                case 'unsub':
                    this.handleUnsubscribe(msg);
                    break;
                default:
                    console.warn("Unexpected message type", msg.type);
                    break;
            }
        };
        /**
         * Set property to specified value.
         */
        Client.prototype.handleSetProp = function (cmd) {
            if (this.owner.pathApprover.isApprovedPath(cmd.path))
                this.getProp(cmd.path).value = cmd.value;
            else
                console.warn("Permission denied for path", cmd.path);
        };
        /**
         * Hook up a suscription to property so that client will be notified by
         * the property's value. This notification will happen once initially
         * as soon as the value is available, and then whenever it changes.
         */
        Client.prototype.handleSubscribe = function (cmd) {
            if (!this.subscribedProps[cmd.path]) {
                this.subscribedProps[cmd.path] = true;
                var accessor = this.getProp(cmd.path);
                if (accessor.available) // Available right away - send it
                    this.tellPropValue(cmd.path, accessor.value);
            }
        };
        /**
         * Stop telling client about changes to specified property.
         */
        Client.prototype.handleUnsubscribe = function (cmd) {
            var path = cmd.path;
            this.getProp(path).close();
            delete this.openProps[path];
            delete this.sendProps[path];
            delete this.subscribedProps[path];
        };
        /**
         * Get property accessor, caching it in openProps if not already known.
         * I always register a change handler, which is potentially
         * somewhat wasteful (in case client only sets the property), but
         * that's essentially what happens under the hood anyway, so never
         * mind.
         */
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
        /**
         * Register value for property path to be sent soon.
         */
        Client.prototype.tellPropValue = function (path, value) {
            this.sendProps[path] = value;
            this.sendValuesSoon();
        };
        /**
         * Set up a timer (if not already one pending) to send values soonish.
         */
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
        /**
         * Send any values in sendProps now, as a JSON array of PropertyMessages.
         */
        Client.prototype.sendValuesNow = function () {
            var toSend = [];
            var sendProps = this.sendProps;
            for (var key in sendProps) {
                var value = sendProps[key];
                delete sendProps[key];
                toSend.push({ type: "prop", path: key, value: value });
                if (toSend.length >= 20) {
                    // Send at most this many values per batch
                    this.sendValuesSoon(); // Send remaining values soon
                    break;
                }
            }
            if (toSend.length)
                this.connection.sendText(JSON.stringify(toSend));
        };
        return Client;
    }());
});
