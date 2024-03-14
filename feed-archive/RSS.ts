/*
	RSS feed script 
	Feeds can be configured using a config file stored in /script/files/. The script will produce an example file to use as a starting point. 
	The script - 
	- can accept wanted image target sizes for feeds that has a group with alternative images as per https://www.rssboard.org/media-rss 
	- can limit the feed with a maxAge setting. (days)
	- can limit the feed with a maxFeedLength setting. (items)
	- does make use of the first <media:content> if multiple is present.
	- has no support for video.
	- will present fields that do not strictly follow the RSS specification. The channel image url, title and description are available on every item due to hierarchy limitations in blocks property paths in order to enable multiple channels from a single feedscript. 
	- implements only parts of RSS 2.0 syndication format, expect image, description, title, date to work if present in the data.
	- does not fully support ATOM syndication format but will probably work to some extent.
	- does not fully support RDF syndication format but will probably work to some extent.

	 
	version 1.0 , basic functionality 
 	Copyright (c) 2024 PIXILAB Technologies AB, Sweden (https://pixilab.se). All Rights Reserved.
 */


import {field, id, callable, parameter} from "system_lib/Metadata";
import * as feed from "system_lib/Feed";
import {ListData} from "system_lib/Feed";
import {SimpleHTTP} from "../system/SimpleHTTP";
import { SimpleFile} from "system/SimpleFile";

const DEBUG_LOGGING_ENABLED = true;
const CONFIG_FILE = "Rss.config.json";
const EXAMPLE_SETTINGS: RSSSettings = {
    channels: [
		{
			url: "http://rss.cnn.com/rss/edition_world.rss",
			feedTitle: "CNN_World",
			imageWidth: 100,
			imageHeight: 100,
			maxAge: 400,
			maxLength:10
		  },
        {
            url: 'http://www.nrk.no/nyheter/siste.rss',
            feedTitle: 'NRK'
        },
		{
			url: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml',
			feedTitle: 'BBC'
		}
    ]
};
//Provide some "reasonable" defaults in case not provided.
const DEFAULT_MAX_LENGTH = 999; //items
const DEFAULT_MAX_AGE = 999; //days
const DEFAULT_TARGET_WIDTH = 600; //pixels
const DEFAULT_TARGET_HEIGHT = 600; //pixels

/**
 * Main class of the feed script.
 */
export class RSS extends feed.Feed {

	constructor(env: feed.FeedEnv) {
		
		super(env);
		this.readSettingsFile(CONFIG_FILE)
	}
	 
	/**We check if file exist, if it does we try to parse the content, if parse fail we write an example file that can be used to see the correct syntax. */
	private readSettingsFile(filename: string) {
		const exampleFilename = filename.replace(".json", ".example.json")
		SimpleFile.exists(filename)
			.then(exists => {
				if (exists === 1) {
					// File exists and is a file, attempt to read it
					SimpleFile.readJson(filename)
						.then(data => {
							const settings:RSSSettings = data;
							if (settings.channels) {	
								for (const channel of settings.channels){
									this.addFeed(
										channel.feedTitle,
										channel.url,
										channel.imageHeight,
										channel.imageWidth,
										channel.maxAge,
										channel.maxLength
									)							
								}
							}
						})
						.catch(error => {
							console.error("Failed reading settings file, attemt to write an example file as reference (in /script/files/:", filename, error);
							this.writeJsonToFile(exampleFilename,EXAMPLE_SETTINGS);
						});
				} else {
					console.error("Could not find a config file, this may be on purpose, making sure we have an example file:", exampleFilename, filename);
					this.writeJsonToFile(exampleFilename,EXAMPLE_SETTINGS);
				}
			})
			.catch(error => {
				console.error("Error checking file existence:", filename, error);
			});
	}
	
	/**Writes a configuration file in humanly readable form. data must be JSON */
	private writeJsonToFile(filename:string, data:any){
		SimpleFile.write(filename, JSON.stringify(data, null, 2)) // Create a settingsfile and make it easier for humans to read.
		.then(() => {
			console.log("File written successfully, ", filename);
		})   
		.catch(error => {   
			console.error("Failed writing file:", filename, error);
		});
	}

	/**Reinitializes the feed script, usefule to add or remove added feeds.*/
	@callable("Re-initialize feedscript, run to reset feed config")
	reInitialize() {
		console.log("Reinitialize")
		super.reInitialize();
	}
	/**Add a new feed, this is not persisted.*/
	@callable("Add a feed in runtime, not persisted.")
	public addFeed(
	@parameter("Channel name, i.e. Latest News",false)	
	channelName: string,
	@parameter("Channel URL, i.e. http://nrk.no/nyheter/latest.rss",false)	
	channelUrl: string,
	@parameter("Specify a target image height. Only applies if the feed has group of images in a media:group tag.",true)	
	targetImageHeight?: number,
	@parameter("Specify a target image height. Only applies if the feed has group of images in a media:group tag.",true)	
	targetImageWidth?: number,
	@parameter("Specify max age of the publish date. ",true)	
	maxAge?: number,
	@parameter("Specify max length of the feed (How many items to publish.). ",true)	
	maxFeedLength?: number,
	
	
	){
		this.establishFeed(new Channel(
			channelName,
			channelUrl,
			this,
			targetImageHeight || DEFAULT_TARGET_HEIGHT,
			targetImageWidth || DEFAULT_TARGET_WIDTH,
			maxAge || DEFAULT_MAX_AGE,
			maxFeedLength || DEFAULT_MAX_LENGTH
		));	
	}
}

/**
 * My single list
 */

/**
 * My single collection. Multiple collections can be
 * added to present different RSS channels.
 */
class Channel implements feed.StaticFeed<ListItem, ListItem> {
	
	readonly listType = ListItem;
	readonly itemType = ListItem;
	owner: RSS
	channelTitle = ""
	channelImageUrl = ""
	
	constructor(
		readonly name: string, 
		readonly url:string = "",
		owner: RSS, 
		readonly targetImageHeight:number,
		readonly targetImageWidth:number,
		readonly maxAge:number,
		readonly maxFeedLength:number
		){
		this.owner = owner
	}


/**
 * Get the RSS items as a list. getList is a mandatory function required by Blocks static feed.
 */
	async getList(spec: feed.FeedListSpec): Promise<ListData<ListItem>> {
		
		try {
			const feed = await SimpleHTTP.newRequest(
				this.url,
				{ interpretResponse: true }
			).get<RSSRoot>();
			const items: ListItem[] = [];
			log("Status: ", this.url, feed.status);

			const currentDate = new Date(); //Now
            const maxAgeDate = new Date(currentDate.getTime() - this.maxAge * 24 * 60 * 60 * 1000); //date of the oldest allowed in milliseconds as a date object.

			if (feed.status === 200) {
				//We extract channel information here to make it accessable when creating at the items in the feed, not ideal but save us from having one separate RSS feedscript/feed
				this.channelImageUrl = feed.interpreted.channel.image?.url || "";
				this.channelTitle = feed.interpreted.channel.title; //Required by RSS spec.
				const itemList = feed.interpreted.channel.item || feed.interpreted.item || []; //We fallback to see id item is stored outside <channel> tag. 
				for (const item of itemList) {
					const pubDate = item.pubDate ? new Date(item.pubDate) : item.date ? new Date(item.date) : null;
				 	//const pubDate = item.pubDate ? new Date(item.pubDate) : null; //Make sure to set to null in case no valid date exist
					log("Pubdate:",pubDate, "Max age date:", maxAgeDate)
					if (pubDate && pubDate >= maxAgeDate) {	//Do we have a pubdate and is it within max age?
						if (items.length < this.maxFeedLength){	//Is there a maxFeedLength cap?
							log("Item found", item.title)
							items.push(new ListItem(item, this));
						} else {
							log("Item ignored, out of current maxLength scoop")	
						}
					} else {
					log("Item ignored, out of current maxAge scoop")	
					}
				}
				log(items.length,"valid items found")
				if (items.length === 0){
					return { items: [] }; //Return an empty list rather than no list..
				}
			}

			return { items: items };
		} catch (error) {
			console.error("Error occurred while getting the feed:", error);
			return { items: [] }; //Return an empty list rather than no list..
		}
	}
}

/**
 * Describes each item returned in the feed's list, with its fields.
 */
class ListItem {
	@id("Unique identifier from RSS")
	readonly guid: string;

	@field() readonly title: string;
	@field() readonly link: string;
	@field() readonly description: string;
	@field() readonly category: string;
	@field() readonly date: string;
	@field("Image URL, if any") readonly imageUrl?: string;
	@field() readonly imageTitle?: string;
	@field() readonly imageCredit?: string;
	@field() readonly channelImageUrl?: string;
	@field() readonly channelTitle?: string;
	

	// Map the fields in the RSS data into my feed fields. Som fields use fallbacks in a best effort priority order that may or may not be optimal for a particular feed.
	constructor(rss: RSSItem, owner:Channel) {
		log(rss.date, rss.pubDate)
		this.guid = rss.guid || "";
		this.title = rss.title || "";
		this.link = rss.link || "";
		this.description = rss.encoded || rss.description || ""; //We use encoded (from content namespace) also as source for description but with higher priority.
		this.date = rss.pubDate || rss.date || "";
		this.category = ListItem.getCategory(rss.category)
		//Channel information copied to all items, acceeable in blocks by hardcoding to item index 0.
		this.channelImageUrl = owner.channelImageUrl || "" 
		this.channelTitle = owner.channelTitle || ""
		
		if (rss.group){ //If the feed has a group of images in various crops (<media:group>)
		log("Item contains an RSS group")
		let media = ListItem.getBestMatchedImage(rss.group, owner.targetImageHeight, owner.targetImageWidth); 
			if (media){
				this.imageUrl = media.url || "";
				this.imageTitle = media.title || "";
				this.imageCredit = media.credit ? media.credit[""] : ""; //Since the parser also return the element attributes and the data we must get the data with the empty string as key.

			} else {
			this.imageUrl = this.imageTitle = this.imageCredit = ""
			}
		} else if (rss.content) {  //If the feed has a single image stored as (<media:content> we always use the first one, this script does not support making use of multiple images)
			log("Item contains an RSS content")
			let media = rss.content;
			if (media){
				this.imageUrl = media.url || "";
				this.imageTitle = media.title || "";
				this.imageCredit = media.credit ? media.credit[""] : "";
			} else {
			this.imageUrl = this.imageTitle = this.imageCredit = ""
			}
		} else if (rss.thumbnail){ //None of the above but we found a thumbnail that we can use that as a last resort as source for imageUrl.
			log("Item contains a thumbnail")
			this.imageUrl = rss.thumbnail.url || ""; 
			this.imageTitle = this.imageCredit = ""
		} else { //No images at all, just set  empty strings.
			log("No image found")
			this.imageUrl = this.imageTitle = this.imageCredit = ""
		}
	}


	/**Takes the image data from a media:group and a wanted target width and height, iterates through the content, calculates a simple "difference" metric.
	 It then returns the content with the smallest total difference. Will return first image if we miss size data.*/
	 private static getBestMatchedImage(group: MediaGroup, targetWidth?: number, targetHeight?: number): MediaContent | undefined {
		let bestMatch: MediaContent | undefined;
		let firstImage: MediaContent | undefined;
	
		for (const content of group.content) {
		  // Check if both height and width has a size
		  if (content.height > 0 && content.width > 0) {
			//Calculate the absolute difference between current image size and target size.  
			const widthDifference = Math.abs(content.width - targetWidth);
			const heightDifference = Math.abs(content.height - targetHeight);
			
			// If the bestMatch is not set yet or the current content has a smaller difference, update the bestMatch
			if (!bestMatch || (widthDifference + heightDifference) < (Math.abs(bestMatch.width - targetWidth) + Math.abs(bestMatch.height - targetHeight))) {
			  bestMatch = content;
			}
		  } else {
			// Keep track of the first image in case all images are missing data
			if (!firstImage) {
			  firstImage = content;
			}
		  }
		}
	  
		// If all images are missing data, return the first image
		if (!bestMatch && firstImage) {
			log("First image",firstImage)
		  return firstImage;
		}
		log("Best match image is", bestMatch)
		return bestMatch;
	  }
	  
	// Return something sensible for the category field, which may be undefined, single or multiple
	private static getCategory(cat?: string | string[]) {
		if (cat) {
			if (typeof cat === "string")
				return cat;
			// Turn array-like into true JS array to call join
			return feed.Feed.makeJSArray(cat).join(', ');
		} else
			return "";
	}
}

function log(...msg:any){
    if (DEBUG_LOGGING_ENABLED)
    console.log(msg)
}

// Structure of data held as children of the <item> RSS node
interface RSSItem {
	guid?: string;
	title?: string;
	link?: string;
	category?: string | string[];
	pubDate?: string;
	date?:string;
	description?: string;
	encoded?: string;
	thumbnail?:{
		url: string;
		height?: number;
		width?: number;
	},
	group?: MediaGroup;
	content?: {
		url?: string;
		credit?: {
			role?: string;
			scheme?: string;
			"": string;	// Workaround to get elements text content
		};
		
		title?: string; 
	};
}

interface MediaGroup {
content: MediaContent[];
}

interface MediaContent {
	url?: string;
	height?: number;
	width?: number;
	type?: string;
	credit?: {
		role: string;
		scheme: string;
		"": string;	// Workaround to get elements text content
	};
	title?: string;
}


// Structure of the root XML object of the RSS feed
interface RSSRoot {
	channel: {
		title: string;
		link: string;
		description: string;
		image?:  {
			title?: string;
			url?: string;
			link?: string;
			width?: number;
			height?: number;
			description?: string;
		}
		item: RSSItem[];
	},
	item?: RSSItem[]; // Some feeds has the items outside the channel element. i.e in some RDF flavors of RSS:
}

// For the configuration file.

interface RSSChannel {
    url: string;
    feedTitle: string;
    imageWidth?: number;
    imageHeight?: number;
	maxAge?: number;
	maxLength?: number;
}

interface RSSSettings {
    channels: RSSChannel[];
}
