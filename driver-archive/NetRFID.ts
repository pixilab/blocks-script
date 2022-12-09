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
		socket.subscribe('textReceived', (sender, message) => {
			let scanned = message.text;
			// Scanner sends "v1.0" when connects, which then becomes part of 1st message - strip off
			if (scanned.indexOf('v') === 0)
				scanned = scanned.substring(4);
			// Scanner wraps code inside STX ETX characters. Remove those, leaving only the string there
			this.scanned = NetRFID.removeControls(scanned);
		});
	}

	static removeControls(scanned: string) {
		let result = '';
		const len = scanned.length;
		for (let ix = 0; ix < len; ++ix) {
			if (scanned.charCodeAt(ix) > 0x20)
				result += scanned.charAt(ix);
			// else skip non-printable characters
		}
		return result;
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
		this.mResetValuePromise = wait(500);
		this.mResetValuePromise.then(() => this.scanned = "");
	}

	private stopResetTimer(): void {
		if (this.mResetValuePromise) {
			this.mResetValuePromise.cancel();
			this.mResetValuePromise = undefined;
		}
	}
}
