import {Spot, DisplaySpot, SpotGroup} from "system/Spot";
import {Script, ScriptEnv} from "system_lib/Script";
import * as Meta from "system_lib/Metadata";

export class NavigationSynchronizer extends Script {
    private static sourceSpot: DisplaySpot;
    private static targetSpot: DisplaySpot;
    private static hookedUp: boolean;

    public constructor(env : ScriptEnv) {
        super(env);
        NavigationSynchronizer.hookedUp = false;
    }

    @Meta.callable("Start Spot Synchronisation")
    public start(
    ): void {
       return this.hookUpSrcEvent();
    }

    @Meta.callable("Stop Spot Synchronisation")
    public stop(
    ): void {
       return this.unhookSrcEvent();
    }

    /**
    Get the source spot providing the navigation event and make sure we have
    an event subscription hooked up for this event.
    */
    private hookUpSrcEvent(): void
    {
        if (!NavigationSynchronizer.sourceSpot) {
            console.log("hooking up sync");
            NavigationSynchronizer.hookedUp = true;
            const sg = <SpotGroup>Spot['plint'];
            NavigationSynchronizer.sourceSpot = <DisplaySpot>sg['plint_master'];
            NavigationSynchronizer.targetSpot = <DisplaySpot>sg['plint_slave'];
            NavigationSynchronizer.sourceSpot.subscribe('navigation', this.syncPath);
            // Re-hookup if sourceSpot reinitializes
            NavigationSynchronizer.sourceSpot.subscribe('finish', this.reHookUp);
        }
    }

    private unhookSrcEvent(): void
    {
        if (NavigationSynchronizer.sourceSpot) {
            NavigationSynchronizer.hookedUp = false;
            NavigationSynchronizer.sourceSpot.unsubscribe('navigation', this.syncPath);
            NavigationSynchronizer.sourceSpot.unsubscribe('finish', this.reHookUp);
            NavigationSynchronizer.sourceSpot = undefined;
        }
    }

    private syncPath(sender: DisplaySpot, message: {targetPath: string}) : void
    {
        console.log("got sync path request - " + NavigationSynchronizer.hookedUp);
        if (!NavigationSynchronizer.hookedUp) return;
        NavigationSynchronizer.targetSpot.gotoPage(message.targetPath);
        console.log("Navigated to", message.targetPath);
    }

    private reHookUp ()
    {
        if (!NavigationSynchronizer.hookedUp) return;
        NavigationSynchronizer.sourceSpot = undefined;
        this.hookUpSrcEvent();
    }
}
