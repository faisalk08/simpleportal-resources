"use strict";
var simpleportal = require("simpleportal"),
	Template = require('simpleportal/lib/util/template'),
	TemplateUtil=require('simpleportal/lib/template/util'),
	fs = require("fs");

/**
 * Create service file from service props
 * 
 * @param data
 */
function createServiceFile(apiservice, callback){
	var data = apiservice.exportConfig();
	
	//@TODO generate then send it back
	// check you have modelfields or model
	if( !data.modelfields || data.modelfields.length == 0 && data.model ){
//		console.log(data);
		data.modelfields = TemplateUtil.getFieldFromObject(data.model);
	}
	
	if(data && !data.primaryKeyFields){
		data.primaryKeyFields = [];
		
		// do update primaryKeyFields
		var primaryKeyFields =  data.modelfields.filter(function(modelfield){
			return modelfield.primary;
		});
		
		for(var key in primaryKeyFields)
			data.primaryKeyFields.push(primaryKeyFields[key].field);
	}
	
	var servicetemplatepath = apiservice.getServiceloader().templatedir + "/crudservice.js.tmpl" 
	if(data && data.remoteservice)
		servicetemplatepath = apiservice.getServiceloader().templatedir + "/remoteservice.js.tmpl"
	
	data.filename = data.name;
	var template = new Template({engine:'ejs', file:servicetemplatepath, data:data});
	
	template.render(function(error, jscontent){
//		find the plugin
		var installpath;
		var pluginsetting;
		if(data.servicetype == 'plugin'){
			pluginsetting = apiservice.getPluginloader().getPluginDetails(data.plugin, "webapp");
			
			if(pluginsetting){
				var servicedir;
				if(!pluginsetting.servicedir)
					servicedir = pluginsetting.installeddir + "/" + pluginsetting.servicedir[0];
				else
					servicedir = pluginsetting.installeddir + "/services";
				
				simpleportal.util.checkDirSync(servicedir);
				
				installpath = pluginsetting.installeddir + "/services/" + data.name+ ".js";
			}
		}else if(data.servicetype == 'server'){
			installpath = simpleportal.util.getServerPath("api/" + data.name+ ".js");
		}else
			installpath = apiservice.getServiceloader().systemapidir + "/" + data.name + ".js";
		
		installpath = simpleportal.util.getServerPath(installpath);
		
		if(installpath && jscontent)
			fs.writeFile(installpath, jscontent, (function(callback){
				return function(){
					callback(null, installpath);
				}
			})(callback));
		else if(!jscontent)
			callback("No jscontent after template");
		else
			callback("No install path found");
	});
	
//	simpleportal.template.render(servicetemplatepath, data, (function(callback){ return function(error, jscontent){
//		// find the plugin
//		var installpath;
//		var pluginsetting;
//		if(data.servicetype == 'plugin'){
//			pluginsetting = simpleportal.pluginloader.getPluginDetails(data.plugin, "webapp");
//			
//			if(pluginsetting){
//				var servicedir;
//				if(!pluginsetting.servicedir)
//					servicedir = pluginsetting.installeddir + "/" + pluginsetting.servicedir[0];
//				else
//					servicedir = pluginsetting.installeddir + "/services";
//				
//				simpleportal.util.checkDirSync(servicedir);
//				
//				installpath = pluginsetting.installeddir + "/services/" + data.name+ ".js";
//			}
//		}else if(data.servicetype == 'server'){
//			installpath = simpleportal.util.getServerPath("api/" + data.name+ ".js");
//		}else
//			installpath = simpleportal.serviceloader.systemapidir + "/" + data.name + ".js";
//		
//		installpath = simpleportal.util.getServerPath(installpath);
//
//		if(installpath)
//			fs.writeFile(installpath, jscontent, (function(callback){
//				return function(){
//					callback(null, installpath);
//				}
//			})(callback));
//		else
//			callback("No install path found");
//	};
//	})(callback));
}

function updateModel(apiservice, callback){
	var model = simpleportal.serviceloader[servicename].model;
	if(model){
		apiservice.model = model;
		createServiceFile(apiservice, function(error, installpath){
			if(!error)
				storeService(apiservice, {modelfields:apiservice.modelfields, servicetype:apiservice.servicetype, name:apiservice.name}, callback);
			else
				callback(error, apiservice);
		});
	}else
		callback();
}

function storeService(apiService, servicedata, callback){
	servicedata.id = apiService.getServiceloader().getService("system_apiservice").getObjectId(servicedata);
//	servicedata.id = simpleportal.serviceloader.system_apiservice.getObjectId(data);
	
	apiService.getServiceloader().getService("system_apiservice").getStorageService().add_update({id: servicedata.id}, servicedata, callback);
}

//function 	s(callback){
//	var result =[];
//	
//	var count=simpleportal.util.getModuleFunctions(simpleportal.serviceloader, false, 'exportConfig').length;
//	
//	simpleportal.util.callModuleFunction(simpleportal.serviceloader, true, 'exportConfig', function(error, data){
//		if(data && data.name){
//			storeService(data, function(error){
//				if(count-- == 0 && callback)
//					callback(error);
//			});
//		}
//	});
//}

/*
 * Exporting the Api importer service.
 */
module.exports = {
//	storeServices:storeServices,
	storeService:storeService,
	updateModel:updateModel,
	createServiceFile:createServiceFile
};