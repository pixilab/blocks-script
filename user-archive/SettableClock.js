var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
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
define(["require", "exports", "system_lib/Script", "system/SimpleFile", "system_lib/Metadata"], function (require, exports, Script_1, SimpleFile_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SettableClock = void 0;
    var SettableClock = (function (_super) {
        __extends(SettableClock, _super);
        function SettableClock(env) {
            var _this = _super.call(this, env) || this;
            _this.mOn = false;
            _this.kFileName = "SettableClock";
            _this.settings = {
                start: { hour: 8, minute: 0 },
                end: { hour: 18, minute: 0 }
            };
            SimpleFile_1.SimpleFile.read(_this.kFileName).then(function (data) {
                var old = _this.settings;
                var curr = _this.settings = JSON.parse(data);
                if (old.start.hour !== curr.start.hour)
                    _this.changed('startHour');
                if (old.start.minute !== curr.start.minute)
                    _this.changed('startMinute');
                if (old.end.hour !== curr.end.hour)
                    _this.changed('endHour');
                if (old.end.minute !== curr.end.minute)
                    _this.changed('endMinute');
                _this.checkStateNow();
            }).finally(function () { return _this.checkState(); });
            return _this;
        }
        Object.defineProperty(SettableClock.prototype, "on", {
            get: function () {
                return this.mOn;
            },
            set: function (value) {
                this.mOn = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SettableClock.prototype, "startHour", {
            get: function () {
                return this.settings.start.hour || 0;
            },
            set: function (value) {
                if (this.settings.start.hour !== value)
                    this.persistVars();
                this.settings.start.hour = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SettableClock.prototype, "startMinute", {
            get: function () {
                return this.settings.start.minute || 0;
            },
            set: function (value) {
                if (this.settings.start.minute !== value)
                    this.persistVars();
                this.settings.start.minute = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SettableClock.prototype, "endHour", {
            get: function () {
                return this.settings.end.hour || 0;
            },
            set: function (value) {
                if (this.settings.end.hour !== value)
                    this.persistVars();
                this.settings.end.hour = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SettableClock.prototype, "endMinute", {
            get: function () {
                return this.settings.end.minute || 0;
            },
            set: function (value) {
                if (this.settings.end.minute !== value)
                    this.persistVars();
                this.settings.end.minute = value;
            },
            enumerable: false,
            configurable: true
        });
        SettableClock.hmToSeconds = function (hm) {
            return hm.hour * 60 * 60 + hm.minute * 60;
        };
        SettableClock.prototype.checkState = function () {
            var _this = this;
            if (this.mStateChecker)
                return;
            this.mStateChecker = wait(60 * 1000);
            this.mStateChecker.then(function () {
                _this.mStateChecker = undefined;
                if (!_this.mPersistor) {
                    if (!_this.checkStateNow())
                        return;
                }
                _this.checkState();
            });
        };
        SettableClock.prototype.checkStateNow = function () {
            var secStart = SettableClock.hmToSeconds(this.settings.start);
            var secEnd = SettableClock.hmToSeconds(this.settings.end);
            if (secEnd <= secStart) {
                console.error("End time must be greater than start time");
                return false;
            }
            var now = new Date();
            var hmNow = { hour: now.getHours(), minute: now.getMinutes() };
            var secNow = SettableClock.hmToSeconds(hmNow);
            this.on = secNow >= secStart && secNow < secEnd;
            return true;
        };
        SettableClock.prototype.persistVars = function () {
            var _this = this;
            if (this.mPersistor)
                this.mPersistor.cancel();
            this.mPersistor = wait(2000);
            this.mPersistor.then(function () {
                _this.mPersistor = undefined;
                SimpleFile_1.SimpleFile.write(_this.kFileName, JSON.stringify(_this.settings));
                _this.checkState();
            });
        };
        __decorate([
            Metadata_1.property("ON state", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], SettableClock.prototype, "on", null);
        __decorate([
            Metadata_1.property("Start hour"),
            Metadata_1.min(0),
            Metadata_1.max(23),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], SettableClock.prototype, "startHour", null);
        __decorate([
            Metadata_1.property("Start minute"),
            Metadata_1.min(0),
            Metadata_1.max(59),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], SettableClock.prototype, "startMinute", null);
        __decorate([
            Metadata_1.property("End hour"),
            Metadata_1.min(0),
            Metadata_1.max(23),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], SettableClock.prototype, "endHour", null);
        __decorate([
            Metadata_1.property("End minute"),
            Metadata_1.min(0),
            Metadata_1.max(59),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], SettableClock.prototype, "endMinute", null);
        return SettableClock;
    }(Script_1.Script));
    exports.SettableClock = SettableClock;
});
