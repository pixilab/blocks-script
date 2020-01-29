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

    public constructor(private socket: NetworkTCP) {
        super(socket);

        // no auto-connect needed since REST API


        const settingsFileName = 'xicato.config/' + socket.name + '.config';

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

    private requestPoll(delay: number) {
  		if (!this.mPoller && this.mAlive) {
  			this.mPoller = wait(delay);
  			this.mPoller.then(() => {
  				this.mPoller = undefined;
  				if (this.mAuthToken) {
            this.regularPoll();
          }
  				else {
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
  		console.warn("Unauthorized due to 403");
  	}

    private regularPoll() {
  		// if (!this.devices)
  		// 	this.getDevices();
  		// else if (!this.groups)
  		// 	this.getGroups();
  		this.checkReadyToSend();
  	}

    private checkReadyToSend() {
  		if (
        // this.devices &&
        // this.groups &&
        this.connected &&
        this.mAuthorized
      )
      {

      }
  			// this.sendPendingCommands();
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
  						this.gotAuthCode(authResponse);
  				}
  			} else {
  				this.mAuthorized = false;
  				if (response.status === 403) {
  					if (!this.mLoggedAuthFail) {
  						console.error("enter correct username & password in Xicato config file")
  						this.mLoggedAuthFail = true;	// Log that error only once per session
  					}
  				}
  			}
  		}).catch(error => this.requestFailed(error));
  	}

  	// private getDevices() {
  	// 	SimpleHTTP.newRequest(this.getKeyedUrlBase() + 'lights').get().then(response => {
  	// 		this.connected = true;
  	// 		if (response.status === 200) {
  	// 			// var devices: Dictionary<Device> = JSON.parse(response.data);
  	// 			// if (devices) this.devices = new NamedItems<Device>(devices);
  	// 			// else console.warn("Missing lights data");
  	// 		} else {
  	// 			console.warn("Lights error response", response.status);
  	// 			if (response.status === 403) this.unauthorize();
  	// 		}
  	// 	}).catch(error => this.requestFailed(error));
  	// }

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

/* Xicato REST API responses */
