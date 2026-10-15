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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetioPowerBox = void 0;
const Driver_1 = require("../system_lib/Driver");
const SimpleHTTP_1 = require("../system/SimpleHTTP");
const Metadata_1 = require("../system_lib/Metadata");
let NetioPowerBox = class NetioPowerBox extends Driver_1.Driver {
    socket;
    mConnected = false;
    outputs = [];
    constructor(socket) {
        super(socket);
        this.socket = socket;
        SimpleHTTP_1.SimpleHTTP.newRequest(`http://${socket.address}/netio.json`)
            .get().then((result) => {
            this.connected = true;
            const parsedResponse = JSON.parse(result.data);
            this.outputs = parsedResponse.Outputs;
        }).catch(error => this.requestFailed(error));
        let noOfOutlets = parseInt(socket.options) | 2;
        for (let i = 1; i <= noOfOutlets; i++)
            this.createOutlets(i);
    }
    requestFailed(error) {
        this.connected = false;
        console.warn(error);
    }
    get connected() {
        return this.mConnected;
    }
    set connected(value) {
        this.mConnected = value;
    }
    createOutlets(outletNumber) {
        this.property(`Power outlet ${outletNumber}`, { type: 'Boolean', description: 'Power on outlet ' + outletNumber }, val => {
            if (val !== undefined) {
                let theOutlet1 = this.outputs.filter(x => x.ID === 1)[0];
                theOutlet1.State = val ? 1 : 0;
                SimpleHTTP_1.SimpleHTTP.newRequest(`http://${this.socket.address}/netio.json`).
                    post(`{ "Outputs":[ { "ID":"${outletNumber}", "Action":"${val ? 1 : 0}" } ] }`, 'application/json').then(result => {
                    this.connected = true;
                    let jsonObj = JSON.parse(result.data);
                    this.outputs = jsonObj.Outputs;
                    this.changed(`Power outlet ${outletNumber}`);
                }).catch(error => this.requestFailed(error));
            }
            const state = this.outputs.filter(x => x.ID == outletNumber)[0];
            if (state)
                return state.State == 1 ? true : false;
        });
    }
};
exports.NetioPowerBox = NetioPowerBox;
__decorate([
    (0, Metadata_1.property)("True if communication attempt succeeded", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], NetioPowerBox.prototype, "connected", null);
exports.NetioPowerBox = NetioPowerBox = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 80 }),
    __metadata("design:paramtypes", [Object])
], NetioPowerBox);
