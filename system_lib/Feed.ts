/*
 * Copyright (c) 2020 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

export abstract class Feed {
	protected readonly __feedEnv: FeedEnv;	// Internal use only!

	protected constructor(env: FeedEnv) {
		this.__feedEnv = env;
	}

	/**
	 * Publish a static feed instance under its name. The idea being that a backend may provide
	 * several different "presentations", "collections" or "themes" for presenting different sets
	 * of objects. Each of those have the same internal structure, but are designed to be shown
	 * on different spots or based on some other selection criteria.
	 */
	establishFeed<ListItem, DetailsItem extends ListItem>(feed: StaticFeed<ListItem, DetailsItem>) {
		this.__feedEnv.establishFeed(feed);
	}

	/**
	 * Turn an array-like object into a proper JavaScript array, which is returned.
	 * Simply returns arr if already appears to be fine.
	 */
	static makeJSArray<T>(arrayLike: IndexedAny<T>): T[] {
		if (Array.isArray(arrayLike) && arrayLike.sort && arrayLike.splice)
			return arrayLike;	// Already seems like a bona fide JS array

		const realArray: T[] = [];
		const length = arrayLike.length;
		for (var i = 0; i < length; ++i)
			realArray.push(arrayLike[i]);
		return realArray;
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
	readonly name: string;	// Internal (brief) name of this feed instance

	readonly listType: Ctor<ListItem>;	// Specifies type of items returned by getList
	readonly itemType: Ctor<DetailsItem>; // Type of items returned by getDetails

	getList(spec: FeedListSpec): Promise<ListData<ListItem>>;
	getDetails(spec: FeedDetailsSpec): Promise<DetailsItem|undefined>;
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
export interface FeedEnv  {
	establishFeed<ListItem, DetailsItem extends ListItem>(feed: StaticFeed<ListItem, DetailsItem>): void;
}
