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
define(["require", "exports", "../system_lib/Metadata", "../system/Spot", "../lib/IndexedPropertyPersistor", "../system/SimpleImage", "../system/SimpleFile"], function (require, exports, Metadata_1, Spot_1, IndexedPropertyPersistor_1, SimpleImage_1, SimpleFile_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ImageListItem = exports.ListOfImages = void 0;
    var ListOfImages = exports.ListOfImages = (function () {
        function ListOfImages(owner, imageFilesSubDir, options) {
            this.options = options || {};
            this.publicPath = ListOfImages.kPublicPath + imageFilesSubDir + '/';
            this.persistor = new IndexedPropertyPersistor_1.IndexedPropertyPersistor(owner, ListOfImages.kPersistenceDir);
        }
        ListOfImages.prototype.getIndexedProperty = function (indexedPropertyName) {
            var indexedProperty = this.persistor.getOrMake(indexedPropertyName, ImageListItem);
            this.list = indexedProperty;
            this.subscribeToImages();
            return indexedProperty;
        };
        ListOfImages.prototype.clear = function (deletePhotosToo) {
            var numPhotos = this.list.length;
            if (numPhotos) {
                if (deletePhotosToo) {
                    for (var ix = 0; ix < numPhotos; ++ix)
                        SimpleFile_1.SimpleFile.delete(this.list[ix].path);
                }
                this.list.remove(0, numPhotos);
            }
            this.persistor.clear();
        };
        ListOfImages.prototype.subscribeToImages = function () {
            var _this = this;
            if (this.options.spotPath) {
                var maybeSpot = Spot_1.Spot[this.options.spotPath];
                if (maybeSpot) {
                    var imageProvider = maybeSpot.isOfTypeName("DisplaySpot") ||
                        maybeSpot.isOfTypeName("MobileSpot");
                    if (imageProvider) {
                        imageProvider.subscribe('image', function (sender, message) {
                            log("acceptImage", message.filePath);
                            _this.acceptImage(message.filePath);
                        });
                        imageProvider.subscribe('finish', function () { return _this.subscribeToImages(); });
                        return;
                    }
                }
                console.error("No spot found at path", this.options.spotPath);
            }
        };
        ListOfImages.prototype.acceptImage = function (filePath) {
            return __awaiter(this, void 0, void 0, function () {
                var maxImgSideLength, publicImageLocation, info, scalefactor;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            log("acceptImage 2", filePath);
                            maxImgSideLength = this.options.maxImageSideLength || ListOfImages.kMaxImgSize;
                            publicImageLocation = this.publicPath + fileName(filePath);
                            return [4, SimpleImage_1.SimpleImage.info(filePath)];
                        case 1:
                            info = _a.sent();
                            scalefactor = Math.min(maxImgSideLength / info.width, maxImgSideLength / info.height);
                            if (!(scalefactor < 1)) return [3, 4];
                            return [4, SimpleImage_1.SimpleImage.derive(filePath, publicImageLocation, info.width * scalefactor, info.height * scalefactor)];
                        case 2:
                            _a.sent();
                            return [4, SimpleFile_1.SimpleFile.delete(filePath)];
                        case 3:
                            _a.sent();
                            return [3, 6];
                        case 4: return [4, SimpleFile_1.SimpleFile.move(filePath, publicImageLocation, true)];
                        case 5:
                            _a.sent();
                            _a.label = 6;
                        case 6: return [4, this.addPublicImage(publicImageLocation)];
                        case 7:
                            _a.sent();
                            return [2, Promise.resolve(publicImageLocation)];
                    }
                });
            });
        };
        ListOfImages.prototype.addPublicImage = function (publicImageLocation) {
            this.list.insert(0, new ImageListItem(publicImageLocation));
            var maxImageCount = this.options.maxImageCount || ListOfImages.kDefaultMaxImgCount;
            var excess = this.list.length - maxImageCount;
            if (excess > 0) {
                for (var removeIx = 0; removeIx < excess; ++removeIx)
                    SimpleFile_1.SimpleFile.delete(this.list[maxImageCount + removeIx].path);
                this.list.remove(maxImageCount, excess);
            }
            log('Persisting image list');
            return this.persistor.persist();
        };
        ListOfImages.prototype.removeImage = function (photoPath) {
            var numPhotosInStream = this.list.length;
            for (var ix = 0; ix < numPhotosInStream; ++ix) {
                if (this.list[ix].path === photoPath) {
                    this.list.remove(ix, 1);
                    this.persistor.persist();
                    break;
                }
            }
        };
        ListOfImages.prototype.replacePhoto = function (oldPhotoPath, newPhotoPath) {
            var numPhotosInStream = this.list.length;
            for (var ix = 0; ix < numPhotosInStream; ++ix) {
                if (this.list[ix].path === oldPhotoPath) {
                    this.list[ix].path = newPhotoPath;
                    this.persistor.persist();
                    break;
                }
            }
        };
        ListOfImages.kDefaultMaxImgCount = 10;
        ListOfImages.kMaxImgSize = 1080;
        ListOfImages.kPublicPath = "/public/ListOfImages/";
        ListOfImages.kPersistenceDir = "ListOfImages";
        return ListOfImages;
    }());
    var ImageListItem = exports.ImageListItem = (function () {
        function ImageListItem(path) {
            this.mPath = path;
        }
        ImageListItem.fromDeserialized = function (source) {
            return new ImageListItem(source.mPath);
        };
        Object.defineProperty(ImageListItem.prototype, "path", {
            get: function () {
                return this.mPath;
            },
            set: function (newPath) {
                this.mPath = newPath;
            },
            enumerable: false,
            configurable: true
        });
        __decorate([
            (0, Metadata_1.property)('Path to picture on the server, usable from a Media URL block', true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], ImageListItem.prototype, "path", null);
        return ImageListItem;
    }());
    function fileName(path) {
        var whereSlash = path.lastIndexOf('/');
        return path.substring(whereSlash + 1);
    }
    var DEBUG = false;
    function log() {
        var messages = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            messages[_i] = arguments[_i];
        }
        if (DEBUG)
            console.info(messages);
    }
});
