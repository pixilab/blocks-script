/*
 * Created 2018 by Mike Fahl.
 */

import {Script, ScriptEnv} from "system_lib/Script";
import {callable, max, min, parameter, property} from "system_lib/Metadata";

export class ClassyScript extends Script {
	private mConnected = false;
	private mDynPropValue = false;
	private mLevel = 0;

	public constructor(env : ScriptEnv) {
		super(env);
		console.log("ClassyScript instantiated");
		this.mConnected = false;

		/*	Example of how to add a property programmatically. Useful for
			properties that may not be known until runtime.
		 */
		this.property<boolean>("dynProp1", {type: Boolean}, (sv) => {
			if (sv !== undefined) {
				if (this.mDynPropValue !== sv) {
					this.mDynPropValue = sv;
					console.log("dynProp1", sv);
				}
			}
			return this.mDynPropValue;
		});
	}

	/**
	 * A fake "connected" property, just logging the connection state.
	 */
	@property("Useful textual description")
	public set connected(online: boolean) {
		this.mConnected = online;
		console.info("Connection state", online, this.internalFunction(40, 2));
		wait(2000).then(()=> {
			this.mConnected = false;
			console.log("Connected OFF after delay");
			/*	Notify others if state change internally. This is NOT required
				when changed through the setter, as using the setter automatically
				notifies others of changes. But in some cases, it may be desirable
				to maintain and update state *without* going through the setter,
				and then you can use the explicit method.
			 */
			this.changed('connected');
		});
	}
	public get connected(): boolean {
		return this.mConnected;
	}

	/**
	 * A fake "level" property you can assign to a slider or similar.
	 */
	@property("A numeric value")
	@min(0) @max(25)
	set level(value: number) {
		this.mLevel = value;
		console.info("Property level changed to", value);
	}
	get level(): number {
		return this.mLevel;
	}


	@callable("Something to help the user")
	public doSomething(
		@parameter("Textual description shown in UI") aString: string,
		aNumber: number,
		aBoolean: boolean
	): string {
		const result = aString +' '+ aNumber +' '+ aBoolean;
		console.info("doSomething", result);
		return result;
	}

	private internalFunction(a: number, b: number): number {
		return a+b;
	}

}
