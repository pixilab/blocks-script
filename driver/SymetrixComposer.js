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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SymetrixComposer = void 0;
    var SymetrixComposer = (function (_super) {
        __extends(SymetrixComposer, _super);
        function SymetrixComposer(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.kValueParseReg = /#(\d+)=(\d+)/;
            _this.kControllerLow = 101;
            _this.kControllerHigh = 110;
            _this.mSettings = {};
            _this.setup();
            socket.subscribe('connect', _this.onConnectChange.bind(_this));
            socket.subscribe('textReceived', _this.onTextReceived.bind(_this));
            socket.autoConnect();
            return _this;
        }
        SymetrixComposer.prototype.setup = function () {
            var _this = this;
            var _loop_1 = function (i) {
                var key = i.toString();
                var getterSetter = function (val) {
                    var settings = _this.mSettings[key];
                    if (val !== undefined) {
                        if (settings.current === undefined && !settings.forceUpdate) {
                            settings.wanted = val;
                        }
                        else if (settings.current !== val) {
                            settings.current = val;
                            settings.wanted = undefined;
                            settings.forceUpdate = false;
                            _this.tell("CSQ " + key + " " + settings.current);
                        }
                    }
                    return settings.current ? settings.current : (settings.wanted ? settings.wanted : 0);
                };
                this_1.mSettings[key] = {
                    wanted: undefined,
                    current: undefined,
                    forceUpdate: false,
                    setGet: getterSetter
                };
                this_1.property(this_1.getPropNameForKey(key), { type: Number }, getterSetter);
            };
            var this_1 = this;
            for (var i = this.kControllerLow; i <= this.kControllerHigh; i++) {
                _loop_1(i);
            }
        };
        SymetrixComposer.prototype.onConnectChange = function (sender, message) {
            if (message.type === 'Connection') {
                if (sender.connected)
                    this.onConnect();
                else
                    this.onDisconnect();
            }
        };
        SymetrixComposer.prototype.onConnect = function () {
            this.mControllerPushTimeout = wait(35000);
            this.mControllerPushTimeout.then(this.onControllerPushTimeout.bind(this));
            this.tell('PUR 101 110');
        };
        SymetrixComposer.prototype.onDisconnect = function () {
            for (var _i = 0, _a = Object.keys(this.mSettings); _i < _a.length; _i++) {
                var key = _a[_i];
                var settings = this.mSettings[key];
                if (settings.current !== undefined) {
                    settings.wanted = settings.current;
                    settings.current = undefined;
                }
            }
        };
        SymetrixComposer.prototype.onTextReceived = function (sender, message) {
            var matches = this.kValueParseReg.exec(message.text);
            if (matches !== null && matches.length === 3) {
                var controllerNum = parseInt(matches[1], 10);
                var controllerValue = parseInt(matches[2], 10);
                var settings = this.mSettings[controllerNum.toString()];
                if (settings) {
                    if (settings.wanted !== undefined) {
                        settings.forceUpdate = true;
                        settings.setGet(settings.wanted);
                        settings.wanted = undefined;
                    }
                    else if (settings.current !== controllerValue) {
                        settings.current = controllerValue;
                        this.changed(this.getPropNameForKey(controllerNum.toString()));
                    }
                }
            }
        };
        SymetrixComposer.prototype.onControllerPushTimeout = function () {
            for (var i = this.kControllerLow; i <= this.kControllerHigh; i++) {
                var key = i.toString();
                var settings = this.mSettings[key];
                if (settings.current === undefined) {
                    if (settings.wanted !== undefined) {
                        settings.forceUpdate = true;
                        settings.setGet(settings.wanted);
                        settings.wanted = undefined;
                    }
                    else {
                        settings.forceUpdate = true;
                    }
                }
            }
        };
        SymetrixComposer.prototype.tell = function (data) {
            this.socket.sendText(data);
        };
        SymetrixComposer.prototype.getPropNameForKey = function (key) {
            return "Controller " + key;
        };
        SymetrixComposer = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 48631 }),
            __metadata("design:paramtypes", [Object])
        ], SymetrixComposer);
        return SymetrixComposer;
    }(Driver_1.Driver));
    exports.SymetrixComposer = SymetrixComposer;
});
