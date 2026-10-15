"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NavigationSynchronizer = void 0;
const Spot_1 = require("../system/Spot");
const Script_1 = require("../system_lib/Script");
const Meta = __importStar(require("../system_lib/Metadata"));
class NavigationSynchronizer extends Script_1.Script {
    navigationMasters = [];
    constructor(env) {
        super(env);
    }
    start(spotGroup, spotMaster, spotSlaves) {
        var group = Spot_1.Spot[spotGroup];
        if (!group)
            return;
        var master = this.getNavigationMaster(group, spotMaster);
        var spotSlaveList = spotSlaves.split(',');
        spotSlaveList.forEach(slave => master.subscribe(slave.trim()));
    }
    stop(spotGroup, spotMaster, spotSlaves) {
        var group = Spot_1.Spot[spotGroup];
        if (!group)
            return;
        var master = this.getNavigationMaster(group, spotMaster);
        var spotSlaveList = spotSlaves.split(',');
        spotSlaveList.forEach(slave => master.unsubscribe(slave.trim()));
    }
    getNavigationMaster(spotGroup, masterName) {
        var navigationMaster = undefined;
        for (let i = 0; i < this.navigationMasters.length; i++) {
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
    }
}
exports.NavigationSynchronizer = NavigationSynchronizer;
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
class NavigationMaster {
    spotGroup;
    sourceSpotName;
    sourceSpot = undefined;
    targetSpots = [];
    hooked = false;
    static masters = [];
    constructor(spotGroup, sourceSpotName) {
        this.spotGroup = spotGroup;
        this.sourceSpotName = sourceSpotName;
        this.hookUpSource();
        NavigationMaster.masters.push(this);
    }
    subscribe(targetSpotName) {
        var targetSpot = this.spotGroup[targetSpotName];
        if (!targetSpot) {
            console.warn('no spot named ' + targetSpotName);
            return;
        }
        this.targetSpots.push(targetSpot);
    }
    unsubscribe(targetSpotName) {
        var targetSpot = this.spotGroup[targetSpotName];
        if (!targetSpot) {
            console.warn('no spot named ' + targetSpotName);
            return;
        }
        this.targetSpots = this.targetSpots.filter(spot => spot == targetSpot);
    }
    hookUpSource() {
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
    }
    unhookSource() {
        if (this.sourceSpot) {
            this.hooked = false;
            this.sourceSpot.unsubscribe('navigation', this.syncPath);
            this.sourceSpot.unsubscribe('finish', this.reHookUp);
            this.sourceSpot = undefined;
        }
    }
    syncPath(sender, message) {
        var master = NavigationMaster.findMaster(sender);
        if (!master)
            return;
        if (!master.hooked)
            return;
        for (let i = 0; i < master.targetSpots.length; i++) {
            var targetSpot = master.targetSpots[i];
            targetSpot.gotoBlock(message.targetPath);
        }
    }
    reHookUp() {
        if (!this.hooked)
            return;
        this.sourceSpot = undefined;
        this.hookUpSource();
    }
    static findMaster(spot) {
        for (let i = 0; i < NavigationMaster.masters.length; i++) {
            var m = NavigationMaster.masters[i];
            if (m.sourceSpot == spot) {
                return m;
            }
        }
        return undefined;
    }
}
