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
define(["require", "exports", "../system/Spot", "../system_lib/Script"], function (require, exports, Spot_1, Script_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.VisitorPhoneBase = exports.StationBase = exports.VisitorScriptBase = void 0;
    var DEBUG = false;
    var VisitorScriptBase = (function (_super) {
        __extends(VisitorScriptBase, _super);
        function VisitorScriptBase() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.stations = {};
            _this.visitorLoc = {};
            _this.phones = {};
            return _this;
        }
        VisitorScriptBase.prototype.addStation = function (station) {
            this.stations[station.spotPath] = station;
            station.init();
        };
        VisitorScriptBase.prototype.leftTheBuilding = function (visitor) {
            console.log('----- Visitor left the building: ' + visitor.name);
            delete this.visitorLoc[visitor.$puid];
            this.discardVisitor(visitor);
            log('Visitor is gone', visitor.$puid);
        };
        VisitorScriptBase.prototype.discardVisitor = function (visitor) {
            this.deleteRecord(visitor, false);
        };
        VisitorScriptBase.prototype.gotPhone = function (phone) {
            this.phones[phone.getIdentity()] = phone;
        };
        VisitorScriptBase.prototype.getPhone = function (phoneId) {
            return this.phones[phoneId];
        };
        VisitorScriptBase.prototype.getStationForSpotPath = function (path) {
            return this.stations[path];
        };
        VisitorScriptBase.prototype.currentStationForVisitor = function (visitor) {
            return this.visitorLoc[visitor.$puid];
        };
        VisitorScriptBase.prototype.lostPhone = function (phone) {
            var visitorRecord = phone.getVisitor().record;
            if (visitorRecord) {
                var visitorStation = this.currentStationForVisitor(visitorRecord);
                if (visitorStation)
                    visitorStation.lostVisitor(phone.getVisitor().record);
            }
            delete this.phones[phone.getIdentity()];
        };
        VisitorScriptBase.prototype.visits = function (visitor, station) {
            if (typeof station === 'string')
                station = this.getStationForSpotPath(station);
            var prevStation = this.visitorLoc[visitor.$puid];
            if (prevStation && prevStation !== station)
                prevStation.lostVisitor(visitor);
            this.visitorLoc[visitor.$puid] = undefined;
            if (station) {
                if (station.receivedVisitor(visitor)) {
                    this.visitorLoc[visitor.$puid] = station;
                    visitor.currentStation = station.spotPath;
                }
                else
                    visitor.currentStation = '';
            }
            else
                visitor.currentStation = '';
        };
        return VisitorScriptBase;
    }(Script_1.Script));
    exports.VisitorScriptBase = VisitorScriptBase;
    var StationBase = (function () {
        function StationBase(spotPath, owner) {
            this.spotPath = spotPath;
            this.owner = owner;
        }
        StationBase.prototype.init = function () {
            this.connectSpot();
        };
        StationBase.prototype.gotVisitor = function (visitor) {
            if (visitor)
                this.owner.visits(visitor, this);
        };
        StationBase.prototype.receivedVisitor = function (visitorData) {
            log('Station', this.spotPath, 'received visitor', visitorData.name, visitorData.$puid);
            this.mCurrVisitor = visitorData;
            return true;
        };
        StationBase.prototype.lostVisitor = function (visitor) {
            if (this.mCurrVisitor === visitor)
                this.mCurrVisitor = null;
        };
        StationBase.prototype.gotoBlock = function (path, play) {
            if (play === void 0) { play = false; }
            Spot_1.Spot[this.spotPath].gotoBlock(path, play);
        };
        StationBase.prototype.activateByGotoBlock = function (act) {
            this.gotoBlock(act ? '0' : '1');
        };
        StationBase.prototype.ejectVisitor = function () {
            if (this.hasVisitor())
                this.owner.visits(this.getCurrVisitor(), undefined);
        };
        StationBase.prototype.getVisitingPhone = function () {
            return undefined;
        };
        StationBase.prototype.tellPhoneToLocateThisStation = function () {
            var phone = this.getVisitingPhone();
            if (phone)
                phone.locate(this.spotPath);
            this.locateVisitorsPhone = true;
        };
        StationBase.prototype.shouldAutoLocatePhone = function () {
            return this.locateVisitorsPhone;
        };
        StationBase.prototype.getSpotPropertyAccessor = function (subPath, changeNotification) {
            return this.owner.getProperty('Spot.' + this.spotPath + '.' + subPath, changeNotification);
        };
        StationBase.prototype.getSpotParameterAccessor = function (paramName, changeNotification) {
            return this.getSpotPropertyAccessor('parameter.' + paramName, changeNotification);
        };
        StationBase.prototype.hasVisitor = function () {
            return !!this.mCurrVisitor;
        };
        StationBase.prototype.getCurrVisitor = function () {
            if (!this.mCurrVisitor)
                throw 'No current visitor';
            return this.mCurrVisitor;
        };
        StationBase.prototype.isCurrentVisitor = function (visitor) {
            return (this.mCurrVisitor &&
                visitor &&
                this.mCurrVisitor.$puid === visitor.$puid);
        };
        StationBase.prototype.connectSpot = function () {
            var _this = this;
            var spot = Spot_1.Spot[this.spotPath];
            if (spot) {
                spot.subscribe('finish', function () { return _this.connectSpot(); });
            }
            this.mySpot = spot;
            return !!spot;
        };
        return StationBase;
    }());
    exports.StationBase = StationBase;
    var VisitorPhoneBase = (function () {
        function VisitorPhoneBase(owner, visitor, recordType) {
            var _this = this;
            this.owner = owner;
            this.visitor = visitor;
            this.recordType = recordType;
            log('VisitorPhone id and record', visitor.identity, visitor.record ? visitor.record.$puid : 'no data');
            this.record = visitor.record;
            this.tagId = owner.getProperty(this.getSpotParamPath('tagId'), function (tagId) {
                if (tagId)
                    _this.gotVisitorTagID(tagId);
            });
            visitor.subscribe('location', function (sender, message) {
                return _this.didLocate(message.location);
            });
            visitor.subscribe('finish', function () { return _this.visitorGone(); });
        }
        VisitorPhoneBase.prototype.init = function () {
            this.owner.gotPhone(this);
            if (this.record) {
                this.applyRecord();
                var spotPath = this.record.currentStation;
                var station = this.owner.getStationForSpotPath(spotPath);
                if (!station || !station.shouldAutoLocatePhone())
                    spotPath = '';
                log('VisitorPhone locate', spotPath);
                this.locate(spotPath);
            }
        };
        VisitorPhoneBase.prototype.applyRecord = function () {
        };
        VisitorPhoneBase.prototype.gotRecord = function (newRecord) {
        };
        VisitorPhoneBase.prototype.getIdentity = function () {
            return this.visitor.identity;
        };
        VisitorPhoneBase.prototype.getVisitor = function () {
            return this.visitor;
        };
        VisitorPhoneBase.prototype.getSpotParamPath = function (param) {
            return 'Spot.Visitor.' + this.visitor.identity + '.parameter.' + param;
        };
        VisitorPhoneBase.prototype.locate = function (spotPathToLocate) {
            log('Phone', this.visitor.identity, 'locate spot', spotPathToLocate);
            this.visitor.locateSpot(spotPathToLocate, true);
        };
        VisitorPhoneBase.prototype.didLocate = function (spotPath) {
            log('Phone', this.visitor.identity, 'located spot', spotPath);
            this.owner.visits(this.visitor.record, spotPath);
        };
        VisitorPhoneBase.prototype.gotVisitorTagID = function (tagId) {
            log('gotVisitorTagID', tagId);
            if (!this.record) {
                var r = this.owner.getRecordSec(this.recordType, 'tagSerial', tagId);
                if (r) {
                    log('Got tag ID', tagId, 'for data record', r.$puid, 'with name', r.name, 'mobile ID', this.visitor.identity);
                    this.record = r;
                    this.gotRecord(r);
                }
                else
                    log('Got tag ID', tagId, 'with no corresponding data record');
            }
        };
        VisitorPhoneBase.prototype.visitorGone = function () {
            log('VisitorPhone disconnected', this.visitor.identity);
            this.owner.lostPhone(this);
            this.tagId.close();
        };
        return VisitorPhoneBase;
    }());
    exports.VisitorPhoneBase = VisitorPhoneBase;
    function log() {
        var messages = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            messages[_i] = arguments[_i];
        }
        if (DEBUG)
            console.info(messages);
    }
});
