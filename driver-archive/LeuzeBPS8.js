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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LeuzeBPS8 = void 0;
    var POLL_INTERVAL = 200;
    var TIMEOUT = 2000;
    var DEFAULT_PORT = 4001;
    var LeuzeBPS8 = exports.LeuzeBPS8 = (function (_super) {
        __extends(LeuzeBPS8, _super);
        function LeuzeBPS8(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mConnected = false;
            _this.mPosition = 0;
            _this.mInternalError = false;
            _this.mTapeError = false;
            _this.mDiagnosticDataExist = false;
            _this.mMarkerBarCodePresent = false;
            _this.mStandbyState = false;
            _this.mReadQuality = 3;
            _this.mReadQualityString = '';
            _this.mReadTimeout = false;
            socket.subscribe('connect', function () { return _this.connectStateChanged(); });
            socket.subscribe('bytesReceived', function (_, msg) { return _this.bytesReceived(msg.rawData); });
            socket.subscribe('finish', function () { return _this.tearDownConnection(); });
            socket.autoConnect(true);
            _this.connected = socket.connected;
            if (_this.connected) {
                _this.setupConnection();
            }
            return _this;
        }
        Object.defineProperty(LeuzeBPS8.prototype, "connected", {
            get: function () { return this.mConnected; },
            set: function (val) { this.mConnected = val; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LeuzeBPS8.prototype, "position", {
            get: function () { return this.mPosition; },
            set: function (val) { this.mPosition = val; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LeuzeBPS8.prototype, "internalError", {
            get: function () { return this.mInternalError; },
            set: function (val) { this.mInternalError = val; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LeuzeBPS8.prototype, "tapeError", {
            get: function () { return this.mTapeError; },
            set: function (val) { this.mTapeError = val; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LeuzeBPS8.prototype, "diagnosticDataExist", {
            get: function () { return this.mDiagnosticDataExist; },
            set: function (val) { this.mDiagnosticDataExist = val; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LeuzeBPS8.prototype, "markerBarCodePresent", {
            get: function () { return this.mMarkerBarCodePresent; },
            set: function (val) { this.mMarkerBarCodePresent = val; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LeuzeBPS8.prototype, "standbyState", {
            get: function () { return this.mStandbyState; },
            set: function (val) { this.mStandbyState = val; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LeuzeBPS8.prototype, "readQuality", {
            get: function () { return this.mReadQuality; },
            set: function (val) { this.mReadQuality = val; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LeuzeBPS8.prototype, "readQualityString", {
            get: function () { return this.mReadQualityString; },
            set: function (val) { this.mReadQualityString = val; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(LeuzeBPS8.prototype, "readTimeout", {
            get: function () { return this.mReadTimeout; },
            set: function (val) { this.mReadTimeout = val; },
            enumerable: false,
            configurable: true
        });
        LeuzeBPS8.prototype.setupConnection = function () {
            if (this.pollTimer) {
                this.pollTimer.cancel();
            }
            this.runPollLoop();
            if (this.timeoutTimer) {
                this.timeoutTimer.cancel();
            }
            this.runTimeoutLoop();
        };
        LeuzeBPS8.prototype.tearDownConnection = function () {
            if (this.pollTimer) {
                this.pollTimer.cancel();
                this.pollTimer = undefined;
            }
            if (this.timeoutTimer) {
                this.timeoutTimer.cancel();
                this.timeoutTimer = undefined;
            }
        };
        LeuzeBPS8.prototype.runPollLoop = function () {
            var _this = this;
            this.leuzeSendPoll();
            this.pollTimer = wait(POLL_INTERVAL);
            this.pollTimer.then(function () { return _this.runPollLoop(); });
        };
        LeuzeBPS8.prototype.runTimeoutLoop = function () {
            var _this = this;
            this.timeoutTimer = wait(TIMEOUT);
            this.timeoutTimer.then(function () {
                if (!_this.readTimeout) {
                    _this.readTimeout = true;
                    console.warn("Timeout, no data received from device in ".concat(TIMEOUT, " ms"));
                }
                if (_this.pollTimer) {
                    _this.pollTimer.cancel();
                    _this.pollTimer = undefined;
                }
                _this.leuzeSendPoll();
                _this.runTimeoutLoop();
            });
        };
        LeuzeBPS8.prototype.bytesReceived = function (bytes) {
            this.leuzeProcessData(bytes);
            if (this.timeoutTimer) {
                this.timeoutTimer.cancel();
            }
            this.runTimeoutLoop();
            if (this.readTimeout) {
                this.readTimeout = false;
                console.warn('Cleared timeout condition');
            }
            if (!this.pollTimer) {
                this.runPollLoop();
            }
        };
        LeuzeBPS8.prototype.connectStateChanged = function () {
            console.info("Connect state changed to", this.socket.connected);
            this.connected = this.socket.connected;
            if (this.socket.connected) {
                this.setupConnection();
            }
            else {
                this.tearDownConnection();
            }
        };
        LeuzeBPS8.prototype.send = function (data) {
            this.socket.sendBytes(data);
        };
        LeuzeBPS8.prototype.toBinary = function (input) {
            var padToOctet = function (s) { return ('00000000' + s).substring(s.length); };
            var output = [];
            for (var i = 0; i < input.length; i++) {
                output.push(padToOctet(input[i].toString(2)));
            }
            return output.join(' ');
        };
        LeuzeBPS8.prototype.leuzeSendPoll = function () {
            this.send([0x08, 0x08]);
        };
        LeuzeBPS8.prototype.leuzeProcessData = function (data) {
            var NUM_OCTETS = 6;
            var ERR = 0x01;
            var OUT = 0x02;
            var D = 0x04;
            var MM = 0x08;
            var SLEEP = 0x10;
            var Q = 0x60;
            var readQualityStrings = { 0: '> 75%', 1: '50% - 75%', 2: '25% - 50%', 3: '< 25%' };
            if (data.length != NUM_OCTETS) {
                console.warn("Discarded reply with incorrect length: expected ".concat(NUM_OCTETS, " bytes, received ").concat(data.length));
                return;
            }
            var s = data[0], d1 = data[1], d2 = data[2], d3 = data[3], d4 = data[4], c = data[5];
            if ((s ^ d1 ^ d2 ^ d3 ^ d4) != c) {
                console.warn('Discarded reply with incorrect checksum');
                return;
            }
            this.internalError = !!(s & ERR);
            this.tapeError = !!(s & OUT);
            this.diagnosticDataExist = !!(s & D);
            this.markerBarCodePresent = !!(s & MM);
            this.standbyState = !!(s & SLEEP);
            var readQuality = ((s & Q) >> 5);
            this.readQuality = readQuality;
            this.readQualityString = readQualityStrings[readQuality];
            this.position = new Int32Array([(d1 << 24) + (d2 << 16) + (d3 << 8) + d4])[0];
        };
        __decorate([
            Meta.property("Connected to TCP server", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], LeuzeBPS8.prototype, "connected", null);
        __decorate([
            Meta.property("Sensor position (in mm)", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LeuzeBPS8.prototype, "position", null);
        __decorate([
            Meta.property("Leuze indicates internal error", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], LeuzeBPS8.prototype, "internalError", null);
        __decorate([
            Meta.property("Leuze indicates tape error", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], LeuzeBPS8.prototype, "tapeError", null);
        __decorate([
            Meta.property("Leuze indicates diagnostic data logged", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], LeuzeBPS8.prototype, "diagnosticDataExist", null);
        __decorate([
            Meta.property("Leuze indicates marker bar code in memory", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], LeuzeBPS8.prototype, "markerBarCodePresent", null);
        __decorate([
            Meta.property("Leuze indicates device in standby state", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], LeuzeBPS8.prototype, "standbyState", null);
        __decorate([
            Meta.property("Read quality", true),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], LeuzeBPS8.prototype, "readQuality", null);
        __decorate([
            Meta.property("Read quality string", true),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], LeuzeBPS8.prototype, "readQualityString", null);
        __decorate([
            Meta.property("Read timeout", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], LeuzeBPS8.prototype, "readTimeout", null);
        LeuzeBPS8 = __decorate([
            Meta.driver('NetworkTCP', { port: DEFAULT_PORT }),
            __metadata("design:paramtypes", [Object])
        ], LeuzeBPS8);
        return LeuzeBPS8;
    }(Driver_1.Driver));
});
