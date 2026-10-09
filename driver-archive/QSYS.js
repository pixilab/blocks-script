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
exports.QSYS = void 0;
const Driver_1 = require("../system_lib/Driver");
const Meta = __importStar(require("../system_lib/Metadata"));
const split = require("lib/split-string");
var Mapping;
(function (Mapping) {
    Mapping[Mapping["Position"] = 0] = "Position";
    Mapping[Mapping["Value"] = 1] = "Value";
})(Mapping || (Mapping = {}));
let QSYS = class QSYS extends Driver_1.Driver {
    socket;
    controls = [
        { controlName: 'masterGain' },
        { controlName: 'Name with Space', propertyName: 'nameWithSpace' },
        { controlName: 'rawProp', mapping: Mapping.Value },
    ];
    set masterGain(val) { this.propSetter('masterGain', val); }
    get masterGain() { return this.propGetter('masterGain'); }
    set nameWithSpace(val) { this.propSetter('nameWithSpace', val); }
    get nameWithSpace() { return this.propGetter('nameWithSpace'); }
    set rawProp(val) { this.propSetter('rawProp', val); }
    get rawProp() { return this.propGetter('rawProp'); }
    mConnected = false;
    props = {};
    controlToProp = {};
    statusPoller;
    asFeedback = false;
    constructor(socket) {
        super(socket);
        this.socket = socket;
        for (const control of this.controls) {
            let prop = {
                controlName: control.controlName,
                propertyName: (control.propertyName ? control.propertyName : control.controlName),
                mapping: control.mapping ? control.mapping : Mapping.Position,
                value: 0
            };
            this.props[prop.propertyName] = prop;
            this.controlToProp[prop.controlName] = prop;
        }
        socket.subscribe('connect', (sender, message) => {
            console.info('connect msg', message.type);
            this.connectStateChanged();
        });
        socket.subscribe('textReceived', (sender, msg) => this.textReceived(msg.text));
        socket.autoConnect();
        this.mConnected = socket.connected;
        if (this.mConnected)
            this.setupConnection();
        this.keepAlive();
    }
    set connected(online) {
        this.mConnected = online;
    }
    get connected() {
        return this.mConnected;
    }
    propSetter(propertyName, val) {
        const prop = this.props[propertyName];
        if (!prop)
            return;
        if (!this.asFeedback) {
            const command = prop.mapping == Mapping.Position ? "csp" : "csv";
            this.tell(command + ' "' + prop.controlName + '" ' + val);
        }
        prop.value = val;
    }
    propGetter(propertyName) {
        return this.props[propertyName].value;
    }
    controlSetPosition(id, position) {
        this.tell('csp "' + id + '" ' + position);
    }
    controlSetPositionRamp(id, position, rampTime) {
        this.tell('cspr "' + id + '" ' + position + ' ' + rampTime);
    }
    controlSetString(id, cString) {
        this.tell('css "' + id + '" "' + cString + '"');
    }
    controlSetValue(id, value) {
        this.tell('csv "' + id + '" ' + value);
    }
    controlSetValueRamp(id, value, rampTime) {
        this.tell('csvr "' + id + '" ' + value + ' ' + rampTime);
    }
    controlTrigger(id) {
        this.tell('ct "' + id + '"');
    }
    snapshotLoad(sBank, sNum, rampTime) {
        this.tell('ssl "' + sBank + '" ' + sNum + ' ' + rampTime);
    }
    snapshotSave(sBank, sNum) {
        this.tell('sss "' + sBank + '" ' + sNum);
    }
    connectStateChanged() {
        console.info("connectStateChanged", this.socket.connected);
        this.connected = this.socket.connected;
        if (this.socket.connected)
            this.setupConnection();
    }
    keepAlive() {
        this.statusPoller = wait(19 * 1000);
        this.statusPoller.then(() => {
            if (this.connected)
                this.tell("sg");
            this.keepAlive();
        });
    }
    setupConnection() {
        this.tell('cgc 1');
        for (const { controlName } of this.controls)
            this.tell('cga 1 "' + controlName + '"');
        this.tell('cgsna 1 50');
    }
    tell(data) {
        this.socket.sendText(data + "\n");
    }
    parseReply(reply) {
        let keep = (value, state) => {
            return value !== '\\' && (value !== '"' || state.prev() === '\\');
        };
        return split(reply, { quotes: ['"'], separator: ' ', keep: keep });
    }
    textReceived(text) {
        const pieces = this.parseReply(text);
        if (pieces && pieces.length >= 1) {
            const cmd = pieces[0];
            if (cmd === "cv") {
                const prop = this.controlToProp[pieces[1]];
                if (!prop) {
                    console.warn('Received cv for unknown property ' + pieces[1]);
                    return;
                }
                const value = prop.mapping == Mapping.Value ? pieces[3] : pieces[4];
                this.asFeedback = true;
                this[prop.propertyName] = parseFloat(value);
                this.asFeedback = false;
            }
            else if (cmd === "cmv" || cmd === "cmvv" || cmd === "cvv") {
            }
            else if (cmd === "sr" || cmd === "cgpa" || cmd === "login_success") {
            }
            else if (cmd === "cro" ||
                cmd === "core_not_active" ||
                cmd === "bad_change_group_handle" ||
                cmd === "bad_command" ||
                cmd === "bad_id" ||
                cmd === "login_failed" ||
                cmd === "login_required" ||
                cmd === "too_many_change_groups") {
                console.warn("Received error", text);
            }
            else {
                console.warn("Unknown response from device", text);
            }
        }
        else
            console.warn("Unparsable reply from device", text);
    }
};
exports.QSYS = QSYS;
__decorate([
    Meta.property("Master Gain"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], QSYS.prototype, "masterGain", null);
__decorate([
    Meta.property("Name with Space"),
    Meta.min(0),
    Meta.max(1),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], QSYS.prototype, "nameWithSpace", null);
__decorate([
    Meta.property("Raw Prop"),
    Meta.min(-100),
    Meta.max(20),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], QSYS.prototype, "rawProp", null);
__decorate([
    Meta.property("Connected to Q-SYS", true),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], QSYS.prototype, "connected", null);
__decorate([
    Meta.callable("Control Set Position"),
    __param(0, Meta.parameter("Control ID")),
    __param(1, Meta.parameter("Control Position")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], QSYS.prototype, "controlSetPosition", null);
__decorate([
    Meta.callable("Control Set Position Ramp"),
    __param(0, Meta.parameter("Control ID")),
    __param(1, Meta.parameter("Control Position")),
    __param(2, Meta.parameter("Ramp time")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", void 0)
], QSYS.prototype, "controlSetPositionRamp", null);
__decorate([
    Meta.callable("Control Set String"),
    __param(0, Meta.parameter("Control ID")),
    __param(1, Meta.parameter("Control String")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], QSYS.prototype, "controlSetString", null);
__decorate([
    Meta.callable("Control Set Value"),
    __param(0, Meta.parameter("Control ID")),
    __param(1, Meta.parameter("Control Value")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], QSYS.prototype, "controlSetValue", null);
__decorate([
    Meta.callable("Control Set Value Ramp"),
    __param(0, Meta.parameter("Control ID")),
    __param(1, Meta.parameter("Control Value")),
    __param(2, Meta.parameter("Ramp time")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", void 0)
], QSYS.prototype, "controlSetValueRamp", null);
__decorate([
    Meta.callable("Control Trigger"),
    __param(0, Meta.parameter("Control ID")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QSYS.prototype, "controlTrigger", null);
__decorate([
    Meta.callable("Snapshot Load"),
    __param(0, Meta.parameter("Snapshot Bank")),
    __param(1, Meta.parameter("Snapshot Number")),
    __param(2, Meta.parameter("Ramp Time")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", void 0)
], QSYS.prototype, "snapshotLoad", null);
__decorate([
    Meta.callable("Snapshot Save"),
    __param(0, Meta.parameter("Snapshot Bank")),
    __param(1, Meta.parameter("Snapshot Number")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], QSYS.prototype, "snapshotSave", null);
exports.QSYS = QSYS = __decorate([
    Meta.driver('NetworkTCP', { port: 1702 }),
    __metadata("design:paramtypes", [Object])
], QSYS);
