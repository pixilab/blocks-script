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
var VaddioVideoBridge_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaddioVideoBridge = void 0;
const Metadata_1 = require("../system_lib/Metadata");
const Driver_1 = require("../system_lib/Driver");
let VaddioVideoBridge = class VaddioVideoBridge extends Driver_1.Driver {
    static { VaddioVideoBridge_1 = this; }
    socket;
    options;
    static userNameReq = /.+vaddio-av-bridge-2x1[0-9,A-F-]+/;
    static loginAccepted = /.+Vaddio Interactive Shell.+/;
    mInput = 1;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.autoConnect();
        const rawOpts = socket.options;
        if (rawOpts) {
            try {
                var opts = JSON.parse(rawOpts);
                if (opts.name && opts.password) {
                    this.options = opts;
                    console.log("Options set");
                    socket.subscribe('textReceived', (sender, msg) => {
                        this.dataFromDevice(msg.text);
                    });
                }
                else
                    console.error("Invalid driver options (must have name and password)");
            }
            catch (error) {
                console.error("Bad driver options format", error);
            }
        }
        else
            console.warn("No options specified");
    }
    set input(value) {
        this.mInput = value;
        this.sendInputSelect();
    }
    get input() {
        return this.mInput;
    }
    sendInputSelect() {
        if (this.socket.connected)
            this.socket.sendText("video program source set input" + this.mInput);
    }
    dataFromDevice(msg) {
        if (msg.match(VaddioVideoBridge_1.userNameReq)) {
            wait(500).then(() => {
                this.socket.sendText(this.options.name);
                return wait(500);
            }).then(() => {
                this.socket.sendText(this.options.password);
                console.log("Provided login name and password");
            });
        }
        else if (msg.match(VaddioVideoBridge_1.loginAccepted)) {
            console.log("Login successful");
            this.init();
        }
    }
    init() {
        this.sendInputSelect();
    }
};
exports.VaddioVideoBridge = VaddioVideoBridge;
__decorate([
    (0, Metadata_1.property)("Selected input number"),
    (0, Metadata_1.min)(1),
    (0, Metadata_1.max)(2),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], VaddioVideoBridge.prototype, "input", null);
exports.VaddioVideoBridge = VaddioVideoBridge = VaddioVideoBridge_1 = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 23 }),
    __metadata("design:paramtypes", [Object])
], VaddioVideoBridge);
