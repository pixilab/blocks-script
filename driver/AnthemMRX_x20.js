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
define(["require", "exports", "system_lib/Metadata", "driver/NetworkProjector"], function (require, exports, Metadata_1, NetworkProjector_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var AnthemMRX_x20 = (function (_super) {
        __extends(AnthemMRX_x20, _super);
        function AnthemMRX_x20(socket) {
            var _this = this;
            socket.setReceiveFraming(';');
            _this = _super.call(this, socket) || this;
            _this.addState(_this._power = new NetworkProjector_1.BoolState('Z0POW', 'power'));
            _this.attemptConnect();
            console.log(_this.socket.fullName);
            return _this;
        }
        AnthemMRX_x20.prototype.textReceived = function (text) {
            console.log(text);
        };
        AnthemMRX_x20.prototype.justConnected = function () {
            console.log('connected');
            this.connected = true;
        };
        AnthemMRX_x20.prototype.getDefaultEoln = function () {
            return ';';
        };
        AnthemMRX_x20.prototype.pollStatus = function () {
            var _this = this;
            if (this.okToSendCommand()) {
                this.request('Z0POW').then(function (reply) {
                    var on = (parseInt(reply) & 1) != 0;
                    if (!_this.inCmdHoldoff())
                        _this._power.updateCurrent(on);
                }).catch(function (error) {
                    _this.warnMsg("pollStatus error", error);
                    _this.disconnectAndTryAgainSoon();
                });
            }
            return true;
        };
        AnthemMRX_x20.prototype.request = function (question, param) {
            var _this = this;
            var toSend = question;
            toSend += (param === undefined) ? '?' : param;
            console.info("request", toSend);
            this.socket.sendText(toSend).catch(function (err) { return _this.sendFailed(err); });
            var result = this.startRequest(toSend);
            result.finally(function () {
                asap(function () {
                    _this.sendCorrection();
                });
            });
            return result;
        };
        AnthemMRX_x20.prototype.sendCorrection = function () {
            var _this = this;
            var didSend = _super.prototype.sendCorrection.call(this);
            if (didSend) {
                if (this.recentCmdHoldoff)
                    this.recentCmdHoldoff.cancel();
                this.recentCmdHoldoff = wait(10000);
                this.recentCmdHoldoff.then(function () { return _this.recentCmdHoldoff = undefined; });
            }
            return didSend;
        };
        AnthemMRX_x20.prototype.inCmdHoldoff = function () {
            return this.recentCmdHoldoff;
        };
        AnthemMRX_x20.prototype.projectorBusy = function () {
            var _this = this;
            if (!this.busyHoldoff) {
                this.busyHoldoff = wait(4000);
                this.busyHoldoff.then(function () { return _this.busyHoldoff = undefined; });
            }
        };
        AnthemMRX_x20.prototype.okToSendCommand = function () {
            return !this.busyHoldoff && _super.prototype.okToSendCommand.call(this);
        };
        AnthemMRX_x20 = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 14999 }),
            __metadata("design:paramtypes", [Object])
        ], AnthemMRX_x20);
        return AnthemMRX_x20;
    }(NetworkProjector_1.NetworkProjector));
    exports.AnthemMRX_x20 = AnthemMRX_x20;
});
