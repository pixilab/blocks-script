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
    /**
     Manage a PJLink projector, accessed through a provided NetworkTCPDevice connection.
     */
    var PJLink = /** @class */ (function (_super) {
        __extends(PJLink, _super);
        function PJLink(socket) {
            var _this = _super.call(this, socket) || this;
            _this.propList.push(_this._power = new NetworkProjector_1.BoolState('POWR'));
            _this.propList.push(_this._input = new NetworkProjector_1.NumState('INPT', PJLink_1.kMinInput, PJLink_1.kMaxInput));
            _this.poll(); // Get polling going
            _this.attemptConnect(); // Attempt initial connection
            return _this;
        }
        PJLink_1 = PJLink;
        Object.defineProperty(PJLink.prototype, "input", {
            /**
             Get current input, if known, else undefined.
             */
            get: function () {
                return this._input.get();
            },
            /**
             Set desired input source.
             */
            set: function (value) {
                if (this._input.set(value))
                    this.sendCorrection();
            },
            enumerable: true,
            configurable: true
        });
        /**
         Send queries to obtain the initial state of the projector.
         */
        PJLink.prototype.getInitialState = function () {
            var _this = this;
            this.connected = false; // Mark me as not yet fully awake, to hold off commands
            this.request('POWR').then(function (reply) {
                _this._power.updateCurrent((parseInt(reply) & 1) != 0);
                if (_this._power.get())
                    _this.getInputState();
                else {
                    _this.connected = true; // Can't query input if off - skip this step
                    _this.sendCorrection();
                }
            }, function (error) {
                _this.warnMsg("getInitialState POWR error - retry soon", error);
                _this.disconnectAndTryAgainSoon(); // Triggers a new cycle soon
            });
        };
        /**
         Once we know power is on, proceed quering input state.
         */
        PJLink.prototype.getInputState = function () {
            var _this = this;
            this.request('INPT').then(function (reply) {
                _this._input.updateCurrent(parseInt(reply));
                _this.connected = true;
                _this.sendCorrection();
            }, function (error) {
                // May fail for "normal" reasons, eg, during power up/down
                _this.warnMsg("getInitialState INPT error", error);
                _this.connected = true; // Allow things to proceed anyway
                _this.sendCorrection();
            });
        };
        /**
         Send a question or command to the projector, and wait for the response. The
         response is assumed to be the same string as the question, followed by
         "=" and the reply (which will be provided in the resolved promise), or
         ERR followed by an error number, which will cause it to be rejected
         with that error code.
         */
        PJLink.prototype.request = function (question, param) {
            var _this = this;
            var toSend = '%1' + question;
            toSend += ' ';
            toSend += (param === undefined) ? '?' : param;
            this.currCmd = toSend;
            // console.info("request", toSend);
            this.socket.sendText(toSend).catch(function (err) { return _this.sendFailed(err); });
            var result = new Promise(function (resolve, reject) {
                _this.currResolver = resolve;
                _this.currRejector = reject;
            });
            result.finally(function () {
                asap(function () {
                    // console.info("request finally sendCorrection");
                    _this.sendCorrection();
                });
            });
            return result;
        };
        /**
         Got data from peer. Handle initial handshake, as well as command/query response.
         */
        PJLink.prototype.textReceived = function (text) {
            if (text.indexOf('PJLINK ') === 0) {
                if (this.unauthenticated = (text === 'PJLINK 1'))
                    this.errorMsg("PJLink authentication not supported");
                else
                    this.getInitialState(); // Pick up initial state before doing anything else
                return; // Initial handshake all done
            }
            // console.info("textReceived", text);
            var currCmd = this.currCmd.substring(0, 6); // Initial part %1XXXX of command
            if (currCmd) {
                var expectedResponse = currCmd + '=';
                if (text.indexOf(expectedResponse) === 0) {
                    // Reply on expected command/question
                    text = text.substr(expectedResponse.length); // Trailing text
                    var treatAsOk = text.indexOf('ERR') !== 0;
                    if (!treatAsOk) {
                        /*	Some errors are "terminal", meaning there's no reason to
                            attempt the command again. For those, just log them then
                            resolve the promise (albeit with the error string, not
                            "OK". Other errors will cause the promise to be rejected,
                            which will NOT accept the value attempting to be set,
                            hence re-trying it soon again.
                         */
                        switch (text) {
                            case 'ERR1':// Undefined command - no need to re-try
                                this.errorMsg("Undefined command", this.currCmd);
                                treatAsOk = true;
                                break;
                            case 'ERR2':// Parameter not accepted (e.g., non-existing input)
                                this.errorMsg("Bad command parameter", this.currCmd);
                                treatAsOk = true;
                                break;
                            default:
                                this.warnMsg("PJLink response", currCmd, text);
                                break;
                        }
                        if (!treatAsOk && this.currRejector)
                            this.currRejector(text);
                    }
                    /*	Successfull response ('OK' for commands, reply for query),
                        or error deemed as "ok" above since there's nothing we can
                        do about it anyway, and there's no point in rejecting and
                        subsequently re-trying it.
                     */
                    if (treatAsOk) {
                        if (this.currResolver)
                            this.currResolver(text);
                    }
                }
                else
                    this.currRejector("Unexpected reply " + text + ", expected " + currCmd);
            }
            else
                this.warnMsg("Unexpected data", text);
            this.requestFinished();
        };
        PJLink.kMinInput = 11;
        PJLink.kMaxInput = 59;
        __decorate([
            Meta.property("Desired input source number"),
            Meta.min(PJLink_1.kMinInput),
            Meta.max(PJLink_1.kMaxInput),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], PJLink.prototype, "input", null);
        PJLink = PJLink_1 = __decorate([
            Meta.driver('NetworkTCP', { port: 4352 }),
            __metadata("design:paramtypes", [Object])
        ], PJLink);
        return PJLink;
        var PJLink_1;
    }(NetworkProjector_1.NetworkProjector));
    exports.PJLink = PJLink;
});
