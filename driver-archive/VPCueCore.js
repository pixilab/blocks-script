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
exports.VPCueCore = void 0;
const Driver_1 = require("../system_lib/Driver");
const Meta = __importStar(require("../system_lib/Metadata"));
let VPCueCore = class VPCueCore extends Driver_1.Driver {
    socket;
    mConnected = false;
    prefix = 'core-';
    responseParseRegex = /(.*)=([+-]?(\d*[.])?\d+)/i;
    keyToNameParseRegex = /(\w*-?)pb-(\d+)-([a-z]+)/i;
    numPlaybacks = 16;
    minIntensity = 0.00;
    maxIntensity = 1.00;
    minRate = 0.00;
    maxRate = 1.00;
    jumpSources = 32;
    mSettings = {};
    constructor(socket) {
        super(socket);
        this.socket = socket;
        this.setup();
        socket.subscribe("connect", (sender, message) => {
            this.connectStateChanged();
        });
        socket.subscribe("bytesReceived", (sender, msg) => this.bytesReceived(msg.rawData));
        socket.autoConnect(true);
        this.mConnected = socket.connected;
    }
    pad(num, size) {
        let n = num.toString();
        while (n.length < size)
            n = "0" + n;
        return n;
    }
    setup() {
        for (let i = 0; i < this.numPlaybacks; i++) {
            let key = `${this.prefix}pb-${i + 1}-intensity`;
            this.set(key, this.minIntensity, this.maxIntensity);
        }
        for (let i = 0; i < this.numPlaybacks; i++) {
            let key = `${this.prefix}pb-${i + 1}-rate`;
            this.set(key, this.minRate, this.maxRate);
        }
        for (let i = 0; i < this.numPlaybacks; i++) {
            let key = `${this.prefix}pb-${i + 1}-jump`;
            this.set(key, 1, this.jumpSources);
        }
    }
    set(key, min, max) {
        let getterSetter = (val) => {
            const settings = this.mSettings[key];
            if (val !== undefined) {
                let setValue = key.match(/jump/i) ? val : Number(val).toFixed(2);
                if (settings.current === undefined && !settings.forceUpdate) {
                    settings.wanted = setValue;
                }
                if (settings.current !== setValue) {
                    settings.current = setValue;
                    settings.wanted = undefined;
                    settings.forceUpdate = false;
                    let command = `${key}=${setValue}`;
                    this.tell(command);
                }
            }
            return settings.current ? Number(settings.current) : (settings.wanted ? Number(settings.wanted) : 0);
        };
        this.mSettings[key] = {
            wanted: undefined,
            current: undefined,
            forceUpdate: false,
            setGet: getterSetter
        };
        let options = {
            type: Number,
            min: min,
            max: max,
            description: this.getPropNameForKey(key)
        };
        this.property(this.getPropNameForKey(key), options, getterSetter);
    }
    set connected(online) {
        this.mConnected = online;
    }
    get connected() {
        return this.mConnected;
    }
    connectStateChanged() {
        this.connected = this.socket.connected;
    }
    bytesReceived(rawData) {
        let text = this.toString(rawData);
        let matches = this.responseParseRegex.exec(text);
        if (matches !== null && matches.length >= 3) {
            let key = matches[1];
            let value = Number(matches[2]);
            let settings = this.mSettings[key];
            if (settings) {
                if (settings.wanted !== undefined) {
                    settings.forceUpdate = true;
                    settings.setGet(Number(settings.wanted));
                    settings.wanted = undefined;
                }
                else if (settings.current !== value) {
                    settings.current = value;
                    this.changed(this.getPropNameForKey(key));
                }
            }
        }
    }
    sendText(command) {
        this.tell(command);
    }
    getPropNameForKey(key) {
        let matches = this.keyToNameParseRegex.exec(key);
        return `Playback ${this.pad(Number(matches[2]), 2)} ${this.capitalize(matches[3])}`;
    }
    tell(data) {
        this.socket.sendText(data);
    }
    toString(bytes) {
        let result = '';
        for (let i = 0; i < bytes.length; ++i) {
            const byte = bytes[i];
            const text = byte.toString(16);
            result += (byte < 16 ? '%0' : '%') + text;
        }
        return decodeURIComponent(result);
    }
    capitalize(word) {
        if (word.length === 0) {
            return word;
        }
        const firstLetterCode = word.charCodeAt(0);
        if (firstLetterCode >= 97 && firstLetterCode <= 122) {
            return String.fromCharCode(firstLetterCode - 32) + word.slice(1);
        }
        return word;
    }
};
exports.VPCueCore = VPCueCore;
__decorate([
    Meta.property("Connected", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], VPCueCore.prototype, "connected", null);
__decorate([
    Meta.callable("Send a command to the device"),
    __param(0, Meta.parameter("Command")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VPCueCore.prototype, "sendText", null);
exports.VPCueCore = VPCueCore = __decorate([
    Meta.driver("NetworkTCP", { port: 7000 }),
    __metadata("design:paramtypes", [Object])
], VPCueCore);
