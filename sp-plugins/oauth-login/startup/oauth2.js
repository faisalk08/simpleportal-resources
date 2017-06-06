"use strict";

var StartupService = require('simpleportal/lib/service/startupservice'),
	oauthserver = require('oauth2-server'),
	util = require("simpleportal/lib/util");

var oauth2Service = module.exports = new StartupService({
	routerid:"oauth2server"
});

/**
 * Overriding start method to activate the profile base don the passport also various 
 * 
 * @method  start
 * @param 
 */
oauth2Service.start = function(appInstance, callback){
	var oauth = oauthserver({
		model: {}, // See below for specification 
		grants: ['password'],
		debug: true
	});
	
	oauth2Service.getServerInstance().server.use('/oauth2/token', oauth.grant());
	
	oauth2Service.getServerInstance().server.use('/oauth2check', oauth.authorise(), function (req, res) {
		res.send('Secret area');
	});
	
	oauth2Service.getServerInstance().server.use('/oauth2check', oauth.errorHandler());
	
	callback();
};