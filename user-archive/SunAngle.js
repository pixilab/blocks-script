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
exports.SunAngle = void 0;
const Metadata_1 = require("../system_lib/Metadata");
const Script_1 = require("../system_lib/Script");
const suncalc = require("lib/suncalc");
class SunAngle extends Script_1.Script {
    mLat = 58.41086;
    mLong = 15.62157;
    mAltitude;
    mAzimuth;
    static kMinuteMillis = 1000 * 60;
    constructor(env) {
        super(env);
        asap(() => this.update());
    }
    update() {
        const pos = suncalc.getPosition(new Date(), this.mLat, this.mLong);
        this.altitude = pos.altitude / (Math.PI / 2);
        this.azimuth = pos.azimuth / (Math.PI * 3 / 4);
        wait(SunAngle.kMinuteMillis).then(() => this.update());
    }
    get latitude() {
        return this.mLat;
    }
    set latitude(value) {
        this.mLat = value;
    }
    get longitude() {
        return this.mLong;
    }
    set longitude(value) {
        this.mLong = value;
    }
    get altitude() {
        return this.mAltitude;
    }
    set altitude(value) {
        this.mAltitude = value;
    }
    get azimuth() {
        return this.mAzimuth;
    }
    set azimuth(value) {
        this.mAzimuth = value;
    }
}
exports.SunAngle = SunAngle;
__decorate([
    (0, Metadata_1.property)("World location latitude"),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], SunAngle.prototype, "latitude", null);
__decorate([
    (0, Metadata_1.property)("World location longitude"),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], SunAngle.prototype, "longitude", null);
__decorate([
    (0, Metadata_1.property)("Normalized sun altitude", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], SunAngle.prototype, "altitude", null);
__decorate([
    (0, Metadata_1.property)("Normalized sun azimuth", true),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], SunAngle.prototype, "azimuth", null);
