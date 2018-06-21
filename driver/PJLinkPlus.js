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
define(["require", "exports", "driver/PJLink", "system_lib/Metadata"], function (require, exports, PJLink_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var PJLinkPlus = (function (_super) {
        __extends(PJLinkPlus, _super);
        function PJLinkPlus(socket) {
            return _super.call(this, socket) || this;
        }
        PJLinkPlus.prototype.fetchDeviceInfo = function () {
            var _this = this;
            if (!this.fetchingDeviceInfo) {
                this.fetchingDeviceInfo = new Promise(function (resolve, reject) {
                    _this.fetchDeviceInfoResolver = resolve;
                    wait(30000).then(function () {
                        reject("Timeout");
                        delete _this.fetchDeviceInfo;
                        delete _this.fetchDeviceInfoResolver;
                    });
                });
            }
            this.fetchInfoName();
            return this.fetchingDeviceInfo;
        };
        Object.defineProperty(PJLinkPlus.prototype, "name", {
            get: function () {
                return this._name;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "manufactureName", {
            get: function () {
                return this._manufactureName;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "productName", {
            get: function () {
                return this._productName;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "otherInformation", {
            get: function () {
                return this._otherInformation;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampCount", {
            get: function () {
                return this._lampCount;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampOneHours", {
            get: function () {
                return this._lampOneHours;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampTwoHours", {
            get: function () {
                return this._lampTwoHours;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampThreeHours", {
            get: function () {
                return this._lampThreeHours;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PJLinkPlus.prototype, "lampFourHours", {
            get: function () {
                return this._lampFourHours;
            },
            enumerable: true,
            configurable: true
        });
        PJLinkPlus.prototype.fetchInfoName = function () {
            var _this = this;
            this.request('NAME').then(function (reply) {
                _this._name = reply;
                _this.fetchInfoManufactureName();
            }, function (error) {
                _this.fetchInfoManufactureName();
            });
        };
        PJLinkPlus.prototype.fetchInfoManufactureName = function () {
            var _this = this;
            this.request('INF1').then(function (reply) {
                _this._manufactureName = reply;
                _this.fetchInfoProductName();
            }, function (error) {
                _this.fetchInfoProductName();
            });
        };
        PJLinkPlus.prototype.fetchInfoProductName = function () {
            var _this = this;
            this.request('INF2').then(function (reply) {
                _this._productName = reply;
                _this.fetchInfoOther();
            }, function (error) {
                _this.fetchInfoOther();
            });
        };
        PJLinkPlus.prototype.fetchInfoOther = function () {
            var _this = this;
            this.request('INFO').then(function (reply) {
                _this._otherInformation = reply;
                _this.fetchInfoLamp();
            }, function (error) {
                _this.fetchInfoLamp();
            });
        };
        PJLinkPlus.prototype.fetchInfoLamp = function () {
            var _this = this;
            this.request('LAMP').then(function (reply) {
                var lampData = reply.split(' ');
                _this._lampCount = lampData.length / 2;
                if (_this._lampCount >= 1) {
                    _this._lampOneHours = parseInt(lampData[0]);
                }
                if (_this._lampCount >= 2) {
                    _this._lampTwoHours = parseInt(lampData[2]);
                }
                if (_this._lampCount >= 3) {
                    _this._lampOneHours = parseInt(lampData[4]);
                }
                if (_this._lampCount >= 4) {
                    _this._lampTwoHours = parseInt(lampData[6]);
                }
                _this.fetchInfoResolve();
            }, function (error) {
                _this.fetchInfoResolve();
            });
        };
        PJLinkPlus.prototype.fetchInfoResolve = function () {
            if (this.fetchDeviceInfoResolver) {
                this.fetchDeviceInfoResolver();
                console.info("got device info");
                delete this.fetchingDeviceInfo;
                delete this.fetchDeviceInfoResolver;
            }
        };
        Object.defineProperty(PJLinkPlus.prototype, "customRequestResponse", {
            get: function () {
                return this._customRequestResult;
            },
            enumerable: true,
            configurable: true
        });
        PJLinkPlus.prototype.customRequest = function (question, param) {
            var _this = this;
            var request = this.request(question, param == "" ? undefined : param).then(function (reply) {
                _this._customRequestResult = reply;
            }, function (error) {
                _this._customRequestResult = "request failed: " + error;
            });
            return request;
        };
        __decorate([
            Meta.callable("Refresh device information"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", Promise)
        ], PJLinkPlus.prototype, "fetchDeviceInfo", null);
        __decorate([
            Meta.property("Projector/Display name (NAME)"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "name", null);
        __decorate([
            Meta.property("Manufacture name (INF1)"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "manufactureName", null);
        __decorate([
            Meta.property("Product name (INF2)"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "productName", null);
        __decorate([
            Meta.property("Other information (INFO)"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "otherInformation", null);
        __decorate([
            Meta.property("Lamp count"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampCount", null);
        __decorate([
            Meta.property("Lamp one: lighting hours"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampOneHours", null);
        __decorate([
            Meta.property("Lamp two: lighting hours"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampTwoHours", null);
        __decorate([
            Meta.property("Lamp three: lighting hours"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampThreeHours", null);
        __decorate([
            Meta.property("Lamp four: lighting hours"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "lampFourHours", null);
        __decorate([
            Meta.property("custom request response"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], PJLinkPlus.prototype, "customRequestResponse", null);
        __decorate([
            Meta.callable("Send custom request"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String]),
            __metadata("design:returntype", Promise)
        ], PJLinkPlus.prototype, "customRequest", null);
        PJLinkPlus = __decorate([
            Meta.driver('NetworkTCP', { port: 4352 }),
            __metadata("design:paramtypes", [Object])
        ], PJLinkPlus);
        return PJLinkPlus;
    }(PJLink_1.PJLink));
    exports.PJLinkPlus = PJLinkPlus;
});
