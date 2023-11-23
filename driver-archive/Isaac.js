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
define(["require", "exports", "../system/SimpleHTTP", "../system_lib/Metadata", "../system/Realm", "../system_lib/Driver"], function (require, exports, SimpleHTTP_1, Metadata_1, Realm_1, Driver_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Isaac = void 0;
    var Talker = (function () {
        function Talker(owner) {
            this.owner = owner;
        }
        Talker.prototype.letsTalk = function () {
            this.owner.somethingToSay(this);
        };
        return Talker;
    }());
    var Logger = (function (_super) {
        __extends(Logger, _super);
        function Logger(owner) {
            var _this = _super.call(this, owner) || this;
            _this.messagesToSend = [];
            return _this;
        }
        Logger.prototype.logInfo = function (message) {
            this.logMsg({ message: message, severity: 'info' });
        };
        Logger.prototype.logMsg = function (message) {
            var wasLogMsgCount = this.messagesToSend.length;
            if (wasLogMsgCount < 100) {
                this.messagesToSend.push(message);
                if (!wasLogMsgCount)
                    this.letsTalk();
            }
            else
                console.error("Logging can't keep up - dropping messages");
        };
        Logger.prototype.needsToTalk = function () {
            return !!this.messagesToSend.length;
        };
        Logger.prototype.saySomething = function () {
            return this.owner.sendLog(this.messagesToSend.shift());
        };
        Logger.prototype.whatToSay = function () {
            return "log " + this.messagesToSend[0];
        };
        return Logger;
    }(Talker));
    var VarSnitch = (function (_super) {
        __extends(VarSnitch, _super);
        function VarSnitch(owner) {
            var _this = _super.call(this, owner) || this;
            _this.pending = {};
            _this.order = [];
            return _this;
        }
        VarSnitch.prototype.notify = function (key, value) {
            log("notify", key, value);
            if (value === undefined)
                console.warn("Variable undefined", key);
            else {
                var knownProperty = this.pending.hasOwnProperty(key);
                this.pending[key] = value;
                if (!knownProperty) {
                    this.order.push(key);
                    if (this.order.length === 1)
                        this.letsTalk();
                }
            }
        };
        VarSnitch.prototype.needsToTalk = function () {
            return !!this.order.length;
        };
        VarSnitch.prototype.saySomething = function () {
            var key = this.order.shift();
            var valueToTell = this.pending[key];
            delete this.pending[key];
            var result = this.owner.sendVarChange(key, valueToTell);
            return result;
        };
        VarSnitch.prototype.whatToSay = function () {
            var key = this.order[0];
            return "variable " + key + ' value ' + this.pending[key];
        };
        return VarSnitch;
    }(Talker));
    var Isaac = (function (_super) {
        __extends(Isaac, _super);
        function Isaac(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.nextTalkerIx = 0;
            socket.setMaxLineLength(1024);
            socket.autoConnect();
            _this.varIds = {};
            _this.taskIds = {};
            _this.talkers = [];
            _this.varSnitch = new VarSnitch(_this);
            _this.talkers.push(_this.varSnitch);
            _this.logger = new Logger(_this);
            _this.talkers.push(_this.logger);
            _this.accessors = [];
            _this.init()
                .then(function () { return log("Started"); })
                .catch(function (error) { return console.error("Startup failed", error); });
            return _this;
        }
        Isaac.prototype.init = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, this.config()];
                        case 1:
                            _a.sent();
                            if (this.socket.enabled)
                                this.heartBeat();
                            return [2];
                    }
                });
            });
        };
        Isaac.prototype.log = function (message) {
            this.logger.logInfo(message);
        };
        Isaac.prototype.config = function () {
            return __awaiter(this, void 0, void 0, function () {
                var config;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.socket.options)
                                throw "Configuration options not set";
                            config = JSON.parse(this.socket.options);
                            if (!(typeof config === 'object')) return [3, 4];
                            if (!config.subsystemExternalId)
                                config.subsystemExternalId = "blocks";
                            this.configuration = config;
                            this.origin = (config.protocol || 'http') + '://' + this.socket.addressString;
                            log("Origin", this.origin);
                            if (!this.socket.enabled) return [3, 3];
                            return [4, this.hookupVars(config)];
                        case 1:
                            _a.sent();
                            return [4, this.hookupEvents(config)];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3: return [3, 5];
                        case 4: throw "Invalid configuration";
                        case 5: return [2];
                    }
                });
            });
        };
        Isaac.prototype.hookupVars = function (config) {
            return __awaiter(this, void 0, void 0, function () {
                var endpoint, existingVars, setOfKnownVars, _i, _a, xv, spec, _b, _c, varName, result, _d, _e, _f, _g, unwanted, id;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            if (!config.variables) return [3, 11];
                            endpoint = '/api/v1/variables';
                            return [4, this
                                    .newRequest(endpoint + '?subsystemExternalId=' + config.subsystemExternalId)
                                    .get()];
                        case 1:
                            existingVars = _h.sent();
                            setOfKnownVars = {};
                            for (_i = 0, _a = existingVars.interpreted; _i < _a.length; _i++) {
                                xv = _a[_i];
                                setOfKnownVars[xv.externalRef] = xv._id;
                                this.varIds[xv.externalRef] = xv._id;
                            }
                            delete setOfKnownVars["last_contacted_at"];
                            delete setOfKnownVars["is_alive"];
                            spec = {
                                subsystemExternalId: config.subsystemExternalId,
                                externalRef: null
                            };
                            _b = 0, _c = config.variables;
                            _h.label = 2;
                        case 2:
                            if (!(_b < _c.length)) return [3, 7];
                            varName = _c[_b];
                            spec.externalRef = varName;
                            if (!setOfKnownVars[varName]) return [3, 3];
                            delete setOfKnownVars[varName];
                            return [3, 5];
                        case 3: return [4, this.newRequest(endpoint).post(JSON.stringify(spec))];
                        case 4:
                            result = _h.sent();
                            if (result.status > 299)
                                console.warn(endpoint, result.status, result.data);
                            this.varIds[varName] = result.interpreted._id;
                            _h.label = 5;
                        case 5:
                            if (!this.varsSubscribed)
                                this.establishVariable(varName);
                            _h.label = 6;
                        case 6:
                            _b++;
                            return [3, 2];
                        case 7:
                            this.varsSubscribed = true;
                            _d = setOfKnownVars;
                            _e = [];
                            for (_f in _d)
                                _e.push(_f);
                            _g = 0;
                            _h.label = 8;
                        case 8:
                            if (!(_g < _e.length)) return [3, 11];
                            _f = _e[_g];
                            if (!(_f in _d)) return [3, 10];
                            unwanted = _f;
                            id = setOfKnownVars[unwanted];
                            log("Removing variable", unwanted, "with ID", id);
                            return [4, this.newRequest(endpoint + '/' + id).delete()];
                        case 9:
                            _h.sent();
                            _h.label = 10;
                        case 10:
                            _g++;
                            return [3, 8];
                        case 11: return [2];
                    }
                });
            });
        };
        Isaac.prototype.hookupEvents = function (config) {
            return __awaiter(this, void 0, void 0, function () {
                var endpoint, existingVars, knownTasks, _i, _a, xv, spec, _b, _c, evtName, result, _d, _e, _f, _g, unwanted, id;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            if (!config.events) return [3, 10];
                            endpoint = '/api/v1/events';
                            return [4, this
                                    .newRequest(endpoint + '?subsystemExternalId=' + config.subsystemExternalId)
                                    .get()];
                        case 1:
                            existingVars = _h.sent();
                            knownTasks = {};
                            for (_i = 0, _a = existingVars.interpreted; _i < _a.length; _i++) {
                                xv = _a[_i];
                                knownTasks[xv.externalRef] = xv._id;
                                this.taskIds[xv.externalRef] = xv._id;
                            }
                            spec = {
                                subsystemExternalId: config.subsystemExternalId,
                                active: true,
                                availableInSubsystem: true,
                                externalRef: null,
                                displayName: null,
                                command: null
                            };
                            _b = 0, _c = config.events;
                            _h.label = 2;
                        case 2:
                            if (!(_b < _c.length)) return [3, 6];
                            evtName = _c[_b];
                            if (!knownTasks[evtName]) return [3, 3];
                            delete knownTasks[evtName];
                            return [3, 5];
                        case 3:
                            spec.externalRef = evtName;
                            spec.command = evtName;
                            spec.displayName = evtName;
                            return [4, this.newRequest(endpoint).post(JSON.stringify(spec))];
                        case 4:
                            result = _h.sent();
                            if (result.status > 299)
                                console.warn(endpoint, result.status, result.data);
                            this.taskIds[evtName] = result.interpreted._id;
                            _h.label = 5;
                        case 5:
                            _b++;
                            return [3, 2];
                        case 6:
                            this.hookupEventTriggers(config);
                            _d = knownTasks;
                            _e = [];
                            for (_f in _d)
                                _e.push(_f);
                            _g = 0;
                            _h.label = 7;
                        case 7:
                            if (!(_g < _e.length)) return [3, 10];
                            _f = _e[_g];
                            if (!(_f in _d)) return [3, 9];
                            unwanted = _f;
                            id = knownTasks[unwanted];
                            log("Removing event", unwanted, "with ID", id);
                            return [4, this.newRequest(endpoint + '/' + id).delete()];
                        case 8:
                            _h.sent();
                            _h.label = 9;
                        case 9:
                            _g++;
                            return [3, 7];
                        case 10: return [2];
                    }
                });
            });
        };
        Isaac.prototype.hookupVarsOld = function (config) {
            if (config.variables) {
                var varPaths = [];
                for (var _i = 0, _a = config.variables; _i < _a.length; _i++) {
                    var varName = _a[_i];
                    this.establishVariable(varName);
                    varPaths.push(varName);
                }
                var vars = {
                    externalRefs: varPaths
                };
                var endpoint_1 = "/api/v1/subsystems/".concat(config.subsystemExternalId, "/variables/_available");
                var result = this.newRequest(endpoint_1).put(JSON.stringify(vars));
                result.then(function (result) {
                    if (result.status > 299)
                        console.warn(endpoint_1, result.status, result.data);
                })
                    .catch(function (error) { return console.error(endpoint_1, error); });
                return result;
            }
        };
        Isaac.prototype.hookupEventsOld = function (config) {
            var _this = this;
            if (config.events) {
                var eventPaths_1 = [];
                var ids = [];
                var ix = 0;
                for (var _i = 0, _a = config.events; _i < _a.length; _i++) {
                    var taskName = _a[_i];
                    eventPaths_1.push(taskName);
                    ids.push(ix++);
                }
                var tasks = {
                    commands: eventPaths_1,
                    ids: ids
                };
                this.newRequest("/api/v1/subsystems/".concat(config.subsystemExternalId, "/events/_available"))
                    .put(JSON.stringify(tasks))
                    .then(function (result) {
                    if (result.status > 299) {
                        console.warn("events/_available status", result.status, result.data);
                        _this.registerEvents(eventPaths_1);
                    }
                    else
                        _this.registerEvents(eventPaths_1);
                })
                    .catch(function (error) { return console.error("events/_available failure", error); });
                if (config.events)
                    this.hookupEventTriggers(config);
            }
        };
        Isaac.prototype.registerEvents = function (eventPaths, ix) {
            var _this = this;
            if (ix === void 0) { ix = 0; }
            if (eventPaths.length > ix) {
                var path = eventPaths[ix];
                log("registerEvents", path);
                var eventSpec = {
                    command: path,
                    displayName: path,
                    externalRef: path,
                    subsystemExternalId: this.configuration.subsystemExternalId,
                    active: true,
                    availableInSubsystem: true
                };
                this.newRequest('/api/v1/events')
                    .post(JSON.stringify(eventSpec))
                    .then(function (result) {
                    if (result.status > 299)
                        console.warn("/api/v1/events", result.status, result.data);
                    else if (++ix < eventPaths.length)
                        _this.registerEvents(eventPaths, ix);
                })
                    .catch(function (error) { return console.error("/api/v1/events failed", error); });
            }
        };
        Isaac.prototype.hookupEventTriggers = function (config) {
            var _this = this;
            var socket = this.socket;
            this.initRpc(socket);
            socket.subscribe('connect', function (sender, message) {
                if (message.type === 'Connection') {
                    if (sender.connected)
                        _this.initRpc(sender);
                    else
                        _this.rpcConnectionLost();
                }
            });
        };
        Isaac.prototype.initRpc = function (socket) {
            var _this = this;
            if (socket.connected) {
                log("RPC socket connected");
                var subscribe = {
                    "jsonrpc": "2.0",
                    "method": "subscriptions.add",
                    "params": [
                        this.configuration.subsystemExternalId
                    ],
                };
                var textMsg = JSON.stringify(subscribe);
                socket.sendText(textMsg, '\r\n');
                log("initRpc subscriptions.add", textMsg);
                socket.subscribe('textReceived', function (sender, message) {
                    try {
                        try {
                            log("RPC message", message.text);
                            var jsonData = JSON.parse(message.text);
                            if (jsonData.jsonrpc === '2.0' && jsonData.method) {
                                log("JSON-RPC data", message.text);
                                _this.handleJsonRpcMsg(jsonData);
                            }
                            else if (jsonData.result !== undefined)
                                log("JSON-RPC response", message.text);
                            else
                                console.error("JSON-RPC unexpected data", message.text);
                        }
                        catch (ex) {
                            console.error("JSON-RPC parse error", ex);
                        }
                    }
                    catch (error) {
                        console.error("JSON-RPC parse error", error, "caused by", message.text);
                    }
                });
                this.jsonRpcKeepAlive();
            }
        };
        Isaac.prototype.rpcConnectionLost = function () {
            console.warn("RPC connection lost");
            if (this.keepAliveTimer) {
                this.keepAliveTimer.cancel();
                this.keepAliveTimer = undefined;
            }
        };
        Isaac.prototype.jsonRpcKeepAlive = function () {
            var _this = this;
            this.keepAliveTimer = wait(1000 * 59);
            this.keepAliveTimer.then(function () {
                var pingMsg = '{"jsonrpc":"2.0","method":"ping"}';
                log("rpc sent", pingMsg);
                _this.socket.sendText(pingMsg, '\r\n');
                if (_this.socket.connected)
                    _this.jsonRpcKeepAlive();
                else
                    _this.keepAliveTimer = undefined;
            });
        };
        Isaac.prototype.handleJsonRpcMsg = function (msg) {
            if (msg.method === "schedule.item.start" && msg.params && msg.params.command) {
                this.startTask(msg.params.command);
            }
            else
                log("rpc message", msg.method);
        };
        Isaac.prototype.establishVariable = function (path) {
            var _this = this;
            log("establishVariable", path);
            var accessor = this.getProperty(path, function (newValue) {
                _this.varSnitch.notify(path, newValue);
            });
            if (accessor.available)
                this.varSnitch.notify(path, accessor.value);
            this.accessors.push(accessor);
        };
        Isaac.prototype.destroy = function () {
            if (this.heartBeatTimer)
                this.heartBeatTimer.cancel();
            if (this.keepAliveTimer)
                this.keepAliveTimer.cancel();
            for (var _i = 0, _a = this.accessors; _i < _a.length; _i++) {
                var accessor = _a[_i];
                accessor.close();
            }
        };
        Isaac.prototype.heartBeat = function () {
            var _this = this;
            this.heartBeatTimer = wait(this.configuration.heartbeatInterval || 9300);
            this.heartBeatTimer.then(function () {
                _this.sendHeartBeat();
                _this.heartBeat();
            });
        };
        Isaac.prototype.sendHeartBeat = function () {
            var result = this
                .newRequest("/api/v1/subsystems/".concat(this.configuration.subsystemExternalId, "/heartbeat"))
                .put('');
            result.catch(function (error) { return console.warn("Heartbeat failure", error); });
            return result;
        };
        Isaac.prototype.somethingToSay = function (talker) {
            if (!this.waitingToTalk)
                this.talk();
        };
        Isaac.prototype.waitForNextSaying = function (toWaitFor) {
            var _this = this;
            this.waitingToTalk = toWaitFor;
            this.waitingToTalk
                .then(function () { return _this.talk(); })
                .catch(function () { return _this.talk(); });
        };
        Isaac.prototype.talk = function () {
            var talker = this.findTalker();
            if (talker) {
                var msg_1 = talker.whatToSay();
                log("Saying", msg_1);
                var talkPromise = talker.saySomething();
                talkPromise.catch(function (error) { return console.warn("Failed telling", msg_1, error); });
                this.waitForNextSaying(talkPromise);
            }
            else {
                this.waitingToTalk = undefined;
            }
        };
        Isaac.prototype.findTalker = function () {
            var ix = this.nextTalkerIx;
            var wasTalkerIx = ix;
            var talker = null;
            do {
                talker = this.talkers[ix++];
                if (ix >= this.talkers.length)
                    ix = 0;
                if (talker.needsToTalk())
                    break;
                talker = null;
            } while (wasTalkerIx !== ix);
            this.nextTalkerIx = ix;
            return talker;
        };
        Isaac.prototype.sendLog = function (message) {
            var toLog = {
                severity: message.severity,
                key: "general",
                createdByType: "subsystem",
                value: message.message,
                createdBy: this.configuration.subsystemExternalId
            };
            return SimpleHTTP_1.SimpleHTTP
                .newRequest("".concat(this.origin, "/api/v1/logs"))
                .post(JSON.stringify(toLog));
        };
        Isaac.prototype.sendVarChange = function (path, value) {
            log("sendVarChange", path, value);
            var id = this.varIds[path];
            var varData = {
                value: value.toString()
            };
            return this.newRequest("/api/v1/variables/".concat(id, "/value"))
                .post(JSON.stringify(varData));
        };
        Isaac.prototype.newRequest = function (path) {
            var request = SimpleHTTP_1.SimpleHTTP.newRequest(this.origin + path, { interpretResponse: true });
            var token = this.configuration.token;
            if (token)
                request.header('isaac-token', token);
            return request;
        };
        Isaac.prototype.startTask = function (path) {
            var parts = path.split('.');
            if (parts.length !== 3)
                throw "Task path not in the form Realm.Group.Name; " + path;
            var realm = Realm_1.Realm[parts[0]];
            if (!realm)
                throw "No Realm " + parts[0];
            var group = realm.group[parts[1]];
            if (!group)
                throw "No Group " + parts[1];
            var task = group[parts[2]];
            if (!task)
                throw "No Task " + parts[2];
            log("Run task", path);
            task.running = true;
        };
        __decorate([
            (0, Metadata_1.callable)("Log message to Isaac"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], Isaac.prototype, "log", null);
        Isaac = __decorate([
            (0, Metadata_1.driver)('NetworkTCP', { port: 8099 }),
            __metadata("design:paramtypes", [Object])
        ], Isaac);
        return Isaac;
    }(Driver_1.Driver));
    exports.Isaac = Isaac;
    var DEBUG = true;
    function log() {
        var messages = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            messages[_i] = arguments[_i];
        }
        if (DEBUG)
            console.info(messages);
    }
});
