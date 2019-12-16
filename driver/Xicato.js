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
define(["require", "exports", "system/SimpleHTTP", "system/SimpleFile", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, SimpleHTTP_1, SimpleFile_1, Driver_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ASCII = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var Xicato = (function (_super) {
        __extends(Xicato, _super);
        function Xicato(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            var settingsFileName = 'xicato.config/' + socket.name + '.config';
            SimpleFile_1.SimpleFile.read(settingsFileName).then(function (readValue) {
                var settings = JSON.parse(readValue);
                _this._username = settings.username;
                _this._password = settings.password;
                _this._alive = true;
                _this._baseURL = 'http://' + socket.address + ':' + socket.port + '/';
                if (socket.enabled) {
                    socket.subscribe('finish', function (sender) {
                        _this.onFinish();
                    });
                    _this.requestPoll(100);
                }
            }).catch(function (error) {
                console.warn("Can't read file", settingsFileName, error);
                SimpleFile_1.SimpleFile.write(settingsFileName, JSON.stringify(new XicatoSettings()));
            });
            return _this;
        }
        Object.defineProperty(Xicato.prototype, "connected", {
            get: function () {
                return this._connected;
            },
            set: function (value) {
                this._connected = value;
            },
            enumerable: true,
            configurable: true
        });
        Xicato.prototype.requestPoll = function (delay) {
            var _this = this;
            if (!this._poller && this._alive) {
                this._poller = wait(delay);
                this._poller.then(function () {
                    _this._poller = undefined;
                    if (_this._authToken) {
                        _this.regularPoll();
                    }
                    else {
                        _this.authenticationPoll();
                    }
                    _this.requestPoll(3000);
                });
            }
        };
        Xicato.prototype.gotAuthCode = function (authCode) {
            this._authToken = authCode;
            this._authorized = true;
        };
        Xicato.prototype.unauthorize = function () {
            this._authorized = false;
            this._authToken = undefined;
            console.warn("Unauthorized due to 403");
        };
        Xicato.prototype.regularPoll = function () {
            this.checkReadyToSend();
        };
        Xicato.prototype.checkReadyToSend = function () {
            if (this.connected &&
                this._authorized) {
            }
        };
        Xicato.prototype.authenticationPoll = function () {
            var _this = this;
            SimpleHTTP_1.SimpleHTTP.newRequest(this._baseURL + 'api/token').
                header('Authorization', 'Basic ' + this.toBase64(this._username + ':' + this._password)).
                get().
                then(function (response) {
                _this.connected = true;
                if (response.status === 200) {
                    var authResponse = response.data;
                    if (authResponse && authResponse.length) {
                        _this.gotAuthCode(authResponse);
                    }
                }
                else {
                    _this._authorized = false;
                    if (response.status === 403) {
                        if (!_this._loggedAuthFail) {
                            console.error("enter correct username & password in Xicato config file");
                            _this._loggedAuthFail = true;
                        }
                    }
                }
            }).catch(function (error) { return _this.requestFailed(error); });
        };
        Xicato.prototype.requestFailed = function (error) {
            this.connected = false;
            console.warn(error);
        };
        Xicato.prototype.onFinish = function () {
            this._alive = false;
            if (this._poller) {
                this._poller.cancel();
            }
            if (this._deferredSender) {
                this._deferredSender.cancel();
            }
        };
        Xicato.prototype.toBase64 = function (data) {
            var len = data.length - 1;
            var i = -1;
            var b64 = '';
            while (i < len) {
                var code = data.charCodeAt(++i) << 16 | data.charCodeAt(++i) << 8 | data.charCodeAt(++i);
                b64 += ASCII[(code >>> 18) & 63] + ASCII[(code >>> 12) & 63] + ASCII[(code >>> 6) & 63] + ASCII[code & 63];
            }
            var pads = data.length % 3;
            if (pads > 0) {
                b64 = b64.slice(0, pads - 3);
                while (b64.length % 4 !== 0) {
                    b64 += '=';
                }
            }
            return b64;
        };
        ;
        __decorate([
            Meta.property("Connected successfully to device", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], Xicato.prototype, "connected", null);
        Xicato = __decorate([
            Meta.driver('NetworkTCP', { port: 8000 }),
            __metadata("design:paramtypes", [Object])
        ], Xicato);
        return Xicato;
    }(Driver_1.Driver));
    exports.Xicato = Xicato;
    var XicatoSettings = (function () {
        function XicatoSettings() {
            this.username = '';
            this.password = '';
        }
        return XicatoSettings;
    }());
});
