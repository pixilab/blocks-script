"use strict";
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
var Xicato_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Xicato = void 0;
const ASCII = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const SimpleHTTP_1 = require("../system/SimpleHTTP");
const SimpleFile_1 = require("../system/SimpleFile");
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
const XIC_CONFIG_BASE_PATH = 'xicato.config';
const XIC_GROUP_OFFSET = 49152;
const XIC_MAX_DEVICE_GROUPS = 16;
const XIC_MAX_DEVICE_SCENES = 32;
let Xicato = Xicato_1 = class Xicato extends Driver_1.Driver {
    mUsername;
    mPassword;
    mAuthToken;
    mAuthorized;
    mAlive;
    mBaseURL;
    mConnected;
    mLoggedAuthFail;
    mPoller;
    mDeferredSender;
    devices;
    groups;
    scenes;
    devicesFileName;
    groupsFileName;
    scenesFileName;
    constructor(socket) {
        super(socket);
        const settingsFileName = XIC_CONFIG_BASE_PATH + '/' + socket.name + '.config';
        const dataPath = XIC_CONFIG_BASE_PATH + '/' + socket.name;
        this.devicesFileName = dataPath + '/devices.json';
        this.groupsFileName = dataPath + '/groups.json';
        this.scenesFileName = dataPath + '/scenes.json';
        SimpleFile_1.SimpleFile.read(settingsFileName).then(readValue => {
            var settings = JSON.parse(readValue);
            this.mUsername = settings.username;
            this.mPassword = settings.password;
            this.mAlive = true;
            this.mBaseURL = 'http://' + socket.address + ':' + socket.port + '';
            if (socket.enabled) {
                socket.subscribe('finish', _sender => {
                    this.onFinish();
                });
                this.requestPoll(100);
            }
        }).catch(error => {
            console.warn("Can't read file", settingsFileName, error);
            SimpleFile_1.SimpleFile.write(settingsFileName, JSON.stringify(new XicatoSettings()));
        });
    }
    isOfTypeName(typeName) {
        return typeName === "Xicato" ? this : null;
    }
    get connected() {
        return this.mConnected;
    }
    set connected(value) {
        if (this.mConnected == value)
            return;
        this.mConnected = value;
        this.changed('connected');
        this.checkReadyToSend();
    }
    get token() {
        return this.mAuthToken;
    }
    set token(value) {
        if (this.mAuthToken == value)
            return;
        this.mAuthToken = value;
        this.changed('token');
    }
    deviceSetIntensity(network, deviceId, intensity, fading) {
        this.setIntensityREST(network, deviceId, intensity, fading);
    }
    groupSetIntensity(network, groupId, intensity, fading) {
        this.setIntensityREST(network, groupId + XIC_GROUP_OFFSET, intensity, fading);
    }
    deviceRecallScene(network, deviceId, sceneId, fading) {
        return this.recallSceneREST(network, deviceId, sceneId, fading);
    }
    groupRecallScene(network, groupId, sceneId, fading) {
        return this.recallSceneREST(network, groupId + XIC_GROUP_OFFSET, sceneId, fading);
    }
    groupAddDevice(network, deviceId, groupId) {
        return this.setDeviceGroup(network, deviceId, groupId);
    }
    groupRemoveDevice(network, deviceId, groupId) {
        return this.unsetDeviceGroup(network, deviceId, groupId);
    }
    deviceSetScene(network, deviceId, sceneNumber, intensity, fadeTime, delayTime) {
        return this.setDeviceScene(network, deviceId, sceneNumber, intensity, fadeTime, delayTime);
    }
    deviceRemoveScene(network, deviceId, sceneNumber) {
        return this.unsetDeviceScene(network, deviceId, sceneNumber);
    }
    requestPoll(delay) {
        if (!this.mPoller && this.mAlive) {
            this.mPoller = wait(delay);
            this.mPoller.then(() => {
                this.mPoller = undefined;
                if (this.mAuthToken) {
                    this.regularPoll();
                }
                else {
                    this.authenticationPoll();
                }
                this.requestPoll(3000);
            });
        }
    }
    gotAuthCode(authCode) {
        this.mAuthToken = authCode;
        this.mAuthorized = true;
    }
    unauthorize() {
        this.mAuthorized = false;
        this.mAuthToken = undefined;
        console.warn("Unauthorized due to 401/403");
    }
    regularPoll() {
        if (!this.devices)
            this.getDevices();
        else if (!this.groups)
            this.getGroups();
        else if (!this.scenes)
            this.getScenes();
        this.checkReadyToSend();
    }
    checkReadyToSend() {
        if (this.devices &&
            this.groups &&
            this.scenes &&
            this.connected &&
            this.mAuthorized) {
        }
    }
    showDevicesREST() {
        var url = this.mBaseURL + '/devices';
        return this.authorizedGet(url);
    }
    showGroupsWithDevicesREST() {
        var url = this.mBaseURL + '/groups';
        return this.authorizedGet(url);
    }
    showScenesREST() {
        var url = this.mBaseURL + '/scenes';
        return this.authorizedGet(url);
    }
    getDeviceGroupsREST(network, deviceId) {
        network = encodeURI(network);
        var url = this.mBaseURL + '/device/groups/' + network + '/' + deviceId;
        return new Promise((resolve, reject) => {
            this.authorizedGet(url).
                then(result => {
                resolve(JSON.parse(result));
            }).catch(error => { reject(error); });
        });
    }
    getDeviceScenesREST(network, deviceId) {
        network = encodeURI(network);
        var url = this.mBaseURL + '/device/scenes/' + network + '/' + deviceId;
        return new Promise((resolve, reject) => {
            this.authorizedGet(url).
                then(result => {
                resolve(JSON.parse(result));
            }).catch(error => { reject(error); });
        });
    }
    setIntensityREST(network, deviceId, intensity, fadeTime) {
        network = encodeURI(network);
        var url = this.mBaseURL + '/device/setintensity/' + network + '/' + deviceId + '/' + intensity + '/' + (fadeTime ? fadeTime : '');
        this.authorizedGet(url).
            then(_result => {
        }).catch(_error => {
        });
    }
    recallSceneREST(network, deviceId, scene, fadeTime) {
        network = encodeURI(network);
        var url = this.mBaseURL + '/device/recallscene/' + network + '/' + deviceId + '/' + scene + '/' + (fadeTime ? fadeTime : '');
        return new Promise((resolve, reject) => {
            this.authorizedGet(url).
                then(_result => {
                resolve();
            }).catch(error => {
                reject(error);
            });
        });
    }
    setDeviceGroupsREST(network, deviceId, groups) {
        network = encodeURI(network);
        var url = this.mBaseURL + '/device/setgroups/' + network + '/' + deviceId;
        return new Promise((resolve, reject) => {
            this.authorizedPut(url, JSON.stringify(groups)).
                then(result => {
                resolve(JSON.parse(result));
            }).catch(error => { reject(error); });
        });
    }
    setDeviceScenesREST(network, deviceId, scenes) {
        network = encodeURI(network);
        var url = this.mBaseURL + '/device/setscenes/' + network + '/' + deviceId;
        return new Promise((resolve, reject) => {
            this.authorizedPut(url, JSON.stringify(scenes)).
                then(result => {
                resolve(JSON.parse(result));
            }).catch(error => { reject(error); });
        });
    }
    authorizedGet(url) {
        const promise = new Promise((resolve, reject) => {
            this.createAuthorizedRequest(url).
                get().
                then(response => {
                this.handleGetPutResponse(response, resolve, reject);
            }).catch(error => {
                this.requestFailed(error, reject);
            });
        });
        return promise;
    }
    authorizedPut(url, jsonData) {
        const promise = new Promise((resolve, reject) => {
            this.createAuthorizedRequest(url).
                put(jsonData ? jsonData : '').then(response => {
                this.handleGetPutResponse(response, resolve, reject);
            }).catch(error => {
                this.requestFailed(error, reject);
            });
        });
        return promise;
    }
    handleGetPutResponse(response, resolve, reject) {
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
    }
    static handleRejection(reject, message = '', logConsoleWarn = false) {
        if (logConsoleWarn)
            console.warn(message);
        reject(message);
    }
    createAuthorizedRequest(url) {
        return SimpleHTTP_1.SimpleHTTP.newRequest(url).header('Authorization', 'Bearer ' + this.mAuthToken);
    }
    authenticationPoll() {
        SimpleHTTP_1.SimpleHTTP.newRequest(this.mBaseURL + '/api/token').
            header('Authorization', 'Basic ' + this.toBase64(this.mUsername + ':' + this.mPassword)).
            get().
            then(response => {
            this.connected = true;
            if (response.status === 200) {
                var authResponse = response.data;
                if (authResponse && authResponse.length) {
                    this.gotAuthCode(authResponse);
                }
            }
            else {
                this.mAuthorized = false;
                if (response.status === 401) {
                    if (!this.mLoggedAuthFail) {
                        console.error('auth request failed: ' + response.status + ': ' + response.data);
                        this.mLoggedAuthFail = true;
                    }
                }
                if (response.status === 403) {
                    if (!this.mLoggedAuthFail) {
                        console.error("enter correct username & password in Xicato config file");
                        this.mLoggedAuthFail = true;
                    }
                }
            }
        }).catch(error => this.requestFailed(error));
    }
    getDevices() {
        this.showDevicesREST().
            then(result => {
            this.devices = JSON.parse(result);
            SimpleFile_1.SimpleFile.write(this.devicesFileName, JSON.stringify(this.devices));
        });
    }
    getGroups() {
        this.showGroupsWithDevicesREST().
            then(result => {
            this.groups = JSON.parse(result);
            SimpleFile_1.SimpleFile.write(this.groupsFileName, JSON.stringify(this.groups));
        });
    }
    getScenes() {
        this.showScenesREST().
            then(result => {
            this.scenes = JSON.parse(result);
            SimpleFile_1.SimpleFile.write(this.scenesFileName, JSON.stringify(this.scenes));
        });
    }
    setDeviceGroup(network, deviceId, groupId) {
        return new Promise((resolve, reject) => {
            this.getDeviceGroupsREST(network, deviceId).
                then(result => {
                var deviceGroups = result.groups;
                if (deviceGroups.indexOf(groupId) === -1) {
                    if (deviceGroups.length < XIC_MAX_DEVICE_GROUPS) {
                        deviceGroups.push(groupId);
                        this.setDeviceGroupsREST(network, deviceId, deviceGroups).
                            then(_result => {
                            resolve();
                        }).catch(error => { reject(error); });
                    }
                    else {
                        reject('can not add another group: device has already ' + deviceGroups.length + ' groups assigned');
                    }
                }
                else {
                    resolve();
                }
            }).catch(error => { reject(error); });
        });
    }
    unsetDeviceGroup(network, deviceId, groupId) {
        return new Promise((resolve, reject) => {
            this.getDeviceGroupsREST(network, deviceId).
                then(result => {
                var deviceGroups = result.groups;
                var indexOfGroupId = deviceGroups.indexOf(groupId);
                if (indexOfGroupId !== -1) {
                    deviceGroups.splice(indexOfGroupId, 1);
                    this.setDeviceGroupsREST(network, deviceId, deviceGroups).
                        then(_result => {
                        resolve();
                    }).catch(error => { reject(error); });
                }
                else {
                    resolve();
                }
            }).catch(error => { reject(error); });
        });
    }
    setDeviceScene(network, deviceId, sceneNumber, intensity, fadeTime = 0, delayTime = 0) {
        return new Promise((resolve, reject) => {
            this.getDeviceScenesREST(network, deviceId).
                then(result => {
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
                this.setDeviceScenesREST(network, deviceId, deviceScenes).
                    then(_result => {
                    resolve();
                }).catch(error => { reject(error); });
            }).catch(error => { reject(error); });
        });
    }
    unsetDeviceScene(network, deviceId, sceneNumber) {
        return new Promise((resolve, reject) => {
            this.getDeviceScenesREST(network, deviceId).
                then(result => {
                var deviceScenes = result.scenes;
                var indexOfSceneNumber = Xicato_1.findDeviceSceneIndexById(sceneNumber, deviceScenes);
                if (indexOfSceneNumber !== -1) {
                    deviceScenes.splice(indexOfSceneNumber, 1);
                    this.setDeviceScenesREST(network, deviceId, deviceScenes).
                        then(_result => {
                        resolve();
                    }).catch(error => { reject(error); });
                }
                else {
                    resolve();
                }
            }).catch(error => { reject(error); });
        });
    }
    static findDeviceSceneById(sceneNumber, deviceScenes) {
        for (let i = 0; i < deviceScenes.length; i++) {
            var scene = deviceScenes[i];
            if (scene.sceneNumber == sceneNumber)
                return scene;
        }
        return null;
    }
    static findDeviceSceneIndexById(sceneNumber, deviceScenes) {
        for (let i = 0; i < deviceScenes.length; i++) {
            var scene = deviceScenes[i];
            if (scene.sceneNumber == sceneNumber)
                return i;
        }
        return -1;
    }
    requestFailed(error, reject) {
        this.connected = false;
        if (reject)
            Xicato_1.handleRejection(reject, error, true);
    }
    onFinish() {
        this.mAlive = false;
        if (this.mPoller) {
            this.mPoller.cancel();
        }
        if (this.mDeferredSender) {
            this.mDeferredSender.cancel();
        }
    }
    toBase64(data) {
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
    }
    ;
};
exports.Xicato = Xicato;
__decorate([
    (0, Metadata_1.property)('Connected successfully to device', true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], Xicato.prototype, "connected", null);
__decorate([
    (0, Metadata_1.property)('Current bearer token issued by gateway'),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], Xicato.prototype, "token", null);
__decorate([
    (0, Metadata_1.callable)('set intensity'),
    __param(0, (0, Metadata_1.parameter)('network name')),
    __param(1, (0, Metadata_1.parameter)('device id')),
    __param(2, (0, Metadata_1.parameter)('target intensity, in percent (0 or between 0.1 and 100.0)')),
    __param(3, (0, Metadata_1.parameter)('fade time, in milliseconds', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Number]),
    __metadata("design:returntype", void 0)
], Xicato.prototype, "deviceSetIntensity", null);
__decorate([
    (0, Metadata_1.callable)('set intensity'),
    __param(0, (0, Metadata_1.parameter)('network name')),
    __param(1, (0, Metadata_1.parameter)('group id')),
    __param(2, (0, Metadata_1.parameter)('target intensity, in percent (0 or between 0.1 and 100.0)')),
    __param(3, (0, Metadata_1.parameter)('fade time, in milliseconds', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Number]),
    __metadata("design:returntype", void 0)
], Xicato.prototype, "groupSetIntensity", null);
__decorate([
    (0, Metadata_1.callable)('recall scene'),
    __param(0, (0, Metadata_1.parameter)('network name')),
    __param(1, (0, Metadata_1.parameter)('device id')),
    __param(2, (0, Metadata_1.parameter)('target scene number (an integer)')),
    __param(3, (0, Metadata_1.parameter)('fade time, in milliseconds', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Number]),
    __metadata("design:returntype", Promise)
], Xicato.prototype, "deviceRecallScene", null);
__decorate([
    (0, Metadata_1.callable)('recall scene'),
    __param(0, (0, Metadata_1.parameter)('network name')),
    __param(1, (0, Metadata_1.parameter)('group id')),
    __param(2, (0, Metadata_1.parameter)('target scene number (an integer)')),
    __param(3, (0, Metadata_1.parameter)('fade time, in milliseconds', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Number]),
    __metadata("design:returntype", Promise)
], Xicato.prototype, "groupRecallScene", null);
__decorate([
    (0, Metadata_1.callable)('add device to group'),
    __param(0, (0, Metadata_1.parameter)('network name')),
    __param(1, (0, Metadata_1.parameter)('target device ID (cannot be a group or a sensor)')),
    __param(2, (0, Metadata_1.parameter)('group number (an integer)')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], Xicato.prototype, "groupAddDevice", null);
__decorate([
    (0, Metadata_1.callable)('remove device from group'),
    __param(0, (0, Metadata_1.parameter)('network name')),
    __param(1, (0, Metadata_1.parameter)('target device ID (cannot be a group or a sensor)')),
    __param(2, (0, Metadata_1.parameter)('group number (an integer)')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], Xicato.prototype, "groupRemoveDevice", null);
__decorate([
    (0, Metadata_1.callable)('set scene for a device'),
    __param(0, (0, Metadata_1.parameter)('network name')),
    __param(1, (0, Metadata_1.parameter)('target device ID (cannot be a group or a sensor)')),
    __param(2, (0, Metadata_1.parameter)('target scene number (an integer)')),
    __param(3, (0, Metadata_1.parameter)('target intensity, in percent (0 or between 0.1 and 100.0)')),
    __param(4, (0, Metadata_1.parameter)('fade time in milliseconds', true)),
    __param(5, (0, Metadata_1.parameter)('delay in milliseconds', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Number, Number, Number]),
    __metadata("design:returntype", Promise)
], Xicato.prototype, "deviceSetScene", null);
__decorate([
    (0, Metadata_1.callable)('remove scene from device'),
    __param(0, (0, Metadata_1.parameter)('network name')),
    __param(1, (0, Metadata_1.parameter)('target device ID (cannot be a group or a sensor)')),
    __param(2, (0, Metadata_1.parameter)('target scene number (an integer)')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], Xicato.prototype, "deviceRemoveScene", null);
exports.Xicato = Xicato = Xicato_1 = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 8000 }),
    __metadata("design:paramtypes", [Object])
], Xicato);
class XicatoSettings {
    username = '';
    password = '';
}
class XicDeviceBase {
    "01. Device ID";
    "02. Name";
    "03. Device";
    NetworkName;
}
class XicDeviceOrSensor extends XicDeviceBase {
    "07. supply_voltage";
    "09. signal_strength";
    "10. status";
    "11. Last Update";
    "12. Adv Interval";
}
class XicDevice extends XicDeviceOrSensor {
    "04. Intensity";
    "05. Power";
    "06. Tc temperature";
    "08. on_hours";
}
class XicSensor extends XicDeviceOrSensor {
    "04. Lux";
    "05. Motion";
    "06. Temperature";
    "08. Humidity";
    "LuxHours";
}
class XicSwitchData {
    last_press;
    last_release;
    state;
}
class XicSwitch extends XicDeviceBase {
    "04. Button Data";
    "05. PCB temperature";
    "06. supply_voltage";
    "07. signal_strength";
    "08. status";
    "09. Last Update";
    "10. Last Press";
}
class XicDevices {
    network;
    networks;
    connectable;
    devices;
    sensors;
    switches;
    temperature;
}
class XicGroupWithDevices {
    devices;
    groupId;
    groupName;
}
class XicGroupsWithDevices {
    network;
    networks;
    connectable;
    groups;
    temperature;
}
class XicScene {
    name;
    number;
    network;
}
class XicDeviceScene {
    sceneNumber;
    intensity;
    delayTime;
    fadeTime;
}
class XicDeviceResponse {
    device_id;
}
class XicDeviceSetResponse extends XicDeviceResponse {
    result;
}
class XicGetDeviceGroupsResponse extends XicDeviceResponse {
    network;
    groups;
}
class XicSetDeviceGroupsResponse extends XicDeviceSetResponse {
    groups;
}
class XicGetDeviceScenesResponse extends XicDeviceResponse {
    scenes;
}
class XicSetDeviceScenesResponse extends XicDeviceSetResponse {
    scenes;
}
class XicGetDeviceFirmwareAvailableResponse extends XicDeviceResponse {
    current;
    available;
}
