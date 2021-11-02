var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
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
    exports.MiniMadLIGHT = void 0;
    var MiniMadLIGHT = (function (_super) {
        __extends(MiniMadLIGHT, _super);
        function MiniMadLIGHT(socket) {
            var _this = _super.call(this, socket) || this;
            socket.subscribe('textReceived', function (sender, message) {
                console.log(message.text);
            });
            return _this;
        }
        MiniMadLIGHT.prototype.isOfTypeName = function (typeName) {
            return typeName === "MiniMadLIGHT" ? this : _super.prototype.isOfTypeName.call(this, typeName);
        };
        MiniMadLIGHT.prototype.pause = function () {
            this.sendMessage('/pause');
        };
        MiniMadLIGHT.prototype.play = function () {
            this.sendMessage('/play');
        };
        MiniMadLIGHT.prototype.replay = function () {
            this.sendMessage('/replay');
        };
        MiniMadLIGHT.prototype.previousSequence = function () {
            this.sendMessage('/previous_media');
        };
        MiniMadLIGHT.prototype.nextSequence = function () {
            this.sendMessage('/next_media');
        };
        MiniMadLIGHT.prototype.setPlaybackMode = function (modeIndex) {
            this.sendMessage('/set_playback_mode/' + modeIndex);
        };
        MiniMadLIGHT.prototype.setSequenceByName = function (name) {
            this.sendMessage('/media_name/' + name);
        };
        MiniMadLIGHT.prototype.setSequenceByIndex = function (index) {
            this.sendMessage('/media_index/' + index);
        };
        MiniMadLIGHT.prototype.setMasterAudioLevel = function (audioLevel) {
            var audioLevelString = audioLevel.toString();
            if (audioLevelString.indexOf('.') === -1)
                audioLevelString += '.0';
            this.sendMessage('/set_master_audio_level', audioLevelString);
        };
        MiniMadLIGHT.prototype.setMasterLuminosity = function (luminosityLevel) {
            var luminosityLevelString = luminosityLevel.toString();
            if (luminosityLevelString.indexOf('.') === -1)
                luminosityLevelString += '.0';
            this.sendMessage('/set_master_luminosity', luminosityLevelString);
        };
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
        MiniMadLIGHT = __decorate([
            Meta.driver('NetworkUDP', { port: 8010 }),
            __metadata("design:paramtypes", [Object])
        ], MiniMadLIGHT);
        return MiniMadLIGHT;
    }(OSCviaUDP_1.OSCviaUDP));
    exports.MiniMadLIGHT = MiniMadLIGHT;
});
