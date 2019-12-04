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
    var MAX_SAFE_INTEGER = 9007199254740991;
    var OSC_TYPE_TAG_INT32 = 'i';
    var OSC_TYPE_TAG_FLOAT32 = 'f';
    var OSC_TYPE_TAG_OSC_STRING = 's';
    var OSC_TYPE_TAG_OSC_BLOB = 'b';
    var OSC_TYPE_TAG_BOOLEAN_TRUE = 'T';
    var OSC_TYPE_TAG_BOOLEAN_FALSE = 'F';
    var split = require("lib/split-string");
    var OSCviaUDP = (function (_super) {
        __extends(OSCviaUDP, _super);
        function OSCviaUDP(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            return _this;
        }
        OSCviaUDP.prototype.sendMessage = function (address, values) {
            var messageStringParts = split(values, { separator: ',', quotes: true });
            if (values[0] != '[') {
                values = '[' + values + ']';
            }
            var message = [];
            var data = JSON.parse(values);
            for (var i = 0; i < data.length; i++) {
                var dataEntry = data[i];
                var dataString = messageStringParts[i];
                var typeName = typeof dataEntry;
                if (typeName === 'number') {
                    this.addNumber(message, dataEntry, dataString);
                }
                if (typeName === 'string') {
                    this.addString(message, dataEntry);
                }
                if (typeName === 'boolean') {
                    this.addBoolean(message, dataEntry);
                }
                if (typeName == 'bigint') {
                }
            }
            var bytes = [];
            this.addRange(bytes, this.toOSCStringBytes(address));
            this.addRange(bytes, this.toOSCStringBytes(this.renderDataTags(message)));
            this.addRange(bytes, this.renderData(message));
            this.socket.sendBytes(bytes);
        };
        OSCviaUDP.prototype.addBoolean = function (message, value) {
            this.addValue(message, value ? OSC_TYPE_TAG_BOOLEAN_TRUE : OSC_TYPE_TAG_BOOLEAN_FALSE, []);
        };
        OSCviaUDP.prototype.addNumber = function (message, value, valueString) {
            if (this.isInteger(value) &&
                valueString.indexOf('.') < 0) {
                this.addInteger(message, value);
            }
            else {
                this.addFloat(message, value);
            }
        };
        OSCviaUDP.prototype.addInteger = function (message, value) {
            var bytes = this.getInt32Bytes(value);
            this.addValue(message, OSC_TYPE_TAG_INT32, bytes);
        };
        OSCviaUDP.prototype.addFloat = function (message, value) {
            var bytes = this.getFloat32Bytes(value);
            this.addValue(message, OSC_TYPE_TAG_FLOAT32, bytes);
        };
        OSCviaUDP.prototype.addString = function (message, value) {
            var bytes = this.toOSCStringBytes(value);
            this.addValue(message, OSC_TYPE_TAG_OSC_STRING, bytes);
        };
        OSCviaUDP.prototype.renderData = function (message) {
            var bytes = [];
            var messageData = message;
            for (var i = 0; i < messageData.length; i++) {
                this.addRange(bytes, messageData[i]['bytes']);
            }
            return bytes;
        };
        OSCviaUDP.prototype.renderDataTags = function (message) {
            var dataTags = ',';
            var messageData = message;
            for (var i = 0; i < messageData.length; i++) {
                dataTags += messageData[i]['type'];
            }
            return dataTags;
        };
        OSCviaUDP.prototype.addValue = function (message, valueType, bytes) {
            message.push({
                'type': valueType,
                'bytes': bytes
            });
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
        OSCviaUDP.prototype.isInteger = function (value) {
            return typeof value === 'number' &&
                isFinite(value) &&
                Math.floor(value) === value;
        };
        OSCviaUDP.prototype.isSafeInteger = function (value) {
            return this.isInteger(value) &&
                Math.abs(value) <= MAX_SAFE_INTEGER;
        };
        __decorate([
            Meta.callable('send OSC message'),
            __param(0, Meta.parameter('OSC address')),
            __param(1, Meta.parameter('JSON array /wo brackets. fx to send the values 1 (int), 2.0 (float), and "hello" (string) \'1, 2.0, "hello"\' or "1, 2.0, \\"hello\\"".')),
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
