var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
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
define(["require", "exports", "system_lib/Script", "system_lib/Metadata", "system/SimpleFile", "system/WebRenderer"], function (require, exports, Script_1, Metadata_1, SimpleFile_1, WebRenderer_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Signature = (function (_super) {
        __extends(Signature, _super);
        function Signature(env) {
            var _this = _super.call(this, env) || this;
            console.log("Signature instantiated");
            return _this;
        }
        Signature.prototype.render = function (data) {
            var tempPath = data.tempPath;
            var src = "/temp/" + tempPath;
            var dest = "/public/block/Main/Signature/media/image.png";
            var compositeBlockUrl = "http://localhost:9080/spot/index.ftl?noConn=1&transparent=1&preview=1&block=" + encodeURI("Main/CompleteSignature");
            return SimpleFile_1.SimpleFile.move(src, dest, true).then(function () {
                return WebRenderer_1.WebRenderer.render(compositeBlockUrl, "Composite.png", 1920, 1080, 0, true);
            });
        };
        __decorate([
            Metadata_1.resource(),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Object]),
            __metadata("design:returntype", Object)
        ], Signature.prototype, "render", null);
        return Signature;
    }(Script_1.Script));
    exports.Signature = Signature;
});
