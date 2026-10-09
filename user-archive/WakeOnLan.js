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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WakeOnLan = void 0;
const VERSION = '0.1.0';
const SimpleProcess_1 = require("../system/SimpleProcess");
const Spot_1 = require("../system/Spot");
const Metadata_1 = require("../system_lib/Metadata");
const Script_1 = require("../system_lib/Script");
const MAC_ID_PREFIX = 'MAC_';
class WakeOnLan extends Script_1.Script {
    static wakeonlanPath = '/usr/local/bin/wakeonlan';
    constructor(env) {
        super(env);
        const processBuilder = SimpleProcess_1.SimpleProcess.create('which');
        processBuilder.addArgument('wakeonlan');
        const process = processBuilder.start();
        process.promise.then((value) => {
            const path = value.replace(/(\r\n|\n|\r)/gm, '');
            console.log('path:"' + path + '"');
            WakeOnLan.wakeonlanPath = path;
        }).catch((error) => {
            console.log("Failed using 'which' to locate wakeonlan - using default at", WakeOnLan.wakeonlanPath, error, process.fullStdErr, process.fullStdOut);
        });
    }
    wakeSpot(spotPath, ip) {
        const spot = Spot_1.Spot[spotPath];
        if (spot.isOfTypeName('DisplaySpot')) {
            const displaySpot = spot;
            const id = displaySpot.identity;
            if (id.indexOf(MAC_ID_PREFIX) == 0) {
                const mac = id.substr(MAC_ID_PREFIX.length).replace(/(.{2})/g, "$1:").slice(0, 17);
                const process = WakeOnLan.wakeOnLan(mac, ip);
                process.promise.catch((error) => console.error("Failed running wakeonlan command line program", error));
            }
            else
                console.error("Can't get MAC address from spot ID", id);
        }
    }
    wakeUp(mac, ip) {
        const process = WakeOnLan.wakeOnLan(mac, ip);
        process.promise.catch((error) => {
            console.error("Failed running wakeonlan command line program", error);
        });
    }
    static wakeOnLan(mac, ip) {
        const processBuilder = SimpleProcess_1.SimpleProcess.create(this.wakeonlanPath);
        if (ip) {
            processBuilder.addArgument('-i' + ip);
            processBuilder.addArgument('-p9');
        }
        processBuilder.addArgument(mac);
        return processBuilder.start();
    }
}
exports.WakeOnLan = WakeOnLan;
__decorate([
    (0, Metadata_1.callable)('Wake up Display Spot'),
    __param(0, (0, Metadata_1.parameter)('Full dot-separated path to a Display Spot')),
    __param(1, (0, Metadata_1.parameter)('Destination IP (e.g., subnet-specific broadcast address)', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], WakeOnLan.prototype, "wakeSpot", null);
__decorate([
    (0, Metadata_1.callable)('Wake up device at specified MAC address'),
    __param(0, (0, Metadata_1.parameter)('MAC address of device')),
    __param(1, (0, Metadata_1.parameter)('Destination IP (e.g., subnet-specific broadcast address)', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], WakeOnLan.prototype, "wakeUp", null);
