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
define(["require", "exports", "system_lib/Metadata", "driver/NetworkProjector"], function (require, exports, Meta, NetworkProjector_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var BarcoPW392 = BarcoPW392_1 = (function (_super) {
        __extends(BarcoPW392, _super);
        function BarcoPW392(socket) {
            var _this = _super.call(this, socket) || this;
            _this.addState(_this._power = new NetworkProjector_1.BoolState('POWR', 'power'));
            _this.addState(_this._input = new NetworkProjector_1.NumState('IABS', 'input', 0, 25, function () { return _this._power.getCurrent(); }));
            _this.poll();
            _this.attemptConnect();
            return _this;
        }
        BarcoPW392.prototype.justConnected = function () {
            _super.prototype.justConnected.call(this);
            this.getInitialState();
        };
        BarcoPW392.prototype.getInitialState = function () {
            var _this = this;
            this.connected = false;
            this.request('POWR').then(function (reply) {
                _this._power.updateCurrent(!!(parseInt(reply) & 1));
                return _this.request('IABS');
            }).then(function (reply) {
                _this._input.updateCurrent(parseInt(reply));
                _this.connected = true;
                _this.sendCorrection();
            }).catch(function (error) {
                _this.disconnectAndTryAgainSoon();
            });
        };
        BarcoPW392.prototype.request = function (question, param) {
            var _this = this;
            this.currCmd = question;
            var toSend = ':' + question;
            toSend += (param === undefined) ? '?' : param;
            this.socket.sendText(toSend).catch(function (err) { return _this.sendFailed(err); });
            var result = this.startRequest(toSend);
            result.finally(function () {
                asap(function () {
                    _this.sendCorrection();
                });
            });
            return result;
        };
        BarcoPW392.prototype.textReceived = function (text) {
            if (text) {
                var parts = BarcoPW392_1.replyParser.exec(text);
                if (parts && parts[1] === this.currCmd) {
                    if (parts[2]) {
                        console.warn("BarcoPW response", text);
                        this.requestFailure(text);
                    }
                    else
                        this.requestSuccess(parts[3]);
                }
                else
                    console.warn("Unexpected data", text);
                this.requestFinished();
            }
        };
        return BarcoPW392;
    }(NetworkProjector_1.NetworkProjector));
    BarcoPW392.replyParser = /%\d* (\S*) (!?)(\d*)/;
    BarcoPW392 = BarcoPW392_1 = __decorate([
        Meta.driver('NetworkTCP', { port: 1025 }),
        __metadata("design:paramtypes", [Object])
    ], BarcoPW392);
    exports.BarcoPW392 = BarcoPW392;
    var BarcoPW392_1;
});
