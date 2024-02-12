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
define(["require", "exports", "../system_lib/Driver", "../system_lib/Metadata"], function (require, exports, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AllenHeathAHM = void 0;
    var AllenHeathAHM = (function (_super) {
        __extends(AllenHeathAHM, _super);
        function AllenHeathAHM(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.isConnected = false;
            _this.receiveBuffer = [];
            socket.autoConnect(true);
            socket.subscribe('bytesReceived', function (sender, message) { return _this.onBytesReceived(message.rawData); });
            socket.subscribe('connect', function (sender, message) { return _this.connected = socket.connected; });
            return _this;
        }
        Object.defineProperty(AllenHeathAHM.prototype, "preset", {
            get: function () {
                return this.activePreset;
            },
            set: function (presetNumber) {
                this.sendRecallPreset(presetNumber);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AllenHeathAHM.prototype, "connected", {
            get: function () {
                return this.isConnected;
            },
            set: function (isConnected) {
                this.isConnected = isConnected;
            },
            enumerable: false,
            configurable: true
        });
        AllenHeathAHM.prototype.onBytesReceived = function (bytes) {
            this.receiveBuffer = this.receiveBuffer.concat(bytes);
            while (this.receiveBuffer.length > 4) {
                var presetRecallResponse = this.parsePresetRecallResponse(this.receiveBuffer);
                if (presetRecallResponse !== undefined) {
                    this.activePreset = presetRecallResponse;
                    this.changed('preset');
                    this.receiveBuffer = this.receiveBuffer.slice(5);
                }
                this.receiveBuffer.shift();
            }
        };
        AllenHeathAHM.prototype.sendRecallPreset = function (presetNumber) {
            var _a = this.toBankAndPreset(presetNumber), bank = _a.bank, preset = _a.preset;
            return this.socket.sendBytes([0xB0, 0x00, bank, 0xC0, preset]);
        };
        AllenHeathAHM.prototype.parsePresetRecallResponse = function (bytes) {
            if (bytes[0] == 0xB0 &&
                bytes[1] == 0x00 &&
                bytes[3] == 0xC0)
                return this.toPresetNumber(bytes[2], bytes[4]);
            return undefined;
        };
        AllenHeathAHM.prototype.toBankAndPreset = function (presetNumber) {
            var presetIndex = presetNumber - 1;
            var bank = Math.floor(presetIndex / 128);
            var preset = presetIndex % 128;
            return { bank: bank, preset: preset };
        };
        AllenHeathAHM.prototype.toPresetNumber = function (bank, preset) {
            var presetIndex = bank * 128 + preset;
            return presetIndex + 1;
        };
        __decorate([
            (0, Metadata_1.property)("Preset number to recall"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], AllenHeathAHM.prototype, "preset", null);
        __decorate([
            (0, Metadata_1.property)("Successfully connected to device", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], AllenHeathAHM.prototype, "connected", null);
        AllenHeathAHM = __decorate([
            (0, Metadata_1.driver)('NetworkTCP', { port: 51325 }),
            __metadata("design:paramtypes", [Object])
        ], AllenHeathAHM);
        return AllenHeathAHM;
    }(Driver_1.Driver));
    exports.AllenHeathAHM = AllenHeathAHM;
});
