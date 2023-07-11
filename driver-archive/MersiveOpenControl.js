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
define(["require", "exports", "../system/SimpleHTTP", "../system_lib/Metadata", "../system_lib/Driver"], function (require, exports, SimpleHTTP_1, Metadata_1, Driver_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MersiveOpenControl = void 0;
    var MersiveOpenControl = (function (_super) {
        __extends(MersiveOpenControl, _super);
        function MersiveOpenControl(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mAutorization = "";
            _this.mDisplayMode = 0;
            _this.mAutorization = socket.options;
            socket.autoConnect();
            var origin = socket.address;
            if (socket.port !== 80)
                origin += ':' + socket.port;
            _this.mOrigin = "http://".concat(origin, "/");
            return _this;
        }
        Object.defineProperty(MersiveOpenControl.prototype, "autorization", {
            get: function () {
                return this.mAutorization;
            },
            set: function (value) {
                this.mAutorization = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(MersiveOpenControl.prototype, "hdmiOutDisplay", {
            get: function () {
                return this.mDisplayMode;
            },
            set: function (mode) {
                this.mDisplayMode = mode;
                this.post('api/config', JSON.stringify({
                    m_generalCuration: {
                        hdmiOutDisplayMode: mode
                    }
                }));
            },
            enumerable: false,
            configurable: true
        });
        MersiveOpenControl.prototype.post = function (path, jsonData) {
            if (path.charAt(0) === '/')
                path = path.substring(1);
            var request = SimpleHTTP_1.SimpleHTTP.newRequest(this.mOrigin + path)
                .header("Accept", "*/*");
            if (this.mAutorization)
                request.header("Authorization", this.mAutorization);
            var result = request.post(jsonData);
            result.catch(function (error) { return console.error("POST to endpoint", path, "failed due to", error); });
            return result;
        };
        __decorate([
            (0, Metadata_1.property)("Authorization to use by requests"),
            __metadata("design:type", String),
            __metadata("design:paramtypes", [String])
        ], MersiveOpenControl.prototype, "autorization", null);
        __decorate([
            (0, Metadata_1.property)("HDMI output display mode setting; Mirror (1), Seamless (2), or Extend (3)"),
            (0, Metadata_1.min)(1),
            (0, Metadata_1.max)(3),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], MersiveOpenControl.prototype, "hdmiOutDisplay", null);
        __decorate([
            (0, Metadata_1.callable)("POSTs raw JSON data to the device"),
            __param(0, (0, Metadata_1.parameter)('Path to send to, such as "api/config"')),
            __param(1, (0, Metadata_1.parameter)('JSON data to be sent')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String]),
            __metadata("design:returntype", void 0)
        ], MersiveOpenControl.prototype, "post", null);
        MersiveOpenControl = __decorate([
            (0, Metadata_1.driver)('NetworkTCP', { port: 80 }),
            __metadata("design:paramtypes", [Object])
        ], MersiveOpenControl);
        return MersiveOpenControl;
    }(Driver_1.Driver));
    exports.MersiveOpenControl = MersiveOpenControl;
});
