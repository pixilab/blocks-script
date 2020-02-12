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
define(["require", "exports", "system/SimpleHTTP", "system/SimpleFile", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, SimpleHTTP_1, SimpleFile_1, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ASCII = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var XICATO_CONFIG_BASE_PATH = 'xicato.config';
    var Xicato = (function (_super) {
        __extends(Xicato, _super);
        function Xicato(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            var settingsFileName = XICATO_CONFIG_BASE_PATH + '/' + socket.name + '.config';
            _this.devicesFileName = XICATO_CONFIG_BASE_PATH + '/' + socket.name + '/devices.json';
            _this.groupsFileName = XICATO_CONFIG_BASE_PATH + '/' + socket.name + '/groups.json';
            SimpleFile_1.SimpleFile.read(settingsFileName).then(function (readValue) {
                var settings = JSON.parse(readValue);
                _this.mUsername = settings.username;
                _this.mPassword = settings.password;
                _this.mAlive = true;
                _this.mBaseURL = 'http://' + socket.address + ':' + socket.port + '/';
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
                return this.mConnected;
            },
            set: function (value) {
                if (this.mConnected == value)
                    return;
                this.mConnected = value;
                this.changed('connected');
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Xicato.prototype, "token", {
            get: function () {
                return this.mAuthToken;
            },
            set: function (value) {
                if (this.mAuthToken == value)
                    return;
                this.mAuthToken = value;
                this.changed('token');
            },
            enumerable: true,
            configurable: true
        });
        Xicato.prototype.recallScene = function (network, groupId, sceneId, fading) {
            return this.recallSceneREST(network, groupId, sceneId, fading);
        };
        Xicato.prototype.requestPoll = function (delay) {
            var _this = this;
            if (!this.mPoller && this.mAlive) {
                this.mPoller = wait(delay);
                this.mPoller.then(function () {
                    _this.mPoller = undefined;
                    if (_this.mAuthToken) {
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
            this.mAuthToken = authCode;
            this.mAuthorized = true;
        };
        Xicato.prototype.unauthorize = function () {
            this.mAuthorized = false;
            this.mAuthToken = undefined;
            console.warn("Unauthorized due to 401/403");
        };
        Xicato.prototype.regularPoll = function () {
            if (!this.devices)
                this.getDevices();
            else if (!this.groups)
                this.getGroups();
            this.checkReadyToSend();
        };
        Xicato.prototype.checkReadyToSend = function () {
            if (this.devices &&
                this.groups &&
                this.connected &&
                this.mAuthorized) {
            }
        };
        Xicato.prototype.recallSceneREST = function (network, group, scene, fading) {
            var _this = this;
            var deviceId = 49152 + group;
            network = encodeURI(network);
            var url = this.mBaseURL + '/device/recallscene/' + network + '/' + deviceId + '/' + scene + '/' + (fading ? fading : '');
            return new Promise(function (resolve, reject) {
                _this.authorizedGet(url)
                    .then(function (_result) {
                    resolve();
                }).catch(function (error) {
                    console.warn(error);
                    reject(error);
                });
            });
        };
        Xicato.prototype.showDevicesREST = function () {
            var url = this.mBaseURL + '/devices';
            return this.authorizedGet(url);
        };
        Xicato.prototype.showGroupsREST = function () {
            var url = this.mBaseURL + '/groups';
            return this.authorizedGet(url);
        };
        Xicato.prototype.authorizedGet = function (url) {
            var _this = this;
            var promise = new Promise(function (resolve, reject) {
                SimpleHTTP_1.SimpleHTTP.newRequest(url).
                    header('Authorization', 'Bearer ' + _this.mAuthToken).
                    get().
                    then(function (response) {
                    _this.connected = true;
                    if (response.status === 200) {
                        resolve(response.data);
                    }
                    else if (response.status === 401 || response.status === 403) {
                        _this.unauthorize();
                        reject(response.data);
                    }
                    else {
                        console.warn(response.status + ': ' + response.data);
                        reject(response.data);
                    }
                }).catch(function (error) {
                    _this.requestFailed(error);
                    reject();
                });
            });
            return promise;
        };
        Xicato.prototype.authenticationPoll = function () {
            var _this = this;
            SimpleHTTP_1.SimpleHTTP.newRequest(this.mBaseURL + 'api/token').
                header('Authorization', 'Basic ' + this.toBase64(this.mUsername + ':' + this.mPassword)).
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
                    _this.mAuthorized = false;
                    if (response.status === 401) {
                        if (!_this.mLoggedAuthFail) {
                            console.error('auth request failed: ' + response.status + ': ' + response.data);
                            _this.mLoggedAuthFail = true;
                        }
                    }
                    if (response.status === 403) {
                        if (!_this.mLoggedAuthFail) {
                            console.error("enter correct username & password in Xicato config file");
                            _this.mLoggedAuthFail = true;
                        }
                    }
                }
            }).catch(function (error) { return _this.requestFailed(error); });
        };
        Xicato.prototype.getDevices = function () {
            var _this = this;
            this.showDevicesREST()
                .then(function (result) {
                _this.devices = JSON.parse(result);
                SimpleFile_1.SimpleFile.write(_this.devicesFileName, JSON.stringify(_this.devices));
            }).catch(function (error) {
                console.warn(error);
            });
        };
        Xicato.prototype.getGroups = function () {
            var _this = this;
            this.showGroupsREST()
                .then(function (result) {
                _this.groups = JSON.parse(result);
                SimpleFile_1.SimpleFile.write(_this.groupsFileName, JSON.stringify(_this.groups));
            }).catch(function (error) {
                console.warn(error);
            });
            ;
        };
        Xicato.prototype.requestFailed = function (error) {
            this.connected = false;
            console.warn(error);
        };
        Xicato.prototype.onFinish = function () {
            this.mAlive = false;
            if (this.mPoller) {
                this.mPoller.cancel();
            }
            if (this.mDeferredSender) {
                this.mDeferredSender.cancel();
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
            Metadata_1.property('Connected successfully to device', true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], Xicato.prototype, "connected", null);
        __decorate([
            Metadata_1.property('Current bearer token issued by gateway'),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], Xicato.prototype, "token", null);
        __decorate([
            Metadata_1.callable('recall a scene'),
            __param(0, Metadata_1.parameter('network name')),
            __param(1, Metadata_1.parameter('group id')),
            __param(2, Metadata_1.parameter('target scene number (an integer)')),
            __param(3, Metadata_1.parameter('fade time, in milliseconds', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, Number, Number, Number]),
            __metadata("design:returntype", Promise)
        ], Xicato.prototype, "recallScene", null);
        Xicato = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 8000 }),
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
    var XicDeviceBase = (function () {
        function XicDeviceBase() {
        }
        return XicDeviceBase;
    }());
    var XicDeviceOrSensor = (function (_super) {
        __extends(XicDeviceOrSensor, _super);
        function XicDeviceOrSensor() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return XicDeviceOrSensor;
    }(XicDeviceBase));
    var XicDevice = (function (_super) {
        __extends(XicDevice, _super);
        function XicDevice() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return XicDevice;
    }(XicDeviceOrSensor));
    var XicSensor = (function (_super) {
        __extends(XicSensor, _super);
        function XicSensor() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return XicSensor;
    }(XicDeviceOrSensor));
    var XicSwitchData = (function () {
        function XicSwitchData() {
        }
        return XicSwitchData;
    }());
    var XicSwitch = (function (_super) {
        __extends(XicSwitch, _super);
        function XicSwitch() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return XicSwitch;
    }(XicDeviceBase));
    var XicDevices = (function () {
        function XicDevices() {
        }
        return XicDevices;
    }());
    var XicGroup = (function () {
        function XicGroup() {
        }
        return XicGroup;
    }());
    var XicGroups = (function () {
        function XicGroups() {
        }
        return XicGroups;
    }());
});
