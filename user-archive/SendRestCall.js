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
define(["require", "exports", "../system/SimpleHTTP", "../system_lib/Metadata", "../system_lib/Script"], function (require, exports, SimpleHTTP_1, Metadata_1, Script_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SendRestCall = void 0;
    var SendRestCall = (function (_super) {
        __extends(SendRestCall, _super);
        function SendRestCall(env) {
            return _super.call(this, env) || this;
        }
        SendRestCall.prototype.sendGet = function (host, path, auth, queryParams, headers) {
            return __awaiter(this, void 0, void 0, function () {
                var req, response, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            req = this.prepareRequest(host, path, auth, queryParams, headers);
                            return [4, req.get()];
                        case 1:
                            response = _a.sent();
                            return [2];
                        case 2:
                            err_1 = _a.sent();
                            console.error("sendGet failed:", err_1);
                            throw err_1;
                        case 3: return [2];
                    }
                });
            });
        };
        SendRestCall.prototype.sendPost = function (host, path, auth, body, queryParams, headers) {
            return __awaiter(this, void 0, void 0, function () {
                var req, response, err_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            req = this.prepareRequest(host, path, auth, queryParams, headers);
                            return [4, req.post(body || "")];
                        case 1:
                            response = _a.sent();
                            return [2];
                        case 2:
                            err_2 = _a.sent();
                            console.error("sendPost failed:", err_2);
                            throw err_2;
                        case 3: return [2];
                    }
                });
            });
        };
        SendRestCall.prototype.prepareRequest = function (host, path, auth, queryParams, headers) {
            var finalUrl = host + path;
            if (queryParams) {
                try {
                    var qpObj = JSON.parse(queryParams);
                    var parts = [];
                    for (var k in qpObj) {
                        if (qpObj.hasOwnProperty(k) && qpObj[k] != null) {
                            parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(qpObj[k])));
                        }
                    }
                    if (parts.length > 0) {
                        var sep = finalUrl.indexOf("?") >= 0 ? "&" : "?";
                        finalUrl = finalUrl + sep + parts.join("&");
                    }
                }
                catch (e) {
                    console.warn("prepareRequest: queryParams JSON parse failed:", e);
                }
            }
            var req = SimpleHTTP_1.SimpleHTTP.newRequest(finalUrl, { interpretResponse: true });
            if (auth && auth.trim().length > 0) {
                req.header("Authorization", auth);
            }
            if (headers) {
                try {
                    var hdrObj = JSON.parse(headers);
                    for (var h in hdrObj) {
                        if (hdrObj.hasOwnProperty(h) && hdrObj[h] != null) {
                            req.header(h, String(hdrObj[h]));
                        }
                    }
                }
                catch (e) {
                    console.warn("prepareRequest: headers JSON parse failed:", e);
                }
            }
            return req;
        };
        __decorate([
            (0, Metadata_1.callable)("Send GET request (flexible)"),
            __param(0, (0, Metadata_1.parameter)("Host (e.g., https://example.com)")),
            __param(1, (0, Metadata_1.parameter)("Path (e.g., /api/data)")),
            __param(2, (0, Metadata_1.parameter)("Auth header value (optional, e.g., 'Basic...' or 'Bearer ...')")),
            __param(3, (0, Metadata_1.parameter)("Query parameters as JSON (optional)")),
            __param(4, (0, Metadata_1.parameter)("Extra headers as JSON (optional)")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, String, String, String]),
            __metadata("design:returntype", Promise)
        ], SendRestCall.prototype, "sendGet", null);
        __decorate([
            (0, Metadata_1.callable)("Send POST request (flexible)"),
            __param(0, (0, Metadata_1.parameter)("Host (e.g., https://example.com)")),
            __param(1, (0, Metadata_1.parameter)("Path (e.g., /api/data)")),
            __param(2, (0, Metadata_1.parameter)("Auth header value (optional, e.g., 'Basic...' or 'Bearer ...')")),
            __param(3, (0, Metadata_1.parameter)("Body (for POST)")),
            __param(4, (0, Metadata_1.parameter)("Query parameters as JSON (optional)")),
            __param(5, (0, Metadata_1.parameter)("Extra headers as JSON (optional)")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, String, String, String, String]),
            __metadata("design:returntype", Promise)
        ], SendRestCall.prototype, "sendPost", null);
        return SendRestCall;
    }(Script_1.Script));
    exports.SendRestCall = SendRestCall;
});
