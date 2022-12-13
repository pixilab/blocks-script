var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
define(["require", "exports", "system_lib/Metadata", "system_lib/Script"], function (require, exports, Metadata_1, Script_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SunClock = void 0;
    var suncalc = require("lib/suncalc");
    var SunClock = (function (_super) {
        __extends(SunClock, _super);
        function SunClock(env) {
            var _this = _super.call(this, env) || this;
            _this.mLat = 58.41086;
            _this.mLong = 15.62157;
            _this.momentProps = {};
            for (var _i = 0, _a = SunClock.kPropNames; _i < _a.length; _i++) {
                var propName = _a[_i];
                _this.momentProps[propName] = new SunProp(_this, propName, propName, 0);
            }
            _this.momentProps['daylight'] = new SunProp(_this, 'daylight', 'sunriseEnd', 0, 'sunsetStart', 0);
            asap(function () { return _this.forceUpdate(); });
            return _this;
        }
        SunClock.prototype.defineCustom = function (propName, startMoment, startOffset, endMoment, endOffset) {
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
        };
        SunClock.prototype.updateTimes = function () {
            var _this = this;
            var now = new Date();
            var todaysUTCDate = now.getUTCDate();
            if (this.utcDateWhenCached !== todaysUTCDate) {
                this.todaysMoments = suncalc.getTimes(now, this.mLat, this.mLong);
                this.utcDateWhenCached = todaysUTCDate;
            }
            var moments = this.todaysMoments;
            var nowMillis = now.getTime();
            var nextWaitTime = SunClock.kMinuteMillis * 30;
            for (var propName in this.momentProps) {
                var nextInteresting = this.momentProps[propName].updateState(nowMillis, moments);
                var untilNextInteresting = nextInteresting - nowMillis;
                if (untilNextInteresting < 0)
                    untilNextInteresting += SunClock.kDayMillis;
                nextWaitTime = Math.min(nextWaitTime, untilNextInteresting);
            }
            this.waiter = wait(nextWaitTime + 200);
            this.waiter.then(function () {
                _this.waiter = undefined;
                _this.updateTimes();
            });
        };
        Object.defineProperty(SunClock.prototype, "latitude", {
            get: function () {
                return this.mLat;
            },
            set: function (value) {
                var news = this.mLat !== value;
                this.mLat = value;
                if (news)
                    this.forceUpdateSoon();
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SunClock.prototype, "longitude", {
            get: function () {
                return this.mLong;
            },
            set: function (value) {
                var news = this.mLong !== value;
                this.mLong = value;
                if (news)
                    this.forceUpdateSoon();
            },
            enumerable: false,
            configurable: true
        });
        SunClock.prototype.forceUpdate = function () {
            if (this.waiter)
                this.waiter.cancel();
            if (this.forceUpdateTimer) {
                this.forceUpdateTimer.cancel();
                this.forceUpdateTimer = undefined;
            }
            this.utcDateWhenCached = undefined;
            this.updateTimes();
        };
        SunClock.prototype.forceUpdateSoon = function () {
            var _this = this;
            if (this.forceUpdateTimer)
                this.forceUpdateTimer.cancel();
            this.forceUpdateTimer = wait(50);
            this.forceUpdateTimer.then(function () { return _this.forceUpdate(); });
        };
        SunClock.kPropNames = ['sunrise', 'sunset'];
        SunClock.kMinuteMillis = 1000 * 60;
        SunClock.kHourMillis = SunClock.kMinuteMillis * 60;
        SunClock.kDayMillis = SunClock.kHourMillis * 24;
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
        return SunClock;
    }(Script_1.Script));
    exports.SunClock = SunClock;
    var SunProp = (function () {
        function SunProp(owner, propName, startMoment, startOffset, endMoment, endOffset) {
            var _this = this;
            this.owner = owner;
            this.propName = propName;
            this.startMoment = startMoment;
            this.startOffset = startOffset;
            this.endMoment = endMoment;
            this.endOffset = endOffset;
            this.currentlyIn = false;
            owner.property(propName, { type: Boolean, readOnly: true }, function () { return _this.currentlyIn; });
        }
        SunProp.prototype.getState = function () {
            return this.currentlyIn;
        };
        SunProp.getTimeFor = function (momentName, moments) {
            var slot = moments[momentName];
            if (!slot)
                throw "Invalid moment name " + momentName;
            return slot.getTime();
        };
        SunProp.prototype.getEndTime = function (moments) {
            var endMoment = this.endMoment;
            if (endMoment)
                return SunProp.getTimeFor(endMoment, moments) + (this.endOffset || 0) * SunClock.kMinuteMillis;
            return this.getStartTime(moments) + SunClock.kMinuteMillis;
        };
        SunProp.prototype.getStartTime = function (moments) {
            return SunProp.getTimeFor(this.startMoment, moments) + this.startOffset * SunClock.kMinuteMillis;
        };
        SunProp.prototype.updateState = function (timeNow, moments) {
            var startTime = this.getStartTime(moments);
            var endTime = this.getEndTime(moments);
            var within = timeNow >= startTime && timeNow < endTime;
            if (within != this.currentlyIn) {
                this.currentlyIn = within;
                this.owner.changed(this.propName);
            }
            return within ? endTime : startTime;
        };
        return SunProp;
    }());
});
