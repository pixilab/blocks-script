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
exports.SunClock = void 0;
const Metadata_1 = require("../system_lib/Metadata");
const Script_1 = require("../system_lib/Script");
const suncalc = require("lib/suncalc");
class SunClock extends Script_1.Script {
    mLat = 58.41086;
    mLong = 15.62157;
    momentProps = {};
    waiter;
    todaysMoments;
    utcDateWhenCached;
    forceUpdateTimer;
    static kPropNames = ['sunrise', 'sunset'];
    static kMinuteMillis = 1000 * 60;
    static kHourMillis = SunClock.kMinuteMillis * 60;
    static kDayMillis = SunClock.kHourMillis * 24;
    constructor(env) {
        super(env);
        for (var propName of SunClock.kPropNames)
            this.momentProps[propName] = new SunProp(this, propName, propName, 0);
        this.momentProps['daylight'] = new SunProp(this, 'daylight', 'sunriseEnd', 0, 'sunsetStart', 0);
        asap(() => this.forceUpdate());
    }
    defineCustom(propName, startMoment, startOffset, endMoment, endOffset) {
        var existingProp = this.momentProps[propName];
        if (existingProp) {
            existingProp.startMoment = startMoment;
            existingProp.startOffset = startOffset;
            existingProp.endMoment = endMoment;
            existingProp.endOffset = endOffset;
        }
        else {
            this.momentProps[propName] = new SunProp(this, propName, startMoment, startOffset || 0, endMoment, endOffset);
        }
        this.forceUpdateSoon();
    }
    updateTimes() {
        const now = new Date();
        const todaysUTCDate = now.getUTCDate();
        if (this.utcDateWhenCached !== todaysUTCDate) {
            this.todaysMoments = suncalc.getTimes(now, this.mLat, this.mLong);
            this.utcDateWhenCached = todaysUTCDate;
        }
        const moments = this.todaysMoments;
        const nowMillis = now.getTime();
        let nextWaitTime = SunClock.kMinuteMillis * 30;
        for (var propName in this.momentProps) {
            let nextInteresting = this.momentProps[propName].updateState(nowMillis, moments);
            let untilNextInteresting = nextInteresting - nowMillis;
            if (untilNextInteresting < 0)
                untilNextInteresting += SunClock.kDayMillis;
            nextWaitTime = Math.min(nextWaitTime, untilNextInteresting);
        }
        this.waiter = wait(nextWaitTime + 200);
        this.waiter.then(() => {
            this.waiter = undefined;
            this.updateTimes();
        });
    }
    get latitude() {
        return this.mLat;
    }
    set latitude(value) {
        const news = this.mLat !== value;
        this.mLat = value;
        if (news)
            this.forceUpdateSoon();
    }
    get longitude() {
        return this.mLong;
    }
    set longitude(value) {
        const news = this.mLong !== value;
        this.mLong = value;
        if (news)
            this.forceUpdateSoon();
    }
    forceUpdate() {
        if (this.waiter)
            this.waiter.cancel();
        if (this.forceUpdateTimer) {
            this.forceUpdateTimer.cancel();
            this.forceUpdateTimer = undefined;
        }
        this.utcDateWhenCached = undefined;
        this.updateTimes();
    }
    forceUpdateSoon() {
        if (this.forceUpdateTimer)
            this.forceUpdateTimer.cancel();
        this.forceUpdateTimer = wait(50);
        this.forceUpdateTimer.then(() => this.forceUpdate());
    }
}
exports.SunClock = SunClock;
__decorate([
    (0, Metadata_1.callable)("Define a custom sub clock property"),
    __param(0, (0, Metadata_1.parameter)("Name of this custom property")),
    __param(1, (0, Metadata_1.parameter)("Event name in suncalc library indicating beginning")),
    __param(2, (0, Metadata_1.parameter)("Time offset added to startMoment time, in minutes", true)),
    __param(3, (0, Metadata_1.parameter)("Event name in suncalc library indicating end", true)),
    __param(4, (0, Metadata_1.parameter)("Time offset added to endMoment time, in minutes", true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, String, Number]),
    __metadata("design:returntype", void 0)
], SunClock.prototype, "defineCustom", null);
__decorate([
    (0, Metadata_1.property)("World location latitude"),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], SunClock.prototype, "latitude", null);
__decorate([
    (0, Metadata_1.property)("World location longitude"),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], SunClock.prototype, "longitude", null);
class SunProp {
    owner;
    propName;
    startMoment;
    startOffset;
    endMoment;
    endOffset;
    currentlyIn = false;
    constructor(owner, propName, startMoment, startOffset, endMoment, endOffset) {
        this.owner = owner;
        this.propName = propName;
        this.startMoment = startMoment;
        this.startOffset = startOffset;
        this.endMoment = endMoment;
        this.endOffset = endOffset;
        owner.property(propName, { type: Boolean, readOnly: true }, () => this.currentlyIn);
    }
    getState() {
        return this.currentlyIn;
    }
    static getTimeFor(momentName, moments) {
        const slot = moments[momentName];
        if (!slot)
            throw "Invalid moment name " + momentName;
        return slot.getTime();
    }
    getEndTime(moments) {
        const endMoment = this.endMoment;
        if (endMoment)
            return SunProp.getTimeFor(endMoment, moments) + (this.endOffset || 0) * SunClock.kMinuteMillis;
        return this.getStartTime(moments) + SunClock.kMinuteMillis;
    }
    getStartTime(moments) {
        return SunProp.getTimeFor(this.startMoment, moments) + this.startOffset * SunClock.kMinuteMillis;
    }
    updateState(timeNow, moments) {
        const startTime = this.getStartTime(moments);
        const endTime = this.getEndTime(moments);
        const within = timeNow >= startTime && timeNow < endTime;
        if (within != this.currentlyIn) {
            this.currentlyIn = within;
            this.owner.changed(this.propName);
        }
        return within ? endTime : startTime;
    }
}
