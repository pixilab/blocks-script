/*	Simple SQL database API for PIXILAB Blocks
	Vaguely inspired by https://node-postgres.com/api

	For this API to work, you must specify database settings in the Blocks configuration file,
	like this:

	databases:
	  simple:
	    url: jdbc:postgresql:database-name
	    options:
	      user: db-user-name
	      password: the-password

	This API is based on the Java JDBC API. Blocks includes a JDBC Postgres driver. Learn more about
	Postgres' JDBC options at https://jdbc.postgresql.org/documentation/head/connect.html

	To use onother database, you need to add and activate its JDBC driver. This is done by adding
	two more options to the configuration, like this:

	databases:
	  simple:
	    driverJar: /full/path/to/mariadb-java-client-3.4.1.jar
	    driverClass: org.mariadb.jdbc.Driver
	    url: jdbc:mariadb://server/database
	    options:
	      user: db-user-name
	      password: the-password

	Here the driverJar option must specify the full path to the JDBC driver file (so set the
	path and file name to where the file is located and named on your server). Additionally,
	the driverClass must specify the class name identifying the JDBC driver inside the driver
	file (here using MariaDB, which also works for MySQL). See the driver's documentation
	for any additional options you may need to add under "options".

	Copyright (c) 2024 PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
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


