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
define(["require", "exports", "system_lib/Driver", "system_lib/Metadata"], function (require, exports, Driver_1, Metadata_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.GrandMA = void 0;
    var GrandMA = (function (_super) {
        __extends(GrandMA, _super);
        function GrandMA(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            _this.username = 'blocks';
            _this.password = '';
            socket.subscribe('connect', function (sender, message) {
                if (message.type === 'Connection')
                    _this.justConnected();
            });
            socket.subscribe('textReceived', function (sender, msg) {
                return _this.textReceived(msg.text);
            });
            socket.subscribe('finish', function (sender) {
                return _this.discard();
            });
            socket.autoConnect();
            return _this;
        }
        GrandMA.prototype.justConnected = function () {
            console.log('just connected');
            this.cmdLogin(this.username, this.password);
        };
        GrandMA.prototype.textReceived = function (message) {
        };
        GrandMA.prototype.cmdLogin = function (user, pw) {
            this.socket.sendText('Login "' + user + '" "' + pw + '"');
        };
        GrandMA.prototype.startMacro = function (macroID) {
            this.socket.sendText('Go Macro ' + macroID);
        };
        GrandMA.prototype.discard = function () {
        };
        __decorate([
            Metadata_1.callable('(Go Macro <id>)'),
            __param(0, Metadata_1.parameter('ID of macro to start')),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Number]),
            __metadata("design:returntype", void 0)
        ], GrandMA.prototype, "startMacro", null);
        GrandMA = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 30000 }),
            __metadata("design:paramtypes", [Object])
        ], GrandMA);
        return GrandMA;
    }(Driver_1.Driver));
    exports.GrandMA = GrandMA;
});
