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
exports.PersistentDrvr = void 0;
const SimpleFile_1 = require("../system/SimpleFile");
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
let PersistentDrvr = class PersistentDrvr extends Driver_1.Driver {
    socket;
    mStringo;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.autoConnect();
        const myFullName = socket.fullName;
        console.log("fullName", myFullName);
        SimpleFile_1.SimpleFile.read(myFullName).then(readValue => {
            if (this.mStringo !== readValue) {
                this.mStringo = readValue;
                socket.changed("stringo");
            }
        }).catch(error => console.warn("Can't read file", myFullName, error));
    }
    set stringo(value) {
        if (this.mStringo !== value) {
            this.mStringo = value;
            console.log("stringo", value);
            SimpleFile_1.SimpleFile.write(this.socket.fullName, value).catch(error => console.warn("Can't write file", error));
        }
    }
    get stringo() {
        return this.mStringo;
    }
};
exports.PersistentDrvr = PersistentDrvr;
__decorate([
    (0, Metadata_1.property)("Persisted property"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], PersistentDrvr.prototype, "stringo", null);
exports.PersistentDrvr = PersistentDrvr = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 1025 }),
    __metadata("design:paramtypes", [Object])
], PersistentDrvr);
