"use strict";
var simpleportal = require('simpleportal'),
	logger = require("simpleportal").logger;

/*
 * Simpleportal webserver
 */
var app = new simpleportal.Server();

/*
 * Creating app based on simpleportal server 
 */
logger.getInstance().debug('Simpleportal-webserver', 'Initializing the simpleportal Server');
app.createServer();
