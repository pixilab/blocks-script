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
exports.MersiveOpenControl = void 0;
const SimpleHTTP_1 = require("../system/SimpleHTTP");
const Metadata_1 = require("../system_lib/Metadata");
const Driver_1 = require("../system_lib/Driver");
let MersiveOpenControl = class MersiveOpenControl extends Driver_1.Driver {
    socket;
    mAutorization = "";
    mDisplayMode = 0;
    mOrigin;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        this.mAutorization = socket.options;
        socket.autoConnect();
        var origin = socket.address;
        if (socket.port !== 80)
            origin += ':' + socket.port;
        this.mOrigin = `http://${origin}/`;
    }
    get autorization() {
        return this.mAutorization;
    }
    set autorization(value) {
        this.mAutorization = value;
    }
    set hdmiOutDisplay(mode) {
        this.mDisplayMode = mode;
        this.post('api/config', JSON.stringify({
            m_generalCuration: {
                hdmiOutDisplayMode: mode
            }
        }));
    }
    get hdmiOutDisplay() {
        return this.mDisplayMode;
    }
    post(path, jsonData) {
        if (path.charAt(0) === '/')
            path = path.substring(1);
        const request = SimpleHTTP_1.SimpleHTTP.newRequest(this.mOrigin + path)
            .header("Accept", "*/*");
        if (this.mAutorization)
            request.header("Authorization", this.mAutorization);
        const result = request.post(jsonData);
        result.catch(error => console.error("POST to endpoint", path, "failed due to", error));
        return result;
    }
};
exports.MersiveOpenControl = MersiveOpenControl;
__decorate([
    (0, Metadata_1.property)("Authorization to use by requests"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], MersiveOpenControl.prototype, "autorization", null);
__decorate([
    (0, Metadata_1.property)("HDMI output display mode setting; Mirror (1), Seamless (2), or Extend (3)"),
    (0, Metadata_1.min)(1),
    (0, Metadata_1.max)(3),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], MersiveOpenControl.prototype, "hdmiOutDisplay", null);
__decorate([
    (0, Metadata_1.callable)("POSTs raw JSON data to the device"),
    __param(0, (0, Metadata_1.parameter)('Path to send to, such as "api/config"')),
    __param(1, (0, Metadata_1.parameter)('JSON data to be sent')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MersiveOpenControl.prototype, "post", null);
exports.MersiveOpenControl = MersiveOpenControl = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 80 }),
    __metadata("design:paramtypes", [Object])
], MersiveOpenControl);
