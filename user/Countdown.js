var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
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
define(["require", "exports", "system_lib/Script", "system_lib/Metadata"], function (require, exports, Script_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Countdown = (function (_super) {
        __extends(Countdown, _super);
        function Countdown(env) {
            var _this = _super.call(this, env) || this;
            _this.mMinutes = 0;
            _this.mSeconds = 0;
            env.subscribe('finish', function () {
                if (_this.tickTimer)
                    _this.tickTimer.cancel();
            });
            return _this;
        }
        Object.defineProperty(Countdown.prototype, "minutes", {
            get: function () {
                return padTwoDigits(this.mMinutes);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Countdown.prototype, "seconds", {
            get: function () {
                return padTwoDigits(this.mSeconds);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Countdown.prototype, "zero", {
            get: function () {
                return this.mMinutes === 0 && this.mSeconds === 0;
            },
            enumerable: true,
            configurable: true
        });
        Countdown.prototype.start = function (minutes, seconds) {
            var wasZero = this.zero;
            this.setSeconds(Math.max(0, Math.min(59, Math.round(seconds))));
            this.setMinutes(Math.max(0, Math.min(60, Math.round(minutes))));
            this.notifyZero(wasZero);
            this.manageTicking();
        };
        Countdown.prototype.setMinutes = function (val) {
            if (this.mMinutes !== val) {
                this.mMinutes = val;
                this.changed("minutes");
            }
            return val;
        };
        Countdown.prototype.setSeconds = function (val) {
            if (this.mSeconds !== val) {
                this.mSeconds = val;
                this.changed("seconds");
            }
            return val;
        };
        Countdown.prototype.notifyZero = function (wasZero) {
            var isZero = this.zero;
            if (wasZero !== isZero)
                this.changed("zero");
            return isZero;
        };
        Countdown.prototype.manageTicking = function () {
            var _this = this;
            if (this.tickTimer) {
                this.tickTimer.cancel();
                this.tickTimer = undefined;
            }
            if (!this.zero) {
                this.tickTimer = wait(1000);
                this.tickTimer.then(function () {
                    _this.tickTimer = undefined;
                    var seconds = _this.mSeconds;
                    var minutes = _this.mMinutes;
                    if (--seconds === -1) {
                        if (--minutes === -1)
                            seconds = minutes = 0;
                        else
                            seconds = 59;
                    }
                    _this.setSeconds(seconds);
                    _this.setMinutes(minutes);
                    _this.notifyZero(false);
                    _this.manageTicking();
                });
            }
        };
        return Countdown;
    }(Script_1.Script));
    __decorate([
        Metadata_1.property("Number of minutes remaining (always 2 digits)"),
        __metadata("design:type", String),
        __metadata("design:paramtypes", [])
    ], Countdown.prototype, "minutes", null);
    __decorate([
        Metadata_1.property("Number of seconds remaining (always 2 digits)"),
        __metadata("design:type", String),
        __metadata("design:paramtypes", [])
    ], Countdown.prototype, "seconds", null);
    __decorate([
        Metadata_1.property("True when the timer is at time zero"),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [])
    ], Countdown.prototype, "zero", null);
    __decorate([
        Metadata_1.callable("Start countdown from specified time"),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Number]),
        __metadata("design:returntype", void 0)
    ], Countdown.prototype, "start", null);
    exports.Countdown = Countdown;
    function padTwoDigits(val) {
        var result = val.toString();
        if (result.length < 2)
            result = '0' + result;
        return result;
    }
});
