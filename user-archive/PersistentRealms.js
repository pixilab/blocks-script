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
        while (_) try {
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
define(["require", "exports", "system/Realm", "system_lib/Script", "system_lib/Metadata", "../system/SimpleFile"], function (require, exports, Realm_1, Script_1, Metadata_1, SimpleFile_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PersistentRealms = void 0;
    var BASE_PATH = 'PersistentRealms/';
    var BASE_SAVE_PATH = BASE_PATH + 'saves/';
    var DEFAULT_SAVE_NAME = 'default';
    var PersistentRealms = (function (_super) {
        __extends(PersistentRealms, _super);
        function PersistentRealms(env) {
            return _super.call(this, env) || this;
        }
        PersistentRealms.prototype.save = function (saveName) {
            if (!saveName)
                saveName = DEFAULT_SAVE_NAME;
            return this.processRealms(saveName, this.saveRealm);
        };
        PersistentRealms.prototype.load = function (saveName) {
            if (!saveName)
                saveName = DEFAULT_SAVE_NAME;
            return this.processRealms(saveName, this.loadRealm);
        };
        PersistentRealms.prototype.processRealms = function (saveName, action) {
            return __awaiter(this, void 0, void 0, function () {
                var basePath, _a, _b, _i, realmName, path, realm;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            basePath = "".concat(BASE_SAVE_PATH).concat(saveName, "/");
                            _a = [];
                            for (_b in Realm_1.Realm)
                                _a.push(_b);
                            _i = 0;
                            _c.label = 1;
                        case 1:
                            if (!(_i < _a.length)) return [3, 4];
                            realmName = _a[_i];
                            path = "".concat(basePath).concat(realmName);
                            realm = Realm_1.Realm[realmName];
                            return [4, action(path, realm)];
                        case 2:
                            _c.sent();
                            _c.label = 3;
                        case 3:
                            _i++;
                            return [3, 1];
                        case 4: return [2];
                    }
                });
            });
        };
        PersistentRealms.prototype.saveRealm = function (path, realm) {
            return __awaiter(this, void 0, void 0, function () {
                var dict, varName, json;
                return __generator(this, function (_a) {
                    dict = {};
                    for (varName in realm.variable) {
                        dict[varName] = realm.variable[varName].value;
                    }
                    json = JSON.stringify(dict);
                    return [2, SimpleFile_1.SimpleFile.write(path, json)];
                });
            });
        };
        PersistentRealms.prototype.loadRealm = function (path, realm) {
            return __awaiter(this, void 0, void 0, function () {
                var fileExists, json, dict, varName, value;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, SimpleFile_1.SimpleFile.exists(path)];
                        case 1:
                            fileExists = _a.sent();
                            if (!fileExists)
                                return [2];
                            return [4, SimpleFile_1.SimpleFile.read(path)];
                        case 2:
                            json = _a.sent();
                            dict = JSON.parse(json);
                            for (varName in realm.variable) {
                                value = dict[varName];
                                if (value !== undefined) {
                                    realm.variable[varName].value = value;
                                }
                            }
                            return [2];
                    }
                });
            });
        };
        __decorate([
            (0, Metadata_1.callable)('save all Realm variables'),
            __param(0, (0, Metadata_1.parameter)("save name (defaults to \"".concat(DEFAULT_SAVE_NAME, "\")"), true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", Promise)
        ], PersistentRealms.prototype, "save", null);
        __decorate([
            (0, Metadata_1.callable)('load all Realm variables'),
            __param(0, (0, Metadata_1.parameter)("save name (defaults to \"".concat(DEFAULT_SAVE_NAME, "\")"), true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", Promise)
        ], PersistentRealms.prototype, "load", null);
        return PersistentRealms;
    }(Script_1.Script));
    exports.PersistentRealms = PersistentRealms;
});
