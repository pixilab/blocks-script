/**
 * Driver to control Visio Exaplay
 * Support play,pause,stop, gotoCue,gotoTime, syncsource.
 * If controlled from blocks only, polling is not required, is e.g looping it done from cues on the Exaplay timeline, poolong is
 * required. This can be avoided by controlling loops from blocks.
 *
 * The Exaplay driver supports multiple compositions, each composition is represented by a named aggregate property.
 * Each composition has its own playState, volume and TimeFlow sync source.
 * The driver supports adding compositions dynamically using the addComposition callable method.
 * Each composition requires an ID as in Exaplay, and polling can be enabled/disabled per composition.
 * Polling interval can also be configured, but use with caution, a too low interval will come with a cost..
 * The driver communicates with the Exaplay over TCP using the NetworkTCP driver base class.
 * Commands are queued to avoid overloading the Exaplay with too many commands at once.
 * The driver expects responses for commands that request data, e.g get status.
 * The driver implements a simple timeout mechanism to handle cases where the Exaplay does not respond in time.
 *
 *
 * TimeFlow sync is done by polling the Exaplay for current time when playing.
 * Drift correction is implemented to keep the TimeFlow in sync with Exaplay time.
 * (This is due to lack of spontanios event messages in the Expalay tcp control api)
 *
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 *
 *
 * Created 2025 by Mattias Andersson.
 *
 * @version 1.1
 * 1.0 - Initial version. Basic play, pause, stop, gotoCue, gotoTime, volume and TimeFlow sync support. Polling support for TimeFlow sync.
 * 1.1 - Buggfixes. Handling message queue, flushing message queue on disable and reconfiguration. Added minimum pollinterval.
 *
 */

import { NetworkTCP } from "../system/Network";
import { Driver } from "../system_lib/Driver";
import { callable, driver, max, min, parameter, property } from "../system_lib/Metadata";
import { AggregateElem } from "../system_lib/ScriptBase";

interface Dictionary<TElem> { [id: string]: TElem; }

@driver('NetworkTCP', { port: 8100 })
export class Exaplay extends Driver<NetworkTCP> {
    private msgQueue: Request[] = [];
    private msgCurrent: Request | null = null;
    protected timeOut: CancelablePromise<void> | null = null;
    private readonly compositions: Dictionary<Composition>;
    private mDiscarded = false;
    private readonly kMaxQueue = 20;        // Max queued requests awaiting a reply
    private readonly kMinPollingMs = 200;   // Floor for per-composition polling interval

    public constructor(public connection: NetworkTCP) {
        super(connection);
        connection.autoConnect();
        this.compositions = this.namedAggregateProperty("compositions", Composition);

        connection.subscribe('textReceived', (sender, msg) => {
            this.handleResponse(msg.text)
        })
        // Anything queued across a connection change is stale - drop it
        connection.subscribe('connect', () => this.flushQueue());
        connection.subscribe('finish', () => this.discard());
    }

    public discard() {
        if (this.mDiscarded) return;
        this.mDiscarded = true;
        this.flushQueue();
        for (const compName in this.compositions) {
            const comp = this.compositions[compName];
            if (comp) comp.discard();
        }
    }

    /**
     * Reject and drop the in-flight request and everything queued behind it.
     * Rejects with "cancelled", which callers treat as silent.
     */
    private flushQueue() {
        if (this.timeOut) {
            this.timeOut.cancel();
            this.timeOut = null;
        }
        const current = this.msgCurrent;
        this.msgCurrent = null;
        const queued = this.msgQueue;
        this.msgQueue = [];
        if (current) current.reject("cancelled");
        for (const req of queued) req.reject("cancelled");
    }

    @callable("Reinitialize and reset the driver")
    reInitit() {
        this.reInitialize()
    }

    @callable("Configure a composition")
    addComposition(
        @parameter("Name to use for blocks property") name: string,
        @parameter("ID for the composition as in Exaplay ID") id: number,
        @parameter("Enable polling", true) enablePolling: boolean,
        @parameter("Pooling frequency, use with caution ~500ms recommended", true) pollingInterval: number
    ) {
        // Re-running config must not leave the old composition polling in the background
        const old = this.compositions[name];
        if (old) old.discard();
        const interval = Math.max(this.kMinPollingMs, pollingInterval || 500);
        this.compositions[name] = new Composition(this, id, enablePolling || false, interval);
    }
    @callable("Configure a composition")
    stopAllCompositions(

    ) {
        for (const compName in this.compositions) {
            const comp = this.compositions[compName];
            comp.playState = "STOP";
        }
    }

    sendCommand(command: string, id: number, expectResponse: boolean = false, value?: number, ) {
    return new Promise<string | void>((resolve, reject) => {
        if (this.mDiscarded) {
            reject("cancelled");
            return;
        }
        if (expectResponse) {
            // No point waiting out a timeout per request while offline, or piling up behind a stalled device
            if (!this.connection.connected || this.msgQueue.length >= this.kMaxQueue) {
                reject("cancelled");
                return;
            }
        }
        this.msgQueue.push({ command, id, value, resolve, reject, expectResponse });
        this.processNext();
    });
}

    private handleResponse(response: string) {
        if (!this.msgCurrent) {
            console.warn("Unexpected response:", response);
            return;
        }

        // Ignore anything that isn't a status reply (e.g. an ack to a fire-and-forget
        // command) instead of letting it answer the pending status request.
        if (this.msgCurrent.command === "get:status") {
            const parts = response.split(",").map(Number);
            if (parts.length < 5 || parts.some(p => isNaN(p))) {
                console.warn("Ignoring non-status reply:", response);
                return;
            }
        }

        if (this.timeOut) {
            this.timeOut.cancel();
            this.timeOut = null;
        }

        this.msgCurrent.resolve(response);
        this.msgCurrent = null;
        this.processNext();
    }

    private processNext() {
        if (this.msgCurrent || this.msgQueue.length === 0) return;

        this.msgCurrent = this.msgQueue.shift()!;
        if (this.msgQueue.length > 1)
            console.log("Warning message queue is ", this.msgQueue.length)
        // Build the  message string
        let msg: string;
        if (this.msgCurrent.value !== undefined) {
            msg = `${this.msgCurrent.command},comp${this.msgCurrent.id},${this.msgCurrent.value}`;
        } else {
            msg = `${this.msgCurrent.command},comp${this.msgCurrent.id}`;
        }

        this.connection.sendText(msg);

        if (!this.msgCurrent.expectResponse) {
            // Fire-and-forget command → resolve immediately
            this.msgCurrent.resolve();
            this.msgCurrent = null;
            this.processNext();
            return;
        }

        //  wait for a response command
        this.timeOut = wait(1000);
        this.timeOut.then(() => {
            if (this.msgCurrent) {
                this.msgCurrent.reject(new Error("Timeout waiting for response"));
                this.msgCurrent = null;
                this.processNext();
            }
        }).catch(err => {
            if (err !== "cancelled") {
                console.error("processNext timeOut error:", err);
            }
        });
    }
}


class Composition extends AggregateElem {
    private mPlayState = "STOP"
    private mVolume = 0;
    private mSyncSource = new TimeFlow(0, 0)
    private poller: CancelablePromise<void> | null = null;
    private mDiscarded = false;
    private statusPending = false;        // A get:status is queued or awaiting its reply
    private statusRefreshWanted = false;  // Another was asked for meanwhile
    private currentPlaybackStatus = 0;
    private currentStatus: CompositionStatus = {
    playbackStatus: 0,   // stopped
    currentTime: 0,      // in seconds
    currentFrame: 0,
    currentClip: 0,
    totalDuration: 0
    };
    private driftCount = 0; // number of consecutive messages with drift
    private readonly driftThresholdCount = 10; // number of consecutive messages with drift before resync
    private readonly driftMs = 100;           // threshold per message in ms

    constructor(
        protected readonly owner: Exaplay,
        protected readonly id: number,
        protected readonly enablePolling: boolean,
        protected readonly pollingInterval: number,
        protected readonly verboseLogging:boolean = false

    ) {
        super();
        this.poll();
    }
    @property("Play state, 'PLAY', 'STOP', 'PAUSE' ", false)
    get playState(): string { return this.mPlayState; }
    set playState(value: string) {
        if (value !== this.mPlayState) {
            if (value == "PLAY" || value == "STOP" || value == "PAUSE") {
                switch (value) {
                    case "PLAY":
                        this.owner.sendCommand("play", this.id)
                        break;
                    case "STOP":
                        this.owner.sendCommand("stop", this.id)
                        break;
                    case "PAUSE":
                        this.owner.sendCommand("pause", this.id)
                        break;
                    default:
                        console.log("Unknown playState value:", value);
                }
                this.getStatus()

            }
            this.mPlayState = value;
        }
    }


    @property("Volume ", false) @min(0) @max(1)
    get volume(): number { return this.mVolume; }
    set volume(value: number) {
        if (value !== this.mVolume) {
            this.owner.sendCommand("set:vol", this.id, false, Math.round(value * 100))
            this.mVolume = value;
        }
    }

    @property('Time Sync Source', true)
    get syncSource(): TimeFlow { return this.mSyncSource }
    set syncSource(data: TimeFlow) {
        this.mSyncSource = data;
    }

    @callable("Go to cue index 1 based. Integers e.g. 1 or 2")
    gotoCueIndex(index: number) {
        this.owner.sendCommand("set:cue", this.id, false, index)
        this.getStatus()
    }

    @callable("Go to cue time in seconds ss.mm")
    gotoCueTime(time: number) {
        this.owner.sendCommand("set:cuetime", this.id, false, time)
        this.getStatus()
    }

    /**
     * Poll the device's status with some regularity
     */
    protected poll() {
        if (this.enablePolling && !this.mDiscarded) {
            if (this.poller) this.poller.cancel();

            this.poller = wait(this.pollingInterval);
            this.poller.then(() => {
                if (this.mDiscarded) return;
                if (this.owner.connection.connected){
                    this.getStatus();
                }
                this.poll();
            }).catch(() => { /* cancelled */ });
        }
    }

    /** Stop polling for good; called when replaced by addComposition or when the driver finishes. */
    public discard() {
        this.mDiscarded = true;
        if (this.poller) {
            this.poller.cancel();
            this.poller = null;
        }
    }

 protected getStatus() {
    if (this.mDiscarded) return;
    // One status request at a time per composition. A refresh asked for meanwhile
    // (poll tick, setter) is folded into a single follow-up once the reply is in.
    if (this.statusPending) {
        this.statusRefreshWanted = true;
        return;
    }
    this.statusPending = true;
    this.owner.sendCommand("get:status", this.id, true).then(data => {
        this.statusDone();
        const strData = String(data);
        const parts = strData.split(",").map(Number);
        const status: CompositionStatus = {
            playbackStatus: parts[0] as 0 | 1 | 2,
            currentTime: parts[1],
            currentFrame: parts[2],
            currentClip: parts[3],
            totalDuration: parts[4]
        };

        const newState = this.currentPlaybackStatus !== status.playbackStatus;

        if (status.playbackStatus === 0 && newState) {
            this.syncSource = new TimeFlow(status.currentTime * 1000, 0);
            this.mPlayState = "STOP"

        } else if (status.playbackStatus === 1) {
            if (newState) {
                this.syncSource = new TimeFlow(status.currentTime * 1000, 1);
                this.mPlayState = "PLAY"
            } else {
                this.checkDrift(status);
            }

        } else if (status.playbackStatus === 2 && newState) {
            this.syncSource = new TimeFlow(status.currentTime * 1000, 0);
            this.mPlayState = "PAUSE"
        }

        if (newState) {
            this.changed("playState");

        }

        this.currentPlaybackStatus = status.playbackStatus;
        this.currentStatus = status;

    }).catch(err => {
        this.statusDone();
        if (err !== "cancelled") {
            console.error("getStatus error:", err);
        }
    });
}

    private statusDone() {
        this.statusPending = false;
        if (this.statusRefreshWanted) {
            this.statusRefreshWanted = false;
            this.getStatus();
        }
    }

    private checkDrift(status: CompositionStatus) {
        const currentMs = status.currentTime * 1000;
        const drift = Math.abs(this.syncSource.currentTime - currentMs);

        const nearBeginning = status.currentTime < this.pollingInterval / 1000;
        const looped = status.currentTime < this.currentStatus.currentTime;

        //  Case 1: restart / loop detected
        if (nearBeginning || looped) {
            this.syncSource = new TimeFlow(currentMs, 1);
            this.log(`TimeFlow reset because playback restarted: ${status.currentTime}s`);
            this.driftCount = 0;
            return;
        }

        //  Case 2: drift so large we consider it a jump
        const jumpThresholdMs = this.driftMs * 5; // configurable multiplier
        if (drift > jumpThresholdMs) {
            this.syncSource = new TimeFlow(currentMs, 1);
            this.log(`TimeFlow jump detected, reset immediately: drift=${drift}ms`);
            this.driftCount = 0;
            return;
        }

        //  Case 3: normal drift handling
        if (drift > this.driftMs) {
            this.driftCount++;
            if (this.driftCount >= this.driftThresholdCount) {
                this.syncSource = new TimeFlow(currentMs, 1);
                this.log(
                    `TimeFlow drift corrected after ${this.driftCount} consecutive messages: ${drift}ms`
                );
                this.driftCount = 0;
            }
        } else {
            this.driftCount = 0;
        }
    }
    private log(...args: any[]) {
    if (this.verboseLogging) {
        console.log(...args);
    }
}

}

interface Request {
    command: string;
    id: number;
    value?: number;
    resolve: (value?: string | void) => void;
    reject: (reason?: any) => void;
    expectResponse: boolean;
}


interface CompositionStatus {
    playbackStatus: 0 | 1 | 2;
    currentTime: number;
    currentFrame: number;
    currentClip: number;
    totalDuration: number;
}
