/**
 * @module
 * @file Basic driver for controlling a Yamaha sound desk (QL1) faders with feedback.
 * @license BSD-2-Clause
 * @copyright (C) 2021 Jonathan Olsson, Adapt AB. All rights reserved.
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 *   1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 *   2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import {NetworkTCP} from "system/Network";
import {Driver} from "system_lib/Driver";
import {callable, driver, max, min, parameter, property} from "system_lib/Metadata";
import {AggregateElem, IndexedProperty} from "system_lib/ScriptBase";

/* RegExp for matching external status updates§
*/
const notifyPattern: RegExp = /^(NOTIFY|OK) (get|set|sscurrent_ex) (\S*) (\d\d?)(?: 0 |)(?:"([^"]*)|(\S*))/;

@driver('NetworkTCP', {port: 49280})
export class YamahaQL1 extends Driver<NetworkTCP> {
	private keepAliver: KeepAliver;

	private mNumFaders: number = 32; // How many faders to publish in GUI
	private mScene: number;
	public readonly fader: IndexedProperty<Fader>;
	public readonly master: IndexedProperty<Fader>;

	public constructor(public socket: NetworkTCP) {
		super(socket);

		this.master = this.indexedProperty("master", Fader);
		this.fader = this.indexedProperty("fader", Fader);

		// ST L (Main steroe och L fader)
		this.master.push(new Fader(this, 0, 'MIXER:Current/St'));
		// ST R (Main steroe och R fader)
		this.master.push(new Fader(this, 1, 'MIXER:Current/St'));

		// Add all normal channels
		for (let i = 0; i < this.mNumFaders; ++i)
			this.fader.push(new Fader(this, i, 'MIXER:Current/InCh'));

		if (socket.enabled) {
			socket.autoConnect();
			this.keepAliver = new KeepAliver(this);

			// Stop any cyclic activity if socket discarded (e.g., driver disabled)
			socket.subscribe('finish', () => this.keepAliver.discard());

			// Subscribe to data received from device
			socket.subscribe('textReceived', (sender, message) => this.gotData(message.text));

			// Listen for connection state change
			socket.subscribe('connect', (sender, message) => {
				if (message.type === 'Connection') {
					if (this.socket.connected) {
						// Get current status for everything we're interested in
						this.pollEverything();
					} else
						console.warn("Connection dropped unexpectedly");
				} else
					console.error(message.type);
			});
		} // Else socket is disabled - do nothing further (can't send any data anyway)
	}

	/** Data received from console.
	 */
	private gotData(data: string) {
		const result = data.match(notifyPattern);
		if (result && result.length > 4 && !(result[1] == 'OK' && result[2] == 'set')) // Ignore ack from our own commands
		{
			/*	result[0] == Whole string
				result[1] == OK|NOTIFY
				result[2] == get|set|sscurrent_ex
				result[3] == Command path
				result[4] == channel och scene
				result[5] == name if any
				result[6] == fader value
			*/
			if (result[3] == 'MIXER:Current/InCh/Fader/Level') {
				this.fader[Number(result[4])].mLevel = Number(result[6]) * 0.01;
				this.fader[Number(result[4])].changed('level');
			} else if (result[3] == 'MIXER:Current/InCh/Fader/On') {
				this.fader[Number(result[4])].mOn = !!Number(result[6]);
				this.fader[Number(result[4])].changed('on');
			} else if (result[3] == 'MIXER:Current/InCh/Label/Name') {
				this.fader[Number(result[4])].mLabel = result[5];
				this.fader[Number(result[4])].changed('label');
			} else if (result[3] == 'MIXER:Current/St/Fader/Level') {
				this.master[Number(result[4])].mLevel = Number(result[6]) * 0.01;
				this.master[Number(result[4])].changed('level');
			} else if (result[3] == 'MIXER:Current/St/Fader/On') {
				this.master[Number(result[4])].mOn = !!Number(result[6]);
				this.master[Number(result[4])].changed('on');
			} else if (result[3] == 'MIXER:Current/St/Label/Name') {
				this.master[Number(result[4])].mLabel = result[5];
				this.master[Number(result[4])].changed('label');
			} else if (result[3] == 'NOTIFY sscurrent_ex MIXER:Lib/Scene') {
				// Scene changed
				this.mScene = Number(result[4]);
				this.changed('current_scene');
			}
		}
	}

	/**	Allow raw command string as well, for "no driver" backward compatibility.
	 */
	@callable("Send a command")
	public sendText(
		@parameter("Command to send") cmd: string,
	) {
		this.socket.sendText(cmd);
		//console.log("Send text: "+cmd)
	}

	@property("Current scene number")
	@min(0) @max(300)
	public set current_scene(val: number) {
		this.mScene = val;
		this.sendText("ssrecall_ex MIXER:Lib/Scene " + val);
	}
	public get current_scene(): number {
		return this.mScene;
	}

	private pollEverything() {
		// console.log('Polling for current status');
		this.sendText('sscurrent_ex MIXER:Lib/Scene');
		this.sendText('get MIXER:Current/St/Fader/Level 0 0');
		this.sendText('get MIXER:Current/St/Fader/On 0 0');
		this.sendText('get MIXER:Current/St/Label/Name 0 0');

		for (let i = 0; i < this.mNumFaders; ++i) {
			this.sendText('get MIXER:Current/InCh/Fader/Level ' + i + ' 0');
			this.sendText('get MIXER:Current/InCh/Fader/On ' + i + ' 0');
			this.sendText('get MIXER:Current/InCh/Label/Name ' + i + ' 0');
		}
	}
}

class KeepAliver {
	private pending: CancelablePromise<any>;

	constructor(private YamahaQL1: YamahaQL1) {
		this.saySomethingInAWhile();
	}

	/**
	 * Discard me, stopping my regular saySomethingInAWhile calls
	 */
	discard() {
		if (this.pending) {
			this.pending.cancel();
			this.pending = undefined;
		}
	}

	/** Send some data once in a while to keep connection open.
	 */
	private saySomethingInAWhile() {
		this.pending = wait(20000);
		this.pending.then(() => {
			this.sayNow();
			this.saySomethingInAWhile();	// Ad infinitum
		});
	}

	private sayNow() {
		const sock = this.YamahaQL1.socket;
		if (sock.connected)
			sock.sendText("devinfo devicename");	// Some harmless command
	}
}

class Fader extends AggregateElem {
	private mId: number;

	mLabel: string = '';
	mLevel: number = 0;
	mOn: boolean = false;

	constructor(
		private owner: YamahaQL1,
		id: number,
		private mCommandPath: string
	) {
		super();
		this.mId = id;
	}

	@property("Label")
	get label(): string {
		return this.mLabel;
	}

	set label(value: string) {
		if (value !== undefined) {
			this.owner.sendText('set ' + this.mCommandPath + '/Label/Name ' + this.mId + ' 0 "' + value + '"');
			this.mLabel = value;
		}
	}

	@property("Fader level in dB")
	@min(-327.68) @max(10)
	get level(): number {
		return this.mLevel;
	}

	set level(value: number) {
		if (value <= -60) value = -327.68;
		this.owner.sendText('set ' + this.mCommandPath + '/Fader/Level ' + this.mId + ' 0 ' + Math.round(value * 100));
		this.mLevel = value;
	}

	@property("On")
	get on(): boolean {
		return this.mOn;
	}

	set on(value: boolean) {
		if (value !== undefined) {
			this.owner.sendText('set ' + this.mCommandPath + '/Fader/On ' + this.mId + ' 0 ' + (value ? 1 : 0));
			this.mOn = value;
		}
	}
}
