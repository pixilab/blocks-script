"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SymetrixComposer = void 0;
const Driver_1 = require("../system_lib/Driver");
const Metadata_1 = require("../system_lib/Metadata");
let SymetrixComposer = class SymetrixComposer extends Driver_1.Driver {
    socket;
    kValueParseReg = /#(\d+)=(\d+)/;
    kControllerLow = 101;
    kControllerHigh = 110;
    mControllerPushTimeout;
    mSettings = {};
    constructor(socket) {
        super(socket);
        this.socket = socket;
        this.setup();
        socket.subscribe('connect', this.onConnectChange.bind(this));
        socket.subscribe('textReceived', this.onTextReceived.bind(this));
        socket.autoConnect();
    }
    setup() {
        for (let i = this.kControllerLow; i <= this.kControllerHigh; i++) {
            let key = i.toString();
            let getterSetter = (val) => {
                const settings = this.mSettings[key];
                if (val !== undefined) {
                    if (settings.current === undefined && !settings.forceUpdate) {
                        settings.wanted = val;
                    }
                    else if (settings.current !== val) {
                        settings.current = val;
                        settings.wanted = undefined;
                        settings.forceUpdate = false;
                        this.tell(`CSQ ${key} ${settings.current}`);
                    }
                }
                return settings.current ? settings.current : (settings.wanted ? settings.wanted : 0);
            };
            this.mSettings[key] = {
                wanted: undefined,
                current: undefined,
                forceUpdate: false,
                setGet: getterSetter
            };
            this.property(this.getPropNameForKey(key), { type: Number }, getterSetter);
        }
    }
    onConnectChange(sender, message) {
        if (message.type === 'Connection') {
            if (sender.connected)
                this.onConnect();
            else
                this.onDisconnect();
        }
    }
    onConnect() {
        this.mControllerPushTimeout = wait(35000);
        this.mControllerPushTimeout.then(this.onControllerPushTimeout.bind(this));
        this.tell('PUR 101 110');
    }
    onDisconnect() {
        for (let key of Object.keys(this.mSettings)) {
            const settings = this.mSettings[key];
            if (settings.current !== undefined) {
                settings.wanted = settings.current;
                settings.current = undefined;
            }
        }
    }
    onTextReceived(sender, message) {
        let matches = this.kValueParseReg.exec(message.text);
        if (matches !== null && matches.length === 3) {
            let controllerNum = parseInt(matches[1], 10);
            let controllerValue = parseInt(matches[2], 10);
            let settings = this.mSettings[controllerNum.toString()];
            if (settings) {
                if (settings.wanted !== undefined) {
                    settings.forceUpdate = true;
                    settings.setGet(settings.wanted);
                    settings.wanted = undefined;
                }
                else if (settings.current !== controllerValue) {
                    settings.current = controllerValue;
                    this.changed(this.getPropNameForKey(controllerNum.toString()));
                }
            }
        }
    }
    onControllerPushTimeout() {
        for (let i = this.kControllerLow; i <= this.kControllerHigh; i++) {
            let key = i.toString();
            const settings = this.mSettings[key];
            if (settings.current === undefined) {
                if (settings.wanted !== undefined) {
                    settings.forceUpdate = true;
                    settings.setGet(settings.wanted);
                    settings.wanted = undefined;
                }
                else {
                    settings.forceUpdate = true;
                }
            }
        }
    }
    tell(data) {
        this.socket.sendText(data);
    }
    getPropNameForKey(key) {
        return `Controller ${key}`;
    }
};
exports.SymetrixComposer = SymetrixComposer;
exports.SymetrixComposer = SymetrixComposer = __decorate([
    (0, Metadata_1.driver)('NetworkTCP', { port: 48631 }),
    __metadata("design:paramtypes", [Object])
], SymetrixComposer);
