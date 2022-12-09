/*	Simple SQL database API for PIXILAB Blocks
	Vaguely inspired by https://node-postgres.com/api

	For this API to work, you must specify database settings in the Blocks configuration file,
	like this:

	databases:
	  postgres:
	    url: jdbc:postgresql:database-name
	    options:
	      user: db-user-name
	      password: the-password

	This API is based on the Java JDBC API. Blocks includes a JDBC Postgres driver. Drivers for other
	databases can be added by including those on the Java library path. Learn more about the Postgres
	JDBC options at https://jdbc.postgresql.org/documentation/head/connect.html

	Copyright (c) 2020 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
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


