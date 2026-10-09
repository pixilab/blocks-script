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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WOCustomDrvr_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WOCustomDrvr = void 0;
const Driver_1 = require("../system_lib/Driver");
const Meta = __importStar(require("../system_lib/Metadata"));
let WOCustomDrvr = class WOCustomDrvr extends Driver_1.Driver {
    static { WOCustomDrvr_1 = this; }
    socket;
    pendingQueries = {};
    mAsFeedback = false;
    mConnected = false;
    mPlaying = false;
    mStandBy = false;
    mLevel = 0;
    mLayerCond = 0;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.subscribe('connect', (sender, message) => {
            this.connectStateChanged();
        });
        socket.subscribe('textReceived', (sender, msg) => this.textReceived(msg.text));
        socket.autoConnect();
        this.mConnected = socket.connected;
        if (this.mConnected)
            this.getInitialStatus();
    }
    set connected(online) {
        this.mConnected = online;
    }
    get connected() {
        return this.mConnected;
    }
    set layerCond(cond) {
        if (this.mLayerCond !== cond) {
            this.mLayerCond = cond;
            this.tell("enableLayerCond " + cond);
        }
    }
    get layerCond() {
        return this.mLayerCond;
    }
    set playing(play) {
        if (!this.mAsFeedback)
            this.tell(play ? "run" : "halt");
        this.mPlaying = play;
    }
    get playing() {
        return this.mPlaying;
    }
    set standBy(stby) {
        if (!this.mAsFeedback)
            this.tell(stby ? "standBy true 1000" : "standBy false 1000");
        this.mStandBy = stby;
    }
    get standBy() {
        return this.mStandBy;
    }
    set input(level) {
        this.tell("setInput In1 " + level);
        this.mLevel = level;
    }
    get input() {
        return this.mLevel;
    }
    playAuxTimeline(name, start) {
        this.tell((start ? "run \"" : "kill \"") + name + '""');
    }
    connectStateChanged() {
        this.connected = this.socket.connected;
        if (this.socket.connected)
            this.getInitialStatus();
        else
            this.discardAllQueries();
    }
    getInitialStatus() {
        this.ask('getStatus').then(reply => {
            this.mAsFeedback = true;
            const pieces = reply.split(' ');
            if (pieces[4] === 'true') {
                this.playing = (pieces[7] === 'true');
                this.standBy = (pieces[9] === 'true');
            }
            this.mAsFeedback = false;
        });
    }
    tell(data) {
        this.socket.sendText(data);
    }
    static kReplyParser = /\[([^\]]+)\](\w*)[\s]?(.*)/;
    textReceived(text) {
        const pieces = WOCustomDrvr_1.kReplyParser.exec(text);
        if (pieces && pieces.length > 3) {
            const id = pieces[1];
            const what = pieces[2];
            const query = this.pendingQueries[id];
            if (query) {
                delete this.pendingQueries[id];
                query.handleResult(what, pieces[3]);
            }
            else
                console.warn("Unexpected reply", text);
        }
        else
            console.warn("Spurious data", text);
    }
    ask(question) {
        if (this.socket.connected) {
            const query = new Query(question);
            this.pendingQueries[query.id] = query;
            this.socket.sendText(query.fullCmd);
            return query.promise;
        }
        else
            console.error("Can't ask. Not connected");
    }
    discardAllQueries() {
        for (var queryId in this.pendingQueries) {
            this.pendingQueries[queryId].fail("Discarded");
        }
        this.pendingQueries = {};
    }
};
exports.WOCustomDrvr = WOCustomDrvr;
__decorate([
    Meta.property("Connected to WATCHOUT", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], WOCustomDrvr.prototype, "connected", null);
__decorate([
    Meta.property("Layer condition flags"),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], WOCustomDrvr.prototype, "layerCond", null);
__decorate([
    Meta.property("Main timeline playing"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], WOCustomDrvr.prototype, "playing", null);
__decorate([
    Meta.property("Standby mode"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], WOCustomDrvr.prototype, "standBy", null);
__decorate([
    Meta.property("Generic input level"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], WOCustomDrvr.prototype, "input", null);
__decorate([
    Meta.callable("Play or stop any auxiliary timeline"),
    __param(0, Meta.parameter("Name of aux timeline to control")),
    __param(1, Meta.parameter("Whether to start the timeline")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", void 0)
], WOCustomDrvr.prototype, "playAuxTimeline", null);
exports.WOCustomDrvr = WOCustomDrvr = WOCustomDrvr_1 = __decorate([
    Meta.driver('NetworkTCP', { port: 3040 }),
    __metadata("design:paramtypes", [Object])
], WOCustomDrvr);
class Query {
    static prevId = 0;
    mFullCmd;
    mId;
    mPromise;
    resolver;
    rejector;
    constructor(cmd) {
        this.mPromise = new Promise((resolve, reject) => {
            this.resolver = resolve;
            this.rejector = reject;
        });
        let id = ++Query.prevId;
        this.mId = id;
        this.mFullCmd = '[' + id + ']' + cmd;
    }
    get id() { return this.mId; }
    get fullCmd() { return this.mFullCmd; }
    get promise() { return this.mPromise; }
    handleResult(what, remainder) {
        if (what === 'Reply')
            this.resolver(remainder);
        else
            this.fail(remainder);
    }
    fail(error) {
        this.rejector(error);
    }
}
