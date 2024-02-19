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
define(["require", "exports", "system_lib/Metadata", "system_lib/Feed", "../system/SimpleHTTP", "system/SimpleFile"], function (require, exports, Metadata_1, feed, SimpleHTTP_1, SimpleFile_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RSS = void 0;
    var DEBUG_LOGGING_ENABLED = false;
    var CONFIG_FILE = "Rss.config.json";
    var DEFAULT_SETTINGS = {
        channels: [
            {
                url: 'http://rss.cnn.com/rss/edition_world.rss',
                feedTitle: 'CNN_World',
                imageWidth: 100,
                imageHeight: 100
            },
            {
                url: 'http://www.nrk.no/nyheter/siste.rss',
                feedTitle: 'NRK'
            },
            {
                url: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml',
                feedTitle: 'BBC'
            }
        ]
    };
    var RSS = (function (_super) {
        __extends(RSS, _super);
        function RSS(env) {
            var _this = _super.call(this, env) || this;
            _this.readSettingsFile(CONFIG_FILE);
            return _this;
        }
        RSS.prototype.readSettingsFile = function (filename) {
            var _this = this;
            SimpleFile_1.SimpleFile.exists(filename)
                .then(function (exists) {
                if (exists === 1) {
                    SimpleFile_1.SimpleFile.readJson(filename)
                        .then(function (data) {
                        var settings = data;
                        if (settings) {
                            for (var _i = 0, _a = settings.channels; _i < _a.length; _i++) {
                                var channel = _a[_i];
                                _this.addFeed(channel.feedTitle, channel.url, channel.imageHeight || 400, channel.imageWidth || 400);
                            }
                        }
                    })
                        .catch(function (error) {
                        console.error("Failed reading settings , attemt to write an example as reference (in /script/files/:", filename, error);
                        _this.writeJsonToFile(filename + ".example", DEFAULT_SETTINGS);
                    });
                }
                else if (exists === 0) {
                    _this.writeJsonToFile(filename, DEFAULT_SETTINGS);
                    _this.readSettingsFile(filename);
                }
                else {
                    console.error("Specified path exists but is not a file:", filename);
                    _this.writeJsonToFile(filename, DEFAULT_SETTINGS);
                }
            })
                .catch(function (error) {
                console.error("Error checking file existence:", filename, error);
            });
        };
        RSS.prototype.writeJsonToFile = function (filename, data) {
            SimpleFile_1.SimpleFile.write(filename, JSON.stringify(data, null, 2))
                .then(function () {
                console.log("File written successfully, ", filename);
            })
                .catch(function (error) {
                console.error("Failed writing file:", CONFIG_FILE, error);
            });
        };
        RSS.prototype.reInitialize = function () {
            _super.prototype.reInitialize.call(this);
        };
        RSS.prototype.addFeed = function (channelName, channelUrl, targetImageHeight, targetImageWidth) {
            this.establishFeed(new Channel(channelName, channelUrl, this, targetImageHeight, targetImageWidth));
        };
        __decorate([
            (0, Metadata_1.callable)("Re-initialize feedscript, run to reset feed config"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], RSS.prototype, "reInitialize", null);
        __decorate([
            (0, Metadata_1.callable)("Add feed"),
            __param(0, (0, Metadata_1.parameter)("Channel name, i.e. Latest News", false)),
            __param(1, (0, Metadata_1.parameter)("Channel URL, i.e. http://nrk.no/nyheter/latest.rss", false)),
            __param(2, (0, Metadata_1.parameter)("Specify a target image height. Only applies if the feed has group of media:image. ", false)),
            __param(3, (0, Metadata_1.parameter)("Specify a target image height. Only applies if the feed has group of media:image. ", false)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, Number, Number]),
            __metadata("design:returntype", void 0)
        ], RSS.prototype, "addFeed", null);
        return RSS;
    }(feed.Feed));
    exports.RSS = RSS;
    var Channel = (function () {
        function Channel(name, url, owner, targetImageHeight, targetImageWidth) {
            this.url = url;
            this.listType = ListItem;
            this.itemType = ListItem;
            this.channelTitle = "";
            this.channelImageUrl = "";
            this.name = name;
            this.owner = owner;
            this.targetImageHeight = targetImageHeight;
            this.targetImageWidth = targetImageWidth;
        }
        Channel.prototype.getList = function (spec) {
            return __awaiter(this, void 0, void 0, function () {
                var feed, items, itemList, _i, itemList_1, item;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, SimpleHTTP_1.SimpleHTTP.newRequest(this.url, { interpretResponse: true }).get()];
                        case 1:
                            feed = _a.sent();
                            items = [];
                            log("Status: ", this.url, feed.status);
                            if (feed.status === 200) {
                                this.channelImageUrl = feed.interpreted.channel.image.url || "";
                                this.channelTitle = feed.interpreted.channel.title || "";
                                itemList = feed.interpreted.channel.item;
                                for (_i = 0, itemList_1 = itemList; _i < itemList_1.length; _i++) {
                                    item = itemList_1[_i];
                                    items.push(new ListItem(item, this));
                                    log("Item found", item.title);
                                }
                            }
                            return [2, { items: items }];
                    }
                });
            });
        };
        return Channel;
    }());
    var ListItem = (function () {
        function ListItem(rss, owner) {
            this.guid = rss.guid || "";
            this.title = rss.title || "";
            this.link = rss.link || "";
            this.description = rss.description || "";
            this.date = rss.pubDate || "";
            this.category = ListItem.getCategory(rss.category);
            this.channelImageUrl = owner.channelImageUrl || "";
            this.channelTitle = owner.channelTitle || "";
            if (rss.group) {
                var media = ListItem.getBestMatchedImage(rss.group, owner.targetImageHeight, owner.targetImageWidth);
                log("Feed contains an RSS group");
                if (media) {
                    this.imageUrl = media.url || "";
                    this.imageTitle = media.title || "";
                    this.imageCredit = media.credit ? media.credit[""] : "";
                }
                else
                    this.imageUrl = this.imageTitle = this.imageCredit = "";
            }
            else if (rss.content) {
                log("Feed contains an RSS content");
                var media = rss.content;
                if (media) {
                    this.imageUrl = media.url || "";
                    this.imageTitle = media.title || "";
                    this.imageCredit = media.credit ? media.credit[""] : "";
                }
                else {
                    this.imageUrl = this.imageTitle = this.imageCredit = "";
                }
            }
            else {
                this.imageUrl = this.imageTitle = this.imageCredit = "";
            }
        }
        ListItem.getBestMatchedImage = function (group, targetWidth, targetHeight) {
            var bestMatch;
            var firstImage;
            log("Target image  h and w ", targetHeight, targetWidth);
            for (var _i = 0, _a = group.content; _i < _a.length; _i++) {
                var content = _a[_i];
                if (content.height > 0 && content.width > 0) {
                    var widthDifference = Math.abs(content.width - targetWidth);
                    var heightDifference = Math.abs(content.height - targetHeight);
                    log("Image compare H:", content.height, "Diff", heightDifference, "W", content.width, "Diff", widthDifference, content.url);
                    if (!bestMatch || (widthDifference + heightDifference) < (Math.abs(bestMatch.width - targetWidth) + Math.abs(bestMatch.height - targetHeight))) {
                        bestMatch = content;
                    }
                }
                else {
                    if (!firstImage) {
                        firstImage = content;
                    }
                }
            }
            if (!bestMatch && firstImage) {
                log("First image", firstImage);
                return firstImage;
            }
            log("Best match image is", bestMatch);
            return bestMatch;
        };
        ListItem.getCategory = function (cat) {
            if (cat) {
                if (typeof cat === "string")
                    return cat;
                return feed.Feed.makeJSArray(cat).join(', ');
            }
            else
                return "";
        };
        __decorate([
            (0, Metadata_1.id)("Unique identifier from RSS"),
            __metadata("design:type", String)
        ], ListItem.prototype, "guid", void 0);
        __decorate([
            (0, Metadata_1.field)(),
            __metadata("design:type", String)
        ], ListItem.prototype, "title", void 0);
        __decorate([
            (0, Metadata_1.field)(),
            __metadata("design:type", String)
        ], ListItem.prototype, "link", void 0);
        __decorate([
            (0, Metadata_1.field)(),
            __metadata("design:type", String)
        ], ListItem.prototype, "description", void 0);
        __decorate([
            (0, Metadata_1.field)(),
            __metadata("design:type", String)
        ], ListItem.prototype, "category", void 0);
        __decorate([
            (0, Metadata_1.field)(),
            __metadata("design:type", String)
        ], ListItem.prototype, "date", void 0);
        __decorate([
            (0, Metadata_1.field)("Image URL, if any"),
            __metadata("design:type", String)
        ], ListItem.prototype, "imageUrl", void 0);
        __decorate([
            (0, Metadata_1.field)(),
            __metadata("design:type", String)
        ], ListItem.prototype, "imageTitle", void 0);
        __decorate([
            (0, Metadata_1.field)(),
            __metadata("design:type", String)
        ], ListItem.prototype, "imageCredit", void 0);
        __decorate([
            (0, Metadata_1.field)(),
            __metadata("design:type", String)
        ], ListItem.prototype, "channelImageUrl", void 0);
        __decorate([
            (0, Metadata_1.field)(),
            __metadata("design:type", String)
        ], ListItem.prototype, "channelTitle", void 0);
        return ListItem;
    }());
    function log() {
        var msg = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            msg[_i] = arguments[_i];
        }
        if (DEBUG_LOGGING_ENABLED)
            console.log(msg);
    }
});
