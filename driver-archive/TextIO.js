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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TextIO = void 0;
    var TextIO = (function (_super) {
        __extends(TextIO, _super);
        function TextIO(connection) {
            var _this = _super.call(this, connection) || this;
            _this.connection = connection;
            _this.mRecievedText = '';
            _this.mAutoClear = true;
            connection.autoConnect();
            connection.subscribe('textReceived', function (sender, msg) {
                _this.recievedText = msg.text;
                log("Received: " + msg.text);
            });
            return _this;
        }
        TextIO.prototype.sendText = function (rawData, termination) {
            this.connection.sendText(rawData, termination);
            log("Sent: " + rawData);
        };
        Object.defineProperty(TextIO.prototype, "recievedText", {
            get: function () {
                return this.mRecievedText;
            },
            set: function (msg) {
                var _this = this;
                this.mRecievedText = msg;
                if (this.mClearTimer) {
                    this.mClearTimer.cancel();
                    this.mClearTimer = undefined;
                }
                if (msg && this.mAutoClear) {
                    this.mClearTimer = wait(300);
                    this.mClearTimer.then(function () {
                        _this.mClearTimer = undefined;
                        if (_this.mAutoClear)
                            _this.recievedText = '';
                    });
                }
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TextIO.prototype, "autoClear", {
            get: function () {
                return this.mAutoClear;
            },
            set: function (cmd) {
                this.mAutoClear = cmd;
            },
            enumerable: false,
            configurable: true
        });
        __decorate([
            (0, Metadata_1.callable)("Sends rawData to the device"),
            __param(1, (0, Metadata_1.parameter)('Line termination. Default is a carriage return. Pass null for none.', true)),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String]),
            __metadata("design:returntype", void 0)
        ], TextIO.prototype, "sendText", null);
        __decorate([
            (0, Metadata_1.property)("The most recently received text message"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], TextIO.prototype, "recievedText", null);
        __decorate([
            (0, Metadata_1.property)("Clear recievedText automatically after 300 mS"),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], TextIO.prototype, "autoClear", null);
        TextIO = __decorate([
            (0, Metadata_1.driver)('NetworkTCP'),
            (0, Metadata_1.driver)('SerialPort'),
            __metadata("design:paramtypes", [Object])
        ], TextIO);
        return TextIO;
    }(Driver_1.Driver));
    exports.TextIO = TextIO;
    var DEBUG = false;
    function log() {
        var messages = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            messages[_i] = arguments[_i];
        }
        if (DEBUG)
            console.info(messages);
    }
});
