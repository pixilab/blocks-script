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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WOCustomUdpDrvr = void 0;
    var WOCustomUdpDrvr = (function (_super) {
        __extends(WOCustomUdpDrvr, _super);
        function WOCustomUdpDrvr(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mPlaying = false;
            _this.mStandBy = false;
            _this.mLevel = 0;
            return _this;
        }
        Object.defineProperty(WOCustomUdpDrvr.prototype, "layerCond", {
            get: function () {
                return this.mLayerCond || 0;
            },
            set: function (cond) {
                cond = Math.round(cond);
                if (this.mLayerCond !== cond) {
                    this.mLayerCond = cond;
                    this.tell("enableLayerCond " + cond);
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(WOCustomUdpDrvr.prototype, "playing", {
            get: function () {
                return this.mPlaying;
            },
            set: function (play) {
                this.tell(play ? "run" : "halt");
                this.mPlaying = play;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(WOCustomUdpDrvr.prototype, "standBy", {
            get: function () {
                return this.mStandBy;
            },
            set: function (stby) {
                this.tell(stby ? "standBy true 1000" : "standBy false 1000");
                this.mStandBy = stby;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(WOCustomUdpDrvr.prototype, "input", {
            get: function () {
                return this.mLevel;
            },
            set: function (level) {
                var cmd = 'setInput "In1" ' + level;
                console.log("setInput cmd", cmd);
                this.tell(cmd);
                this.mLevel = level;
            },
            enumerable: false,
            configurable: true
        });
        WOCustomUdpDrvr.prototype.playAuxTimeline = function (name, start) {
            this.tell((start ? "run \"" : "kill \"") + name + '""');
        };
        WOCustomUdpDrvr.prototype.tell = function (data) {
            this.socket.sendText(data + '\r');
        };
        __decorate([
            Meta.property("Layer condition flags"),
            Meta.min(0),
            Meta.max(65535),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], WOCustomUdpDrvr.prototype, "layerCond", null);
        __decorate([
            Meta.property("Main timeline playing"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], WOCustomUdpDrvr.prototype, "playing", null);
        __decorate([
            Meta.property("Standby mode"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], WOCustomUdpDrvr.prototype, "standBy", null);
        __decorate([
            Meta.property("Generic input level"),
            Meta.min(0),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], WOCustomUdpDrvr.prototype, "input", null);
        __decorate([
            Meta.callable("Play or stop any auxiliary timeline"),
            __param(0, Meta.parameter("Name of aux timeline to control")),
            __param(1, Meta.parameter("Whether to start the timeline")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Boolean]),
            __metadata("design:returntype", void 0)
        ], WOCustomUdpDrvr.prototype, "playAuxTimeline", null);
        WOCustomUdpDrvr = __decorate([
            Meta.driver('NetworkUDP', { port: 3040 }),
            __metadata("design:paramtypes", [Object])
        ], WOCustomUdpDrvr);
        return WOCustomUdpDrvr;
    }(Driver_1.Driver));
    exports.WOCustomUdpDrvr = WOCustomUdpDrvr;
});
