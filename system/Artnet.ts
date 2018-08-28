/*
 * Artnet (DMX-512) subsystem with lighting fixtures and their channels.
 * Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 * Created 2018 by Mike Fahl.
 */

/// <reference path = 'PIXI.d.ts' />

export var Artnet: { [fixtureName: string]: Fixture; };

export interface Fixture { [channelName: string]: AnalogChannel|RangeChannel; }

/**
 * Common channel stuff, regardless of channel type.
 */
export interface Channel {
	isOfTypeName(typeName: string): Channel|null;	// Check subtype by name
	name: string;		// Read-only channel name
	value: number;		// Get/set channel value. When set, uses fixture's default fade rate
	fadeTo(value: number, timeInSeconds: number): void;	// Fade to value over time
}

/**
 * A purely analog channel that can be set or faded. Most analog channels are normalized
 * to 0...1, as specified in the fixture description file, regardless of the
 * channel's internal resolution (e.g., 8 or 16 bits).
 */
export interface AnalogChannel extends Channel {
	isOfTypeName(typeName: string): AnalogChannel|null;
	maxValue: number;	// Read-only maximum of "value" (1 indicates normalized channel).
}

/**
 * A channel divided into multiple ranges, each occupying a subset of the possible values
 * in the underlying DMX channel. When setting the state, only available range names
 * can be used (existing in the "ranges" array). Setting/fading my value has no effect if
 * the current state is a discrete range. The value, if applicable, is always normalized
 * to 0...1.
 */
export interface RangeChannel extends Channel {
	isOfTypeName(typeName: string): RangeChannel|null;
	state: string;		// Name of currently selected range
	ranges: Range[];	// Read-only list of ranges
}

/**
 * Read-only descriptor of each range governed by a RangeChannel.
 */
export interface Range {
	name: string;		// Name of this range
	first: number;		// First channel value (0...255)
	last: number;		// Last channel value (0...255)
	discrete: boolean;	// This range takes no additional numeric value
}