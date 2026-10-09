"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordBase = exports.AggregateElem = exports.ScriptBase = void 0;
class ScriptBase {
    __scriptFacade;
    constructor(scriptFacade) {
        this.__scriptFacade = scriptFacade;
    }
    property(name, options, gsFunc) {
        const propDescriptor = {
            get: function () {
                return gsFunc();
            }
        };
        if (!options || !options.readOnly) {
            propDescriptor.set = (value) => {
                const oldValue = gsFunc();
                if (oldValue !== gsFunc(value))
                    this.__scriptFacade.changed(name);
            };
        }
        Object.defineProperty(this, name, propDescriptor);
        return this.__scriptFacade.property(name, options, gsFunc);
    }
    indexedProperty(name, itemType) {
        return this.__scriptFacade.indexedProperty(name, itemType);
    }
    namedAggregateProperty(name, itemType) {
        return this.__scriptFacade.namedAggregate(name, itemType);
    }
    changed(propName) {
        this.__scriptFacade.changed(propName);
    }
    getProperty(fullPath, changeNotification) {
        return changeNotification ?
            this.__scriptFacade.getProperty(fullPath, changeNotification) :
            this.__scriptFacade.getProperty(fullPath);
    }
    unsubscribe(event, listener) {
        this.__scriptFacade.unsubscribe(event, listener);
    }
    getMonotonousMillis() {
        return this.__scriptFacade.getMonotonousMillis();
    }
    reInitialize() {
        this.__scriptFacade.reInitialize();
    }
    static makeJSArray(arrayLike) {
        if (Array.isArray(arrayLike))
            return arrayLike;
        const realArray = [];
        const length = arrayLike.length;
        for (var i = 0; i < length; ++i)
            realArray.push(arrayLike[i]);
        return realArray;
    }
    makeJSArray(arrayLike) {
        return ScriptBase.makeJSArray(arrayLike);
    }
}
exports.ScriptBase = ScriptBase;
class AggregateElem {
    __scriptFacade;
    changed(propName) {
        this.__scriptFacade.changed(propName);
    }
}
exports.AggregateElem = AggregateElem;
class RecordBase {
    $puid;
    $hasUserData;
}
exports.RecordBase = RecordBase;
