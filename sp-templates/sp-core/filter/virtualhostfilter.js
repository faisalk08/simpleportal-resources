"use strict";
/*!
 * Simpleportal default filter
 * 
 * Copyright(c) 2013-2016 Faisal(admin@simpleportaljs.com)
 * MIT Licensed
 */
var FilterService = require('simpleportal/lib/service/filterservice');

var virtualhostfilter = module.exports = new FilterService({ 
	routerid:'virtualhostfilter',
	preferencesetting:{
		virtualhost:[{
			host:'', mapping:'', defaulturi:''
		}]
	}
});

virtualhostfilter.filter = function(){
	var instance = this;

	var virtualhosts = instance.getPreference("virtualhost", []);
	
	return function(request, response, next) {
		var vhmapping;
		if(virtualhosts[request.headers.host]){
			vhmapping = virtualhosts[request.headers.host];
		}else if(virtualhosts[request.headers.host.substring(0, request.headers.host.indexOf(":"))])
			vhmapping = virtualhosts[request.headers.host.substring(0, request.headers.host.indexOf(":"))];
		
		if(vhmapping && !new RegExp(vhmapping.mapping).test(request.url) && (request.url.indexOf(".") == -1)){
			//replace host name and redirect;
			var serverPort = instance.getServerInstance().getServerPort();
			var newhosturl = vhmapping.defaulturi || vhmapping.mapping.split("|")[0];
			
			response.redirect(newhosturl, 301, request);
		} else if(next)
			next();
	};
};