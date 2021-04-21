/*
 * Simple SQL database API for PIXILAB Blocks
 * Vaguely inspired by https://node-postgres.com/api
 *
 * Copyright (c) 2020 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
 */

/**
 * Top level object you can import to make requests.
 */
export var SimpleDB: {
	query(sql: string, options?: QueryOptions): Promise<QueryResult>;
	update(sql: string, options?: Options): Promise<number>;	// Resolves with number of rows changed
};

interface Options {
	params?: (string | number | boolean)[];	// Positional parameters for the query/update
}

export interface QueryOptions extends Options {
	batchSize?: number;	// How many rows to get at a time, at most (default is 50)
}

/**
 Result from initial query or nextBatch, once resolved.
 */
export interface QueryResult {
	data: Dictionary<any>[];		// This batch of rows
	end: boolean;					// No more results available through nextBatch()
	nextBatch(): Promise<QueryResult>;	// Get next batch of rows (which may be empty)
	close(): void;					// Ignore any subsequent results, closing this query
}

interface Dictionary<TElem> {
	[id: string]: TElem;
}


