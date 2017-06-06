"use strict"
var simpleportal = require("simpleportal"),
	fs = require("fs"),
	events = require('events'),
	GDrive = require('./drive'),
	GMail = require('./mail'),
	google = require('googleapis');

var OAuth2 = google.auth.OAuth2;

var GoogleAPI = module.exports = function(options) {
	events.EventEmitter.call(this);
	var instance = this;
	
	instance.authenticated=false;
	
	options = options||{};
	
	instance._configuration=options.configuration;
	instance._preference=options.preference;
	
	if(options.onAuthenticated)
		instance.on("authenticated", options.onAuthenticated);
	
	if(options.onPreferenceChange)
		instance.on("preference.changed", options.onPreferenceChange);
	
	// iniitialize
	instance.init();
	
	return instance;
};
require("util").inherits(GoogleAPI, events.EventEmitter);

GoogleAPI.prototype.init = function(){
	var instance = this;
	
	instance.setup();
}

GoogleAPI.prototype.getGMail = function(options){
	var instance = this;

	return new GMail(options, instance);
}

GoogleAPI.prototype.getGDrive = function(options){
	var instance = this;
	
	return new GDrive(options, instance);
}

GoogleAPI.prototype.setPreference = function(preference, silent){
	var instance = this;
	
	simpleportal.util.extendJSON(instance.getPreference(), preference);
	
	if(!silent)
		instance.emit("preference.changed", instance.getPreference());
}

GoogleAPI.prototype.getPreference = function(key, defautvalue){
	var instance = this;
	
	if(key)
		return instance._preference[key]||defautvalue;
	
	return instance._preference;
}
GoogleAPI.prototype.getConfiguration = function(key, defautvalue){
	var instance = this;

	if(key)
		return instance._configuration[key]||defautvalue;
	
	return instance._configuration;
}

GoogleAPI.prototype.getOauthClient = function(){
	var instance = this;
	
	return instance._oauth2Client;
}

GoogleAPI.prototype.registerAccount = function(code, callback){
	var instance = this;
	
	if(instance.authenticated)
		callback("An account is already linked with the api, unregister account and register again.");
	else if(code){
		instance.getOauthClient().getToken(code, function(err, tokens) {
			if(!err && tokens){
				instance.getOauthClient().setCredentials(tokens);
				
				instance.authenticated = true;
				instance.emit("authenticated", instance);
				
				instance.setPreference({token:tokens});
			} else {
				console.log(err);
			
				callback(err, url);
			}
		});
	} else{
		// generate a url that asks permissions for Google+ and Google Calendar scopes
		var scopes = instance.getConfiguration("scopes") || [
			  'https://www.googleapis.com/auth/plus.me',
			  "https://mail.google.com/",
			  "https://www.googleapis.com/auth/gmail.compose",
			  "https://www.googleapis.com/auth/gmail.insert",
			  "https://www.googleapis.com/auth/gmail.modify",
			  'https://www.googleapis.com/auth/gmail.send',
			  "https://www.googleapis.com/auth/drive",
			  "https://www.googleapis.com/auth/drive.appdata",
			  "https://www.googleapis.com/auth/drive.file",
			  "https://www.googleapis.com/auth/drive.metadata",
			  "https://www.googleapis.com/auth/drive.readonly",
			  "https://www.googleapis.com/auth/drive.photos.readonly",
			  "https://www.googleapis.com/auth/drive.readonly",
			  "https://www.googleapis.com/auth/drive.scripts"
		];
		
		var url = instance.getOauthClient().generateAuthUrl({
			access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token)
			scope: scopes // If you only need one scope you can pass it as string
		});
		
		console.log(url);
		
		callback(null, url);
	}	
}

GoogleAPI.prototype.unregisterAccount = function(callback){
	var instance = this;

	instance.authenticated = false;
	instance._auth2Client = null;
	
	callback();
}

GoogleAPI.prototype.setup = function(props, callback){
	var instance = this;
	
	if(instance.getConfiguration("clientId") && instance.getConfiguration("clientSecret")){
		instance._oauth2Client = new OAuth2(
			instance.getConfiguration("clientId"),
			instance.getConfiguration("clientSecret"),
			instance.getConfiguration("apicallback")
		);
		
		if(instance.getPreference("access_token")) {
			instance.getOauthClient().setCredentials(instance.getPreference());
		
			instance.authenticated=true;
			instance.emit("authenticated", instance);
		}
	}
}