/**
 * Visual Production CueCore and QuadCore lighting controllers.
 * By Sheikh Amir & Greg Brown, PULSE MIDDLE EAST, www.pulse-me.com
 *
 * The driver works by sending and receiving lighting playback commands/messages.
 * Unfortunately the devices have no commands for getting initial status at this time.
 *
 * We can now adjust the number of playbacks.
 * The driver works with the new CueCore 3.
 *
 * See also the CueCore2PIXI driver, providing individual cue list management
 * for lighting control playback.
 */

import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import * as Meta from "system_lib/Metadata";

// noinspection JSMethodCanBeStatic
@Meta.driver("NetworkTCP", { port: 7000 })
export class VPCueCore extends Driver<NetworkTCP> {

    private mConnected = false; // Connected to device
    private readonly prefix = 'core-'; // Prefix for QuadCore PBs
    private responseParseRegex = /(.*)=([+-]?(\d*[.])?\d+)/i;
    private keyToNameParseRegex = /(\w*-?)pb-(\d+)-([a-z]+)/i;
    private numPlaybacks = 16; // Adjust number of playbacks
    private minIntensity = 0.00; // Min value for intensity
    private maxIntensity = 1.00; // Max value for intensity
    private minRate = 0.00; // Min value for rate
    private maxRate = 1.00; // Max value for rate
    private jumpSources = 32;

    /**
     * Contains information of every configured controller, such as current value etc.
     */
    private mSettings: Dictionary<ControllerSettings> = {};

    /**
     * Create me, attached to the network socket I communicate through. When using a
     * driver, the driver replaces the built-in functionality of the network socket
     * with the properties and callable functions exposed.
     */
    public constructor(private socket: NetworkTCP) {
        super(socket);

        this.setup();

        socket.subscribe("connect", (sender, message) => {
            // console.info("connect msg", message.type);
            this.connectStateChanged();
        });
        socket.subscribe("bytesReceived", (sender, msg) =>
            this.bytesReceived(msg.rawData)
        );
        socket.autoConnect(true); // Use automatic connection mechanism
        this.mConnected = socket.connected;
    }

    private pad(num: number, size: number) {
        let n = num.toString();
        while (n.length < size) n = "0" + n;
        return n
    }

    /**
     * Setup the controller settings and blocks properties for them.
     */
    private setup() {
        // Loop for intensity
        for (let i=0; i < this.numPlaybacks; i++) {
            let key = `${this.prefix}pb-${i + 1}-intensity`;
            // Set the getter and setter
            this.set(key, this.minIntensity, this.maxIntensity);
        }
        // Loop for rate
        for (let i=0; i < this.numPlaybacks; i++) {
            let key = `${this.prefix}pb-${i + 1}-rate`;
            // Set the getter and setter
            this.set(key, this.minRate, this.maxRate);
        }
        // Loop for jump-source
        for (let i=0; i < this.numPlaybacks; i++) {
            let key = `${this.prefix}pb-${i + 1}-jump`;
            // Set the getter and setter
            this.set(key, 1, this.jumpSources);
        }
    }

    private set(key: string, min: number, max: number) {
        let getterSetter = (val: number): number => {
            const settings = this.mSettings[key];
            if (val !== undefined) {
                let setValue = key.match(/jump/i) ? val : Number(val).toFixed(2);
                if (settings.current === undefined && !settings.forceUpdate) {
                    /**
                     * If the settings has not yet been applied from the device,
                     * store the wanted value here in the meantime to set it later
                     * if it differs from what we get from the driver.
                     */
                    settings.wanted = setValue;
                }
                if (settings.current !== setValue) {
                    /**
                     * If we have a current value (the settings has been applied from
                     * the device), and the current value differs from what I got,
                     * update the device controller to this value.
                     */
                    settings.current = setValue;
                    settings.wanted = undefined;
                    settings.forceUpdate = false;

                    /**
                     * Let's process different types of commands.
                     * Some modules do not have a channel.
                     * */
                    let command = `${key}=${setValue}`
                    this.tell(command)
                }
            }
            return settings.current ? Number(settings.current) : (settings.wanted ? Number(settings.wanted) : 0);
        };

        this.mSettings[key] = {
            wanted: undefined,
            current: undefined,
            forceUpdate: false,
            setGet: getterSetter
        };

        let options = {
            type: Number,
            min: min,
            max: max,
            description: this.getPropNameForKey(key)
        }

        this.property<number>(this.getPropNameForKey(key), options, getterSetter);
    }

    @Meta.property("Connected", true)
    public set connected(online: boolean) {
        this.mConnected = online;
    }
    public get connected(): boolean {
        return this.mConnected;
    }

    /**
     * Connection state changed.
     */
    private connectStateChanged() {
        // console.info("connectStateChanged", this.socket.connected);
        this.connected = this.socket.connected; // Propagate state to clients
    }

    /**
     * Got the data from device
     */
    private bytesReceived(rawData: any) {
        let text = this.toString(rawData); // Example: core-pb-1-intensity=0
        // A regex for parsing replies from the device
        let matches = this.responseParseRegex.exec(text);
        if (matches !== null && matches.length >= 3) {
            let key = matches[1]; // This is the key that we defined for subscription
            let value = Number(matches[2]); // This is the value for the item
            let settings = this.mSettings[key];
            if (settings) {
                if (settings.wanted !== undefined) {
                    settings.forceUpdate = true;
                    settings.setGet( Number(settings.wanted) );
                    settings.wanted = undefined;
                } else if (settings.current !== value) {
                    settings.current = value;
                    this.changed(this.getPropNameForKey(key));
                }
            }
        }
    }


    @Meta.callable("Send a command to the device")
    public sendText(
        @Meta.parameter("Command") command: string
    ) {
        this.tell(command);
    }

    private getPropNameForKey(key: string): string {
        let matches = this.keyToNameParseRegex.exec(key);
        return `Playback ${this.pad( Number(matches[2]), 2)} ${this.capitalize(matches[3])}`; // Example: PB 01 Intensity
    }

    private tell(data: string) {
        this.socket.sendText(data);
    }

    // Decode bytes to string
    toString(bytes: number[]): string {
        let result = '';
        for (let i = 0; i < bytes.length; ++i) {
            const byte = bytes[i];
            const text = byte.toString(16);
            result += (byte < 16 ? '%0' : '%') + text;
        }
        return decodeURIComponent(result);
    }

    private capitalize(word: string): string {
        if (word.length === 0) {
            return word; // Return an empty string if the input is empty
        }

        const firstLetterCode = word.charCodeAt(0);

        if (firstLetterCode >= 97 && firstLetterCode <= 122) {
            // ASCII code range for lowercase letters
            return String.fromCharCode(firstLetterCode - 32) + word.slice(1);
        }

        return word; // Return unchanged if the first letter is not a lowercase letter
    }
}

interface ControllerSettings {
    wanted: number | string;
    current: number | string;
    forceUpdate: boolean;
    setGet: (val: number) => number;
}

// A simple typed dictionary type, using a string as key
interface Dictionary<V> {
    [id: string]: V;
}
