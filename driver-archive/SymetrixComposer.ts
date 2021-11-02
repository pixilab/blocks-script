import { NetworkTCP } from "system/Network";
import { Driver } from "system_lib/Driver";
import { driver } from "system_lib/Metadata";

/**
 * A driver for controlling Symetrix Composer Controllers 101-110.
 *
 * The driver is set to be able to adjust the levels of controllers in the range of
 * [kControllerLow..kControllerHigh]. Change these readonly properties to match your
 * needs.
 *
 * When connected to the device, we are sending a request to it for getting
 * the initial values of the controllers. After three seconds we set the initial
 * values for the controllers that has not yet received their initial state to zero.
 *
 * IMPORTANT NOTICE ABOUT PUSH:
 * To get the initial values of the controllers, "Global Push" needs to be enabled.
 * Push must also be enabled individually for each controller you'd like
 * to manage through Blocks, this is enabled through the Composer software.
 */
@driver('NetworkTCP', { port: 48631 })
export class SymetrixComposer extends Driver<NetworkTCP> {

	private readonly kValueParseReg = /#(\d+)=(\d+)/;
	private readonly kControllerLow = 101;
	private readonly kControllerHigh = 110;

	private mControllerPushTimeout: Promise<void>;
	/**
	 * Contains information of every configured controller, such as current value etc.
	 */
	private mSettings: Dictionary<ControllerSettings> = {};

	public constructor(private socket: NetworkTCP) {
		super(socket);

		this.setup();

		socket.subscribe('connect', this.onConnectChange.bind(this));
		socket.subscribe('textReceived', this.onTextReceived.bind(this));
		socket.autoConnect();

		// console.log('SymetrixComposer ready.');
	}

	/**
	 * Setup the controller settings and blocks properties for them.
	 */
	private setup() {
		for (let i = this.kControllerLow; i <= this.kControllerHigh; i++) {
			let key = i.toString();
			let getterSetter = (val: number): number => {
				const settings = this.mSettings[key];
				if (val !== undefined) {
					if (settings.current === undefined && !settings.forceUpdate) {
						/**
						 * If the settings has not yet been applied from the device,
						 * store the wanted value here in the meantime to set it later
						 * if it differs from what we get from the driver.
						 */
						settings.wanted = val;
					} else if (settings.current !== val) {
						/**
						 * If we have a current value (the settings has been applied from
						 * the device), and the current value differs from what I got,
						 * update the device controller to this value.
						 */
						settings.current = val;
						settings.wanted = undefined;
						settings.forceUpdate = false;
						this.tell(`CSQ ${ key } ${ settings.current }`);
					}
				}
				return settings.current ? settings.current : (settings.wanted ? settings.wanted : 0);
			};

			this.mSettings[key] = {
				wanted: undefined,
				current: undefined,
				forceUpdate: false,
				setGet: getterSetter
			};

			this.property<number>(this.getPropNameForKey(key), { type: Number }, getterSetter);
		}
	}

	/**
	 * Listen for connect/disconnect.
	 */
	private onConnectChange(
		sender: NetworkTCP,
		message: { type: 'Connection' | 'ConnectionFailed' }
	): void {
		if (message.type === 'Connection') {
			if (sender.connected)
				this.onConnect();
			else
				this.onDisconnect();
		}
	}

	/**
	 * Ask the device for it's current controller settings.
	 */
	private onConnect(): void {
		this.mControllerPushTimeout = wait(35000);
		this.mControllerPushTimeout.then(this.onControllerPushTimeout.bind(this));
		this.tell('PUR 101 110');
	}

	/**
	 * Store the current values as wanted values so they get
	 * updated on next connect.
	 */
	private onDisconnect(): void {
		for (let key of Object.keys(this.mSettings)) {
			const settings = this.mSettings[key];
			if (settings.current !== undefined) {
				settings.wanted = settings.current;
				settings.current = undefined;
			}
		}
	}

	/**
	 * Parse the current value for a controller on the device.
	 *
	 * If blocks has tried to set the value before, it is stored in
	 * the wanted property of the settings, apply it instead of
	 * the current value for the controller.
	 *
	 * If we don't have a change queued, save the current value for the
	 * controller in its settings and notify.
	 */
	private onTextReceived(
		sender: NetworkTCP,
		message: { text: string }
	): void {
		let matches = this.kValueParseReg.exec(message.text);
		if (matches !== null && matches.length === 3) {
			let controllerNum = parseInt(matches[1], 10);
			let controllerValue = parseInt(matches[2], 10);
			let settings = this.mSettings[controllerNum.toString()];
			if (settings) {
				if (settings.wanted !== undefined) {
					settings.forceUpdate = true;
					settings.setGet(settings.wanted);
					settings.wanted = undefined;
				} else if (settings.current !== controllerValue) {
					settings.current = controllerValue;
					this.changed(this.getPropNameForKey(controllerNum.toString()));
				}
			}
		}
	}

	/**
	 * Three seconds has passed from when we asked for the initial value for the
	 * controllers from the device. For the controllers that has not yet gotten
	 * the initial value from the device, set their current value to 0 and treat
	 * them as output only. Otherwise, ignore and continue with business as usual.
	 */
	private onControllerPushTimeout(): void {
		for (let i = this.kControllerLow; i <= this.kControllerHigh; i++) {
			let key = i.toString();
			const settings = this.mSettings[key];
			if (settings.current === undefined) {
				if (settings.wanted !== undefined) {
					settings.forceUpdate = true;
					settings.setGet(settings.wanted);
					settings.wanted = undefined;
				} else {
					settings.forceUpdate = true;
				}
			}
		}
	}

	private tell(data: string) {
		this.socket.sendText(data);
	}

	private getPropNameForKey(key: string): string {
		return `Controller ${ key }`;
	}
}

interface ControllerSettings {
	wanted: number;
	current: number;
	forceUpdate: boolean;
	setGet: (val: number) => number;
}

interface Dictionary<TElem> {
	[id: string]: TElem;
}
