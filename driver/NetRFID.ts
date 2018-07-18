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

	private mScannedValue: string;
	private mResetValuePromise: CancelablePromise<void>;

	public constructor(private socket: NetworkTCP) {
		super(socket);
		socket.autoConnect();
		socket.subscribe('textReceived', this.gotText.bind(this));
	}

	private gotText(sender: NetworkTCP, message: { text: any }): void {
		this.scannedValue = message.text;
	}

	private startResetTimeout(): void {
		this.stopResetTimer();
		this.mResetValuePromise = wait(1000);
		this.mResetValuePromise.then(this.clearScannedValue.bind(this));
	}

	private stopResetTimer(): void {
		if (this.mResetValuePromise) {
			this.mResetValuePromise.cancel();
			this.mResetValuePromise = undefined;
		}
	}

	private clearScannedValue(): void {
		this.scannedValue = "";
	}

	@property("The scanned value")
	public set scannedValue(value: string) {
		this.mScannedValue = value;
		if (value)
			this.startResetTimeout();
	}
	public get scannedValue(): string {
		return this.mScannedValue;
	}
}
