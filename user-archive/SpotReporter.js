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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpotReporter = void 0;
const Script_1 = require("../system_lib/Script");
const Spot_1 = require("../system/Spot");
const SimpleMail_1 = require("../system/SimpleMail");
const Metadata_1 = require("../system_lib/Metadata");
const kNewline = "<br>\n";
class SpotReporter extends Script_1.Script {
    static MIN_RETRY_INTERVAL = 10_000;
    static MIN_DISCONNECTED_TIME = 10_000;
    mEmail = "";
    mSubject = "Blocks Display Connections Changed";
    whenLastCheck = 0;
    checkGroups = undefined;
    connectedSpots = {};
    recentlyDisconnectedSpots = {};
    disconnectedSpots = {};
    constructor(env) {
        super(env);
    }
    get email() {
        return this.mEmail;
    }
    set email(value) {
        this.mEmail = value;
    }
    get subject() {
        return this.mSubject;
    }
    set subject(value) {
        this.mSubject = value;
    }
    testEmail(sendTo, subject, body) {
        return SimpleMail_1.SimpleMail.send(sendTo, subject, body);
    }
    addSpotGroup(groupPath) {
        if (groupPath) {
            if (this.checkGroups === undefined)
                this.checkGroups = {};
            this.checkGroups[groupPath] = true;
        }
        else
            this.checkGroups = undefined;
    }
    checkNow() {
        const now = Date.now();
        const sinceLastCheck = now - this.whenLastCheck;
        if (sinceLastCheck < SpotReporter.MIN_RETRY_INTERVAL)
            return;
        this.whenLastCheck = now;
        const disconnected = [];
        const connected = [];
        const visit = (spot) => {
            const spotPath = spot.fullName;
            if (!spot.power) {
                if (this.connectedSpots[spotPath] !== undefined) {
                    delete this.connectedSpots[spotPath];
                }
                delete this.recentlyDisconnectedSpots[spotPath];
                delete this.disconnectedSpots[spotPath];
            }
            else {
                if (spot.connected) {
                    spot.power = true;
                    this.connectedSpots[spotPath] = true;
                    if (this.recentlyDisconnectedSpots[spotPath]) {
                        delete this.recentlyDisconnectedSpots[spotPath];
                    }
                    if (this.disconnectedSpots[spotPath]) {
                        connected.push(spotPath);
                        delete this.disconnectedSpots[spotPath];
                    }
                }
                else {
                    if (this.connectedSpots[spotPath]) {
                        if (!this.disconnectedSpots[spotPath]) {
                            const whenDisconnected = this.recentlyDisconnectedSpots[spotPath];
                            if (whenDisconnected) {
                                if (now - whenDisconnected >= SpotReporter.MIN_DISCONNECTED_TIME) {
                                    disconnected.push(spotPath);
                                    this.connectedSpots[spotPath] = false;
                                    this.disconnectedSpots[spotPath] = this.recentlyDisconnectedSpots[spotPath];
                                    delete this.recentlyDisconnectedSpots[spotPath];
                                }
                            }
                            else {
                                this.recentlyDisconnectedSpots[spotPath] = now;
                            }
                        }
                    }
                }
            }
        };
        if (this.checkGroups) {
            for (let path in this.checkGroups) {
                let spotGroup = undefined;
                const sgi = Spot_1.Spot[path];
                if (sgi)
                    spotGroup = Spot_1.Spot[path].isOfTypeName("SpotGroup");
                if (spotGroup)
                    this.visitDisplaySpots(spotGroup, visit);
                else
                    console.error("Not a Spot group", path);
            }
        }
        else
            this.visitDisplaySpots(Spot_1.Spot, visit);
        let result = this.notify("", disconnected, "disconnected");
        result = this.notify(result, connected, "reconnected");
        if (result)
            this.sendMessage(result);
    }
    visitDisplaySpots(group, visit) {
        for (let name in group) {
            let spotGroupItem = group[name];
            const displaySpot = spotGroupItem.isOfTypeName("DisplaySpot");
            if (displaySpot)
                visit(displaySpot);
            else {
                const spotGroup = spotGroupItem.isOfTypeName("SpotGroup");
                if (spotGroup)
                    this.visitDisplaySpots(spotGroup, visit);
            }
        }
    }
    notify(appendTo, spotNames, what) {
        if (spotNames.length) {
            appendTo += "Display Spots " + what + kNewline;
            let dateNow;
            for (let spotName of spotNames) {
                if (this.disconnectedSpots[spotName])
                    appendTo += spotName + " " + new Date(this.disconnectedSpots[spotName]).toLocaleString() + kNewline;
                else {
                    if (!dateNow)
                        dateNow = new Date().toLocaleString();
                    appendTo += spotName + " " + dateNow + kNewline;
                }
            }
        }
        return appendTo;
    }
    sendMessage(message) {
        console.log(this.mSubject, message);
        if (this.mEmail)
            return SimpleMail_1.SimpleMail.send(this.mEmail, this.mSubject, message);
    }
}
exports.SpotReporter = SpotReporter;
__decorate([
    (0, Metadata_1.property)("Email address to notify, if desired."),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], SpotReporter.prototype, "email", null);
__decorate([
    (0, Metadata_1.property)("Subject line of email notification."),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], SpotReporter.prototype, "subject", null);
__decorate([
    (0, Metadata_1.callable)("Test sending of email"),
    __param(0, (0, Metadata_1.parameter)("Email address for this test email")),
    __param(1, (0, Metadata_1.parameter)("Subject line")),
    __param(2, (0, Metadata_1.parameter)("Message body (accepts basic HTML tags)")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], SpotReporter.prototype, "testEmail", null);
__decorate([
    (0, Metadata_1.callable)("Add path to a Spot Group to check (including any sub-groups therein). If not done, ALL Display Spots will be checked. Empty string resets."),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SpotReporter.prototype, "addSpotGroup", null);
__decorate([
    (0, Metadata_1.callable)("Check connection status of all configured spots"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SpotReporter.prototype, "checkNow", null);
