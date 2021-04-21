var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define(["require", "exports", "./Driver"], function (require, exports, Driver_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NetworkDriver = void 0;
    var NetworkDriver = (function (_super) {
        __extends(NetworkDriver, _super);
        function NetworkDriver(mySocket) {
            var _this = _super.call(this, mySocket) || this;
            _this.mySocket = mySocket;
            return _this;
        }
        Object.defineProperty(NetworkDriver.prototype, "name", {
            get: function () {
                return this.mySocket.name;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(NetworkDriver.prototype, "fullName", {
            get: function () {
                return this.mySocket.fullName;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(NetworkDriver.prototype, "enabled", {
            get: function () {
                return this.mySocket.enabled;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(NetworkDriver.prototype, "address", {
            get: function () {
                return this.mySocket.address;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(NetworkDriver.prototype, "port", {
            get: function () {
                return this.mySocket.port;
            },
            enumerable: false,
            configurable: true
        });
        return NetworkDriver;
    }(Driver_1.Driver));
    exports.NetworkDriver = NetworkDriver;
});
