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
exports.YamahaQL1 = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
const ScriptBase_1 = require("../system_lib/ScriptBase");
const notifyPattern = /^(NOTIFY|OK) (get|set|sscurrent_ex) (\S*) (\d\d?)(?: 0 |)(?:"([^"]*)|(\S*))/;
let YamahaQL1 = class YamahaQL1 extends Driver_1.Driver {
    socket;
    keepAliver;
    toldConnFailed = false;
    mNumFaders = 32;
    mScene;
    fader;
    master;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        this.master = this.indexedProperty("master", Fader);
        this.fader = this.indexedProperty("fader", Fader);
        this.master.push(new Fader(this, 0, 'MIXER:Current/St'));
        this.master.push(new Fader(this, 1, 'MIXER:Current/St'));
        for (let i = 0; i < this.mNumFaders; ++i)
            this.fader.push(new Fader(this, i, 'MIXER:Current/InCh'));
        if (socket.enabled) {
            socket.autoConnect();
            this.keepAliver = new KeepAliver(this);
            socket.subscribe('finish', () => this.keepAliver.discard());
            socket.subscribe('textReceived', (sender, message) => this.gotData(message.text));
            socket.subscribe('connect', (sender, message) => {
                if (message.type === 'Connection') {
                    if (this.socket.connected) {
                        this.pollEverything();
                        this.toldConnFailed = false;
                    }
                    else
                        console.warn("Connection dropped unexpectedly");
                }
                else if (!this.toldConnFailed) {
                    console.warn(message.type);
                    this.toldConnFailed = true;
                }
            });
        }
    }
    gotData(data) {
        const result = data.match(notifyPattern);
        if (result && result.length > 4 && !(result[1] == 'OK' && result[2] == 'set')) {
            if (result[3] == 'MIXER:Current/InCh/Fader/Level') {
                this.fader[Number(result[4])].mLevel = Number(result[6]) * 0.01;
                this.fader[Number(result[4])].changed('level');
            }
            else if (result[3] == 'MIXER:Current/InCh/Fader/On') {
                this.fader[Number(result[4])].mOn = !!Number(result[6]);
                this.fader[Number(result[4])].changed('on');
            }
            else if (result[3] == 'MIXER:Current/InCh/Label/Name') {
                this.fader[Number(result[4])].mLabel = result[5];
                this.fader[Number(result[4])].changed('label');
            }
            else if (result[3] == 'MIXER:Current/St/Fader/Level') {
                this.master[Number(result[4])].mLevel = Number(result[6]) * 0.01;
                this.master[Number(result[4])].changed('level');
            }
            else if (result[3] == 'MIXER:Current/St/Fader/On') {
                this.master[Number(result[4])].mOn = !!Number(result[6]);
                this.master[Number(result[4])].changed('on');
            }
            else if (result[3] == 'MIXER:Current/St/Label/Name') {
                this.master[Number(result[4])].mLabel = result[5];
                this.master[Number(result[4])].changed('label');
            }
            else if (result[3] == 'NOTIFY sscurrent_ex MIXER:Lib/Scene') {
                this.mScene = Number(result[4]);
                this.changed('current_scene');
            }
        }
    }
    sendText(cmd) {
        this.socket.sendText(cmd);
    }
    set current_scene(val) {
        this.mScene = val;
        this.sendText("ssrecall_ex MIXER:Lib/Scene " + val);
    }
    get current_scene() {
        return this.mScene;
    }
    pollEverything() {
        this.sendText('sscurrent_ex MIXER:Lib/Scene');
        this.sendText('get MIXER:Current/St/Fader/Level 0 0');
        this.sendText('get MIXER:Current/St/Fader/On 0 0');
        this.sendText('get MIXER:Current/St/Label/Name 0 0');
        for (let i = 0; i < this.mNumFaders; ++i) {
            this.sendText('get MIXER:Current/InCh/Fader/Level ' + i + ' 0');
            this.sendText('get MIXER:Current/InCh/Fader/On ' + i + ' 0');
            this.sendText('get MIXER:Current/InCh/Label/Name ' + i + ' 0');
        }
    }
};
exports.YamahaQL1 = YamahaQL1;
__decorate([
    (0, Metadata_1.callable)("Send a command"),
    __param(0, (0, Metadata_1.parameter)("Command to send")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], YamahaQL1.prototype, "sendText", null);
__decorate([
    (0, Metadata_1.property)("Current scene number"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(300),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], YamahaQL1.prototype, "current_scene", null);
exports.YamahaQL1 = YamahaQL1 = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 49280 }),
    __metadata("design:paramtypes", [Object])
], YamahaQL1);
class KeepAliver {
    YamahaQL1;
    pending;
    constructor(YamahaQL1) {
        this.YamahaQL1 = YamahaQL1;
        this.saySomethingInAWhile();
    }
    discard() {
        if (this.pending) {
            this.pending.cancel();
            this.pending = undefined;
        }
    }
    saySomethingInAWhile() {
        this.pending = wait(20000);
        this.pending.then(() => {
            this.sayNow();
            this.saySomethingInAWhile();
        });
    }
    sayNow() {
        const sock = this.YamahaQL1.socket;
        if (sock.connected)
            sock.sendText("devinfo devicename");
    }
}
class Fader extends ScriptBase_1.AggregateElem {
    owner;
    mCommandPath;
    mId;
    mLabel = '';
    mLevel = 0;
    mOn = false;
    constructor(owner, id, mCommandPath) {
        super();
        this.owner = owner;
        this.mCommandPath = mCommandPath;
        this.mId = id;
    }
    get label() {
        return this.mLabel;
    }
    set label(value) {
        if (value !== undefined) {
            this.owner.sendText('set ' + this.mCommandPath + '/Label/Name ' + this.mId + ' 0 "' + value + '"');
            this.mLabel = value;
        }
    }
    get level() {
        return this.mLevel;
    }
    set level(value) {
        if (value <= -60)
            value = -327.68;
        this.owner.sendText('set ' + this.mCommandPath + '/Fader/Level ' + this.mId + ' 0 ' + Math.round(value * 100));
        this.mLevel = value;
    }
    get on() {
        return this.mOn;
    }
    set on(value) {
        if (value !== undefined) {
            this.owner.sendText('set ' + this.mCommandPath + '/Fader/On ' + this.mId + ' 0 ' + (value ? 1 : 0));
            this.mOn = value;
        }
    }
}
__decorate([
    (0, Metadata_1.property)("Label"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], Fader.prototype, "label", null);
__decorate([
    (0, Metadata_1.property)("Fader level in dB"),
    (0, Metadata_1.min)(-327.68),
    (0, Metadata_1.max)(10),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], Fader.prototype, "level", null);
__decorate([
    (0, Metadata_1.property)("On"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], Fader.prototype, "on", null);
