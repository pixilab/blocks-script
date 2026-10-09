"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisitorPhoneBase = exports.StationBase = exports.VisitorScriptBase = void 0;
const Spot_1 = require("../system/Spot");
const Script_1 = require("../system_lib/Script");
const DEBUG = false;
class VisitorScriptBase extends Script_1.Script {
    stations = {};
    visitorLoc = {};
    phones = {};
    addStation(station) {
        this.stations[station.spotPath] = station;
        station.init();
    }
    leftTheBuilding(visitor) {
        console.log('----- Visitor left the building: ' + visitor.name);
        delete this.visitorLoc[visitor.$puid];
        this.discardVisitor(visitor);
        log('Visitor is gone', visitor.$puid);
    }
    discardVisitor(visitor) {
        this.deleteRecord(visitor, false);
    }
    gotPhone(phone) {
        this.phones[phone.getIdentity()] = phone;
    }
    getPhone(phoneId) {
        return this.phones[phoneId];
    }
    getStationForSpotPath(path) {
        return this.stations[path];
    }
    currentStationForVisitor(visitor) {
        return this.visitorLoc[visitor.$puid];
    }
    lostPhone(phone) {
        const visitorRecord = phone.getVisitor().record;
        if (visitorRecord) {
            const visitorStation = this.currentStationForVisitor(visitorRecord);
            if (visitorStation)
                visitorStation.lostVisitor(phone.getVisitor().record);
        }
        delete this.phones[phone.getIdentity()];
    }
    visits(visitor, station) {
        if (typeof station === 'string')
            station = this.getStationForSpotPath(station);
        const prevStation = this.visitorLoc[visitor.$puid];
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
    }
}
exports.VisitorScriptBase = VisitorScriptBase;
class StationBase {
    spotPath;
    owner;
    mCurrVisitor;
    mySpot;
    locateVisitorsPhone;
    constructor(spotPath, owner) {
        this.spotPath = spotPath;
        this.owner = owner;
    }
    init() {
        this.connectSpot();
    }
    gotVisitor(visitor) {
        if (visitor)
            this.owner.visits(visitor, this);
    }
    receivedVisitor(visitorData) {
        log('Station', this.spotPath, 'received visitor', visitorData.name, visitorData.$puid);
        this.mCurrVisitor = visitorData;
        return true;
    }
    lostVisitor(visitor) {
        if (this.mCurrVisitor === visitor)
            this.mCurrVisitor = null;
    }
    gotoBlock(path, play = false) {
        Spot_1.Spot[this.spotPath].gotoBlock(path, play);
    }
    activateByGotoBlock(act) {
        this.gotoBlock(act ? '0' : '1');
    }
    ejectVisitor() {
        if (this.hasVisitor())
            this.owner.visits(this.getCurrVisitor(), undefined);
    }
    getVisitingPhone() {
        return undefined;
    }
    tellPhoneToLocateThisStation() {
        const phone = this.getVisitingPhone();
        if (phone)
            phone.locate(this.spotPath);
        this.locateVisitorsPhone = true;
    }
    shouldAutoLocatePhone() {
        return this.locateVisitorsPhone;
    }
    getSpotPropertyAccessor(subPath, changeNotification) {
        return this.owner.getProperty('Spot.' + this.spotPath + '.' + subPath, changeNotification);
    }
    getSpotParameterAccessor(paramName, changeNotification) {
        return this.getSpotPropertyAccessor('parameter.' + paramName, changeNotification);
    }
    hasVisitor() {
        return !!this.mCurrVisitor;
    }
    getCurrVisitor() {
        if (!this.mCurrVisitor)
            throw 'No current visitor';
        return this.mCurrVisitor;
    }
    isCurrentVisitor(visitor) {
        return (this.mCurrVisitor &&
            visitor &&
            this.mCurrVisitor.$puid === visitor.$puid);
    }
    connectSpot(reconnect = false) {
        const spot = Spot_1.Spot[this.spotPath];
        if (spot) {
            spot.subscribe('finish', () => this.connectSpot());
        }
        else
            console.warn(`Spot ${this.spotPath} not found, not ${reconnect ? 're' : ''}connected...`);
        this.mySpot = spot;
        return !!spot;
    }
}
exports.StationBase = StationBase;
class VisitorPhoneBase {
    owner;
    visitor;
    recordType;
    tagId;
    record;
    constructor(owner, visitor, recordType) {
        this.owner = owner;
        this.visitor = visitor;
        this.recordType = recordType;
        log('VisitorPhone id and record', visitor.identity, visitor.record ? visitor.record.$puid : 'no data');
        this.record = visitor.record;
        this.tagId = owner.getProperty(this.getSpotParamPath('tagId'), (tagId) => {
            if (tagId)
                this.gotVisitorTagID(tagId);
        });
        visitor.subscribe('location', (sender, message) => this.didLocate(message.location));
        visitor.subscribe('finish', () => this.visitorGone());
    }
    init() {
        this.owner.gotPhone(this);
        if (this.record) {
            this.applyRecord();
            let spotPath = this.record.currentStation;
            const station = this.owner.getStationForSpotPath(spotPath);
            if (!station || !station.shouldAutoLocatePhone())
                spotPath = '';
            log('VisitorPhone locate', spotPath);
            this.locate(spotPath);
        }
    }
    applyRecord() {
    }
    gotRecord(newRecord) {
    }
    getIdentity() {
        return this.visitor.identity;
    }
    getVisitor() {
        return this.visitor;
    }
    getSpotParamPath(param) {
        return 'Spot.Visitor.' + this.visitor.identity + '.parameter.' + param;
    }
    locate(spotPathToLocate) {
        log('Phone', this.visitor.identity, 'locate spot', spotPathToLocate);
        this.visitor.locateSpot(spotPathToLocate, true);
    }
    didLocate(spotPath) {
        log('Phone', this.visitor.identity, 'located spot', spotPath);
        this.owner.visits(this.visitor.record, spotPath);
    }
    gotVisitorTagID(tagId) {
        log('gotVisitorTagID', tagId);
        if (!this.record) {
            let r = this.owner.getRecordSec(this.recordType, 'tagSerial', tagId);
            if (r) {
                log('Got tag ID', tagId, 'for data record', r.$puid, 'with name', r.name, 'mobile ID', this.visitor.identity);
                this.record = r;
                this.gotRecord(r);
            }
            else
                log('Got tag ID', tagId, 'with no corresponding data record');
        }
    }
    visitorGone() {
        log('VisitorPhone disconnected', this.visitor.identity);
        this.owner.lostPhone(this);
        this.tagId.close();
    }
}
exports.VisitorPhoneBase = VisitorPhoneBase;
function log(...messages) {
    if (DEBUG)
        console.info(messages);
}
