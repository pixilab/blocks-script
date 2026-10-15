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
exports.EnttecSPlay = void 0;
const Meta = __importStar(require("../system_lib/Metadata"));
const OSCviaUDP_1 = require("./OSCviaUDP");
let EnttecSPlay = class EnttecSPlay extends OSCviaUDP_1.OSCviaUDP {
    m_masterIntensity = 1.0;
    constructor(socket) {
        super(socket);
        socket.subscribe('textReceived', (sender, message) => {
            console.log(message.text);
        });
    }
    isOfTypeName(typeName) {
        return typeName === "EnttecSPlay" ? this : super.isOfTypeName(typeName);
    }
    set masterIntensity(value) {
        this.m_masterIntensity = value;
        this.sendMessage('/splay/master/intensity', value.toFixed(3));
    }
    get masterIntensity() {
        return this.m_masterIntensity;
    }
    play(id) {
        const playlistID = id == undefined ? 'all' : id;
        this.sendMessage('/splay/playlist/play/' + playlistID);
    }
    pause(id) {
        const playlistID = id == undefined ? 'all' : id;
        this.sendMessage('/splay/playlist/pause/' + playlistID);
    }
    stop(id) {
        const playlistID = id == undefined ? 'all' : id;
        this.sendMessage('/splay/playlist/stop/' + playlistID);
    }
    setIntensity(intensity, id) {
        const intensityString = intensity.toFixed(3);
        if (id == undefined) {
            this.sendMessage('/splay/master/intensity', intensityString);
        }
        else {
            this.sendMessage('/splay/playlist/intensity/' + id, intensityString);
        }
    }
};
exports.EnttecSPlay = EnttecSPlay;
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
exports.EnttecSPlay = EnttecSPlay = __decorate([
    Meta.driver('NetworkUDP', { port: 8000 }),
    __metadata("design:paramtypes", [Object])
], EnttecSPlay);
