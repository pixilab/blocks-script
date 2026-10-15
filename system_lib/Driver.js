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
exports.Driver = void 0;
const ScriptBase_1 = require("../system_lib/ScriptBase");
const Meta = __importStar(require("../system_lib/Metadata"));
class Driver extends ScriptBase_1.ScriptBase {
    constructor(scriptFacade) {
        super(scriptFacade);
        if (!scriptFacade.isOfTypeName("NetworkUDP")) {
            this.__scriptFacade.subscribe('connect', (sender, message) => {
                if (message.type === 'Connection')
                    this.changed('connected');
            });
        }
    }
    get connected() {
        return !!this.__scriptFacade.connected;
    }
    get name() { return this.__scriptFacade.name; }
    get fullName() { return this.__scriptFacade.fullName; }
    get driverName() { return this.__scriptFacade.driverName; }
    get deviceType() {
        return this.__scriptFacade.deviceType;
    }
    subscribe(name, listener) {
        this.__scriptFacade.subscribe(name, listener);
    }
}
exports.Driver = Driver;
__decorate([
    Meta.property("Connected to peer"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [])
], Driver.prototype, "connected", null);
__decorate([
    Meta.property("Leaf name of this object"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], Driver.prototype, "name", null);
__decorate([
    Meta.property("Full, dot-separated path to this object"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], Driver.prototype, "fullName", null);
__decorate([
    Meta.property("Name of associated Device Driver"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], Driver.prototype, "driverName", null);
__decorate([
    Meta.property("Type of low level driver"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], Driver.prototype, "deviceType", null);
