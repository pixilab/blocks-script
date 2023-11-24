var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
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
define(["require", "exports", "system_lib/Script", "system/Spot", "system/SimpleMail", "../system_lib/Metadata"], function (require, exports, Script_1, Spot_1, SimpleMail_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SpotReporter = void 0;
    var kNewline = "<br>\n";
    var SpotReporter = exports.SpotReporter = (function (_super) {
        __extends(SpotReporter, _super);
        function SpotReporter(env) {
            var _this = _super.call(this, env) || this;
            _this.mEmail = "";
            _this.mSubject = "Blocks Display Connections Changed";
            _this.whenLastCheck = 0;
            _this.checkGroups = undefined;
            _this.connectedSpots = {};
            _this.recentlyDisconnectedSpots = {};
            _this.disconnectedSpots = {};
            return _this;
        }
        Object.defineProperty(SpotReporter.prototype, "email", {
            get: function () {
                return this.mEmail;
            },
            set: function (value) {
                this.mEmail = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(SpotReporter.prototype, "subject", {
            get: function () {
                return this.mSubject;
            },
            set: function (value) {
                this.mSubject = value;
            },
            enumerable: false,
            configurable: true
        });
        SpotReporter.prototype.testEmail = function (sendTo, subject, body) {
            return SimpleMail_1.SimpleMail.send(sendTo, subject, body);
        };
        SpotReporter.prototype.addSpotGroup = function (groupPath) {
            if (groupPath) {
                if (this.checkGroups === undefined)
                    this.checkGroups = {};
                this.checkGroups[groupPath] = true;
            }
            else
                this.checkGroups = undefined;
        };
        SpotReporter.prototype.checkNow = function () {
            var _this = this;
            var now = Date.now();
            var sinceLastCheck = now - this.whenLastCheck;
            if (sinceLastCheck < SpotReporter.MIN_RETRY_INTERVAL)
                return;
            this.whenLastCheck = now;
            var disconnected = [];
            var connected = [];
            var visit = function (spot) {
                var spotPath = spot.fullName;
                if (!spot.power) {
                    if (_this.connectedSpots[spotPath] !== undefined) {
                        delete _this.connectedSpots[spotPath];
                    }
                    delete _this.recentlyDisconnectedSpots[spotPath];
                    delete _this.disconnectedSpots[spotPath];
                }
                else {
                    if (spot.connected) {
                        _this.connectedSpots[spotPath] = true;
                        if (_this.recentlyDisconnectedSpots[spotPath]) {
                            delete _this.recentlyDisconnectedSpots[spotPath];
                        }
                        if (_this.disconnectedSpots[spotPath]) {
                            connected.push(spotPath);
                            delete _this.disconnectedSpots[spotPath];
                        }
                    }
                    else {
                        if (_this.connectedSpots[spotPath]) {
                            if (!_this.disconnectedSpots[spotPath]) {
                                var whenDisconnected = _this.recentlyDisconnectedSpots[spotPath];
                                if (whenDisconnected) {
                                    if (now - whenDisconnected >= SpotReporter.MIN_DISCONNECTED_TIME) {
                                        disconnected.push(spotPath);
                                        _this.connectedSpots[spotPath] = false;
                                        _this.disconnectedSpots[spotPath] = _this.recentlyDisconnectedSpots[spotPath];
                                        delete _this.recentlyDisconnectedSpots[spotPath];
                                    }
                                }
                                else {
                                    _this.recentlyDisconnectedSpots[spotPath] = now;
                                }
                            }
                        }
                    }
                }
            };
            if (this.checkGroups) {
                for (var path in this.checkGroups) {
                    var spotGroup = undefined;
                    var sgi = Spot_1.Spot[path];
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
            var result = this.notify("", disconnected, "disconnected");
            result = this.notify(result, connected, "reconnected");
            if (result)
                this.sendMessage(result);
        };
        SpotReporter.prototype.visitDisplaySpots = function (group, visit) {
            for (var name_1 in group) {
                var spotGroupItem = group[name_1];
                var displaySpot = spotGroupItem.isOfTypeName("DisplaySpot");
                if (displaySpot)
                    visit(displaySpot);
                else {
                    var spotGroup = spotGroupItem.isOfTypeName("SpotGroup");
                    if (spotGroup)
                        this.visitDisplaySpots(spotGroup, visit);
                }
            }
        };
        SpotReporter.prototype.notify = function (appendTo, spotNames, what) {
            if (spotNames.length) {
                appendTo += "Display Spots " + what + kNewline;
                var dateNow = void 0;
                for (var _i = 0, spotNames_1 = spotNames; _i < spotNames_1.length; _i++) {
                    var spotName = spotNames_1[_i];
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
        };
        SpotReporter.prototype.sendMessage = function (message) {
            console.log(this.mSubject, message);
            if (this.mEmail)
                return SimpleMail_1.SimpleMail.send(this.mEmail, this.mSubject, message);
        };
        SpotReporter.MIN_RETRY_INTERVAL = 10000;
        SpotReporter.MIN_DISCONNECTED_TIME = 10000;
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
        return SpotReporter;
    }(Script_1.Script));
});
