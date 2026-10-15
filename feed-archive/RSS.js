"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RSS = void 0;
const Metadata_1 = require("../system_lib/Metadata");
const feed = __importStar(require("../system_lib/Feed"));
const SimpleHTTP_1 = require("../system/SimpleHTTP");
const SimpleFile_1 = require("../system/SimpleFile");
const DEBUG_LOGGING_ENABLED = false;
const CONFIG_FILE = "Rss.config.json";
const EXAMPLE_SETTINGS = {
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
const DEFAULT_MAX_LENGTH = 999;
const DEFAULT_MAX_AGE = 999;
const DEFAULT_TARGET_WIDTH = 600;
const DEFAULT_TARGET_HEIGHT = 600;
class RSS extends feed.Feed {
    constructor(env) {
        super(env);
        this.readSettingsFile(CONFIG_FILE);
    }
    readSettingsFile(filename) {
        const exampleFilename = filename.replace(".json", ".example.json");
        SimpleFile_1.SimpleFile.exists(filename)
            .then(exists => {
            if (exists === 1) {
                SimpleFile_1.SimpleFile.readJson(filename)
                    .then(data => {
                    const settings = data;
                    if (settings.channels) {
                        for (const channel of settings.channels) {
                            this.addFeed(channel.feedTitle, channel.url, channel.imageHeight, channel.imageWidth, channel.maxAge, channel.maxLength);
                        }
                    }
                })
                    .catch(error => {
                    console.error("Failed reading settings file, attemt to write an example file as reference (in /script/files/:", filename, error);
                    this.writeJsonToFile(exampleFilename, EXAMPLE_SETTINGS);
                });
            }
            else {
                console.error("Could not find a config file, this may be on purpose, making sure we have an example file:", exampleFilename, filename);
                this.writeJsonToFile(exampleFilename, EXAMPLE_SETTINGS);
            }
        })
            .catch(error => {
            console.error("Error checking file existence:", filename, error);
        });
    }
    writeJsonToFile(filename, data) {
        SimpleFile_1.SimpleFile.write(filename, JSON.stringify(data, null, 2))
            .then(() => {
            console.log("File written successfully, ", filename);
        })
            .catch(error => {
            console.error("Failed writing file:", filename, error);
        });
    }
    reInitialize() {
        console.log("Reinitialize");
        super.reInitialize();
    }
    addFeed(channelName, channelUrl, targetImageHeight, targetImageWidth, maxAge, maxFeedLength) {
        this.establishFeed(new Channel(channelName, channelUrl, this, targetImageHeight || DEFAULT_TARGET_HEIGHT, targetImageWidth || DEFAULT_TARGET_WIDTH, maxAge || DEFAULT_MAX_AGE, maxFeedLength || DEFAULT_MAX_LENGTH));
    }
}
exports.RSS = RSS;
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
class Channel {
    name;
    url;
    targetImageHeight;
    targetImageWidth;
    maxAge;
    maxFeedLength;
    listType = ListItem;
    itemType = ListItem;
    owner;
    channelTitle = "";
    channelImageUrl = "";
    constructor(name, url = "", owner, targetImageHeight, targetImageWidth, maxAge, maxFeedLength) {
        this.name = name;
        this.url = url;
        this.targetImageHeight = targetImageHeight;
        this.targetImageWidth = targetImageWidth;
        this.maxAge = maxAge;
        this.maxFeedLength = maxFeedLength;
        this.owner = owner;
    }
    async getList(spec) {
        try {
            const feed = await SimpleHTTP_1.SimpleHTTP.newRequest(this.url, { interpretResponse: true }).get();
            const items = [];
            log("Status: ", this.url, feed.status);
            const currentDate = new Date();
            const maxAgeDate = new Date(currentDate.getTime() - this.maxAge * 24 * 60 * 60 * 1000);
            if (feed.status === 200) {
                this.channelImageUrl = feed.interpreted.channel.image?.url || "";
                this.channelTitle = feed.interpreted.channel.title;
                const itemList = feed.interpreted.channel.item || feed.interpreted.item || [];
                for (const item of itemList) {
                    const pubDate = item.pubDate ? new Date(item.pubDate) : item.date ? new Date(item.date) : null;
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
                    return { items: [] };
                }
            }
            return { items: items };
        }
        catch (error) {
            console.error("Error occurred while getting the feed:", error);
            return { items: [] };
        }
    }
}
class ListItem {
    guid;
    title;
    link;
    description;
    category;
    date;
    imageUrl;
    imageTitle;
    imageCredit;
    channelImageUrl;
    channelTitle;
    constructor(rss, owner) {
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
            let media = ListItem.getBestMatchedImage(rss.group, owner.targetImageHeight, owner.targetImageWidth);
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
            let media = rss.content;
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
    static getBestMatchedImage(group, targetWidth, targetHeight) {
        let bestMatch;
        let firstImage;
        for (const content of group.content) {
            if (content.height > 0 && content.width > 0) {
                const widthDifference = Math.abs(content.width - targetWidth);
                const heightDifference = Math.abs(content.height - targetHeight);
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
    }
    static getCategory(cat) {
        if (cat) {
            if (typeof cat === "string")
                return cat;
            return feed.Feed.makeJSArray(cat).join(', ');
        }
        else
            return "";
    }
}
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
function log(...msg) {
    if (DEBUG_LOGGING_ENABLED)
        console.log(msg);
}
