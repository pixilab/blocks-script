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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DIN_RY8_N = void 0;
    var DIN_RY8_N = exports.DIN_RY8_N = (function (_super) {
        __extends(DIN_RY8_N, _super);
        function DIN_RY8_N(connection) {
            var _this = _super.call(this, connection) || this;
            _this.connection = connection;
            _this._unitId = 1;
            _this.myOptions = { numberOfRelays: 8 };
            if (connection.options)
                _this.myOptions = JSON.parse(connection.options);
            _this.relays = _this.indexedProperty("relays", Relay);
            for (var rc = 0; rc < _this.myOptions.numberOfRelays; ++rc)
                _this.relays.push(new Relay(_this, rc));
            connection.autoConnect(true, { usbVendorId: 0x04d8, usbProductId: 0x000a });
            connection.subscribe('bytesReceived', function (sender, message) {
                return console.log(byteArrayToString(message.rawData));
            });
            return _this;
        }
        Object.defineProperty(DIN_RY8_N.prototype, "unitId", {
            get: function () {
                return this._unitId;
            },
            set: function (value) {
                this._unitId = value;
            },
            enumerable: false,
            configurable: true
        });
        DIN_RY8_N.prototype.testSend = function () {
            this.connection.sendBytes([0xf2, 0x01, 0xf3]);
            this.connection.sendBytes(stringToByteArray("TRLYSET"));
            this.connection.sendBytes([0xf4]);
            this.connection.sendBytes(stringToByteArray("P01:" + '1'));
            this.connection.sendBytes([0xF5, 0xF5]);
        };
        __decorate([
            (0, Metadata_1.property)("Relay box ID number"),
            (0, Metadata_1.min)(1),
            (0, Metadata_1.max)(99),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], DIN_RY8_N.prototype, "unitId", null);
        DIN_RY8_N = __decorate([
            (0, Metadata_1.driver)('SerialPort', { baudRate: 115200 }),
            __metadata("design:paramtypes", [Object])
        ], DIN_RY8_N);
        return DIN_RY8_N;
    }(Driver_1.Driver));
    var Relay = (function () {
        function Relay(owner, relayNumber) {
            this.owner = owner;
            this.relayNumber = relayNumber;
            this.m_on = false;
        }
        Object.defineProperty(Relay.prototype, "on", {
            get: function () {
                return this.m_on;
            },
            set: function (on) {
                if (this.m_on !== on) {
                    this.m_on = on;
                    this.owner.connection.sendBytes([0xf2, this.owner._unitId, 0xf3]);
                    this.owner.connection.sendBytes(stringToByteArray("TRLYSET"));
                    this.owner.connection.sendBytes([0xf4]);
                    var cmdString = "P0" + (this.relayNumber + 1) + ':' + (on ? '1' : '0');
                    this.owner.connection.sendBytes(stringToByteArray(cmdString));
                    this.owner.connection.sendBytes([0xF5, 0xF5]);
                }
            },
            enumerable: false,
            configurable: true
        });
        __decorate([
            (0, Metadata_1.property)("True if the relay is on"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], Relay.prototype, "on", null);
        return Relay;
    }());
    function stringToByteArray(str) {
        var len = str.length;
        var bytes = [];
        for (var ix = 0; ix < len; ++ix)
            bytes.push(str.charCodeAt(ix));
        return bytes;
    }
    function byteArrayToString(bytes) {
        var result = "";
        for (var ix = 0; ix < bytes.length; ++ix)
            result += ' 0x' + bytes[ix].toString(16);
        return result;
    }
});
