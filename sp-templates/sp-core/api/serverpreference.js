"use strict";

var simpleportal = require("simpleportal"),
	fs = require("fs");

/**
 * API for serverpreference service
 * @class 
 */
var serverpreferenceService = new simpleportal.Service.CRUDService({
	name:'serverpreference',
	modify:true, 
	collection:'serverpreference', 
	userrole:['superadmin', 'admin', 'user'],
	defaultsort:{sort:[['key', -1]]}, primaryKeyFields:['key'],
	model: {
		key:'',
		title:'',
		preference:'',
		status:'default'
	},
	validation:{
		key:'required',
		preference:'required'
	},configuration:{
		modelsettings:{
			key:{
				url:'key?type=resource', displayoptions:{datadisplay:"file"}
			},
			preference:{
				fieldplugin:'editarea', displayoptions:{
					syntax_selection_allow: 'html, css, js'
				}
			}
		}
	}
});

serverpreferenceService.get('/preference', function(request, response, callback){
	var key = request.query.key;
	if(key && key.indexOf("configuration.ext.json") == 0){
		simpleportal.util.readJSONFile(simpleportal.util.getServerPath("configuration.ext.json"), function(error, jsondata){
			callback(error, jsondata);
		});
	}else if(key && key.indexOf("resources-") == 0){
		var resourcepath = __dirname + "/../" + key.replace("resources-", "resources/");
		
		if(key.indexOf("resources-/plugin/") == 0){
			var pluginpath = key.replace("resources-/plugin/", "");
			var pluginid = pluginpath.substring(0, pluginpath.indexOf("/"));
			
			var pluginsetting = serverpreferenceService.getPluginloader().getRouter(pluginid,"all");
			if(pluginsetting)
				resourcepath = simpleportal.util.appendFilePath(pluginsetting.installeddir, pluginpath.substring(pluginpath.indexOf("/")));
			else
				resourcepath =null;
			
//			resourcepath = simpleportal.util.getServerPath(serverpreferenceService.getPluginloader().plugindir + key.replace("resources-/plugin/", "/"));
		} else if(key.indexOf("resources-/templates/") == 0)
			resourcepath = simpleportal.util.getServerPath(serverpreferenceService.getPluginloader().templatedir + key.replace("resources-/templates/", "/../"));
		
		if(!resourcepath)
			callback("Not a valid resource url");
		else if(key.lastIndexOf(".json") == key.length-5)
			simpleportal.util.readJSONFile(resourcepath, function(error, jsondata){
				callback(error, jsondata);
			});
		else
			fs.readFile(resourcepath, function(error, data){
				callback(error, data+'');
			});
	}
	else
		callback("Not a valid key");
});

serverpreferenceService.get('/key', function(request, response, callback){
	// can read all templates
	var keyresults = [
          {display:"Server configuration", file:"configuration.ext.json", resourcekey:"configuration.ext.json",  id:"configuration.ext.json"}
	];
	
	if(request.query.type == "resource"){
		simpleportal.util.getResources([__dirname + "/../resources/templates/plugin"], {
			root:__dirname + "/../resources/templates", 
			rootpath:"resources-/templates", 
			extension:"json"
		}, function(error, subresults){
			if(subresults && subresults.length > 0)
				keyresults = keyresults.concat(subresults);
			
//			if(lookupcount++ == resourcelookups.length -1)
				callback(null, keyresults);
		}, []);
		//keylist.push("resources/templates/plugin/webapp/backbone/plugin.json");	
	} else if(request.query.type == "server"){
		callback(null, require(__dirname + "./../lib/editor/serverconfig.json"));
		//keylist.push("resources/templates/plugin/webapp/backbone/plugin.json");	
	}else
		callback(null, keyresults);
});

serverpreferenceService.getByKey = function(key, callback){
	serverpreferenceService.getStorageService().findOne({key:key}, callback);
};

serverpreferenceService.removeByKey = function(key, callback){
	if(key)
		serverpreferenceService.getStorageService().remove({key:key}, callback);
	else
		callback("No key defined.")
};

/**
 * To register the server preference inside the server db
 *  preference - object to store inside the preference table	
 *  	- key
 *      - title
 *      - preference
 *      
 * callback callback function when finished
 */
serverpreferenceService.registerPreference = function(preference, callback){
	if(preference && preference.key && preference.hasOwnProperty("preference")){
		var serverpreference = simpleportal.util.getObject({body:preference}, serverpreferenceService);
		
		var id = serverpreferenceService.getObjectId(serverpreference);
		serverpreference.id=id;
		
		serverpreferenceService.getStorageService().add_update({id:id}, serverpreference, function(error, savedpreference){
			if(callback)
				callback();	
		});
	}else if(callback)
		callback();
};

var updateDefaultPreference = function(){
	var serverpreference = simpleportal.util.readJSONFileSync(__dirname + "/../resources/templates/serverpreference.json");
	
	var serverpreferncearray = [];
	for(var key in serverpreference){
		var preference_ = {key:key, preference:serverpreference[key], status:'default'};
		serverpreferncearray.push(preference_);
		
		serverpreferenceService.registerPreference(preference_, function(error, saved_preference_){
			if(error)
				pluginService.getLogger().error("serverpreference:updateDefaultPreference", error);
		});
	}
};

/**
 * Initialize callback for updating the defualt preference,
 */
serverpreferenceService.on("init", function(){
	serverpreferenceService.getServiceloader().on("server.ready", updateDefaultPreference);
});

serverpreferenceService.on("update", updateServerConfiguration);

function updateServerConfiguration(serverconfig){
	pluginService.getLogger().info("serverpreference:updateServerConfiguration", "Updated server configuration")
	console.log(serverconfig);
}

/**
 * Export serverpreference service
 */
module.exports = serverpreferenceService;