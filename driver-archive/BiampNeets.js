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
define(["require", "exports", "../system_lib/Metadata", "../driver/NetworkProjector"], function (require, exports, Meta, NetworkProjector_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BiampNeets = void 0;
    var BiampNeets = exports.BiampNeets = (function (_super) {
        __extends(BiampNeets, _super);
        function BiampNeets(socket) {
            var _this = _super.call(this, socket) || this;
            _this._power = new OnOffState('POWER', 'power');
            _this.addState(_this._power);
            _this._input = new NetworkProjector_1.NumState('INPUT', 'input', BiampNeets_1.kMinInput, BiampNeets_1.kMaxInput);
            _this.addState(_this._input);
            _this._volume = new DbState('VOL', 'volume', BiampNeets_1.kMinVol, BiampNeets_1.kMaxVol);
            _this.addState(_this._volume);
            if (socket.enabled) {
                _this.poll();
                _this.attemptConnect();
            }
            return _this;
        }
        BiampNeets_1 = BiampNeets;
        BiampNeets.prototype.justConnected = function () {
            _super.prototype.justConnected.call(this);
            this.connected = false;
            this.pollStatus();
        };
        Object.defineProperty(BiampNeets.prototype, "input", {
            get: function () {
                return this._input.get();
            },
            set: function (value) {
                if (this._input.set(value)) {
                    this.sendCorrection();
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BiampNeets.prototype, "volume", {
            get: function () {
                return this._volume.get();
            },
            set: function (value) {
                if (this._volume.set(value)) {
                    this.sendCorrection();
                }
            },
            enumerable: false,
            configurable: true
        });
        BiampNeets.prototype.pollStatus = function () {
            var _this = this;
            if (this.okToSendCommand()) {
                this.request('POWER', '?')
                    .then(function (reply) {
                    var powered = reply == 'ON';
                    _this._power.updateCurrent(powered);
                    return _this.request('INPUT', '?');
                }).then(function (reply) {
                    _this._input.updateCurrent(parseInt(reply));
                    return _this.request('VOL', '?');
                }).then(function (reply) {
                    _this._volume.updateCurrent(parseInt(reply));
                }).then(function () {
                    if (!_this.connected) {
                        console.info("Connected (Initial poll complete)");
                        _this.connected = true;
                    }
                    _this.sendCorrection();
                }).catch(function (error) {
                    console.warn("pollStatus error - retrying soon", error);
                    _this.disconnectAndTryAgainSoon();
                });
            }
            return true;
        };
        BiampNeets.prototype.request = function (msg, param) {
            var _this = this;
            var toSend = "NEUNIT=1," + msg + '=' + param;
            this.socket.sendText(toSend)
                .catch(function (err) {
                return _this.sendFailed(err);
            });
            var result = this.startRequest(msg);
            result.finally(function () {
                asap(function () {
                    _this.sendCorrection();
                });
            });
            return result;
        };
        BiampNeets.prototype.textReceived = function (text) {
            if (text) {
                if (text === "NEUNIT=1,OK")
                    this.requestSuccess("");
                else {
                    var parts = BiampNeets_1.kReplyRegex.exec(text);
                    if (parts)
                        this.requestSuccess(parts[2]);
                    else
                        console.warn("Unexpected data", text);
                }
            }
        };
        var BiampNeets_1;
        BiampNeets.kMinInput = 1;
        BiampNeets.kMaxInput = 5;
        BiampNeets.kMinVol = -70;
        BiampNeets.kMaxVol = 12;
        BiampNeets.kReplyRegex = /NEUNIT=1,(.*)=(.*)/;
        __decorate([
            Meta.property("Desired audio input number"),
            Meta.min(BiampNeets_1.kMinInput),
            Meta.max(BiampNeets_1.kMaxInput),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], BiampNeets.prototype, "input", null);
        __decorate([
            Meta.property("Desired output volume"),
            Meta.min(BiampNeets_1.kMinVol),
            Meta.max(BiampNeets_1.kMaxVol),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], BiampNeets.prototype, "volume", null);
        BiampNeets = BiampNeets_1 = __decorate([
            Meta.driver('NetworkTCP', { port: 5000 }),
            __metadata("design:paramtypes", [Object])
        ], BiampNeets);
        return BiampNeets;
    }(NetworkProjector_1.NetworkProjector));
    var DbState = (function (_super) {
        __extends(DbState, _super);
        function DbState() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        DbState.prototype.set = function (v) {
            return _super.prototype.set.call(this, Math.round(v));
        };
        DbState.prototype.correct = function (drvr) {
            var arg = this.wanted.toString();
            if (this.wanted > 0)
                arg = '+' + arg;
            return this.correct2(drvr, arg);
        };
        return DbState;
    }(NetworkProjector_1.NumState));
    var OnOffState = (function (_super) {
        __extends(OnOffState, _super);
        function OnOffState() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        OnOffState.prototype.correct = function (drvr) {
            return this.correct2(drvr, this.wanted ? 'ON' : 'OFF');
        };
        return OnOffState;
    }(NetworkProjector_1.BoolState));
});
