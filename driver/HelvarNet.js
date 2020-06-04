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
    exports.HelvarNet = void 0;
    var HelvarNet = (function (_super) {
        __extends(HelvarNet, _super);
        function HelvarNet(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            socket.autoConnect();
            return _this;
        }
        HelvarNet.prototype.recallScene = function (group, scene, block, fadeTime) {
            if (block === undefined)
                block = 1;
            var cmd = "V:1,C:11,G:" + group
                + ",B:" + block
                + ",S:" + scene
                + fadeParam(fadeTime);
            this.sendCmd(cmd);
        };
        HelvarNet.prototype.sceneAbsAdjust = function (proportion, group, fadeTime) {
            var propStr = Math.round(proportion * 100).toString();
            var cmd = "V:1,C:15,P:" + propStr
                + ",G:" + group
                + fadeParam(fadeTime);
            this.sendCmd(cmd);
        };
        HelvarNet.prototype.sceneRelAdjust = function (proportion, group, fadeTime) {
            var propStr = Math.round(proportion * 100).toString();
            var cmd = "V:1,C:17,P:" + propStr
                + ",G:" + group
                + fadeParam(fadeTime);
            this.sendCmd(cmd);
        };
        HelvarNet.prototype.levelToDevice = function (level, address, fadeTime) {
            var levelStr = Math.round(level * 100).toString();
            var cmd = "V:1,C:14,L:" + levelStr + ",@" + address + fadeParam(fadeTime);
            this.sendCmd(cmd);
        };
        HelvarNet.prototype.sendCmd = function (cmd) {
            cmd = '>' + cmd + '#';
            this.socket.sendText(cmd, null);
        };
        __decorate([
            Metadata_1.callable("Recall scene number on group"),
            __param(0, Metadata_1.parameter("Group to control")),
            __param(1, Metadata_1.parameter("Scene number to recall")),
            __param(2, Metadata_1.parameter("Scene block", true)),
            __param(3, Metadata_1.parameter("Transition time, in seconds", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], HelvarNet.prototype, "recallScene", null);
        __decorate([
            Metadata_1.callable("Adjust curr scene of group up or down"),
            __param(0, Metadata_1.parameter("Proportion, -1..1")),
            __param(1, Metadata_1.parameter("Group to control, 1..16383")),
            __param(2, Metadata_1.parameter("Transition time, in seconds", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], HelvarNet.prototype, "sceneAbsAdjust", null);
        __decorate([
            Metadata_1.callable("Adjust curr scene of group up or down incrementally"),
            __param(0, Metadata_1.parameter("Proportion, -1..1")),
            __param(1, Metadata_1.parameter("Group to control, 1..16383")),
            __param(2, Metadata_1.parameter("Transition time, in seconds", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number, Number]),
            __metadata("design:returntype", void 0)
        ], HelvarNet.prototype, "sceneRelAdjust", null);
        __decorate([
            Metadata_1.callable("Apply brightness level to a single device"),
            __param(0, Metadata_1.parameter("Brightness, 0..1")),
            __param(1, Metadata_1.parameter("Target device, as '1.2.3.4'")),
            __param(2, Metadata_1.parameter("Transition time, in seconds", true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, String, Number]),
            __metadata("design:returntype", void 0)
        ], HelvarNet.prototype, "levelToDevice", null);
        HelvarNet = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 50000 }),
            __metadata("design:paramtypes", [Object])
        ], HelvarNet);
        return HelvarNet;
    }(Driver_1.Driver));
    exports.HelvarNet = HelvarNet;
    function fadeParam(timeInSeconds) {
        if (timeInSeconds === undefined)
            timeInSeconds = 0;
        return ",F:" + Math.round(timeInSeconds * 100).toString();
    }
});
