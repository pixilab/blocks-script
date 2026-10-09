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
exports.SettableClock = void 0;
const Script_1 = require("../system_lib/Script");
const SimpleFile_1 = require("../system/SimpleFile");
const Metadata_1 = require("../system_lib/Metadata");
class SettableClock extends Script_1.Script {
    settings;
    mPersistor;
    mStateChecker;
    mOn = false;
    kFileName = "SettableClock";
    constructor(env) {
        super(env);
        this.settings = {
            start: { hour: 8, minute: 0 },
            end: { hour: 18, minute: 0 }
        };
        SimpleFile_1.SimpleFile.read(this.kFileName).then(data => {
            const old = this.settings;
            const curr = this.settings = JSON.parse(data);
            if (old.start.hour !== curr.start.hour)
                this.changed('startHour');
            if (old.start.minute !== curr.start.minute)
                this.changed('startMinute');
            if (old.end.hour !== curr.end.hour)
                this.changed('endHour');
            if (old.end.minute !== curr.end.minute)
                this.changed('endMinute');
            this.checkStateNow();
        }).finally(() => this.checkState());
    }
    set on(value) {
        this.mOn = value;
    }
    get on() {
        return this.mOn;
    }
    set startHour(value) {
        if (this.settings.start.hour !== value)
            this.persistVars();
        this.settings.start.hour = value;
    }
    get startHour() {
        return this.settings.start.hour || 0;
    }
    set startMinute(value) {
        if (this.settings.start.minute !== value)
            this.persistVars();
        this.settings.start.minute = value;
    }
    get startMinute() {
        return this.settings.start.minute || 0;
    }
    set endHour(value) {
        if (this.settings.end.hour !== value)
            this.persistVars();
        this.settings.end.hour = value;
    }
    get endHour() {
        return this.settings.end.hour || 0;
    }
    set endMinute(value) {
        if (this.settings.end.minute !== value)
            this.persistVars();
        this.settings.end.minute = value;
    }
    get endMinute() {
        return this.settings.end.minute || 0;
    }
    static hmToSeconds(hm) {
        return hm.hour * 60 * 60 + hm.minute * 60;
    }
    checkState() {
        if (this.mStateChecker)
            return;
        this.mStateChecker = wait(60 * 1000);
        this.mStateChecker.then(() => {
            this.mStateChecker = undefined;
            if (!this.mPersistor) {
                if (!this.checkStateNow())
                    return;
            }
            this.checkState();
        });
    }
    checkStateNow() {
        const secStart = SettableClock.hmToSeconds(this.settings.start);
        const secEnd = SettableClock.hmToSeconds(this.settings.end);
        if (secEnd <= secStart) {
            console.error("End time must be greater than start time");
            return false;
        }
        const now = new Date();
        const hmNow = { hour: now.getHours(), minute: now.getMinutes() };
        const secNow = SettableClock.hmToSeconds(hmNow);
        this.on = secNow >= secStart && secNow < secEnd;
        return true;
    }
    persistVars() {
        if (this.mPersistor)
            this.mPersistor.cancel();
        this.mPersistor = wait(2000);
        this.mPersistor.then(() => {
            this.mPersistor = undefined;
            SimpleFile_1.SimpleFile.write(this.kFileName, JSON.stringify(this.settings));
            this.checkState();
        });
    }
}
exports.SettableClock = SettableClock;
__decorate([
    (0, Metadata_1.property)("ON state", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SettableClock.prototype, "on", null);
__decorate([
    (0, Metadata_1.property)("Start hour"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(23),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], SettableClock.prototype, "startHour", null);
__decorate([
    (0, Metadata_1.property)("Start minute"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(59),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], SettableClock.prototype, "startMinute", null);
__decorate([
    (0, Metadata_1.property)("End hour"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(23),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], SettableClock.prototype, "endHour", null);
__decorate([
    (0, Metadata_1.property)("End minute"),
    (0, Metadata_1.min)(0),
    (0, Metadata_1.max)(59),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], SettableClock.prototype, "endMinute", null);
