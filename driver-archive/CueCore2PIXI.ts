/*
    Driver for Visual Productions CueCore2, capable of controlling the playbacks. The driver
    exposes playback 1-6 in a named aggregate element.

    Copyright (c) 2023 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
    melvinm1 2023-08-04
*/

import { NetworkUDP } from "../system/Network";
import { Driver } from "../system_lib/Driver";
import { driver, max, min, property } from "../system_lib/Metadata";
import { AggregateElem, Dictionary } from "../system_lib/ScriptBase";

class Playback extends AggregateElem {
    private _active: boolean = false;
    private _cue: number = 1;
    private _intensity: number = 1;
    private _rate: number = 0;

    constructor(private index: number, private owner: CueCore2PIXI) {
        super();
    }

    @property("True to start playback, false to stop playback.")
    get active() {
        return this._active;
    }

    set active(newValue: boolean) {
        this._active = newValue;
        
        if (!this.owner.feedback) {
            if (newValue) {
                // Start playback
                this.sendCommand("jump", this._cue);
            }
            else {
                // Stop playback
                this.sendCommand("release");
            }
        }
    }

    @property("Playback cue")
    get cue() {
        return this._cue;
    }

    set cue(newValue: number) {
        this._cue = newValue;
        
        if (!this.owner.feedback && this._active) {
            this.sendCommand("jump", newValue);
        }
    }

    @property("Playback intensity")
    @min(0)
    @max(1)
    get intensity() {
        return this._intensity; 
    }

    set intensity(newValue: number) {
        this._intensity = newValue;

        if (!this.owner.feedback) {
            this.sendCommand("intensity", newValue);
        }
    }

    @property("Playback rate")
    @min(-1)
    @max(1)
    get rate() {
        return this._rate;
    }

    set rate(newValue: number) {
        this._rate = newValue;

        if (!this.owner.feedback) {
            this.sendCommand("rate", newValue);
        }
    }

    private sendCommand(command: string, value?: string | number) {
        let toSend = "core-pb-" + this.index + "-" + command;

        if (value !== undefined) {
            toSend += "=" + value;
        }
        this.owner.connection.sendText(toSend);
    }
}

@driver("NetworkUDP", { port: 7000, rcvPort: 7001 })
export class CueCore2PIXI extends Driver<NetworkUDP> {
    private static readonly POLL_RATE = 5000; // ms

    // If true, do not send new property value to device.
    public feedback: boolean = false;

    // Keyed by "playback" + i (1 <= i <= 6).
    private playbacks: Dictionary<Playback>;

    // Keyed by command, e.g. "core-pb-2-fade". The "cmdHandler" function
    // should use the string value to update the corresponding property.
    private cmdHandlers: Dictionary<(strValue: string) => void> = {};

    private lastReceived: number; // Date.now() when last message was received
    private _connected: boolean = false;
    private _intensity: number = 1;
    private _rate: number = 0;
    private _fade: number = 0;

    constructor(public connection: NetworkUDP) {
        super(connection);
        this.playbacks = this.namedAggregateProperty("playbacks", Playback);
        this.init();
    }

    @property()
    get connected() {
        return this._connected;
    }

    @property("Master intensity")
    @min(0)
    @max(1)
    get intensity() {
        return this._intensity;
    }

    set intensity(newValue: number) {
        this._intensity = newValue;

        if (!this.feedback) {
            this.connection.sendText("core-pb-intensity=" + newValue);
        }
    }

    @property("Master rate")
    @min(-1)
    @max(1)
    get rate() {
        return this._rate;
    }

    set rate(newValue: number) {
        this._rate = newValue;

        if (!this.feedback) {
            this.connection.sendText("core-pb-rate=" + newValue);
        }
    }

    @property("Master fade time (seconds)")
    @min(0)
    get fade() {
        return this._fade;
    }
    
    set fade(newValue: number) {
        this._fade = newValue;

        if (!this.feedback) {
            this.connection.sendText("core-pb-fade=" + newValue);
        }
    }

    private init() {
        for (let i = 1; i < 7; ++i) { // Create playbacks 1-6
            let playback = new Playback(i, this);
            
            this.playbacks["playback" + i] = playback;
            this.cmdHandlers["core-pb-" + i + "-intensity"] = 
                (strValue: string) => {
                    playback.intensity = parseFloat(strValue);
                };
            this.cmdHandlers["core-pb-" + i + "-rate"] =
                (strValue: string) => {
                    playback.rate = parseFloat(strValue);
                };
            this.cmdHandlers["core-pb-" + i + "-cue"] = 
                (strValue: string) => {
                    playback.cue = parseInt(strValue);
                };
            this.cmdHandlers["core-pb-" + i + "-active"] = 
                (strValue: string) => {
                    playback.active = strValue === "On";
                };
        }
        this.cmdHandlers["core-pb-intensity"] = (strValue: string) => {
            this.intensity = parseFloat(strValue);
        };
        this.cmdHandlers["core-pb-rate"] = (strValue: string) => {
            this.rate = parseFloat(strValue);
        };
        this.cmdHandlers["core-pb-fade"] = (strValue: string) => {
            this.fade = parseInt(strValue);
        };

        this.connection.subscribe("textReceived", (emitter, message) => {
            if (!this._connected) { // Just got connected
                this._connected = true;
                this.changed("connected");
                this.sendState();
            }
            this.lastReceived = Date.now();
            this.handleMessage(message.text);
        });
        this.pollForever();
    }

    /**
     * Handles a received text message.
     */
    private handleMessage(message: string): void {
        let [cmd, value] = message.split("=");
        
        if (cmd in this.cmdHandlers) {
            this.feedback = true;
            try {
                this.cmdHandlers[cmd](value);
            }
            finally { // In case something bad happens
                this.feedback = false;
            }
        }
    }

    /**
     * Sends the current state to the device. Called when (re)connected to the 
     * device.
     */
    private sendState(): void {
        for (const key in this.playbacks) {
            let playback = this.playbacks[key];

            // This will call the setters, which will send the state to the
            // device
            playback.rate = playback.rate;
            playback.intensity = playback.intensity;
            playback.cue = playback.cue;
            playback.active = playback.active;
        }
        this.intensity = this._intensity;
        this.rate = this._rate;
        this.fade = this._fade;
    }

    /**
     * Sends a "core-hello" message approximately every POLL_RATE milliseconds. 
     * If no response is received after POLL_RATE milliseconds, the connection
     * property is set to false.
     */
    private pollForever(): void {
        let prevReceived = this.lastReceived;
        
        wait(10).then(() => {
            // The device should respond with the same "core-hello" message
            this.connection.sendText("core-hello");
            wait(CueCore2PIXI.POLL_RATE).then(() => {
                if (this._connected && this.lastReceived === prevReceived) {
                    this._connected = false;
                    this.changed("connected");
                }
                this.pollForever();
            });
        });
    }
}
