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
}


// A simple map-like object type
interface Dictionary<TElem> { [id: string]: TElem; }

// A class constructor function
interface Ctor<T> { new(... args: any[]): T ;}

export interface StaticFeed<ListItem extends Object, DetailsItem extends ListItem> {
	name: string;

	listType: Ctor<ListItem>;
	itemType: Ctor<DetailsItem>;

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
	id?: number|string;	// ID to load details for (takes priority if specified)
	index?: number;		// 0-based index to load details for (used if no id)
}

export interface ListData<ListItem> {
	items: ListItem[];		// Data returned from request
	totalCount?: number;	// Total number of records (assumed to be items.length if not speified)
}

// Internal use only!
export interface FeedEnv  {
	establishFeed<ListItem, DetailsItem extends ListItem>(feed: StaticFeed<ListItem, DetailsItem>): void;
}
