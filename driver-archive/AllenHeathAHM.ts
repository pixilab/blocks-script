import { NetworkTCP } from "../system/Network";
import { Driver } from "../system_lib/Driver";
import { driver, property } from "../system_lib/Metadata";

/**
 * Basic driver for Allen & Heath AHM64
 * Supplies a property for recalling presets, with feedback
 *
 * @author Johnny Karhinen <johnny@levandeteknik.se>
 */


@driver('NetworkTCP', { port: 51325 })
export class AllenHeathAHM extends Driver<NetworkTCP> {
    private isConnected:boolean = false
    private activePreset:number
    private receiveBuffer:number[] = []

    public constructor(private socket: NetworkTCP) {
		super(socket);
		socket.autoConnect(true);

        socket.subscribe('bytesReceived', (sender, message) => this.onBytesReceived(message.rawData))
        socket.subscribe('connect', (sender, message) => this.connected = socket.connected)
	}


    @property("Preset number to recall")
    set preset(presetNumber:number) {
        this.sendRecallPreset(presetNumber)
        // this.activePreset = presetNumber // Uncomment this if the device does not respond on preset change
    }
    get preset(): number {
        return this.activePreset
    }


    @property("Successfully connected to device", true)
    get connected():boolean {
        return this.isConnected
    }
    set connected(isConnected:boolean) {
        this.isConnected = isConnected
    }


    /**
     * Callback function for received bytes on the TCP socket. Parses responses and reacts to them.
     *
     * @param bytes Received bytes
     */
     private onBytesReceived(bytes:number[]) {
        this.receiveBuffer = this.receiveBuffer.concat(bytes)

        while(this.receiveBuffer.length > 4) { // Don't bother if we don't have a complete command in the buffer
            let presetRecallResponse = this.parsePresetRecallResponse(this.receiveBuffer)

            if(presetRecallResponse !== undefined) {
                this.activePreset = presetRecallResponse
                this.changed('preset')
                this.receiveBuffer = this.receiveBuffer.slice(5)
            }

            this.receiveBuffer.shift()
        }
    }


    /**
     * Send MIDI command over TCP socket to recall a preset
     *
     * @param presetNumber Preset number to recall
     * @returns Promise
     */
    private sendRecallPreset(presetNumber:number):Promise<any> {
        let {bank, preset} = this.toBankAndPreset(presetNumber)
        return this.socket.sendBytes([0xB0, 0x00, bank, 0xC0, preset])
    }


    /**
     * Parses the supplied byte array for a preset recall response
     *
     * @param bytes Byte (number) array that may begin with a preset recall response
     * @returns Parsed preset number, or undefined if response not found at array beginning
     */
    private parsePresetRecallResponse(bytes:number[]):number {
        if(
            bytes[0] == 0xB0 && // Select Bank
            bytes[1] == 0x00 &&
            bytes[3] == 0xC0    // Program Change
        ) return this.toPresetNumber(bytes[2], bytes[4])

        return undefined
    }


    /**
     * Converts preset number into bank and preset index
     *
     * @param presetNumber 1-based number of preset
     * @returns 0-based indexes of bank and preset
     */
    private toBankAndPreset(presetNumber:number):{bank:number, preset:number} {
        const presetIndex = presetNumber - 1
        const bank = Math.floor(presetIndex / 128)
        const preset = presetIndex % 128

        return {bank, preset}
    }


    /**
     * Converts bank and preset index to preset number
     *
     * @param bank 0-based bank index
     * @param preset 0-based preset index
     * @returns 1-based preset number
     */
    private toPresetNumber(bank:number, preset:number):number {
        const presetIndex = bank * 128 + preset
        return presetIndex + 1
    }
}
