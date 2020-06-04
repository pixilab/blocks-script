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
define(["require", "exports", "system_lib/Script", "system_lib/Metadata"], function (require, exports, Script_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WallClock = void 0;
    var WallClock = (function (_super) {
        __extends(WallClock, _super);
        function WallClock(env) {
            var _this = _super.call(this, env) || this;
            _this.mClockTime = "0:00";
            _this.updateClock();
            return _this;
        }
        Object.defineProperty(WallClock.prototype, "currentTime", {
            get: function () {
                return this.mClockTime;
            },
            set: function (t) {
                this.mClockTime = t;
            },
            enumerable: false,
            configurable: true
        });
        WallClock.prototype.updateClock = function () {
            var _this = this;
            var time = new Date();
            var hour = time.getHours().toString();
            var min = time.getMinutes();
            this.currentTime = hour + ':' + padTwoDigits(min);
            wait(20 * 1000).then(function () { return _this.updateClock(); });
        };
        __decorate([
            Metadata_1.property("Time of day, as H:MM", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], WallClock.prototype, "currentTime", null);
        return WallClock;
    }(Script_1.Script));
    exports.WallClock = WallClock;
    function padTwoDigits(val) {
        var result = val.toString();
        if (result.length < 2)
            result = '0' + result;
        return result;
    }
});
