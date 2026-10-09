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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendRestCall = void 0;
const SimpleHTTP_1 = require("../system/SimpleHTTP");
const Metadata_1 = require("../system_lib/Metadata");
const Script_1 = require("../system_lib/Script");
class SendRestCall extends Script_1.Script {
    constructor(env) {
        super(env);
    }
    async sendGet(host, path, auth, queryParams, headers) {
        try {
            const req = this.prepareRequest(host, path, auth, queryParams, headers);
            const response = await req.get();
            return;
        }
        catch (err) {
            console.error("sendGet failed:", err);
            throw err;
        }
    }
    async sendPost(host, path, auth, body, queryParams, headers) {
        try {
            const req = this.prepareRequest(host, path, auth, queryParams, headers);
            const response = await req.post(body || "");
            return;
        }
        catch (err) {
            console.error("sendPost failed:", err);
            throw err;
        }
    }
    prepareRequest(host, path, auth, queryParams, headers) {
        let finalUrl = host + path;
        if (queryParams) {
            try {
                const qpObj = JSON.parse(queryParams);
                const parts = [];
                for (const k in qpObj) {
                    if (qpObj.hasOwnProperty(k) && qpObj[k] != null) {
                        parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(qpObj[k])));
                    }
                }
                if (parts.length > 0) {
                    const sep = finalUrl.indexOf("?") >= 0 ? "&" : "?";
                    finalUrl = finalUrl + sep + parts.join("&");
                }
            }
            catch (e) {
                console.warn("prepareRequest: queryParams JSON parse failed:", e);
            }
        }
        const req = SimpleHTTP_1.SimpleHTTP.newRequest(finalUrl, { interpretResponse: true });
        if (auth && auth.trim().length > 0) {
            req.header("Authorization", auth);
        }
        if (headers) {
            try {
                const hdrObj = JSON.parse(headers);
                for (const h in hdrObj) {
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
    }
}
exports.SendRestCall = SendRestCall;
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
