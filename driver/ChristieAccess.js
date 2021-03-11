var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
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
    exports.PowerState = exports.ChristieAccess = void 0;
    var ChristieAccess = (function (_super) {
        __extends(ChristieAccess, _super);
        function ChristieAccess(socket) {
            var _this = _super.call(this, socket) || this;
            _this._power = new PowerState('SETQUICKSTANDBY', 'power');
            _this.addState(_this._power);
            _this._input = new NetworkProjector_1.NumState('SELECTSOURCE', 'input', ChristieAccess_1.kMinInput, ChristieAccess_1.kMaxInput);
            _this.addState(_this._input);
            _this.poll();
            _this.attemptConnect();
            return _this;
        }
        ChristieAccess_1 = ChristieAccess;
        Object.defineProperty(ChristieAccess.prototype, "input", {
            get: function () {
                return this._input.get();
            },
            set: function (value) {
                if (this._input.set(value))
                    this.sendCorrection();
            },
            enumerable: false,
            configurable: true
        });
        ChristieAccess.prototype.justConnected = function () {
            _super.prototype.justConnected.call(this);
            this.getInitialState();
        };
        ChristieAccess.prototype.getInitialState = function () {
            var _this = this;
            this.connected = false;
            this.request('GETQUICKSTANDBY').then(function (reply) {
                console.info("getInitialState GETQUICKSTANDBY", reply);
                if (reply)
                    _this._power.updateCurrent(reply === 'off');
                return _this.request('GETSOURCE');
            }).then(function (reply) {
                console.info("getInitialState GETSOURCE", reply);
                if (reply) {
                    var inputNum = ChristieAccess_1.kInputNameToNum[reply];
                    if (inputNum)
                        _this._input.updateCurrent(inputNum);
                }
                _this.connected = true;
                _this.sendCorrection();
            }).catch(function (error) {
                console.info("getInitialState error - retry soon", error);
                _this.disconnectAndTryAgainSoon();
            });
        };
        ChristieAccess.prototype.request = function (question, param) {
            var _this = this;
            var toSend = question;
            if (param !== undefined)
                toSend += ' ' + param;
            this.socket.sendText(toSend, this.getDefaultEoln())
                .catch(function (err) {
                return _this.sendFailed(err);
            });
            var result = this.startRequest(question);
            result.finally(function () {
                wait(600).then(function () {
                    _this.sendCorrection();
                });
            });
            return result;
        };
        ChristieAccess.prototype.getDefaultEoln = function () {
            return '\r\n';
        };
        ChristieAccess.prototype.textReceived = function (text) {
            if (text) {
                console.info("textReceived", text);
                var parts = ChristieAccess_1.replyParser.exec(text);
                if (parts)
                    this.requestSuccess(parts[1]);
                else
                    this.warnMsg("Unexpected data", text);
                this.requestFinished();
            }
        };
        var ChristieAccess_1;
        ChristieAccess.replyParser = /.* (.*)$/;
        ChristieAccess.kMinInput = 5;
        ChristieAccess.kMaxInput = 20;
        ChristieAccess.kInputNameToNum = {
            "FAV": 5,
            "HDMI1": 7,
            "HDMI2": 8,
            "YPbPr": 11,
            "VGA": 12,
            "DVI": 18,
            "DP": 19,
            "OPS": 20
        };
        __decorate([
            Meta.property("Desired input source number"),
            Meta.min(ChristieAccess_1.kMinInput),
            Meta.max(ChristieAccess_1.kMaxInput),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], ChristieAccess.prototype, "input", null);
        ChristieAccess = ChristieAccess_1 = __decorate([
            Meta.driver('NetworkTCP', { port: 1986 }),
            __metadata("design:paramtypes", [Object])
        ], ChristieAccess);
        return ChristieAccess;
    }(NetworkProjector_1.NetworkProjector));
    exports.ChristieAccess = ChristieAccess;
    var PowerState = (function (_super) {
        __extends(PowerState, _super);
        function PowerState() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        PowerState.prototype.correct = function (drvr) {
            return this.correct2(drvr, this.wanted ? 'off' : 'on');
        };
        return PowerState;
    }(NetworkProjector_1.State));
    exports.PowerState = PowerState;
});
