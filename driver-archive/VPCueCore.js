var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
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
    exports.VPCueCore = void 0;
    var VPCueCore = exports.VPCueCore = (function (_super) {
        __extends(VPCueCore, _super);
        function VPCueCore(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mConnected = false;
            _this.prefix = 'core-';
            _this.responseParseRegex = /(.*)=([+-]?(\d*[.])?\d+)/i;
            _this.keyToNameParseRegex = /(\w*-?)pb-(\d+)-([a-z]+)/i;
            _this.numPlaybacks = 16;
            _this.minIntensity = 0.00;
            _this.maxIntensity = 1.00;
            _this.minRate = 0.00;
            _this.maxRate = 1.00;
            _this.jumpSources = 32;
            _this.mSettings = {};
            _this.setup();
            socket.subscribe("connect", function (sender, message) {
                _this.connectStateChanged();
            });
            socket.subscribe("bytesReceived", function (sender, msg) {
                return _this.bytesReceived(msg.rawData);
            });
            socket.autoConnect(true);
            _this.mConnected = socket.connected;
            return _this;
        }
        VPCueCore.prototype.pad = function (num, size) {
            var n = num.toString();
            while (n.length < size)
                n = "0" + n;
            return n;
        };
        VPCueCore.prototype.setup = function () {
            for (var i = 0; i < this.numPlaybacks; i++) {
                var key = "".concat(this.prefix, "pb-").concat(i + 1, "-intensity");
                this.set(key, this.minIntensity, this.maxIntensity);
            }
            for (var i = 0; i < this.numPlaybacks; i++) {
                var key = "".concat(this.prefix, "pb-").concat(i + 1, "-rate");
                this.set(key, this.minRate, this.maxRate);
            }
            for (var i = 0; i < this.numPlaybacks; i++) {
                var key = "".concat(this.prefix, "pb-").concat(i + 1, "-jump");
                this.set(key, 1, this.jumpSources);
            }
        };
        VPCueCore.prototype.set = function (key, min, max) {
            var _this = this;
            var getterSetter = function (val) {
                var settings = _this.mSettings[key];
                if (val !== undefined) {
                    var setValue = key.match(/jump/i) ? val : Number(val).toFixed(2);
                    if (settings.current === undefined && !settings.forceUpdate) {
                        settings.wanted = setValue;
                    }
                    if (settings.current !== setValue) {
                        settings.current = setValue;
                        settings.wanted = undefined;
                        settings.forceUpdate = false;
                        var command = "".concat(key, "=").concat(setValue);
                        _this.tell(command);
                    }
                }
                return settings.current ? Number(settings.current) : (settings.wanted ? Number(settings.wanted) : 0);
            };
            this.mSettings[key] = {
                wanted: undefined,
                current: undefined,
                forceUpdate: false,
                setGet: getterSetter
            };
            var options = {
                type: Number,
                min: min,
                max: max,
                description: this.getPropNameForKey(key)
            };
            this.property(this.getPropNameForKey(key), options, getterSetter);
        };
        Object.defineProperty(VPCueCore.prototype, "connected", {
            get: function () {
                return this.mConnected;
            },
            set: function (online) {
                this.mConnected = online;
            },
            enumerable: false,
            configurable: true
        });
        VPCueCore.prototype.connectStateChanged = function () {
            this.connected = this.socket.connected;
        };
        VPCueCore.prototype.bytesReceived = function (rawData) {
            var text = this.toString(rawData);
            var matches = this.responseParseRegex.exec(text);
            if (matches !== null && matches.length >= 3) {
                var key = matches[1];
                var value = Number(matches[2]);
                var settings = this.mSettings[key];
                if (settings) {
                    if (settings.wanted !== undefined) {
                        settings.forceUpdate = true;
                        settings.setGet(Number(settings.wanted));
                        settings.wanted = undefined;
                    }
                    else if (settings.current !== value) {
                        settings.current = value;
                        this.changed(this.getPropNameForKey(key));
                    }
                }
            }
        };
        VPCueCore.prototype.sendText = function (command) {
            this.tell(command);
        };
        VPCueCore.prototype.getPropNameForKey = function (key) {
            var matches = this.keyToNameParseRegex.exec(key);
            return "Playback ".concat(this.pad(Number(matches[2]), 2), " ").concat(this.capitalize(matches[3]));
        };
        VPCueCore.prototype.tell = function (data) {
            this.socket.sendText(data);
        };
        VPCueCore.prototype.toString = function (bytes) {
            var result = '';
            for (var i = 0; i < bytes.length; ++i) {
                var byte = bytes[i];
                var text = byte.toString(16);
                result += (byte < 16 ? '%0' : '%') + text;
            }
            return decodeURIComponent(result);
        };
        VPCueCore.prototype.capitalize = function (word) {
            if (word.length === 0) {
                return word;
            }
            var firstLetterCode = word.charCodeAt(0);
            if (firstLetterCode >= 97 && firstLetterCode <= 122) {
                return String.fromCharCode(firstLetterCode - 32) + word.slice(1);
            }
            return word;
        };
        __decorate([
            Meta.property("Connected", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], VPCueCore.prototype, "connected", null);
        __decorate([
            Meta.callable("Send a command to the device"),
            __param(0, Meta.parameter("Command")),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], VPCueCore.prototype, "sendText", null);
        VPCueCore = __decorate([
            Meta.driver("NetworkTCP", { port: 7000 }),
            __metadata("design:paramtypes", [Object])
        ], VPCueCore);
        return VPCueCore;
    }(Driver_1.Driver));
});
