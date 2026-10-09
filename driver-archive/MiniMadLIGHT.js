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
exports.MiniMadLIGHT = void 0;
const Meta = __importStar(require("../system_lib/Metadata"));
const OSCviaUDP_1 = require("./OSCviaUDP");
let MiniMadLIGHT = class MiniMadLIGHT extends OSCviaUDP_1.OSCviaUDP {
    constructor(socket) {
        super(socket);
        socket.subscribe('textReceived', (sender, message) => {
            console.log(message.text);
        });
    }
    isOfTypeName(typeName) {
        return typeName === "MiniMadLIGHT" ? this : super.isOfTypeName(typeName);
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
    previousSequence() {
        this.sendMessage('/previous_media');
    }
    nextSequence() {
        this.sendMessage('/next_media');
    }
    setPlaybackMode(modeIndex) {
        this.sendMessage('/set_playback_mode/' + modeIndex);
    }
    setSequenceByName(name) {
        this.sendMessage('/media_name/' + name);
    }
    setSequenceByIndex(index) {
        this.sendMessage('/media_index/' + index);
    }
    setMasterAudioLevel(audioLevel) {
        var audioLevelString = audioLevel.toString();
        if (audioLevelString.indexOf('.') === -1)
            audioLevelString += '.0';
        this.sendMessage('/set_master_audio_level', audioLevelString);
    }
    setMasterLuminosity(luminosityLevel) {
        var luminosityLevelString = luminosityLevel.toString();
        if (luminosityLevelString.indexOf('.') === -1)
            luminosityLevelString += '.0';
        this.sendMessage('/set_master_luminosity', luminosityLevelString);
    }
};
exports.MiniMadLIGHT = MiniMadLIGHT;
__decorate([
    Meta.callable('pauses the playback'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MiniMadLIGHT.prototype, "pause", null);
__decorate([
    Meta.callable('starts the playback after a pause'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MiniMadLIGHT.prototype, "play", null);
__decorate([
    Meta.callable('restarts the current sequence'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MiniMadLIGHT.prototype, "replay", null);
__decorate([
    Meta.callable('previous sequence'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MiniMadLIGHT.prototype, "previousSequence", null);
__decorate([
    Meta.callable('next sequence'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MiniMadLIGHT.prototype, "nextSequence", null);
__decorate([
    Meta.callable('set playback mode'),
    __param(0, Meta.parameter('playback mode index')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], MiniMadLIGHT.prototype, "setPlaybackMode", null);
__decorate([
    Meta.callable('set the current sequence by name, example: "light_sequence_3" to play the sequence called light_sequence_3'),
    __param(0, Meta.parameter('sequence name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MiniMadLIGHT.prototype, "setSequenceByName", null);
__decorate([
    Meta.callable('set the current sequence by index'),
    __param(0, Meta.parameter('sequence index')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], MiniMadLIGHT.prototype, "setSequenceByIndex", null);
__decorate([
    Meta.callable('set the master audio-level'),
    __param(0, Meta.parameter('audio level')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], MiniMadLIGHT.prototype, "setMasterAudioLevel", null);
__decorate([
    Meta.callable('set the master luminosity'),
    __param(0, Meta.parameter('luminosity level')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], MiniMadLIGHT.prototype, "setMasterLuminosity", null);
exports.MiniMadLIGHT = MiniMadLIGHT = __decorate([
    Meta.driver('NetworkUDP', { port: 8010 }),
    __metadata("design:paramtypes", [Object])
], MiniMadLIGHT);
