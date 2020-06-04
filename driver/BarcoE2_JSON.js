var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BarcoE2_JSON = void 0;
    var BarcoE2_JSON = (function (_super) {
        __extends(BarcoE2_JSON, _super);
        function BarcoE2_JSON(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            socket.autoConnect();
            return _this;
        }
        BarcoE2_JSON.prototype.activatePreset = function (preset, preview) {
            if (preview)
                this.mPreview = preset;
            else
                this.mLive = preset;
            return this.send(new Command("activatePreset", { id: preset, type: preview ? 0 : 1 }));
        };
        Object.defineProperty(BarcoE2_JSON.prototype, "preview", {
            get: function () {
                return this.mPreview;
            },
            set: function (preset) {
                this.activatePreset(preset, true);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(BarcoE2_JSON.prototype, "live", {
            get: function () {
                return this.mLive;
            },
            set: function (preset) {
                this.activatePreset(preset, false);
            },
            enumerable: false,
            configurable: true
        });
        BarcoE2_JSON.prototype.send = function (cmd) {
            var cmdJson = JSON.stringify(cmd);
            return this.socket.sendText(cmdJson);
        };
        __decorate([
            Metadata_1.callable("Load a preset into Live or Preview"),
            __param(0, Metadata_1.parameter("Preset number")),
            __param(1, Metadata_1.parameter("Load into Preview", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Boolean]),
            __metadata("design:returntype", void 0)
        ], BarcoE2_JSON.prototype, "activatePreset", null);
        __decorate([
            Metadata_1.property("Current preview preset"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], BarcoE2_JSON.prototype, "preview", null);
        __decorate([
            Metadata_1.property("Current live preset"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], BarcoE2_JSON.prototype, "live", null);
        BarcoE2_JSON = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 9999 }),
            __metadata("design:paramtypes", [Object])
        ], BarcoE2_JSON);
        return BarcoE2_JSON;
    }(Driver_1.Driver));
    exports.BarcoE2_JSON = BarcoE2_JSON;
    var Command = (function () {
        function Command(method, params) {
            this.method = method;
            this.jsonrpc = "2.0";
            this.id = Command.nextId++;
            this.params = params;
        }
        Command.nextId = 1;
        return Command;
    }());
});
