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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WOCustomDrvr = void 0;
    var WOCustomDrvr = (function (_super) {
        __extends(WOCustomDrvr, _super);
        function WOCustomDrvr(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.pendingQueries = {};
            _this.mAsFeedback = false;
            _this.mConnected = false;
            _this.mPlaying = false;
            _this.mStandBy = false;
            _this.mLevel = 0;
            _this.mLayerCond = 0;
            socket.subscribe('connect', function (sender, message) {
                _this.connectStateChanged();
            });
            socket.subscribe('textReceived', function (sender, msg) {
                return _this.textReceived(msg.text);
            });
            socket.autoConnect();
            _this.mConnected = socket.connected;
            if (_this.mConnected)
                _this.getInitialStatus();
            return _this;
        }
        WOCustomDrvr_1 = WOCustomDrvr;
        Object.defineProperty(WOCustomDrvr.prototype, "connected", {
            get: function () {
                return this.mConnected;
            },
            set: function (online) {
                this.mConnected = online;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(WOCustomDrvr.prototype, "layerCond", {
            get: function () {
                return this.mLayerCond;
            },
            set: function (cond) {
                if (this.mLayerCond !== cond) {
                    this.mLayerCond = cond;
                    this.tell("enableLayerCond " + cond);
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(WOCustomDrvr.prototype, "playing", {
            get: function () {
                return this.mPlaying;
            },
            set: function (play) {
                if (!this.mAsFeedback)
                    this.tell(play ? "run" : "halt");
                this.mPlaying = play;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(WOCustomDrvr.prototype, "standBy", {
            get: function () {
                return this.mStandBy;
            },
            set: function (stby) {
                if (!this.mAsFeedback)
                    this.tell(stby ? "standBy true 1000" : "standBy false 1000");
                this.mStandBy = stby;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(WOCustomDrvr.prototype, "input", {
            get: function () {
                return this.mLevel;
            },
            set: function (level) {
                this.tell("setInput In1 " + level);
                this.mLevel = level;
            },
            enumerable: false,
            configurable: true
        });
        WOCustomDrvr.prototype.playAuxTimeline = function (name, start) {
            this.tell((start ? "run \"" : "kill \"") + name + '""');
        };
        WOCustomDrvr.prototype.connectStateChanged = function () {
            this.connected = this.socket.connected;
            if (this.socket.connected)
                this.getInitialStatus();
            else
                this.discardAllQueries();
        };
        WOCustomDrvr.prototype.getInitialStatus = function () {
            var _this = this;
            this.ask('getStatus').then(function (reply) {
                _this.mAsFeedback = true;
                var pieces = reply.split(' ');
                if (pieces[4] === 'true') {
                    _this.playing = (pieces[7] === 'true');
                    _this.standBy = (pieces[9] === 'true');
                }
                _this.mAsFeedback = false;
            });
        };
        WOCustomDrvr.prototype.tell = function (data) {
            this.socket.sendText(data);
        };
        WOCustomDrvr.prototype.textReceived = function (text) {
            var pieces = WOCustomDrvr_1.kReplyParser.exec(text);
            if (pieces && pieces.length > 3) {
                var id = pieces[1];
                var what = pieces[2];
                var query = this.pendingQueries[id];
                if (query) {
                    delete this.pendingQueries[id];
                    query.handleResult(what, pieces[3]);
                }
                else
                    console.warn("Unexpected reply", text);
            }
            else
                console.warn("Spurious data", text);
        };
        WOCustomDrvr.prototype.ask = function (question) {
            if (this.socket.connected) {
                var query = new Query(question);
                this.pendingQueries[query.id] = query;
                this.socket.sendText(query.fullCmd);
                return query.promise;
            }
            else
                console.error("Can't ask. Not connected");
        };
        WOCustomDrvr.prototype.discardAllQueries = function () {
            for (var queryId in this.pendingQueries) {
                this.pendingQueries[queryId].fail("Discarded");
            }
            this.pendingQueries = {};
        };
        var WOCustomDrvr_1;
        WOCustomDrvr.kReplyParser = /\[([^\]]+)\](\w*)[\s]?(.*)/;
        __decorate([
            Meta.property("Connected to WATCHOUT", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], WOCustomDrvr.prototype, "connected", null);
        __decorate([
            Meta.property("Layer condition flags"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], WOCustomDrvr.prototype, "layerCond", null);
        __decorate([
            Meta.property("Main timeline playing"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], WOCustomDrvr.prototype, "playing", null);
        __decorate([
            Meta.property("Standby mode"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], WOCustomDrvr.prototype, "standBy", null);
        __decorate([
            Meta.property("Generic input level"),
            Meta.min(0),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], WOCustomDrvr.prototype, "input", null);
        __decorate([
            Meta.callable("Play or stop any auxiliary timeline"),
            __param(0, Meta.parameter("Name of aux timeline to control")),
            __param(1, Meta.parameter("Whether to start the timeline")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Boolean]),
            __metadata("design:returntype", void 0)
        ], WOCustomDrvr.prototype, "playAuxTimeline", null);
        WOCustomDrvr = WOCustomDrvr_1 = __decorate([
            Meta.driver('NetworkTCP', { port: 3040 }),
            __metadata("design:paramtypes", [Object])
        ], WOCustomDrvr);
        return WOCustomDrvr;
    }(Driver_1.Driver));
    exports.WOCustomDrvr = WOCustomDrvr;
    var Query = (function () {
        function Query(cmd) {
            var _this = this;
            this.mPromise = new Promise(function (resolve, reject) {
                _this.resolver = resolve;
                _this.rejector = reject;
            });
            var id = ++Query.prevId;
            this.mId = id;
            this.mFullCmd = '[' + id + ']' + cmd;
        }
        Object.defineProperty(Query.prototype, "id", {
            get: function () { return this.mId; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Query.prototype, "fullCmd", {
            get: function () { return this.mFullCmd; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Query.prototype, "promise", {
            get: function () { return this.mPromise; },
            enumerable: false,
            configurable: true
        });
        Query.prototype.handleResult = function (what, remainder) {
            if (what === 'Reply')
                this.resolver(remainder);
            else
                this.fail(remainder);
        };
        Query.prototype.fail = function (error) {
            this.rejector(error);
        };
        Query.prevId = 0;
        return Query;
    }());
});
