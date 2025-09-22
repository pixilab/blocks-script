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
define(["require", "exports", "system_lib/Driver", "system/SimpleHTTP", "system_lib/Metadata"], function (require, exports, Driver_1, SimpleHTTP_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NetioPowerBox = void 0;
    var NetioPowerBox = (function (_super) {
        __extends(NetioPowerBox, _super);
        function NetioPowerBox(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.mConnected = false;
            _this.outputs = [];
            SimpleHTTP_1.SimpleHTTP.newRequest("http://".concat(socket.address, "/netio.json"))
                .get().then(function (result) {
                _this.connected = true;
                var parsedResponse = JSON.parse(result.data);
                _this.outputs = parsedResponse.Outputs;
            }).catch(function (error) { return _this.requestFailed(error); });
            var noOfOutlets = parseInt(socket.options) | 2;
            for (var i = 1; i <= noOfOutlets; i++)
                _this.createOutlets(i);
            return _this;
        }
        NetioPowerBox.prototype.requestFailed = function (error) {
            this.connected = false;
            console.warn(error);
        };
        Object.defineProperty(NetioPowerBox.prototype, "connected", {
            get: function () {
                return this.mConnected;
            },
            set: function (value) {
                this.mConnected = value;
            },
            enumerable: false,
            configurable: true
        });
        NetioPowerBox.prototype.createOutlets = function (outletNumber) {
            var _this = this;
            this.property("Power outlet ".concat(outletNumber), { type: 'Boolean', description: 'Power on outlet ' + outletNumber }, function (val) {
                if (val !== undefined) {
                    var theOutlet1 = _this.outputs.filter(function (x) { return x.ID === 1; })[0];
                    theOutlet1.State = val ? 1 : 0;
                    SimpleHTTP_1.SimpleHTTP.newRequest("http://".concat(_this.socket.address, "/netio.json")).
                        post("{ \"Outputs\":[ { \"ID\":\"".concat(outletNumber, "\", \"Action\":\"").concat(val ? 1 : 0, "\" } ] }"), 'application/json').then(function (result) {
                        _this.connected = true;
                        var jsonObj = JSON.parse(result.data);
                        _this.outputs = jsonObj.Outputs;
                        _this.changed("Power outlet ".concat(outletNumber));
                    }).catch(function (error) { return _this.requestFailed(error); });
                }
                var state = _this.outputs.filter(function (x) { return x.ID == outletNumber; })[0];
                if (state)
                    return state.State == 1 ? true : false;
            });
        };
        __decorate([
            (0, Metadata_1.property)("True if communication attempt succeeded", true),
            __metadata("design:type", Boolean),
            __metadata("design:paramtypes", [Boolean])
        ], NetioPowerBox.prototype, "connected", null);
        NetioPowerBox = __decorate([
            (0, Metadata_1.driver)('NetworkTCP', { port: 80 }),
            __metadata("design:paramtypes", [Object])
        ], NetioPowerBox);
        return NetioPowerBox;
    }(Driver_1.Driver));
    exports.NetioPowerBox = NetioPowerBox;
});
