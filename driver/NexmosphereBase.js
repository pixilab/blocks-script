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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata", "../system_lib/ScriptBase"], function (require, exports, Driver_1, Metadata_1, ScriptBase_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.log = exports.normalize = exports.limitedVal = exports.toHex = exports.padVal = exports.NexmosphereBase = void 0;
    var kRfidPacketParser = /^XR\[P(.)(\d+)]/;
    var kXTalkPacketParser = /^X(\d+)([AB])\[(.+)]/;
    var kCtrlPacketParser = /^([PS])(\d+)([AB])\[(.+)]/;
    var kProductCodeParser = /D(\d+)B\[\w+=([^\]]+)]/;
    var kUdpPacketParser = /^FROMID=([0-9A-F]{2}(?::[0-9A-F]{2}){5}):(.+)/;
    var kUdpRuntimeParser = /RUNTIME=(\d+)HOUR/;
    var NEXMOSPHERE_COMMAND_DELAY_MS = 280;
    var _debugLogging = true;
    var NexmosphereBase = (function (_super) {
        __extends(NexmosphereBase, _super);
        function NexmosphereBase(port, numbOfInterfaces) {
            var _this = this;
            var _a, _b;
            _this = _super.call(this, port) || this;
            _this.port = port;
            _this.pollEnabled = true;
            _this.pollStopped = false;
            _this.pollQueryCount = 0;
            _this.maxPollRounds = 10;
            _this.numInterfaces = 8;
            _this.pollIndex = 0;
            _this.awake = false;
            _this.udpConnected = false;
            _this.waitingForUdpHartbeat = false;
            _this.dynProps = {};
            _this.myDeviceID = "";
            _this.msgQueue = [];
            _this.isBusyProcessingQueue = false;
            _this.element = _this.namedAggregateProperty("element", BaseInterface);
            _this.interface = [];
            if (port.enabled) {
                if (port.options) {
                    var options = JSON.parse(port.options);
                    if (typeof options === "number") {
                        _this.numInterfaces = options;
                        _this.pollEnabled = true;
                    }
                    if (typeof options === "object") {
                        if ((_a = options.device) === null || _a === void 0 ? void 0 : _a.udpDeviceID) {
                            _this.myDeviceID = options.device.udpDeviceID;
                            log("Using hardcoded device ID for UDP:", _this.myDeviceID);
                        }
                        if (((_b = options.interfaces) === null || _b === void 0 ? void 0 : _b.length) > 0) {
                            _this.addInterfaces(options.interfaces);
                        }
                        else {
                            _this.addInterfaces(options);
                        }
                    }
                }
                console.log("Driver enabled");
                if (numbOfInterfaces) {
                    log("Subclass has number of  ports: " + numbOfInterfaces);
                    _this.numInterfaces = numbOfInterfaces;
                }
            }
            return _this;
        }
        NexmosphereBase.prototype.addInterfaces = function (ifaces) {
            this.pollEnabled = false;
            for (var _i = 0, ifaces_1 = ifaces; _i < ifaces_1.length; _i++) {
                var iface = ifaces_1[_i];
                log("Specified interfaces", iface.ifaceNo, iface.modelCode, iface.name);
                this.addInterface(iface.ifaceNo, iface.modelCode, iface.name);
            }
        };
        Object.defineProperty(NexmosphereBase.prototype, "connected", {
            get: function () {
                return this.considerConnected();
            },
            enumerable: false,
            configurable: true
        });
        NexmosphereBase.prototype.isUDP = function () {
            return this.port.isOfTypeName("NetworkUDP");
        };
        NexmosphereBase.prototype.hasInterfaces = function () {
            return !!this.interface.length;
        };
        NexmosphereBase.prototype.setUdpConnected = function (val) {
            if (this.udpConnected === val)
                return;
            var prev = this.udpConnected;
            log("Setting UDP connected to", val);
            this.udpConnected = val;
            this.changed("connected");
            if (val && !prev && this.pollStopped) {
                log("UDP reconnected - resetting polling");
                this.pollStopped = false;
                this.pollQueryCount = 0;
                this.pollIndex = 0;
                if (this.pollEnabled)
                    this.pollNext();
            }
        };
        NexmosphereBase.prototype.stripFromId = function (input) {
            var lastColonIndex = input.lastIndexOf(":");
            if (lastColonIndex === -1)
                return input;
            return input.slice(lastColonIndex + 1);
        };
        NexmosphereBase.prototype.considerConnected = function () {
            return this.udpConnected;
        };
        NexmosphereBase.registerInterface = function (ctor) {
            var modelName = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                modelName[_i - 1] = arguments[_i];
            }
            if (!NexmosphereBase.interfaceRegistry)
                NexmosphereBase.interfaceRegistry = {};
            modelName.forEach(function (name) {
                NexmosphereBase.interfaceRegistry[name] = ctor;
            });
        };
        NexmosphereBase.prototype.initConnection = function (port) {
            var _this = this;
            this.port.autoConnect();
            port.subscribe('connect', function (sender, message) {
                if (message.type === 'Connection' && port.connected) {
                    log("Connected", _this.pollEnabled);
                    if (_this.pollStopped) {
                        log("Reconnected - resetting polling");
                        _this.pollStopped = false;
                        _this.pollQueryCount = 0;
                        _this.pollIndex = 0;
                    }
                    if (!_this.pollIndex && _this.pollEnabled)
                        _this.pollNext();
                }
                else {
                    log("Disconnected");
                    if (!_this.interface.length)
                        _this.pollIndex = 0;
                }
            });
            this.port.subscribe('textReceived', function (sender, message) {
                if (!message.text)
                    return;
                if (!_this.awake) {
                    _this.awake = true;
                    _this.pollIndex = 0;
                }
                _this.handleMessage(message.text);
            });
        };
        NexmosphereBase.prototype.initUdp = function () {
            var _this = this;
            this.port.subscribe('textReceived', function (sender, message) {
                if (!message.text)
                    return;
                log("Incoming data in subscription", message.text);
                _this.setUdpConnected(true);
                if (!_this.awake) {
                    _this.awake = true;
                    _this.pollIndex = 0;
                    _this.waitingForUdpHartbeat = false;
                    if (_this.pollEnabled)
                        _this.pollNext();
                }
                _this.handleMessage(message.text);
            });
            this.subscribe('finish', function () {
                _this.stopUdpHartbeat();
                _this.setUdpConnected(false);
                console.log("Driver disabled, shutdown");
            });
            this.initDynamicProp("runtime", Number);
            this.initDynamicProp("deviceID", String);
            this.sendUdpHartbeat();
        };
        NexmosphereBase.prototype.initDynamicProp = function (propname, type) {
            var _this = this;
            var onSetCallbacks = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                onSetCallbacks[_i - 2] = arguments[_i];
            }
            this.property(propname, { type: type }, function (sv) {
                if (sv !== undefined) {
                    if (_this.dynProps[propname] !== sv) {
                        _this.dynProps[propname] = sv;
                        _this.changed(propname);
                        for (var _i = 0, onSetCallbacks_1 = onSetCallbacks; _i < onSetCallbacks_1.length; _i++) {
                            var cb = onSetCallbacks_1[_i];
                            cb(sv);
                        }
                    }
                }
                return _this.dynProps[propname];
            });
        };
        NexmosphereBase.prototype.sendUdpHartbeat = function () {
            var _this = this;
            log("Scheduling next UDP hartbeat poll", this.port.enabled);
            this.send("N000B[RUNTIME?]");
            this.waitingForUdpHartbeat = true;
            this.udpResponsTestInterval = wait(5000);
            this.udpResponsTestInterval.then(function () {
                if (_this.waitingForUdpHartbeat && _this.considerConnected()) {
                    console.log(" UDP hartbeat reply missing, change connected status false");
                    _this.setUdpConnected(false);
                }
                _this.sendUdpHartbeat();
            });
        };
        NexmosphereBase.prototype.stopUdpHartbeat = function () {
            log("Stopping UDP hartbeat polling");
            if (this.udpResponsTestInterval) {
                this.udpResponsTestInterval.cancel();
                this.udpResponsTestInterval = undefined;
            }
        };
        NexmosphereBase.prototype.pollNext = function () {
            var _this = this;
            if (!this.pollEnabled)
                return;
            if (this.pollStopped)
                return;
            if (!this.considerConnected())
                return;
            var fullRounds = Math.floor(this.pollQueryCount / this.numInterfaces);
            if (fullRounds >= this.maxPollRounds && !this.interface.length) {
                log("Polling timeout after", fullRounds, "rounds - stopping");
                this.pollStopped = true;
                return;
            }
            var ix = this.pollIndex + 1 | 0;
            if (ix % 10 === 9) {
                var tens = Math.round(ix / 10);
                if (ix < 200) {
                    switch (tens) {
                        case 0:
                            ix = 111;
                            break;
                        case 11:
                        case 12:
                        case 13:
                        case 14:
                        case 15:
                            ix += 2;
                            break;
                        case 16:
                            ix = 211;
                            break;
                    }
                }
                else {
                    switch (tens % 10) {
                        case 1:
                        case 2:
                        case 3:
                        case 4:
                            ix += 2;
                            break;
                        case 5:
                            if (ix >= 959)
                                throw "Port number is out of range for the device.";
                            ix += 311 - 259;
                            break;
                    }
                }
            }
            this.pollIndex = ix;
            this.queryPortConfig(ix);
            this.pollQueryCount++;
            var pollAgain = false;
            log("Poll again?:" + pollAgain, this.pollIndex, this.numInterfaces, this.considerConnected());
            if (this.pollIndex < this.numInterfaces)
                pollAgain = true;
            else if (!this.interface.length) {
                this.pollIndex = 0;
                pollAgain = true;
            }
            if (pollAgain && !this.pollStopped && this.considerConnected())
                wait(500).then(function () { return _this.pollNext(); });
        };
        NexmosphereBase.prototype.queryPortConfig = function (portNumber) {
            var typeQuery = padVal(portNumber, 3);
            typeQuery = "D" + typeQuery + "B[TYPE]";
            log("Query ", typeQuery);
            this.send(typeQuery, true);
        };
        NexmosphereBase.prototype.send = function (rawData, priority) {
            var _this = this;
            if (priority === void 0) { priority = false; }
            log("Queue msg: ", rawData);
            var task = function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (this.isUDP())
                        this.port.sendText(rawData + "\r\n");
                    else
                        this.port.sendText(rawData, "\r\n");
                    log("Send msg: ", rawData);
                    return [2];
                });
            }); };
            this.msgQueue.push(task);
            if (priority) {
                this.msgQueue.unshift(task);
            }
            else {
                this.msgQueue.push(task);
            }
            this.processQueue();
        };
        NexmosphereBase.prototype.processQueue = function () {
            return __awaiter(this, void 0, void 0, function () {
                var task;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (this.isBusyProcessingQueue)
                                return [2];
                            this.isBusyProcessingQueue = true;
                            _a.label = 1;
                        case 1:
                            if (!(this.msgQueue.length > 0)) return [3, 5];
                            log("Processing queue, length:", this.msgQueue.length);
                            if (this.msgQueue.length > 20) {
                                console.warn("Nexmosphere command queue is growing! Current size: ".concat(this.msgQueue.length));
                            }
                            task = this.msgQueue.shift();
                            if (!task) return [3, 3];
                            return [4, task()];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3: return [4, commandDelay()];
                        case 4:
                            _a.sent();
                            return [3, 1];
                        case 5:
                            this.isBusyProcessingQueue = false;
                            return [2];
                    }
                });
            });
        };
        NexmosphereBase.prototype.reInitialize = function () {
            _super.prototype.reInitialize.call(this);
        };
        NexmosphereBase.prototype.debugLogging = function (value) {
            _debugLogging = value;
            console.log("Nexmosphere debug logging enabled:", _debugLogging);
        };
        NexmosphereBase.prototype.handleMessage = function (msg) {
            var _this = this;
            log("Raw data recieved in handleMessage", msg);
            var handlers = [
                [kUdpPacketParser, function (parseResult) {
                        log("UDP Packet parsed in handler", msg);
                        var innerMsg = parseResult[2];
                        var id = parseResult[1];
                        if (!_this.dynProps["deviceID"]) {
                            if (innerMsg.indexOf("RUNTIME=") && !_this.myDeviceID) {
                                _this.dynProps["deviceID"] = id;
                                console.log("Setting deviceID from UDP sender", id);
                            }
                            else if (_this.myDeviceID) {
                                _this.dynProps["deviceID"] = _this.myDeviceID;
                                console.log("Using hardcoded deviceID for UDP:", _this.myDeviceID);
                            }
                        }
                        if (_this.dynProps["deviceID"] !== id) {
                            log("Ignoring UDP message from other device", id, "expected", _this.dynProps["deviceID"]);
                            return;
                        }
                        _this.handleMessage(innerMsg);
                    }],
                [kRfidPacketParser, function (parseResult) {
                        log("RFID tag event parsed in handler", msg);
                        _this.lastTag = {
                            isPlaced: parseResult[1] === "B",
                            tagNumber: parseInt(parseResult[2])
                        };
                    }],
                [kXTalkPacketParser, function (parseResult) {
                        var portNumber = parseInt(parseResult[1]);
                        var dataReceived = parseResult[3];
                        log("Xtalk data parsed in handler from port", portNumber, "Data", dataReceived);
                        var interfacePort = _this.interface[portNumber - 1];
                        if (interfacePort) {
                            interfacePort.receiveData(dataReceived, _this.lastTag);
                        }
                        else {
                            console.warn("Message from unexpected port", portNumber);
                        }
                    }],
                [kCtrlPacketParser, function (parseResult) {
                        var msgType = parseResult[1];
                        var portNumber = parseInt(parseResult[2]);
                        var dataReceived = parseResult[4];
                        log("Controller message of type", msgType, "parsed in handler from port", portNumber, "Data", dataReceived);
                        _this.handleControllerMessage(dataReceived);
                    }],
                [kProductCodeParser, function (parseResult) {
                        log("TypeQReply parsed in handler", msg);
                        var modelCode = parseResult[2].trim();
                        var portNumber = parseInt(parseResult[1]);
                        _this.addInterface(portNumber, modelCode);
                    }],
                [kUdpRuntimeParser, function (parseResult) {
                        log("UDP Hartbeat reply parsed in handler", msg);
                        if (_this.isUDP() && _this.waitingForUdpHartbeat) {
                            var runtimeHours = parseInt(parseResult[1]);
                            if (_this.dynProps["runtime"] === runtimeHours)
                                return;
                            _this.dynProps["runtime"] = runtimeHours;
                            _this.changed("runtime");
                        }
                        _this.waitingForUdpHartbeat = false;
                    }]
            ];
            for (var _i = 0, handlers_1 = handlers; _i < handlers_1.length; _i++) {
                var _a = handlers_1[_i], regex = _a[0], handler = _a[1];
                var parseResult = regex.exec(msg);
                if (parseResult) {
                    handler(parseResult, msg);
                    return;
                }
            }
            console.warn("Unknown command received from controller", typeof msg, msg);
        };
        NexmosphereBase.prototype.handleControllerMessage = function (message) {
            return;
        };
        NexmosphereBase.prototype.addInterface = function (portNumber, modelCode, name, channel) {
            var ix = portNumber - 1;
            var ctor = NexmosphereBase.interfaceRegistry[modelCode];
            if (!ctor) {
                console.warn("Unknown interface model - using generic 'unknown' type", modelCode);
                ctor = UnknownInterface;
            }
            log("Adding interface", portNumber, modelCode, name || "", channel || "");
            var iface = new ctor(this, ix, channel);
            var ifaceName = name;
            var ifaceChannel = channel;
            if (!ifaceName) {
                ifaceName = iface.userFriendlyName();
                if (!(iface instanceof UnknownInterface))
                    ifaceName = ifaceName + '_' + modelCode;
                ifaceName = ifaceName + '_' + portNumber;
                if (ifaceChannel)
                    ifaceName = ifaceName + '_' + ifaceChannel;
            }
            this.interface[ix] = this.element[ifaceName] = iface;
        };
        NexmosphereBase.prototype.addBuiltInInterfaces = function (specialPorts) {
            for (var _i = 0, specialPorts_1 = specialPorts; _i < specialPorts_1.length; _i++) {
                var specialPort = specialPorts_1[_i];
                log("Adding controller onboard interface", specialPort[0], specialPort[1], specialPort[2]);
                this.addInterface(specialPort[1], specialPort[0], undefined, specialPort[2]);
            }
        };
        __decorate([
            (0, Metadata_1.property)("Connected to Nexmosphere device", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], NexmosphereBase.prototype, "connected", null);
        __decorate([
            (0, Metadata_1.callable)("Send raw string data to the Nexmosphere controller"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Boolean]),
            __metadata("design:returntype", void 0)
        ], NexmosphereBase.prototype, "send", null);
        __decorate([
            (0, Metadata_1.callable)("Re-initialize driver, after changing device configuration"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], NexmosphereBase.prototype, "reInitialize", null);
        __decorate([
            (0, Metadata_1.callable)("Enable logging "),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Boolean]),
            __metadata("design:returntype", void 0)
        ], NexmosphereBase.prototype, "debugLogging", null);
        return NexmosphereBase;
    }(Driver_1.Driver));
    exports.NexmosphereBase = NexmosphereBase;
    function commandDelay() {
        return new Promise(function (resolve) {
            wait(NEXMOSPHERE_COMMAND_DELAY_MS).then(function () {
                resolve();
            });
        });
    }
    var BaseInterface = (function (_super) {
        __extends(BaseInterface, _super);
        function BaseInterface(driver, index, name, channel) {
            var _this = _super.call(this) || this;
            _this.driver = driver;
            _this.index = index;
            _this.name = name;
            _this.channel = channel;
            _this.collectors = {};
            _this._channel = channel;
            return _this;
        }
        BaseInterface.prototype.ifaceNo = function () {
            return padVal(this.index + 1);
        };
        BaseInterface.prototype.sendData = function (data) {
            this.driver.send(data);
        };
        BaseInterface.prototype.receiveData = function (data, tag) {
            console.log("Unexpected data recieved on interface " + this.index + " " + data);
        };
        BaseInterface.prototype.createBurstCollector = function (name, sendFn, delay, prefix, suffix, maxLength) {
            var _this = this;
            if (delay === void 0) { delay = 20; }
            if (prefix === void 0) { prefix = ''; }
            if (suffix === void 0) { suffix = ''; }
            if (maxLength === void 0) { maxLength = Infinity; }
            if (!this.collectors[name]) {
                this.collectors[name] = { buffer: '', timer: null, blocked: false };
            }
            return function (ch) {
                var collector = _this.collectors[name];
                if (collector.blocked)
                    return;
                collector.buffer += ch;
                if (collector.buffer.length >= maxLength) {
                    sendFn(prefix + collector.buffer.slice(0, maxLength) + suffix);
                    collector.buffer = '';
                    collector.blocked = true;
                    if (collector.timer)
                        collector.timer.cancel();
                    collector.timer = wait(delay);
                    collector.timer
                        .then(function () {
                        collector.blocked = false;
                        collector.timer = null;
                    })
                        .catch(function () { });
                    return;
                }
                if (collector.timer)
                    collector.timer.cancel();
                collector.timer = wait(delay);
                collector.timer
                    .then(function () {
                    if (collector.buffer) {
                        sendFn(prefix + collector.buffer);
                        collector.buffer = '';
                    }
                    collector.timer = null;
                })
                    .catch(function () { });
            };
        };
        BaseInterface.prototype.userFriendlyName = function () {
            return "Unknown";
        };
        return BaseInterface;
    }(ScriptBase_1.AggregateElem));
    var UnknownInterface = (function (_super) {
        __extends(UnknownInterface, _super);
        function UnknownInterface() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(UnknownInterface.prototype, "unknown", {
            get: function () {
                return this.propValue;
            },
            set: function (value) {
                this.propValue = value;
            },
            enumerable: false,
            configurable: true
        });
        UnknownInterface.prototype.receiveData = function (data) {
            this.unknown = data;
        };
        __decorate([
            (0, Metadata_1.property)("Raw data last received from unknown device type", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], UnknownInterface.prototype, "unknown", null);
        return UnknownInterface;
    }(BaseInterface));
    var RfidInterface = (function (_super) {
        __extends(RfidInterface, _super);
        function RfidInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mTagNumber = 0;
            _this.mIsPlaced = false;
            return _this;
        }
        Object.defineProperty(RfidInterface.prototype, "tagNumber", {
            get: function () {
                return this.mTagNumber;
            },
            set: function (value) {
                this.mTagNumber = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(RfidInterface.prototype, "isPlaced", {
            get: function () { return this.mIsPlaced; },
            set: function (value) { this.mIsPlaced = value; },
            enumerable: false,
            configurable: true
        });
        RfidInterface.prototype.receiveData = function (data, tag) {
            this.isPlaced = tag.isPlaced;
            this.tagNumber = tag.tagNumber;
        };
        RfidInterface.prototype.userFriendlyName = function () {
            return "RFID";
        };
        __decorate([
            (0, Metadata_1.property)("Last recieved RFID tag ID", false),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], RfidInterface.prototype, "tagNumber", null);
        __decorate([
            (0, Metadata_1.property)("RFID tag is detected", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], RfidInterface.prototype, "isPlaced", null);
        return RfidInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(RfidInterface, "XRDR1");
    var NfcInterface = (function (_super) {
        __extends(NfcInterface, _super);
        function NfcInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.lastTagEvent = "";
            _this.mTagUID = "";
            _this.mIsPlaced = false;
            return _this;
        }
        Object.defineProperty(NfcInterface.prototype, "tagUID", {
            get: function () { return this.mTagUID; },
            set: function (value) { this.mTagUID = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(NfcInterface.prototype, "isPlaced", {
            get: function () { return this.mIsPlaced; },
            set: function (value) { this.mIsPlaced = value; },
            enumerable: false,
            configurable: true
        });
        NfcInterface.prototype.receiveData = function (data) {
            console.log(data);
            var splitData = data.split(":");
            var newTagData = splitData[1];
            var newTagEvent = splitData[0];
            this.lastTagEvent = newTagEvent;
            switch (newTagEvent) {
                case "TD=UID":
                    this.isPlaced = true;
                    this.tagUID = newTagData;
                    break;
                case "TR=UID":
                    this.isPlaced = false;
                    break;
                default:
                    _super.prototype.receiveData.call(this, data);
                    break;
            }
        };
        NfcInterface.prototype.userFriendlyName = function () {
            return "NFC";
        };
        __decorate([
            (0, Metadata_1.property)("Last recieved tag UID", false),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], NfcInterface.prototype, "tagUID", null);
        __decorate([
            (0, Metadata_1.property)("A tag is placed", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], NfcInterface.prototype, "isPlaced", null);
        return NfcInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(NfcInterface, "XRDW2");
    var XWaveLedInterface = (function (_super) {
        __extends(XWaveLedInterface, _super);
        function XWaveLedInterface() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Object.defineProperty(XWaveLedInterface.prototype, "X_Wave_Command", {
            get: function () { return this._command; },
            set: function (value) {
                this.sendData("X" + this.ifaceNo() + "B[" + value + "]");
                this._command = value;
            },
            enumerable: false,
            configurable: true
        });
        XWaveLedInterface.prototype.defineColor = function (color, red, green, blue) {
            var c = toHex(limitedVal(color, 0, 15), 1);
            var rr = toHex(limitedVal(red, 0, 255));
            var gg = toHex(limitedVal(green, 0, 255));
            var bb = toHex(limitedVal(blue, 0, 255));
            var cmd = "1" + c + rr + gg + bb;
            this.X_Wave_Command = cmd;
        };
        XWaveLedInterface.prototype.setSingleRamp = function (brightness, color, ramp) {
            var bb = padVal(limitedVal(brightness, 0, 99), 2);
            var c = toHex(limitedVal(color, 0, 15), 1);
            var tt = padVal(limitedVal(ramp, 0, 99), 2);
            var cmd = "2" + bb + c + tt;
            this.X_Wave_Command = cmd;
        };
        XWaveLedInterface.prototype.setPulsing = function (brightness1, color1, time1, brightness2, color2, time2, repeats, ramp) {
            if (repeats === void 0) { repeats = 0; }
            var II1 = padVal(limitedVal(brightness1, 0, 99), 2);
            var c1 = toHex(limitedVal(color1, 0, 15), 1);
            var tt1 = padVal(limitedVal(time1, 0, 99), 2);
            var II2 = padVal(limitedVal(brightness2, 0, 99), 2);
            var c2 = toHex(limitedVal(color2, 0, 15), 1);
            var tt2 = padVal(limitedVal(time2, 0, 99), 2);
            var nn = padVal(limitedVal(repeats, 0, 99), 2);
            var rr = padVal(limitedVal(ramp, 2, Math.min(parseInt(tt1), parseInt(tt2), 99)), 2);
            var cmd = "3" + II1 + c1 + tt1 + "01" + "0" + II2 + c2 + tt2 + nn + rr;
            ;
            this.X_Wave_Command = cmd;
        };
        XWaveLedInterface.prototype.setWave = function (brightness1, color1, duration, program, option, brightness2, color2, leds) {
            var bb1 = padVal(limitedVal(brightness1, 0, 99), 2);
            var c1 = toHex(limitedVal(color1, 0, 15), 1);
            var dd = padVal(limitedVal(duration, 1, 99), 2);
            var pp = padVal(limitedVal(program, 0, 59), 2);
            var o = limitedVal(option, 1, 4);
            var bb2 = padVal(limitedVal(brightness2, 0, 99), 2);
            var c2 = toHex(limitedVal(color2, 0, 15), 1);
            var nn = padVal(limitedVal(leds, 1, 99), 2);
            var cmd = "4" + bb1 + c1 + dd + pp + o + bb2 + c2 + "00" + nn;
            this.X_Wave_Command = cmd;
        };
        XWaveLedInterface.prototype.userFriendlyName = function () {
            return "LED";
        };
        __decorate([
            (0, Metadata_1.property)('X-Wave api command to send e.g. "290C99"'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], XWaveLedInterface.prototype, "X_Wave_Command", null);
        __decorate([
            (0, Metadata_1.callable)("Define a custom color"),
            __param(0, (0, Metadata_1.parameter)("color id 0-15")),
            __param(1, (0, Metadata_1.parameter)("red 0-255")),
            __param(2, (0, Metadata_1.parameter)("green 0-255")),
            __param(3, (0, Metadata_1.parameter)("blue 0-255")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], XWaveLedInterface.prototype, "defineColor", null);
        __decorate([
            (0, Metadata_1.callable)("Set state (single ramp)"),
            __param(0, (0, Metadata_1.parameter)("LED Brightness 0-99")),
            __param(1, (0, Metadata_1.parameter)("color 0-15")),
            __param(2, (0, Metadata_1.parameter)("ramptime 0-99(x0.1s)")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], XWaveLedInterface.prototype, "setSingleRamp", null);
        __decorate([
            (0, Metadata_1.callable)("Set state (pulsing)"),
            __param(0, (0, Metadata_1.parameter)("State 1 LED Brightness 0-99")),
            __param(1, (0, Metadata_1.parameter)("State 1 color 0-15")),
            __param(2, (0, Metadata_1.parameter)("State 1 time 1-99(x0.1s)")),
            __param(3, (0, Metadata_1.parameter)("State 2 LED Brightness 0-99")),
            __param(4, (0, Metadata_1.parameter)("State 2 color 0-15")),
            __param(5, (0, Metadata_1.parameter)("State 2 time 1-99(x0.1s)")),
            __param(6, (0, Metadata_1.parameter)("Number of repeats 0=infinite 0-99")),
            __param(7, (0, Metadata_1.parameter)("Ramp time 2-99 must be smaller than time 1 and time 2")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number, Number, Number, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], XWaveLedInterface.prototype, "setPulsing", null);
        __decorate([
            (0, Metadata_1.callable)("Set state (wave)"),
            __param(0, (0, Metadata_1.parameter)("State 1 LED Brightness 0-99")),
            __param(1, (0, Metadata_1.parameter)("State 1 color 0-15")),
            __param(2, (0, Metadata_1.parameter)("State 1 animation duration 1-99(x0.1s)")),
            __param(3, (0, Metadata_1.parameter)("Program 00-01 (sinewave) or 51-59 (discrete)00 = Symmetrical sinewave   01 = Asymmetrical sinewave51-59 = Discrete running light (1-9 LEDs “running”)")),
            __param(4, (0, Metadata_1.parameter)("Option  indicates direction  -  01-04 1 = Left   2 = Right   3 = Outwards   4 = Inwards")),
            __param(5, (0, Metadata_1.parameter)("State 2 LED Brightness 0-99")),
            __param(6, (0, Metadata_1.parameter)("State 2 color 0-15")),
            __param(7, (0, Metadata_1.parameter)("Numb er of LEDs in animation 1-99")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number, Number, Number, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], XWaveLedInterface.prototype, "setWave", null);
        return XWaveLedInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(XWaveLedInterface, "XWC56", "XWL56", "XW");
    var stateTooltip = "Define as Segment state 0-4 (Will translate to api designators '&', '+', '-', '$', '%') defaults to 0 = background ('&')";
    var segmentStateDesignator = ['&', '+', '-', '$', '%'];
    var LightmarkLedInterface = (function (_super) {
        __extends(LightmarkLedInterface, _super);
        function LightmarkLedInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.send = function (s) { _this.command = s; };
            _this.addSegment = _this.createBurstCollector('segment', _this.send, 25, "[Sd=", "]", 26);
            _this.addStates = _this.createBurstCollector('state', _this.send, 25, "[Sd=", "]");
            return _this;
        }
        Object.defineProperty(LightmarkLedInterface.prototype, "command", {
            get: function () { return this._command; },
            set: function (cmd) {
                this.sendCommand(cmd);
                this._command = cmd;
            },
            enumerable: false,
            configurable: true
        });
        LightmarkLedInterface.prototype.defineColor = function (color, red, green, blue, white) {
            var c = toHex(limitedVal(color, 0, 15), 1);
            var rr = toHex(limitedVal(red, 0, 255));
            var gg = toHex(limitedVal(green, 0, 255));
            var bb = toHex(limitedVal(blue, 0, 255));
            var ww = toHex(limitedVal(white, 0, 255));
            var cmd = "Cc=" + c + rr + gg + bb + ww;
            this.command = "B[" + cmd + "]";
        };
        LightmarkLedInterface.prototype.setSingleRamp = function (brightness, color, ramp, state) {
            if (state === void 0) { state = 0; }
            var bb = padVal(limitedVal(brightness, 0, 99), 2);
            var c = toHex(limitedVal(color, 0, 15), 1);
            var tt = padVal(limitedVal(ramp, 0, 99), 2);
            var ss = limitedVal(state, 0, 4);
            var cmd = "R" + bb + c + tt;
            if (ss)
                cmd = "Ss=" + segmentStateDesignator[state] + cmd;
            else
                cmd = "Lc=" + cmd;
            this.command = "B[" + cmd + "]";
        };
        LightmarkLedInterface.prototype.setPulsing = function (brightness1, color1, time1, brightness2, color2, time2, repeats, ramp, state) {
            if (repeats === void 0) { repeats = 0; }
            if (state === void 0) { state = 0; }
            var bb1 = padVal(limitedVal(brightness1, 0, 99), 2);
            var c1 = toHex(limitedVal(color1, 0, 15), 1);
            var tt1 = padVal(limitedVal(time1, 0, 99), 2);
            var bb2 = padVal(limitedVal(brightness2, 0, 99), 2);
            var c2 = toHex(limitedVal(color2, 0, 15), 1);
            var tt2 = padVal(limitedVal(time2, 0, 99), 2);
            var nn = padVal(limitedVal(repeats, 0, 99), 2);
            var rr = padVal(limitedVal(ramp, 2, Math.min(parseInt(tt1), parseInt(tt2), 99)), 2);
            var ss = limitedVal(state, 0, 4);
            var cmd = "P" + bb1 + c1 + tt1 + "01" + "0" + bb2 + c2 + tt2 + nn + rr;
            ;
            if (ss)
                cmd = "Ss=" + segmentStateDesignator[state] + cmd;
            else
                cmd = "Lc=" + cmd;
            this.command = "B[" + cmd + "]";
        };
        LightmarkLedInterface.prototype.setWave = function (brightness1, color1, duration, program, option, brightness2, color2, leds, state) {
            if (state === void 0) { state = 0; }
            var bb1 = padVal(limitedVal(brightness1, 0, 99), 2);
            var c1 = toHex(limitedVal(color1, 0, 15), 1);
            var d = padVal(limitedVal(duration, 1, 99), 2);
            var pp = padVal(limitedVal(program, 0, 59), 2);
            var o = limitedVal(option, 1, 4);
            var bb2 = padVal(limitedVal(brightness2, 0, 99), 2);
            var c2 = toHex(limitedVal(color2, 0, 15), 1);
            var nn = padVal(limitedVal(leds, 1, 99), 2);
            var ss = limitedVal(state, 0, 4);
            var cmd = "W" + bb1 + c1 + d + pp + o + bb2 + c2 + "00" + nn;
            if (ss)
                cmd = "Ss=" + segmentStateDesignator[state] + cmd;
            else
                cmd = "Lc=" + cmd;
            this.command = "B[" + cmd + "]";
        };
        LightmarkLedInterface.prototype.defineSegment = function (segment) {
            this.addSegment(toHex(limitedVal(segment, 1, 15), 1));
        };
        LightmarkLedInterface.prototype.setState = function (segments, state) {
            if (segments === void 0) { segments = "#"; }
            if (state === void 0) { state = 0; }
            var ss = limitedVal(state, 0, 4);
            var segs = segments.replace(/[^a-zA-Z#]/g, '');
            this.addStates(segmentStateDesignator[ss] + segs);
        };
        LightmarkLedInterface.prototype.setAnimationFadeTime = function (fadetime, state) {
            if (state === void 0) { state = 0; }
            var ss = limitedVal(state, 0, 4);
            var ft = limitedVal(fadetime, 1, 100);
            var cmd = ss + 15 + ":" + ft;
            this.command = "S[" + cmd + "]";
        };
        LightmarkLedInterface.prototype.setStateFadeTime = function (fadetime, state) {
            if (state === void 0) { state = 0; }
            var ss = limitedVal(state, 0, 4);
            var ft = limitedVal(fadetime, 1, 100);
            var cmd = ss + 20 + ":" + ft;
            this.command = "S[" + cmd + "]";
        };
        LightmarkLedInterface.prototype.setSegmentBlend = function (blendWidth, state) {
            if (state === void 0) { state = 0; }
            var ss = limitedVal(state, 0, 4);
            var ft = limitedVal(blendWidth, 1, 6);
            var cmd = ss + 25 + ":" + ft;
            this.command = "S[" + cmd + "]";
        };
        LightmarkLedInterface.prototype.sendCommand = function (cmd) {
            this.sendData("X" + this.ifaceNo() + cmd);
        };
        LightmarkLedInterface.prototype.userFriendlyName = function () {
            return "LED";
        };
        __decorate([
            (0, Metadata_1.property)("Lightmark command to send ('Cc=ARRGGBB]') e.g 'Cc=100FF1F', if read it will return last sent command."),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], LightmarkLedInterface.prototype, "command", null);
        __decorate([
            (0, Metadata_1.callable)("Define a custom color"),
            __param(0, (0, Metadata_1.parameter)("color id 0-15")),
            __param(1, (0, Metadata_1.parameter)("red 0-255")),
            __param(2, (0, Metadata_1.parameter)("green 0-255")),
            __param(3, (0, Metadata_1.parameter)("blue 0-255")),
            __param(4, (0, Metadata_1.parameter)("white 0-255")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], LightmarkLedInterface.prototype, "defineColor", null);
        __decorate([
            (0, Metadata_1.callable)("Set state (single ramp)"),
            __param(0, (0, Metadata_1.parameter)("LED Brightness 0-99")),
            __param(1, (0, Metadata_1.parameter)("color 0-15")),
            __param(2, (0, Metadata_1.parameter)("ramptime 0-99(x0.1s)")),
            __param(3, (0, Metadata_1.parameter)(stateTooltip, true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], LightmarkLedInterface.prototype, "setSingleRamp", null);
        __decorate([
            (0, Metadata_1.callable)("Set state (pulsing)"),
            __param(0, (0, Metadata_1.parameter)("State 1 LED Brightness 0-99")),
            __param(1, (0, Metadata_1.parameter)("State 1 color 0-15")),
            __param(2, (0, Metadata_1.parameter)("State 1 time 1-99(x0.1s)")),
            __param(3, (0, Metadata_1.parameter)("State 2 LED Brightness 0-99")),
            __param(4, (0, Metadata_1.parameter)("State 2 color 0-15")),
            __param(5, (0, Metadata_1.parameter)("State 2 time 1-99(x0.1s)")),
            __param(6, (0, Metadata_1.parameter)("Number of repeats 0=infinite 0-99")),
            __param(7, (0, Metadata_1.parameter)("Ramp time 2-99 must be smaller than time 1 and time 2")),
            __param(8, (0, Metadata_1.parameter)(stateTooltip, true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number, Number, Number, Number, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], LightmarkLedInterface.prototype, "setPulsing", null);
        __decorate([
            (0, Metadata_1.callable)("Set state (wave)"),
            __param(0, (0, Metadata_1.parameter)("State 1 LED Brightness 0-99")),
            __param(1, (0, Metadata_1.parameter)("State 1 color 0-15")),
            __param(2, (0, Metadata_1.parameter)("State 1 animation duration 1-99(x0.1s)")),
            __param(3, (0, Metadata_1.parameter)("Program 00-01 (sinewave) or 51-59 (discrete)00 = Symmetrical sinewave   01 = Asymmetrical sinewave51-59 = Discrete running light (1-9 LEDs “running”)")),
            __param(4, (0, Metadata_1.parameter)("Option  indicates direction  -  01-04 1 = Left   2 = Right   3 = Outwards   4 = Inwards")),
            __param(5, (0, Metadata_1.parameter)("State 2 LED Brightness 0-99")),
            __param(6, (0, Metadata_1.parameter)("State 2 color 0-15")),
            __param(7, (0, Metadata_1.parameter)("Number of LEDs in animation 1-99")),
            __param(8, (0, Metadata_1.parameter)(stateTooltip, true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number, Number, Number, Number, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], LightmarkLedInterface.prototype, "setWave", null);
        __decorate([
            (0, Metadata_1.callable)("Define segment"),
            __param(0, (0, Metadata_1.parameter)("Add LED segment length 1-15 use multiple callables in same task to configure many segments")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], LightmarkLedInterface.prototype, "defineSegment", null);
        __decorate([
            (0, Metadata_1.callable)("Set segment to stored state, run callable repeatedly to assign each state to groups of segments (5 is max)"),
            __param(0, (0, Metadata_1.parameter)("Send to segments (as defined) names a,b,c and so on in order they been defined e.g 'adf' or 'bdt'. Defaults to '#' for all other segments")),
            __param(1, (0, Metadata_1.parameter)(stateTooltip, true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number]),
            __metadata("design:returntype", void 0)
        ], LightmarkLedInterface.prototype, "setState", null);
        __decorate([
            (0, Metadata_1.callable)("Set animation fade transition 1-100 and they represent steps of 20mS."),
            __param(0, (0, Metadata_1.parameter)("Fade time 1-100 (x0.02s)")),
            __param(1, (0, Metadata_1.parameter)(stateTooltip, true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number]),
            __metadata("design:returntype", void 0)
        ], LightmarkLedInterface.prototype, "setAnimationFadeTime", null);
        __decorate([
            (0, Metadata_1.callable)("Set state fade transition 1-100 and they represent steps of 20mS."),
            __param(0, (0, Metadata_1.parameter)("Fade time 1-100 (x0.02s)")),
            __param(1, (0, Metadata_1.parameter)(stateTooltip, true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number]),
            __metadata("design:returntype", void 0)
        ], LightmarkLedInterface.prototype, "setStateFadeTime", null);
        __decorate([
            (0, Metadata_1.callable)("Set state fade transition 1-100 and they represent steps of 20mS."),
            __param(0, (0, Metadata_1.parameter)("Blend width 1-6 LEDs")),
            __param(1, (0, Metadata_1.parameter)(stateTooltip, true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number]),
            __metadata("design:returntype", void 0)
        ], LightmarkLedInterface.prototype, "setSegmentBlend", null);
        return LightmarkLedInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(LightmarkLedInterface, "LightMark");
    var RGBInterface = (function (_super) {
        __extends(RGBInterface, _super);
        function RGBInterface(driver, index, channel) {
            return _super.call(this, driver, index, undefined, channel) || this;
        }
        Object.defineProperty(RGBInterface.prototype, "command", {
            get: function () { return this._command; },
            set: function (cmd) {
                this.sendCommand(cmd);
                this._command = cmd;
            },
            enumerable: false,
            configurable: true
        });
        RGBInterface.prototype.defineColor = function (color, red, green, blue) {
            var c = limitedVal(color, 1, 9);
            var r = padVal(limitedVal(red, 0, 100));
            var g = padVal(limitedVal(green, 0, 100));
            var b = padVal(limitedVal(blue, 0, 100));
            var cmd = c + " " + r + " " + g + " " + b;
            this.command = cmd;
        };
        RGBInterface.prototype.setSingleRamp = function (color, brightness, ramp, channel) {
            var c1 = limitedVal(color, 1, 9);
            var br = padVal(limitedVal(brightness, 0, 100));
            var r1 = padVal(limitedVal(ramp, 0, 999));
            var ch = channel ? channel : "X";
            var cmd = ch + " " + c1 + " " + br + " " + r1;
            this.command = cmd;
        };
        RGBInterface.prototype.setPulsing = function (color1, brightness1, ramp1, color2, brightness2, ramp2, channel) {
            var c1 = limitedVal(color1, 1, 9);
            var br1 = padVal(limitedVal(brightness1, 0, 100));
            var ra1 = padVal(limitedVal(ramp1, 0, 999));
            var c2 = limitedVal(color2, 1, 9);
            var br2 = padVal(limitedVal(brightness2, 0, 100));
            var ra2 = padVal(limitedVal(ramp2, 0, 999));
            var ch = channel ? channel : "X";
            var cmd = ch + " " + c1 + " " + br1 + " " + ra1 + " " + c2 + " " + br2 + " " + ra2;
            this.command = cmd;
        };
        RGBInterface.prototype.userFriendlyName = function () {
            return "LED";
        };
        RGBInterface.prototype.sendCommand = function (cmd) {
            this.sendData("G" + this.ifaceNo() + "B[" + cmd + "]");
        };
        __decorate([
            (0, Metadata_1.property)("RGB command to send e.g 'A 0 80 5' or 'B 255 0 0', if read it will return last sent command."),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], RGBInterface.prototype, "command", null);
        __decorate([
            (0, Metadata_1.callable)("Define a new RGB color on this controller"),
            __param(0, (0, Metadata_1.parameter)("color 1-9")),
            __param(1, (0, Metadata_1.parameter)("red 0-100")),
            __param(2, (0, Metadata_1.parameter)("green 0-100")),
            __param(3, (0, Metadata_1.parameter)("blue 0-100")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], RGBInterface.prototype, "defineColor", null);
        __decorate([
            (0, Metadata_1.callable)("Set RGB output (single ramp)"),
            __param(0, (0, Metadata_1.parameter)("color 1-9")),
            __param(1, (0, Metadata_1.parameter)("brightness 0-100")),
            __param(2, (0, Metadata_1.parameter)("ramptime 0-999(x0.1s)")),
            __param(3, (0, Metadata_1.parameter)("Send to channel defaults to all", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], RGBInterface.prototype, "setSingleRamp", null);
        __decorate([
            (0, Metadata_1.callable)("Set RGB output (pulsing)"),
            __param(0, (0, Metadata_1.parameter)("Ramp 1 color 1-9")),
            __param(1, (0, Metadata_1.parameter)("Ramp 2 brightness 0-100")),
            __param(2, (0, Metadata_1.parameter)("Ramp 2 time 0-999(x0.1s)")),
            __param(3, (0, Metadata_1.parameter)("Ramp 2 color 1-9")),
            __param(4, (0, Metadata_1.parameter)("Ramp 2 brightness 0-100")),
            __param(5, (0, Metadata_1.parameter)("Ramp 2 time 0-999(x0.1s)")),
            __param(6, (0, Metadata_1.parameter)("Send to channel defaults to all", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number, Number, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], RGBInterface.prototype, "setPulsing", null);
        return RGBInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(RGBInterface, "RGB", "EM6", "SM115");
    var RGBWInterface = (function (_super) {
        __extends(RGBWInterface, _super);
        function RGBWInterface(driver, index, channel) {
            return _super.call(this, driver, index, undefined, channel) || this;
        }
        Object.defineProperty(RGBWInterface.prototype, "command", {
            get: function () { return this._command; },
            set: function (cmd) {
                this.sendCommand(cmd);
                this._command = cmd;
            },
            enumerable: false,
            configurable: true
        });
        RGBWInterface.prototype.defineColor = function (color, red, green, blue, white) {
            var c = limitedVal(color, 1, 9);
            var r = padVal(limitedVal(red, 0, 100));
            var g = padVal(limitedVal(green, 0, 100));
            var b = padVal(limitedVal(blue, 0, 100));
            var w = padVal(limitedVal(white, 0, 100));
            var cmd = c + " " + r + " " + g + " " + b + " " + w;
            this.command = cmd;
        };
        RGBWInterface.prototype.setSingleRamp = function (color, brightness, ramp, channel) {
            var c1 = limitedVal(color, 1, 9);
            var br = padVal(limitedVal(brightness, 0, 100));
            var r1 = padVal(limitedVal(ramp, 0, 999));
            var ch = channel ? channel : "X";
            var cmd = ch + " " + c1 + " " + br + " " + r1;
            this.command = cmd;
        };
        RGBWInterface.prototype.setPulsing = function (color1, brightness1, ramp1, color2, brightness2, ramp2, channel) {
            var c1 = limitedVal(color1, 1, 9);
            var br1 = padVal(limitedVal(brightness1, 0, 100));
            var ra1 = padVal(limitedVal(ramp1, 0, 999));
            var c2 = limitedVal(color2, 1, 9);
            var br2 = padVal(limitedVal(brightness2, 0, 100));
            var ra2 = padVal(limitedVal(ramp2, 0, 999));
            var ch = channel ? channel : "X";
            var cmd = ch + " " + c1 + " " + br1 + " " + ra1 + " " + c2 + " " + br2 + " " + ra2;
            this.command = cmd;
        };
        RGBWInterface.prototype.userFriendlyName = function () {
            return "LED";
        };
        RGBWInterface.prototype.sendCommand = function (cmd) {
            this.sendData("G" + this.ifaceNo() + "B[" + cmd + "]");
        };
        __decorate([
            (0, Metadata_1.property)("RGBW command to send e.g 'A 0 80 5' or 'B 255 0 0 255', if read it will return last sent command."),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], RGBWInterface.prototype, "command", null);
        __decorate([
            (0, Metadata_1.callable)("Define a new RGBW color on this controller"),
            __param(0, (0, Metadata_1.parameter)("color 1-9")),
            __param(1, (0, Metadata_1.parameter)("red 0-100")),
            __param(2, (0, Metadata_1.parameter)("green 0-100")),
            __param(3, (0, Metadata_1.parameter)("blue 0-100")),
            __param(4, (0, Metadata_1.parameter)("white 0-100")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], RGBWInterface.prototype, "defineColor", null);
        __decorate([
            (0, Metadata_1.callable)("Set RGBW output (single ramp)"),
            __param(0, (0, Metadata_1.parameter)("color 1-9")),
            __param(1, (0, Metadata_1.parameter)("brightness 0-100")),
            __param(2, (0, Metadata_1.parameter)("ramptime 0-999(x0.1s)")),
            __param(3, (0, Metadata_1.parameter)("Send to channel defaults to all", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], RGBWInterface.prototype, "setSingleRamp", null);
        __decorate([
            (0, Metadata_1.callable)("Set RGBW output (pulsing) "),
            __param(0, (0, Metadata_1.parameter)("Ramp 1 color 1-9")),
            __param(1, (0, Metadata_1.parameter)("Ramp 2 brightness 0-100")),
            __param(2, (0, Metadata_1.parameter)("Ramp 2 time 0-999(x0.1s)")),
            __param(3, (0, Metadata_1.parameter)("Ramp 2 color 1-9")),
            __param(4, (0, Metadata_1.parameter)("Ramp 2 brightness 0-100")),
            __param(5, (0, Metadata_1.parameter)("Ramp 2 time 0-999(x0.1s)")),
            __param(6, (0, Metadata_1.parameter)("Send to channel defaults to all", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number, Number, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], RGBWInterface.prototype, "setPulsing", null);
        return RGBWInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(RGBWInterface, "RGBW");
    var MonoLedInterface = (function (_super) {
        __extends(MonoLedInterface, _super);
        function MonoLedInterface(driver, index) {
            return _super.call(this, driver, index, undefined) || this;
        }
        Object.defineProperty(MonoLedInterface.prototype, "command", {
            get: function () { return this._command; },
            set: function (cmd) {
                this.sendCommand(cmd);
                this._command = cmd;
            },
            enumerable: false,
            configurable: true
        });
        MonoLedInterface.prototype.setOutput = function (brightness, ramp) {
            log("Setting monoled output", brightness, ramp);
            var br = limitedVal(brightness, 0, 100, 2.55);
            var r = (limitedVal(ramp, 0, 15, 1, false));
            log("Calculated values", br, r, Math.floor(15 / r));
            var cmd = 256 * Math.floor(15 / r) + br;
            this.command = cmd.toString();
        };
        MonoLedInterface.prototype.sendCommand = function (cmd) {
            this.sendData("G" + this.ifaceNo() + "A[" + cmd + "]");
        };
        MonoLedInterface.prototype.userFriendlyName = function () {
            return "LED";
        };
        __decorate([
            (0, Metadata_1.property)("Monoled command to send e.g '384' or '13823' consult API manual, if read it will return last sent command."),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], MonoLedInterface.prototype, "command", null);
        __decorate([
            (0, Metadata_1.callable)("Set Monoled output (single ramp)"),
            __param(0, (0, Metadata_1.parameter)("brightness 0-100")),
            __param(1, (0, Metadata_1.parameter)("ramptime 0-15(seconds) automatically limited by fixed ramp steps in device, consult API manual")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number]),
            __metadata("design:returntype", void 0)
        ], MonoLedInterface.prototype, "setOutput", null);
        return MonoLedInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(MonoLedInterface, "MonoLed");
    var QuadAudioSwitch = (function (_super) {
        __extends(QuadAudioSwitch, _super);
        function QuadAudioSwitch(driver, index) {
            var _this = _super.call(this, driver, index) || this;
            _this.switches = {};
            for (var i = 1; i <= 4; i++) {
                _this.switches["sw".concat(i)] = false;
            }
            return _this;
        }
        Object.defineProperty(QuadAudioSwitch.prototype, "sw1", {
            get: function () {
                return this.switches.sw1;
            },
            set: function (value) {
                if (this.switches.sw1 === value)
                    return;
                this.switches.sw1 = value;
                this.updateAndSend();
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QuadAudioSwitch.prototype, "sw2", {
            get: function () {
                return this.switches.sw2;
            },
            set: function (value) {
                if (this.switches.sw2 === value)
                    return;
                this.switches.sw2 = value;
                this.updateAndSend();
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QuadAudioSwitch.prototype, "sw3", {
            get: function () {
                return this.switches.sw3;
            },
            set: function (value) {
                if (this.switches.sw3 === value)
                    return;
                this.switches.sw3 = value;
                this.updateAndSend();
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QuadAudioSwitch.prototype, "sw4", {
            get: function () {
                return this.switches.sw4;
            },
            set: function (value) {
                if (this.switches.sw4 === value)
                    return;
                this.switches.sw4 = value;
                this.updateAndSend();
            },
            enumerable: false,
            configurable: true
        });
        QuadAudioSwitch.prototype.setAllSwitches = function (value) {
            for (var i = 1; i <= 4; i++) {
                this.switches["sw".concat(i)] = value;
                this.changed("sw".concat(i));
            }
            this.updateAndSend();
        };
        QuadAudioSwitch.prototype.updateAndSend = function () {
            var _a = this.switches, sw1 = _a.sw1, sw2 = _a.sw2, sw3 = _a.sw3, sw4 = _a.sw4;
            console.log("Updating audio switch states", sw1, sw2, sw3, sw4), this.switches;
            var data = (sw1 ? 1 : 0) |
                (sw2 ? 2 : 0) |
                (sw3 ? 4 : 0) |
                (sw4 ? 8 : 0);
            this.sendData("G" + this.ifaceNo() + "[" + data + "]");
        };
        QuadAudioSwitch.prototype.userFriendlyName = function () {
            return "AudioSwitch";
        };
        __decorate([
            (0, Metadata_1.property)("Switch 1 state", false),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], QuadAudioSwitch.prototype, "sw1", null);
        __decorate([
            (0, Metadata_1.property)("Switch 2 state", false),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], QuadAudioSwitch.prototype, "sw2", null);
        __decorate([
            (0, Metadata_1.property)("Switch 3 state", false),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], QuadAudioSwitch.prototype, "sw3", null);
        __decorate([
            (0, Metadata_1.property)("Switch 4 state", false),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], QuadAudioSwitch.prototype, "sw4", null);
        __decorate([
            (0, Metadata_1.callable)("Turn all switches ON/OFF"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Boolean]),
            __metadata("design:returntype", void 0)
        ], QuadAudioSwitch.prototype, "setAllSwitches", null);
        return QuadAudioSwitch;
    }(BaseInterface));
    NexmosphereBase.registerInterface(QuadAudioSwitch, "Opticalx4", "Analogx4");
    var AudioSwitch = (function (_super) {
        __extends(AudioSwitch, _super);
        function AudioSwitch(driver, index) {
            var _this = _super.call(this, driver, index) || this;
            _this.mSw = false;
            return _this;
        }
        Object.defineProperty(AudioSwitch.prototype, "sw1", {
            get: function () {
                return this.mSw;
            },
            set: function (value) {
                if (this.mSw === value)
                    return;
                var cmd = value ? 1 : 0;
                this.sendData("G" + this.ifaceNo() + "[" + cmd + "]");
                this.mSw = value;
            },
            enumerable: false,
            configurable: true
        });
        AudioSwitch.prototype.userFriendlyName = function () {
            return "AudioSwitch";
        };
        __decorate([
            (0, Metadata_1.property)("Switch 1 state", false),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], AudioSwitch.prototype, "sw1", null);
        return AudioSwitch;
    }(BaseInterface));
    NexmosphereBase.registerInterface(AudioSwitch, "Optical", "Analog");
    var ProximityInterface = (function (_super) {
        __extends(ProximityInterface, _super);
        function ProximityInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mProximity = 0;
            return _this;
        }
        Object.defineProperty(ProximityInterface.prototype, "proximity", {
            get: function () { return this.mProximity; },
            set: function (value) { this.mProximity = value; },
            enumerable: false,
            configurable: true
        });
        ProximityInterface.prototype.receiveData = function (data) {
            this.proximity = parseInt(data);
        };
        ProximityInterface.prototype.userFriendlyName = function () {
            return "Prox";
        };
        __decorate([
            (0, Metadata_1.property)("Proximity zone", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], ProximityInterface.prototype, "proximity", null);
        return ProximityInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(ProximityInterface, "XY116", "XY146", "XY176", "XY");
    var TimeOfFlightInterface = (function (_super) {
        __extends(TimeOfFlightInterface, _super);
        function TimeOfFlightInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mProximity = 0;
            _this.mAirButton = false;
            _this.mRawData = "";
            _this.mTrigger1 = false;
            _this.mTrigger2 = false;
            _this.mTrigger3 = false;
            _this.mTrigger4 = false;
            _this.mTrigger5 = false;
            _this.mTrigger6 = false;
            _this.mTrigger7 = false;
            _this.mTrigger8 = false;
            _this.mTrigger9 = false;
            _this.mTrigger10 = false;
            return _this;
        }
        Object.defineProperty(TimeOfFlightInterface.prototype, "proximity", {
            get: function () { return this.mProximity; },
            set: function (value) { this.mProximity = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "airButton", {
            get: function () { return this.mAirButton; },
            set: function (value) { this.mAirButton = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "rawData", {
            get: function () { return this.mRawData; },
            set: function (value) { this.mRawData = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "triggerOn1", {
            get: function () { return this.mTrigger1; },
            set: function (value) { this.mTrigger1 = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "triggerOn2", {
            get: function () { return this.mTrigger2; },
            set: function (value) { this.mTrigger2 = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "triggerOn3", {
            get: function () { return this.mTrigger3; },
            set: function (value) { this.mTrigger3 = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "triggerOn4", {
            get: function () { return this.mTrigger4; },
            set: function (value) { this.mTrigger4 = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "triggerOn5", {
            get: function () { return this.mTrigger5; },
            set: function (value) { this.mTrigger5 = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "triggerOn6", {
            get: function () { return this.mTrigger6; },
            set: function (value) { this.mTrigger6 = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "triggerOn7", {
            get: function () { return this.mTrigger7; },
            set: function (value) { this.mTrigger7 = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "triggerOn8", {
            get: function () { return this.mTrigger8; },
            set: function (value) { this.mTrigger8 = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "triggerOn9", {
            get: function () { return this.mTrigger9; },
            set: function (value) { this.mTrigger9 = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TimeOfFlightInterface.prototype, "triggerOn10", {
            get: function () { return this.mTrigger10; },
            set: function (value) { this.mTrigger10 = value; },
            enumerable: false,
            configurable: true
        });
        TimeOfFlightInterface.prototype.receiveData = function (data) {
            var splitData = data.split("=");
            var sensorValue = splitData[1];
            this.rawData = data;
            switch (sensorValue) {
                case "AB":
                    this.airButton = true;
                    this.proximity = 1;
                    break;
                case "XX":
                    this.airButton = false;
                    this.proximity = 999;
                    break;
                default:
                    var proximity = parseInt(sensorValue);
                    if (!isNaN(proximity)) {
                        this.proximity = parseInt(sensorValue);
                        this.airButton = false;
                    }
                    break;
            }
            this.triggerOn1 = this.proximity <= 1;
            this.triggerOn2 = this.proximity <= 2;
            this.triggerOn3 = this.proximity <= 3;
            this.triggerOn4 = this.proximity <= 4;
            this.triggerOn5 = this.proximity <= 5;
            this.triggerOn6 = this.proximity <= 6;
            this.triggerOn7 = this.proximity <= 7;
            this.triggerOn8 = this.proximity <= 8;
            this.triggerOn9 = this.proximity <= 9;
            this.triggerOn10 = this.proximity <= 10;
        };
        TimeOfFlightInterface.prototype.userFriendlyName = function () {
            return "TOF";
        };
        __decorate([
            (0, Metadata_1.property)("Proximity zone", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], TimeOfFlightInterface.prototype, "proximity", null);
        __decorate([
            (0, Metadata_1.property)("Air Button", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimeOfFlightInterface.prototype, "airButton", null);
        __decorate([
            (0, Metadata_1.property)("Raw data last received", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], TimeOfFlightInterface.prototype, "rawData", null);
        __decorate([
            (0, Metadata_1.property)("Proximity 1 or below", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimeOfFlightInterface.prototype, "triggerOn1", null);
        __decorate([
            (0, Metadata_1.property)("Proximity 2 or below", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimeOfFlightInterface.prototype, "triggerOn2", null);
        __decorate([
            (0, Metadata_1.property)("Proximity 3 or below", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimeOfFlightInterface.prototype, "triggerOn3", null);
        __decorate([
            (0, Metadata_1.property)("Proximity 4 or below", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimeOfFlightInterface.prototype, "triggerOn4", null);
        __decorate([
            (0, Metadata_1.property)("Proximity 5 or below", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimeOfFlightInterface.prototype, "triggerOn5", null);
        __decorate([
            (0, Metadata_1.property)("Proximity 6 or below", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimeOfFlightInterface.prototype, "triggerOn6", null);
        __decorate([
            (0, Metadata_1.property)("Proximity 7 or below", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimeOfFlightInterface.prototype, "triggerOn7", null);
        __decorate([
            (0, Metadata_1.property)("Proximity 8 or below", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimeOfFlightInterface.prototype, "triggerOn8", null);
        __decorate([
            (0, Metadata_1.property)("Proximity 9 or below", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimeOfFlightInterface.prototype, "triggerOn9", null);
        __decorate([
            (0, Metadata_1.property)("Proximity 10 or below", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TimeOfFlightInterface.prototype, "triggerOn10", null);
        return TimeOfFlightInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(TimeOfFlightInterface, "XY240", "XY241");
    var AirGestureInterface = (function (_super) {
        __extends(AirGestureInterface, _super);
        function AirGestureInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mGesture = "";
            return _this;
        }
        Object.defineProperty(AirGestureInterface.prototype, "gesture", {
            get: function () { return this.mGesture; },
            set: function (value) { this.mGesture = value; },
            enumerable: false,
            configurable: true
        });
        AirGestureInterface.prototype.receiveData = function (data) {
            this.gesture = data;
        };
        AirGestureInterface.prototype.userFriendlyName = function () {
            return "Air";
        };
        __decorate([
            (0, Metadata_1.property)("Gesture detected", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], AirGestureInterface.prototype, "gesture", null);
        return AirGestureInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(AirGestureInterface, "XTEF650", "XTEF30", "XTEF630", "XTEF680");
    var kButtonDescr = "Button pressed";
    var kLedDescr = "0=off, 1=fast, 2=slow or 3=on";
    var QuadButtonInterface = (function (_super) {
        __extends(QuadButtonInterface, _super);
        function QuadButtonInterface(driver, index) {
            var _this = _super.call(this, driver, index) || this;
            _this.buttons = [];
            for (var ix = 0; ix < QuadButtonInterface.kNumButtons; ++ix)
                _this.buttons.push({ state: false, ledData: 0 });
            return _this;
        }
        Object.defineProperty(QuadButtonInterface.prototype, "button1", {
            get: function () { return this.getBtn(1); },
            set: function (value) { this.setBtn(1, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QuadButtonInterface.prototype, "led1", {
            get: function () { return this.getLed(1); },
            set: function (value) { this.setLed(1, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QuadButtonInterface.prototype, "button2", {
            get: function () { return this.getBtn(2); },
            set: function (value) { this.setBtn(2, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QuadButtonInterface.prototype, "led2", {
            get: function () { return this.getLed(2); },
            set: function (value) { this.setLed(2, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QuadButtonInterface.prototype, "button3", {
            get: function () { return this.getBtn(3); },
            set: function (value) { this.setBtn(3, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QuadButtonInterface.prototype, "led3", {
            get: function () { return this.getLed(3); },
            set: function (value) { this.setLed(3, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QuadButtonInterface.prototype, "button4", {
            get: function () { return this.getBtn(4); },
            set: function (value) { this.setBtn(4, value); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QuadButtonInterface.prototype, "led4", {
            get: function () { return this.getLed(4); },
            set: function (value) { this.setLed(4, value); },
            enumerable: false,
            configurable: true
        });
        QuadButtonInterface.prototype.getBtn = function (oneBasedIx) {
            return this.buttons[oneBasedIx - 1].state;
        };
        QuadButtonInterface.prototype.setBtn = function (oneBasedIx, state) {
            this.buttons[oneBasedIx - 1].state = state;
        };
        QuadButtonInterface.prototype.getLed = function (oneBasedIx) {
            return this.buttons[oneBasedIx - 1].ledData;
        };
        QuadButtonInterface.prototype.setLed = function (oneBasedIx, state) {
            this.buttons[oneBasedIx - 1].ledData = state & 3;
            this.ledStatusChanged();
        };
        QuadButtonInterface.prototype.receiveData = function (data) {
            var bitMask = parseInt(data);
            bitMask = bitMask >> 1;
            for (var ix = 0; ix < this.buttons.length; ++ix) {
                var isPressed = !!(bitMask & (1 << ix));
                var btn = this.buttons[ix];
                if (btn.state !== isPressed) {
                    btn.state = isPressed;
                    this.changed("button" + (ix + 1));
                }
            }
        };
        QuadButtonInterface.prototype.ledStatusChanged = function () {
            var toSend = 0;
            var buttons = this.buttons;
            for (var ix = 0; ix < buttons.length; ++ix)
                toSend |= buttons[ix].ledData << ix * 2;
            this.sendCmd(toSend.toString());
        };
        QuadButtonInterface.prototype.sendCmd = function (data) {
            this.driver.send("X" + this.ifaceNo() + "A[" + data + "]");
        };
        QuadButtonInterface.prototype.userFriendlyName = function () {
            return "Btn";
        };
        QuadButtonInterface.kNumButtons = 4;
        __decorate([
            (0, Metadata_1.property)(kButtonDescr, true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], QuadButtonInterface.prototype, "button1", null);
        __decorate([
            (0, Metadata_1.property)(kLedDescr),
            (0, Metadata_1.min)(0),
            (0, Metadata_1.max)(3),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], QuadButtonInterface.prototype, "led1", null);
        __decorate([
            (0, Metadata_1.property)(kButtonDescr, true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], QuadButtonInterface.prototype, "button2", null);
        __decorate([
            (0, Metadata_1.property)(kLedDescr),
            (0, Metadata_1.min)(0),
            (0, Metadata_1.max)(3),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], QuadButtonInterface.prototype, "led2", null);
        __decorate([
            (0, Metadata_1.property)(kButtonDescr, true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], QuadButtonInterface.prototype, "button3", null);
        __decorate([
            (0, Metadata_1.property)(kLedDescr),
            (0, Metadata_1.min)(0),
            (0, Metadata_1.max)(3),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], QuadButtonInterface.prototype, "led3", null);
        __decorate([
            (0, Metadata_1.property)(kButtonDescr, true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], QuadButtonInterface.prototype, "button4", null);
        __decorate([
            (0, Metadata_1.property)(kLedDescr),
            (0, Metadata_1.min)(0),
            (0, Metadata_1.max)(3),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], QuadButtonInterface.prototype, "led4", null);
        return QuadButtonInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(QuadButtonInterface, "XTB4N", "XTB4N6", "XT4FW6", "XT4");
    var MotionInterface = (function (_super) {
        __extends(MotionInterface, _super);
        function MotionInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mMotion = 0;
            return _this;
        }
        Object.defineProperty(MotionInterface.prototype, "motion", {
            get: function () { return this.mMotion; },
            set: function (value) { this.mMotion = value; },
            enumerable: false,
            configurable: true
        });
        MotionInterface.prototype.receiveData = function (data) {
            this.motion = parseInt(data);
        };
        MotionInterface.prototype.userFriendlyName = function () {
            return "Motion";
        };
        __decorate([
            (0, Metadata_1.property)("Motion detected", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], MotionInterface.prototype, "motion", null);
        return MotionInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(MotionInterface, "XY320");
    var GenderInterface = (function (_super) {
        __extends(GenderInterface, _super);
        function GenderInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mIsPerson = false;
            _this.mGender = 'U';
            _this.mGenderConfidence = 'X';
            _this.mAge = 0;
            _this.mAgeConfidence = 'X';
            _this.mGaze = 'U';
            return _this;
        }
        Object.defineProperty(GenderInterface.prototype, "isPerson", {
            get: function () { return this.mIsPerson; },
            set: function (value) { this.mIsPerson = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GenderInterface.prototype, "gender", {
            get: function () { return this.mGender; },
            set: function (value) { this.mGender = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GenderInterface.prototype, "genderConfidence", {
            get: function () { return this.mGenderConfidence; },
            set: function (value) { this.mGenderConfidence = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GenderInterface.prototype, "age", {
            get: function () { return this.mAge; },
            set: function (value) { this.mAge = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GenderInterface.prototype, "ageConfidence", {
            get: function () { return this.mAgeConfidence; },
            set: function (value) { this.mAgeConfidence = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GenderInterface.prototype, "gaze", {
            get: function () { return this.mGaze; },
            set: function (value) { this.mGaze = value; },
            enumerable: false,
            configurable: true
        });
        GenderInterface.prototype.receiveData = function (data) {
            var parseResult = GenderInterface.kParser.exec(data);
            if (parseResult) {
                this.isPerson = parseResult[0] === "1";
                this.gender = parseResult[1];
                this.genderConfidence = parseResult[2];
                this.age = parseInt(parseResult[3]);
                this.ageConfidence = parseResult[4];
                this.gaze = parseResult[5];
            }
        };
        GenderInterface.prototype.userFriendlyName = function () {
            return "Gender";
        };
        GenderInterface.kParser = /^(0|1)(M|F|U)(X|L|H)([0-8])(X|L|H)(L|C|R|U)/;
        __decorate([
            (0, Metadata_1.property)("Person detected", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], GenderInterface.prototype, "isPerson", null);
        __decorate([
            (0, Metadata_1.property)("M=Male, F=Female, U=Unidentified", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], GenderInterface.prototype, "gender", null);
        __decorate([
            (0, Metadata_1.property)("X=Very Low, L=Low, H=High", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], GenderInterface.prototype, "genderConfidence", null);
        __decorate([
            (0, Metadata_1.property)("Age range 0...8", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], GenderInterface.prototype, "age", null);
        __decorate([
            (0, Metadata_1.property)("X=Very Low, L=Low, H=High", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], GenderInterface.prototype, "ageConfidence", null);
        __decorate([
            (0, Metadata_1.property)("L=Left, C=Center, R=Right, U=Unidentified", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], GenderInterface.prototype, "gaze", null);
        return GenderInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(GenderInterface, "XY510", "XY520");
    var LidarInterface = (function (_super) {
        __extends(LidarInterface, _super);
        function LidarInterface(driver, index) {
            var _this = _super.call(this, driver, index) || this;
            _this.mZone = [
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0,
            ];
            _this._ready = false;
            wait(2300).then(function () {
                _this.ready = true;
            });
            return _this;
        }
        Object.defineProperty(LidarInterface.prototype, "ready", {
            get: function () { return this._ready; },
            set: function (value) { this._ready = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone01", {
            get: function () { return this.mZone[0]; },
            set: function (value) { this.mZone[0] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone02", {
            get: function () { return this.mZone[1]; },
            set: function (value) { this.mZone[1] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone03", {
            get: function () { return this.mZone[2]; },
            set: function (value) { this.mZone[2] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone04", {
            get: function () { return this.mZone[3]; },
            set: function (value) { this.mZone[3] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone05", {
            get: function () { return this.mZone[4]; },
            set: function (value) { this.mZone[4] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone06", {
            get: function () { return this.mZone[5]; },
            set: function (value) { this.mZone[5] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone07", {
            get: function () { return this.mZone[6]; },
            set: function (value) { this.mZone[6] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone08", {
            get: function () { return this.mZone[7]; },
            set: function (value) { this.mZone[7] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone09", {
            get: function () { return this.mZone[8]; },
            set: function (value) { this.mZone[8] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone10", {
            get: function () { return this.mZone[9]; },
            set: function (value) { this.mZone[9] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone11", {
            get: function () { return this.mZone[10]; },
            set: function (value) { this.mZone[10] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone12", {
            get: function () { return this.mZone[11]; },
            set: function (value) { this.mZone[11] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone13", {
            get: function () { return this.mZone[12]; },
            set: function (value) { this.mZone[12] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone14", {
            get: function () { return this.mZone[13]; },
            set: function (value) { this.mZone[13] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone15", {
            get: function () { return this.mZone[14]; },
            set: function (value) { this.mZone[14] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone16", {
            get: function () { return this.mZone[15]; },
            set: function (value) { this.mZone[15] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone17", {
            get: function () { return this.mZone[16]; },
            set: function (value) { this.mZone[16] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone18", {
            get: function () { return this.mZone[17]; },
            set: function (value) { this.mZone[17] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone19", {
            get: function () { return this.mZone[18]; },
            set: function (value) { this.mZone[18] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone20", {
            get: function () { return this.mZone[19]; },
            set: function (value) { this.mZone[19] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone21", {
            get: function () { return this.mZone[20]; },
            set: function (value) { this.mZone[20] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone22", {
            get: function () { return this.mZone[21]; },
            set: function (value) { this.mZone[21] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone23", {
            get: function () { return this.mZone[22]; },
            set: function (value) { this.mZone[22] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LidarInterface.prototype, "zone24", {
            get: function () { return this.mZone[23]; },
            set: function (value) { this.mZone[23] = value; },
            enumerable: false,
            configurable: true
        });
        LidarInterface.prototype.defField = function (corners) {
            var coordinates = this.parseAndValidateCoordinates(corners);
            return this.defineFieldOfInterest(coordinates);
        };
        LidarInterface.prototype.defFieldAsRect = function (minX, minY, maxX, maxY) {
            var x1 = Math.min(minX, maxX);
            var x2 = Math.max(minX, maxX);
            var y1 = Math.min(minY, maxY);
            var y2 = Math.max(minY, maxY);
            var coordinates = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
            if (x1 < -999 || x2 > 999 || y1 < -999 || y2 > 999) {
                throw new Error("x and y values must be between -999 and 999.");
            }
            return this.defineFieldOfInterest(coordinates);
        };
        LidarInterface.prototype.defZone = function (zoneId, x, y, width, height) {
            return this.sendCmdB(this.cmdActivationZone(zoneId, x, y, width, height), RESPONSE_SETTINGS_STORED);
        };
        LidarInterface.prototype.setZoneDelay = function (zoneId, delay) {
            return this.sendCmdB(this.cmdSetZoneDelay(zoneId, delay));
        };
        LidarInterface.prototype.setZoneMinSize = function (zoneId, size) {
            return this.sendCmdB(this.cmdSetZoneMinObjectSize(zoneId, size));
        };
        LidarInterface.prototype.setZoneMaxSize = function (zoneId, size) {
            return this.sendCmdB(this.cmdSetZoneMaxObjectSize(zoneId, size));
        };
        LidarInterface.prototype.clearZone = function (zoneId) {
            return this.sendCmdB(this.cmdClearZone(zoneId));
        };
        LidarInterface.prototype.clearAllZones = function () {
            return this.sendCmdB(this.cmdClearAllZones());
        };
        LidarInterface.prototype.setDetectionMode = function (mode) {
            switch (mode) {
                case 1:
                    return this.sendCmdS("4:1");
                case 2:
                    return this.sendCmdS("4:3");
                default:
                    throw new Error("Invalid detection mode");
            }
        };
        LidarInterface.prototype.receiveData = function (data, tag) {
            if (this._cmdResponseWaiter && this._cmdResponseWaiter.expectedResponse == data) {
                this._cmdResponseWaiter.register(data);
                this._cmdResponseWaiter = null;
                return;
            }
            var parseResult = LidarInterface.kParser.exec(data);
            if (parseResult) {
                var zoneId = parseInt(parseResult[1]);
                var enterOrExit = parseResult[2];
                var zoneObjectCount = parseInt(parseResult[3]);
                this.mZone[zoneId - 1] = zoneObjectCount;
                this.changed("zone" + this.pad(zoneId, 2));
                log("Zone " + zoneId + " " + enterOrExit + " " + zoneObjectCount);
                return;
            }
            var parseResultWithoutCount = LidarInterface.kParserWithoutCount.exec(data);
            if (parseResultWithoutCount) {
                var zoneId = parseInt(parseResultWithoutCount[1]);
                var enterOrExit = parseResultWithoutCount[2];
                this.mZone[zoneId - 1] += enterOrExit === "ENTER" ? 1 : -1;
                var label = "zone" + this.pad(zoneId, 2);
                this.changed(label);
                return;
            }
        };
        LidarInterface.prototype.userFriendlyName = function () {
            return "Lidar";
        };
        LidarInterface.prototype.defineFieldOfInterest = function (coordinates) {
            return __awaiter(this, void 0, void 0, function () {
                var i;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            i = 0;
                            _a.label = 1;
                        case 1:
                            if (!(i < coordinates.length)) return [3, 4];
                            return [4, this.sendCmdB(this.cmdFieldOfInterestCorner(i + 1, coordinates[i][0], coordinates[i][1]), RESPONSE_SETTINGS_STORED)];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            ++i;
                            return [3, 1];
                        case 4: return [4, this.sendCmdB(this.cmdRecalculateFieldOfInterest())];
                        case 5:
                            _a.sent();
                            return [2];
                    }
                });
            });
        };
        LidarInterface.prototype.sendCmdS = function (command, expectedResponse) {
            if (expectedResponse === void 0) { expectedResponse = null; }
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, this.sendCmd(command, expectedResponse, "S")];
                        case 1:
                            _a.sent();
                            return [2];
                    }
                });
            });
        };
        LidarInterface.prototype.sendCmdB = function (command, expectedResponse) {
            if (expectedResponse === void 0) { expectedResponse = null; }
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, this.sendCmd(command, expectedResponse, "B")];
                        case 1:
                            _a.sent();
                            return [2];
                    }
                });
            });
        };
        LidarInterface.prototype.sendCmd = function (command, expectedResponse, prefix) {
            if (expectedResponse === void 0) { expectedResponse = null; }
            return __awaiter(this, void 0, void 0, function () {
                var raw;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            raw = this.package(command, prefix);
                            this.driver.send(raw);
                            log("sending command: '" + raw + "'");
                            if (!expectedResponse) return [3, 1];
                            return [2, new Promise(function (resolve, reject) {
                                    _this._cmdResponseWaiter = new CmdResponseWaiter(command, expectedResponse, function (result) {
                                        log("resolved via response");
                                        resolve();
                                        _this._cmdResponseWaiter = null;
                                    }, function (reason) {
                                        _this._cmdResponseWaiter = null;
                                        reject("Timeout waiting for response ... !");
                                    });
                                })];
                        case 1: return [4, commandDelay()];
                        case 2:
                            _a.sent();
                            log("resolved via timeout");
                            _a.label = 3;
                        case 3: return [2];
                    }
                });
            });
        };
        LidarInterface.prototype.cmdFieldOfInterestCorner = function (i, x, y) {
            return "FOICORNER" + this.pad(i, 2) + "=" + this.signedPad(x, 3) + "," + this.signedPad(y, 3);
        };
        LidarInterface.prototype.cmdRecalculateFieldOfInterest = function () {
            return "RECALCULATEFOI";
        };
        LidarInterface.prototype.cmdActivationZone = function (zoneId, x, y, width, height) {
            return "ZONE" + this.pad(zoneId, 2) + "=" +
                this.signedPad(x, 3) + "," +
                this.signedPad(y, 3) + "," +
                this.pad(width, 3) + "," +
                this.pad(height, 3);
        };
        LidarInterface.prototype.cmdSetZoneDelay = function (zoneId, delay) {
            return "ZONE" + this.pad(zoneId, 2) + "DELAY=" + this.pad(delay, 2);
        };
        LidarInterface.prototype.cmdSetZoneMinObjectSize = function (zoneId, minObjectSize) {
            return "ZONE" + this.pad(zoneId, 2) + "MINSIZE=" + this.pad(minObjectSize, 2);
        };
        LidarInterface.prototype.cmdSetZoneMaxObjectSize = function (zoneId, maxObjectSize) {
            return "ZONE" + this.pad(zoneId, 2) + "MAXSIZE=" + this.pad(maxObjectSize, 2);
        };
        LidarInterface.prototype.cmdClearZone = function (zoneId) {
            return "ZONE" + this.pad(zoneId, 2) + "=CLEAR";
        };
        LidarInterface.prototype.cmdClearAllZones = function () {
            return "CLEARALLZONES";
        };
        LidarInterface.prototype.cmdAskZones = function () {
            return "ZONES?";
        };
        LidarInterface.prototype.packageB = function (command) { return this.package(command, "B"); };
        LidarInterface.prototype.packageS = function (command) { return this.package(command, "S"); };
        LidarInterface.prototype.package = function (command, prefix) {
            return "X" + this.pad(this.index + 1, 3) + prefix + "[" + command + "]";
        };
        LidarInterface.prototype.parseAndValidateCoordinates = function (input) {
            var coordinateRegex = /\[(-?\d+),\s*(-?\d+)]/g;
            var coordinatePartsRegex = /\[(-?\d+),\s*(-?\d+)]/;
            var matches = __spreadArray([], input.match(coordinateRegex), true);
            if (matches.length < 3 || matches.length > 10) {
                throw new Error("Input must contain 3 to 10 coordinate pairs.");
            }
            var coordinates = matches.map(function (match) {
                var reMatch = coordinatePartsRegex.exec(match);
                var x = parseInt(reMatch[1]);
                var y = parseInt(reMatch[2]);
                if (x < -999 || x > 999 || y < -999 || y > 999) {
                    throw new Error("Coordinates must have x and y values between -999 and 999.");
                }
                return [x, y];
            });
            return coordinates;
        };
        LidarInterface.prototype.pad = function (num, length, padChar) {
            if (padChar === void 0) { padChar = "0"; }
            var numStr = num.toString();
            while (numStr.length < length)
                numStr = padChar + numStr;
            return numStr;
        };
        LidarInterface.prototype.signedPad = function (num, length) {
            var isPositive = num >= 0;
            return (isPositive ? "+" : "-") + this.pad(Math.abs(num), length);
        };
        LidarInterface.kParser = /^ZONE(\d{2})=(ENTER|EXIT):(\d{2})$/;
        LidarInterface.kParserWithoutCount = /^ZONE(\d{2})=(ENTER|EXIT)$/;
        __decorate([
            (0, Metadata_1.property)("Ready for setup (e.g. use this as trigger for a setup Task)", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], LidarInterface.prototype, "ready", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone01", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone02", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone03", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone04", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone05", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone06", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone07", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone08", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone09", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone10", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone11", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone12", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone13", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone14", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone15", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone16", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone17", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone18", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone19", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone20", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone21", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone22", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone23", null);
        __decorate([
            (0, Metadata_1.property)(kZoneDescr, true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LidarInterface.prototype, "zone24", null);
        __decorate([
            (0, Metadata_1.callable)("define field of interest"),
            __param(0, (0, Metadata_1.parameter)("list of 3 to 10 corner coordinates in cm - e.g. '[0,10], [22,300], [-22,400]'")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", Promise)
        ], LidarInterface.prototype, "defField", null);
        __decorate([
            (0, Metadata_1.callable)("define field of interest as rectangle"),
            __param(0, (0, Metadata_1.parameter)("min x in cm")),
            __param(1, (0, Metadata_1.parameter)("min y in cm")),
            __param(2, (0, Metadata_1.parameter)("max x in cm")),
            __param(3, (0, Metadata_1.parameter)("max y in cm")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number, Number]),
            __metadata("design:returntype", Promise)
        ], LidarInterface.prototype, "defFieldAsRect", null);
        __decorate([
            (0, Metadata_1.callable)("define activation zone"),
            __param(0, (0, Metadata_1.parameter)("Zone ID (1-24)")),
            __param(1, (0, Metadata_1.parameter)("X in cm")),
            __param(2, (0, Metadata_1.parameter)("Y in cm")),
            __param(3, (0, Metadata_1.parameter)("width in cm")),
            __param(4, (0, Metadata_1.parameter)("height in cm")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number, Number, Number]),
            __metadata("design:returntype", Promise)
        ], LidarInterface.prototype, "defZone", null);
        __decorate([
            (0, Metadata_1.callable)("set zone delay"),
            __param(0, (0, Metadata_1.parameter)("Zone ID (1-24)")),
            __param(1, (0, Metadata_1.parameter)("delay in frames\n(XQ-L2: 1 frame = ~140 ms XQ-L5: 1 frame = ~100 ms)")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number]),
            __metadata("design:returntype", Promise)
        ], LidarInterface.prototype, "setZoneDelay", null);
        __decorate([
            (0, Metadata_1.callable)("set zone min object size"),
            __param(0, (0, Metadata_1.parameter)("Zone ID (1-24)")),
            __param(1, (0, Metadata_1.parameter)("min object size in cm")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number]),
            __metadata("design:returntype", Promise)
        ], LidarInterface.prototype, "setZoneMinSize", null);
        __decorate([
            (0, Metadata_1.callable)("set zone max object size"),
            __param(0, (0, Metadata_1.parameter)("Zone ID (1-24)")),
            __param(1, (0, Metadata_1.parameter)("max object size in cm")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number]),
            __metadata("design:returntype", Promise)
        ], LidarInterface.prototype, "setZoneMaxSize", null);
        __decorate([
            (0, Metadata_1.callable)("clear zone parameters (delay, min/max object size)"),
            __param(0, (0, Metadata_1.parameter)("Zone ID (1-24)")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", Promise)
        ], LidarInterface.prototype, "clearZone", null);
        __decorate([
            (0, Metadata_1.callable)("clear parameters for all zones (delay, min/max object size)"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", Promise)
        ], LidarInterface.prototype, "clearAllZones", null);
        __decorate([
            (0, Metadata_1.callable)("set detection / output mode (see sensor manual)"),
            __param(0, (0, Metadata_1.parameter)("1=single detection, 2=multi detection (equals mode 3 from manual!)")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", Promise)
        ], LidarInterface.prototype, "setDetectionMode", null);
        return LidarInterface;
    }(BaseInterface));
    var kZoneDescr = "Zone occupied";
    var RESPONSE_SETTINGS_STORED = "SETTINGS-STORED";
    var CmdResponseWaiter = (function () {
        function CmdResponseWaiter(cmd, expectedResponse, _resolve, _reject, _timeoutMs) {
            if (_timeoutMs === void 0) { _timeoutMs = 1000; }
            var _this = this;
            this.cmd = cmd;
            this.expectedResponse = expectedResponse;
            this._resolve = _resolve;
            this._reject = _reject;
            this._done = false;
            wait(_timeoutMs).then(function () {
                if (_this._done)
                    return;
                _this._done = true;
                _this._reject(new Error("Timeout"));
            });
        }
        CmdResponseWaiter.prototype.register = function (response) {
            if (response === this.expectedResponse) {
                if (this._done)
                    return;
                this._done = true;
                this._resolve({
                    response: response,
                    sender: this,
                });
            }
        };
        return CmdResponseWaiter;
    }());
    NexmosphereBase.registerInterface(LidarInterface, "XQL2", "XQL5");
    var AnalogInputInterface = (function (_super) {
        __extends(AnalogInputInterface, _super);
        function AnalogInputInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mValue = 0;
            _this.mNormalize = false;
            _this.mInMin = 0;
            _this.mInMax = 20;
            _this.mOutMin = 0;
            _this.mOutMax = 1;
            return _this;
        }
        Object.defineProperty(AnalogInputInterface.prototype, "value", {
            get: function () { return this.mValue; },
            set: function (value) { this.mValue = value; },
            enumerable: false,
            configurable: true
        });
        AnalogInputInterface.prototype.sendSettingsCmd = function (command) {
            this.sendData("X" + this.ifaceNo() + "S[" + command + "]");
        };
        AnalogInputInterface.prototype.sendSetRangesCmd = function (command) {
            this.sendData("X" + this.ifaceNo() + "B[" + command + "]");
        };
        AnalogInputInterface.prototype.normalizedAnalogInput = function (normalize, inMin, inMax, outMin, outMax) {
            this.mNormalize = normalize || false;
            ;
            this.mInMin = inMin | 0;
            this.mInMax = inMax | 20;
            this.mOutMin = outMin | 0;
            this.mOutMax = outMax | 1;
        };
        AnalogInputInterface.prototype.receiveData = function (data) {
            var inputVal = Number(data.split("=")[1]);
            log("Analog input received", inputVal, normalize(inputVal, this.mInMin, this.mInMax, this.mOutMin, this.mOutMax));
            var finalVal = this.mNormalize ? normalize(inputVal, this.mInMin, this.mInMax, this.mOutMin, this.mOutMax) : inputVal;
            this.value = finalVal;
        };
        AnalogInputInterface.prototype.userFriendlyName = function () {
            return "AnalogIn";
        };
        __decorate([
            (0, Metadata_1.property)("Analog input value", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], AnalogInputInterface.prototype, "value", null);
        __decorate([
            (0, Metadata_1.callable)(" Send settings command to the element"),
            __param(0, (0, Metadata_1.parameter)("Commande to send e.g. 4:3 or 7:8")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], AnalogInputInterface.prototype, "sendSettingsCmd", null);
        __decorate([
            (0, Metadata_1.callable)(" Send settings command to the element"),
            __param(0, (0, Metadata_1.parameter)("Command to send e.g. [CR06:BOT=0510 or CR06:TOP=0514]")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], AnalogInputInterface.prototype, "sendSetRangesCmd", null);
        __decorate([
            (0, Metadata_1.callable)("Configure Analog Input"),
            __param(0, (0, Metadata_1.parameter)("Normalize (false)", true)),
            __param(1, (0, Metadata_1.parameter)("Lowest expected input value  (0)", true)),
            __param(2, (0, Metadata_1.parameter)("Highest expected input value(20)", true)),
            __param(3, (0, Metadata_1.parameter)("Lower Lowest Output value (0)", true)),
            __param(4, (0, Metadata_1.parameter)("Highest output value (1)", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Boolean, Number, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], AnalogInputInterface.prototype, "normalizedAnalogInput", null);
        return AnalogInputInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(AnalogInputInterface, "AnalogIn", "XDWA50");
    var IoInterface = (function (_super) {
        __extends(IoInterface, _super);
        function IoInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mState = false;
            return _this;
        }
        Object.defineProperty(IoInterface.prototype, "state", {
            get: function () { return this.mState; },
            set: function (value) {
                if (this.mState === value)
                    return;
                this.sendData("X" + this.ifaceNo() + "A[" + (value ? "1" : "0") + "]");
                this.mState = value;
            },
            enumerable: false,
            configurable: true
        });
        IoInterface.prototype.sendLedCmd = function (cmd) {
            this.sendData("X" + this.ifaceNo() + "L[" + cmd + "]");
        };
        IoInterface.prototype.receiveData = function (data) {
            log("IO input received", data);
            this.mState = data === "1";
            this.changed("state");
        };
        IoInterface.prototype.userFriendlyName = function () {
            return "AnalogIn";
        };
        __decorate([
            (0, Metadata_1.property)("IO state"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], IoInterface.prototype, "state", null);
        __decorate([
            (0, Metadata_1.callable)(" Set IO LED state, see api for details"),
            __param(0, (0, Metadata_1.parameter)("1=on, 2=off or e.g. 3009912=ramp, 4009910=pulse")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], IoInterface.prototype, "sendLedCmd", null);
        return IoInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(IoInterface, "IO", "XDWI36", "XDWI56");
    var EncoderInterface = (function (_super) {
        __extends(EncoderInterface, _super);
        function EncoderInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mDirection = "";
            _this.mValue = 0;
            _this.mAbsValue = 0;
            return _this;
        }
        Object.defineProperty(EncoderInterface.prototype, "direction", {
            get: function () { return this.mDirection; },
            set: function (value) { this.mDirection = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(EncoderInterface.prototype, "value", {
            get: function () { return this.mValue; },
            set: function (value) { this.mValue = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(EncoderInterface.prototype, "absoluteValue", {
            get: function () { return this.mAbsValue; },
            set: function (value) { this.mAbsValue = value; },
            enumerable: false,
            configurable: true
        });
        EncoderInterface.prototype.sendSettings = function (cmd) {
            this.sendData("X" + this.ifaceNo() + "S[" + cmd + "]");
        };
        EncoderInterface.prototype.receiveData = function (data) {
            log("Encoder input received", data);
            var splitData = data.split("=");
            var prefix = splitData[0];
            if (prefix === "Av") {
                this.absoluteValue = parseInt(splitData[1]);
                return;
            }
            if (prefix === "Rd") {
                var sensorValue = splitData[1];
                var parts = sensorValue.split(":");
                this.direction = parts[0];
                var increment = this.direction === "CW";
                this.value = Number(parts[1]);
                log("Increment value", this.value, this.value, -this.value);
                this.absoluteValue = this.mAbsValue + (increment ? Number(parts[1]) : -Number(parts[1]));
            }
        };
        EncoderInterface.prototype.userFriendlyName = function () {
            return "Encoder";
        };
        __decorate([
            (0, Metadata_1.property)("Direction CW or CCW", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], EncoderInterface.prototype, "direction", null);
        __decorate([
            (0, Metadata_1.property)("Delta", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], EncoderInterface.prototype, "value", null);
        __decorate([
            (0, Metadata_1.property)("Absolute Value", false),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], EncoderInterface.prototype, "absoluteValue", null);
        __decorate([
            (0, Metadata_1.callable)(" Send setting, see api for details"),
            __param(0, (0, Metadata_1.parameter)("Setting, e.g. 1:1 or 10:1")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], EncoderInterface.prototype, "sendSettings", null);
        return EncoderInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(EncoderInterface, "ENCODER", "XDWE60");
    var AngleInterface = (function (_super) {
        __extends(AngleInterface, _super);
        function AngleInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mXAngle = 0;
            _this.mYAngle = 0;
            _this.mZAngle = 0;
            _this.mTriggerFromPosition = 0;
            return _this;
        }
        AngleInterface.prototype.receiveData = function (data) {
            log("Angle input received", data);
            var parts = data.split("=");
            var prefix = parts[0];
            var values = parts[1].split(",");
            switch (prefix) {
                case "O":
                    this.xAngle = Number(values[0]);
                    this.yAngle = Number(values[1]);
                    this.zAngle = Number(values[2]);
                    break;
                case "X":
                    this.xAngle = Number(values[0]);
                    break;
                case "Y":
                    this.yAngle = Number(values[0]);
                    break;
                case "Z":
                    this.zAngle = Number(values[0]);
                    break;
                case "P":
                    this.triggerFromPosition = Number(values[0]);
                    break;
                default:
                    console.log("Unknown Angle prefix: ", prefix);
                    break;
            }
        };
        Object.defineProperty(AngleInterface.prototype, "xAngle", {
            get: function () { return this.mXAngle; },
            set: function (value) { this.mXAngle = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AngleInterface.prototype, "yAngle", {
            get: function () { return this.mYAngle; },
            set: function (value) { this.mYAngle = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AngleInterface.prototype, "zAngle", {
            get: function () { return this.mZAngle; },
            set: function (value) { this.mZAngle = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AngleInterface.prototype, "triggerFromPosition", {
            get: function () { return this.mTriggerFromPosition; },
            set: function (value) { this.mTriggerFromPosition = value; },
            enumerable: false,
            configurable: true
        });
        AngleInterface.prototype.sendSettings = function (cmd) {
            this.sendData("X" + this.ifaceNo() + "S[" + cmd + "]");
        };
        AngleInterface.prototype.storePosition = function (posNo) {
            this.sendData("X" + this.ifaceNo() + "B[STORE=P" + limitedVal(posNo, 1, 8) + "]");
        };
        AngleInterface.prototype.clearPosition = function (posNo) {
            var value = "";
            if (posNo = 0)
                value = "ALL";
            else
                value = String(limitedVal(posNo, 1, 8));
            this.sendData("X" + this.ifaceNo() + "B[CLEAR=P" + value + "]");
        };
        AngleInterface.prototype.resetToFactorySettings = function () {
            this.sendData("X" + this.ifaceNo() + "B[FACTORYRESET]");
        };
        AngleInterface.prototype.userFriendlyName = function () {
            return "Angle";
        };
        __decorate([
            (0, Metadata_1.property)("X Angle", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], AngleInterface.prototype, "xAngle", null);
        __decorate([
            (0, Metadata_1.property)("Y Angle", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], AngleInterface.prototype, "yAngle", null);
        __decorate([
            (0, Metadata_1.property)("Z Angle", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], AngleInterface.prototype, "zAngle", null);
        __decorate([
            (0, Metadata_1.property)("Trigger from stored position", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], AngleInterface.prototype, "triggerFromPosition", null);
        __decorate([
            (0, Metadata_1.callable)("Send setting, see api for details"),
            __param(0, (0, Metadata_1.parameter)("Setting, e.g. 1:1 or 9:2")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], AngleInterface.prototype, "sendSettings", null);
        __decorate([
            (0, Metadata_1.callable)("Store current position"),
            __param(0, (0, Metadata_1.parameter)("Position number 1-8")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], AngleInterface.prototype, "storePosition", null);
        __decorate([
            (0, Metadata_1.callable)(" Clears stored position"),
            __param(0, (0, Metadata_1.parameter)("Position number 1-8, 0 for all")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], AngleInterface.prototype, "clearPosition", null);
        __decorate([
            (0, Metadata_1.callable)("Factory reset"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], AngleInterface.prototype, "resetToFactorySettings", null);
        return AngleInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(AngleInterface, "ANGLE", "XZA40");
    var TemperatureInterface = (function (_super) {
        __extends(TemperatureInterface, _super);
        function TemperatureInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mHumidity = 0;
            _this.mTemperature = 0;
            return _this;
        }
        TemperatureInterface.prototype.receiveData = function (data) {
            log("Temperature input received", data);
            var parts = data.split("=");
            var prefix = parts[0];
            var value = parts[1];
            if (prefix === "Hr" || prefix === "Hv") {
                this.humidity = Number(value);
                return;
            }
            if (prefix === "Tr" || prefix === "Tv") {
                this.temperature = Number(value);
                return;
            }
        };
        Object.defineProperty(TemperatureInterface.prototype, "humidity", {
            get: function () { return this.mHumidity; },
            set: function (value) { this.mHumidity = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TemperatureInterface.prototype, "temperature", {
            get: function () { return this.mTemperature; },
            set: function (value) { this.mTemperature = value; },
            enumerable: false,
            configurable: true
        });
        TemperatureInterface.prototype.sendSettings = function (cmd) {
            this.sendData("X" + this.ifaceNo() + "S[" + cmd + "]");
        };
        TemperatureInterface.prototype.updateValues = function (cmd) {
            var options = {
                0: "ALL?",
                1: "HUMI?",
                2: "TEMP?"
            };
            var limitCmd = limitedVal(cmd, 0, 2, 1, false);
            this.sendData("X" + this.ifaceNo() + "B[" + options[limitCmd] + "]");
        };
        TemperatureInterface.prototype.userFriendlyName = function () {
            return "Temperature";
        };
        __decorate([
            (0, Metadata_1.property)("Humidity", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], TemperatureInterface.prototype, "humidity", null);
        __decorate([
            (0, Metadata_1.property)("Temperature", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], TemperatureInterface.prototype, "temperature", null);
        __decorate([
            (0, Metadata_1.callable)(" Send setting, see api for details"),
            __param(0, (0, Metadata_1.parameter)("Setting, e.g. 1:1 or 4:5")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], TemperatureInterface.prototype, "sendSettings", null);
        __decorate([
            (0, Metadata_1.callable)("Update value request"),
            __param(0, (0, Metadata_1.parameter)("0=all(*) 1=Humidity 2=Temperature", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], TemperatureInterface.prototype, "updateValues", null);
        return TemperatureInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(TemperatureInterface, "TEMP", "XET50");
    var AmbientLightInterface = (function (_super) {
        __extends(AmbientLightInterface, _super);
        function AmbientLightInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mIntencity = 0;
            return _this;
        }
        AmbientLightInterface.prototype.receiveData = function (data) {
            log("Ambient light input received", data);
            var parts = data.split("=");
            var prefix = parts[0];
            var value = parts[1];
            if (prefix === "Ar" || prefix === "Av") {
                this.intencity = Number(value);
                return;
            }
        };
        Object.defineProperty(AmbientLightInterface.prototype, "intencity", {
            get: function () { return this.mIntencity; },
            set: function (value) { this.mIntencity = value; },
            enumerable: false,
            configurable: true
        });
        AmbientLightInterface.prototype.sendSettings = function (cmd) {
            this.sendData("X" + this.ifaceNo() + "S[" + cmd + "]");
        };
        AmbientLightInterface.prototype.updateValues = function () {
            this.sendData("X" + this.ifaceNo() + "B[LUX?]");
        };
        AmbientLightInterface.prototype.userFriendlyName = function () {
            return "AmbientLight";
        };
        __decorate([
            (0, Metadata_1.property)("intencity", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], AmbientLightInterface.prototype, "intencity", null);
        __decorate([
            (0, Metadata_1.callable)(" Send setting, see api for details"),
            __param(0, (0, Metadata_1.parameter)("Setting, e.g. 1:2 or 6:1")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], AmbientLightInterface.prototype, "sendSettings", null);
        __decorate([
            (0, Metadata_1.callable)("Update value request"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], AmbientLightInterface.prototype, "updateValues", null);
        return AmbientLightInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(AmbientLightInterface, "AMBIENTLIGHT", "XEA20");
    var LightInterface = (function (_super) {
        __extends(LightInterface, _super);
        function LightInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mLight = 0;
            return _this;
        }
        LightInterface.prototype.receiveData = function (data) {
            log("Ambient light input received", data);
            this.light = Number(data);
            return;
        };
        Object.defineProperty(LightInterface.prototype, "light", {
            get: function () { return this.mLight; },
            set: function (value) { this.mLight = value; },
            enumerable: false,
            configurable: true
        });
        LightInterface.prototype.sendSettings = function (cmd) {
            this.sendData("X" + this.ifaceNo() + "S[" + cmd + "]");
        };
        LightInterface.prototype.userFriendlyName = function () {
            return "Light";
        };
        __decorate([
            (0, Metadata_1.property)("Detected light", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LightInterface.prototype, "light", null);
        __decorate([
            (0, Metadata_1.callable)(" Send setting, see api for details"),
            __param(0, (0, Metadata_1.parameter)("Setting, e.g. 1:2 or 6:1")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], LightInterface.prototype, "sendSettings", null);
        return LightInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(LightInterface, "LIGHT", "XZL20");
    var ColorInterface = (function (_super) {
        __extends(ColorInterface, _super);
        function ColorInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mLight = 0;
            _this.mSaturation = 0;
            _this.mHue = 0;
            _this.mReflection = 0;
            _this.mCalibrating = false;
            _this.mHasObject = false;
            return _this;
        }
        ColorInterface.prototype.receiveData = function (data) {
            log("Ambient light input received", data);
            var parts = data.split("=");
            var prefix = parts[0];
            var value = parts[1];
            switch (prefix) {
                case "Hv":
                    this.hue = Number(value);
                    break;
                case "Sv":
                    this.saturation = Number(value);
                    break;
                case "Lv":
                    this.light = Number(value);
                    break;
                case "Rv":
                    this.reflection = Number(value);
                    break;
                case "CALI":
                    this.calibrating = !(value === "DONE");
                    break;
                case "Cv":
                    if (value === "XXX,XXX,XXX") {
                        this.hasObject = false;
                        return;
                    }
                    this.hasObject = true;
                    var parts_1 = value.split(",");
                    this.hue = Number(parts_1[0]);
                    this.saturation = Number(parts_1[1]);
                    this.light = Number(parts_1[2]);
                    break;
                default:
                    console.log("Unsupported color prefix: ", prefix);
                    break;
            }
        };
        Object.defineProperty(ColorInterface.prototype, "light", {
            get: function () { return this.mLight; },
            set: function (value) { this.mLight = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ColorInterface.prototype, "saturation", {
            get: function () { return this.mSaturation; },
            set: function (value) { this.mSaturation = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ColorInterface.prototype, "hue", {
            get: function () { return this.mHue; },
            set: function (value) { this.mHue = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ColorInterface.prototype, "reflection", {
            get: function () { return this.mReflection; },
            set: function (value) { this.mReflection = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ColorInterface.prototype, "calibrating", {
            get: function () { return this.mCalibrating; },
            set: function (value) { this.mCalibrating = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ColorInterface.prototype, "hasObject", {
            get: function () { return this.mHasObject; },
            set: function (value) { this.mHasObject = value; },
            enumerable: false,
            configurable: true
        });
        ColorInterface.prototype.updateValues = function (cmd) {
            var options = {
                0: "ALL?",
                1: "HSL?",
                2: "SAT?",
                3: "LIGHT?",
                4: "REFL?"
            };
            var limitCmd = limitedVal(cmd, 0, 2, 1, false);
            this.sendData("X" + this.ifaceNo() + "B[" + options[limitCmd] + "]");
        };
        ColorInterface.prototype.calibrateBackground = function () {
            this.sendData("X" + this.ifaceNo() + "B[CALI=BG]");
            this.calibrating = true;
        };
        ColorInterface.prototype.calibrateWhite = function () {
            this.sendData("X" + this.ifaceNo() + "B[CALI=WH]");
            this.calibrating = true;
        };
        ColorInterface.prototype.resetToFactorySettings = function () {
            this.sendData("X" + this.ifaceNo() + "B[FACTORYRESET]");
        };
        ColorInterface.prototype.setLedIntencity = function (intencity) {
            var limitedIntencity = padVal(limitedVal(intencity, 0, 100, 1, false));
            this.sendData("X" + this.ifaceNo() + "B[LED=" + limitedIntencity + "]");
        };
        ColorInterface.prototype.setMeasuringTime = function (timeMs) {
            var limitedTime = limitedVal(timeMs, 1, 5, 1, false);
            this.sendData("X" + this.ifaceNo() + "B[MEASURE=" + limitedTime + "]");
        };
        ColorInterface.prototype.sendSettings = function (cmd) {
            this.sendData("X" + this.ifaceNo() + "S[" + cmd + "]");
        };
        ColorInterface.prototype.userFriendlyName = function () {
            return "Color";
        };
        __decorate([
            (0, Metadata_1.property)("Detected light", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], ColorInterface.prototype, "light", null);
        __decorate([
            (0, Metadata_1.property)("Detected saturation", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], ColorInterface.prototype, "saturation", null);
        __decorate([
            (0, Metadata_1.property)("Detected hue", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], ColorInterface.prototype, "hue", null);
        __decorate([
            (0, Metadata_1.property)("Detected reflection", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], ColorInterface.prototype, "reflection", null);
        __decorate([
            (0, Metadata_1.property)("Calibrating", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], ColorInterface.prototype, "calibrating", null);
        __decorate([
            (0, Metadata_1.property)("Has object detected", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], ColorInterface.prototype, "hasObject", null);
        __decorate([
            (0, Metadata_1.callable)("Update value request"),
            __param(0, (0, Metadata_1.parameter)("0=ALL but REFLECTION(*) 1=HSL 2=SAT 3=LIGHT 4=REFLECTION", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], ColorInterface.prototype, "updateValues", null);
        __decorate([
            (0, Metadata_1.callable)("Calibrate background"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], ColorInterface.prototype, "calibrateBackground", null);
        __decorate([
            (0, Metadata_1.callable)("Calibrate white reference"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], ColorInterface.prototype, "calibrateWhite", null);
        __decorate([
            (0, Metadata_1.callable)("Factory reset"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], ColorInterface.prototype, "resetToFactorySettings", null);
        __decorate([
            (0, Metadata_1.callable)("Set intencity of measuring light"),
            __param(0, (0, Metadata_1.parameter)("Intencity 0-100", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], ColorInterface.prototype, "setLedIntencity", null);
        __decorate([
            (0, Metadata_1.callable)("Set measuring time"),
            __param(0, (0, Metadata_1.parameter)("Time in ms 1-5", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], ColorInterface.prototype, "setMeasuringTime", null);
        __decorate([
            (0, Metadata_1.callable)(" Send setting, see api for details"),
            __param(0, (0, Metadata_1.parameter)("Setting, e.g. 1:2 or 6:1")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], ColorInterface.prototype, "sendSettings", null);
        return ColorInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(ColorInterface, "COLOR", "XZH60");
    var ShelfWeightInterface = (function (_super) {
        __extends(ShelfWeightInterface, _super);
        function ShelfWeightInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mWeight = 0;
            _this.mPickupTrigger = false;
            _this.mAnomalyCount = 0;
            _this.mAnomalyDetected = false;
            _this.mStockLevel = 0;
            _this.mStockChange = 0;
            _this.mCalibrating = false;
            return _this;
        }
        Object.defineProperty(ShelfWeightInterface.prototype, "anomalyCount", {
            get: function () { return this.mAnomalyCount; },
            set: function (value) { this.mAnomalyCount = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ShelfWeightInterface.prototype, "anomalyDetected", {
            get: function () { return this.mAnomalyDetected; },
            set: function (value) { this.mAnomalyDetected = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ShelfWeightInterface.prototype, "stockLevel", {
            get: function () { return this.mStockLevel; },
            set: function (value) { this.mStockLevel = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ShelfWeightInterface.prototype, "stockChange", {
            get: function () { return this.mStockChange; },
            set: function (value) { this.mStockChange = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ShelfWeightInterface.prototype, "pickupTrigger", {
            get: function () { return this.mPickupTrigger; },
            set: function (value) { this.mPickupTrigger = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ShelfWeightInterface.prototype, "weight", {
            get: function () { return this.mWeight; },
            set: function (value) { this.mWeight = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ShelfWeightInterface.prototype, "calibrating", {
            get: function () { return this.mCalibrating; },
            set: function (value) { this.mCalibrating = value; },
            enumerable: false,
            configurable: true
        });
        ShelfWeightInterface.prototype.sendSettings = function (cmd) {
            this.sendData("X" + this.ifaceNo() + "S[" + cmd + "]");
        };
        ShelfWeightInterface.prototype.requestStockLevel = function () {
            this.sendData("X" + this.ifaceNo() + "B[STOCK?]");
        };
        ShelfWeightInterface.prototype.setStock = function (stockLevel) {
            this.stockLevel = limitedVal(stockLevel, 0, 999);
            this.sendData("X" + this.ifaceNo() + "B[STOCKSET=" + padVal(limitedVal(stockLevel, 0, 999), 3) + "]");
        };
        ShelfWeightInterface.prototype.setItemWeight = function (itemWeight) {
            this.sendData("X" + this.ifaceNo() + "B[ITEMWEIGHT=" + padVal(limitedVal(itemWeight, 1, 999, 1, false), 3, 3) + "]");
        };
        ShelfWeightInterface.prototype.stockMeasure = function (itemCount) {
            this.sendData("X" + this.ifaceNo() + "B[STOCKMEASURE=" + padVal(limitedVal(itemCount, 1, 999, 1, true)) + "]");
        };
        ShelfWeightInterface.prototype.calibrateTara = function () {
            this.sendData("X" + this.ifaceNo() + "B[CALIBRATE=BASE]");
            this.calibrating = true;
        };
        ShelfWeightInterface.prototype.calibrateReferenceWeight = function (referenceWeight) {
            this.sendData("X" + this.ifaceNo() + "B[CALIBRATE=" + padVal(limitedVal(referenceWeight, 1, 999, 1, false), 3, 3) + "]");
            this.calibrating = true;
        };
        ShelfWeightInterface.prototype.receiveData = function (data) {
            log("Weight input receivedd", data);
            var parts = data.split("=");
            var prefix = parts[0];
            var value = parts[1];
            if (prefix.indexOf("ANOMALY") === 0) {
                var num = Number(prefix.slice("ANOMALY".length));
                this.anomalyCount = num;
                this.anomalyDetected = value === "DETECTED";
                return;
            }
            switch (prefix) {
                case "STOCKCHANGE":
                    break;
                case "STOCK":
                    break;
                case "PICKUP":
                    this.pickupTrigger = true;
                    break;
                case "WEIGHT":
                    this.weight = Number(value);
                    break;
                case "CALIBRATION":
                    this.calibrating = !(value === "DONE");
                    break;
                default:
                    console.log("Unsupported color prefix: ", prefix);
                    break;
            }
        };
        ShelfWeightInterface.prototype.userFriendlyName = function () {
            return "ShelfWeight";
        };
        __decorate([
            (0, Metadata_1.property)("Anomaly count", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], ShelfWeightInterface.prototype, "anomalyCount", null);
        __decorate([
            (0, Metadata_1.property)("Anomaly detected", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], ShelfWeightInterface.prototype, "anomalyDetected", null);
        __decorate([
            (0, Metadata_1.property)("Stock level", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], ShelfWeightInterface.prototype, "stockLevel", null);
        __decorate([
            (0, Metadata_1.property)("Stock change", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], ShelfWeightInterface.prototype, "stockChange", null);
        __decorate([
            (0, Metadata_1.property)("Pickup trigger"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], ShelfWeightInterface.prototype, "pickupTrigger", null);
        __decorate([
            (0, Metadata_1.property)("Weight value", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], ShelfWeightInterface.prototype, "weight", null);
        __decorate([
            (0, Metadata_1.property)("Calibrating", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], ShelfWeightInterface.prototype, "calibrating", null);
        __decorate([
            (0, Metadata_1.callable)(" Send setting, see api for details"),
            __param(0, (0, Metadata_1.parameter)("Setting, e.g. 1:2 or 6:1")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], ShelfWeightInterface.prototype, "sendSettings", null);
        __decorate([
            (0, Metadata_1.callable)("Request stock level"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], ShelfWeightInterface.prototype, "requestStockLevel", null);
        __decorate([
            (0, Metadata_1.callable)("Set current stock level"),
            __param(0, (0, Metadata_1.parameter)("Stock level 0-999")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], ShelfWeightInterface.prototype, "setStock", null);
        __decorate([
            (0, Metadata_1.callable)("Set itemwight"),
            __param(0, (0, Metadata_1.parameter)("Item weight 1-999 kg")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], ShelfWeightInterface.prototype, "setItemWeight", null);
        __decorate([
            (0, Metadata_1.callable)("Store stock item weight"),
            __param(0, (0, Metadata_1.parameter)("Number of items to measure stock weight for (1-999)", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], ShelfWeightInterface.prototype, "stockMeasure", null);
        __decorate([
            (0, Metadata_1.callable)("Calibrate base weight (Zero,Tara)"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], ShelfWeightInterface.prototype, "calibrateTara", null);
        __decorate([
            (0, Metadata_1.callable)("Calibrate reference weight"),
            __param(0, (0, Metadata_1.parameter)("Reference weight recommended 5-10 kg", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], ShelfWeightInterface.prototype, "calibrateReferenceWeight", null);
        return ShelfWeightInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(ShelfWeightInterface, "SHELFWEIGHT", "X-S4x", "X-S8x");
    var BarWeightInterface = (function (_super) {
        __extends(BarWeightInterface, _super);
        function BarWeightInterface() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mWeight = 0;
            _this.mCalibrating = false;
            _this.mWeightDifference = 0;
            _this.mAnomalyDetected = false;
            _this.mLiftedItems = [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
            return _this;
        }
        Object.defineProperty(BarWeightInterface.prototype, "weight", {
            get: function () { return this.mWeight; },
            set: function (value) { this.mWeight = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BarWeightInterface.prototype, "calibrating", {
            get: function () { return this.mCalibrating; },
            set: function (value) { this.mCalibrating = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BarWeightInterface.prototype, "weightDifference", {
            get: function () { return this.mWeightDifference; },
            set: function (value) { this.mWeightDifference = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BarWeightInterface.prototype, "anomalyDetected", {
            get: function () { return this.mAnomalyDetected; },
            set: function (value) { this.mAnomalyDetected = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BarWeightInterface.prototype, "liftedItem_1", {
            get: function () { return this.mLiftedItems[0]; },
            set: function (value) { this.mLiftedItems[0] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BarWeightInterface.prototype, "liftedItem_2", {
            get: function () { return this.mLiftedItems[1]; },
            set: function (value) { this.mLiftedItems[1] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BarWeightInterface.prototype, "liftedItem_3", {
            get: function () { return this.mLiftedItems[2]; },
            set: function (value) { this.mLiftedItems[2] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BarWeightInterface.prototype, "liftedItem_4", {
            get: function () { return this.mLiftedItems[3]; },
            set: function (value) { this.mLiftedItems[3] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BarWeightInterface.prototype, "liftedItem_5", {
            get: function () { return this.mLiftedItems[4]; },
            set: function (value) { this.mLiftedItems[4] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BarWeightInterface.prototype, "liftedItem_6", {
            get: function () { return this.mLiftedItems[5]; },
            set: function (value) { this.mLiftedItems[5] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BarWeightInterface.prototype, "liftedItem_7", {
            get: function () { return this.mLiftedItems[6]; },
            set: function (value) { this.mLiftedItems[6] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BarWeightInterface.prototype, "liftedItem_8", {
            get: function () { return this.mLiftedItems[7]; },
            set: function (value) { this.mLiftedItems[7] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BarWeightInterface.prototype, "liftedItem_9", {
            get: function () { return this.mLiftedItems[8]; },
            set: function (value) { this.mLiftedItems[8] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BarWeightInterface.prototype, "liftedItem_10", {
            get: function () { return this.mLiftedItems[9]; },
            set: function (value) { this.mLiftedItems[9] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BarWeightInterface.prototype, "liftedItem_11", {
            get: function () { return this.mLiftedItems[10]; },
            set: function (value) { this.mLiftedItems[10] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BarWeightInterface.prototype, "liftedItem_12", {
            get: function () { return this.mLiftedItems[11]; },
            set: function (value) { this.mLiftedItems[11] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BarWeightInterface.prototype, "liftedItem_13", {
            get: function () { return this.mLiftedItems[12]; },
            set: function (value) { this.mLiftedItems[12] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BarWeightInterface.prototype, "liftedItem_14", {
            get: function () { return this.mLiftedItems[13]; },
            set: function (value) { this.mLiftedItems[13] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BarWeightInterface.prototype, "liftedItem_15", {
            get: function () { return this.mLiftedItems[14]; },
            set: function (value) { this.mLiftedItems[14] = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BarWeightInterface.prototype, "liftedItem_16", {
            get: function () { return this.mLiftedItems[15]; },
            set: function (value) { this.mLiftedItems[15] = value; },
            enumerable: false,
            configurable: true
        });
        BarWeightInterface.prototype.requestWeight = function () {
            this.sendData("X" + this.ifaceNo() + "B[WEIGHT?]");
        };
        BarWeightInterface.prototype.sendSettings = function (cmd) {
            this.sendData("X" + this.ifaceNo() + "S[" + cmd + "]");
        };
        BarWeightInterface.prototype.calibrateTara = function () {
            this.sendData("X" + this.ifaceNo() + "B[CALIBRATE=BASE]");
            this.calibrating = true;
        };
        BarWeightInterface.prototype.calibrateReferenceWeight = function (referenceWeight) {
            this.sendData("X" + this.ifaceNo() + "B[CALIBRATE=" + padVal(limitedVal(referenceWeight, 1, 999, 1, false), 5, 1) + "]");
            this.calibrating = true;
        };
        BarWeightInterface.prototype.setItemWeight = function (itemNo, itemWeight) {
            this.sendData("X" + this.ifaceNo() + "B[ITEM" + padVal(itemNo, 2) + "WEIGHT=" + padVal(limitedVal(itemWeight, 1, 9999, 1, false), 5, 1) + "]");
        };
        BarWeightInterface.prototype.measureCustomItemWeight = function (itemNo, itemCount) {
            var padded = itemCount > 0
                ? "=" + padVal(limitedVal(itemCount, 1, 999, 1, true))
                : "";
            this.sendData("X" +
                this.ifaceNo() +
                "B[ITEM" +
                padVal(itemNo, 2) +
                "MEASURE" +
                padded +
                "]");
        };
        BarWeightInterface.prototype.clearCustomItem = function (itemNo) {
            this.sendData("X" + this.ifaceNo() + "B[CLEARITEM=" + itemNo + "]");
        };
        BarWeightInterface.prototype.clearAllCustomItems = function () {
            this.sendData("X" + this.ifaceNo() + "B[CLEARALLITEMS]");
        };
        BarWeightInterface.prototype.resetToFactorySettings = function () {
            this.sendData("X" + this.ifaceNo() + "B[FACTORYRESET]");
        };
        BarWeightInterface.prototype.receiveData = function (data) {
            log("Bar weight input received", data);
            var parts = data.split("=");
            var prefix = parts[0];
            var value = parts[1];
            switch (prefix) {
                case "WEIGHT":
                    this.weight = Number(value);
                    break;
                case "WEIGHTDIFF":
                    this.weightDifference = Number(value);
                    break;
                case "ANOMALY":
                    this.anomalyDetected = value === "DETECTED";
                    break;
                case "CALIBRATION":
                    this.calibrating = !(value === "DONE");
                    break;
                case "ITEM":
                    var itemParts = value.split(",");
                    var itemInfo_1 = {};
                    itemParts.forEach(function (part) {
                        var _a = part.split(":"), key = _a[0], val = _a[1];
                        itemInfo_1[key] = val;
                    });
                    console.log("Received item info: ", itemInfo_1);
                    break;
                case "PU":
                    var pickItemNo = Number(value);
                    log(pickItemNo);
                    if (pickItemNo >= 1 && pickItemNo <= 16) {
                        this.mLiftedItems[pickItemNo - 1] = true;
                        this.changed("liftedItem_" + pickItemNo);
                    }
                    break;
                case "PB":
                    var putItemNo = Number(value);
                    if (putItemNo >= 1 && putItemNo <= 16) {
                        this.mLiftedItems[putItemNo - 1] = false;
                        this.changed("liftedItem_" + putItemNo);
                    }
                    break;
                case "ERROR":
                    console.log("Bar Weight Error: ", value);
                    break;
                default:
                    console.log("Unsupported Bar weight prefix: ", prefix);
                    break;
            }
        };
        BarWeightInterface.prototype.userFriendlyName = function () {
            return "BarWeight";
        };
        __decorate([
            (0, Metadata_1.property)("Weight value", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], BarWeightInterface.prototype, "weight", null);
        __decorate([
            (0, Metadata_1.property)("Calibrating", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], BarWeightInterface.prototype, "calibrating", null);
        __decorate([
            (0, Metadata_1.property)("Weight difference", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], BarWeightInterface.prototype, "weightDifference", null);
        __decorate([
            (0, Metadata_1.property)("Anomaly detected", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], BarWeightInterface.prototype, "anomalyDetected", null);
        __decorate([
            (0, Metadata_1.property)("LiftedItem_1", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], BarWeightInterface.prototype, "liftedItem_1", null);
        __decorate([
            (0, Metadata_1.property)("LiftedItem_2", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], BarWeightInterface.prototype, "liftedItem_2", null);
        __decorate([
            (0, Metadata_1.property)("LiftedItem_3", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], BarWeightInterface.prototype, "liftedItem_3", null);
        __decorate([
            (0, Metadata_1.property)("LiftedItem_4", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], BarWeightInterface.prototype, "liftedItem_4", null);
        __decorate([
            (0, Metadata_1.property)("LiftedItem_5", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], BarWeightInterface.prototype, "liftedItem_5", null);
        __decorate([
            (0, Metadata_1.property)("LiftedItem_6", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], BarWeightInterface.prototype, "liftedItem_6", null);
        __decorate([
            (0, Metadata_1.property)("LiftedItem_7", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], BarWeightInterface.prototype, "liftedItem_7", null);
        __decorate([
            (0, Metadata_1.property)("LiftedItem_8", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], BarWeightInterface.prototype, "liftedItem_8", null);
        __decorate([
            (0, Metadata_1.property)("LiftedItem_9", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], BarWeightInterface.prototype, "liftedItem_9", null);
        __decorate([
            (0, Metadata_1.property)("LiftedItem_10", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], BarWeightInterface.prototype, "liftedItem_10", null);
        __decorate([
            (0, Metadata_1.property)("LiftedItem_11", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], BarWeightInterface.prototype, "liftedItem_11", null);
        __decorate([
            (0, Metadata_1.property)("LiftedItem_12", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], BarWeightInterface.prototype, "liftedItem_12", null);
        __decorate([
            (0, Metadata_1.property)("LiftedItem_13", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], BarWeightInterface.prototype, "liftedItem_13", null);
        __decorate([
            (0, Metadata_1.property)("LiftedItem_14", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], BarWeightInterface.prototype, "liftedItem_14", null);
        __decorate([
            (0, Metadata_1.property)("LiftedItem_15", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], BarWeightInterface.prototype, "liftedItem_15", null);
        __decorate([
            (0, Metadata_1.property)("LiftedItem_16", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], BarWeightInterface.prototype, "liftedItem_16", null);
        __decorate([
            (0, Metadata_1.callable)("Request weight"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], BarWeightInterface.prototype, "requestWeight", null);
        __decorate([
            (0, Metadata_1.callable)(" Send setting, see api for details"),
            __param(0, (0, Metadata_1.parameter)("Setting, e.g. 1:2 or 6:1")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], BarWeightInterface.prototype, "sendSettings", null);
        __decorate([
            (0, Metadata_1.callable)("Calibrate base weight (Zero,Tara)"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], BarWeightInterface.prototype, "calibrateTara", null);
        __decorate([
            (0, Metadata_1.callable)("Calibrate reference weight in grams"),
            __param(0, (0, Metadata_1.parameter)("Reference weight recommended 500-1000 grams", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], BarWeightInterface.prototype, "calibrateReferenceWeight", null);
        __decorate([
            (0, Metadata_1.callable)("Set item weight in grams"),
            __param(0, (0, Metadata_1.parameter)("Item number 1-16")),
            __param(1, (0, Metadata_1.parameter)("Item weight 1-9999.9 grams")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number]),
            __metadata("design:returntype", void 0)
        ], BarWeightInterface.prototype, "setItemWeight", null);
        __decorate([
            (0, Metadata_1.callable)("Measure a custom items weight"),
            __param(0, (0, Metadata_1.parameter)("Item number 1-16")),
            __param(1, (0, Metadata_1.parameter)("Number of items to measure weight for (1-999)", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number]),
            __metadata("design:returntype", void 0)
        ], BarWeightInterface.prototype, "measureCustomItemWeight", null);
        __decorate([
            (0, Metadata_1.callable)("Clear a custom item name and weight"),
            __param(0, (0, Metadata_1.parameter)("Item number 1-16")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], BarWeightInterface.prototype, "clearCustomItem", null);
        __decorate([
            (0, Metadata_1.callable)("Clear all custom item names and weights"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], BarWeightInterface.prototype, "clearAllCustomItems", null);
        __decorate([
            (0, Metadata_1.callable)("Factory reset"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], BarWeightInterface.prototype, "resetToFactorySettings", null);
        return BarWeightInterface;
    }(BaseInterface));
    NexmosphereBase.registerInterface(BarWeightInterface, "BARWEIGHT", "XZ-W11", "XZ-W21", "XZ-W51");
    var WirePickup = (function (_super) {
        __extends(WirePickup, _super);
        function WirePickup() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mPickup = false;
            _this.mAlarm = false;
            return _this;
        }
        Object.defineProperty(WirePickup.prototype, "alarm", {
            get: function () { return this.mAlarm; },
            set: function (value) { this.mAlarm = value; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(WirePickup.prototype, "pickup", {
            get: function () { return this.mPickup; },
            set: function (value) { this.mPickup = value; },
            enumerable: false,
            configurable: true
        });
        WirePickup.prototype.receiveData = function (data) {
            var value = Number(data);
            this.alarm = (value & 4) !== 0;
            this.pickup = (value & 3) !== 0;
        };
        WirePickup.prototype.sendSettings = function (cmd) {
            this.sendData("X" + this.ifaceNo() + "S[" + cmd + "]");
        };
        WirePickup.prototype.userFriendlyName = function () {
            return "PickUp";
        };
        __decorate([
            (0, Metadata_1.property)("Alarm state", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], WirePickup.prototype, "alarm", null);
        __decorate([
            (0, Metadata_1.property)("Pickup state", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], WirePickup.prototype, "pickup", null);
        __decorate([
            __param(0, (0, Metadata_1.parameter)("Setting, e.g. 1:2 or 4:7")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], WirePickup.prototype, "sendSettings", null);
        return WirePickup;
    }(BaseInterface));
    NexmosphereBase.registerInterface(WirePickup, "DOTWIREPICKUP", "XSNAPPER", "XDWX16", "XDWX26", "XDWX36", "XDWX36C", "XDBX16", "XDBX26", "XDBX36", "XDBX36C", "XSWX16", "XSWX26", "XSWX36", "XSBX16", "XSBX26", "XSBX36", "XLFWX16", "XLFWX26", "XLFWX36", "XLFBX16", "XLFBX26", "XLFBX36", "XLCWX16", "XLCWX26", "XLCWX36", "XLCBX16", "XLCBX26", "XLCBX36");
    var WirelessPickup = (function (_super) {
        __extends(WirelessPickup, _super);
        function WirelessPickup() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.mPickup = false;
            return _this;
        }
        Object.defineProperty(WirelessPickup.prototype, "pickup", {
            get: function () { return this.mPickup; },
            set: function (value) { this.mPickup = value; },
            enumerable: false,
            configurable: true
        });
        WirelessPickup.prototype.pairingMode = function () {
            this.sendData("X" + this.ifaceNo() + "B[PAIR]");
        };
        WirelessPickup.prototype.unPaire = function () {
            this.sendData("X" + this.ifaceNo() + "B[UNPAIR]");
        };
        WirelessPickup.prototype.receiveData = function (data) {
            var value = Number(data);
            this.pickup = (value & 3) !== 0;
        };
        WirelessPickup.prototype.sendSettings = function (cmd) {
            this.sendData("X" + this.ifaceNo() + "S[" + cmd + "]");
        };
        WirelessPickup.prototype.userFriendlyName = function () {
            return "PickUp";
        };
        __decorate([
            (0, Metadata_1.property)("Pickup state", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], WirelessPickup.prototype, "pickup", null);
        __decorate([
            (0, Metadata_1.callable)("Enable pairing mode for wireless pickup sensors"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], WirelessPickup.prototype, "pairingMode", null);
        __decorate([
            (0, Metadata_1.callable)("Unpair this wireless pickup sensor"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], WirelessPickup.prototype, "unPaire", null);
        __decorate([
            __param(0, (0, Metadata_1.parameter)("Setting, e.g. 5:1 or 8:1")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], WirelessPickup.prototype, "sendSettings", null);
        return WirelessPickup;
    }(BaseInterface));
    NexmosphereBase.registerInterface(WirelessPickup, "WIRELESSPICKUP", " XFP3W", "XF-P3B", "XF-P3N");
    function padVal(num, width, decimalWidth) {
        if (width === void 0) { width = 3; }
        var str = String(num);
        var dot = str.indexOf('.');
        if (dot === -1) {
            while (str.length < width) {
                str = "0" + str;
            }
            return str;
        }
        var parts = str.split('.');
        var intPart = parts[0];
        var decPart = parts[1];
        while (intPart.length < width) {
            intPart = "0" + intPart;
        }
        if (!decimalWidth) {
            return intPart + "." + decPart;
        }
        var rounded = Number(num).toFixed(decimalWidth);
        var rParts = rounded.split('.');
        var roundedInt = rParts[0];
        var roundedDec = rParts[1];
        var finalInt = roundedInt;
        while (finalInt.length < width) {
            finalInt = "0" + finalInt;
        }
        while (roundedDec.length < decimalWidth) {
            roundedDec = roundedDec + "0";
        }
        return finalInt + "." + roundedDec;
    }
    exports.padVal = padVal;
    function toHex(num, width) {
        if (width === void 0) { width = 2; }
        var hex = num.toString(16);
        if (width > 0) {
            hex = ('00000000' + hex).slice(-width);
        }
        return hex;
    }
    exports.toHex = toHex;
    function limitedVal(num, minVal, maxVal, scale, round) {
        if (scale === void 0) { scale = 1; }
        if (round === void 0) { round = true; }
        var clamped = Math.max(minVal, Math.min(maxVal, num)) * scale;
        return round ? Math.round(clamped) : clamped;
    }
    exports.limitedVal = limitedVal;
    function normalize(value, inMin, inMax, outMin, outMax) {
        return outMin + ((value - inMin) * (outMax - outMin)) / (inMax - inMin);
    }
    exports.normalize = normalize;
    function log() {
        var messages = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            messages[_i] = arguments[_i];
        }
        if (true)
            console.log(messages);
    }
    exports.log = log;
});
