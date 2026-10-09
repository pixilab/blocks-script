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
var CueCore2PIXI_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CueCore2PIXI = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
const ScriptBase_1 = require("../system_lib/ScriptBase");
class Playback extends ScriptBase_1.AggregateElem {
    index;
    owner;
    _active = false;
    _cue = 1;
    _intensity = 1;
    _rate = 0;
    constructor(index, owner) {
        super();
        this.index = index;
        this.owner = owner;
    }
    get active() {
        return this._active;
    }
    set active(newValue) {
        this._active = newValue;
        if (!this.owner.feedback) {
            if (newValue) {
                this.sendCommand("jump", this._cue);
            }
            else {
                this.sendCommand("release");
            }
        }
    }
    get cue() {
        return this._cue;
    }
    set cue(newValue) {
        this._cue = newValue;
        if (!this.owner.feedback && this._active) {
            this.sendCommand("jump", newValue);
        }
    }
    get intensity() {
        return this._intensity;
    }
    set intensity(newValue) {
        this._intensity = newValue;
        if (!this.owner.feedback) {
            this.sendCommand("intensity", newValue);
        }
    }
    get rate() {
        return this._rate;
    }
    set rate(newValue) {
        this._rate = newValue;
        if (!this.owner.feedback) {
            this.sendCommand("rate", newValue);
        }
    }
    sendCommand(command, value) {
        let toSend = "core-pb-" + this.index + "-" + command;
        if (value !== undefined) {
            toSend += "=" + value;
        }
        this.owner.connection.sendText(toSend);
    }
}
__decorate([
    (0, Metadata_1.property)("True to start playback, false to stop playback."),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], Playback.prototype, "active", null);
__decorate([
    (0, Metadata_1.property)("Playback cue"),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], Playback.prototype, "cue", null);
__decorate([
    (0, Metadata_1.property)("Playback intensity"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], Playback.prototype, "intensity", null);
__decorate([
    (0, Metadata_1.property)("Playback rate"),
    (0, Metadata_1.min)(-1),
    (0, Metadata_1.max)(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], Playback.prototype, "rate", null);
let CueCore2PIXI = class CueCore2PIXI extends Driver_1.Driver {
    static { CueCore2PIXI_1 = this; }
    connection;
    static POLL_RATE = 5000;
    feedback = false;
    playbacks;
    cmdHandlers = {};
    lastReceived;
    _connected = false;
    _intensity = 1;
    _rate = 0;
    _fade = 0;
    constructor(connection) {
        super(connection);
        this.connection = connection;
        this.playbacks = this.namedAggregateProperty("playbacks", Playback);
        this.init();
    }
    get connected() {
        return this._connected;
    }
    get intensity() {
        return this._intensity;
    }
    set intensity(newValue) {
        this._intensity = newValue;
        if (!this.feedback) {
            this.connection.sendText("core-pb-intensity=" + newValue);
        }
    }
    get rate() {
        return this._rate;
    }
    set rate(newValue) {
        this._rate = newValue;
        if (!this.feedback) {
            this.connection.sendText("core-pb-rate=" + newValue);
        }
    }
    get fade() {
        return this._fade;
    }
    set fade(newValue) {
        this._fade = newValue;
        if (!this.feedback) {
            this.connection.sendText("core-pb-fade=" + newValue);
        }
    }
    init() {
        for (let i = 1; i < 7; ++i) {
            let playback = new Playback(i, this);
            this.playbacks["playback" + i] = playback;
            this.cmdHandlers["core-pb-" + i + "-intensity"] =
                (strValue) => {
                    playback.intensity = parseFloat(strValue);
                };
            this.cmdHandlers["core-pb-" + i + "-rate"] =
                (strValue) => {
                    playback.rate = parseFloat(strValue);
                };
            this.cmdHandlers["core-pb-" + i + "-cue"] =
                (strValue) => {
                    playback.cue = parseInt(strValue);
                };
            this.cmdHandlers["core-pb-" + i + "-active"] =
                (strValue) => {
                    playback.active = strValue === "On";
                };
        }
        this.cmdHandlers["core-pb-intensity"] = (strValue) => {
            this.intensity = parseFloat(strValue);
        };
        this.cmdHandlers["core-pb-rate"] = (strValue) => {
            this.rate = parseFloat(strValue);
        };
        this.cmdHandlers["core-pb-fade"] = (strValue) => {
            this.fade = parseInt(strValue);
        };
        this.connection.subscribe("textReceived", (emitter, message) => {
            if (!this._connected) {
                this._connected = true;
                this.changed("connected");
                this.sendState();
            }
            this.lastReceived = Date.now();
            this.handleMessage(message.text);
        });
        this.pollForever();
    }
    handleMessage(message) {
        let [cmd, value] = message.split("=");
        if (cmd in this.cmdHandlers) {
            this.feedback = true;
            try {
                this.cmdHandlers[cmd](value);
            }
            finally {
                this.feedback = false;
            }
        }
    }
    sendState() {
        for (const key in this.playbacks) {
            let playback = this.playbacks[key];
            playback.rate = playback.rate;
            playback.intensity = playback.intensity;
            playback.cue = playback.cue;
            playback.active = playback.active;
        }
        this.intensity = this._intensity;
        this.rate = this._rate;
        this.fade = this._fade;
    }
    pollForever() {
        let prevReceived = this.lastReceived;
        wait(10).then(() => {
            this.connection.sendText("core-hello");
            wait(CueCore2PIXI_1.POLL_RATE).then(() => {
                if (this._connected && this.lastReceived === prevReceived) {
                    this._connected = false;
                    this.changed("connected");
                }
                this.pollForever();
            });
        });
    }
};
exports.CueCore2PIXI = CueCore2PIXI;
__decorate([
    (0, Metadata_1.property)(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [])
], CueCore2PIXI.prototype, "connected", null);
__decorate([
    (0, Metadata_1.property)("Master intensity"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CueCore2PIXI.prototype, "intensity", null);
__decorate([
    (0, Metadata_1.property)("Master rate"),
    (0, Metadata_1.min)(-1),
    (0, Metadata_1.max)(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CueCore2PIXI.prototype, "rate", null);
__decorate([
    (0, Metadata_1.property)("Master fade time (seconds)"),
    (0, Metadata_1.min)(0),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], CueCore2PIXI.prototype, "fade", null);
exports.CueCore2PIXI = CueCore2PIXI = CueCore2PIXI_1 = __decorate([
    (0, Metadata_1.driver)("NetworkUDP", { port: 7000, rcvPort: 7001 }),
    __metadata("design:paramtypes", [Object])
], CueCore2PIXI);
