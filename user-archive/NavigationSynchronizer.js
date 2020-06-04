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
define(["require", "exports", "system/Spot", "system_lib/Script", "system_lib/Metadata"], function (require, exports, Spot_1, Script_1, Meta) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NavigationSynchronizer = void 0;
    var NavigationSynchronizer = (function (_super) {
        __extends(NavigationSynchronizer, _super);
        function NavigationSynchronizer(env) {
            var _this = _super.call(this, env) || this;
            _this.navigationMasters = [];
            return _this;
        }
        NavigationSynchronizer.prototype.start = function (spotGroup, spotMaster, spotSlaves) {
            var group = Spot_1.Spot[spotGroup];
            if (!group)
                return;
            var master = this.getNavigationMaster(group, spotMaster);
            var spotSlaveList = spotSlaves.split(',');
            spotSlaveList.forEach(function (slave) { return master.subscribe(slave.trim()); });
        };
        NavigationSynchronizer.prototype.stop = function (spotGroup, spotMaster, spotSlaves) {
            var group = Spot_1.Spot[spotGroup];
            if (!group)
                return;
            var master = this.getNavigationMaster(group, spotMaster);
            var spotSlaveList = spotSlaves.split(',');
            spotSlaveList.forEach(function (slave) { return master.unsubscribe(slave.trim()); });
        };
        NavigationSynchronizer.prototype.getNavigationMaster = function (spotGroup, masterName) {
            var navigationMaster = undefined;
            for (var i = 0; i < this.navigationMasters.length; i++) {
                var master = this.navigationMasters[i];
                if (master.spotGroup == spotGroup && master.sourceSpotName == masterName) {
                    navigationMaster = master;
                    break;
                }
            }
            if (!navigationMaster) {
                navigationMaster = new NavigationMaster(spotGroup, masterName);
                this.navigationMasters.push(navigationMaster);
            }
            return navigationMaster;
        };
        __decorate([
            Meta.callable("Start Spot Synchronisation"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, String]),
            __metadata("design:returntype", void 0)
        ], NavigationSynchronizer.prototype, "start", null);
        __decorate([
            Meta.callable("Stop Spot Synchronisation"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String, String]),
            __metadata("design:returntype", void 0)
        ], NavigationSynchronizer.prototype, "stop", null);
        return NavigationSynchronizer;
    }(Script_1.Script));
    exports.NavigationSynchronizer = NavigationSynchronizer;
    var NavigationMaster = (function () {
        function NavigationMaster(spotGroup, sourceSpotName) {
            this.sourceSpot = undefined;
            this.targetSpots = [];
            this.hooked = false;
            this.spotGroup = spotGroup;
            this.sourceSpotName = sourceSpotName;
            this.hookUpSource();
            NavigationMaster.masters.push(this);
        }
        NavigationMaster.prototype.subscribe = function (targetSpotName) {
            var targetSpot = this.spotGroup[targetSpotName];
            if (!targetSpot) {
                console.warn('no spot named ' + targetSpotName);
                return;
            }
            this.targetSpots.push(targetSpot);
        };
        NavigationMaster.prototype.unsubscribe = function (targetSpotName) {
            var targetSpot = this.spotGroup[targetSpotName];
            if (!targetSpot) {
                console.warn('no spot named ' + targetSpotName);
                return;
            }
            this.targetSpots = this.targetSpots.filter(function (spot) { return spot == targetSpot; });
        };
        NavigationMaster.prototype.hookUpSource = function () {
            if (!this.sourceSpot) {
                this.hooked = true;
                this.sourceSpot = this.spotGroup[this.sourceSpotName];
                if (!this.sourceSpot) {
                    console.warn('no spot named ' + this.sourceSpotName);
                    this.hooked = false;
                    return;
                }
                this.sourceSpot.subscribe('navigation', this.syncPath);
                this.sourceSpot.subscribe('finish', this.reHookUp);
            }
        };
        NavigationMaster.prototype.unhookSource = function () {
            if (this.sourceSpot) {
                this.hooked = false;
                this.sourceSpot.unsubscribe('navigation', this.syncPath);
                this.sourceSpot.unsubscribe('finish', this.reHookUp);
                this.sourceSpot = undefined;
            }
        };
        NavigationMaster.prototype.syncPath = function (sender, message) {
            var master = NavigationMaster.findMaster(sender);
            if (!master)
                return;
            if (!master.hooked)
                return;
            for (var i = 0; i < master.targetSpots.length; i++) {
                var targetSpot = master.targetSpots[i];
                targetSpot.gotoPage(message.targetPath);
            }
        };
        NavigationMaster.prototype.reHookUp = function () {
            if (!this.hooked)
                return;
            this.sourceSpot = undefined;
            this.hookUpSource();
        };
        NavigationMaster.findMaster = function (spot) {
            for (var i = 0; i < NavigationMaster.masters.length; i++) {
                var m = NavigationMaster.masters[i];
                if (m.sourceSpot == spot) {
                    return m;
                }
            }
            return undefined;
        };
        NavigationMaster.masters = [];
        return NavigationMaster;
    }());
});
