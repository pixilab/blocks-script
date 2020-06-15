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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Xilica = void 0;
    var Xilica = (function (_super) {
        __extends(Xilica, _super);
        function Xilica(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            socket.autoConnect();
            _this.outputs = [];
            for (var ix = 1; ix <= 4; ++ix)
                _this.outputs.push(new Output(_this, ix));
            _this.keepAliver = new KeepAliver(_this);
            socket.subscribe('textReceived', function (sender, message) { return _this.gotData(message.text); });
            socket.subscribe('connect', function (sender, message) {
                if (message.type === 'Connection') {
                    if (!socket.connected)
                        console.error("Connection dropped unexpectedly");
                }
                else
                    console.error(message.type);
            });
            return _this;
        }
        Xilica.prototype.gotData = function (data) {
            if (data.indexOf('ERROR') === 0)
                console.error(data);
        };
        Xilica.prototype.sendSetCommand = function (target, value) {
            if (this.socket.connected) {
                var cmd = 'SET ' + target + ' ';
                var parType = typeof value;
                switch (parType) {
                    case 'string':
                        cmd += '"' + value + '"';
                        break;
                    case 'boolean':
                        cmd += value ? 'TRUE' : 'FALSE';
                        break;
                    default:
                        cmd += value;
                        break;
                }
                this.socket.sendText(cmd);
            }
        };
        Xilica.prototype.sendText = function (cmd) {
            this.socket.sendText(cmd);
        };
        Object.defineProperty(Xilica.prototype, "gain1", {
            get: function () {
                return this.outputs[0].gain;
            },
            set: function (gain) {
                this.outputs[0].setGain(gain);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Xilica.prototype, "input1", {
            get: function () {
                return this.outputs[0].input;
            },
            set: function (input) {
                this.outputs[0].setInput(input);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Xilica.prototype, "gain2", {
            get: function () {
                return this.outputs[1].gain;
            },
            set: function (gain) {
                this.outputs[1].setGain(gain);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Xilica.prototype, "input2", {
            get: function () {
                return this.outputs[1].input;
            },
            set: function (input) {
                this.outputs[1].setInput(input);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Xilica.prototype, "gain3", {
            get: function () {
                return this.outputs[2].gain;
            },
            set: function (gain) {
                this.outputs[2].setGain(gain);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Xilica.prototype, "input3", {
            get: function () {
                return this.outputs[2].input;
            },
            set: function (input) {
                this.outputs[2].setInput(input);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Xilica.prototype, "gain4", {
            get: function () {
                return this.outputs[3].gain;
            },
            set: function (gain) {
                this.outputs[3].setGain(gain);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Xilica.prototype, "input4", {
            get: function () {
                return this.outputs[3].input;
            },
            set: function (input) {
                this.outputs[3].setInput(input);
            },
            enumerable: false,
            configurable: true
        });
        __decorate([
            Metadata_1.callable("Send a single SET command"),
            __param(0, Metadata_1.parameter("Target function")),
            __param(1, Metadata_1.parameter("Value")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Object]),
            __metadata("design:returntype", void 0)
        ], Xilica.prototype, "sendSetCommand", null);
        __decorate([
            Metadata_1.callable("Send a command"),
            __param(0, Metadata_1.parameter("Command to send")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], Xilica.prototype, "sendText", null);
        __decorate([
            Metadata_1.property("Channel 1 gain"),
            Metadata_1.min(-100),
            Metadata_1.max(15),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], Xilica.prototype, "gain1", null);
        __decorate([
            Metadata_1.property("Channel 1 input"),
            Metadata_1.min(0),
            Metadata_1.max(4),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], Xilica.prototype, "input1", null);
        __decorate([
            Metadata_1.property("Channel 2 gain"),
            Metadata_1.min(-100),
            Metadata_1.max(15),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], Xilica.prototype, "gain2", null);
        __decorate([
            Metadata_1.property("Channel 2 input"),
            Metadata_1.min(0),
            Metadata_1.max(4),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], Xilica.prototype, "input2", null);
        __decorate([
            Metadata_1.property("Channel 3 gain"),
            Metadata_1.min(-100),
            Metadata_1.max(15),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], Xilica.prototype, "gain3", null);
        __decorate([
            Metadata_1.property("Channel 3 input"),
            Metadata_1.min(0),
            Metadata_1.max(4),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], Xilica.prototype, "input3", null);
        __decorate([
            Metadata_1.property("Channel 4 gain"),
            Metadata_1.min(-100),
            Metadata_1.max(15),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], Xilica.prototype, "gain4", null);
        __decorate([
            Metadata_1.property("Channel 4 input"),
            Metadata_1.min(0),
            Metadata_1.max(4),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], Xilica.prototype, "input4", null);
        Xilica = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 10007 }),
            __metadata("design:paramtypes", [Object])
        ], Xilica);
        return Xilica;
    }(Driver_1.Driver));
    exports.Xilica = Xilica;
    var Output = (function () {
        function Output(xilica, channel) {
            this.xilica = xilica;
            this.channel = channel;
            this.input = 0;
            this.gain = -100;
            this.setInput(this.input);
            this.setGain(this.gain);
        }
        Output.prototype.setInput = function (input) {
            this.xilica.sendSetCommand('out' + this.channel, input);
            this.input = input;
        };
        Output.prototype.setGain = function (gain) {
            this.xilica.sendSetCommand('gain' + this.channel, gain);
            this.gain = gain;
        };
        return Output;
    }());
    var KeepAliver = (function () {
        function KeepAliver(xilica) {
            this.xilica = xilica;
            this.saySomethingInAWhile();
        }
        KeepAliver.prototype.saySomethingInAWhile = function () {
            var _this = this;
            wait(9000).then(function () {
                _this.sayNow();
                _this.saySomethingInAWhile();
            });
        };
        KeepAliver.prototype.sayNow = function () {
            var sock = this.xilica.socket;
            if (sock.connected)
                sock.sendText("GET gain1");
        };
        return KeepAliver;
    }());
});
