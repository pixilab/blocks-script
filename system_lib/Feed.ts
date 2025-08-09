/*
 * Copyright (c) 2020 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

import {ScriptBase, ScriptBaseEnv} from "./ScriptBase";

export abstract class Feed  extends ScriptBase<FeedEnv>{

	protected constructor(env: FeedEnv) {
		super(env);
	}

	/**
	 * Publish a static feed instance under its name. The idea being that a backend may provide
	 * several different "presentations", "collections" or "themes" for presenting different sets
	 * of objects. Each of those have the same internal structure, but are designed to be shown
	 * on different spots or based on some other selection criteria.
	 */
	establishFeed<ListItem, DetailsItem extends ListItem>(feed: StaticFeed<ListItem, DetailsItem>) {
		this.__scriptFacade.establishFeed(feed);
	}

	/**
	 * Tell all Spots currently showing this feed to reload its data. You may want to
	 * call this if the underlying data changes in order to expidite its display.
	 */
	refreshFeed(instanceName: string) {
		this.__scriptFacade.refreshFeed(instanceName);
	}
}

// An array-like type having "index signature" and a length property
type IndexedAny<T> = { [index:number]: T; readonly length: number };


// A simple map-like object type
interface Dictionary<TElem> { [id: string]: TElem; }

// A class constructor function
interface Ctor<T> { new(... args: any[]): T ;}

/**
 * Interface to be implemented by each static feed instance published through establishFeed.
 */
export interface StaticFeed<ListItem extends Object, DetailsItem extends ListItem> {
	readonly name: string;	// Name of this feed instance

	readonly listType: Ctor<ListItem>;	// Specifies type of items returned by getList
	readonly itemType: Ctor<DetailsItem>; // Type of items returned by getDetails

	/*	Obtain a ListData object containing an array of ListItem objects,
		returned through a Promise
	 */
	getList(spec: FeedListSpec): Promise<ListData<ListItem>>;

	/*	Provide full details of requested object. This function is not needed if
		listType and itemType specify the same type (in which case getList has already
		provided all data required).

		IMPORTANT: The getDetails function must return a proper superset of the
		corresponding list item, including all its data fields.
	 */
	getDetails?(spec: FeedDetailsSpec): Promise<DetailsItem | undefined> | DetailsItem | undefined;
}

/**
 * Common information passed into getList and getDetails requests, including possibly useful
 * Spot-side settings such as tags and spot parameters, which may be used to modify the query
 * sent to the backend. E.g., if the backend request directly supports language preferences.
 */
interface FeedSpec {
	spotTags: Dictionary<true>;	// All tags applied to the spot (e.g., language preference)
	spotParameters: Dictionary<string|number|boolean>;	// All local spot parameters
	// Internal note: also in PlayerPubSub as FeedRequestParams
}

/**
 * Parameter block passed to feed instance's getList method.
 */
export interface FeedListSpec extends FeedSpec {
	offset: number;			// Items to skip at beginning of list
	limit: number;			// Max number of items to fetch
}

/**
 * Parameter block passed to feed instance's getDetails method.
 */
export interface FeedDetailsSpec extends FeedSpec {
	id?: number|string;	// ID to load details for (takes precedence if specified)
	index?: number;		// 0-based index to load details for (used if no id)
}

/**
 * Wrapper for data returned by getList, augmenting the raw data items with pertinent
 * metadata.
 */
export interface ListData<ListItem> {
	items: ListItem[];		// Data returned from request
	totalCount?: number;	// Total number of records (assumed to be items.length if not specified)
}

// Internal use only!
export interface FeedEnv extends ScriptBaseEnv {
	establishFeed<ListItem, DetailsItem extends ListItem>(feed: StaticFeed<ListItem, DetailsItem>): void;
	refreshFeed(instName: string): void;
}
