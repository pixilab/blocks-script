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
     Manage a Christie ACCESS display, accessed through a provided NetworkTCP connection.
     */
    var ChristieAccess = ChristieAccess_1 = (function (_super) {
        __extends(ChristieAccess, _super);
        function ChristieAccess(socket) {
            var _this = _super.call(this, socket) || this;
            _this._power = new PowerState('SETQUICKSTANDBY', 'power');
            _this.addState(_this._power);
            _this._input = new NetworkProjector_1.NumState('SELECTSOURCE', 'input', ChristieAccess_1.kMinInput, ChristieAccess_1.kMaxInput);
            _this.addState(_this._input);
            _this.poll(); // Get polling going
            _this.attemptConnect(); // Attempt initial connection
            return _this;
        }
        Object.defineProperty(ChristieAccess.prototype, "input", {
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
                if (this._input.set(value))
                    this.sendCorrection();
            },
            enumerable: true,
            configurable: true
        });
        /*
         Override to call getInitialState on connection, as this protocol has
         no initial handshake from projector.
         */
        ChristieAccess.prototype.justConnected = function () {
            _super.prototype.justConnected.call(this);
            this.getInitialState();
        };
        /*
         Send queries to obtain the initial state of the projector.
         */
        ChristieAccess.prototype.getInitialState = function () {
            var _this = this;
            this.connected = false; // Mark me as not yet fully awake, to hold off commands
            this.request('GETQUICKSTANDBY').then(function (reply) {
                console.info("getInitialState GETQUICKSTANDBY", reply);
                if (reply)
                    _this._power.updateCurrent(reply === 'off');
                return _this.request('GETSOURCE');
            }).then(function (reply) {
                console.info("getInitialState GETSOURCE", reply);
                if (reply) {
                    // GETSOURCE returns name, but we want input number
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
        /*
         Send a question or command to the display, and wait for the response.
         */
        ChristieAccess.prototype.request = function (question, param) {
            var _this = this;
            var toSend = question;
            if (param !== undefined)
                toSend += ' ' + param;
            // console.info("request", toSend);
            this.socket.sendText(toSend, this.getDefaultEoln())
                .catch(function (err) {
                return _this.sendFailed(err);
            });
            var result = this.startRequest(question);
            result.finally(function () {
                // Send further corrections soon, with some delay between each as
                // display isn't always happy with commands sent back to back
                wait(600).then(function () {
                    // console.info("request finally sendCorrection");
                    _this.sendCorrection();
                });
            });
            return result;
        };
        ChristieAccess.prototype.getDefaultEoln = function () {
            return '\r\n';
        };
        /*
         Got data from peer. Handle responses to requests.
         */
        ChristieAccess.prototype.textReceived = function (text) {
            if (text) {
                console.info("textReceived", text);
                var parts = ChristieAccess_1.replyParser.exec(text);
                if (parts)
                    this.requestSuccess(parts[1]); // Only "reply" data part
                else
                    console.warn("Unexpected data", text);
                this.requestFinished();
            }
        };
        return ChristieAccess;
    }(NetworkProjector_1.NetworkProjector));
    ChristieAccess.replyParser = /.* (.*)$/; // Extracts word following last space
    ChristieAccess.kMinInput = 5; // Allowable input range
    ChristieAccess.kMaxInput = 20;
    // Maps input name to input number, as query command returns name, but we use number
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
        Meta.min(ChristieAccess_1.kMinInput), Meta.max(ChristieAccess_1.kMaxInput),
        __metadata("design:type", Number),
        __metadata("design:paramtypes", [Number])
    ], ChristieAccess.prototype, "input", null);
    ChristieAccess = ChristieAccess_1 = __decorate([
        Meta.driver('NetworkTCP', { port: 1986 }),
        __metadata("design:paramtypes", [Object])
    ], ChristieAccess);
    exports.ChristieAccess = ChristieAccess;
    /**
     * I use the SETQUICKSTANDBY command to implement power, by setting
     * standby to "on" when power is off, and vice versa.
     */
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
    var ChristieAccess_1;
});
