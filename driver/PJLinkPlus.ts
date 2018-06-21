/*
 * Created 2018 by Samuel Walz
 */
import {NetworkTCP} from "system/Network";
import {PJLink} from "driver/PJLink";
import {BoolState, NetworkProjector, NumState} from "driver/NetworkProjector";
import * as Meta from "system_lib/Metadata";

/**
 Manage a PJLink projector, accessed through a provided NetworkTCPDevice connection.
 */
@Meta.driver('NetworkTCP', { port: 4352 })
export class PJLinkPlus extends PJLink {

    private fetchingDeviceInfo: Promise<void>;
    private fetchDeviceInfoResolver: (value?: any) => void;

    private _name : string;
    private _manufactureName : string;
    private _productName : string;
    private _otherInformation : string;
    private _lampCount : number;
    private _lampOneHours : number;
    private _lampTwoHours : number;
    private _lampThreeHours : number;
    private _lampFourHours : number;

    private _customRequestResult : string;

	constructor(socket: NetworkTCP) {
		super(socket);
	}

    @Meta.callable("Refresh device information")
    public fetchDeviceInfo () : Promise<void> {
        if (!this.fetchingDeviceInfo) {
            this.fetchingDeviceInfo = new Promise<void>((resolve, reject) => {
                this.fetchDeviceInfoResolver = resolve;
                wait(30000).then(()=> {
                    reject("Timeout");
                    delete this.fetchDeviceInfo;
                    delete this.fetchDeviceInfoResolver;
                });
            });
        }
        this.fetchInfoName();
        return this.fetchingDeviceInfo;
    }

    @Meta.property("Projector/Display name (NAME)")
    public get name () : string {
        return this._name;
    }

    @Meta.property("Manufacture name (INF1)")
    public get manufactureName () : string {
        return this._manufactureName;
    }

    @Meta.property("Product name (INF2)")
    public get productName () : string {
        return this._productName;
    }

    @Meta.property("Other information (INFO)")
    public get otherInformation () : string {
        return this._otherInformation;
    }

    @Meta.property("Lamp count")
    public get lampCount (): number {
        return this._lampCount;
    }

    @Meta.property("Lamp one: lighting hours")
    public get lampOneHours (): number {
        return this._lampOneHours;
    }
    @Meta.property("Lamp two: lighting hours")
    public get lampTwoHours (): number {
        return this._lampTwoHours;
    }
    @Meta.property("Lamp three: lighting hours")
    public get lampThreeHours (): number {
        return this._lampThreeHours;
    }
    @Meta.property("Lamp four: lighting hours")
    public get lampFourHours (): number {
        return this._lampFourHours;
    }

    private fetchInfoName () : void {
        this.request('NAME').then(
            reply => {
                this._name = reply;
                this.fetchInfoManufactureName();
            },
            error => {
                this.fetchInfoManufactureName();
            }
        );
    }
    private fetchInfoManufactureName () : void {
        this.request('INF1').then(
            reply => {
                this._manufactureName = reply;
                this.fetchInfoProductName();
            },
            error => {
                this.fetchInfoProductName();
            }
        );
    }
    private fetchInfoProductName () : void {
        this.request('INF2').then(
            reply => {
                this._productName = reply;
                this.fetchInfoOther();
            },
            error => {
                this.fetchInfoOther();
            }
        );
    }
    private fetchInfoOther () : void {
        this.request('INFO').then(
            reply => {
                this._otherInformation = reply;
                this.fetchInfoLamp();
            },
            error => {
                this.fetchInfoLamp();
            }
        );
    }
    private fetchInfoLamp () : void {
        this.request('LAMP').then(
            reply => {
                var lampData = reply.split(' ');
                this._lampCount = lampData.length / 2;
                if (this._lampCount >= 1) {
                    this._lampOneHours = parseInt(lampData[0]);
                }
                if (this._lampCount >= 2) {
                    this._lampTwoHours = parseInt(lampData[2]);
                }
                if (this._lampCount >= 3) {
                    this._lampOneHours = parseInt(lampData[4]);
                }
                if (this._lampCount >= 4) {
                    this._lampTwoHours = parseInt(lampData[6]);
                }
                this.fetchInfoResolve();
            },
            error => {
                this.fetchInfoResolve();
            }
        );
    }
    private fetchInfoResolve () : void {
        if (this.fetchDeviceInfoResolver) {
            this.fetchDeviceInfoResolver();
            console.info("got device info");
            delete this.fetchingDeviceInfo;
            delete this.fetchDeviceInfoResolver;
        }
    }


    @Meta.property("custom request response")
    public get customRequestResponse () : string {
        return this._customRequestResult;
    }

    @Meta.callable("Send custom request")
    public customRequest (question: string, param?: string) : Promise<void> {
        var request = this.request(question, param == "" ? undefined : param).then(
			reply => {
				this._customRequestResult = reply;
			},
			error => {
				this._customRequestResult = "request failed: " + error;
			}
		);
        return request;
    }


}
