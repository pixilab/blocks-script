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
define(["require", "exports", "driver/NetworkProjector", "system_lib/Metadata"], function (require, exports, NetworkProjector_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /*
     Manage a PJLink projector, accessed through a provided NetworkTCP connection.
     */
    var Christie_GS = Christie_GS_1 = (function (_super) {
        __extends(Christie_GS, _super);
        function Christie_GS(socket) {
            var _this = _super.call(this, socket) || this;
            // console.info("Christie_GS instantiated");
            _this._power = new NetworkProjector_1.BoolState('PWR', 'power');
            _this.addState(_this._power);
            _this._input = new NetworkProjector_1.NumState('SIN+MAIN', 'input', Christie_GS_1.kMinInput, Christie_GS_1.kMaxInput);
            _this.addState(_this._input);
            socket.setReceiveFraming(")", true); // projector sends no newline after reply
            _this.poll(); // Get status polling going
            _this.attemptConnect(); // Attempt initial connection
            return _this;
        }
        Object.defineProperty(Christie_GS.prototype, "input", {
            /*
             Get current input, if known, else undefined.
             */
            get: function () {
                return this._input.get();
            },
            /*
             Set desired input source.
             */
            set: function (value) {
                if (this._input.set(value)) {
                    // console.info("set input", value);
                    this.sendCorrection();
                }
            },
            enumerable: true,
            configurable: true
        });
        /*
         Override to call getInitialState on connection, as this protocol has
         no initial handshake from projector.
         */
        Christie_GS.prototype.justConnected = function () {
            _super.prototype.justConnected.call(this);
            this.connected = false; // Mark me as not yet fully awake, to hold off commands
            this.pollStatus(); // Do initial poll to get us going
        };
        /*
         Send queries to obtain the initial state of the projector.
         Ret true if to continue polling
         */
        Christie_GS.prototype.pollStatus = function () {
            var _this = this;
            this.request('PWR?').then(function (reply) {
                // console.info("pollStatus PWR?", reply);
                var powered = reply == '1';
                _this._power.updateCurrent(powered);
                if (powered)
                    return _this.request('SIN+MAIN?');
                else {
                    _this.connected = true; // Can't get input if off - skip this step
                    _this.sendCorrection();
                }
            }).then(function (reply) {
                // console.info("pollStatus SIN+MAIN?", reply);
                if (reply !== undefined) {
                    var selInput = parseInt(reply);
                    if (!isNaN(selInput))
                        _this._input.updateCurrent(selInput);
                }
                _this.connected = true;
                _this.sendCorrection();
            }).catch(function (error) {
                // console.info("pollStatus error - retrying soon", error);
                _this.disconnectAndTryAgainSoon(); // Triggers a new cycle soon
            });
            return true;
        };
        /*
         Send a question or command to the display, and wait for the response.
         */
        Christie_GS.prototype.request = function (question, param) {
            var _this = this;
            var toSend = question.indexOf('?') < 0 ? '#' + question : question;
            if (param !== undefined)
                toSend += param;
            toSend = '(' + toSend + ')';
            // console.info("request", toSend);
            this.socket.sendText(toSend)
                .catch(function (err) {
                return _this.sendFailed(err);
            });
            var result = this.startRequest(question);
            result.finally(function () {
                // Send further corrections soon
                asap(function () {
                    // console.info("request finally sendCorrection");
                    _this.sendCorrection();
                });
            });
            return result;
        };
        /*
         Got data from peer. Handle responses to requests.
         */
        Christie_GS.prototype.textReceived = function (text) {
            if (text) {
                // console.info("textReceived", text);
                var parts = Christie_GS_1.replyParser.exec(text);
                if (parts)
                    this.requestSuccess(parts[1]); // Only "reply" data part
                else
                    console.warn("Unexpected data", text);
            }
        };
        return Christie_GS;
    }(NetworkProjector_1.NetworkProjector));
    Christie_GS.replyParser = /\(\D+(\d+)\D/; // Extracts digits following command in reply
    Christie_GS.kMinInput = 1; // Allowable input range
    Christie_GS.kMaxInput = 12;
    __decorate([
        Meta.property("Desired input source number"),
        Meta.min(Christie_GS_1.kMinInput), Meta.max(Christie_GS_1.kMaxInput),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], Christie_GS.prototype, "input", null);
    Christie_GS = Christie_GS_1 = __decorate([
        Meta.driver('NetworkTCP', { port: 3002 }),
        __metadata("design:paramtypes", [Object])
    ], Christie_GS);
    exports.Christie_GS = Christie_GS;
    var Christie_GS_1;
});
