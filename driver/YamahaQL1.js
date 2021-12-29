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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata", "system_lib/ScriptBase"], function (require, exports, Driver_1, Metadata_1, ScriptBase_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.YamahaQL1 = void 0;
    var notifyPattern = /^(NOTIFY|OK) (get|set|sscurrent_ex) (\S*) (\d\d?)(?: 0 |)(?:"([^"]*)|(\S*))/;
    var YamahaQL1 = (function (_super) {
        __extends(YamahaQL1, _super);
        function YamahaQL1(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mNumFaders = 32;
            _this.master = _this.indexedProperty("master", Fader);
            _this.fader = _this.indexedProperty("fader", Fader);
            _this.master.push(new Fader(_this, 0, 'MIXER:Current/St'));
            _this.master.push(new Fader(_this, 1, 'MIXER:Current/St'));
            for (var i = 0; i < _this.mNumFaders; ++i)
                _this.fader.push(new Fader(_this, i, 'MIXER:Current/InCh'));
            if (socket.enabled) {
                socket.autoConnect();
                _this.keepAliver = new KeepAliver(_this);
                socket.subscribe('finish', function () { return _this.keepAliver.discard(); });
                socket.subscribe('textReceived', function (sender, message) { return _this.gotData(message.text); });
                socket.subscribe('connect', function (sender, message) {
                    if (message.type === 'Connection') {
                        if (_this.socket.connected) {
                            _this.pollEverything();
                        }
                        else
                            console.warn("Connection dropped unexpectedly");
                    }
                    else
                        console.error(message.type);
                });
            }
            return _this;
        }
        YamahaQL1.prototype.gotData = function (data) {
            var result = data.match(notifyPattern);
            if (result && result.length > 4 && !(result[1] == 'OK' && result[2] == 'set')) {
                if (result[3] == 'MIXER:Current/InCh/Fader/Level') {
                    this.fader[Number(result[4])].mLevel = Number(result[6]) * 0.01;
                    this.fader[Number(result[4])].changed('level');
                }
                else if (result[3] == 'MIXER:Current/InCh/Fader/On') {
                    this.fader[Number(result[4])].mOn = !!Number(result[6]);
                    this.fader[Number(result[4])].changed('on');
                }
                else if (result[3] == 'MIXER:Current/InCh/Label/Name') {
                    this.fader[Number(result[4])].mLabel = result[5];
                    this.fader[Number(result[4])].changed('label');
                }
                else if (result[3] == 'MIXER:Current/St/Fader/Level') {
                    this.master[Number(result[4])].mLevel = Number(result[6]) * 0.01;
                    this.master[Number(result[4])].changed('level');
                }
                else if (result[3] == 'MIXER:Current/St/Fader/On') {
                    this.master[Number(result[4])].mOn = !!Number(result[6]);
                    this.master[Number(result[4])].changed('on');
                }
                else if (result[3] == 'MIXER:Current/St/Label/Name') {
                    this.master[Number(result[4])].mLabel = result[5];
                    this.master[Number(result[4])].changed('label');
                }
                else if (result[3] == 'NOTIFY sscurrent_ex MIXER:Lib/Scene') {
                    this.mScene = Number(result[4]);
                    this.changed('current_scene');
                }
            }
        };
        YamahaQL1.prototype.sendText = function (cmd) {
            this.socket.sendText(cmd);
        };
        Object.defineProperty(YamahaQL1.prototype, "current_scene", {
            get: function () {
                return this.mScene;
            },
            set: function (val) {
                this.mScene = val;
                this.sendText("ssrecall_ex MIXER:Lib/Scene " + val);
            },
            enumerable: false,
            configurable: true
        });
        YamahaQL1.prototype.pollEverything = function () {
            this.sendText('sscurrent_ex MIXER:Lib/Scene');
            this.sendText('get MIXER:Current/St/Fader/Level 0 0');
            this.sendText('get MIXER:Current/St/Fader/On 0 0');
            this.sendText('get MIXER:Current/St/Label/Name 0 0');
            for (var i = 0; i < this.mNumFaders; ++i) {
                this.sendText('get MIXER:Current/InCh/Fader/Level ' + i + ' 0');
                this.sendText('get MIXER:Current/InCh/Fader/On ' + i + ' 0');
                this.sendText('get MIXER:Current/InCh/Label/Name ' + i + ' 0');
            }
        };
        __decorate([
            Metadata_1.callable("Send a command"),
            __param(0, Metadata_1.parameter("Command to send")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], YamahaQL1.prototype, "sendText", null);
        __decorate([
            Metadata_1.property("Current scene number"),
            Metadata_1.min(0),
            Metadata_1.max(300),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], YamahaQL1.prototype, "current_scene", null);
        YamahaQL1 = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 49280 }),
            __metadata("design:paramtypes", [Object])
        ], YamahaQL1);
        return YamahaQL1;
    }(Driver_1.Driver));
    exports.YamahaQL1 = YamahaQL1;
    var KeepAliver = (function () {
        function KeepAliver(YamahaQL1) {
            this.YamahaQL1 = YamahaQL1;
            this.saySomethingInAWhile();
        }
        KeepAliver.prototype.discard = function () {
            if (this.pending) {
                this.pending.cancel();
                this.pending = undefined;
            }
        };
        KeepAliver.prototype.saySomethingInAWhile = function () {
            var _this = this;
            this.pending = wait(20000);
            this.pending.then(function () {
                _this.sayNow();
                _this.saySomethingInAWhile();
            });
        };
        KeepAliver.prototype.sayNow = function () {
            var sock = this.YamahaQL1.socket;
            if (sock.connected)
                sock.sendText("devinfo devicename");
        };
        return KeepAliver;
    }());
    var Fader = (function (_super) {
        __extends(Fader, _super);
        function Fader(owner, id, mCommandPath) {
            var _this = _super.call(this) || this;
            _this.owner = owner;
            _this.mCommandPath = mCommandPath;
            _this.mLabel = '';
            _this.mLevel = 0;
            _this.mOn = false;
            _this.mId = id;
            return _this;
        }
        Object.defineProperty(Fader.prototype, "label", {
            get: function () {
                return this.mLabel;
            },
            set: function (value) {
                if (value !== undefined) {
                    this.owner.sendText('set ' + this.mCommandPath + '/Label/Name ' + this.mId + ' 0 "' + value + '"');
                    this.mLabel = value;
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Fader.prototype, "level", {
            get: function () {
                return this.mLevel;
            },
            set: function (value) {
                if (value <= -60)
                    value = -327.68;
                this.owner.sendText('set ' + this.mCommandPath + '/Fader/Level ' + this.mId + ' 0 ' + Math.round(value * 100));
                this.mLevel = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Fader.prototype, "on", {
            get: function () {
                return this.mOn;
            },
            set: function (value) {
                if (value !== undefined) {
                    this.owner.sendText('set ' + this.mCommandPath + '/Fader/On ' + this.mId + ' 0 ' + (value ? 1 : 0));
                    this.mOn = value;
                }
            },
            enumerable: false,
            configurable: true
        });
        __decorate([
            Metadata_1.property("Label"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], Fader.prototype, "label", null);
        __decorate([
            Metadata_1.property("Fader level in dB"),
            Metadata_1.min(-327.68),
            Metadata_1.max(10),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], Fader.prototype, "level", null);
        __decorate([
            Metadata_1.property("On"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], Fader.prototype, "on", null);
        return Fader;
    }(ScriptBase_1.AggregateElem));
});
