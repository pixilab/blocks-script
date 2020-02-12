/*
	Driver for Xicato Intelligent Gateway, based on Xicato Intelligent Gateway API v35 2018-10-24
  (PDF)

 	Copyright (c) 2019 No Parking Production ApS, Denmark (https://noparking.dk). All Rights Reserved.
	Created by: Samuel Walz <mail@samwalz.com>
  Version: 0.1
  Features:
  - get auth token via username & password

  (losely based on the DeConz.ts driver)
 */

const ASCII = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

import { NetworkTCP } from "system/Network";
import {SimpleHTTP} from "system/SimpleHTTP";
import { SimpleFile } from "system/SimpleFile";
import { Driver } from "system_lib/Driver";
import { callable, max, min, parameter, property, driver } from "system_lib/Metadata";

const XICATO_CONFIG_BASE_PATH = 'xicato.config';

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
    private groups: XicGroups;

    private readonly devicesFileName: string;
    private readonly groupsFileName: string;

    public constructor(private socket: NetworkTCP) {
        super(socket);

        // no auto-connect needed since REST API


        const settingsFileName = XICATO_CONFIG_BASE_PATH + '/' + socket.name + '.config';
        this.devicesFileName = XICATO_CONFIG_BASE_PATH + '/' + socket.name + '/devices.json';
        this.groupsFileName = XICATO_CONFIG_BASE_PATH + '/' + socket.name + '/groups.json';


        // try read configuration. if not present, write example file
    		SimpleFile.read(settingsFileName).then(readValue => {
          var settings : XicatoSettings = JSON.parse(readValue);
          this.mUsername = settings.username;
          this.mPassword = settings.password;

          this.mAlive = true;
      		this.mBaseURL = 'http://' + socket.address + ':' + socket.port + '/';

          if (socket.enabled) {
      			socket.subscribe('finish', sender => {
      				this.onFinish();
      			});
      			this.requestPoll(100);
      		}

    		}).catch(error => {
    			console.warn("Can't read file", settingsFileName, error);
                SimpleFile.write(settingsFileName, JSON.stringify(new XicatoSettings()));
    		});

    }

    @property('Connected successfully to device', true)
  	public get connected(): boolean {
  		return this.mConnected;
  	}
  	public set connected(value: boolean) {
      if (this.mConnected == value) return;
      this.mConnected = value;
      this.changed('connected');
  		// this.checkReadyToSend();
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

    @callable('recall a scene')
    public recallScene (
        @parameter('network name') network: string,
        @parameter('group id') groupId: number,
        @parameter('target scene number (an integer)') sceneId: number,
        @parameter('fade time, in milliseconds', true) fading?: number
    ) : Promise<void> {
        return this.recallSceneREST(network, groupId, sceneId, fading);
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
  		this.checkReadyToSend();
  	}

    private checkReadyToSend() {
  		if (
        this.devices &&
        this.groups &&
        this.connected &&
        this.mAuthorized
      )
      {

      }
      // this.sendPendingCommands();
  	}

    private recallSceneREST (network: string, group: number, scene: number, fading?: number) : Promise<void> {
        var deviceId : number = 49152 + group;
        network = encodeURI(network);
        var url = this.mBaseURL + '/device/recallscene/' + network + '/' + deviceId + '/' + scene + '/' + (fading ? fading : '');
        return new Promise<void>((resolve, reject) => {
            this.authorizedGet(url)
            .then(_result => {
                resolve();
            }).catch(error => {
                console.warn(error);
                reject(error);
            });
        });
    }

    private showDevicesREST () : Promise<string> {
        var url = this.mBaseURL + '/devices';
        return this.authorizedGet(url);
    }

    private showGroupsREST () : Promise<string> {
        var url = this.mBaseURL + '/groups';
        return this.authorizedGet(url);
    }

    private authorizedGet (url: string) : Promise<string> {
        const promise = new Promise<string>((resolve, reject) => {
            SimpleHTTP.newRequest(url).
            header('Authorization', 'Bearer ' + this.mAuthToken).
            get().
            then(response => {
                this.connected = true;
                if (response.status === 200) {
                    resolve(response.data);
                } else if (response.status === 401 || response.status === 403) {
                    // token likely invalid
                    this.unauthorize();
                    reject(response.data);
                } else {
                    console.warn(response.status + ': ' + response.data);
                    reject(response.data);
                }
            }).catch(error => {
                this.requestFailed(error);
                reject();
            });
        });
        return promise;
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
  		this.showDevicesREST()
        .then(result => {
            this.devices = JSON.parse(result);
            // thought: instead of stringify, one could also just store the response
            SimpleFile.write(this.devicesFileName, JSON.stringify(this.devices));
        }).catch(error => {
            console.warn(error);
        });
  	}
    private getGroups() {
        this.showGroupsREST()
        .then(result => {
            this.groups = JSON.parse(result);
            // thought: instead of stringify, one could also just store the response
            SimpleFile.write(this.groupsFileName, JSON.stringify(this.groups));
        }).catch(error => {
            console.warn(error);
        });;
    }

    private requestFailed(error: string) {
  		this.connected = false;
  		console.warn(error);
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
class XicGroup {
    public devices: XicDevice[];
    /** integer; null indicates devices without any group membership */
    public groupId : number | null;
    public groupName : string;
}
class XicGroups {
    public network : string | null;
    public networks : string[];
    public connectable : boolean;
    public groups : XicGroup[];
    public temperature : number;
}
