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
var Pharos_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pharos = void 0;
const Metadata_1 = require("../system_lib/Metadata");
const Driver_1 = require("../system_lib/Driver");
let Pharos = class Pharos extends Driver_1.Driver {
    static { Pharos_1 = this; }
    socket;
    static kNumScenes = 25;
    scene;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        socket.autoConnect();
        this.scene = this.indexedProperty("scene", Scene);
        for (var pix = 0; pix < Pharos_1.kNumScenes; ++pix)
            this.scene.push(new Scene(this, pix));
    }
};
exports.Pharos = Pharos;
exports.Pharos = Pharos = Pharos_1 = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 3000 }),
    __metadata("design:paramtypes", [Object])
], Pharos);
class Scene {
    owner;
    ix;
    mState = 0;
    constructor(owner, ix) {
        this.owner = owner;
        this.ix = ix;
    }
    get state() {
        return this.mState;
    }
    set state(value) {
        this.mState = value;
        this.owner.socket.sendText("scen" + (this.mState ? 'on' : 'off') + this.ix);
    }
}
__decorate([
    (0, Metadata_1.property)("Scene being on (1) or off (0)"),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], Scene.prototype, "state", null);
