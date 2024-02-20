/*
	RSS feed script 
	Feeds can be configured using a config file stored in /script/files/. The script will produce an example file to use as a starting point. 
	The script - 
	- can accept wanted image target sizes for feeds that has a group with alternative images as per https://www.rssboard.org/media-rss 
	- has no support for video.
	- will present fields that do not strictly follow the RSS specification. The channel image url, title and description are available on every item due to hierarchy limitations in blocks property paths in order to enable multiple channels from a single feedscript. 
	- does currently not support the content:encoded element  
	- implements only parts of RSS 2.0 syndication format, expect image, description, title, date to work
	- does not support ATOM syndication format
	- does not implement any date sorting mechanism. 
	(Please, feel free to contribute with enhancements.)

	The settings file has the following structure where url and feedTitle are mandatory and imageHeight, imageWidth is optional and only makes sense to use it the feed source uses group element with image variants:
	{
    channels: [
        {
            url: 'http://rss.cnn.com/rss/edition_world.rss',
            feedTitle: 'CNN_World',
            imageWidth: 100,
            imageHeight: 100
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
}
	version 1.0 , basic functionality 
 	Copyright (c) 2023 PIXILAB Technologies AB, Sweden (https://pixilab.se). All Rights Reserved.
 */


import {field, id, callable, parameter} from "system_lib/Metadata";
import * as feed from "system_lib/Feed";
import {ListData} from "system_lib/Feed";
import {SimpleHTTP} from "../system/SimpleHTTP";
import { SimpleFile} from "system/SimpleFile";

const DEBUG_LOGGING_ENABLED = false;
const CONFIG_FILE = "Rss.config.json";
const DEFAULT_SETTINGS: RSSSettings = {
    channels: [
        {
            url: 'http://rss.cnn.com/rss/edition_world.rss',
            feedTitle: 'CNN_World',
            imageWidth: 100,
            imageHeight: 100
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
		SimpleFile.exists(filename)
			.then(exists => {
				if (exists === 1) {
					// File exists and is a file, attempt to read it
					SimpleFile.readJson(filename)
						.then(data => {
							const settings:RSSSettings = data;
							if (settings) {	
								for (const channel of settings.channels){
									this.addFeed(
										channel.feedTitle,
										channel.url,
										channel.imageHeight || 400,
										channel.imageWidth || 400
									)							
								}
							}
						})
						.catch(error => {
							console.error("Failed reading settings , attemt to write an example as reference (in /script/files/:", filename, error);
							this.writeJsonToFile(filename + ".example",DEFAULT_SETTINGS);
						});
				} else if (exists === 0) {
					// File doesn't exist, write real config file as example
					this.writeJsonToFile(filename,DEFAULT_SETTINGS);
					this.readSettingsFile(filename) //try again with the sample data in the settingsfile..
				} else {
					// Exists but not a file, handle accordingly (not handled in this example)
					console.error("Specified path exists but is not a file:", filename);
					this.writeJsonToFile(filename,DEFAULT_SETTINGS);
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
			console.error("Failed writing file:", CONFIG_FILE, error);
		});
	}

	/**Reinitializes the feed script, usefule to add or remove added feeds.*/
	@callable("Re-initialize feedscript, run to reset feed config")
	reInitialize() {
		super.reInitialize();
	}
	/**Adds a new feed*/
	@callable("Add feed")
	public addFeed(
	@parameter("Channel name, i.e. Latest News",false)	
	channelName: string,
	@parameter("Channel URL, i.e. http://nrk.no/nyheter/latest.rss",false)	
	channelUrl: string,
	@parameter("Specify a target image height. Only applies if the feed has group of media:image. ",false)	
	targetImageHeight?: number,
	@parameter("Specify a target image height. Only applies if the feed has group of media:image. ",false)	
	targetImageWidth?: number,
	
	){
		this.establishFeed(new Channel(
			channelName,
			channelUrl,
			this,
			targetImageHeight,
			targetImageWidth
		));	
	}
}

/**
 * My single collection. Multiple collections can be
 * added to present different RSS channels.
 */
class Channel implements feed.StaticFeed<ListItem, ListItem> {
	readonly name: string;	// Name of this feed
	readonly listType = ListItem;
	readonly itemType = ListItem;
	owner: RSS
	channelTitle = ""
	channelImageUrl = ""
	targetImageHeight:number
	targetImageWidth:number
	


	constructor(
		name: string, 
		private url: string, 
		owner: RSS, 
		targetImageHeight?:number,
		targetImageWidth?:number
		){
		this.name = name;
		this.owner = owner
		this.targetImageHeight = targetImageHeight
		this.targetImageWidth = targetImageWidth
	}

	/**
	 * Get the RSS items as a list.
	 */
	async getList(spec:feed.FeedListSpec): Promise<ListData<ListItem>> {
		
		const feed= await SimpleHTTP.newRequest(
			this.url,
			{ interpretResponse: true }
		).get<RSSRoot>();
		const items: ListItem[] = [];
		log("Status: ", this.url, feed.status)
		if (feed.status === 200) {	
			this.channelImageUrl = feed.interpreted.channel.image.url || ""
			this.channelTitle = feed.interpreted.channel.title || ""
			const itemList = feed.interpreted.channel.item;
			for (const item of itemList){
				items.push(new ListItem(item, this))
				log("Item found", item.title)
			}
		}	
		return { items: items };
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
	

	// Map the fields in the RSS data into my feed fields.
	constructor(rss: RSSItem, owner:Channel) {
		
		this.guid = rss.guid || "";
		this.title = rss.title || "";
		this.link = rss.link || "";
		this.description = rss.description || "";
		this.date = rss.pubDate || "";
		this.category = ListItem.getCategory(rss.category)
		this.channelImageUrl = owner.channelImageUrl || ""
		this.channelTitle = owner.channelTitle || ""
		
		if (rss.group){
		let media = ListItem.getBestMatchedImage(rss.group, owner.targetImageHeight, owner.targetImageWidth); 
		log("Feed contains an RSS group")
			if (media){
				this.imageUrl = media.url || "";
				this.imageTitle = media.title || "";
				this.imageCredit = media.credit ? media.credit[""] : "";
				
			} else
			this.imageUrl = this.imageTitle = this.imageCredit = ""
		} else if (rss.content) {
			log("Feed contains an RSS content")
			let media = rss.content;
			if (media){
				this.imageUrl = media.url || "";
				this.imageTitle = media.title || "";
				this.imageCredit = media.credit ? media.credit[""] : "";
			} else {
			this.imageUrl = this.imageTitle = this.imageCredit = ""
			}
		} else {
		this.imageUrl = this.imageTitle = this.imageCredit = ""
		}
	}


	/**Takes the image data from a media:group and a wanted target width and height, iterates through the content, calculates a simple "difference" metric.
	 It then returns the content with the smallest difference. Will return first image if we miss size data.*/
	 private static getBestMatchedImage(group: MediaGroup, targetWidth?: number, targetHeight?: number): MediaContent | undefined {
		let bestMatch: MediaContent | undefined;
		let firstImage: MediaContent | undefined;
		log("Target image  h and w ",targetHeight,targetWidth)
		for (const content of group.content) {
		  // Check if both height and width has a size
		  if (content.height > 0 && content.width > 0) {
			const widthDifference = Math.abs(content.width - targetWidth);
			const heightDifference = Math.abs(content.height - targetHeight);
			log("Image compare H:", content.height, "Diff",heightDifference,"W", content.width, "Diff", widthDifference, content.url)
	  
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
	guid: string;
	title: string;
	link: string;
	category?: string | string[];
	pubDate: string;
	description: string;
	group?: MediaGroup;
	content?: {
		url: string;
		credit?: {
			role: string;
			scheme: string;
			"": string;	// Element text content
		};
		title?: string;
	};
}


interface MediaGroup {
content: MediaContent[];
}

interface MediaContent {
	url: string;
	height?: number;
	width?: number;
	type?: string;
	credit?: {
		role: string;
		scheme: string;
		"": string;	// Element text content
	};
	title?: string;
}


// Structure of the root XML object of the RSS feed
interface RSSRoot {
	channel: {
		title: string;
		link: string;
		description: string;
		image:  {
			title: string;
			url: string;
			link: string;
			width?: number;
			height?: number;
			description?: string;
		}
		item: RSSItem[];
	}
}

// For the configuration file.

interface RSSChannel {
    url: string;
    feedTitle: string;
    imageWidth?: number;
    imageHeight?: number;
}

interface RSSSettings {
    channels: RSSChannel[];
}
