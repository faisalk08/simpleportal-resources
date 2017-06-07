"use strict";
/*!
 * Simpleportal default filter
 * 
 * Copyright(c) 2013-2016 Faisal(admin@simpleportaljs.com)
 * MIT Licensed
 */
var FilterService = require('simpleportal/lib/service/filterservice');

var webappfilter = module.exports = new FilterService({ 
	routerid:'webappfilter'
});

webappfilter.filter = function(){
	var instance = this;
	
	var webappuriregxp = instance.getPluginloader().getValue("webappuriregxp");
	var homeuri = instance.getConfiguration("homeuri", "/");
	var termsofserviceuri = instance.getServerInstance().getConfiguration("termsofserviceuri", "/terms-of-service");

	return function(request, response, next) {
		if(webappuriregxp.test(request.url) && !/.js|.css|.png|img|images|templates|api|profile|help.html/.test(request.url)){
			var webappurl = request.url.substring(1);
			
			if(webappurl.indexOf("/") != -1)
				webappurl = webappurl.substring(0, webappurl.indexOf("/"));
			
			var userprofile = request.getUserprofile();
			
			var webapp = instance.getPluginloader().getRouter(webappurl.replace(/\//g, ''), "webapp");
			
			if(webapp){
				if(webapp.hostnames) {
					webapp.hosturi = new RegExp(webapp.hostnames.join("|").replace(".", "\."));
				}
				request.webappsetting = webapp;
				
				if(!instance.getPluginloader().isPluginActive(webapp) || (webapp.missingresources &&  webapp.missingresources.length > 0)) {
					if(webapp.missingresources && request.url.indexOf("resources") == -1) // check if the plugin is not active and has resources to install
						instance.getServiceloader().getService('system_user').hasPermission(request, webappurl, function(error){
							response.header("Cache-Control", "no-cache");
							
							var resourceinstalleruri = homeuri;
							if(!error) {
								resourceinstalleruri = "/sp-pluginmanager/#pluginmanager/resources/"+webapp.id;
							}
							
							response.redirect(resourceinstalleruri, 302, request);
						});
					else
						next();
				} else if(webapp.hostnames && !webapp.hosturi.test(request.headers.host)){
					response.header("Cache-Control", "no-cache");
					
					//replace host name and redirect;
					var serverPort = instance.getServerInstance().getServerPort();
					var newhosturl = "http" + (request.socket.encrypted ? "s" : "") + "://" + webapp.hostnames[0] + (serverPort ? ":" + serverPort : "") + request.url;
					
					response.redirect(newhosturl, 301, request);
				}else
					instance.getServiceloader().getService('system_user').hasPermission(request, webappurl, function(error){
						if(error){
							var redirecturl;
							
			        		if(error && error.redirectUrl)
			        			redirecturl = error.redirectUrl;
			        		else if(error && error.loginRequired)
			        			redirecturl = instance.getServerInstance().getConfiguration("loginuri");
			        		else if(userprofile)
			        			redirecturl = instance.getServiceloader().getService("system_user").getUserHome(userprofile, homeuri);
//				        		else if(!redirecturl)
			        			
			        		if(redirecturl){
			        			response.header("Cache-Control", "no-cache");
				    			response.redirect(redirecturl, 302, request);
			        		}else {
				    			response.send(200, {}, error);
			        		}
						}else if(userprofile && !userprofile.termsofServiceAccepted) {
							response.header("Cache-Control", "no-cache");
							response.redirect(termsofserviceuri, 302, request);
						} else
			        		next();
				});
			} else if(next)
				next();
		}else if(next)
			next();
	};
};