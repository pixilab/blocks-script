var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
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
define(["require", "exports", "../system/SimpleProcess", "../system/Spot", "../system_lib/Metadata", "../system_lib/Script"], function (require, exports, SimpleProcess_1, Spot_1, Metadata_1, Script_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WakeOnLan = void 0;
    var VERSION = '0.1.0';
    var MAC_ID_PREFIX = 'MAC_';
    var WakeOnLan = (function (_super) {
        __extends(WakeOnLan, _super);
        function WakeOnLan(env) {
            var _this = _super.call(this, env) || this;
            var processBuilder = SimpleProcess_1.SimpleProcess.create('which');
            processBuilder.addArgument('wakeonlan');
            var process = processBuilder.start();
            process.promise.then(function (value) {
                var path = value.replace(/(\r\n|\n|\r)/gm, '');
                console.log('path:"' + path + '"');
                WakeOnLan.wakeonlanPath = path;
            }).catch(function (error) {
                console.log("Failed using 'which' to locate wakeonlan - using default at", WakeOnLan.wakeonlanPath, error, process.fullStdErr, process.fullStdOut);
            });
            return _this;
        }
        WakeOnLan.prototype.wakeSpot = function (spotPath, ip) {
            var spot = Spot_1.Spot[spotPath];
            if (spot.isOfTypeName('DisplaySpot')) {
                var displaySpot = spot;
                var id = displaySpot.identity;
                if (id.indexOf(MAC_ID_PREFIX) == 0) {
                    var mac = id.substr(MAC_ID_PREFIX.length).replace(/(.{2})/g, "$1:").slice(0, 17);
                    var process = WakeOnLan.wakeOnLan(mac, ip);
                    process.promise.catch(function (error) {
                        return console.error("Failed running wakeonlan command line program", error);
                    });
                }
                else
                    console.error("Can't get MAC address from spot ID", id);
            }
        };
        WakeOnLan.prototype.wakeUp = function (mac, ip) {
            var process = WakeOnLan.wakeOnLan(mac, ip);
            process.promise.catch(function (error) {
                console.error("Failed running wakeonlan command line program", error);
            });
        };
        WakeOnLan.wakeOnLan = function (mac, ip) {
            var processBuilder = SimpleProcess_1.SimpleProcess.create(this.wakeonlanPath);
            if (ip) {
                processBuilder.addArgument('-i' + ip);
                processBuilder.addArgument('-p9');
            }
            processBuilder.addArgument(mac);
            return processBuilder.start();
        };
        WakeOnLan.wakeonlanPath = '/usr/local/bin/wakeonlan';
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
        return WakeOnLan;
    }(Script_1.Script));
    exports.WakeOnLan = WakeOnLan;
});
