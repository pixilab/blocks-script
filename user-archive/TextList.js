"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextList = void 0;
const Script_1 = require("../system_lib/Script");
const SimpleFile_1 = require("../system/SimpleFile");
const Metadata_1 = require("../system_lib/Metadata");
class TextList extends Script_1.Script {
    lines;
    mLengt = 0;
    constructor(scriptFacade) {
        super(scriptFacade);
        this.lines = this.indexedProperty('lines', IndexedPropItem);
        this.reloadFile();
    }
    reloadFile() {
        const fileName = "TextList.txt";
        SimpleFile_1.SimpleFile.read(fileName).then(fulltext => {
            const lines = fulltext.split(/[\r\n]+/);
            var lineNumber = 0;
            for (var line of lines) {
                if (line) {
                    console.log("Read line", line);
                    if (lineNumber >= this.lines.length)
                        this.lines.push(new IndexedPropItem(line));
                    else
                        this.lines[lineNumber].value = line;
                    ++lineNumber;
                }
            }
            console.log("Loaded number of lines", lineNumber);
            this.lineCount = lineNumber;
        }).catch(error => console.error("Error reading data file", fileName, error));
    }
    randomize() {
        const arrayToRandomize = [];
        for (var ix = 0; ix < this.mLengt; ++ix)
            arrayToRandomize.push(this.lines[ix].value);
        function randomSort(a, b) { return Math.round((Math.random() - 0.5) * 10); }
        arrayToRandomize.sort(randomSort);
        for (var ix = 0; ix < arrayToRandomize.length; ++ix)
            this.lines[ix].value = arrayToRandomize[ix];
    }
    get lineCount() {
        return this.mLengt;
    }
    set lineCount(value) {
        this.mLengt = value;
    }
}
exports.TextList = TextList;
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
class IndexedPropItem {
    mStrValue = "";
    constructor(value) {
        this.mStrValue = value;
    }
    get value() {
        return this.mStrValue;
    }
    set value(value) {
        this.mStrValue = value;
    }
}
__decorate([
    (0, Metadata_1.property)("The string I represent"),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], IndexedPropItem.prototype, "value", null);
