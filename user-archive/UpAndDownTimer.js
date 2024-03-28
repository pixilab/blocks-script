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
define(["require", "exports", "system_lib/Script", "system_lib/Metadata"], function (require, exports, Script_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.UpAndDownTimer = void 0;
    var UpAndDownTimer = (function (_super) {
        __extends(UpAndDownTimer, _super);
        function UpAndDownTimer(env) {
            var _this = _super.call(this, env) || this;
            _this.mMinutes = 0;
            _this.mSeconds = 0;
            _this.mTenths = 0;
            _this.mRunning = true;
            _this.tickDown = true;
            _this.mToMinutes = 0;
            _this.mToSeconds = 0;
            _this.mToTenths = 0;
            _this.mTimerStarted = 0;
            _this.mCountTicks = 0;
            env.subscribe('finish', function () {
                if (_this.tickTimer)
                    _this.tickTimer.cancel();
            });
            return _this;
        }
        Object.defineProperty(UpAndDownTimer.prototype, "minutes", {
            get: function () {
                return padTwoDigits(this.mMinutes);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(UpAndDownTimer.prototype, "seconds", {
            get: function () {
                return padTwoDigits(this.mSeconds);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(UpAndDownTimer.prototype, "tenths", {
            get: function () {
                return this.mTenths.toString();
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(UpAndDownTimer.prototype, "time", {
            get: function () {
                return this.minutes + ":" + padTwoDigits(this.seconds) + "." + this.tenths;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(UpAndDownTimer.prototype, "ticks", {
            get: function () {
                return this.mCountTicks;
            },
            set: function (val) {
                this.mCountTicks = val;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(UpAndDownTimer.prototype, "done", {
            get: function () {
                if (this.tickDown)
                    return this.mMinutes === 0 && this.mSeconds === 0 && this.mTenths === 0;
                else
                    return this.mMinutes === this.mToMinutes && this.mSeconds === this.mToSeconds && this.mTenths === this.mToTenths;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(UpAndDownTimer.prototype, "running", {
            get: function () {
                return this.mRunning;
            },
            set: function (state) {
                if (this.mRunning !== state) {
                    console.log("Timer running: " + state);
                    this.mRunning = state;
                    if (this.mRunning) {
                        this.mTimerStarted = Date.now() - this.ticks * 100;
                    }
                    this.manageTicking();
                }
            },
            enumerable: false,
            configurable: true
        });
        UpAndDownTimer.prototype.shouldRunClock = function () {
            return this.mRunning && !this.done;
        };
        UpAndDownTimer.prototype.startDown = function (minutes, seconds, tenths) {
            this.tickDown = true;
            this.mTimerStarted = Date.now();
            this.ticks = 0;
            this.setSeconds(Math.max(0, Math.min(59, Math.round(seconds))));
            this.setMinutes(Math.max(0, Math.min(60, Math.round(minutes))));
            this.setTenths(Math.max(0, Math.min(9, Math.round(tenths))));
            this.changed("done");
            this.running = true;
            this.manageTicking();
        };
        UpAndDownTimer.prototype.startUp = function (minutes, seconds, tenths) {
            this.tickDown = false;
            this.mTimerStarted = Date.now();
            this.ticks = 0;
            this.mToMinutes = Math.max(0, Math.min(60, Math.round(minutes)));
            this.mToSeconds = Math.max(0, Math.min(59, Math.round(seconds)));
            this.mToTenths = Math.max(0, Math.min(9, Math.round(tenths)));
            this.setMinutes(0);
            this.setSeconds(0);
            this.setTenths(0);
            this.changed("done");
            this.running = true;
            this.manageTicking();
        };
        UpAndDownTimer.prototype.setMinutes = function (val) {
            if (this.mMinutes !== val) {
                this.mMinutes = val;
                this.changed("minutes");
            }
            return val;
        };
        UpAndDownTimer.prototype.setSeconds = function (val) {
            if (this.mSeconds !== val) {
                this.mSeconds = val;
                this.changed("seconds");
            }
            return val;
        };
        UpAndDownTimer.prototype.setTenths = function (val) {
            if (this.mTenths !== val) {
                this.mTenths = val;
                this.changed("tenths");
                this.changed("time");
            }
            return val;
        };
        UpAndDownTimer.prototype.notifyDone = function (wasDone) {
            var isDone = this.done;
            if (wasDone !== isDone) {
                if (this.done) {
                    console.log("Timer done! " + this.ticks + " ticks");
                    console.log(((Date.now() - this.mTimerStarted) / this.ticks) + " ms/tick");
                    console.log("total diff: " + (Date.now() - this.mTimerStarted - this.ticks * 100) + "ms");
                }
                this.changed("done");
            }
            return isDone;
        };
        UpAndDownTimer.prototype.manageTicking = function () {
            var _this = this;
            if (this.tickTimer) {
                this.tickTimer.cancel();
                this.tickTimer = undefined;
            }
            if (this.shouldRunClock()) {
                this.tickTimer = wait(this.getWaitTime());
                this.ticks++;
                if (this.tickDown)
                    this.tickTimer.then(function () { return _this.nextTickDown(); });
                else
                    this.tickTimer.then(function () { return _this.nextTickUp(); });
            }
        };
        UpAndDownTimer.prototype.getWaitTime = function () {
            var timeNow = Date.now();
            var totalMilliseconds = timeNow - this.mTimerStarted;
            var shouldHaveMilliseconds = this.ticks * 100;
            var timeDiff = totalMilliseconds - shouldHaveMilliseconds;
            timeDiff = Math.min(100, Math.max(0, timeDiff));
            return 100 - timeDiff;
        };
        UpAndDownTimer.prototype.nextTickDown = function () {
            this.tickTimer = undefined;
            var seconds = this.mSeconds;
            var minutes = this.mMinutes;
            var tenths = this.mTenths;
            if (--tenths === -1) {
                tenths = 9;
                if (--seconds === -1) {
                    seconds = 59;
                    if (--minutes === -1) {
                        seconds = minutes = tenths = 0;
                    }
                }
                else {
                }
            }
            this.setSeconds(seconds);
            this.setMinutes(minutes);
            this.setTenths(tenths);
            this.notifyDone(false);
            this.manageTicking();
        };
        UpAndDownTimer.prototype.nextTickUp = function () {
            this.tickTimer = undefined;
            var seconds = this.mSeconds;
            var minutes = this.mMinutes;
            var tenths = this.mTenths;
            if (++tenths === 10) {
                tenths = 0;
                if (++seconds === 60) {
                    seconds = 0;
                    ++minutes;
                }
            }
            this.setSeconds(seconds);
            this.setMinutes(minutes);
            this.setTenths(tenths);
            this.notifyDone(false);
            this.manageTicking();
        };
        __decorate([
            (0, Metadata_1.property)("Number of minutes remaining (always 2 digits)"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], UpAndDownTimer.prototype, "minutes", null);
        __decorate([
            (0, Metadata_1.property)("Number of seconds remaining (always 2 digits)"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], UpAndDownTimer.prototype, "seconds", null);
        __decorate([
            (0, Metadata_1.property)("Number of tenths remaining (always 1 digit)"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], UpAndDownTimer.prototype, "tenths", null);
        __decorate([
            (0, Metadata_1.property)("Current time as a string in format m:ss.t"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], UpAndDownTimer.prototype, "time", null);
        __decorate([
            (0, Metadata_1.property)("Number of ticks"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], UpAndDownTimer.prototype, "ticks", null);
        __decorate([
            (0, Metadata_1.property)("True when the timer is at time done"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [])
        ], UpAndDownTimer.prototype, "done", null);
        __decorate([
            (0, Metadata_1.property)("Countdown is running (true) or paused (false)"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], UpAndDownTimer.prototype, "running", null);
        __decorate([
            (0, Metadata_1.callable)("Start countdown from specified time"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], UpAndDownTimer.prototype, "startDown", null);
        __decorate([
            (0, Metadata_1.callable)("Start upcount from specified time"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], UpAndDownTimer.prototype, "startUp", null);
        return UpAndDownTimer;
    }(Script_1.Script));
    exports.UpAndDownTimer = UpAndDownTimer;
    function padTwoDigits(val) {
        var result = val.toString();
        if (result.length < 2)
            result = '0' + result;
        return result;
    }
});
