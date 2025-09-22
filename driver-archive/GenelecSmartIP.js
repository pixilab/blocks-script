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
define(["require", "exports", "../system/SimpleHTTP", "../system_lib/Driver", "../system_lib/Metadata"], function (require, exports, SimpleHTTP_1, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.GenelecSmartIP = void 0;
    var GenelecSmartIP = (function (_super) {
        __extends(GenelecSmartIP, _super);
        function GenelecSmartIP(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this._mute = false;
            _this._volume = 0;
            _this._profile = 0;
            _this._connected = false;
            _this._zone = "";
            _this._active = false;
            _this._aoipName = "";
            _this._enableAoIP01 = false;
            _this._enableAoIP02 = false;
            _this._enableAnalog = false;
            _this._hasAnalog = false;
            if (socket.enabled) {
                if (socket.options != "") {
                    _this.auth = "Basic" + _this.toBase64(socket.options);
                }
                else {
                    console.warn("No credentials in driver options, trying default");
                    _this.auth = "BasicYWRtaW46YWRtaW4=";
                }
                _this.initStatus();
            }
            return _this;
        }
        GenelecSmartIP.prototype.initStatus = function () {
            return __awaiter(this, void 0, void 0, function () {
                var error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 7, , 8]);
                            return [4, this.getPowerStatus()];
                        case 1:
                            _a.sent();
                            return [4, this.getVolumeLevel()];
                        case 2:
                            _a.sent();
                            return [4, this.getProfileList()];
                        case 3:
                            _a.sent();
                            return [4, this.getZone()];
                        case 4:
                            _a.sent();
                            return [4, this.getAOIPName()];
                        case 5:
                            _a.sent();
                            return [4, this.getInputSources()];
                        case 6:
                            _a.sent();
                            return [3, 8];
                        case 7:
                            error_1 = _a.sent();
                            console.error("Error during initStatus:", error_1);
                            return [3, 8];
                        case 8: return [2];
                    }
                });
            });
        };
        GenelecSmartIP.prototype.getVolumeLevel = function () {
            return __awaiter(this, void 0, void 0, function () {
                var response, data, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4, this.sendRequest("audio/volume")];
                        case 1:
                            response = _a.sent();
                            data = response.interpreted;
                            this.volume = this.dbToNorm(data.level);
                            this.mute = data.mute;
                            return [3, 3];
                        case 2:
                            err_1 = _a.sent();
                            console.error("Failed to fetch initial volume:", err_1);
                            return [3, 3];
                        case 3: return [2];
                    }
                });
            });
        };
        GenelecSmartIP.prototype.getPowerStatus = function () {
            return __awaiter(this, void 0, void 0, function () {
                var response, data, err_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4, this.sendRequest("device/pwr")];
                        case 1:
                            response = _a.sent();
                            data = response.interpreted;
                            this.active = (data.state === "ACTIVE");
                            return [3, 3];
                        case 2:
                            err_2 = _a.sent();
                            console.error("Failed to fetch initial power:", err_2);
                            return [3, 3];
                        case 3: return [2];
                    }
                });
            });
        };
        GenelecSmartIP.prototype.getProfileList = function () {
            return __awaiter(this, void 0, void 0, function () {
                var response, data, err_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4, this.sendRequest("profile/list")];
                        case 1:
                            response = _a.sent();
                            data = response.interpreted;
                            this.profile = data.selected;
                            return [3, 3];
                        case 2:
                            err_3 = _a.sent();
                            console.error("Failed to fetch initial profile:", err_3);
                            return [3, 3];
                        case 3: return [2];
                    }
                });
            });
        };
        GenelecSmartIP.prototype.getZone = function () {
            return __awaiter(this, void 0, void 0, function () {
                var response, data, err_4;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4, this.sendRequest("network/zone")];
                        case 1:
                            response = _a.sent();
                            data = response.interpreted;
                            this.zone = data.name;
                            return [3, 3];
                        case 2:
                            err_4 = _a.sent();
                            console.error("Failed to fetch initial zone:", err_4);
                            return [3, 3];
                        case 3: return [2];
                    }
                });
            });
        };
        GenelecSmartIP.prototype.getAOIPName = function () {
            return __awaiter(this, void 0, void 0, function () {
                var response, data, err_5;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4, this.sendRequest("aoip/dante/identity")];
                        case 1:
                            response = _a.sent();
                            data = response.interpreted;
                            this.aoipName = data.fname;
                            return [3, 3];
                        case 2:
                            err_5 = _a.sent();
                            console.error("Failed to fetch initial zone:", err_5);
                            return [3, 3];
                        case 3: return [2];
                    }
                });
            });
        };
        GenelecSmartIP.prototype.getInputSources = function () {
            return __awaiter(this, void 0, void 0, function () {
                var response, data, err_6;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4, this.sendRequest("audio/inputs")];
                        case 1:
                            response = _a.sent();
                            data = response.interpreted;
                            data.input.forEach(function (input) {
                                if (input === "A") {
                                    _this._hasAnalog = true;
                                    _this._enableAnalog = true;
                                }
                            });
                            return [3, 3];
                        case 2:
                            err_6 = _a.sent();
                            console.error("Failed to fetch initial zone:", err_6);
                            return [3, 3];
                        case 3: return [2];
                    }
                });
            });
        };
        Object.defineProperty(GenelecSmartIP.prototype, "connected", {
            get: function () {
                return this._connected;
            },
            set: function (value) {
                this._connected = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GenelecSmartIP.prototype, "mute", {
            get: function () {
                return this._mute;
            },
            set: function (value) {
                if (this._mute !== value && this._active) {
                    var endPoint = "audio/volume";
                    var payload = {
                        level: this._volume,
                        mute: value
                    };
                    this.sendCommand(endPoint, payload);
                    this._mute = value;
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GenelecSmartIP.prototype, "active", {
            get: function () {
                return this._active;
            },
            set: function (value) {
                var endPoint = "device/pwr";
                var payload = {
                    state: value ? "ACTIVE" : "STANDBY"
                };
                this.sendCommand(endPoint, payload);
                this._active = value;
                this.mute = false;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GenelecSmartIP.prototype, "volume", {
            get: function () {
                return this._volume;
            },
            set: function (value) {
                if (this._volume !== value && this._active) {
                    var endPoint = "audio/volume";
                    var payload = {
                        level: this.normToDb_linearInDb(value),
                        mute: this._mute
                    };
                    this.sendCommand(endPoint, payload);
                    this._volume = value;
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GenelecSmartIP.prototype, "profile", {
            get: function () {
                return this._profile;
            },
            set: function (value) {
                if (this._profile !== value && this._active) {
                    var endPoint = "profile/restore";
                    var payload = {
                        id: value,
                        startup: true
                    };
                    this.sendCommand(endPoint, payload);
                    this._profile = value;
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GenelecSmartIP.prototype, "enableAoIP01", {
            get: function () {
                return this._enableAoIP01;
            },
            set: function (value) {
                if (this._enableAoIP01 !== value && this._active) {
                    this._enableAoIP01 = value;
                    this.sendInputCommand();
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GenelecSmartIP.prototype, "enableAoIP02", {
            get: function () {
                return this._enableAoIP02;
            },
            set: function (value) {
                if (this._enableAoIP02 !== value && this._active) {
                    this._enableAoIP02 = value;
                    this.sendInputCommand();
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GenelecSmartIP.prototype, "enableAnalog", {
            get: function () {
                return this._enableAnalog;
            },
            set: function (value) {
                if (this._enableAnalog !== value && this._active && this._hasAnalog) {
                    this._enableAnalog = value;
                    this.sendInputCommand();
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GenelecSmartIP.prototype, "zone", {
            get: function () {
                return this._zone;
            },
            set: function (value) {
                this._zone = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GenelecSmartIP.prototype, "aoipName", {
            get: function () {
                return this._aoipName;
            },
            set: function (value) {
                this._aoipName = value;
            },
            enumerable: false,
            configurable: true
        });
        GenelecSmartIP.prototype.sendInputCommand = function () {
            var endPoint = "audio/inputs";
            var payload = [];
            if (this._enableAoIP01)
                payload.push("AoIP01");
            if (this._enableAoIP02)
                payload.push("AoIP02");
            if (this._enableAnalog)
                payload.push("A");
            var cmd = { input: payload };
            this.sendCommand(endPoint, cmd);
        };
        GenelecSmartIP.prototype.sendCommand = function (endPoint, payload) {
            return __awaiter(this, void 0, void 0, function () {
                var response, err_7;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.socket.enabled) {
                                this.connected = false;
                                return [2];
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4, SimpleHTTP_1.SimpleHTTP
                                    .newRequest("http://".concat(this.socket.address, ":").concat(this.socket.port, "/public/v1/").concat(endPoint))
                                    .header("Authorization", this.auth)
                                    .put(JSON.stringify(payload))];
                        case 2:
                            response = _a.sent();
                            this.connected = true;
                            return [2, response];
                        case 3:
                            err_7 = _a.sent();
                            this.connected = false;
                            return [3, 4];
                        case 4: return [2];
                    }
                });
            });
        };
        GenelecSmartIP.prototype.sendRequest = function (endPoint) {
            return __awaiter(this, void 0, void 0, function () {
                var response, err_8;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.socket.enabled) {
                                this.connected = false;
                                return [2];
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4, SimpleHTTP_1.SimpleHTTP
                                    .newRequest("http://".concat(this.socket.address, ":").concat(this.socket.port, "/public/v1/").concat(endPoint), { interpretResponse: true })
                                    .header("Authorization", this.auth)
                                    .get()];
                        case 2:
                            response = _a.sent();
                            this.connected = true;
                            return [2, response];
                        case 3:
                            err_8 = _a.sent();
                            console.error("Request failed:", err_8);
                            this.connected = false;
                            return [3, 4];
                        case 4: return [2];
                    }
                });
            });
        };
        GenelecSmartIP.prototype.normToDb_linearInDb = function (v) {
            var clamped = Math.min(1, Math.max(0, v));
            var db = -200 + 200 * clamped;
            var quantized = Math.round(db * 10) / 10;
            return Math.min(0, Math.max(-200, quantized));
        };
        GenelecSmartIP.prototype.dbToNorm = function (db) {
            var c = Math.min(0, Math.max(-200, db));
            return (c + 200) / 200;
        };
        GenelecSmartIP.prototype.toBase64 = function (str) {
            var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            var result = "";
            var i = 0;
            while (i < str.length) {
                var c1 = str.charCodeAt(i++);
                var c2 = str.charCodeAt(i++);
                var c3 = str.charCodeAt(i++);
                var e1 = c1 >> 2;
                var e2 = ((c1 & 3) << 4) | (c2 >> 4);
                var e3 = isNaN(c2) ? 64 : ((c2 & 15) << 2) | (c3 >> 6);
                var e4 = isNaN(c2) || isNaN(c3) ? 64 : (c3 & 63);
                result += chars.charAt(e1) + chars.charAt(e2) + (e3 === 64 ? "=" : chars.charAt(e3)) + (e4 === 64 ? "=" : chars.charAt(e4));
            }
            return result;
        };
        __decorate([
            (0, Metadata_1.property)("Device connected status", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], GenelecSmartIP.prototype, "connected", null);
        __decorate([
            (0, Metadata_1.property)("Mute the speaker"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], GenelecSmartIP.prototype, "mute", null);
        __decorate([
            (0, Metadata_1.property)("Device Active"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], GenelecSmartIP.prototype, "active", null);
        __decorate([
            (0, Metadata_1.property)("Normalized volume"),
            (0, Metadata_1.min)(0),
            (0, Metadata_1.max)(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], GenelecSmartIP.prototype, "volume", null);
        __decorate([
            (0, Metadata_1.property)("Speaker profile"),
            (0, Metadata_1.min)(0),
            (0, Metadata_1.max)(5),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], GenelecSmartIP.prototype, "profile", null);
        __decorate([
            (0, Metadata_1.property)("Enable AoIP01 source"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], GenelecSmartIP.prototype, "enableAoIP01", null);
        __decorate([
            (0, Metadata_1.property)("Enable AoIP02 source"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], GenelecSmartIP.prototype, "enableAoIP02", null);
        __decorate([
            (0, Metadata_1.property)("Enable Analog source"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], GenelecSmartIP.prototype, "enableAnalog", null);
        __decorate([
            (0, Metadata_1.property)("Zone name", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], GenelecSmartIP.prototype, "zone", null);
        __decorate([
            (0, Metadata_1.property)("Speaker AIOP fname", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], GenelecSmartIP.prototype, "aoipName", null);
        GenelecSmartIP = __decorate([
            (0, Metadata_1.driver)('NetworkTCP', { port: 9000 }),
            __metadata("design:paramtypes", [Object])
        ], GenelecSmartIP);
        return GenelecSmartIP;
    }(Driver_1.Driver));
    exports.GenelecSmartIP = GenelecSmartIP;
});
