/*	Check connection status of all or specified group(s) of Display Spots. Report any
	unexpected changes by logging a message to that effect and optionally emailing the
	message.

	Copyright (c) 2022 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */


import { Script, ScriptEnv } from "system_lib/Script";
import { DisplaySpot, Spot, SpotGroup } from "system/Spot";
import { SimpleMail } from "system/SimpleMail";
import {callable, parameter, property} from "../system_lib/Metadata";

const kNewline = "<br>\n"; // Email uses HTML format

export class SpotReporter extends Script {
	// Time constants in mS
	private static readonly MIN_RETRY_INTERVAL = 10_000; // Shortest allowed interval between checks
	private static readonly MIN_DISCONNECTED_TIME = 10_000; // Must have been disconnected this long to report

	private mEmail = "";
	private mSubject = "Blocks Display Connections Changed";

	private whenLastCheck = 0;	// To tihrottle checks to MIN_RETRY_INTERVAL

	private checkGroups: Dictionary<boolean> = undefined;	// Groups to check

	private connectedSpots: Dictionary<boolean> = {};  // Known to have been connected

	// Following dictionaries keyed by full Spot path, holding time when disconnect detected
	private recentlyDisconnectedSpots: Dictionary<number> = {};	// To hold off reporting a bit
	private disconnectedSpots: Dictionary<number> = {};  // Those we have reported

	public constructor(env: ScriptEnv) {
		super(env);
	}

	/**
	 * The email address where to send the messages. Other email-related settings, such
	 * as outgoing mail server, password, etc, are specified in Blocks' configurtion
	 * file, as described at the top of SimpleMail.ts
	 */
	@property("Email address to notify, if desired.")
	get email(): string {
		return this.mEmail;
	}
	set email(value: string) {
		this.mEmail = value;
	}


	@property("Subject line of email notification.")
	get subject(): string {
		return this.mSubject;
	}
	set subject(value: string) {
		this.mSubject = value;
	}

	@callable("Test sending of email")
	testEmail(
		@parameter("Email address for this test email")	sendTo: string,
		@parameter("Subject line")	subject: string,
		@parameter("Message body (accepts basic HTML tags)") body: string
		) {
		return SimpleMail.send(sendTo, subject, body);
	}

	@callable("Add path to a Spot Group to check (including any sub-groups therein). If not done, ALL Display Spots will be checked. Empty string resets.")
	addSpotGroup(groupPath: string) {
		if (groupPath) {
			if (this.checkGroups === undefined)
				this.checkGroups = {};
			this.checkGroups[groupPath] = true;
		} else
			this.checkGroups = undefined;	// Reset set of checked groups
	}

	/**
	 * Scan through relevant Display Spots in the system, reporting as they disconnect
	 * and reconnect.
	 */
	@callable("Check connection status of all configured spots")
	public checkNow() {
		/*	Obtain current time in mS.
			ToDo: replace with this.getMonotonousMillis()
		 */
		const now = Date.now();

		const sinceLastCheck = now - this.whenLastCheck;
		if (sinceLastCheck < SpotReporter.MIN_RETRY_INTERVAL)
			return;
		this.whenLastCheck = now;

		const disconnected: string[] = []; // Spots definitely disconnected
		const connected: string[] = [];	// Spots connected now after being disconnected

		// Called for each Display Spot found in specified group(s)
		const visit = (spot: DisplaySpot) => {
			const spotPath = spot.fullName;
			if (!spot.power) {
				// Ignore and forget all spots that are OFF
				if (this.connectedSpots[spotPath] !== undefined) {
					// console.log("Lost power", spotPath);
					delete this.connectedSpots[spotPath];
				}
				delete this.recentlyDisconnectedSpots[spotPath];
				delete this.disconnectedSpots[spotPath];
			} else {	// Spot is believed to have power
				if (spot.connected) {	// Spot is connected
					// if (!this.connectedSpots[spotPath])
					// 	console.log("Noted connected", spotPath);

					this.connectedSpots[spotPath] = true;

					if (this.recentlyDisconnectedSpots[spotPath]) {
						// console.log("No longer pending disconnect", spotPath);
						delete this.recentlyDisconnectedSpots[spotPath]; // Remove from waiting list
					}

					// Notify if it previously was reported as disconnected.
					if (this.disconnectedSpots[spotPath]) {
						// ("Reconnected", spotPath);
						connected.push(spotPath);
						delete this.disconnectedSpots[spotPath];
					}
				} else { // Spot is disconnected, yet powered
					if (this.connectedSpots[spotPath]) { // Known to have been connected
						if (!this.disconnectedSpots[spotPath]) { // Not already reported
							const whenDisconnected = this.recentlyDisconnectedSpots[spotPath];
							if (whenDisconnected) {
								if (now - whenDisconnected >= SpotReporter.MIN_DISCONNECTED_TIME) {
									// Spot has been disconnected long enough - time to report
									disconnected.push(spotPath);

									// Keep in connectedSpots, but set its value to false
									this.connectedSpots[spotPath] = false;

									// Move recentlyDisconnectedSpots to reported disconnectedSpots
									this.disconnectedSpots[spotPath] = this.recentlyDisconnectedSpots[spotPath];
									delete this.recentlyDisconnectedSpots[spotPath];
									// console.log("Definitely disconnected", spotPath);
								} // Else not considered long enough - don't report quite yet
							} else {	// Spot was not known as disconnected on last check.
								// console.log("Pending disconnect", spotPath);
								this.recentlyDisconnectedSpots[spotPath] = now; // Note when we found out
							}
						}
					}
				}
			}
		}

		if (this.checkGroups) {	// Check specified groups only
			for (let path in this.checkGroups) {
				let spotGroup: SpotGroup = undefined;
				const sgi = Spot[path];
				if (sgi)
					spotGroup = Spot[path].isOfTypeName("SpotGroup");
				if (spotGroup) // Actually got a group
					this.visitDisplaySpots(spotGroup, visit);
				else
					console.error("Not a Spot group", path);
			}
		} else
			this.visitDisplaySpots(Spot, visit);

		// Collect status changes into result string
		let result = this.notify("", disconnected, "disconnected");
		result = this.notify(result, connected, "reconnected");

		if (result)	// Only send if gt something to send
			this.sendMessage(result);
	}

	/**
	 * Visit all Display Spots inside specified group, including any nested groups.
	 */
	private visitDisplaySpots(group: SpotGroup, visit: (spot: DisplaySpot)=>void) {
		for (let name in group) {
			let spotGroupItem = group[name];
			const displaySpot = spotGroupItem.isOfTypeName("DisplaySpot")
			if (displaySpot)
				visit(displaySpot);
			else {
				const spotGroup = spotGroupItem.isOfTypeName("SpotGroup");
				if (spotGroup) // Recurse on nested group
					this.visitDisplaySpots(spotGroup, visit)
			}
		}
	}


	/**
	 * Notify someone of list of spot names, unless it's empty
	 */
	private notify(appendTo: string, spotNames: string[], what: string): string {
		if (spotNames.length){
			appendTo += "Display Spots " + what + kNewline;
			let dateNow: string; // Obtained lazily below

			for (let spotName of spotNames) {
				if (this.disconnectedSpots[spotName]) // Use time when was found to have disconnected
					appendTo += spotName + " " + new Date(this.disconnectedSpots[spotName]).toLocaleString() + kNewline;
				else {
					if (!dateNow) // Use current time, as we have no note here
						dateNow = new Date().toLocaleString();
					appendTo += spotName + " " + dateNow + kNewline;
				}
			}
		}
		return appendTo;
	}

	/**
	 * Send a message with specified body indicating what happened. If email property
	 * is set, I will try to email the message (returning a promise once that's done),
	 * else I will just log it.
	 */
	public sendMessage(message: string): Promise<void>|undefined {
		// Always log message
		console.log(this.mSubject, message);

		if (this.mEmail) // Got an email to send to
			return SimpleMail.send(this.mEmail, this.mSubject, message);
	}
}

// A simple typed dictionary type, always using string as key
export interface Dictionary<TElem> {
	[id: string]: TElem;
}
