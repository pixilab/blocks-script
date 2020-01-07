/*
 * Basic functions working with images.
 * By default (if a relative path or plain file name is specified), files are stored under script/files.
 * You may also specify one of the follwing absolute paths:
 * /public/*	Specifies a file path under public
 * /temp/*		Specifies a file path under temp
 *
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2019 by Mike Fahl.
 */

/// <reference path = 'PIXI.d.ts' />

export interface ImageInfo {
	width: number;
	height: number;
}

export var SimpleImage: {

	/**
	 Get image file info, returning a promise resolved once done yielding an ImageInfo
	 object.
	 */
	info(imageFileName:string): Promise<ImageInfo>;

	/**
	 Make a derived image from image at srcImage, storing the resulting image at destImage.
	 No scaling or cropping is applied. The written image wil have its type determined by the
	 file extension of destImage, allowing for conversion from, e.g., PNG to JPEG.
	 The returned promise will be resolved once the image operation is complete.
	 */
	derive(srcImage: string, destImage: string): Promise<void>;

	/**
	 Make a derived image from image at srcImage, storing the resulting image at destImage.
	 Scale the image to specified size. The returned promise will be resolved once the image
	 operation is complete.
	 */
	derive(
		srcImage: string, destImage: string,
		scaleToWidth: number, scaleToHeight: number
	) : Promise<void>;

	/**
	 Make a derived image from image at srcImage, storing the resulting image at destImage.
	 First crop the specified part of the source image, then scale the result to specified size.
	 The returned promise will be resolved once the image operation is complete.
	 */
	derive(
		srcImage: string, destImage: string,
		cropLeft: number, cropTop: number, cropWidth: number, cropHeight: number,
		scaleToWidth: number, scaleToHeight: number
	) : Promise<void>;
};
