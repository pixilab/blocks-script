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
define(["require", "exports", "system/SimpleFile", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, SimpleFile_1, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PersistentDrvr = void 0;
    var PersistentDrvr = (function (_super) {
        __extends(PersistentDrvr, _super);
        function PersistentDrvr(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            socket.autoConnect();
            var myFullName = socket.fullName;
            console.log("fullName", myFullName);
            SimpleFile_1.SimpleFile.read(myFullName).then(function (readValue) {
                if (_this.mStringo !== readValue) {
                    _this.mStringo = readValue;
                    socket.changed("stringo");
                }
            }).catch(function (error) {
                return console.warn("Can't read file", myFullName, error);
            });
            return _this;
        }
        Object.defineProperty(PersistentDrvr.prototype, "stringo", {
            get: function () {
                return this.mStringo;
            },
            set: function (value) {
                if (this.mStringo !== value) {
                    this.mStringo = value;
                    console.log("stringo", value);
                    SimpleFile_1.SimpleFile.write(this.socket.fullName, value).catch(function (error) {
                        return console.warn("Can't write file", error);
                    });
                }
            },
            enumerable: false,
            configurable: true
        });
        __decorate([
            Metadata_1.property("Persisted property"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], PersistentDrvr.prototype, "stringo", null);
        PersistentDrvr = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 1025 }),
            __metadata("design:paramtypes", [Object])
        ], PersistentDrvr);
        return PersistentDrvr;
    }(Driver_1.Driver));
    exports.PersistentDrvr = PersistentDrvr;
});
