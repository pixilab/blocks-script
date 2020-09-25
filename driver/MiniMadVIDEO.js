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
define(["require", "exports", "system_lib/Metadata", "./OSCviaUDP"], function (require, exports, Meta, OSCviaUDP_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MiniMadVIDEO = void 0;
    var MiniMadVIDEO = (function (_super) {
        __extends(MiniMadVIDEO, _super);
        function MiniMadVIDEO() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        MiniMadVIDEO.prototype.pause = function () {
            this.sendMessage('/pause');
        };
        MiniMadVIDEO.prototype.play = function () {
            this.sendMessage('/play');
        };
        MiniMadVIDEO.prototype.replay = function () {
            this.sendMessage('/replay');
        };
        MiniMadVIDEO.prototype.previousMedia = function () {
            this.sendMessage('/previous_media');
        };
        MiniMadVIDEO.prototype.nextMedia = function () {
            this.sendMessage('/next_media');
        };
        MiniMadVIDEO.prototype.setPlaybackMode = function (modeIndex) {
            this.sendMessage('/set_playback_mode/' + modeIndex);
        };
        MiniMadVIDEO.prototype.setMediaByName = function (name) {
            this.sendMessage('/set_media_by_name/' + name);
        };
        MiniMadVIDEO.prototype.setMediaByIndex = function (index) {
            this.sendMessage('/set_media_by_idex/' + index);
        };
        MiniMadVIDEO.prototype.setImageTime = function (displayTime) {
            this.sendMessage('/set_image_time', Math.floor(displayTime).toString());
        };
        MiniMadVIDEO.prototype.setMasterAudioLevel = function (audioLevel) {
            var audioLevelString = audioLevel.toString();
            if (audioLevelString.indexOf('.') === -1)
                audioLevelString += '.0';
            this.sendMessage('/set_master_audio_level', audioLevelString);
        };
        MiniMadVIDEO.prototype.setMasterAudioLuminosity = function (luminosityLevel, setForAll) {
            var luminosityLevelString = luminosityLevel.toString();
            if (luminosityLevelString.indexOf('.') === -1)
                luminosityLevelString += '.0';
            this.sendMessage('/set_master_luminosity' + (setForAll ? '/all' : ''), luminosityLevelString);
        };
        __decorate([
            Meta.callable('pauses the playback'),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], MiniMadVIDEO.prototype, "pause", null);
        __decorate([
            Meta.callable('starts the playback after a pause'),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], MiniMadVIDEO.prototype, "play", null);
        __decorate([
            Meta.callable('restarts the current media'),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], MiniMadVIDEO.prototype, "replay", null);
        __decorate([
            Meta.callable('previous media'),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], MiniMadVIDEO.prototype, "previousMedia", null);
        __decorate([
            Meta.callable('next media'),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], MiniMadVIDEO.prototype, "nextMedia", null);
        __decorate([
            Meta.callable('set playback mode'),
            __param(0, Meta.parameter('playback mode index')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], MiniMadVIDEO.prototype, "setPlaybackMode", null);
        __decorate([
            Meta.callable('set the current media by name, example: "machine-1.mov" will play movie called machine-1 (on miniMAD movies have the .mov extension, images the .png extension)'),
            __param(0, Meta.parameter('media name')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], MiniMadVIDEO.prototype, "setMediaByName", null);
        __decorate([
            Meta.callable('set the current media by index'),
            __param(0, Meta.parameter('media index')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], MiniMadVIDEO.prototype, "setMediaByIndex", null);
        __decorate([
            Meta.callable('change the image display time in seconds'),
            __param(0, Meta.parameter('display time')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], MiniMadVIDEO.prototype, "setImageTime", null);
        __decorate([
            Meta.callable('master audio-level for the targeted MiniMad'),
            __param(0, Meta.parameter('audio level')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], MiniMadVIDEO.prototype, "setMasterAudioLevel", null);
        __decorate([
            Meta.callable('master luminosity for targeted or all connected MiniMads'),
            __param(0, Meta.parameter('luminosity level')),
            __param(1, Meta.parameter('set for all connected MiniMads? (default: false)', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Boolean]),
            __metadata("design:returntype", void 0)
        ], MiniMadVIDEO.prototype, "setMasterAudioLuminosity", null);
        MiniMadVIDEO = __decorate([
            Meta.driver('NetworkUDP', { port: 8010 })
        ], MiniMadVIDEO);
        return MiniMadVIDEO;
    }(OSCviaUDP_1.OSCviaUDP));
    exports.MiniMadVIDEO = MiniMadVIDEO;
});
