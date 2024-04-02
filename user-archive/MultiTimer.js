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
define(["require", "exports", "system_lib/Script", "system_lib/ScriptBase", "system_lib/Metadata"], function (require, exports, Script_1, ScriptBase_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MultiTimer = void 0;
    var MultiTimer = exports.MultiTimer = (function (_super) {
        __extends(MultiTimer, _super);
        function MultiTimer(scriptFacade) {
            var _this = _super.call(this, scriptFacade) || this;
            _this.timer = _this.indexedProperty('timer', Timer);
            return _this;
        }
        MultiTimer.prototype.addTimer = function (countBackwards, startTime) {
            if (typeof startTime === 'string')
                startTime = TimeFlow.stringToMillis(startTime);
            if (countBackwards && (!startTime || startTime <= 0))
                throw "startTime must be > 0 when running countBackwards";
            if (!startTime || startTime < 0)
                startTime = 0;
            this.timer.push(new Timer(countBackwards, startTime));
        };
        MultiTimer.prototype.clear = function () {
            for (var ix = 0; ix < this.timer.length; ++ix)
                this.timer[ix].discard();
            this.timer.remove(0, this.timer.length);
        };
        __decorate([
            (0, Metadata_1.callable)("Append a timer to my list"),
            __param(0, (0, Metadata_1.parameter)("Creates a countdown timer if true.")),
            __param(1, (0, Metadata_1.parameter)("Milliseconds. Must be > 0 for a countdown timer.", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Boolean, Number]),
            __metadata("design:returntype", void 0)
        ], MultiTimer.prototype, "addTimer", null);
        __decorate([
            (0, Metadata_1.callable)("Removes all timers, letting you start over with new addTimer calls"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], MultiTimer.prototype, "clear", null);
        return MultiTimer;
    }(Script_1.Script));
    var Timer = (function (_super) {
        __extends(Timer, _super);
        function Timer(backwards, startTimeMs) {
            if (startTimeMs === void 0) { startTimeMs = 0; }
            var _this = _super.call(this) || this;
            _this.startTimeMs = startTimeMs;
            _this.mRun = false;
            _this.mReset = false;
            _this.runRate = backwards ? -1 : 1;
            _this.mTime = new TimeFlow(startTimeMs, 0);
            return _this;
        }
        Object.defineProperty(Timer.prototype, "countdown", {
            get: function () {
                return this.runRate < 0;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Timer.prototype, "reset", {
            get: function () { return this.mReset; },
            set: function (value) {
                this.run = false;
                this.mReset = value;
                if (value)
                    this.time = new TimeFlow(this.startTimeMs, 0);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Timer.prototype, "time", {
            get: function () { return this.mTime; },
            set: function (value) {
                if (typeof value === 'string')
                    value = new TimeFlow(TimeFlow.stringToMillis(value), 0);
                else if (typeof value === 'number')
                    value = new TimeFlow(value, 0);
                if (!value.rate && this.mRun)
                    this.run = false;
                this.mTime = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Timer.prototype, "run", {
            get: function () { return this.mRun; },
            set: function (doRun) {
                var _this = this;
                if (this.mRun !== doRun) {
                    var currTime = this.mTime.currentTime;
                    if (doRun) {
                        if (this.runRate < 0) {
                            if (currTime <= 0)
                                throw "Timer already at zero";
                            if (this.runRate < 0) {
                                this.cancelStopTimer();
                                this.stopTimer = wait(currTime);
                                this.stopTimer.then(function () {
                                    _this.run = false;
                                    _this.time = new TimeFlow(0, 0);
                                });
                            }
                        }
                    }
                    else
                        this.cancelStopTimer();
                    this.mTime = new TimeFlow(currTime, doRun ? this.runRate : 0);
                    this.changed('time');
                    this.mRun = doRun;
                }
            },
            enumerable: false,
            configurable: true
        });
        Timer.prototype.cancelStopTimer = function () {
            if (this.stopTimer) {
                this.stopTimer.cancel();
                this.stopTimer = undefined;
            }
        };
        Timer.prototype.discard = function () {
            this.cancelStopTimer();
        };
        __decorate([
            (0, Metadata_1.property)("Timer count backwards"),
            __metadata("design:type", Object),
            __metadata("design:paramtypes", [])
        ], Timer.prototype, "countdown", null);
        __decorate([
            (0, Metadata_1.property)("Set momentarily to reset the time to initial value"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], Timer.prototype, "reset", null);
        __decorate([
            (0, Metadata_1.property)("The current time position"),
            __metadata("design:type", TimeFlow),
            __metadata("design:paramtypes", [TimeFlow])
        ], Timer.prototype, "time", null);
        __decorate([
            (0, Metadata_1.property)("Time is runnung (vs paused)"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], Timer.prototype, "run", null);
        return Timer;
    }(ScriptBase_1.AggregateElem));
});
