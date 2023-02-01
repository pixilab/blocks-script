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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CueCoreV2 = void 0;
    var CueCoreV2 = (function (_super) {
        __extends(CueCoreV2, _super);
        function CueCoreV2(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mConnected = false;
            _this.kChannels = 6;
            _this.mLevel1 = 0;
            _this.mLevel2 = 0;
            _this.mLevel3 = 0;
            _this.mLevel4 = 0;
            _this.mLevel5 = 0;
            _this.mLevel6 = 0;
            _this.mRate1 = 0;
            _this.mRate2 = 0;
            _this.mRate3 = 0;
            _this.mRate4 = 0;
            _this.mRate5 = 0;
            _this.mRate6 = 0;
            _this.mMethods = {};
            _this.mObjects = {};
            for (var i = 1; i <= _this.kChannels; i++) {
                _this.mMethods["pb-".concat(i, "-intensity")] = "PB0".concat(i, "Level");
                _this.mObjects["pb-".concat(i, "-intensity")] = "mLevel".concat(i);
                _this.mMethods["pb-".concat(i, "-rate")] = "PB0".concat(i, "Rate");
                _this.mObjects["pb-".concat(i, "-rate")] = "mRate".concat(i);
            }
            socket.subscribe("connect", function (sender, message) {
                _this.connectStateChanged();
            });
            socket.subscribe("bytesReceived", function (sender, msg) {
                return _this.bytesReceived(msg.rawData);
            });
            socket.autoConnect(true);
            _this.mConnected = socket.connected;
            return _this;
        }
        CueCoreV2_1 = CueCoreV2;
        Object.defineProperty(CueCoreV2.prototype, "connected", {
            get: function () {
                return this.mConnected;
            },
            set: function (online) {
                this.mConnected = online;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CueCoreV2.prototype, "PB01Level", {
            get: function () {
                return this.mLevel1;
            },
            set: function (level) {
                this.tell("core-pb-1-intensity=" + level);
                this.mLevel1 = level;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CueCoreV2.prototype, "PB02Level", {
            get: function () {
                return this.mLevel2;
            },
            set: function (level) {
                this.tell("core-pb-2-intensity=" + level);
                this.mLevel2 = level;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CueCoreV2.prototype, "PB03Level", {
            get: function () {
                return this.mLevel3;
            },
            set: function (level) {
                this.tell("core-pb-3-intensity=" + level);
                this.mLevel3 = level;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CueCoreV2.prototype, "PB04Level", {
            get: function () {
                return this.mLevel4;
            },
            set: function (level) {
                this.tell("core-pb-4-intensity=" + level);
                this.mLevel4 = level;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CueCoreV2.prototype, "PB05Level", {
            get: function () {
                return this.mLevel5;
            },
            set: function (level) {
                this.tell("core-pb-5-intensity=" + level);
                this.mLevel5 = level;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CueCoreV2.prototype, "PB06Level", {
            get: function () {
                return this.mLevel6;
            },
            set: function (level) {
                this.tell("core-pb-6-intensity=" + level);
                this.mLevel6 = level;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CueCoreV2.prototype, "PB01Rate", {
            get: function () {
                return this.mRate1;
            },
            set: function (level) {
                this.tell("core-pb-1-rate=" + level);
                this.mRate1 = level;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CueCoreV2.prototype, "PB02Rate", {
            get: function () {
                return this.mRate2;
            },
            set: function (level) {
                this.tell("core-pb-2-rate=" + level);
                this.mRate2 = level;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CueCoreV2.prototype, "PB03Rate", {
            get: function () {
                return this.mRate3;
            },
            set: function (level) {
                this.tell("core-pb-3-rate=" + level);
                this.mRate3 = level;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CueCoreV2.prototype, "PB04Rate", {
            get: function () {
                return this.mRate4;
            },
            set: function (level) {
                this.tell("core-pb-4-rate=" + level);
                this.mRate4 = level;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CueCoreV2.prototype, "PB05Rate", {
            get: function () {
                return this.mRate5;
            },
            set: function (level) {
                this.tell("core-pb-5-rate=" + level);
                this.mRate5 = level;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CueCoreV2.prototype, "PB06Rate", {
            get: function () {
                return this.mRate6;
            },
            set: function (level) {
                this.tell("core-pb-6-rate=" + level);
                this.mRate6 = level;
            },
            enumerable: false,
            configurable: true
        });
        CueCoreV2.prototype.connectStateChanged = function () {
            this.connected = this.socket.connected;
        };
        CueCoreV2.prototype.tell = function (data) {
            this.socket.sendText(data);
        };
        CueCoreV2.prototype.toString = function (bytes) {
            var result = '';
            for (var i = 0; i < bytes.length; ++i) {
                var byte = bytes[i];
                var text = byte.toString(16);
                result += (byte < 16 ? '%0' : '%') + text;
            }
            return decodeURIComponent(result);
        };
        CueCoreV2.prototype.bytesReceived = function (rawData) {
            var text = this.toString(rawData).replace("".concat(CueCoreV2_1.prefix, "-"), '');
            var pieces = CueCoreV2_1.kReplyParser.exec(text);
            if (pieces && pieces.length > 3) {
                var method = this.mMethods[pieces[1]];
                var object = this.mObjects[pieces[1]];
                var value = pieces[2] * 1;
                if (this.mLevel1 !== value) {
                    eval("this.".concat(object, "=").concat(value));
                    this.changed(method);
                }
            }
            else
                console.warn("Unexpected data", text);
        };
        var CueCoreV2_1;
        CueCoreV2.prefix = 'core';
        CueCoreV2.kReplyParser = /(.*)=([+-]?([0-9]*[.])?[0-9]+)/;
        __decorate([
            Meta.property("Connected to CueCore", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], CueCoreV2.prototype, "connected", null);
        __decorate([
            Meta.property("PB01 Level"),
            Meta.min(0),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CueCoreV2.prototype, "PB01Level", null);
        __decorate([
            Meta.property("PB02 Level"),
            Meta.min(0),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CueCoreV2.prototype, "PB02Level", null);
        __decorate([
            Meta.property("PB03 Level"),
            Meta.min(0),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CueCoreV2.prototype, "PB03Level", null);
        __decorate([
            Meta.property("PB04 Level"),
            Meta.min(0),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CueCoreV2.prototype, "PB04Level", null);
        __decorate([
            Meta.property("PB05 Level"),
            Meta.min(0),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CueCoreV2.prototype, "PB05Level", null);
        __decorate([
            Meta.property("PB06 Level"),
            Meta.min(0),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CueCoreV2.prototype, "PB06Level", null);
        __decorate([
            Meta.property("PB01 Rate"),
            Meta.min(-1),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CueCoreV2.prototype, "PB01Rate", null);
        __decorate([
            Meta.property("PB02 Rate"),
            Meta.min(-1),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CueCoreV2.prototype, "PB02Rate", null);
        __decorate([
            Meta.property("PB03 Rate"),
            Meta.min(-1),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CueCoreV2.prototype, "PB03Rate", null);
        __decorate([
            Meta.property("PB04 Rate"),
            Meta.min(-1),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CueCoreV2.prototype, "PB04Rate", null);
        __decorate([
            Meta.property("PB05 Rate"),
            Meta.min(-1),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CueCoreV2.prototype, "PB05Rate", null);
        __decorate([
            Meta.property("PB06 Rate"),
            Meta.min(-1),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CueCoreV2.prototype, "PB06Rate", null);
        CueCoreV2 = CueCoreV2_1 = __decorate([
            Meta.driver("NetworkTCP", { port: 7000 }),
            __metadata("design:paramtypes", [Object])
        ], CueCoreV2);
        return CueCoreV2;
    }(Driver_1.Driver));
    exports.CueCoreV2 = CueCoreV2;
});
