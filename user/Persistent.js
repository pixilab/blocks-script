var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define(["require", "exports", "system_lib/Script", "system/SimpleFile"], function (require, exports, Script_1, SimpleFile_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Persistent = (function (_super) {
        __extends(Persistent, _super);
        function Persistent(env) {
            var _this = _super.call(this, env) || this;
            SimpleFile_1.SimpleFile.read(Persistent.kFileName).then(function (data) {
                try {
                    _this.data = JSON.parse(data);
                    _this.publishProperties();
                }
                catch (parseError) {
                    console.error("Failed parsing JSON data from file", Persistent.kFileName, parseError);
                }
            }).catch(function (error) {
                console.error("Failed reading file; use initial sample data", Persistent.kFileName, error);
                _this.data = {
                    "aNumber": 12,
                    "aString": "Billy",
                    "aBoolean": true
                };
                _this.publishProperties();
            });
            return _this;
        }
        Persistent.prototype.publishProperties = function () {
            for (var key in this.data) {
                var propData = this.data[key];
                var typeName = typeof propData;
                if (typeName === 'boolean' ||
                    typeName === 'number' ||
                    typeName === 'string')
                    this.makeProperty(key, typeName);
                else
                    console.error("Invalid type of ", key, typeName);
            }
        };
        Persistent.prototype.makeProperty = function (name, typeName) {
            var _this = this;
            typeName = typeName.charAt(0).toUpperCase() + typeName.substr(1);
            this.property(name, { type: typeName }, function (value) {
                if (value !== undefined && value !== _this.data[name]) {
                    _this.data[name] = value;
                    _this.persistVars();
                }
                return _this.data[name];
            });
        };
        Persistent.prototype.persistVars = function () {
            var _this = this;
            if (!this.mPersistor) {
                this.mPersistor = wait(200);
                this.mPersistor.then(function () {
                    delete _this.mPersistor;
                    var jsonData = JSON.stringify(_this.data, null, 2);
                    SimpleFile_1.SimpleFile.write(Persistent.kFileName, jsonData);
                });
            }
        };
        return Persistent;
    }(Script_1.Script));
    Persistent.kFileName = "Persistent.json";
    exports.Persistent = Persistent;
});
