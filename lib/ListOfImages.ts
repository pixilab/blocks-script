/*	Manage a list of images, exposed as a dynamic property list. The images may originate frmo a specific spot,
	or be provided "manually" (by calling

	Copyright (c) 2022 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */



import {property} from "../system_lib/Metadata";
import {BaseSpot, DisplaySpot, MobileSpot, Spot} from "../system/Spot";
import {IndexedPropertyPersistor} from "../lib/IndexedPropertyPersistor";
import {IndexedProperty} from "../system_lib/ScriptBase";
import {Script} from "../system_lib/Script";
import {SimpleImage} from "../system/SimpleImage";
import {SimpleFile} from "../system/SimpleFile";


/**
 * Manage a list of images, exposed as a dynamic property list.
 * Images can originate from an ImageProvider at spotPath, and/or may be
 * spoon-fed by calling acceptImage from outside, passing it an image.
 */
export class ListOfImages {
	static readonly kDefaultMaxImgCount = 10;	// Default number of images to keep, if not specified
	static readonly kMaxImgSize = 1080;
	// Location where images are stored
	static readonly kPublicPath = "/public/ListOfImages/";	// + imageFilesSubDir/image.jpeg

	// Location under script/files/ where JSON lists are persisted, by list name
	static readonly kPersistenceDir = "ListOfImages";

	private readonly publicPath: string;	// Where I store my images publicly accessible
	private persistor: IndexedPropertyPersistor<ImageListItem>;	// Once obtained through getIndexedProperty
	private list: IndexedProperty<ImageListItem>;
	private readonly options: ImageListOptions;

	constructor(
		owner: Script,
		imageFilesSubDir: string,	// Where images are stored, under /public/ListOfImages/
		options?: ImageListOptions
	) {
		this.options = options || {};
		this.publicPath = ListOfImages.kPublicPath + imageFilesSubDir + '/';	// Ready to append filename to
		this.persistor = new IndexedPropertyPersistor(owner, ListOfImages.kPersistenceDir);
		// Call getIndexedProperty on me to create and obtain the indexed property
	}

	/**
	 * Create indexed property and load its data if exists in persistent store. This is normally
	 * called right after my ctor to obtain the list.
	 */
	getIndexedProperty(indexedPropertyName: string): IndexedProperty<ImageListItem> {
		const indexedProperty = this.persistor.getOrMake(indexedPropertyName, ImageListItem);
		this.list = indexedProperty;
		this.subscribeToImages();
		return indexedProperty;
	}

	/**
	 * Clear out ALL photos in the stream, optionally also deleting the image files.
	 */
	clear(deletePhotosToo: boolean) {
		const numPhotos = this.list.length;
		if (numPhotos) {
			if (deletePhotosToo) {
				for (let ix = 0; ix < numPhotos; ++ix)
					SimpleFile.delete(this.list[ix].path);
			}
			this.list.remove(0, numPhotos);
		}
		this.persistor.clear();
	}

	/**
	 * Hook up to any Spot at spotPath to obtain images from a Camera block running on it.
	 */
	private subscribeToImages() {
		if (this.options.spotPath) {
			const maybeSpot = Spot[this.options.spotPath];
			if (maybeSpot) {
				const imageProvider: ImageProvider =
					maybeSpot.isOfTypeName("DisplaySpot") as DisplaySpot ||
					maybeSpot.isOfTypeName("MobileSpot") as MobileSpot;
				if (imageProvider) {
					imageProvider.subscribe('image', (sender, message) => {
						log("acceptImage", message.filePath);
						this.acceptImage(message.filePath);
					});

					// If subscribed-to Spot dies, attempt to re-subscribe (happens if reconfigured while running)
					imageProvider.subscribe('finish', () => this.subscribeToImages());
					return;	// Successful exit
				}
			}
			console.error("No spot found at path", this.options.spotPath);
		}
	}

	/**
	 * Move the image to a accessible (under /public) location and add it to our list.
	 * Also scale the image down if it's larger than kMaxImgSideLength on any side.
	 * The promise returned will be resolved once the image is available at its
	 * public path, with the value being that path.
	 */
	public async acceptImage(filePath: string): Promise<string> {
		log("acceptImage 2", filePath);
		// Scale to this width or height (whichever is longest)
		const maxImgSideLength = this.options.maxImageSideLength || ListOfImages.kMaxImgSize;
		const publicImageLocation = this.publicPath + fileName(filePath);
		const info = await SimpleImage.info(filePath);
		const scalefactor = Math.min(maxImgSideLength / info.width, maxImgSideLength / info.height);
		if (scalefactor < 1) { // Scale and put result in publicImageLocation
			await SimpleImage.derive(filePath, publicImageLocation, info.width * scalefactor, info.height * scalefactor);
			await SimpleFile.delete(filePath);	// Discard original file now that it's been scaled
		} else
			await SimpleFile.move(filePath, publicImageLocation, true);	// File is small to begin with - just move it
		await this.addPublicImage(publicImageLocation);
		return Promise.resolve(publicImageLocation);
	}

	/**
	 * Insert image at publicImageLocation as the first image in the list.
	 * Remove olders image(s) if we have too many. Called through acceptImage above
	 * after processing the image and moving it to a location under /public,
	 * but may also be called directly for images already processed
	 * and stored at a suitable location under /public.
	 */
	public addPublicImage(publicImageLocation: string) {
		this.list.insert(0, new ImageListItem(publicImageLocation));
		const maxImageCount = this.options.maxImageCount || ListOfImages.kDefaultMaxImgCount;
		const excess = this.list.length - maxImageCount;
		if (excess > 0) {	// Remove any trailing images if we have too many
			// Remove corresponding image(s) frmo disk
			for (let removeIx = 0; removeIx < excess; ++removeIx)
				SimpleFile.delete(this.list[maxImageCount + removeIx].path);
			// Then remove those excessive list items
			this.list.remove(maxImageCount, excess);
		}
		log('Persisting image list');
		return this.persistor.persist(); // Write to disk, to resurrect on server restart
	}

	/**
	 * Image at photoPath is no longer desired in our photoStream. Get rid of it.
	 */
	removeImage(photoPath: string) {
		const numPhotosInStream = this.list.length;
		// Crummy linear search OK here given reasonable kMaxPdisahotoCount
		for (let ix = 0; ix < numPhotosInStream; ++ix) {
			if (this.list[ix].path === photoPath) {
				this.list.remove(ix, 1);
				this.persistor.persist();
				break;
			}
		}
	}

	/**
	 * Replaces the old path with the new one and persists the list
	 * @param oldPhotoPath photo path to look for in the list
	 * @param newPhotoPath replacement path
	 */
	replacePhoto(oldPhotoPath: string, newPhotoPath: string){
		const numPhotosInStream = this.list.length;
		// Crummy linear search OK here given reasonable kMaxPdisahotoCount
		for (let ix = 0; ix < numPhotosInStream; ++ix) {
			if (this.list[ix].path === oldPhotoPath) {
				this.list[ix].path = newPhotoPath;
				this.persistor.persist();
				break;
			}
		}
	}
}


/**
 * Items provided as indexed property elements.
 */
export class ImageListItem {
	private mPath: string; // Path where image can be accessed

	constructor(path: string) {
		this.mPath = path;
	}

	/**
	 * Factory function making a real ImageListItem from a (possibly) degenerate
	 * source loaded from JSON file. Implements the Deserializor interface
	 * using a static function, which is somewhat unusual.
	 */
	static fromDeserialized(source: ImageListItem): ImageListItem {
		return new ImageListItem(source.mPath);
	}

	@property('Path to picture on the server, usable from a Media URL block', true)
	get path(): string {
		return this.mPath;
	}
	set path(newPath: string) {
		this.mPath = newPath;
	}
}


/**
 * What we need to know about our image source (implemented by DisplaySpot and MobileSpot,
 * but TS compiler seemed to need a little extra hint here to accept this type intersection.
 */
interface ImageProvider {
	subscribe(event: 'image', listener: (sender: BaseSpot, message: {
		readonly filePath: string,	// Path to file just received (typically "/temp/xxx/xxx.jpeg")
		readonly rollName: string	// Camera Block's assigned "roll name"
	})=>void): void;

	subscribe(event: 'finish', listener: (sender: BaseSpot)=>void): void;
}

export interface ImageListOptions {
	// Keep at most this many images (defaults to ListOfImages.kDefaultMaxImgCount)
	readonly maxImageCount?: number;
	// Scale images larger than this on their longest side (defaults to ListOfImages.kMaxImgSize)
	readonly maxImageSideLength?: number;
	// Automatically obtain images from this Spot, if specified
	readonly spotPath?: string;
}

/**
 * Get the leaf name of path. I.e., the text following the last /.
 */
function fileName(path: string) {
	const whereSlash = path.lastIndexOf('/');
	return path.substring(whereSlash + 1);
}

/**
 Log messages, allowing my logging to be easily disabled in one place.
 */
const DEBUG = false;
function log(...messages: any[]) {
	if (DEBUG)	// Set to false to disable my logging
		console.info(messages);
}

