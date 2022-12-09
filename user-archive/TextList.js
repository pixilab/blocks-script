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
define(["require", "exports", "system_lib/Script", "system/SimpleFile", "system_lib/Metadata"], function (require, exports, Script_1, SimpleFile_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TextList = void 0;
    var TextList = (function (_super) {
        __extends(TextList, _super);
        function TextList(scriptFacade) {
            var _this = _super.call(this, scriptFacade) || this;
            _this.mLengt = 0;
            _this.lines = _this.indexedProperty('lines', IndexedPropItem);
            _this.reloadFile();
            return _this;
        }
        TextList.prototype.reloadFile = function () {
            var _this = this;
            var fileName = "TextList.txt";
            SimpleFile_1.SimpleFile.read(fileName).then(function (fulltext) {
                var lines = fulltext.split(/[\r\n]+/);
                var lineNumber = 0;
                for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                    var line = lines_1[_i];
                    if (line) {
                        console.log("Read line", line);
                        if (lineNumber >= _this.lines.length)
                            _this.lines.push(new IndexedPropItem(line));
                        else
                            _this.lines[lineNumber].value = line;
                        ++lineNumber;
                    }
                }
                console.log("Loaded number of lines", lineNumber);
                _this.lineCount = lineNumber;
            }).catch(function (error) {
                return console.error("Error reading data file", fileName, error);
            });
        };
        TextList.prototype.randomize = function () {
            var arrayToRandomize = [];
            for (var ix = 0; ix < this.mLengt; ++ix)
                arrayToRandomize.push(this.lines[ix].value);
            function randomSort(a, b) { return Math.round((Math.random() - 0.5) * 10); }
            arrayToRandomize.sort(randomSort);
            for (var ix = 0; ix < arrayToRandomize.length; ++ix)
                this.lines[ix].value = arrayToRandomize[ix];
        };
        Object.defineProperty(TextList.prototype, "lineCount", {
            get: function () {
                return this.mLengt;
            },
            set: function (value) {
                this.mLengt = value;
            },
            enumerable: false,
            configurable: true
        });
        __decorate([
            (0, Metadata_1.callable)("Reload data from file, updating lines' content and length"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], TextList.prototype, "reloadFile", null);
        __decorate([
            (0, Metadata_1.callable)("Re-arrange the order of active text lines"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], TextList.prototype, "randomize", null);
        __decorate([
            (0, Metadata_1.property)("Number of items currently available", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], TextList.prototype, "lineCount", null);
        return TextList;
    }(Script_1.Script));
    exports.TextList = TextList;
    var IndexedPropItem = (function () {
        function IndexedPropItem(value) {
            this.mStrValue = "";
            this.mStrValue = value;
        }
        Object.defineProperty(IndexedPropItem.prototype, "value", {
            get: function () {
                return this.mStrValue;
            },
            set: function (value) {
                this.mStrValue = value;
            },
            enumerable: false,
            configurable: true
        });
        __decorate([
            (0, Metadata_1.property)("The string I represent"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], IndexedPropItem.prototype, "value", null);
        return IndexedPropItem;
    }());
});
