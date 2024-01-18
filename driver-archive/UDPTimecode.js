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
define(["require", "exports", "system_lib/Metadata", "system_lib/Driver"], function (require, exports, Metadata_1, Driver_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.UDPTimecode = void 0;
    var UDPTimecode = exports.UDPTimecode = (function (_super) {
        __extends(UDPTimecode, _super);
        function UDPTimecode(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mTime = new TimeFlow(0, 0);
            socket.subscribe('textReceived', function (sender, message) {
                _this.timeData(message.text);
            });
            return _this;
        }
        UDPTimecode_1 = UDPTimecode;
        Object.defineProperty(UDPTimecode.prototype, "time", {
            get: function () {
                return this.mTime;
            },
            enumerable: false,
            configurable: true
        });
        UDPTimecode.prototype.timeData = function (rawTime) {
            rawTime = rawTime.trim();
            var parts = rawTime.trim().split(' ');
            if (parts.length === 2 && parts[0].length === 8) {
                try {
                    var rateStr = parts[1];
                    var rate = parseFloat(rateStr);
                    if (isNaN(rate) || rate < 0 || rate > 2)
                        throw "Invalid rate: " + rateStr;
                    var ms = UDPTimecode_1.timecodeToMillis(parts[0]);
                    var newTime = new TimeFlow(ms, rate);
                    if (newTime.rate !== this.mTime.rate || newTime.position !== this.mTime.position) {
                        this.mTime = newTime;
                        this.changed('time');
                    }
                }
                catch (error) {
                    console.error(error, "for source data", rawTime);
                }
            }
            else
                console.warn("Expected 'HHMMSSFF R', but got", rawTime);
        };
        UDPTimecode.timecodeToMillis = function (tc) {
            var ms = UDPTimecode_1.getTwoDigits(tc, 0) * TimeFlow.Hour +
                UDPTimecode_1.getTwoDigits(tc, 2) * TimeFlow.Minute +
                UDPTimecode_1.getTwoDigits(tc, 4) * TimeFlow.Second +
                UDPTimecode_1.getTwoDigits(tc, 6) * (TimeFlow.Second / UDPTimecode_1.FRAMERATE);
            return ms;
        };
        UDPTimecode.getTwoDigits = function (src, offs) {
            var digits = src.substring(offs, offs + 2);
            var num = parseInt(digits);
            if (isNaN(num) || digits.length !== 2)
                throw "Invalid two digit number: " + digits;
            return num;
        };
        var UDPTimecode_1;
        UDPTimecode.FRAMERATE = 30;
        __decorate([
            (0, Metadata_1.property)("Time received from external system"),
            __metadata("design:type", TimeFlow),
            __metadata("design:paramtypes", [])
        ], UDPTimecode.prototype, "time", null);
        UDPTimecode = UDPTimecode_1 = __decorate([
            (0, Metadata_1.driver)('NetworkUDP', { rcvPort: 9898 }),
            __metadata("design:paramtypes", [Object])
        ], UDPTimecode);
        return UDPTimecode;
    }(Driver_1.Driver));
});
