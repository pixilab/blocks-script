"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OSCviaUDP = void 0;
const MIN_INT32 = -0x80000000;
const MAX_INT32 = +0x7FFFFFFF;
const MIN_INT64 = -0x8000000000000000;
const MAX_INT64 = +0x7FFFFFFFFFFFFFFF;
const MIN_ABS_FLOAT32 = 1.1754943508e-38;
const MAX_SAFE_FLOAT32 = 8388607;
const MIN_SAFE_INT = -0x1FFFFFFFFFFFFF;
const MAX_SAFE_INT = +0x1FFFFFFFFFFFFF;
const OSC_TYPE_TAG_INT32 = 'i';
const OSC_TYPE_TAG_FLOAT32 = 'f';
const OSC_TYPE_TAG_OSC_STRING = 's';
const OSC_TYPE_TAG_OSC_BLOB = 'b';
const OSC_TYPE_TAG_INT64 = 'h';
const OSC_TYPE_TAG_FLOAT64 = 'd';
const OSC_TYPE_TAG_BOOLEAN_TRUE = 'T';
const OSC_TYPE_TAG_BOOLEAN_FALSE = 'F';
const split = require("lib/split-string");
const Meta = __importStar(require("../system_lib/Metadata"));
const Metadata_1 = require("../system_lib/Metadata");
const NetworkDriver_1 = require("../system_lib/NetworkDriver");
let OSCviaUDP = class OSCviaUDP extends NetworkDriver_1.NetworkDriver {
    socket;
    regExFloat = /^[-+]?\d+\.\d+$/;
    regExInteger = /^[-+]?\d+$/;
    regExBoolean = /^false|true$/;
    constructor(socket) {
        super(socket);
        this.socket = socket;
    }
    isOfTypeName(typeName) {
        return typeName === "OSCviaUDP" ? this : null;
    }
    get connected() {
        return this.socket.enabled;
    }
    sendMessage(address, valueList) {
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
    }
    parseValueList(valueList, tagsAndBytes) {
        var valueListParts = split(valueList, { separator: ',', quotes: true, brackets: { '[': ']' } });
        for (var i = 0; i < valueListParts.length; i++) {
            var valueString = valueListParts[i].trim();
            if (this.isFloat(valueString)) {
                const value = +valueString;
                this.addFloat(value, valueString, tagsAndBytes);
            }
            else if (this.isInteger(valueString)) {
                const value = +valueString;
                this.addInteger(value, tagsAndBytes);
            }
            else if (this.isBoolean(valueString)) {
                const value = (valueString == 'true');
                this.addBoolean(value, tagsAndBytes);
            }
            else if (this.isString(valueString)) {
                const value = valueString.substr(1, valueString.length - 2);
                this.addString(value, tagsAndBytes);
            }
        }
    }
    isFloat(valueString) {
        return this.regExFloat.test(valueString);
    }
    isInteger(valueString) {
        return this.regExInteger.test(valueString);
    }
    isBoolean(valueString) {
        return this.regExBoolean.test(valueString);
    }
    isString(valueString) {
        var length = valueString.length;
        if (length < 2)
            return false;
        var lastPos = length - 1;
        return (valueString[0] == '\'' && valueString[lastPos] == '\'') ||
            (valueString[0] == '"' && valueString[lastPos] == '"');
    }
    addBoolean(value, tagsAndBytes) {
        tagsAndBytes['tags'] += value ? OSC_TYPE_TAG_BOOLEAN_TRUE : OSC_TYPE_TAG_BOOLEAN_FALSE;
    }
    addInteger(value, tagsAndBytes) {
        if (value >= MIN_INT32 &&
            value <= MAX_INT32) {
            tagsAndBytes['tags'] += OSC_TYPE_TAG_INT32;
            this.addRange(tagsAndBytes['bytes'], this.getInt32Bytes(value));
        }
        else {
            tagsAndBytes['tags'] += OSC_TYPE_TAG_FLOAT64;
            this.addRange(tagsAndBytes['bytes'], this.getFloat64Bytes(value));
        }
    }
    addFloat(value, valueString, tagsAndBytes) {
        if (valueString.length <= 7) {
            tagsAndBytes['tags'] += OSC_TYPE_TAG_FLOAT32;
            this.addRange(tagsAndBytes['bytes'], this.getFloat32Bytes(value));
        }
        else {
            tagsAndBytes['tags'] += OSC_TYPE_TAG_FLOAT64;
            this.addRange(tagsAndBytes['bytes'], this.getFloat64Bytes(value));
        }
    }
    addString(value, tagsAndBytes) {
        tagsAndBytes['tags'] += OSC_TYPE_TAG_OSC_STRING;
        this.addRange(tagsAndBytes.bytes, this.toOSCStringBytes(value));
    }
    toOSCStringBytes(str) {
        var bytes = this.toBytesString(str);
        if (bytes.length > 0 &&
            bytes[bytes.length - 1] != 0) {
            bytes.push(0);
        }
        this.addZeroes(bytes);
        return bytes;
    }
    addZeroes(bytes) {
        var modFour = bytes.length % 4;
        if (modFour == 0)
            return;
        var missingZeroes = 4 - modFour;
        for (var i = 0; i < missingZeroes; i++) {
            bytes.push(0);
        }
    }
    addRange(array, values) {
        for (var i = 0; i < values.length; i++) {
            array.push(values[i]);
        }
    }
    toBytesString(str) {
        var bytes = [];
        for (var i = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i));
        }
        return bytes;
    }
    getInt32Bytes(x) {
        var bytes = [];
        var i = 4;
        do {
            bytes[--i] = x & (255);
            x = x >> 8;
        } while (i);
        return bytes;
    }
    getInt64Bytes(integer) {
        var bytes = [];
        var i = 8;
        do {
            bytes[--i] = integer & (255);
            integer = integer >> 8;
        } while (i);
        return bytes;
    }
    getFloat32Bytes(float) {
        var floatArray = new Float32Array(1);
        floatArray[0] = float;
        var byteArray = new Int8Array(floatArray.buffer);
        var bytes = [];
        for (var i = byteArray.length - 1; i >= 0; i--) {
            bytes.push(byteArray[i]);
        }
        return bytes;
    }
    getFloat64Bytes(float) {
        var floatArray = new Float64Array(1);
        floatArray[0] = float;
        var byteArray = new Int8Array(floatArray.buffer);
        var bytes = [];
        for (var i = byteArray.length - 1; i >= 0; i--) {
            bytes.push(byteArray[i]);
        }
        return bytes;
    }
    isInt(value) {
        return typeof value === 'number' &&
            isFinite(value) &&
            Math.floor(value) === value;
    }
    isSafeInteger(value) {
        return this.isInt(value) &&
            Math.abs(value) <= MAX_SAFE_INT;
    }
};
exports.OSCviaUDP = OSCviaUDP;
__decorate([
    (0, Metadata_1.property)("True if driver is enabled"),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [])
], OSCviaUDP.prototype, "connected", null);
__decorate([
    Meta.callable('send OSC message'),
    __param(0, Meta.parameter('OSC address (path)')),
    __param(1, Meta.parameter('Comma separated value list. E.g., to send the values 1 (int), 2.0 (float), and "hello" (string) "1, 2.0, \'hello\'".', true)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], OSCviaUDP.prototype, "sendMessage", null);
exports.OSCviaUDP = OSCviaUDP = __decorate([
    Meta.driver('NetworkUDP', { port: 8000 }),
    __metadata("design:paramtypes", [Object])
], OSCviaUDP);
