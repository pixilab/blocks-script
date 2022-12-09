/*
 * Very basic driver for GrandMA
 *
 * Created 2020 by Samuel Walz
 * Version 0.1
 * - automatic login on connect
 * - start macros
 */

import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {driver, max, min, property, callable, parameter} from "system_lib/Metadata";

@driver('NetworkTCP', { port: 30000 })
export class GrandMA extends Driver<NetworkTCP> {

	private username : string = 'blocks';
	private password : string = '';

	public constructor(private socket: NetworkTCP) {
		super(socket);
		socket.subscribe('connect', (sender, message)=> {
			if (message.type === 'Connection')
				this.justConnected();
		});
		socket.subscribe('textReceived', (sender, msg)=>
			this.textReceived(msg.text)
		);
		socket.subscribe('finish', (sender)=>
			this.discard()
		);
		socket.autoConnect();
	}

	/**
	 * Allow clients to check for my type, just as in some system object classes
	 */
	isOfTypeName(typeName: string) {
		return typeName === "GrandMA" ? this : null;
	}

	private justConnected (): void {
		console.log('just connected');
		this.cmdLogin(this.username, this.password);
	}

	private textReceived(message : string) {
		// console.log('reply: "' + message + '"');
	}

	private cmdLogin (user: string, pw: string) {
		this.socket.sendText('Login "' + user + '" "' + pw + '"');
	}

	@callable('(Go Macro <id>)')
	public startMacro(
		@parameter('ID of macro to start') macroID : number
	) {
		this.socket.sendText('Go Macro ' + macroID)
	}

	private discard () {

	}

}
