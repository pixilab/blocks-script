"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexedPropertyPersistor = void 0;
const SimpleFile_1 = require("../system/SimpleFile");
class IndexedPropertyPersistor {
    owner;
    persistenceDir;
    indexedProperty;
    constructor(owner, persistenceDir) {
        this.owner = owner;
        this.persistenceDir = persistenceDir;
    }
    getOrMake(name, itemType) {
        const result = this.owner.indexedProperty(name, itemType);
        SimpleFile_1.SimpleFile.readJson(this.persistenceFileName(name)).then((items) => {
            for (const item of items)
                result.push(itemType.fromDeserialized(item));
        });
        this.indexedProperty = result;
        return result;
    }
    persist() {
        const filePath = this.persistenceFileName(this.indexedProperty.name);
        const toWrite = JSON.stringify(this.indexedProperty);
        return SimpleFile_1.SimpleFile.write(filePath, toWrite);
    }
    clear() {
        SimpleFile_1.SimpleFile.delete(this.persistenceFileName(this.indexedProperty.name));
    }
    persistenceFileName(propName) {
        return this.persistenceDir + '/' + propName + '.json';
    }
}
exports.IndexedPropertyPersistor = IndexedPropertyPersistor;
