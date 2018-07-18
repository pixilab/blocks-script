import { NetworkTCP } from "system/Network";
import { Driver } from "system_lib/Driver";
import { driver, property } from "system_lib/Metadata";

/**
 * A very basic NetRFID driver for receiving scanned values.
 *
 * https://www.emartee.com/product/42282/Network%20RFID%20Reader%20V2,%2013.56Mhz%20IC%20Card
 */
@driver('NetworkTCP', { port: 50000 })
export class NetRFID extends Driver<NetworkTCP> {

	private mScanned: string;
	private mResetValuePromise: CancelablePromise<void>;

	public constructor(private socket: NetworkTCP) {
		super(socket);
		socket.autoConnect();
		socket.subscribe('textReceived', (sender, message) =>
			this.scanned = message.text
		);
	}

	@property("Last scanned value, or empty string", true)
	public set scanned(value: string) {
		this.mScanned = value;
		if (value)
			this.startResetTimeout();
	}
	public get scanned(): string {
		return this.mScanned;
	}

	/**
	 * Clear last scanned value after 1 second to allow same
	 * card to be scanned again.
	 */
	private startResetTimeout(): void {
		this.stopResetTimer();
		this.mResetValuePromise = wait(1000);
		this.mResetValuePromise.then(() => this.scanned = "");
	}

	private stopResetTimer(): void {
		if (this.mResetValuePromise) {
			this.mResetValuePromise.cancel();
			this.mResetValuePromise = undefined;
		}
	}
}
