define(["require", "exports", "../system/SimpleFile"], function (require, exports, SimpleFile_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IndexedPropertyPersistor = void 0;
    var IndexedPropertyPersistor = (function () {
        function IndexedPropertyPersistor(owner, persistenceDir) {
            this.owner = owner;
            this.persistenceDir = persistenceDir;
        }
        IndexedPropertyPersistor.prototype.getOrMake = function (name, itemType) {
            var result = this.owner.indexedProperty(name, itemType);
            SimpleFile_1.SimpleFile.readJson(this.persistenceFileName(name)).then(function (items) {
                for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
                    var item = items_1[_i];
                    result.push(itemType.fromDeserialized(item));
                }
            });
            this.indexedProperty = result;
            return result;
        };
        IndexedPropertyPersistor.prototype.persist = function () {
            var filePath = this.persistenceFileName(this.indexedProperty.name);
            var toWrite = JSON.stringify(this.indexedProperty);
            return SimpleFile_1.SimpleFile.write(filePath, toWrite);
        };
        IndexedPropertyPersistor.prototype.clear = function () {
            SimpleFile_1.SimpleFile.delete(this.persistenceFileName(this.indexedProperty.name));
        };
        IndexedPropertyPersistor.prototype.persistenceFileName = function (propName) {
            return this.persistenceDir + '/' + propName + '.json';
        };
        return IndexedPropertyPersistor;
    }());
    exports.IndexedPropertyPersistor = IndexedPropertyPersistor;
});
