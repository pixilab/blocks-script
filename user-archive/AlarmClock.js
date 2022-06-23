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
define(["require", "exports", "../system_lib/Script", "../system_lib/Metadata"], function (require, exports, Script_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AlarmClock = void 0;
    var AlarmClock = (function (_super) {
        __extends(AlarmClock, _super);
        function AlarmClock(env) {
            var _this = _super.call(this, env) || this;
            _this.mMinute = 0;
            _this.mHour = 0;
            _this.mAlarm = false;
            _this.mTime = 0;
            _this.checkAlarmTime();
            return _this;
        }
        Object.defineProperty(AlarmClock.prototype, "hour", {
            get: function () {
                return this.mHour;
            },
            set: function (value) {
                this.mHour = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AlarmClock.prototype, "minute", {
            get: function () {
                return this.mMinute;
            },
            set: function (value) {
                this.mMinute = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AlarmClock.prototype, "alarm", {
            get: function () {
                return this.mAlarm;
            },
            set: function (value) {
                this.mAlarm = value;
            },
            enumerable: false,
            configurable: true
        });
        AlarmClock.prototype.getTime = function (unused) {
            return this.mTime;
        };
        AlarmClock.prototype.checkAlarmTime = function () {
            var _this = this;
            wait(9000).then(function () {
                var now = new Date();
                var hours = now.getHours();
                var minutes = now.getMinutes();
                var seconds = now.getSeconds();
                _this.mTime = now.getTime();
                _this.alarm = hours === _this.mHour && minutes === _this.mMinute;
                _this.checkAlarmTime();
            });
        };
        __decorate([
            (0, Metadata_1.property)("Alarm time, hours"),
            (0, Metadata_1.min)(0),
            (0, Metadata_1.max)(23),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], AlarmClock.prototype, "hour", null);
        __decorate([
            (0, Metadata_1.property)("Alarm time, minutes"),
            (0, Metadata_1.min)(0),
            (0, Metadata_1.max)(59),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], AlarmClock.prototype, "minute", null);
        __decorate([
            (0, Metadata_1.property)("Alarm ringing", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], AlarmClock.prototype, "alarm", null);
        __decorate([
            (0, Metadata_1.resource)(),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Object]),
            __metadata("design:returntype", void 0)
        ], AlarmClock.prototype, "getTime", null);
        return AlarmClock;
    }(Script_1.Script));
    exports.AlarmClock = AlarmClock;
});
