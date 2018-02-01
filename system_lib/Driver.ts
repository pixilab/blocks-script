/*
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2018 by Mike Fahl.
 */

/**
 Ultimate base class for all script-based drivers.
 */
export class Driver<facadeType> {
	private __scriptFacade: facadeType;	// Made available for firing events

	constructor(scriptFacade: facadeType) {
		this.__scriptFacade = scriptFacade;
	}
}
