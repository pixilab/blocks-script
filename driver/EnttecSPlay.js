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
    exports.EnttecSPlay = void 0;
    var EnttecSPlay = (function (_super) {
        __extends(EnttecSPlay, _super);
        function EnttecSPlay(socket) {
            var _this = _super.call(this, socket) || this;
            _this.m_masterIntensity = 1.0;
            socket.subscribe('textReceived', function (sender, message) {
                console.log(message.text);
            });
            return _this;
        }
        EnttecSPlay.prototype.isOfTypeName = function (typeName) {
            return typeName === "EnttecSPlay" ? this : _super.prototype.isOfTypeName.call(this, typeName);
        };
        Object.defineProperty(EnttecSPlay.prototype, "masterIntensity", {
            get: function () {
                return this.m_masterIntensity;
            },
            set: function (value) {
                this.m_masterIntensity = value;
                this.sendMessage('/splay/master/intensity', value.toFixed(3));
            },
            enumerable: false,
            configurable: true
        });
        EnttecSPlay.prototype.play = function (id) {
            var playlistID = id == undefined ? 'all' : id;
            this.sendMessage('/splay/playlist/play/' + playlistID);
        };
        EnttecSPlay.prototype.pause = function (id) {
            var playlistID = id == undefined ? 'all' : id;
            this.sendMessage('/splay/playlist/pause/' + playlistID);
        };
        EnttecSPlay.prototype.stop = function (id) {
            var playlistID = id == undefined ? 'all' : id;
            this.sendMessage('/splay/playlist/stop/' + playlistID);
        };
        EnttecSPlay.prototype.setIntensity = function (intensity, id) {
            var intensityString = intensity.toFixed(3);
            if (id == undefined) {
                this.sendMessage('/splay/master/intensity', intensityString);
            }
            else {
                this.sendMessage('/splay/playlist/intensity/' + id, intensityString);
            }
        };
        __decorate([
            Meta.property('master intensity'),
            Meta.min(0.0),
            Meta.min(1.0),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], EnttecSPlay.prototype, "masterIntensity", null);
        __decorate([
            Meta.callable('start all / specific playlist'),
            __param(0, Meta.parameter('playlist ID', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], EnttecSPlay.prototype, "play", null);
        __decorate([
            Meta.callable('pause all / specific playlist'),
            __param(0, Meta.parameter('playlist ID', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], EnttecSPlay.prototype, "pause", null);
        __decorate([
            Meta.callable('stop all / specific playlist'),
            __param(0, Meta.parameter('playlist ID', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], EnttecSPlay.prototype, "stop", null);
        __decorate([
            Meta.callable('set master / playlist intensity'),
            __param(0, Meta.parameter('intensity (0..1)')),
            __param(1, Meta.parameter('playlist ID', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number, Number]),
            __metadata("design:returntype", void 0)
        ], EnttecSPlay.prototype, "setIntensity", null);
        EnttecSPlay = __decorate([
            Meta.driver('NetworkUDP', { port: 8000 }),
            __metadata("design:paramtypes", [Object])
        ], EnttecSPlay);
        return EnttecSPlay;
    }(OSCviaUDP_1.OSCviaUDP));
    exports.EnttecSPlay = EnttecSPlay;
});
