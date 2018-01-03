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
    var BarcoPW392 = /** @class */ (function (_super) {
        __extends(BarcoPW392, _super);
        function BarcoPW392(socket) {
            var _this = _super.call(this, socket) || this;
            _this.propList.push(_this._power = new NetworkProjector_1.BoolState('POWR'));
            _this.propList.push(_this._input = new NetworkProjector_1.NumState('IABS', 0, BarcoPW392_1.kMaxInput));
            _this.poll(); // Get polling going
            _this.attemptConnect(); // Attempt initial connection
            return _this;
        }
        BarcoPW392_1 = BarcoPW392;
        Object.defineProperty(BarcoPW392.prototype, "input", {
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
        BarcoPW392.prototype.justConnected = function () {
            _super.prototype.justConnected.call(this);
            this.getInitialState();
        };
        /*
         Send queries to obtain the initial state of the projector.
         */
        BarcoPW392.prototype.getInitialState = function () {
            var _this = this;
            this.connected = false; // Mark me as not yet fully awake, to hold off commands
            this.request('POWR').then(function (reply) {
                _this._power.updateCurrent((parseInt(reply) & 1) != 0);
                // console.info("getInitialState POWR", this.power.current);
                return _this.request('IABS');
            }).then(function (reply) {
                _this._input.updateCurrent(parseInt(reply));
                _this.connected = true;
                // console.info("getInitialState INPT", this.input.current);
                _this.sendCorrection();
            }).catch(function (error) {
                // console.info("getInitialState error - retry soon", error);
                _this.disconnectAndTryAgainSoon(); // Triggers a new cycle soon
            });
        };
        /*
         Send a question or command to the projector, and wait for the response. The
         response is assumed to be
    
            %nnn question rrr
    
         where nnn is the "address"
         If success: rrr is the reply
         If error: rrr is an error code, beginning with a '!'char
         */
        BarcoPW392.prototype.request = function (question, param) {
            var _this = this;
            this.currCmd = question;
            var toSend = ':' + question;
            toSend += (param === undefined) ? '?' : param;
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
        /*
         Got data from peer. Handle responses to requests.
         */
        BarcoPW392.prototype.textReceived = function (text) {
            if (text) {
                // console.info("textReceived", text);
                var parts = BarcoPW392_1.replyParser.exec(text);
                if (parts && parts[1] === this.currCmd) {
                    if (parts[2]) {
                        console.warn("BarcoPW response", text);
                        if (this.currRejector)
                            this.currRejector(text); // Entire error reply
                    }
                    else if (this.currResolver)
                        this.currResolver(parts[3]); // Only "reply" data part
                }
                else
                    console.warn("Unexpected data", text);
                this.requestFinished();
            }
        };
        BarcoPW392.replyParser = /\%\d* (\S*) (\!?)(\d*)/;
        BarcoPW392.kMaxInput = 25;
        __decorate([
            Meta.property("Desired input source number"),
            Meta.min(0), Meta.max(BarcoPW392_1.kMaxInput),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], BarcoPW392.prototype, "input", null);
        BarcoPW392 = BarcoPW392_1 = __decorate([
            Meta.driver('NetworkTCP', { port: 1025 }),
            __metadata("design:paramtypes", [Object])
        ], BarcoPW392);
        return BarcoPW392;
        var BarcoPW392_1;
    }(NetworkProjector_1.NetworkProjector));
    exports.BarcoPW392 = BarcoPW392;
});
