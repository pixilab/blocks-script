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
var CloudDCM1e_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudDCM1e = void 0;
const Driver_1 = require("../system_lib/Driver");
const Meta = __importStar(require("../system_lib/Metadata"));
let CloudDCM1e = class CloudDCM1e extends Driver_1.Driver {
    static { CloudDCM1e_1 = this; }
    socket;
    zones;
    static kZones = 8;
    requestQueue;
    keepAliveTimer;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        this.requestQueue = [];
        this.zones = [];
        for (var zix = 1; zix <= CloudDCM1e_1.kZones; ++zix)
            this.zones.push(new Zone(this, zix));
        socket.subscribe('connect', (sender, message) => {
            this.connectStateChanged(message);
        });
        socket.subscribe('textReceived', (sender, msg) => this.textReceived(msg.text));
        socket.setReceiveFraming("/>", true);
        socket.autoConnect();
        console.info("Driver initialized");
    }
    connectStateChanged(message) {
        if (message.type === 'Connection') {
            if (this.socket.connected) {
                for (var zone of this.zones)
                    zone.poll();
            }
            else
                console.warn("Connection dropped unexpectedly");
        }
    }
    textReceived(text) {
        const req = this.requestQueue[0];
        if (text.indexOf('<!') >= 0)
            console.warn("Error from peer", text);
        if (req)
            req.considerReply(text);
        else
            console.warn("Spurious data", text);
    }
    set zoneIn1(input) {
        this.zones[0].setInput(input);
    }
    get zoneIn1() {
        return this.zones[0].input;
    }
    set zoneIn2(input) {
        this.zones[1].setInput(input);
    }
    get zoneIn2() {
        return this.zones[1].input;
    }
    set zoneIn3(input) {
        this.zones[2].setInput(input);
    }
    get zoneIn3() {
        return this.zones[2].input;
    }
    set zoneIn4(input) {
        this.zones[3].setInput(input);
    }
    get zoneIn4() {
        return this.zones[3].input;
    }
    set zoneIn5(input) {
        this.zones[4].setInput(input);
    }
    get zoneIn5() {
        return this.zones[4].input;
    }
    set zoneIn6(input) {
        this.zones[5].setInput(input);
    }
    get zoneIn6() {
        return this.zones[5].input;
    }
    set zoneIn7(input) {
        this.zones[6].setInput(input);
    }
    get zoneIn7() {
        return this.zones[6].input;
    }
    set zoneIn8(input) {
        this.zones[7].setInput(input);
    }
    get zoneIn8() {
        return this.zones[7].input;
    }
    set zoneVolume1(volume) {
        this.zones[0].setVolume(volume);
    }
    get zoneVolume1() {
        return this.zones[0].volume;
    }
    set zoneVolume2(volume) {
        this.zones[1].setVolume(volume);
    }
    get zoneVolume2() {
        return this.zones[1].volume;
    }
    set zoneVolume3(volume) {
        this.zones[2].setVolume(volume);
    }
    get zoneVolume3() {
        return this.zones[2].volume;
    }
    set zoneVolume4(volume) {
        this.zones[3].setVolume(volume);
    }
    get zoneVolume4() {
        return this.zones[3].volume;
    }
    set zoneVolume5(volume) {
        this.zones[4].setVolume(volume);
    }
    get zoneVolume5() {
        return this.zones[4].volume;
    }
    set zoneVolume6(volume) {
        this.zones[5].setVolume(volume);
    }
    get zoneVolume6() {
        return this.zones[5].volume;
    }
    set zoneVolume7(volume) {
        this.zones[6].setVolume(volume);
    }
    get zoneVolume7() {
        return this.zones[6].volume;
    }
    set zoneVolume8(volume) {
        this.zones[7].setVolume(volume);
    }
    get zoneVolume8() {
        return this.zones[7].volume;
    }
    sendRequest(request, responsePattern) {
        const req = new Request(request, responsePattern);
        this.requestQueue.push(req);
        if (this.requestQueue.length === 1)
            this.sendNextRequest();
        return req;
    }
    sendNextRequest() {
        if (this.keepAliveTimer) {
            this.keepAliveTimer.cancel();
            delete this.keepAliveTimer;
        }
        const req = this.requestQueue[0];
        req.perform(this.socket).finally(() => {
            this.requestQueue.shift();
            if (this.requestQueue.length)
                this.sendNextRequest();
            else {
                this.keepAliveTimer = wait(20000);
                this.keepAliveTimer.then(() => {
                    delete this.keepAliveTimer;
                    this.sendRequest("<Z" + 1 + ".MU,SQ/>", Zone.kInputPattern);
                });
            }
        });
    }
};
exports.CloudDCM1e = CloudDCM1e;
__decorate([
    Meta.property("Zone source"),
    Meta.min(1),
    Meta.max(8),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CloudDCM1e.prototype, "zoneIn1", null);
__decorate([
    Meta.property("Zone source"),
    Meta.min(1),
    Meta.max(8),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CloudDCM1e.prototype, "zoneIn2", null);
__decorate([
    Meta.property("Zone source"),
    Meta.min(1),
    Meta.max(8),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CloudDCM1e.prototype, "zoneIn3", null);
__decorate([
    Meta.property("Zone source"),
    Meta.min(1),
    Meta.max(8),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CloudDCM1e.prototype, "zoneIn4", null);
__decorate([
    Meta.property("Zone source"),
    Meta.min(1),
    Meta.max(8),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CloudDCM1e.prototype, "zoneIn5", null);
__decorate([
    Meta.property("Zone source"),
    Meta.min(1),
    Meta.min(8),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CloudDCM1e.prototype, "zoneIn6", null);
__decorate([
    Meta.property("Zone source"),
    Meta.min(1),
    Meta.max(8),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CloudDCM1e.prototype, "zoneIn7", null);
__decorate([
    Meta.property("Zone source"),
    Meta.min(1),
    Meta.max(8),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CloudDCM1e.prototype, "zoneIn8", null);
__decorate([
    Meta.property("Zone volume"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CloudDCM1e.prototype, "zoneVolume1", null);
__decorate([
    Meta.property("Zone volume"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CloudDCM1e.prototype, "zoneVolume2", null);
__decorate([
    Meta.property("Zone volume"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CloudDCM1e.prototype, "zoneVolume3", null);
__decorate([
    Meta.property("Zone volume"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CloudDCM1e.prototype, "zoneVolume4", null);
__decorate([
    Meta.property("Zone volume"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CloudDCM1e.prototype, "zoneVolume5", null);
__decorate([
    Meta.property("Zone volume"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CloudDCM1e.prototype, "zoneVolume6", null);
__decorate([
    Meta.property("Zone volume"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CloudDCM1e.prototype, "zoneVolume7", null);
__decorate([
    Meta.property("Zone volume"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CloudDCM1e.prototype, "zoneVolume8", null);
exports.CloudDCM1e = CloudDCM1e = CloudDCM1e_1 = __decorate([
    Meta.driver('NetworkTCP', { port: 4999 }),
    __metadata("design:paramtypes", [Object])
], CloudDCM1e);
class Request {
    command;
    responsePattern;
    resolver;
    rejector;
    waiter;
    sent;
    reply;
    constructor(request, responsePattern) {
        this.command = request;
        this.responsePattern = responsePattern;
        this.reply = new Promise((resolver, rejector) => {
            this.resolver = resolver;
            this.rejector = rejector;
        });
    }
    reviseRequest(newToSend) {
        this.command = newToSend;
    }
    perform(socket) {
        this.sent = true;
        socket.sendText(this.command, '\r\n');
        this.waiter = wait(500);
        this.waiter.then(() => {
            this.rejector("Timeout");
            console.warn("Command timed out", this.command);
        });
        return this.reply;
    }
    considerReply(reply) {
        if (this.waiter)
            this.waiter.cancel();
        delete this.waiter;
        const result = this.responsePattern.exec(reply);
        if (result && result.length > 1)
            this.resolver(result[1]);
        else
            this.rejector("Invalid reply " + reply);
    }
}
class Zone {
    static kInputPattern = /<z\d\.mu,s=(.*)\/>/;
    static kVolumePattern = /<z\d\.mu,l=(.*)\/>/;
    static kMinVol = 62;
    owner;
    kZone;
    input;
    volume;
    lastVolRequest;
    constructor(owner, zoneNum) {
        this.owner = owner;
        this.kZone = zoneNum;
    }
    setVolume(volume) {
        this.volume = volume;
        volume = Math.round((1 - volume) * Zone.kMinVol);
        const request = "<Z" + this.kZone + ".MU,L" + volume + "/>";
        if (this.lastVolRequest && !this.lastVolRequest.sent)
            this.lastVolRequest.reviseRequest(request);
        else
            this.lastVolRequest = this.owner.sendRequest(request, Zone.kVolumePattern);
    }
    setInput(input) {
        this.input = input;
        this.owner.sendRequest("<Z" + this.kZone + ".MU,S" + input + "/>", Zone.kInputPattern);
    }
    poll() {
        if (this.input === undefined) {
            this.owner.sendRequest("<Z" + this.kZone + ".MU,SQ/>", Zone.kInputPattern)
                .reply.then(result => {
                const value = parseInt(result);
                if (value >= 1 && value <= 8 && this.input === undefined) {
                    this.input = value;
                    this.owner.changed("zoneIn" + this.kZone);
                }
            });
        }
        if (this.volume === undefined) {
            this.owner.sendRequest("<Z" + this.kZone + ".MU,LQ/>", Zone.kVolumePattern)
                .reply.then(result => {
                const value = (result === 'mute') ? 62 : parseInt(result);
                if (value >= 0 && value <= Zone.kMinVol && this.volume === undefined) {
                    this.volume = 1 - value / Zone.kMinVol;
                    this.owner.changed("zoneVolume" + this.kZone);
                }
            });
        }
    }
}
