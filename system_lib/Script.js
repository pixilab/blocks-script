"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Script = void 0;
const ScriptBase_1 = require("../system_lib/ScriptBase");
class Script extends ScriptBase_1.ScriptBase {
    establishChannel(leafChannelName, callback) {
        if (callback) {
            this.__scriptFacade.establishChannel(leafChannelName, function (sender, axon) {
                callback(axon.data);
            });
        }
        else
            this.__scriptFacade.establishChannel(leafChannelName);
    }
    sendOnChannel(leafChannelName, data) {
        this.__scriptFacade.sendOnChannel(leafChannelName, data);
    }
    newRecord(type) {
        return this.__scriptFacade.newRecord(type);
    }
    deleteRecord(record, archive, filesToArchive) {
        return this.__scriptFacade.deleteRecord(record, archive, filesToArchive);
    }
    deleteRecords(type, archive) {
        return this.__scriptFacade.deleteRecords(type, archive || false);
    }
    getRecord(type, puid) {
        return this.__scriptFacade.getRecord(type, puid);
    }
    getRecordSec(type, fieldName, fieldValue, optional) {
        return this.__scriptFacade.getRecordSec(type, fieldName, fieldValue, optional);
    }
    getAllPuids(ofType) {
        return this.__scriptFacade.getAllPuids(ofType);
    }
}
exports.Script = Script;
