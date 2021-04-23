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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define(["require", "exports", "../system_lib/Metadata", "../system_lib/Driver"], function (require, exports, Metadata_1, Driver_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Pharos = void 0;
    var Pharos = (function (_super) {
        __extends(Pharos, _super);
        function Pharos(socket) {
            var _this = _super.call(this, socket) || this;
            _this.socket = socket;
            socket.autoConnect();
            _this.scene = _this.indexedProperty("scene", Scene);
            for (var pix = 0; pix < Pharos_1.kNumScenes; ++pix)
                _this.scene.push(new Scene(_this, pix));
            return _this;
        }
        Pharos_1 = Pharos;
        var Pharos_1;
        Pharos.kNumScenes = 25;
        Pharos = Pharos_1 = __decorate([
            Metadata_1.driver('NetworkTCP', { port: 3000 }),
            __metadata("design:paramtypes", [Object])
        ], Pharos);
        return Pharos;
    }(Driver_1.Driver));
    exports.Pharos = Pharos;
    var Scene = (function () {
        function Scene(owner, ix) {
            this.owner = owner;
            this.ix = ix;
            this.mState = 0;
        }
        Object.defineProperty(Scene.prototype, "state", {
            get: function () {
                return this.mState;
            },
            set: function (value) {
                this.mState = value;
                this.owner.socket.sendText("scen" + (this.mState ? 'on' : 'off') + this.ix);
            },
            enumerable: false,
            configurable: true
        });
        __decorate([
            Metadata_1.property("Scene being on (1) or off (0)"),
            __metadata("design:type", Number),
            __metadata("design:paramtypes", [Number])
        ], Scene.prototype, "state", null);
        return Scene;
    }());
});
