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
    var EXAMPLE_SETTINGS = {
        channels: [
            {
                url: "http://rss.cnn.com/rss/edition_world.rss",
                feedTitle: "CNN_World",
                imageWidth: 100,
                imageHeight: 100,
                maxAge: 400,
                maxLength: 10
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
    var DEFAULT_MAX_LENGTH = 999;
    var DEFAULT_MAX_AGE = 999;
    var DEFAULT_TARGET_WIDTH = 600;
    var DEFAULT_TARGET_HEIGHT = 600;
    var RSS = exports.RSS = (function (_super) {
        __extends(RSS, _super);
        function RSS(env) {
            var _this = _super.call(this, env) || this;
            _this.readSettingsFile(CONFIG_FILE);
            return _this;
        }
        RSS.prototype.readSettingsFile = function (filename) {
            var _this = this;
            var exampleFilename = filename.replace(".json", ".example.json");
            SimpleFile_1.SimpleFile.exists(filename)
                .then(function (exists) {
                if (exists === 1) {
                    SimpleFile_1.SimpleFile.readJson(filename)
                        .then(function (data) {
                        var settings = data;
                        if (settings.channels) {
                            for (var _i = 0, _a = settings.channels; _i < _a.length; _i++) {
                                var channel = _a[_i];
                                _this.addFeed(channel.feedTitle, channel.url, channel.imageHeight, channel.imageWidth, channel.maxAge, channel.maxLength);
                            }
                        }
                    })
                        .catch(function (error) {
                        console.error("Failed reading settings file, attemt to write an example file as reference (in /script/files/:", filename, error);
                        _this.writeJsonToFile(exampleFilename, EXAMPLE_SETTINGS);
                    });
                }
                else {
                    console.error("Could not find a config file, this may be on purpose, making sure we have an example file:", exampleFilename, filename);
                    _this.writeJsonToFile(exampleFilename, EXAMPLE_SETTINGS);
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
                console.error("Failed writing file:", filename, error);
            });
        };
        RSS.prototype.reInitialize = function () {
            console.log("Reinitialize");
            _super.prototype.reInitialize.call(this);
        };
        RSS.prototype.addFeed = function (channelName, channelUrl, targetImageHeight, targetImageWidth, maxAge, maxFeedLength) {
            this.establishFeed(new Channel(channelName, channelUrl, this, targetImageHeight || DEFAULT_TARGET_HEIGHT, targetImageWidth || DEFAULT_TARGET_WIDTH, maxAge || DEFAULT_MAX_AGE, maxFeedLength || DEFAULT_MAX_LENGTH));
        };
        __decorate([
            (0, Metadata_1.callable)("Re-initialize feedscript, run to reset feed config"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], RSS.prototype, "reInitialize", null);
        __decorate([
            (0, Metadata_1.callable)("Add a feed in runtime, not persisted."),
            __param(0, (0, Metadata_1.parameter)("Channel name, i.e. Latest News", false)),
            __param(1, (0, Metadata_1.parameter)("Channel URL, i.e. http://nrk.no/nyheter/latest.rss", false)),
            __param(2, (0, Metadata_1.parameter)("Specify a target image height. Only applies if the feed has group of images in a media:group tag.", true)),
            __param(3, (0, Metadata_1.parameter)("Specify a target image height. Only applies if the feed has group of images in a media:group tag.", true)),
            __param(4, (0, Metadata_1.parameter)("Specify max age of the publish date. ", true)),
            __param(5, (0, Metadata_1.parameter)("Specify max length of the feed (How many items to publish.). ", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, Number, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], RSS.prototype, "addFeed", null);
        return RSS;
    }(feed.Feed));
    var Channel = (function () {
        function Channel(name, url, owner, targetImageHeight, targetImageWidth, maxAge, maxFeedLength) {
            if (url === void 0) { url = ""; }
            this.name = name;
            this.url = url;
            this.targetImageHeight = targetImageHeight;
            this.targetImageWidth = targetImageWidth;
            this.maxAge = maxAge;
            this.maxFeedLength = maxFeedLength;
            this.listType = ListItem;
            this.itemType = ListItem;
            this.channelTitle = "";
            this.channelImageUrl = "";
            this.owner = owner;
        }
        Channel.prototype.getList = function (spec) {
            var _a;
            return __awaiter(this, void 0, void 0, function () {
                var feed_1, items, currentDate, maxAgeDate, itemList, _i, itemList_1, item, pubDate, error_1;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            return [4, SimpleHTTP_1.SimpleHTTP.newRequest(this.url, { interpretResponse: true }).get()];
                        case 1:
                            feed_1 = _b.sent();
                            items = [];
                            log("Status: ", this.url, feed_1.status);
                            currentDate = new Date();
                            maxAgeDate = new Date(currentDate.getTime() - this.maxAge * 24 * 60 * 60 * 1000);
                            if (feed_1.status === 200) {
                                this.channelImageUrl = ((_a = feed_1.interpreted.channel.image) === null || _a === void 0 ? void 0 : _a.url) || "";
                                this.channelTitle = feed_1.interpreted.channel.title;
                                itemList = feed_1.interpreted.channel.item || feed_1.interpreted.item || [];
                                for (_i = 0, itemList_1 = itemList; _i < itemList_1.length; _i++) {
                                    item = itemList_1[_i];
                                    pubDate = item.pubDate ? new Date(item.pubDate) : item.date ? new Date(item.date) : null;
                                    log("Pubdate:", pubDate, "Max age date:", maxAgeDate);
                                    if (pubDate && pubDate >= maxAgeDate) {
                                        if (items.length < this.maxFeedLength) {
                                            log("Item found", item.title);
                                            items.push(new ListItem(item, this));
                                        }
                                        else {
                                            log("Item ignored, out of current maxLength scoop");
                                        }
                                    }
                                    else {
                                        log("Item ignored, out of current maxAge scoop");
                                    }
                                }
                                log(items.length, "valid items found");
                                if (items.length === 0) {
                                    return [2, { items: [] }];
                                }
                            }
                            return [2, { items: items }];
                        case 2:
                            error_1 = _b.sent();
                            console.error("Error occurred while getting the feed:", error_1);
                            return [2, { items: [] }];
                        case 3: return [2];
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
            this.description = rss.encoded || rss.description || "";
            this.date = rss.pubDate || rss.date || "";
            this.category = ListItem.getCategory(rss.category);
            this.channelImageUrl = owner.channelImageUrl || "";
            this.channelTitle = owner.channelTitle || "";
            if (rss.group) {
                log("Item contains an RSS group");
                var media = ListItem.getBestMatchedImage(rss.group, owner.targetImageHeight, owner.targetImageWidth);
                if (media) {
                    this.imageUrl = media.url || "";
                    this.imageTitle = media.title || "";
                    this.imageCredit = media.credit ? media.credit[""] : "";
                }
                else {
                    this.imageUrl = this.imageTitle = this.imageCredit = "";
                }
            }
            else if (rss.content) {
                log("Item contains an RSS content");
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
            else if (rss.thumbnail) {
                log("Item contains a thumbnail");
                this.imageUrl = rss.thumbnail.url || "";
                this.imageTitle = this.imageCredit = "";
            }
            else {
                log("No image found");
                this.imageUrl = this.imageTitle = this.imageCredit = "";
            }
        }
        ListItem.getBestMatchedImage = function (group, targetWidth, targetHeight) {
            var bestMatch;
            var firstImage;
            for (var _i = 0, _a = group.content; _i < _a.length; _i++) {
                var content = _a[_i];
                if (content.height > 0 && content.width > 0) {
                    var widthDifference = Math.abs(content.width - targetWidth);
                    var heightDifference = Math.abs(content.height - targetHeight);
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
