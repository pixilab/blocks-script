/*	Some base classes often useful when building a Personal Visitor Experience based
 on Stations that can be visited by visitors, assuming one visitor at a time
 at any given station.

 Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */


import { BaseSpot, Spot, Visitor } from "../system/Spot";
import { PropertyAccessor, Script } from "../system_lib/Script";
import { PrimitiveValue, RecordBase } from "../system_lib/ScriptBase";

const DEBUG = false;	// Controls verbose logging

// What I expect from the data record
export interface VisitorRecordBase extends RecordBase {
	readonly $puid: number;		// Persistent, system-unique identifier for this Record
	readonly $hasUserData: boolean; // Record has received data (else entirely unused)

	name?: string; 				// Name of visitor, if available
	currentStation?: string;	// Spot path to currently visited station, if any
}

// A simple typed dictionary type, always using string as key
export interface Dictionary<TElem> {
	[id: string]: TElem;
}

/**
 * Base class for the User Script that manages the experience, with basic
 * support for visitors, stations and (optional) visitor phones. If no
 * phone is used, just omit the VisitorPhone type parameter. It might have
 * been more elegant separating the phone-independent functionality by
 * inserting one more base class, but that would have added yet
 * another level (with its generics) which may confuse more than help.
 */
export abstract class VisitorScriptBase<
	Station extends StationBase<any, any, any>,
	VisitorRecord extends VisitorRecordBase,
	VisitorPhone extends VisitorPhoneBase<VisitorRecord, Station> | undefined = undefined
> extends Script {
	// All Stations, keyed by their spot paths
	public readonly stations: Dictionary<Station> = {};

	// Active visitors current location, keyed by visitor's $puid
	private readonly visitorLoc: Dictionary<Station> = {};

	// Keyed by phone PUID string
	private readonly phones: Dictionary<VisitorPhone> = {};

	/*	Add a station under its name, so visitors can visit or leave that
		station through my visit funciton.
	*/
	protected addStation(station: Station) {
		this.stations[station.spotPath] = station;
		station.init()
	}

	/**
	 * Visitor left the building. Discard visitor's data from memory.
	 */
	leftTheBuilding(visitor: VisitorRecord) {
		console.log('----- Visitor left the building: ' + visitor.name);
		delete this.visitorLoc[visitor.$puid]; // No longer visiting any location
		this.discardVisitor(visitor);
		log('Visitor is gone', visitor.$puid);
	}

	/**
	 * I merely delete the visitor's data record. Override and do NOT call super if you
	 * want to do this differently, and/or archive other data such as images.
	 */
	protected discardVisitor(visitor: VisitorRecord) {
		this.deleteRecord(visitor, false);
	}

	/**
	 * Phone connected to me. Store for lookup based on its ID.
	 */
	gotPhone(phone: VisitorPhone): void {
		this.phones[phone.getIdentity()] = phone;
	}

	/**
	 * Get phone with specified identity, if available.
	 */
	getPhone(phoneId: string): VisitorPhone | undefined {
		return this.phones[phoneId];
	}

	/**
	 * Get the station corresponding to path, if any, else undefined.
	 */
	getStationForSpotPath(path: string): Station | undefined {
		return this.stations[path];
	}

	/*	Get the station currently being visited by visitor, or undefined if none.
	 */
	currentStationForVisitor(visitor: VisitorRecord): Station | undefined {
		return this.visitorLoc[visitor.$puid];
	}

	/**
	 * Phone disconneced from me (e.g., powered off or similar). Remove from
	 * my dictionary.
	 */
	lostPhone(phone: VisitorPhone): void {
		const visitorRecord = phone.getVisitor().record;
		if (visitorRecord) {
			const visitorStation = this.currentStationForVisitor(visitorRecord);
			if (visitorStation)
				visitorStation.lostVisitor(phone.getVisitor().record);
		}
		delete this.phones[phone.getIdentity()];
	}

	/**
	 * Visitor visits specified station (or is at NO station if station is undefined).
	 * Leave any previous station associated with visitor (calls Station#lostVisitor).
	 * Then, if at a new station, note that and call Station#receivedVisitor.
	 * If station is string, then assumed to be a station name (spot path)
	 */
	visits(
		visitor: VisitorRecord,
		station?: Station | string | undefined
	) {
		if (typeof station === 'string')
			station = this.getStationForSpotPath(station);
		const prevStation = this.visitorLoc[visitor.$puid];
		if (prevStation && prevStation !== station)
			prevStation.lostVisitor(visitor);

		// Maps visitor ID to undefined until receivedVisitor returns true below
		this.visitorLoc[visitor.$puid] = undefined;

		if (station) {
			if (station.receivedVisitor(visitor)) {
				this.visitorLoc[visitor.$puid] = station;
				visitor.currentStation = station.spotPath; // Note that we're here
			} else visitor.currentStation = ''; // Station didn't accept visitor
		} else visitor.currentStation = ''; // No current station
	}
}

/**
 * Base class for managing a "Station" (generally a Spot) that can
 * be visited by a single visitor at a time.
 *
 * You MUST call init on the result after constructing the most derived class.
 */
export abstract class StationBase<
	VisitorRecord extends VisitorRecordBase,
	VisitorScript extends VisitorScriptBase<
		any,
		VisitorRecord,
		VisitorPhoneBase<VisitorRecord, any>
	>,
	SpotType extends BaseSpot
> {
	protected mCurrVisitor?: VisitorRecord; // Most recent visitor at this station
	protected mySpot: SpotType; 			// Associated spot, if any (see connectSpot())
	protected locateVisitorsPhone: boolean; // If set, tell visitor's phone to locate here when connects

	protected constructor(
		public readonly spotPath: string,
		protected readonly owner: VisitorScript
	) {
	}

	/**
	 * One-time initialization of this station, done once soon after ctor,
	 * and before any other active use of this station.
	 */
	public init() {
		this.connectSpot(); // Attempt initial connection, if already there
	}

	/**
	 * Convenience method that can be used by subclasses to indicate that
	 * this station became visited by visitor. Does NOTHING if visitor is
	 * undefined.
	 */
	protected gotVisitor(visitor: VisitorRecord) {
		if (visitor)
			this.owner.visits(visitor, this);
		// Else ignored silently
	}

	/*	Visitor arrives at this station. Return false if you reject
		the visitor for some reason, else ret true. Override if you need to
		take special action. You should generally call super before doing
		anything else if you accept the visitor, to establish the current
		visitor at this station.

		NOTE: Only to be called by owner and any overriders.
		In other cases, gotVisitor is likely what you want.
	*/
	receivedVisitor(visitorData: VisitorRecord): boolean {
		log(
			'Station',
			this.spotPath,
			'received visitor',
			visitorData.name,
			visitorData.$puid
		);
		this.mCurrVisitor = visitorData;
		return true;
	}


	/*	Visitor left this station, e.g. due to visiting another.
		Override if you need to take special action.
		Remember to call super.
	*/
	lostVisitor(visitor: VisitorRecord) {
		if (this.mCurrVisitor === visitor)
			this.mCurrVisitor = null;
	}

	/**
	 * Tell my Spot to navigate to specified child block path.
	 */
	gotoBlock(path: string, play = false) {
		Spot[this.spotPath].gotoBlock(path, play);
	}


	/*	Navigate to active or passive attractor state. Sometimes better than setting
		Spot's active property since gotoBlock establishes a new timeout. Assumes
		that the Block at this Spot has a top level Attractor.
	 */
	protected activateByGotoBlock(act: boolean) {
		// OK with block index here, since child at '0' is always active child
		this.gotoBlock(act ? '0' : '1');
	}

	/**
	 * If I have a current visitor, then kick him off this Station
	 */
	ejectVisitor() {
		if (this.hasVisitor())
			this.owner.visits(this.getCurrVisitor(), undefined);
	}

	/**
	 * Get the phone visiting this station, if any
	 */
	protected getVisitingPhone(): VisitorPhoneBase<VisitorRecord, any> | undefined {
		return undefined;
	}

	/*	If I have an associated mobile phone, tell it's locator
		to go to this station. This also sets the locateVisitorsPhone
		flag, subsequently used by a mobile as it connects to sync up
		its current location.
	*/
	protected tellPhoneToLocateThisStation() {
		const phone = this.getVisitingPhone();
		if (phone)
			phone.locate(this.spotPath);
		this.locateVisitorsPhone = true; // Remember to when it connects
	}

	/**
	 * Return true if visitor's phone should be told to locate to
	 * this station when it connects.
	 */
	shouldAutoLocatePhone() {
		return this.locateVisitorsPhone;
	}

	/**
	 * Get property accesor for any property under my associated Spot.
	 */
	protected getSpotPropertyAccessor<PropType extends PrimitiveValue>(
		subPath: string, // Path under this Spot
		changeNotification?: (value: PropType) => void
	): PropertyAccessor<PropType> {
		return this.owner.getProperty<PropType>(
			'Spot.' + this.spotPath + '.' + subPath,
			changeNotification
		);
	}

	/**
	 * Similar, but for getting a Spot parameter of my associated Spot.
	 */
	protected getSpotParameterAccessor<PropType extends PrimitiveValue>(
		paramName: string, // Parameter of this spot
		changeNotification?: (value: PropType) => void
	): PropertyAccessor<PropType> {
		return this.getSpotPropertyAccessor<PropType>(
			'parameter.' + paramName,
			changeNotification
		);
	}

	// Someone is currently at this station
	protected hasVisitor() {
		return !!this.mCurrVisitor;
	}

	// Data associated with the current visitor
	protected getCurrVisitor(): VisitorRecord {
		if (!this.mCurrVisitor)
			// Make sure I indeed have one
			throw 'No current visitor';
		return this.mCurrVisitor;
	}

	// Return true if visitor is my current visitor
	protected isCurrentVisitor(visitor: VisitorRecord) {
		return (
			this.mCurrVisitor &&
			visitor &&
			this.mCurrVisitor.$puid === visitor.$puid
		);
	}


	/**
	 * Attempt to hook up to my spot. Returns false if fails (i.e., no DisplaySpot
	 * at specified Spot path). Also handles re-connection should my spot ever
	 * die, as may happen due a Spot's settings change or similar. Subclasses that
	 * need to hook up additional spot related properties or such should first call
	 * me, and then, inly if I return true, proceed with their own spot-related
	 * connections.
	 */
	protected connectSpot(reconnect = false) {
		const spot = Spot[this.spotPath] as SpotType;
		if (spot) {
			// Attempt to reconnect if my current spot object finishes its life cycle
			spot.subscribe('finish', () =>
				this.connectSpot()
			);
		} else
			console.warn(`Spot ${this.spotPath} not found, not ${reconnect ? 're' : ''}connected...`);
		this.mySpot = spot;
		return !!spot;
	}
}


/**
 * Base class for representing an individual visitor's phone.
 *
 * You MUST call init on the result after constructing the most derived class.
 */
export class VisitorPhoneBase<
	VisitorRecord extends VisitorRecordBase,
	Station extends StationBase<any, any, any>
> {
	private tagId: PropertyAccessor<string>;
	private record: VisitorRecord; // Associated data record (null until gotVisitorTagID connects to the data)

	constructor(
		protected owner: VisitorScriptBase<any, any, any>,
		protected visitor: Visitor<VisitorRecord>, // Also provides associated data record, if one was found
		protected readonly recordType: Ctor<VisitorRecord>
	) {
		log(
			'VisitorPhone id and record',
			visitor.identity,
			visitor.record ? visitor.record.$puid : 'no data'
		);

		this.record = visitor.record; // Initially null, until assigned in gotVisitorTagID

		/*	Listen for tagId parameter, passed in using QR code as query parameter of URL,
			allowing me to bind the mobile to its corresponding data record.
		*/
		this.tagId = owner.getProperty<string>(
			this.getSpotParamPath('tagId'),
			(tagId) => {
				if (tagId)
					// Ignore empty string – may see that initially
					this.gotVisitorTagID(tagId);
			}
		);


		// Learn when visitor locates a spot
		visitor.subscribe(
			'location', (
				sender,
				message
			) =>
				this.didLocate(message.location)
		);

		// Listen for this visitor's phone disconnecting
		visitor.subscribe('finish', () => this.visitorGone());

	}

	/**
	 * One-time initialization of me. Must be called exactly once after ctor,
	 * and before any other active use of this station.
	 */
	init() {
		this.owner.gotPhone(this);

		/*	If considered at a station where shouldAutoLocatePhone, then tell my
			mobile to go there using its locator. This may happen if navigation
			was done with tag while phone was off and the phone is then turned
			on. Likewise, this will close the location if currently
			at NO such station, as the phone's locator may have been left at a
			previous location if turned off while there. Essentially, the call
			to locate the phone will sync things up there.
		*/
		if (this.record) {
			this.applyRecord();

			let spotPath = this.record.currentStation;
			const station = this.owner.getStationForSpotPath(spotPath);
			if (!station || !station.shouldAutoLocatePhone())
				spotPath = ''; // Closes any open locator on mobile
			log('VisitorPhone locate', spotPath);
			this.locate(spotPath);
		}
	}

	/**
	 * I have an initial, associated data record. Do any additional operations deemed
	 * nessecary to apply it to the visitor, such as setting tags, etc.
	 */
	protected applyRecord() {
	}

	/**
	 * Just obtained my associated data record. Hook to do any additional
	 * one-time duties needed at that point.
	 */
	protected gotRecord(newRecord: VisitorRecord) {
	}

	/*	Get a unique identified for this phone.
	 */
	getIdentity() {
		return this.visitor.identity;
	}

	/*	Get my visitor.
	 */
	getVisitor() {
		return this.visitor;
	}

	/**
	 * get the property path to a local spot parameter of this mobile.
	 */
	getSpotParamPath(param: string) {
		return 'Spot.Visitor.' + this.visitor.identity + '.parameter.' + param;
	}

	/**
	 * Ask this phone to locate specified spot.
	 */
	locate(spotPathToLocate: string) {
		log('Phone', this.visitor.identity, 'locate spot', spotPathToLocate);
		this.visitor.locateSpot(spotPathToLocate, true);
	}

	/**
	 * Located to specified path using Locator on mobile. Or explicitly
	 * left (closed) the location if empty string.
	 */
	private didLocate(spotPath: string) {
		log('Phone', this.visitor.identity, 'located spot', spotPath);
		this.owner.visits(this.visitor.record, spotPath);
	}


	/**
	 * Received tag ID through Visitor's spot parameter. This may be used as the first entry
	 * point while still at the reception desk, to associate mobile phone to its data record
	 * based on the tag ID, which is already set as a secondary ID field on the record.
	 *
	 * Find the corresponding data record,
	 * and set my phone's identity there as a secondary ID. That secondary ID field is
	 * then referenced in the Visitor's spot settings, Identity tab, "Mobile is secondary
	 * ID using". Once set, Blocks will automatically look up and associated the correct
	 * data record with this mobile device, passing the record in as the second constructor
	 * parameter.
	 */
	private gotVisitorTagID(tagId: string) {
		log('gotVisitorTagID', tagId);
		if (!this.record) {
			// Record not yet obtained. Attempt to do so now.
			let r = this.owner.getRecordSec(this.recordType, 'tagSerial', tagId);
			if (r) {
				log(
					'Got tag ID',
					tagId,
					'for data record',
					r.$puid,
					'with name',
					r.name,
					'mobile ID',
					this.visitor.identity
				);
				this.record = r;
				this.gotRecord(r);
			} else
				log('Got tag ID', tagId, 'with no corresponding data record');
		}
		/*	Else this mobile has already been associated with its record, so nothing to do here.
			May just be the mobile re-loading the same URL, or such, while no longer at the
			reception desk.
		*/
	}

	/** Visitor disconnected - do what's appropriate here.
	 */
	protected visitorGone() {
		log('VisitorPhone disconnected', this.visitor.identity);

		this.owner.lostPhone(this);
		this.tagId.close(); // Do not leak prop accessors for each reconnection
	}
}

/**
 Log messages, allowing my logging to be easily disabled in one place.
 */
function log(...messages: any[]) {
	if (DEBUG)
		// Set to false to disable my logging
		console.info(messages);
}
