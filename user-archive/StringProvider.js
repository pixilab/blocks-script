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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define(["require", "exports", "system_lib/Script", "system/SimpleFile", "system_lib/Metadata"], function (require, exports, Script_1, SimpleFile_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var StringProvider = (function (_super) {
        __extends(StringProvider, _super);
        function StringProvider(env) {
            var _this = _super.call(this, env) || this;
            SimpleFile_1.SimpleFile.read(StringProvider.kFileName).then(function (data) {
                try {
                    _this.data = JSON.parse(data);
                    _this.publishProperties();
                }
                catch (parseError) {
                    console.error("Failed parsing JSON data from file", StringProvider.kFileName, parseError);
                }
            }).catch(function (error) {
                console.error("Failed reading file; use initial sample data", StringProvider.kFileName, error);
                _this.data = {
                    "alpha": "A",
                    "beta": "B",
                    "numeric": 42,
                    "bool": true
                };
                _this.publishProperties();
            });
            return _this;
        }
        StringProvider.prototype.fetch = function (fetchSpec) {
            return this.data[fetchSpec.name];
        };
        StringProvider.prototype.publishProperties = function () {
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
        StringProvider.prototype.makeProperty = function (name, typeName) {
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
        StringProvider.prototype.persistVars = function () {
            var _this = this;
            if (!this.mPersistor) {
                this.mPersistor = wait(200);
                this.mPersistor.then(function () {
                    delete _this.mPersistor;
                    var jsonData = JSON.stringify(_this.data, null, 2);
                    SimpleFile_1.SimpleFile.write(StringProvider.kFileName, jsonData);
                });
            }
        };
        return StringProvider;
    }(Script_1.Script));
    StringProvider.kFileName = "StringProvider.json";
    __decorate([
        Metadata_1.resource(),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object]),
        __metadata("design:returntype", String)
    ], StringProvider.prototype, "fetch", null);
    exports.StringProvider = StringProvider;
});
