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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CloudDCM1e = void 0;
    var CloudDCM1e = (function (_super) {
        __extends(CloudDCM1e, _super);
        function CloudDCM1e(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.requestQueue = [];
            _this.zones = [];
            for (var zix = 1; zix <= CloudDCM1e_1.kZones; ++zix)
                _this.zones.push(new Zone(_this, zix));
            socket.subscribe('connect', function (sender, message) {
                _this.connectStateChanged(message);
            });
            socket.subscribe('textReceived', function (sender, msg) {
                return _this.textReceived(msg.text);
            });
            socket.setReceiveFraming("/>", true);
            socket.autoConnect();
            console.info("Driver initialized");
            return _this;
        }
        CloudDCM1e_1 = CloudDCM1e;
        CloudDCM1e.prototype.connectStateChanged = function (message) {
            if (message.type === 'Connection') {
                if (this.socket.connected) {
                    for (var _i = 0, _a = this.zones; _i < _a.length; _i++) {
                        var zone = _a[_i];
                        zone.poll();
                    }
                }
                else
                    console.warn("Connection dropped unexpectedly");
            }
        };
        CloudDCM1e.prototype.textReceived = function (text) {
            var req = this.requestQueue[0];
            if (text.indexOf('<!') >= 0)
                console.warn("Error from peer", text);
            if (req)
                req.considerReply(text);
            else
                console.warn("Spurious data", text);
        };
        Object.defineProperty(CloudDCM1e.prototype, "zoneIn1", {
            get: function () {
                return this.zones[0].input;
            },
            set: function (input) {
                this.zones[0].setInput(input);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CloudDCM1e.prototype, "zoneIn2", {
            get: function () {
                return this.zones[1].input;
            },
            set: function (input) {
                this.zones[1].setInput(input);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CloudDCM1e.prototype, "zoneIn3", {
            get: function () {
                return this.zones[2].input;
            },
            set: function (input) {
                this.zones[2].setInput(input);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CloudDCM1e.prototype, "zoneIn4", {
            get: function () {
                return this.zones[3].input;
            },
            set: function (input) {
                this.zones[3].setInput(input);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CloudDCM1e.prototype, "zoneIn5", {
            get: function () {
                return this.zones[4].input;
            },
            set: function (input) {
                this.zones[4].setInput(input);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CloudDCM1e.prototype, "zoneIn6", {
            get: function () {
                return this.zones[5].input;
            },
            set: function (input) {
                this.zones[5].setInput(input);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CloudDCM1e.prototype, "zoneIn7", {
            get: function () {
                return this.zones[6].input;
            },
            set: function (input) {
                this.zones[6].setInput(input);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CloudDCM1e.prototype, "zoneIn8", {
            get: function () {
                return this.zones[7].input;
            },
            set: function (input) {
                this.zones[7].setInput(input);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CloudDCM1e.prototype, "zoneVolume1", {
            get: function () {
                return this.zones[0].volume;
            },
            set: function (volume) {
                this.zones[0].setVolume(volume);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CloudDCM1e.prototype, "zoneVolume2", {
            get: function () {
                return this.zones[1].volume;
            },
            set: function (volume) {
                this.zones[1].setVolume(volume);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CloudDCM1e.prototype, "zoneVolume3", {
            get: function () {
                return this.zones[2].volume;
            },
            set: function (volume) {
                this.zones[2].setVolume(volume);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CloudDCM1e.prototype, "zoneVolume4", {
            get: function () {
                return this.zones[3].volume;
            },
            set: function (volume) {
                this.zones[3].setVolume(volume);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CloudDCM1e.prototype, "zoneVolume5", {
            get: function () {
                return this.zones[4].volume;
            },
            set: function (volume) {
                this.zones[4].setVolume(volume);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CloudDCM1e.prototype, "zoneVolume6", {
            get: function () {
                return this.zones[5].volume;
            },
            set: function (volume) {
                this.zones[5].setVolume(volume);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CloudDCM1e.prototype, "zoneVolume7", {
            get: function () {
                return this.zones[6].volume;
            },
            set: function (volume) {
                this.zones[6].setVolume(volume);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(CloudDCM1e.prototype, "zoneVolume8", {
            get: function () {
                return this.zones[7].volume;
            },
            set: function (volume) {
                this.zones[7].setVolume(volume);
            },
            enumerable: false,
            configurable: true
        });
        CloudDCM1e.prototype.sendRequest = function (request, responsePattern) {
            var req = new Request(request, responsePattern);
            this.requestQueue.push(req);
            if (this.requestQueue.length === 1)
                this.sendNextRequest();
            return req;
        };
        CloudDCM1e.prototype.sendNextRequest = function () {
            var _this = this;
            if (this.keepAliveTimer) {
                this.keepAliveTimer.cancel();
                delete this.keepAliveTimer;
            }
            var req = this.requestQueue[0];
            req.perform(this.socket).finally(function () {
                _this.requestQueue.shift();
                if (_this.requestQueue.length)
                    _this.sendNextRequest();
                else {
                    _this.keepAliveTimer = wait(20000);
                    _this.keepAliveTimer.then(function () {
                        delete _this.keepAliveTimer;
                        _this.sendRequest("<Z" + 1 + ".MU,SQ/>", Zone.kInputPattern);
                    });
                }
            });
        };
        var CloudDCM1e_1;
        CloudDCM1e.kZones = 8;
        __decorate([
            Meta.property("Zone source"),
            Meta.min(1),
            Meta.max(8),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CloudDCM1e.prototype, "zoneIn1", null);
        __decorate([
            Meta.property("Zone source"),
            Meta.min(1),
            Meta.max(8),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CloudDCM1e.prototype, "zoneIn2", null);
        __decorate([
            Meta.property("Zone source"),
            Meta.min(1),
            Meta.max(8),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CloudDCM1e.prototype, "zoneIn3", null);
        __decorate([
            Meta.property("Zone source"),
            Meta.min(1),
            Meta.max(8),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CloudDCM1e.prototype, "zoneIn4", null);
        __decorate([
            Meta.property("Zone source"),
            Meta.min(1),
            Meta.max(8),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CloudDCM1e.prototype, "zoneIn5", null);
        __decorate([
            Meta.property("Zone source"),
            Meta.min(1),
            Meta.min(8),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CloudDCM1e.prototype, "zoneIn6", null);
        __decorate([
            Meta.property("Zone source"),
            Meta.min(1),
            Meta.max(8),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CloudDCM1e.prototype, "zoneIn7", null);
        __decorate([
            Meta.property("Zone source"),
            Meta.min(1),
            Meta.max(8),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CloudDCM1e.prototype, "zoneIn8", null);
        __decorate([
            Meta.property("Zone volume"),
            Meta.min(0),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CloudDCM1e.prototype, "zoneVolume1", null);
        __decorate([
            Meta.property("Zone volume"),
            Meta.min(0),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CloudDCM1e.prototype, "zoneVolume2", null);
        __decorate([
            Meta.property("Zone volume"),
            Meta.min(0),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CloudDCM1e.prototype, "zoneVolume3", null);
        __decorate([
            Meta.property("Zone volume"),
            Meta.min(0),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CloudDCM1e.prototype, "zoneVolume4", null);
        __decorate([
            Meta.property("Zone volume"),
            Meta.min(0),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CloudDCM1e.prototype, "zoneVolume5", null);
        __decorate([
            Meta.property("Zone volume"),
            Meta.min(0),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CloudDCM1e.prototype, "zoneVolume6", null);
        __decorate([
            Meta.property("Zone volume"),
            Meta.min(0),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CloudDCM1e.prototype, "zoneVolume7", null);
        __decorate([
            Meta.property("Zone volume"),
            Meta.min(0),
            Meta.max(1),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], CloudDCM1e.prototype, "zoneVolume8", null);
        CloudDCM1e = CloudDCM1e_1 = __decorate([
            Meta.driver('NetworkTCP', { port: 4999 }),
            __metadata("design:paramtypes", [Object])
        ], CloudDCM1e);
        return CloudDCM1e;
    }(Driver_1.Driver));
    exports.CloudDCM1e = CloudDCM1e;
    var Request = (function () {
        function Request(request, responsePattern) {
            var _this = this;
            this.command = request;
            this.responsePattern = responsePattern;
            this.reply = new Promise(function (resolver, rejector) {
                _this.resolver = resolver;
                _this.rejector = rejector;
            });
        }
        Request.prototype.reviseRequest = function (newToSend) {
            this.command = newToSend;
        };
        Request.prototype.perform = function (socket) {
            var _this = this;
            this.sent = true;
            socket.sendText(this.command, '\r\n');
            this.waiter = wait(500);
            this.waiter.then(function () {
                _this.rejector("Timeout");
                console.warn("Command timed out", _this.command);
            });
            return this.reply;
        };
        Request.prototype.considerReply = function (reply) {
            if (this.waiter)
                this.waiter.cancel();
            delete this.waiter;
            var result = this.responsePattern.exec(reply);
            if (result && result.length > 1)
                this.resolver(result[1]);
            else
                this.rejector("Invalid reply " + reply);
        };
        return Request;
    }());
    var Zone = (function () {
        function Zone(owner, zoneNum) {
            this.owner = owner;
            this.kZone = zoneNum;
        }
        Zone.prototype.setVolume = function (volume) {
            this.volume = volume;
            volume = Math.round((1 - volume) * Zone.kMinVol);
            var request = "<Z" + this.kZone + ".MU,L" + volume + "/>";
            if (this.lastVolRequest && !this.lastVolRequest.sent)
                this.lastVolRequest.reviseRequest(request);
            else
                this.lastVolRequest = this.owner.sendRequest(request, Zone.kVolumePattern);
        };
        Zone.prototype.setInput = function (input) {
            this.input = input;
            this.owner.sendRequest("<Z" + this.kZone + ".MU,S" + input + "/>", Zone.kInputPattern);
        };
        Zone.prototype.poll = function () {
            var _this = this;
            if (this.input === undefined) {
                this.owner.sendRequest("<Z" + this.kZone + ".MU,SQ/>", Zone.kInputPattern)
                    .reply.then(function (result) {
                    var value = parseInt(result);
                    if (value >= 1 && value <= 8 && _this.input === undefined) {
                        _this.input = value;
                        _this.owner.changed("zoneIn" + _this.kZone);
                    }
                });
            }
            if (this.volume === undefined) {
                this.owner.sendRequest("<Z" + this.kZone + ".MU,LQ/>", Zone.kVolumePattern)
                    .reply.then(function (result) {
                    var value = (result === 'mute') ? 62 : parseInt(result);
                    if (value >= 0 && value <= Zone.kMinVol && _this.volume === undefined) {
                        _this.volume = 1 - value / Zone.kMinVol;
                        _this.owner.changed("zoneVolume" + _this.kZone);
                    }
                });
            }
        };
        Zone.kInputPattern = /<z\d\.mu,s=(.*)\/>/;
        Zone.kVolumePattern = /<z\d\.mu,l=(.*)\/>/;
        Zone.kMinVol = 62;
        return Zone;
    }());
});
