"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiniMadVIDEO = void 0;
const Meta = __importStar(require("../system_lib/Metadata"));
const OSCviaUDP_1 = require("./OSCviaUDP");
let MiniMadVIDEO = class MiniMadVIDEO extends OSCviaUDP_1.OSCviaUDP {
    isOfTypeName(typeName) {
        return typeName === "MiniMadVIDEO" ? this : super.isOfTypeName(typeName);
    }
    pause() {
        this.sendMessage('/pause');
    }
    play() {
        this.sendMessage('/play');
    }
    replay() {
        this.sendMessage('/replay');
    }
    previousMedia() {
        this.sendMessage('/previous_media');
    }
    nextMedia() {
        this.sendMessage('/next_media');
    }
    setPlaybackMode(modeIndex) {
        this.sendMessage('/set_playback_mode/' + modeIndex);
    }
    setMediaByName(name) {
        this.sendMessage('/set_media_by_name/' + name);
    }
    setMediaByIndex(index) {
        this.sendMessage('/set_media_by_idex/' + index);
    }
    setImageTime(displayTime) {
        this.sendMessage('/set_image_time', Math.floor(displayTime).toString());
    }
    setMasterAudioLevel(audioLevel) {
        var audioLevelString = audioLevel.toString();
        if (audioLevelString.indexOf('.') === -1)
            audioLevelString += '.0';
        this.sendMessage('/set_master_audio_level', audioLevelString);
    }
    setMasterAudioLuminosity(luminosityLevel, setForAll) {
        var luminosityLevelString = luminosityLevel.toString();
        if (luminosityLevelString.indexOf('.') === -1)
            luminosityLevelString += '.0';
        this.sendMessage('/set_master_luminosity' + (setForAll ? '/all' : ''), luminosityLevelString);
    }
};
exports.MiniMadVIDEO = MiniMadVIDEO;
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
exports.MiniMadVIDEO = MiniMadVIDEO = __decorate([
    Meta.driver('NetworkUDP', { port: 8010 })
], MiniMadVIDEO);
