/*
 * Copyright (c) 2020 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

export abstract class Feed {
	protected readonly __feedEnv: FeedEnv;	// Internal use only!

	protected constructor(env: FeedEnv) {
		this.__feedEnv = env;
	}

	establishFeed<ListItem, DetailsItem extends ListItem>(feed: StaticFeed<ListItem, DetailsItem>) {
		this.__feedEnv.establishFeed(feed);
	}

	/**
	 * Turn an array-like object into a proper JavaScript array, which is returned.
	 * Simply returns arr if already is fine.
	 */
	static makeJSArray(arr: any[]) {
		if (Array.isArray(arr))
			return arr;	// Already seems kosher
		/*	Casts below required to convince TS compiler that arr is indeed
			sufficiently array-like to provide length and indexed access,
			even past the isArray check above.
		 */
		const result = [];
		const length = (<any[]>arr).length;
		for (var i = 0; i < length; ++i)
			result.push((<any[]>arr)[i]);
		return result;
	}
}


// A simple map-like object type
interface Dictionary<TElem> { [id: string]: TElem; }

// A class constructor function
interface Ctor<T> { new(... args: any[]): T ;}

export interface StaticFeed<ListItem extends Object, DetailsItem extends ListItem> {
	readonly name: string;	// Internal (brief) name of this feed instance

	readonly listType: Ctor<ListItem>;	// Specifies type of items returned by getList
	readonly itemType: Ctor<DetailsItem>; // Type of items returned by getDetails

	getList(spec: FeedListSpec): Promise<ListData<ListItem>>;
	getDetails(spec: FeedDetailsSpec): Promise<DetailsItem|undefined>;
}

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
