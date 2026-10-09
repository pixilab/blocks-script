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
exports.CheckProjectors = void 0;
const Script_1 = require("../system_lib/Script");
const Network_1 = require("../system/Network");
const Metadata_1 = require("../system_lib/Metadata");
class CheckProjectors extends Script_1.Script {
    attached;
    errors;
    constructor(env) {
        super(env);
        this.attached = {};
        this.errors = {};
        this.attachToAll();
    }
    reattachAll() {
        this.detachFromAll();
        this.attachToAll();
    }
    attachToAll() {
        this.forEachProjector((projector, name) => this.attachTo(projector, name));
        wait(6000).then(() => {
            this.forEachProjector((projector, name) => this.connStatus(projector.connected, name, projector));
        });
    }
    detachFromAll() {
        for (const name in this.attached)
            this.detachFrom(name);
    }
    forEachProjector(toCall) {
        for (let deviceName in Network_1.Network) {
            const projector = Network_1.Network[deviceName];
            if (projector.isOfTypeName && projector.isOfTypeName('PJLinkPlus'))
                toCall(projector, deviceName);
        }
    }
    attachTo(projector, name) {
        const problemProp = this.getProperty('Network.' + name + '.hasProblem', problem => this.problemStatus(name, projector, problem));
        const connProp = this.getProperty('Network.' + name + '.connected', isConnected => this.connStatus(isConnected, name, projector));
        const finishListener = () => this.lost(name);
        projector.subscribe('finish', finishListener);
        this.attached[name] = {
            projector: projector,
            hasProblemProp: problemProp,
            connProp: connProp,
            finishListener: finishListener
        };
        if (problemProp.available)
            this.problemStatus(name, projector, problemProp.value);
    }
    detachFrom(name) {
        const connDescr = this.attached[name];
        if (connDescr) {
            connDescr.connProp.close();
            connDescr.hasProblemProp.close();
            connDescr.projector.unsubscribe('finish', connDescr.finishListener);
            delete this.attached[name];
        }
        else
            console.warn("detachFrom unknown", name);
    }
    lost(projName) {
        this.detachFrom(projName);
        wait(2000).then(() => {
            const projector = Network_1.Network[projName];
            if (projector && projector.isOfTypeName && projector.isOfTypeName('PJLinkPlus'))
                this.attachTo(projector, projName);
            else
                console.warn("Projector removed", projName);
        });
    }
    problemStatus(projName, projector, problem) {
        this.reportError(projName, problem ? projector.errorStatus : undefined);
    }
    connStatus(isConnected, projName, projector) {
        if (!isConnected)
            this.reportError(projName, "disconnected");
        else if (this.errors[projName] === "disconnected")
            this.reportError(projName);
    }
    reportError(projName, error) {
        let lastErrorState = this.errors[projName];
        if (lastErrorState !== error) {
            this.errors[projName] = error;
            if (error) {
                console.warn("Projector problem", projName, error);
            }
        }
    }
}
exports.CheckProjectors = CheckProjectors;
__decorate([
    (0, Metadata_1.callable)("Re-attach to all projectors - useful if set of projectors change"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CheckProjectors.prototype, "reattachAll", null);
