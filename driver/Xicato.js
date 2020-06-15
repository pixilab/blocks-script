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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
define(["require", "exports", "system/SimpleHTTP", "system/SimpleFile", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, SimpleHTTP_1, SimpleFile_1, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Xicato = void 0;
    var ASCII = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var XIC_CONFIG_BASE_PATH = 'xicato.config';
    var XIC_GROUP_OFFSET = 49152;
    var XIC_MAX_DEVICE_GROUPS = 16;
    var XIC_MAX_DEVICE_SCENES = 32;
    var Xicato = Xicato_1 = (function (_super) {
        __extends(Xicato, _super);
        function Xicato(socket) {
            var _this = _super.call(this, socket) || this;
            var settingsFileName = XIC_CONFIG_BASE_PATH + '/' + socket.name + '.config';
            var dataPath = XIC_CONFIG_BASE_PATH + '/' + socket.name + '';
            _this.devicesFileName = dataPath + '/devices.json';
            _this.groupsFileName = dataPath + '/groups.json';
            _this.scenesFileName = dataPath + '/scenes.json';
            SimpleFile_1.SimpleFile.read(settingsFileName).then(function (readValue) {
                var settings = JSON.parse(readValue);
                _this.mUsername = settings.username;
                _this.mPassword = settings.password;
                _this.mAlive = true;
                _this.mBaseURL = 'http://' + socket.address + ':' + socket.port + '/';
                if (socket.enabled) {
                    socket.subscribe('finish', function (_sender) {
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
                this.checkReadyToSend();
            },
            enumerable: false,
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
            enumerable: false,
            configurable: true
        });
        Xicato.prototype.deviceSetIntensity = function (network, deviceId, intensity, fading) {
            this.setIntensityREST(network, deviceId, intensity, fading);
        };
        Xicato.prototype.groupSetIntensity = function (network, groupId, intensity, fading) {
            this.setIntensityREST(network, groupId + XIC_GROUP_OFFSET, intensity, fading);
        };
        Xicato.prototype.deviceRecallScene = function (network, deviceId, sceneId, fading) {
            return this.recallSceneREST(network, deviceId, sceneId, fading);
        };
        Xicato.prototype.groupRecallScene = function (network, groupId, sceneId, fading) {
            return this.recallSceneREST(network, groupId + XIC_GROUP_OFFSET, sceneId, fading);
        };
        Xicato.prototype.groupAddDevice = function (network, deviceId, groupId) {
            return this.setDeviceGroup(network, deviceId, groupId);
        };
        Xicato.prototype.groupRemoveDevice = function (network, deviceId, groupId) {
            return this.unsetDeviceGroup(network, deviceId, groupId);
        };
        Xicato.prototype.deviceSetScene = function (network, deviceId, sceneNumber, intensity, fadeTime, delayTime) {
            return this.setDeviceScene(network, deviceId, sceneNumber, intensity, fadeTime, delayTime);
        };
        Xicato.prototype.deviceRemoveScene = function (network, deviceId, sceneNumber) {
            return this.unsetDeviceScene(network, deviceId, sceneNumber);
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
            else if (!this.scenes)
                this.getScenes();
            this.checkReadyToSend();
        };
        Xicato.prototype.checkReadyToSend = function () {
            if (this.devices &&
                this.groups &&
                this.scenes &&
                this.connected &&
                this.mAuthorized) {
            }
        };
        Xicato.prototype.showDevicesREST = function () {
            var url = this.mBaseURL + '/devices';
            return this.authorizedGet(url);
        };
        Xicato.prototype.showGroupsWithDevicesREST = function () {
            var url = this.mBaseURL + '/groups';
            return this.authorizedGet(url);
        };
        Xicato.prototype.showScenesREST = function () {
            var url = this.mBaseURL + '/scenes';
            return this.authorizedGet(url);
        };
        Xicato.prototype.getDeviceGroupsREST = function (network, deviceId) {
            var _this = this;
            network = encodeURI(network);
            var url = this.mBaseURL + '/device/groups/' + network + '/' + deviceId;
            return new Promise(function (resolve, reject) {
                _this.authorizedGet(url).
                    then(function (result) {
                    resolve(JSON.parse(result));
                }).catch(function (error) { reject(error); });
            });
        };
        Xicato.prototype.getDeviceScenesREST = function (network, deviceId) {
            var _this = this;
            network = encodeURI(network);
            var url = this.mBaseURL + '/device/scenes/' + network + '/' + deviceId;
            return new Promise(function (resolve, reject) {
                _this.authorizedGet(url).
                    then(function (result) {
                    resolve(JSON.parse(result));
                }).catch(function (error) { reject(error); });
            });
        };
        Xicato.prototype.setIntensityREST = function (network, deviceId, intensity, fadeTime) {
            network = encodeURI(network);
            var url = this.mBaseURL + '/device/setintensity/' + network + '/' + deviceId + '/' + intensity + '/' + (fadeTime ? fadeTime : '');
            this.authorizedGet(url).
                then(function (_result) {
            }).catch(function (_error) {
            });
        };
        Xicato.prototype.recallSceneREST = function (network, deviceId, scene, fadeTime) {
            var _this = this;
            network = encodeURI(network);
            var url = this.mBaseURL + '/device/recallscene/' + network + '/' + deviceId + '/' + scene + '/' + (fadeTime ? fadeTime : '');
            return new Promise(function (resolve, reject) {
                _this.authorizedGet(url).
                    then(function (_result) {
                    resolve();
                }).catch(function (error) {
                    reject(error);
                });
            });
        };
        Xicato.prototype.setDeviceGroupsREST = function (network, deviceId, groups) {
            var _this = this;
            network = encodeURI(network);
            var url = this.mBaseURL + '/device/setgroups/' + network + '/' + deviceId;
            return new Promise(function (resolve, reject) {
                _this.authorizedPut(url, JSON.stringify(groups)).
                    then(function (result) {
                    resolve(JSON.parse(result));
                }).catch(function (error) { reject(error); });
            });
        };
        Xicato.prototype.setDeviceScenesREST = function (network, deviceId, scenes) {
            var _this = this;
            network = encodeURI(network);
            var url = this.mBaseURL + '/device/setscenes/' + network + '/' + deviceId;
            return new Promise(function (resolve, reject) {
                _this.authorizedPut(url, JSON.stringify(scenes)).
                    then(function (result) {
                    resolve(JSON.parse(result));
                }).catch(function (error) { reject(error); });
            });
        };
        Xicato.prototype.authorizedGet = function (url) {
            var _this = this;
            var promise = new Promise(function (resolve, reject) {
                _this.createAuthorizedRequest(url).
                    get().
                    then(function (response) {
                    _this.handleGetPutResponse(response, resolve, reject);
                }).catch(function (error) {
                    _this.requestFailed(error, reject);
                });
            });
            return promise;
        };
        Xicato.prototype.authorizedPut = function (url, jsonData) {
            var _this = this;
            var promise = new Promise(function (resolve, reject) {
                _this.createAuthorizedRequest(url).
                    put(jsonData ? jsonData : '').then(function (response) {
                    _this.handleGetPutResponse(response, resolve, reject);
                }).catch(function (error) {
                    _this.requestFailed(error, reject);
                });
            });
            return promise;
        };
        Xicato.prototype.handleGetPutResponse = function (response, resolve, reject) {
            this.connected = true;
            if (response.status === 200) {
                resolve(response.data);
            }
            else if (response.status === 401 || response.status === 403) {
                this.unauthorize();
                Xicato_1.handleRejection(reject, response.data);
            }
            else {
                Xicato_1.handleRejection(reject, response.data, true);
            }
        };
        Xicato.handleRejection = function (reject, message, logConsoleWarn) {
            if (message === void 0) { message = ''; }
            if (logConsoleWarn === void 0) { logConsoleWarn = false; }
            if (logConsoleWarn)
                console.warn(message);
            reject(message);
        };
        Xicato.prototype.createAuthorizedRequest = function (url) {
            return SimpleHTTP_1.SimpleHTTP.newRequest(url).header('Authorization', 'Bearer ' + this.mAuthToken);
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
            this.showDevicesREST().
                then(function (result) {
                _this.devices = JSON.parse(result);
                SimpleFile_1.SimpleFile.write(_this.devicesFileName, JSON.stringify(_this.devices));
            });
        };
        Xicato.prototype.getGroups = function () {
            var _this = this;
            this.showGroupsWithDevicesREST().
                then(function (result) {
                _this.groups = JSON.parse(result);
                SimpleFile_1.SimpleFile.write(_this.groupsFileName, JSON.stringify(_this.groups));
            });
        };
        Xicato.prototype.getScenes = function () {
            var _this = this;
            this.showScenesREST().
                then(function (result) {
                _this.scenes = JSON.parse(result);
                SimpleFile_1.SimpleFile.write(_this.scenesFileName, JSON.stringify(_this.scenes));
            });
        };
        Xicato.prototype.setDeviceGroup = function (network, deviceId, groupId) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                _this.getDeviceGroupsREST(network, deviceId).
                    then(function (result) {
                    var deviceGroups = result.groups;
                    if (deviceGroups.indexOf(groupId) === -1) {
                        if (deviceGroups.length < XIC_MAX_DEVICE_GROUPS) {
                            deviceGroups.push(groupId);
                            _this.setDeviceGroupsREST(network, deviceId, deviceGroups).
                                then(function (_result) {
                                resolve();
                            }).catch(function (error) { reject(error); });
                        }
                        else {
                            reject('can not add another group: device has already ' + deviceGroups.length + ' groups assigned');
                        }
                    }
                    else {
                        resolve();
                    }
                }).catch(function (error) { reject(error); });
            });
        };
        Xicato.prototype.unsetDeviceGroup = function (network, deviceId, groupId) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                _this.getDeviceGroupsREST(network, deviceId).
                    then(function (result) {
                    var deviceGroups = result.groups;
                    var indexOfGroupId = deviceGroups.indexOf(groupId);
                    if (indexOfGroupId !== -1) {
                        deviceGroups.splice(indexOfGroupId, 1);
                        _this.setDeviceGroupsREST(network, deviceId, deviceGroups).
                            then(function (_result) {
                            resolve();
                        }).catch(function (error) { reject(error); });
                    }
                    else {
                        resolve();
                    }
                }).catch(function (error) { reject(error); });
            });
        };
        Xicato.prototype.setDeviceScene = function (network, deviceId, sceneNumber, intensity, fadeTime, delayTime) {
            var _this = this;
            if (fadeTime === void 0) { fadeTime = 0; }
            if (delayTime === void 0) { delayTime = 0; }
            return new Promise(function (resolve, reject) {
                _this.getDeviceScenesREST(network, deviceId).
                    then(function (result) {
                    var deviceScenes = result.scenes;
                    var scene = Xicato_1.findDeviceSceneById(sceneNumber, deviceScenes);
                    if (scene) {
                        scene.intensity = intensity;
                        scene.fadeTime = fadeTime;
                        scene.delayTime = delayTime;
                    }
                    else {
                        if (deviceScenes.length < XIC_MAX_DEVICE_SCENES) {
                            scene = new XicDeviceScene();
                            scene.sceneNumber = sceneNumber;
                            scene.intensity = intensity;
                            scene.fadeTime = fadeTime;
                            scene.delayTime = delayTime;
                            deviceScenes.push(scene);
                        }
                        else {
                            reject('can not add another scene: device has already ' + deviceScenes.length + ' scenes assigned');
                            return;
                        }
                    }
                    _this.setDeviceScenesREST(network, deviceId, deviceScenes).
                        then(function (_result) {
                        resolve();
                    }).catch(function (error) { reject(error); });
                }).catch(function (error) { reject(error); });
            });
        };
        Xicato.prototype.unsetDeviceScene = function (network, deviceId, sceneNumber) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                _this.getDeviceScenesREST(network, deviceId).
                    then(function (result) {
                    var deviceScenes = result.scenes;
                    var indexOfSceneNumber = Xicato_1.findDeviceSceneIndexById(sceneNumber, deviceScenes);
                    if (indexOfSceneNumber !== -1) {
                        deviceScenes.splice(indexOfSceneNumber, 1);
                        _this.setDeviceScenesREST(network, deviceId, deviceScenes).
                            then(function (_result) {
                            resolve();
                        }).catch(function (error) { reject(error); });
                    }
                    else {
                        resolve();
                    }
                }).catch(function (error) { reject(error); });
            });
        };
        Xicato.findDeviceSceneById = function (sceneNumber, deviceScenes) {
            for (var i = 0; i < deviceScenes.length; i++) {
                var scene = deviceScenes[i];
                if (scene.sceneNumber == sceneNumber)
                    return scene;
            }
            return null;
        };
        Xicato.findDeviceSceneIndexById = function (sceneNumber, deviceScenes) {
            for (var i = 0; i < deviceScenes.length; i++) {
                var scene = deviceScenes[i];
                if (scene.sceneNumber == sceneNumber)
                    return i;
            }
            return -1;
        };
        Xicato.prototype.requestFailed = function (error, reject) {
            this.connected = false;
            if (reject)
                Xicato_1.handleRejection(reject, error, true);
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
        return Xicato;
    }(Driver_1.Driver));
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
        Metadata_1.callable('set intensity'),
        __param(0, Metadata_1.parameter('network name')),
        __param(1, Metadata_1.parameter('device id')),
        __param(2, Metadata_1.parameter('target intensity, in percent (0 or between 0.1 and 100.0)')),
        __param(3, Metadata_1.parameter('fade time, in milliseconds', true)),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Number, Number, Number]),
        __metadata("design:returntype", void 0)
    ], Xicato.prototype, "deviceSetIntensity", null);
    __decorate([
        Metadata_1.callable('set intensity'),
        __param(0, Metadata_1.parameter('network name')),
        __param(1, Metadata_1.parameter('group id')),
        __param(2, Metadata_1.parameter('target intensity, in percent (0 or between 0.1 and 100.0)')),
        __param(3, Metadata_1.parameter('fade time, in milliseconds', true)),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Number, Number, Number]),
        __metadata("design:returntype", void 0)
    ], Xicato.prototype, "groupSetIntensity", null);
    __decorate([
        Metadata_1.callable('recall scene'),
        __param(0, Metadata_1.parameter('network name')),
        __param(1, Metadata_1.parameter('device id')),
        __param(2, Metadata_1.parameter('target scene number (an integer)')),
        __param(3, Metadata_1.parameter('fade time, in milliseconds', true)),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Number, Number, Number]),
        __metadata("design:returntype", Promise)
    ], Xicato.prototype, "deviceRecallScene", null);
    __decorate([
        Metadata_1.callable('recall scene'),
        __param(0, Metadata_1.parameter('network name')),
        __param(1, Metadata_1.parameter('group id')),
        __param(2, Metadata_1.parameter('target scene number (an integer)')),
        __param(3, Metadata_1.parameter('fade time, in milliseconds', true)),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Number, Number, Number]),
        __metadata("design:returntype", Promise)
    ], Xicato.prototype, "groupRecallScene", null);
    __decorate([
        Metadata_1.callable('add device to group'),
        __param(0, Metadata_1.parameter('network name')),
        __param(1, Metadata_1.parameter('target device ID (cannot be a group or a sensor)')),
        __param(2, Metadata_1.parameter('group number (an integer)')),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Number, Number]),
        __metadata("design:returntype", Promise)
    ], Xicato.prototype, "groupAddDevice", null);
    __decorate([
        Metadata_1.callable('remove device from group'),
        __param(0, Metadata_1.parameter('network name')),
        __param(1, Metadata_1.parameter('target device ID (cannot be a group or a sensor)')),
        __param(2, Metadata_1.parameter('group number (an integer)')),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Number, Number]),
        __metadata("design:returntype", Promise)
    ], Xicato.prototype, "groupRemoveDevice", null);
    __decorate([
        Metadata_1.callable('set scene for a device'),
        __param(0, Metadata_1.parameter('network name')),
        __param(1, Metadata_1.parameter('target device ID (cannot be a group or a sensor)')),
        __param(2, Metadata_1.parameter('target scene number (an integer)')),
        __param(3, Metadata_1.parameter('target intensity, in percent (0 or between 0.1 and 100.0)')),
        __param(4, Metadata_1.parameter('fade time in milliseconds', true)),
        __param(5, Metadata_1.parameter('delay in milliseconds', true)),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Number, Number, Number, Number, Number]),
        __metadata("design:returntype", Promise)
    ], Xicato.prototype, "deviceSetScene", null);
    __decorate([
        Metadata_1.callable('remove scene from device'),
        __param(0, Metadata_1.parameter('network name')),
        __param(1, Metadata_1.parameter('target device ID (cannot be a group or a sensor)')),
        __param(2, Metadata_1.parameter('target scene number (an integer)')),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Number, Number]),
        __metadata("design:returntype", Promise)
    ], Xicato.prototype, "deviceRemoveScene", null);
    Xicato = Xicato_1 = __decorate([
        Metadata_1.driver('NetworkTCP', { port: 8000 }),
        __metadata("design:paramtypes", [Object])
    ], Xicato);
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
    var XicGroupWithDevices = (function () {
        function XicGroupWithDevices() {
        }
        return XicGroupWithDevices;
    }());
    var XicGroupsWithDevices = (function () {
        function XicGroupsWithDevices() {
        }
        return XicGroupsWithDevices;
    }());
    var XicScene = (function () {
        function XicScene() {
        }
        return XicScene;
    }());
    var XicDeviceScene = (function () {
        function XicDeviceScene() {
        }
        return XicDeviceScene;
    }());
    var XicDeviceResponse = (function () {
        function XicDeviceResponse() {
        }
        return XicDeviceResponse;
    }());
    var XicDeviceSetResponse = (function (_super) {
        __extends(XicDeviceSetResponse, _super);
        function XicDeviceSetResponse() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return XicDeviceSetResponse;
    }(XicDeviceResponse));
    var XicGetDeviceGroupsResponse = (function (_super) {
        __extends(XicGetDeviceGroupsResponse, _super);
        function XicGetDeviceGroupsResponse() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return XicGetDeviceGroupsResponse;
    }(XicDeviceResponse));
    var XicSetDeviceGroupsResponse = (function (_super) {
        __extends(XicSetDeviceGroupsResponse, _super);
        function XicSetDeviceGroupsResponse() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return XicSetDeviceGroupsResponse;
    }(XicDeviceSetResponse));
    var XicGetDeviceScenesResponse = (function (_super) {
        __extends(XicGetDeviceScenesResponse, _super);
        function XicGetDeviceScenesResponse() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return XicGetDeviceScenesResponse;
    }(XicDeviceResponse));
    var XicSetDeviceScenesResponse = (function (_super) {
        __extends(XicSetDeviceScenesResponse, _super);
        function XicSetDeviceScenesResponse() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return XicSetDeviceScenesResponse;
    }(XicDeviceSetResponse));
    var XicGetDeviceFirmwareAvailableResponse = (function (_super) {
        __extends(XicGetDeviceFirmwareAvailableResponse, _super);
        function XicGetDeviceFirmwareAvailableResponse() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return XicGetDeviceFirmwareAvailableResponse;
    }(XicDeviceResponse));
    var Xicato_1;
});
