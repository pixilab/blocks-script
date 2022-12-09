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
define(["require", "exports", "../system_lib/Driver", "../system_lib/Metadata", "../system/SimpleHTTP", "../system_lib/Metadata"], function (require, exports, Driver_1, Metadata_1, SimpleHTTP_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Control4HTTP = void 0;
    var Control4HTTP = (function (_super) {
        __extends(Control4HTTP, _super);
        function Control4HTTP(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mOrigin = "http://".concat(socket.address);
            if (socket.port !== 80)
                _this.mOrigin = _this.mOrigin + ':' + socket.port;
            return _this;
        }
        Control4HTTP.prototype.ping = function (path) {
            return SimpleHTTP_1.SimpleHTTP
                .newRequest("".concat(this.mOrigin, "/").concat(path))
                .get();
        };
        __decorate([
            (0, Metadata_1.callable)("Ping specified path with a GET request"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", void 0)
        ], Control4HTTP.prototype, "ping", null);
        Control4HTTP = __decorate([
            Meta.driver('NetworkTCP', { port: 51048 }),
            __metadata("design:paramtypes", [Object])
        ], Control4HTTP);
        return Control4HTTP;
    }(Driver_1.Driver));
    exports.Control4HTTP = Control4HTTP;
});
