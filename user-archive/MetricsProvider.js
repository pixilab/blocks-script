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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
define(["require", "exports", "system/Spot", "system_lib/Script", "system/SimpleHTTP", "system/SimpleFile", "system_lib/Metadata"], function (require, exports, Spot_1, Script_1, SimpleHTTP_1, SimpleFile_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MetricsProvider = void 0;
    var DEFAULT_SETTINGS = {
        LOGGING_ENABLED: false,
        SYSTEM_NAME: "PIXILAB",
        COUNTRY: "Sweden",
        CITY: "Linkoping",
        TRACKER_URL: "https://yourdomain/matomo.php",
        TRACKED_URL: "http://your_blocks_server",
        ACCESS_TOKEN: "",
        SITE_ID: 1,
        MAX_QUEUE_LENGTH: 50,
        MAX_SEND_INTERVALL: 1000 * 60,
        LANGUAGE_TAG_MAPPING: {
            se: "Swedish",
            en: "English",
            es: "Spanish",
            de: "German"
        }
    };
    var API_VERSION = 1;
    var CONFIG_FILE = "MetricsProviderSettings.json";
    var settings = DEFAULT_SETTINGS;
    var MetricsProvider = (function (_super) {
        __extends(MetricsProvider, _super);
        function MetricsProvider(env) {
            var _this = _super.call(this, env) || this;
            _this.messageQueue = {
                requests: [],
                token_auth: settings.ACCESS_TOKEN
            };
            _this.readSettingsFromFile();
            return _this;
        }
        MetricsProvider.prototype.readSettingsFromFile = function () {
            var _this = this;
            SimpleFile_1.SimpleFile.readJson(CONFIG_FILE).then(function (data) {
                try {
                    settings = data;
                    if (settings) {
                        _this.getAllSpots(Spot_1.Spot);
                    }
                }
                catch (parseError) {
                    console.error("Failed parsing JSON data from file", CONFIG_FILE, parseError);
                }
            }).catch(function (error) {
                console.log(error + " Could not find config, trying to write example file to script/files/ " + CONFIG_FILE);
                SimpleFile_1.SimpleFile.write(CONFIG_FILE + ".example", JSON.stringify(DEFAULT_SETTINGS, null, 2))
                    .then(function () {
                    console.log("Example config file with default values written successfully");
                    _this.readSettingsFromFile();
                })
                    .catch(function (error) {
                    console.error("Failed writing file:", CONFIG_FILE, error);
                });
            });
        };
        MetricsProvider.prototype.getAllSpots = function (spotGroup) {
            var spotGroupItems = spotGroup;
            for (var item in spotGroupItems) {
                var spotGroupItem = spotGroupItems[item];
                var displaySpot = spotGroupItem.isOfTypeName("DisplaySpot");
                if (displaySpot) {
                    log("Found displayspot: " + spotGroupItem.fullName);
                    new TrackedSpot(spotGroupItem, this);
                }
                else {
                    var spotGroup_1 = spotGroupItem.isOfTypeName("SpotGroup");
                    if (spotGroup_1) {
                        log("Found spotgroup: " + spotGroupItem.fullName + " find spots recursive");
                        this.getAllSpots(spotGroupItem);
                    }
                }
            }
        };
        MetricsProvider.prototype.recreateTrackedSpot = function (spotPath) {
            var spotPathWithoutSpot = spotPath.replace(/^Spot\./, '');
            if (Spot_1.Spot[spotPathWithoutSpot]) {
                log("Recreated spot: " + spotPathWithoutSpot);
                new TrackedSpot(Spot_1.Spot[spotPathWithoutSpot], this);
            }
        };
        MetricsProvider.prototype.getCurrentTime = function () {
            var now = new Date();
            var hours = now.getHours();
            var minutes = now.getMinutes();
            var seconds = now.getSeconds();
            return { h: hours, m: minutes, s: seconds };
        };
        MetricsProvider.prototype.createMatomoMsg = function (actionName, url, id) {
            var time = this.getCurrentTime();
            var message = {
                idsite: settings.SITE_ID,
                rec: 1,
                action_name: actionName,
                url: url,
                cid: id,
                rand: Math.floor(Math.random() * 10000),
                apiv: API_VERSION,
                h: time.h,
                m: time.m,
                s: time.s,
            };
            this.queueMessage(message);
        };
        MetricsProvider.prototype.queueMessage = function (message) {
            var _this = this;
            var newMessage = '?' + Object.keys(message)
                .map(function (key) { return "".concat(key, "=").concat(message[key]); })
                .join('&');
            this.messageQueue.requests.push(newMessage);
            log("Queued a new message: " + newMessage);
            log("Queue is now: " + this.messageQueue.requests.length);
            if (!this.messageInterval) {
                this.messageInterval = wait(settings.MAX_SEND_INTERVALL);
                this.messageInterval.then(function () {
                    _this.messageInterval.cancel();
                    _this.messageInterval = undefined;
                    _this.sendMessageQueue();
                });
            }
            if (this.messageQueue.requests.length >= settings.MAX_QUEUE_LENGTH) {
                this.sendMessageQueue();
                this.messageQueue.requests = [];
                if (this.messageInterval) {
                    this.messageInterval.cancel();
                    this.messageInterval = undefined;
                }
            }
        };
        MetricsProvider.prototype.sendMessageQueue = function () {
            return __awaiter(this, void 0, void 0, function () {
                var tempQueue, request;
                return __generator(this, function (_a) {
                    tempQueue = __assign({}, this.messageQueue);
                    this.messageQueue.requests = [];
                    log("Sending outgoing message: " + JSON.stringify(tempQueue));
                    request = SimpleHTTP_1.SimpleHTTP.newRequest(settings.TRACKER_URL);
                    return [2, request.post(JSON.stringify(tempQueue), 'application/json')
                            .catch(function (error) {
                            console.error("Connection to the tracker failed:", error);
                        })];
                });
            });
        };
        MetricsProvider.prototype.reinit = function () {
            this.reInitialize();
        };
        MetricsProvider.prototype.getTagMappedFullName = function (key) {
            var lowercaseKey = key.toLowerCase();
            if (lowercaseKey in settings.LANGUAGE_TAG_MAPPING) {
                return settings.LANGUAGE_TAG_MAPPING[lowercaseKey];
            }
            else {
                return undefined;
            }
        };
        __decorate([
            Meta.callable("Reinitialize script"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], MetricsProvider.prototype, "reinit", null);
        return MetricsProvider;
    }(Script_1.Script));
    exports.MetricsProvider = MetricsProvider;
    function createRandomHexString(length) {
        var characters = '0123456789abcdef';
        var hexString = '';
        for (var i = 0; i < length; i++) {
            var randomIndex = Math.floor(Math.random() * characters.length);
            hexString += characters.charAt(randomIndex);
        }
        return hexString;
    }
    function replaceDoubleSlashWSingle(inputString) {
        var regex = /\/\//g;
        var resultString = inputString.replace(regex, '/');
        return resultString;
    }
    function log(msg) {
        if (settings.LOGGING_ENABLED)
            console.log(msg);
    }
    var TrackedSpot = (function () {
        function TrackedSpot(trackedSpot, owner) {
            this.trackedSpot = trackedSpot;
            this.owner = owner;
            this.trackedSpotName = "";
            this.hasAttractor = false;
            this.userID = "";
            this.currentLanguage = "";
            log("Tracked spot created " + this.trackedSpot.fullName);
            this.trackedSpotName = this.trackedSpot.fullName;
            this.hookUpSources();
        }
        TrackedSpot.prototype.onPropChanged = function (sender, message) {
            switch (message.type) {
                case "DefaultBlock":
                    log("Handling DefaultBlock message");
                    this.onPropDefaultBlockChanged();
                    break;
                case "PriorityBlock":
                    log("Handling PriorityBlock message");
                    this.onPropPriorityBlockChanged();
                    break;
                case "PlayingBlock":
                    log("Handling PlayingBlock message");
                    this.onPropPlayingBlockChanged();
                    break;
                case "InputSource":
                    log("Handling InputSource message");
                    this.onPropInputSourceChanged();
                    break;
                case "Volume":
                    log("Handling Volume message");
                    this.onPropVolumeChanged();
                    break;
                case "Active":
                    log("Handling Active message");
                    this.onPropActiveChanged();
                    break;
                case "Playing":
                    log("Handling Playing message");
                    this.onPropPlayingChanged();
                    break;
                case "TagSet":
                    log("Handling TagSet message");
                    this.onPropTagSetChanged(sender);
                    break;
                default:
                    console.error("Unexpected message type: ", message.type);
                    break;
            }
        };
        TrackedSpot.prototype.onPropDefaultBlockChanged = function () {
        };
        TrackedSpot.prototype.onPropPriorityBlockChanged = function () {
        };
        TrackedSpot.prototype.onPropPlayingBlockChanged = function () {
            this.hasAttractor = false;
            var trackedPath = settings.TRACKED_URL + "/" + this.trackedSpot.fullName + "/" + this.trackedSpot.playingBlock + "/" + (this.currentLanguage ? this.currentLanguage : "");
            var actionName = this.trackedSpot.playingBlock;
            if (!actionName) {
                actionName = "No_block_playing";
            }
            this.owner.createMatomoMsg(actionName, trackedPath, this.userID);
        };
        TrackedSpot.prototype.onPropInputSourceChanged = function () {
        };
        TrackedSpot.prototype.onPropVolumeChanged = function () {
        };
        TrackedSpot.prototype.onPropActiveChanged = function () {
            if (this.trackedSpot.active) {
                this.hasAttractor = true;
                this.userID = createRandomHexString(16);
                log("New user created: " + this.userID);
            }
        };
        TrackedSpot.prototype.onPropPlayingChanged = function () {
        };
        TrackedSpot.prototype.onPropTagSetChanged = function (sender) {
            var _this = this;
            var tags = sender.tagSet.split(",");
            var foundMatch = false;
            tags.forEach(function (tag) {
                var mappedFullName = _this.owner.getTagMappedFullName(tag.trim());
                if (mappedFullName !== undefined) {
                    foundMatch = true;
                    _this.currentLanguage = mappedFullName;
                }
                else if (!foundMatch)
                    _this.currentLanguage = "";
            });
        };
        TrackedSpot.prototype.onNavigation = function (sender, message) {
            log("Got some navigation data " + message.foundPath);
            var trackedPath = settings.TRACKED_URL + "/" + sender.fullName + "/" + this.trackedSpot.playingBlock + "/" + (this.currentLanguage ? this.currentLanguage : "") + replaceDoubleSlashWSingle(message.foundPath);
            var actionName = this.trackedSpot.playingBlock + replaceDoubleSlashWSingle(message.foundPath);
            this.owner.createMatomoMsg(actionName, trackedPath, this.userID);
        };
        TrackedSpot.prototype.onConnectChanged = function (sender, message) {
            log("Connection changed");
        };
        TrackedSpot.prototype.trackedSpotFinished = function () {
            log("Spot finshed: " + this.trackedSpotName);
            this.owner.recreateTrackedSpot(this.trackedSpotName);
        };
        TrackedSpot.prototype.hookUpSources = function () {
            var _this = this;
            this.trackedSpot.subscribe('navigation', function (sender, message) { return _this.onNavigation(sender, message); });
            this.trackedSpot.subscribe('spot', function (sender, message) { return _this.onPropChanged(sender, message); });
            this.trackedSpot.subscribe('connect', function (sender, message) { return _this.onConnectChanged(sender, message); });
            this.trackedSpot.subscribe('finish', function () { return _this.trackedSpotFinished(); });
        };
        return TrackedSpot;
    }());
});
