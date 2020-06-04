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
define(["require", "exports", "driver/NetworkProjector", "system_lib/Metadata"], function (require, exports, NetworkProjector_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Christie_GS = void 0;
    var Christie_GS = (function (_super) {
        __extends(Christie_GS, _super);
        function Christie_GS(socket) {
            var _this = _super.call(this, socket) || this;
            _this._power = new NetworkProjector_1.BoolState('PWR', 'power');
            _this.addState(_this._power);
            _this._input = new NetworkProjector_1.NumState('SIN+MAIN', 'input', Christie_GS_1.kMinInput, Christie_GS_1.kMaxInput);
            _this.addState(_this._input);
            socket.setReceiveFraming(")", true);
            _this.poll();
            _this.attemptConnect();
            return _this;
        }
        Christie_GS_1 = Christie_GS;
        Object.defineProperty(Christie_GS.prototype, "input", {
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
        Christie_GS.prototype.justConnected = function () {
            _super.prototype.justConnected.call(this);
            this.connected = false;
            this.pollStatus();
        };
        Christie_GS.prototype.pollStatus = function () {
            var _this = this;
            this.request('PWR?').then(function (reply) {
                var powered = reply == '1';
                _this._power.updateCurrent(powered);
                if (powered)
                    return _this.request('SIN+MAIN?');
                else {
                    _this.connected = true;
                    _this.sendCorrection();
                }
            }).then(function (reply) {
                if (reply !== undefined) {
                    var selInput = parseInt(reply);
                    if (!isNaN(selInput))
                        _this._input.updateCurrent(selInput);
                }
                _this.connected = true;
                _this.sendCorrection();
            }).catch(function (error) {
                _this.disconnectAndTryAgainSoon();
            });
            return true;
        };
        Christie_GS.prototype.request = function (question, param) {
            var _this = this;
            var toSend = question.indexOf('?') < 0 ? '#' + question : question;
            if (param !== undefined)
                toSend += param;
            toSend = '(' + toSend + ')';
            this.socket.sendText(toSend)
                .catch(function (err) {
                return _this.sendFailed(err);
            });
            var result = this.startRequest(question);
            result.finally(function () {
                asap(function () {
                    _this.sendCorrection();
                });
            });
            return result;
        };
        Christie_GS.prototype.textReceived = function (text) {
            if (text) {
                var parts = Christie_GS_1.replyParser.exec(text);
                if (parts)
                    this.requestSuccess(parts[1]);
                else
                    console.warn("Unexpected data", text);
            }
        };
        var Christie_GS_1;
        Christie_GS.replyParser = /\(\D+(\d+)\D/;
        Christie_GS.kMinInput = 1;
        Christie_GS.kMaxInput = 12;
        __decorate([
            Meta.property("Desired input source number"),
            Meta.min(Christie_GS_1.kMinInput),
            Meta.max(Christie_GS_1.kMaxInput),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], Christie_GS.prototype, "input", null);
        Christie_GS = Christie_GS_1 = __decorate([
            Meta.driver('NetworkTCP', { port: 3002 }),
            __metadata("design:paramtypes", [Object])
        ], Christie_GS);
        return Christie_GS;
    }(NetworkProjector_1.NetworkProjector));
    exports.Christie_GS = Christie_GS;
});
