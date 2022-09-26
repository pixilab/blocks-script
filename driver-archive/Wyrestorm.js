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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata", "../system/SimpleFile"], function (require, exports, Driver_1, Metadata_1, SimpleFile_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Wyrestorm = void 0;
    var Wyrestorm = (function (_super) {
        __extends(Wyrestorm, _super);
        function Wyrestorm(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mDevicePower = false;
            _this.mDeviceName = socket.name;
            if (!Wyrestorm_1.connections)
                Wyrestorm_1.connections = {};
            _this.mMyConnection = Wyrestorm_1.getConnection(socket);
            _this.listenConnected();
            var configFile = _this.getConfigFileName();
            SimpleFile_1.SimpleFile.exists(configFile).then(function (result) {
                if (result === 1) {
                    SimpleFile_1.SimpleFile.readJson(configFile).then(function (config) { return _this.setupMultiView(config); });
                }
                else {
                    _this.setupSingleView();
                }
            });
            socket.subscribe('finish', function () {
                Wyrestorm_1.removeConnection(_this.mMyConnection);
            });
            return _this;
        }
        Wyrestorm_1 = Wyrestorm;
        Object.defineProperty(Wyrestorm.prototype, "power", {
            get: function () {
                return this.mDevicePower;
            },
            set: function (value) {
                this.mDevicePower = value;
                var pw = "off";
                if (value) {
                    pw = "on";
                }
                this.mMyConnection.doCommand("config set device sinkpower ".concat(pw, " ").concat(this.mDeviceName));
            },
            enumerable: false,
            configurable: true
        });
        Wyrestorm.prototype.setupMultiView = function (config) {
            var _this = this;
            this.mMultiviewConfig = config;
            var currentLayout;
            this.property('layout', { description: 'Set a layout by name as defined in config json.' }, function (value) {
                if (value && currentLayout !== value) {
                    currentLayout = value;
                    _this.setLayout(value);
                }
                return currentLayout;
            });
            this.tiles = this.indexedProperty('tiles', Tile);
            for (var i = 0; i < 9; i++) {
                this.tiles.push(new Tile(i, function () { return _this.scheduleApplyLayout(); }));
            }
        };
        Wyrestorm.prototype.setupSingleView = function () {
            var _this = this;
            var currentSource;
            this.property('source', { description: 'Alias for source (TX) we want to display' }, function (value) {
                var newSource = currentSource;
                if (value !== undefined)
                    newSource = value === '' ? null : value;
                if (currentSource !== newSource) {
                    currentSource = newSource;
                    console.log("Setting single source to ".concat(currentSource));
                    _this.mMyConnection.doCommand("matrix set ".concat(currentSource, " ").concat(_this.mDeviceName));
                }
                return currentSource;
            });
        };
        Wyrestorm.prototype.setLayout = function (layoutName) {
            this.mCurrentLayout = this.mMultiviewConfig.layouts[layoutName];
            if (!this.mCurrentLayout) {
                console.error("No layout with name \"".concat(layoutName, "\" configured."));
                return;
            }
            for (var i in this.mCurrentLayout.tiles) {
                var tile = this.mCurrentLayout.tiles[i];
                this.tiles[i].source = tile.source;
            }
            this.scheduleApplyLayout();
        };
        Wyrestorm.prototype.scheduleApplyLayout = function () {
            var _this = this;
            if (this.mApplyTilesDebounce)
                this.mApplyTilesDebounce.cancel();
            this.mApplyTilesDebounce = wait(250);
            this.mApplyTilesDebounce.then(function () { return _this.applyLayout(); });
        };
        Wyrestorm.prototype.applyLayout = function () {
            this.mApplyTilesDebounce = undefined;
            if (this.mCurrentLayout) {
                var command = "mview set ".concat(this.mDeviceName, " ").concat(this.mCurrentLayout.style);
                var tiles = this.tiles;
                for (var tileIx in this.mCurrentLayout.tiles) {
                    var tile = tiles[tileIx];
                    var tileConfig = this.mCurrentLayout.tiles[tileIx];
                    command += " ".concat(tile.source, ":").concat(tileConfig.x, "_").concat(tileConfig.y, "_").concat(tileConfig.width, "_").concat(tileConfig.height, ":").concat(tileConfig.scale);
                }
                this.mMyConnection.doCommand(command);
            }
            else
                console.error('No layout has been specified, do that before trying to set sources on tiles.');
        };
        Wyrestorm.prototype.getConfigFileName = function () {
            return "Wyrestorm.".concat(this.mDeviceName, ".json");
        };
        Wyrestorm.getConnection = function (socket) {
            var ip = socket.address;
            var connection = this.connections[ip];
            if (!connection) {
                connection = new Connection(socket);
                this.connections[ip] = connection;
            }
            connection.addNumUsers();
            return connection;
        };
        Wyrestorm.removeConnection = function (connection) {
            var existingConnection = this.connections[connection.getIP()];
            if (existingConnection && existingConnection.removeNumUsers() === 0) {
                delete this.connections[connection.getIP()];
            }
        };
        Wyrestorm.prototype.listenConnected = function () {
            var _this = this;
            var setGetConnected = function (value) {
                if (value !== undefined) {
                    _this.mConnected = value;
                }
                return _this.mConnected;
            };
            this.property('connected', { description: 'If this device is connected' }, setGetConnected);
            this.mMyConnection.socket.subscribe('connect', function (sender, message) {
                if (message.type === 'Connection')
                    _this.mConnected = sender.connected;
            });
        };
        var Wyrestorm_1;
        __decorate([
            (0, Metadata_1.property)("Send HDMI-CEC command to power on/off the device"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], Wyrestorm.prototype, "power", null);
        Wyrestorm = Wyrestorm_1 = __decorate([
            (0, Metadata_1.driver)('NetworkTCP', { port: 23 }),
            __metadata("design:paramtypes", [Object])
        ], Wyrestorm);
        return Wyrestorm;
    }(Driver_1.Driver));
    exports.Wyrestorm = Wyrestorm;
    var Tile = (function () {
        function Tile(tileIx, applyChanges) {
            this.tileIx = tileIx;
            this.applyChanges = applyChanges;
        }
        Object.defineProperty(Tile.prototype, "source", {
            get: function () {
                return this.mSource;
            },
            set: function (value) {
                var newSource = this.mSource;
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
            },
            enumerable: false,
            configurable: true
        });
        __decorate([
            (0, Metadata_1.property)('Source for tile'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], Tile.prototype, "source", null);
        return Tile;
    }());
    var Connection = (function () {
        function Connection(mSocket) {
            this.mSocket = mSocket;
            mSocket.autoConnect();
            mSocket.subscribe('textReceived', function (sender, message) {
                if (message.text.indexOf('failure') !== -1)
                    console.log(message.text);
            });
        }
        Connection.prototype.doCommand = function (command) {
            this.mSocket.sendText(command, '\r\n');
        };
        Connection.prototype.addNumUsers = function () {
            this.mNumUsers++;
        };
        Connection.prototype.removeNumUsers = function () {
            this.mNumUsers--;
            return this.mNumUsers;
        };
        Connection.prototype.getIP = function () {
            return this.mSocket.address;
        };
        Connection.prototype.disconnect = function () {
            this.mSocket.disconnect();
        };
        Object.defineProperty(Connection.prototype, "socket", {
            get: function () {
                return this.mSocket;
            },
            enumerable: false,
            configurable: true
        });
        return Connection;
    }());
});
