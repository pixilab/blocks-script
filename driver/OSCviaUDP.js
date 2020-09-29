var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.OSCviaUDP = void 0;
    var MIN_INT32 = -0x80000000;
    var MAX_INT32 = +0x7FFFFFFF;
    var MIN_INT64 = -0x8000000000000000;
    var MAX_INT64 = +0x7FFFFFFFFFFFFFFF;
    var MIN_ABS_FLOAT32 = 1.1754943508e-38;
    var MAX_SAFE_FLOAT32 = 8388607;
    var MIN_SAFE_INT = -0x1FFFFFFFFFFFFF;
    var MAX_SAFE_INT = +0x1FFFFFFFFFFFFF;
    var OSC_TYPE_TAG_INT32 = 'i';
    var OSC_TYPE_TAG_FLOAT32 = 'f';
    var OSC_TYPE_TAG_OSC_STRING = 's';
    var OSC_TYPE_TAG_OSC_BLOB = 'b';
    var OSC_TYPE_TAG_INT64 = 'h';
    var OSC_TYPE_TAG_FLOAT64 = 'd';
    var OSC_TYPE_TAG_BOOLEAN_TRUE = 'T';
    var OSC_TYPE_TAG_BOOLEAN_FALSE = 'F';
    var split = require("lib/split-string");
    var OSCviaUDP = (function (_super) {
        __extends(OSCviaUDP, _super);
        function OSCviaUDP(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.regExFloat = /^[-\+]?\d+\.\d+$/;
            _this.regExInteger = /^[-\+]?\d+$/;
            _this.regExBoolean = /^false|true$/;
            return _this;
        }
        OSCviaUDP.prototype.sendMessage = function (address, valueList) {
            var tagsAndBytes = {
                tags: ',',
                bytes: []
            };
            this.parseValueList(valueList ? valueList : '', tagsAndBytes);
            var bytes = [];
            this.addRange(bytes, this.toOSCStringBytes(address));
            this.addRange(bytes, this.toOSCStringBytes(tagsAndBytes['tags']));
            this.addRange(bytes, tagsAndBytes['bytes']);
            this.socket.sendBytes(bytes);
        };
        OSCviaUDP.prototype.parseValueList = function (valueList, tagsAndBytes) {
            var valueListParts = split(valueList, { separator: ',', quotes: true, brackets: { '[': ']' } });
            for (var i = 0; i < valueListParts.length; i++) {
                var valueString = valueListParts[i].trim();
                if (this.isFloat(valueString)) {
                    var value = +valueString;
                    this.addFloat(value, valueString, tagsAndBytes);
                }
                else if (this.isInteger(valueString)) {
                    var value = +valueString;
                    this.addInteger(value, tagsAndBytes);
                }
                else if (this.isBoolean(valueString)) {
                    var value = (valueString == 'true');
                    this.addBoolean(value, tagsAndBytes);
                }
                else if (this.isString(valueString)) {
                    var value = valueString.substr(1, valueString.length - 2);
                    this.addString(value, tagsAndBytes);
                }
            }
        };
        OSCviaUDP.prototype.isFloat = function (valueString) {
            return this.regExFloat.test(valueString);
        };
        OSCviaUDP.prototype.isInteger = function (valueString) {
            return this.regExInteger.test(valueString);
        };
        OSCviaUDP.prototype.isBoolean = function (valueString) {
            return this.regExBoolean.test(valueString);
        };
        OSCviaUDP.prototype.isString = function (valueString) {
            var length = valueString.length;
            if (length < 2)
                return false;
            var lastPos = length - 1;
            return (valueString[0] == '\'' && valueString[lastPos] == '\'') ||
                (valueString[0] == '"' && valueString[lastPos] == '"');
        };
        OSCviaUDP.prototype.addBoolean = function (value, tagsAndBytes) {
            tagsAndBytes['tags'] += value ? OSC_TYPE_TAG_BOOLEAN_TRUE : OSC_TYPE_TAG_BOOLEAN_FALSE;
        };
        OSCviaUDP.prototype.addInteger = function (value, tagsAndBytes) {
            if (value >= MIN_INT32 &&
                value <= MAX_INT32) {
                tagsAndBytes['tags'] += OSC_TYPE_TAG_INT32;
                this.addRange(tagsAndBytes['bytes'], this.getInt32Bytes(value));
            }
            else {
                tagsAndBytes['tags'] += OSC_TYPE_TAG_FLOAT64;
                this.addRange(tagsAndBytes['bytes'], this.getFloat64Bytes(value));
            }
        };
        OSCviaUDP.prototype.addFloat = function (value, valueString, tagsAndBytes) {
            var abs = Math.abs(value);
            if (valueString.length <= 7) {
                tagsAndBytes['tags'] += OSC_TYPE_TAG_FLOAT32;
                this.addRange(tagsAndBytes['bytes'], this.getFloat32Bytes(value));
            }
            else {
                tagsAndBytes['tags'] += OSC_TYPE_TAG_FLOAT64;
                this.addRange(tagsAndBytes['bytes'], this.getFloat64Bytes(value));
            }
        };
        OSCviaUDP.prototype.addString = function (value, tagsAndBytes) {
            tagsAndBytes['tags'] += OSC_TYPE_TAG_OSC_STRING;
            this.addRange(tagsAndBytes['bytes'], this.toOSCStringBytes(value));
        };
        OSCviaUDP.prototype.toOSCStringBytes = function (str) {
            var bytes = this.toBytesString(str);
            if (bytes.length > 0 &&
                bytes[bytes.length - 1] != 0) {
                bytes.push(0);
            }
            this.addZeroes(bytes);
            return bytes;
        };
        OSCviaUDP.prototype.addZeroes = function (bytes) {
            var modFour = bytes.length % 4;
            if (modFour == 0)
                return;
            var missingZeroes = 4 - modFour;
            for (var i = 0; i < missingZeroes; i++) {
                bytes.push(0);
            }
        };
        OSCviaUDP.prototype.addRange = function (array, values) {
            for (var i = 0; i < values.length; i++) {
                array.push(values[i]);
            }
        };
        OSCviaUDP.prototype.toBytesString = function (str) {
            var bytes = [];
            for (var i = 0; i < str.length; i++) {
                bytes.push(str.charCodeAt(i));
            }
            return bytes;
        };
        OSCviaUDP.prototype.getInt32Bytes = function (x) {
            var bytes = [];
            var i = 4;
            do {
                bytes[--i] = x & (255);
                x = x >> 8;
            } while (i);
            return bytes;
        };
        OSCviaUDP.prototype.getInt64Bytes = function (integer) {
            var bytes = [];
            var i = 8;
            do {
                bytes[--i] = integer & (255);
                integer = integer >> 8;
            } while (i);
            return bytes;
        };
        OSCviaUDP.prototype.getFloat32Bytes = function (float) {
            var floatArray = new Float32Array(1);
            floatArray[0] = float;
            var byteArray = new Int8Array(floatArray.buffer);
            var bytes = [];
            for (var i = byteArray.length - 1; i >= 0; i--) {
                bytes.push(byteArray[i]);
            }
            return bytes;
        };
        OSCviaUDP.prototype.getFloat64Bytes = function (float) {
            var floatArray = new Float64Array(1);
            floatArray[0] = float;
            var byteArray = new Int8Array(floatArray.buffer);
            var bytes = [];
            for (var i = byteArray.length - 1; i >= 0; i--) {
                bytes.push(byteArray[i]);
            }
            return bytes;
        };
        OSCviaUDP.prototype.isInt = function (value) {
            return typeof value === 'number' &&
                isFinite(value) &&
                Math.floor(value) === value;
        };
        OSCviaUDP.prototype.isSafeInteger = function (value) {
            return this.isInt(value) &&
                Math.abs(value) <= MAX_SAFE_INT;
        };
        __decorate([
            Meta.callable('send OSC message'),
            __param(0, Meta.parameter('OSC address')),
            __param(1, Meta.parameter('Comma separated value list. fx to send the values 1 (int), 2.0 (float), and "hello" (string) "1, 2.0, \'hello\'".', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String]),
            __metadata("design:returntype", void 0)
        ], OSCviaUDP.prototype, "sendMessage", null);
        OSCviaUDP = __decorate([
            Meta.driver('NetworkUDP', { port: 8000 }),
            __metadata("design:paramtypes", [Object])
        ], OSCviaUDP);
        return OSCviaUDP;
    }(Driver_1.Driver));
    exports.OSCviaUDP = OSCviaUDP;
});
