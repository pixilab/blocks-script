/*
	Driver for Xicato Intelligent Gateway, based on Xicato Intelligent Gateway API v35 2018-10-24
  (PDF)

 	Copyright (c) 2019 No Parking Production ApS, Denmark (https://noparking.dk). All Rights Reserved.
	Created by: Samuel Walz <mail@samwalz.com>
  Version: 0.3
  Features:
  - get auth token via username & password
  - set intensity for devices & groups
  - recall scenes for devices & groups
  - set scenes for devices (and unset scenes)
  - assign devices to groups (and remove them)

  (losely based on the DeConz.ts driver)
 */

const ASCII = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

import { NetworkTCP } from "system/Network";
import { SimpleHTTP, Request, Response } from "system/SimpleHTTP";
import { SimpleFile } from "system/SimpleFile";
import { Driver } from "system_lib/Driver";
import { callable, max, min, parameter, property, driver } from "system_lib/Metadata";

const XIC_CONFIG_BASE_PATH : string = 'xicato.config';
const XIC_GROUP_OFFSET : number = 49152;
const XIC_MAX_DEVICE_GROUPS : number = 16;
const XIC_MAX_DEVICE_SCENES : number = 32;


@driver('NetworkTCP', { port: 8000 })
export class Xicato extends Driver<NetworkTCP> {

    private mUsername : string;
    private mPassword : string;
    private mAuthToken : string;
    private mAuthorized : boolean;

    private mAlive : boolean;
    private mBaseURL : string;
    private mConnected : boolean;

    private mLoggedAuthFail : boolean;

    private mPoller: CancelablePromise<void>;	// Polling timer, if any
    private mDeferredSender: CancelablePromise<void>;	// Send commands soon

    private devices: XicDevices;
    private groups: XicGroupsWithDevices;
    private scenes: XicScene[];

    private readonly devicesFileName: string;
    private readonly groupsFileName: string;
    private readonly scenesFileName: string;

    public constructor(socket: NetworkTCP) {
        super(socket);

        // no auto-connect needed since REST API
        const settingsFileName = XIC_CONFIG_BASE_PATH + '/' + socket.name + '.config';
        const dataPath = XIC_CONFIG_BASE_PATH + '/' + socket.name + '';
        this.devicesFileName = dataPath + '/devices.json';
        this.groupsFileName = dataPath + '/groups.json';
        this.scenesFileName = dataPath + '/scenes.json';


        // try read configuration. if not present, write example file
    	SimpleFile.read(settingsFileName).then(readValue => {
            var settings : XicatoSettings = JSON.parse(readValue);
            this.mUsername = settings.username;
            this.mPassword = settings.password;

            this.mAlive = true;
      		this.mBaseURL = 'http://' + socket.address + ':' + socket.port + '/';

            if (socket.enabled) {
      			socket.subscribe('finish', _sender => {
      				this.onFinish();
      			});
      			this.requestPoll(100);
      		}
		}).catch(error => {
			console.warn("Can't read file", settingsFileName, error);
            SimpleFile.write(settingsFileName, JSON.stringify(new XicatoSettings()));
		});
    }

	/**
	 * Allow clients to check for my type, just as in some system object classes
	 */
	isOfTypeName(typeName: string) {
		return typeName === "Xicato" ? this : null;
	}

    @property('Connected successfully to device', true)
  	public get connected(): boolean {
  		return this.mConnected;
  	}
  	public set connected(value: boolean) {
        if (this.mConnected == value) return;
        this.mConnected = value;
        this.changed('connected');
  		this.checkReadyToSend();
  	}

    @property('Current bearer token issued by gateway')
    public get token() : string {
        return this.mAuthToken;
    }
    public set token(value: string) {
        if (this.mAuthToken == value) return;
        this.mAuthToken = value;
        this.changed('token');
    }

    @callable('set intensity')
    public deviceSetIntensity (
        @parameter('network name') network: string,
        @parameter('device id') deviceId: number,
        @parameter('target intensity, in percent (0 or between 0.1 and 100.0)') intensity: number,
        @parameter('fade time, in milliseconds', true) fading?: number
    ) : void {
        this.setIntensityREST(network, deviceId, intensity, fading);
    }
    @callable('set intensity')
    public groupSetIntensity (
        @parameter('network name') network: string,
        @parameter('group id') groupId: number,
        @parameter('target intensity, in percent (0 or between 0.1 and 100.0)') intensity: number,
        @parameter('fade time, in milliseconds', true) fading?: number
    ) : void {
        this.setIntensityREST(network, groupId + XIC_GROUP_OFFSET, intensity, fading);
    }

    @callable('recall scene')
    public deviceRecallScene (
        @parameter('network name') network: string,
        @parameter('device id') deviceId: number,
        @parameter('target scene number (an integer)') sceneId: number,
        @parameter('fade time, in milliseconds', true) fading?: number
    ) : Promise<void> {
        return this.recallSceneREST(network, deviceId, sceneId, fading);
    }
    @callable('recall scene')
    public groupRecallScene (
        @parameter('network name') network: string,
        @parameter('group id') groupId: number,
        @parameter('target scene number (an integer)') sceneId: number,
        @parameter('fade time, in milliseconds', true) fading?: number
    ) : Promise<void> {
        return this.recallSceneREST(network, groupId + XIC_GROUP_OFFSET, sceneId, fading);
    }

    @callable('add device to group')
    public groupAddDevice(
        @parameter('network name') network: string,
        @parameter('target device ID (cannot be a group or a sensor)') deviceId: number,
        @parameter('group number (an integer)') groupId: number,
    ) : Promise<void> {
        return this.setDeviceGroup(network, deviceId, groupId);
    }
    @callable('remove device from group')
    public groupRemoveDevice(
        @parameter('network name') network: string,
        @parameter('target device ID (cannot be a group or a sensor)') deviceId: number,
        @parameter('group number (an integer)') groupId: number,
    ) : Promise<void> {
        return this.unsetDeviceGroup(network, deviceId, groupId);
    }

    @callable('set scene for a device')
    public deviceSetScene (
        @parameter('network name') network: string,
        @parameter('target device ID (cannot be a group or a sensor)') deviceId: number,
        @parameter('target scene number (an integer)') sceneNumber: number,
        @parameter('target intensity, in percent (0 or between 0.1 and 100.0)') intensity: number,
        @parameter('fade time in milliseconds', true) fadeTime?: number,
        @parameter('delay in milliseconds', true) delayTime?: number
    ) : Promise<void> {
        return this.setDeviceScene(network, deviceId, sceneNumber, intensity, fadeTime, delayTime);
    }
    @callable('remove scene from device')
    public deviceRemoveScene (
        @parameter('network name') network: string,
        @parameter('target device ID (cannot be a group or a sensor)') deviceId: number,
        @parameter('target scene number (an integer)') sceneNumber: number
    ) : Promise<void> {
        return this.unsetDeviceScene(network, deviceId, sceneNumber);
    }


    private requestPoll(delay: number) {
  		if (!this.mPoller && this.mAlive) {
  			this.mPoller = wait(delay);
  			this.mPoller.then(() => {
  				this.mPoller = undefined;
  				if (this.mAuthToken) {
                    this.regularPoll();
                } else {
                    // no auth token: get auth token
                    this.authenticationPoll();
                }
  				this.requestPoll(3000);	// Set up to poll again soon
  			});
  		}
  	}

    private gotAuthCode(authCode: string) {
  		this.mAuthToken = authCode;
      // console.log(authCode);
  		this.mAuthorized = true;
  	}

  	private unauthorize() {
  		this.mAuthorized = false;
        this.mAuthToken = undefined;
  		// this.config = undefined;
  		console.warn("Unauthorized due to 401/403");
  	}

    private regularPoll() {
  		if (!this.devices)
  			this.getDevices();
  		else if (!this.groups)
  			this.getGroups();
        else if (!this.scenes)
            this.getScenes();
  		this.checkReadyToSend();
  	}

    private checkReadyToSend() {
  		if (
        this.devices &&
        this.groups &&
        this.scenes &&
        this.connected &&
        this.mAuthorized
      )
      {

      }
      // this.sendPendingCommands();
  	}

    // REST API CALLS   //

    //   View Permission API Calls    //

    private showDevicesREST () : Promise<string> {
        var url = this.mBaseURL + '/devices';
        return this.authorizedGet(url);
    }
    private showGroupsWithDevicesREST () : Promise<string> {
        var url = this.mBaseURL + '/groups';
        return this.authorizedGet(url);
    }
    private showScenesREST () : Promise<string> {
        var url = this.mBaseURL + '/scenes';
        return this.authorizedGet(url);
    }
    private getDeviceGroupsREST (network: string, deviceId: number) : Promise<XicGetDeviceGroupsResponse> {
        network = encodeURI(network);
        var url = this.mBaseURL + '/device/groups/' + network + '/' + deviceId;
        return new Promise<XicGetDeviceGroupsResponse>((resolve, reject) => {
            this.authorizedGet(url).
            then(result => {
                resolve(JSON.parse(result));
            }).catch(error => { reject(error) });
        });
    }
    private getDeviceScenesREST (network: string, deviceId: number) : Promise<XicGetDeviceScenesResponse> {
        network = encodeURI(network);
        var url = this.mBaseURL + '/device/scenes/' + network + '/' + deviceId;
        return new Promise<XicGetDeviceScenesResponse>((resolve, reject) => {
            this.authorizedGet(url).
            then(result => {
                resolve(JSON.parse(result));
            }).catch(error => { reject(error) });
        });
    }

    // Control Permission API Calls //

    private setIntensityREST (network: string, deviceId: number, intensity: number, fadeTime?: number) : void {
        network = encodeURI(network);
        var url = this.mBaseURL + '/device/setintensity/' + network + '/' + deviceId + '/' + intensity + '/' + (fadeTime ? fadeTime : '');
        this.authorizedGet(url).
        then(_result => {
            // nothing yet
        }).catch(_error => {
            // nothing either
        });
    }
    private recallSceneREST (network: string, deviceId: number, scene: number, fadeTime?: number) : Promise<void> {
        network = encodeURI(network);
        var url = this.mBaseURL + '/device/recallscene/' + network + '/' + deviceId + '/' + scene + '/' + (fadeTime ? fadeTime : '');
        return new Promise<void>((resolve, reject) => {
            this.authorizedGet(url).
            then(_result => {
                resolve();
            }).catch(error => {
                reject(error);
            });
        });
    }

    //    Configure Permission API Calls //


    private setDeviceGroupsREST (network: string, deviceId: number, groups: number[]) : Promise<XicSetDeviceGroupsResponse> {
        network = encodeURI(network);
        var url = this.mBaseURL + '/device/setgroups/' + network + '/' + deviceId;
        return new Promise<XicSetDeviceGroupsResponse>((resolve, reject) => {
            this.authorizedPut(url, JSON.stringify(groups)).
            then(result => {
                resolve(JSON.parse(result));
            }).catch(error => { reject(error) });
        });
    }
    private setDeviceScenesREST (network: string, deviceId: number, scenes: XicDeviceScene[]) : Promise<XicSetDeviceScenesResponse> {
        network = encodeURI(network);
        var url = this.mBaseURL + '/device/setscenes/' + network + '/' + deviceId;
        return new Promise<XicSetDeviceScenesResponse>((resolve, reject) => {
            this.authorizedPut(url, JSON.stringify(scenes)).
            then(result => {
                resolve(JSON.parse(result));
            }).catch(error => { reject(error) });
        });
    }


    private authorizedGet (url: string) : Promise<string> {
        const promise = new Promise<string>((resolve, reject) => {
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
    private authorizedPut (url: string, jsonData?: string) : Promise<string> {
        const promise = new Promise<string>((resolve, reject) => {
            this.createAuthorizedRequest(url).
            put(
                jsonData ? jsonData : ''
            ).then(response => {
                this.handleGetPutResponse(response, resolve, reject);
            }).catch(error => {
                this.requestFailed(error, reject);
            });
        });
        return promise;
    }
    private handleGetPutResponse (
        response: Response,
        resolve: (value?: string | Thenable<string>) => void,
        reject: (error?: any) => void
    ) : void {
        this.connected = true;
        if (response.status === 200) {
            resolve(response.data);
        } else if (response.status === 401 || response.status === 403) {
            // token likely invalid
            this.unauthorize();
            Xicato.handleRejection(reject, response.data);
        } else {
            Xicato.handleRejection(reject, response.data, true);
        }
    }
    static handleRejection (reject: (error?: any) => void, message: string = '', logConsoleWarn: boolean = false) : void {
        if (logConsoleWarn) console.warn(message);
        reject(message);
    }
    private createAuthorizedRequest(url: string) : Request {
        return SimpleHTTP.newRequest(url).header('Authorization', 'Bearer ' + this.mAuthToken);
    }


    private authenticationPoll() {
  		SimpleHTTP.newRequest(this.mBaseURL + 'api/token').
        header('Authorization', 'Basic ' + this.toBase64(this.mUsername + ':' + this.mPassword)).
        get().
        then(response=> {
  			this.connected = true;
  			if (response.status === 200) {
  				var authResponse: string = response.data;
  				if (authResponse && authResponse.length) {
                    // console.log('got auth response: ' + authResponse);
  					this.gotAuthCode(authResponse);
  				}
  			} else {
  				this.mAuthorized = false;
                if (response.status === 401) {
                    if (!this.mLoggedAuthFail) {
                        console.error('auth request failed: ' + response.status + ': ' + response.data);
                        this.mLoggedAuthFail = true;	// Log that error only once per session
                    }
                }
  				if (response.status === 403) {
  					if (!this.mLoggedAuthFail) {
  						console.error("enter correct username & password in Xicato config file")
  						this.mLoggedAuthFail = true;	// Log that error only once per session
  					}
  				}
  			}
  		}).catch(error => this.requestFailed(error));
  	}

  	private getDevices() {
  		this.showDevicesREST().
        then(result => {
            this.devices = JSON.parse(result);
            SimpleFile.write(this.devicesFileName, JSON.stringify(this.devices));
        });
  	}
    private getGroups() {
        this.showGroupsWithDevicesREST().
        then(result => {
            this.groups = JSON.parse(result);
            SimpleFile.write(this.groupsFileName, JSON.stringify(this.groups));
        });
    }
    private getScenes() {
        this.showScenesREST().
        then(result => {
            this.scenes = JSON.parse(result);
            SimpleFile.write(this.scenesFileName, JSON.stringify(this.scenes));
        });
    }

    /**
    add device to group
    */
    private setDeviceGroup(network: string, deviceId: number, groupId: number) : Promise<void> {
        return new Promise<void> ((resolve, reject) => {
            this.getDeviceGroupsREST(network, deviceId).
            then(result => {
                var deviceGroups = result.groups;
                if (deviceGroups.indexOf(groupId) === -1) {
                    if (deviceGroups.length < XIC_MAX_DEVICE_GROUPS) {
                        deviceGroups.push(groupId);
                        this.setDeviceGroupsREST(network, deviceId, deviceGroups).
                        then(_result => {
                            resolve();
                        }).catch(error => {reject(error)});
                    } else {
                        reject('can not add another group: device has already ' + deviceGroups.length + ' groups assigned');
                    }
                } else {
                    // group was already assigned
                    resolve();
                }
            }).catch(error => {reject(error)});
        });
    }
    /**
    remove device from group
    */
    private unsetDeviceGroup(network: string, deviceId: number, groupId: number) : Promise<void> {
        return new Promise<void> ((resolve, reject) => {
            this.getDeviceGroupsREST(network, deviceId).
            then(result => {
                var deviceGroups = result.groups;
                var indexOfGroupId = deviceGroups.indexOf(groupId);
                if (indexOfGroupId !== -1) {
                    deviceGroups.splice(indexOfGroupId, 1);
                    this.setDeviceGroupsREST(network, deviceId, deviceGroups).
                    then(_result => {
                        resolve();
                    }).catch(error => {reject(error)});
                } else {
                    // group was already NOT assigned
                    resolve();
                }
            }).catch(error => {reject(error)});
        });
    }
    /**
    add / change scene for a device
    */
    private setDeviceScene(network: string, deviceId: number, sceneNumber: number, intensity: number, fadeTime: number = 0, delayTime: number = 0) : Promise<void> {
        return new Promise<void> ((resolve, reject) => {
            this.getDeviceScenesREST(network, deviceId).
            then(result => {
                var deviceScenes = result.scenes;
                var scene = Xicato.findDeviceSceneById(sceneNumber, deviceScenes);
                if (scene) {
                    scene.intensity = intensity;
                    scene.fadeTime = fadeTime;
                    scene.delayTime = delayTime;
                } else {
                    if (deviceScenes.length < XIC_MAX_DEVICE_SCENES) {
                        scene = new XicDeviceScene();
                        scene.sceneNumber = sceneNumber;
                        scene.intensity = intensity;
                        scene.fadeTime = fadeTime;
                        scene.delayTime = delayTime;
                        deviceScenes.push(scene);
                    } else {
                        reject('can not add another scene: device has already ' + deviceScenes.length + ' scenes assigned');
                        return;
                    }
                }
                this.setDeviceScenesREST(network, deviceId, deviceScenes).
                then(_result => {
                    resolve();
                }).catch(error => {reject(error)});
            }).catch(error => {reject(error)});
        });
    }
    /**
    add / change scene for a device
    */
    private unsetDeviceScene(network: string, deviceId: number, sceneNumber: number) : Promise<void> {
        return new Promise<void> ((resolve, reject) => {
            this.getDeviceScenesREST(network, deviceId).
            then(result => {
                var deviceScenes = result.scenes;
                var indexOfSceneNumber = Xicato.findDeviceSceneIndexById(sceneNumber, deviceScenes);
                if (indexOfSceneNumber !== -1) {
                    deviceScenes.splice(indexOfSceneNumber, 1);
                    this.setDeviceScenesREST(network, deviceId, deviceScenes).
                    then(_result => {
                        resolve();
                    }).catch(error => {reject(error)});
                } else {
                    // group was already NOT assigned
                    resolve();
                }
            }).catch(error => {reject(error)});
        });
    }

    private static findDeviceSceneById (sceneNumber: number, deviceScenes: XicDeviceScene[]) : XicDeviceScene | null {
        for (let i = 0; i < deviceScenes.length; i++) {
            var scene = deviceScenes[i];
            if (scene.sceneNumber == sceneNumber) return scene;
        }
        return null;
    }
    private static findDeviceSceneIndexById (sceneNumber: number, deviceScenes: XicDeviceScene[]) : number {
        for (let i = 0; i < deviceScenes.length; i++) {
            var scene = deviceScenes[i];
            if (scene.sceneNumber == sceneNumber) return i;
        }
        return -1;
    }

    private requestFailed(error: string, reject?: (error?: any) => void) {
  		this.connected = false;
        if (reject) Xicato.handleRejection(reject, error, true);
  	}

    private onFinish () {
      this.mAlive = false;
      if (this.mPoller)	{
        // Stop any poll in flight
        this.mPoller.cancel();
      }
      if (this.mDeferredSender) {
        // Stop any deferred transmission
        this.mDeferredSender.cancel();
      }
    }

    // adapted from https://base64.guru/developers/javascript/examples/polyfill
    private toBase64 (data : string) : string {
      var len : number = data.length - 1;
      var i : number = -1;
      var b64 : string = '';

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

}

class XicatoSettings {
    public username : string = '';
    public password : string = '';
}

class XicDeviceBase {
    public "01. Device ID" : string;
    public "02. Name" : string | null;
    public "03. Device" : string | null;
    public  NetworkName : string | null;
}
class XicDeviceOrSensor extends XicDeviceBase {
    public "07. supply_voltage" : number | null;
    public "09. signal_strength" : number | null;
    public "10. status" : number | null;
    public "11. Last Update" : number | null;
    public "12. Adv Interval" : number | null;
}
/* Xicato REST API responses */
class XicDevice extends XicDeviceOrSensor {
    public "04. Intensity" : number;
    public "05. Power" : number | null;
    /** Integer */
    public "06. Tc temperature" : number;
    /** Nullable Integer */
    public "08. on_hours" : number | null;
}
class XicSensor extends XicDeviceOrSensor {
    /** Nullable Integer */
    public  "04. Lux" : number[];
    public  "05. Motion" : number[];
    /** Nullable Integer */
    public  "06. Temperature" : number | null;
    public  "08. Humidity" : number | null;
    public  "LuxHours" : number[];
}
class XicSwitchData {
    public last_press: number | null;
    public last_release: number | null;
    public state: boolean;
}
class XicSwitch extends XicDeviceBase {
    public "04. Button Data" : XicSwitchData[];
    /** Nullable Integer */
    public "05. PCB temperature" : number | null;
    public "06. supply_voltage" : number | null;
    /** Nullable Integer */
    public "07. signal_strength" : number | null;
    /** Nullable Integer */
    public "08. status" : number | null;
    public "09. Last Update" : number | null;
    public "10. Last Press" : number | null;
}
class XicDevices {
    public network : string | null;
    public networks : string[];
    public connectable : boolean;
    public devices : XicDevice[];
    public sensors : XicSensor[];
    public switches : XicSwitch[];
    public temperature : number;
}
class XicGroupWithDevices {
    public devices: XicDevice[];
    /** integer; null indicates devices without any group membership */
    public groupId : number | null;
    public groupName : string;
}
class XicGroupsWithDevices {
    public network : string | null;
    public networks : string[];
    public connectable : boolean;
    public groups : XicGroupWithDevices[];
    public temperature : number;
}
class XicScene {
    public name : string | null;
    /** integer */
    public number : number;
    public network : string | null;
}
class XicDeviceScene {
    /** Integer, 0 < n < 65535 */
    public sceneNumber : number;
    /** Float, 0.0 <= m <= 100.0 */
    public intensity : number;
    /** Integer, n >= 0 */
    public delayTime : number;
    /** Integer, 0 <= n <= 1.44e7 */
    public fadeTime : number;
}
class XicDeviceResponse {
    public device_id: string;
}
class XicDeviceSetResponse extends XicDeviceResponse {
    public result: boolean;
}
class XicGetDeviceGroupsResponse extends XicDeviceResponse {
    public network : string;
    public groups : number[];
}
class XicSetDeviceGroupsResponse extends XicDeviceSetResponse {
    public groups : number[];
}
class XicGetDeviceScenesResponse extends XicDeviceResponse {
    public scenes : XicDeviceScene[];
}
class XicSetDeviceScenesResponse extends XicDeviceSetResponse {
    public scenes : XicDeviceScene[];
}
class XicGetDeviceFirmwareAvailableResponse extends XicDeviceResponse {
    public current : string;
    public available : number[];
}
