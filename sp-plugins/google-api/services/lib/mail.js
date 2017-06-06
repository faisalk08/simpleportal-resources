"use strict"
var simpleportal = require("simpleportal"),
	fs = require("fs"),
	google = require('googleapis');

var OAuth2 = google.auth.OAuth2;

var GoogleMail = module.exports = function(options, googleApi) {
	var instance = this;
	
	this.options = options||{};
	
	this._googleApi=googleApi;
	
	return instance;
};

GoogleMail.prototype.getGMail = function(){
	var instance = this;

	if(instance._googleApi && instance._googleApi.authenticated)
		return google.gmail({version:'v1', auth:instance.getOauthClient()});
	else 
		return null;
}

GoogleMail.prototype.getOauthClient = function(){
	var instance = this;
	
	return instance._googleApi.getOauthClient();
}

GoogleMail.prototype.sendEmail = function(options, callback){
	var instance = this;
	
	var gmail = instance.getGMail();
	
	if(!gmail){
		callback("Google api is not configured.");
	} else {
		if(options && options.to == "me" && instance.options.adminEmail)
			options.to = instance.options.adminEmail;
		
		var mailoptions = simpleportal.util.extendJSON({
			from: instance.options.adminEmail||'simpleportaljs@gmail.com',
			fromName:instance.options.fromName||'Simpleportaljs-server'
		}, options);
		
		var email_lines = [];

	    email_lines.push("From: \""+mailoptions.subject+"\" <"+mailoptions.from+">");
	    email_lines.push("To: "+mailoptions.to);
	    email_lines.push('Content-type: text/html;charset=iso-8859-1');
	    email_lines.push('Date: '+new Date());
	    email_lines.push('MIME-Version: 1.0');
	    email_lines.push("Subject: "+mailoptions.subject);
	    email_lines.push("Message-ID: <"+mailoptions.from+">");
	    email_lines.push("\r\n" + mailoptions.text.trim());
	    
	    var email = email_lines.join("\r\n").trim();
	    
	    var base64EncodedEmail = new Buffer(email).toString('base64');
	    base64EncodedEmail = base64EncodedEmail.replace(/\+/g, '-').replace(/\//g, '_') 
	    
		gmail.users.messages.send({
			userId:'me',
			resource:{
				raw:base64EncodedEmail	
			}
		}, function(error, data){
			if(error)
				console.log(error);
			
			if(callback)
				callback();
		});
	}
};