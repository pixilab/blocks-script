"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageListItem = exports.ListOfImages = void 0;
const Metadata_1 = require("../system_lib/Metadata");
const Spot_1 = require("../system/Spot");
const IndexedPropertyPersistor_1 = require("../lib/IndexedPropertyPersistor");
const SimpleImage_1 = require("../system/SimpleImage");
const SimpleFile_1 = require("../system/SimpleFile");
class ListOfImages {
    static kDefaultMaxImgCount = 10;
    static kMaxImgSize = 1080;
    static kPublicPath = "/public/ListOfImages/";
    static kPersistenceDir = "ListOfImages";
    publicPath;
    persistor;
    list;
    options;
    constructor(owner, imageFilesSubDir, options) {
        this.options = options || {};
        this.publicPath = ListOfImages.kPublicPath + imageFilesSubDir + '/';
        this.persistor = new IndexedPropertyPersistor_1.IndexedPropertyPersistor(owner, ListOfImages.kPersistenceDir);
    }
    getIndexedProperty(indexedPropertyName) {
        const indexedProperty = this.persistor.getOrMake(indexedPropertyName, ImageListItem);
        this.list = indexedProperty;
        this.subscribeToImages();
        return indexedProperty;
    }
    clear(deletePhotosToo) {
        const numPhotos = this.list.length;
        if (numPhotos) {
            if (deletePhotosToo) {
                for (let ix = 0; ix < numPhotos; ++ix)
                    SimpleFile_1.SimpleFile.delete(this.list[ix].path);
            }
            this.list.remove(0, numPhotos);
        }
        this.persistor.clear();
    }
    subscribeToImages() {
        if (this.options.spotPath) {
            const maybeSpot = Spot_1.Spot[this.options.spotPath];
            if (maybeSpot) {
                const imageProvider = maybeSpot.isOfTypeName("DisplaySpot") ||
                    maybeSpot.isOfTypeName("MobileSpot");
                if (imageProvider) {
                    imageProvider.subscribe('image', (sender, message) => {
                        log("acceptImage", message.filePath);
                        this.acceptImage(message.filePath);
                    });
                    imageProvider.subscribe('finish', () => this.subscribeToImages());
                    return;
                }
            }
            console.error("No spot found at path", this.options.spotPath);
        }
    }
    async acceptImage(filePath) {
        log("acceptImage 2", filePath);
        const maxImgSideLength = this.options.maxImageSideLength || ListOfImages.kMaxImgSize;
        const publicImageLocation = this.publicPath + fileName(filePath);
        const info = await SimpleImage_1.SimpleImage.info(filePath);
        const scalefactor = Math.min(maxImgSideLength / info.width, maxImgSideLength / info.height);
        if (scalefactor < 1) {
            await SimpleImage_1.SimpleImage.derive(filePath, publicImageLocation, info.width * scalefactor, info.height * scalefactor);
            await SimpleFile_1.SimpleFile.delete(filePath);
        }
        else
            await SimpleFile_1.SimpleFile.move(filePath, publicImageLocation, true);
        await this.addPublicImage(publicImageLocation);
        return Promise.resolve(publicImageLocation);
    }
    addPublicImage(publicImageLocation) {
        this.list.insert(0, new ImageListItem(publicImageLocation));
        const maxImageCount = this.options.maxImageCount || ListOfImages.kDefaultMaxImgCount;
        const excess = this.list.length - maxImageCount;
        if (excess > 0) {
            for (let removeIx = 0; removeIx < excess; ++removeIx)
                SimpleFile_1.SimpleFile.delete(this.list[maxImageCount + removeIx].path);
            this.list.remove(maxImageCount, excess);
        }
        log('Persisting image list');
        return this.persistor.persist();
    }
    removeImage(photoPath) {
        const numPhotosInStream = this.list.length;
        for (let ix = 0; ix < numPhotosInStream; ++ix) {
            if (this.list[ix].path === photoPath) {
                this.list.remove(ix, 1);
                this.persistor.persist();
                break;
            }
        }
    }
    replacePhoto(oldPhotoPath, newPhotoPath) {
        const numPhotosInStream = this.list.length;
        for (let ix = 0; ix < numPhotosInStream; ++ix) {
            if (this.list[ix].path === oldPhotoPath) {
                this.list[ix].path = newPhotoPath;
                this.persistor.persist();
                break;
            }
        }
    }
}
exports.ListOfImages = ListOfImages;
class ImageListItem {
    mPath;
    constructor(path) {
        this.mPath = path;
    }
    static fromDeserialized(source) {
        return new ImageListItem(source.mPath);
    }
    get path() {
        return this.mPath;
    }
    set path(newPath) {
        this.mPath = newPath;
    }
}
exports.ImageListItem = ImageListItem;
__decorate([
    (0, Metadata_1.property)('Path to picture on the server, usable from a Media URL block', true),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], ImageListItem.prototype, "path", null);
function fileName(path) {
    const whereSlash = path.lastIndexOf('/');
    return path.substring(whereSlash + 1);
}
const DEBUG = false;
function log(...messages) {
    if (DEBUG)
        console.info(messages);
}
