/*
Basic functions for sending email, with optional enclosure(s).

Assumes mail options are specified in Blocks' configuration file, e.g., like this:

mail:
  username: info@pixilab.se
  password: S3CRET_P4SSWORD
  sender: info@pixilab.se		# Defaults to username if not specified
  smtp.auth: true
  smtp.starttls.enable: true
  smtp.host: g8qp-rh7b.accessdomain.com
  smtp.port: 587
  smtp.ssl.trust: g8qp-rh7b.accessdomain.com

You must specify EITHER the relevant smtp OR ipap options, as documented here
http://connector.sourceforge.net/doc-files/Properties.html
Note that the "mail."-prefix is implied in each configuration option under "mail"
in the Blocks' cofiguraiton file, and should not be included

Copyright (c) PIXILAB Technologies AB, Sweden (http://pixilab.se). All Rights Reserved.
Created 2019 by Mike Fahl.
 */

/// <reference path = 'PIXI.d.ts' />

export var SimpleMail: {
	/**
	 * Send email with specified subject and nody to destEmailAddr.
	 * The body is sent as HTML, so you can use simple HTML constructs
	 * such as <h1> and <br>
	 *
	 * Takes an optional "enclose" parameter, allowing files to be enclosed
	 * with the email. This can be either a single server file, or an array of
	 * paths to enclose multiple files. By default (if a relative path or plain
	 * file name is specified), files are expected to reside under script/files.
	 * You may also specify one of the follwing absolute paths:
	 * /public/*	Specifies a file path under public
	 * /temp/*		Specifies a file path under temp
	 *
	 * Returns a promise that will be resolved once sent, or
	 * rejected with any send error.
	 */
	send(destEmailAddr: string, subject: string, body: string, enclose?: string|string[]): Promise<void>;
};
