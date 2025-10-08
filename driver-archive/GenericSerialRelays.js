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
    exports.GenericSerialRelays = void 0;
    var GenericSerialRelays = (function (_super) {
        __extends(GenericSerialRelays, _super);
        function GenericSerialRelays(connection) {
            var _this = _super.call(this, connection) || this;
            _this.connection = connection;
            connection.autoConnect(true);
            _this.relays = _this.indexedProperty("relays", Relay);
            return _this;
        }
        GenericSerialRelays.prototype.configureRelay = function (name) {
            var relay = new Relay(this.relays.length + 1, this, name);
            this.relays.push(relay);
        };
        GenericSerialRelays.prototype.sendCommand = function (relayNumber, state) {
            var START = 0xA0;
            var relay = relayNumber & 0xFF;
            var st = state ? 0x01 : 0x00;
            var checksum = (START + relay + st) & 0xFF;
            this.connection.sendBytes([START, relay, st, checksum]);
        };
        GenericSerialRelays.prototype.isNumeric = function (str) {
            return typeof str === "string" && str.trim() !== "" && !isNaN(Number(str));
        };
        __decorate([
            (0, Metadata_1.callable)("Configure Relay"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], GenericSerialRelays.prototype, "configureRelay", null);
        GenericSerialRelays = __decorate([
            (0, Metadata_1.driver)('NetworkTCP', { port: 4001 }),
            (0, Metadata_1.driver)('SerialPort', { baudRate: 9600 }),
            __metadata("design:paramtypes", [Object])
        ], GenericSerialRelays);
        return GenericSerialRelays;
    }(Driver_1.Driver));
    exports.GenericSerialRelays = GenericSerialRelays;
    var Relay = (function () {
        function Relay(ix, owner, name) {
            this.id = ix;
            this.owner = owner;
            this.mRelay = false;
            this.mName = name;
        }
        Object.defineProperty(Relay.prototype, "relay", {
            get: function () { return this.mRelay; },
            set: function (value) {
                if (value != this.mRelay)
                    this.owner.sendCommand(this.id, value);
                this.mRelay = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Relay.prototype, "name", {
            get: function () { return this.mName; },
            enumerable: false,
            configurable: true
        });
        __decorate([
            (0, Metadata_1.property)("Controls the relay", false),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], Relay.prototype, "relay", null);
        __decorate([
            (0, Metadata_1.property)("RelayName", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [])
        ], Relay.prototype, "name", null);
        return Relay;
    }());
});
