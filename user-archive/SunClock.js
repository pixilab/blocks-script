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
define(["require", "exports", "system_lib/Metadata", "../system_lib/Script"], function (require, exports, Metadata_1, Script_1) {
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
                _this.momentProps[propName] = new MomentProp(_this, propName);
            }
            _this.updateTimes();
            return _this;
        }
        SunClock.prototype.updateTimes = function () {
            var _this = this;
            if (this.waiter)
                this.waiter.cancel();
            var now = new Date();
            var moments = suncalc.getTimes(now, this.mLat, this.mLong);
            var nowMillis = now.getTime();
            var timeTilNextInteresting = SunClock.kDayMillis;
            for (var _i = 0, _a = SunClock.kPropNames; _i < _a.length; _i++) {
                var propName = _a[_i];
                var slotDate = moments[propName];
                var momentMillis = slotDate.getTime();
                var timeUntil = momentMillis - nowMillis;
                var momentProp = this.momentProps[propName];
                var withinSlot = timeUntil <= 0 && timeUntil > -SunClock.kMinuteMillis;
                if (momentProp.setState(withinSlot)) {
                    this.changed(propName);
                }
                if (timeUntil > 0)
                    timeTilNextInteresting = Math.min(timeTilNextInteresting, timeUntil);
                if (momentProp.getState())
                    timeTilNextInteresting = Math.min(timeTilNextInteresting, SunClock.kMinuteMillis);
            }
            timeTilNextInteresting = Math.min(timeTilNextInteresting, SunClock.kHourMillis);
            this.waiter = wait(timeTilNextInteresting + 200);
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
                    this.updateTimes();
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
                    this.updateTimes();
            },
            enumerable: false,
            configurable: true
        });
        SunClock.kPropNames = ['sunrise', 'sunset', 'sunsetStart', 'sunriseEnd', 'dawn', 'dusk'];
        SunClock.kMinuteMillis = 1000 * 60;
        SunClock.kHourMillis = SunClock.kMinuteMillis * 60;
        SunClock.kDayMillis = SunClock.kHourMillis * 24;
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
    var MomentProp = (function () {
        function MomentProp(owner, name) {
            var _this = this;
            this.name = name;
            this.propState = false;
            owner.property(name, { type: Boolean, readOnly: true }, function () { return _this.propState; });
        }
        MomentProp.prototype.getState = function () {
            return this.propState;
        };
        MomentProp.prototype.setState = function (state) {
            var news = state !== this.propState;
            this.propState = state;
            return news;
        };
        return MomentProp;
    }());
});
