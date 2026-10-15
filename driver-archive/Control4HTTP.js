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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Control4HTTP = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
const SimpleHTTP_1 = require("../system/SimpleHTTP");
const Meta = __importStar(require("../system_lib/Metadata"));
let Control4HTTP = class Control4HTTP extends Driver_1.Driver {
    socket;
    mOrigin;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        this.mOrigin = `http://${socket.address}`;
        if (socket.port !== 80)
            this.mOrigin = this.mOrigin + ':' + socket.port;
    }
    ping(path) {
        return SimpleHTTP_1.SimpleHTTP
            .newRequest(`${this.mOrigin}/${path}`)
            .get();
    }
};
exports.Control4HTTP = Control4HTTP;
__decorate([
    (0, Metadata_1.callable)("Ping specified path with a GET request"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], Control4HTTP.prototype, "ping", null);
exports.Control4HTTP = Control4HTTP = __decorate([
    Meta.driver('NetworkTCP', { port: 51048 }),
    __metadata("design:paramtypes", [Object])
], Control4HTTP);
