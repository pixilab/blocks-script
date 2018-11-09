import {Spot, DisplaySpot, SpotGroup} from "system/Spot";
import {Script, ScriptEnv} from "system_lib/Script";
import * as Meta from "system_lib/Metadata";

export class NavigationSynchronizer extends Script {
    private navigationMasters : NavigationMaster[] = [];

    public constructor(env : ScriptEnv) {
        super(env);
    }

    @Meta.callable("Start Spot Synchronisation")
    public start(
        spotGroup : string,
        spotMaster : string,
        spotSlaves : string
    ): void {
        var group = <SpotGroup>Spot[spotGroup];
        if (!group) return;
        var master = this.getNavigationMaster(group, spotMaster);
        var spotSlaveList = spotSlaves.split(',');
        spotSlaveList.forEach(slave => master.subscribe(slave.trim()));
    }

    @Meta.callable("Stop Spot Synchronisation")
    public stop(
        spotGroup : string,
        spotMaster : string,
        spotSlaves : string
    ): void {
        var group = <SpotGroup>Spot[spotGroup];
        if (!group) return;
        var master = this.getNavigationMaster(group, spotMaster);
        var spotSlaveList = spotSlaves.split(',');
        spotSlaveList.forEach(slave => master.unsubscribe(slave.trim()));
    }

    private getNavigationMaster (spotGroup : SpotGroup, masterName : string) : NavigationMaster
    {
        var navigationMaster : NavigationMaster = undefined;
        for (let i = 0; i < this.navigationMasters.length; i++) {
            var master = this.navigationMasters[i];
            if (master.spotGroup == spotGroup && master.sourceSpotName == masterName)
            {
                navigationMaster = master;
                break;
            }
        }
        if (!navigationMaster)
        {
            navigationMaster = new NavigationMaster(spotGroup, masterName);
            this.navigationMasters.push(navigationMaster);
        }
        return navigationMaster;
    }

}

class NavigationMaster
{
    spotGroup : SpotGroup;
    sourceSpotName : string;
    sourceSpot : DisplaySpot = undefined;
    targetSpots : DisplaySpot[] = [];
    hooked : boolean = false;

    private static masters : NavigationMaster[] = [];

    constructor (spotGroup : SpotGroup, sourceSpotName : string)
    {
        this.spotGroup = spotGroup;
        this.sourceSpotName = sourceSpotName;
        this.hookUpSource();
        NavigationMaster.masters.push(this);
    }

    subscribe (targetSpotName : string)
    {
        var targetSpot = <DisplaySpot>this.spotGroup[targetSpotName];
        if (!targetSpot)
        {
            console.warn('no spot named ' + targetSpotName);
            return;
        }
        this.targetSpots.push(targetSpot);
    }

    unsubscribe (targetSpotName : string)
    {
        var targetSpot = <DisplaySpot>this.spotGroup[targetSpotName];
        if (!targetSpot)
        {
            console.warn('no spot named ' + targetSpotName);
            return;
        }
        this.targetSpots = this.targetSpots.filter(spot => spot == targetSpot);
    }

    private hookUpSource(): void
    {
        if (!this.sourceSpot) {
            this.hooked = true;
            this.sourceSpot = <DisplaySpot>this.spotGroup[this.sourceSpotName];
            if (!this.sourceSpot)
            {
                console.warn('no spot named ' + this.sourceSpotName);
                this.hooked = false;
                return;
            }
            this.sourceSpot.subscribe('navigation', this.syncPath);
            this.sourceSpot.subscribe('finish', this.reHookUp);
        }
    }

    private unhookSource(): void
    {
        if (this.sourceSpot) {
            this.hooked = false;
            this.sourceSpot.unsubscribe('navigation', this.syncPath);
            this.sourceSpot.unsubscribe('finish', this.reHookUp);
            this.sourceSpot = undefined;
        }
    }

    private syncPath(sender: DisplaySpot, message: {targetPath: string}) : void
    {
        var master = NavigationMaster.findMaster(sender);
        if (!master) return;
        //console.log("got sync path request - " + master.hooked);
        if (!master.hooked) return;
        for (let i = 0; i < master.targetSpots.length; i++) {
            var targetSpot = master.targetSpots[i];
            targetSpot.gotoPage(message.targetPath);
        }
        //console.log("Navigated to", message.targetPath);
    }

    private reHookUp ()
    {
        if (!this.hooked) return;
        this.sourceSpot = undefined;
        this.hookUpSource();
    }

    private static findMaster (spot : DisplaySpot) : NavigationMaster
    {
        for (let i = 0; i < NavigationMaster.masters.length; i++) {
            var m = NavigationMaster.masters[i];
            if (m.sourceSpot == spot)
            {
                return m;
            }
        }
        return undefined;
    }
}
