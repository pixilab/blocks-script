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
define(["require", "exports", "system/Spot", "system_lib/Script", "system_lib/Metadata"], function (require, exports, Spot_1, Script_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var NavigationSynchronizer = (function (_super) {
        __extends(NavigationSynchronizer, _super);
        function NavigationSynchronizer(env) {
            var _this = _super.call(this, env) || this;
            NavigationSynchronizer.hookedUp = false;
            return _this;
        }
        NavigationSynchronizer.prototype.start = function () {
            return this.hookUpSrcEvent();
        };
        NavigationSynchronizer.prototype.stop = function () {
            return this.unhookSrcEvent();
        };
        NavigationSynchronizer.prototype.hookUpSrcEvent = function () {
            if (!NavigationSynchronizer.sourceSpot) {
                console.log("hooking up sync");
                NavigationSynchronizer.hookedUp = true;
                var sg = Spot_1.Spot['plint'];
                NavigationSynchronizer.sourceSpot = sg['plint_master'];
                NavigationSynchronizer.targetSpot = sg['plint_slave'];
                NavigationSynchronizer.sourceSpot.subscribe('navigation', this.syncPath);
                NavigationSynchronizer.sourceSpot.subscribe('finish', this.reHookUp);
            }
        };
        NavigationSynchronizer.prototype.unhookSrcEvent = function () {
            if (NavigationSynchronizer.sourceSpot) {
                NavigationSynchronizer.hookedUp = false;
                NavigationSynchronizer.sourceSpot.unsubscribe('navigation', this.syncPath);
                NavigationSynchronizer.sourceSpot.unsubscribe('finish', this.reHookUp);
                NavigationSynchronizer.sourceSpot = undefined;
            }
        };
        NavigationSynchronizer.prototype.syncPath = function (sender, message) {
            console.log("got sync path request - " + NavigationSynchronizer.hookedUp);
            if (!NavigationSynchronizer.hookedUp)
                return;
            NavigationSynchronizer.targetSpot.gotoPage(message.targetPath);
            console.log("Navigated to", message.targetPath);
        };
        NavigationSynchronizer.prototype.reHookUp = function () {
            if (!NavigationSynchronizer.hookedUp)
                return;
            NavigationSynchronizer.sourceSpot = undefined;
            this.hookUpSrcEvent();
        };
        __decorate([
            Meta.callable("Start Spot Synchronisation"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], NavigationSynchronizer.prototype, "start", null);
        __decorate([
            Meta.callable("Stop Spot Synchronisation"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], NavigationSynchronizer.prototype, "stop", null);
        return NavigationSynchronizer;
    }(Script_1.Script));
    exports.NavigationSynchronizer = NavigationSynchronizer;
});
