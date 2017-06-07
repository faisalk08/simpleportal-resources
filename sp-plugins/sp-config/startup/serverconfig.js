"use strict";

var simpleportal = require('simpleportal'),
	DbUtil = require('simpleportal/lib/util/db'),
	util = require('simpleportal/lib/util'),
	JSONEditor=require('simpleportal/lib/editor').JSONEditor,
	TemplateUtils = require('simpleportal/lib/template/util'),
	StartupService = require('simpleportal/lib/service/startupservice');

var serverconfigService = module.exports = new StartupService({
	routerid : 'serverconfig',
	uri : '/serverconfig'
});
serverconfigService.start = function(serverInstance, callback){
	var instance = this;
	
	var uri = instance.getConfiguration("webappuri") + "/" + instance.routerid;
	
	var serverconfig = require(simpleportal.getRootdir() + "/server/" + instance.routerid + ".json");
	
	var editoroptions = util.extendJSON({
		fields:[]
	}, serverconfig, {
		url:uri,
		name:instance.routerid, uri:uri,
		form:'tabview',
		root:__dirname + "/..",
		ext_jsonfile: util.getServerPath('configuration.ext.json'),// simpleportal.configuration.extention_file,
		title: instance.getServerInstance().getConfiguration('title'),
		openurl:true
	});
	
	var jsoneditor = new JSONEditor(editoroptions, instance.getServerInstance().getConfiguration());
	
	var themes = instance.getContext("pluginloader").getPlugins('theme');
	var themes_= [];
	themes.forEach(function(themesettings){
		themes_.push({id : themesettings.id, text : themesettings.title});
	});
	
	if(themes_ && themes_.length > 0)
		editoroptions.fields.push(
            {
            	html:{
            		caption:'Default theme'
            	}, 
            	field: 'resources__defaulttheme', type:'list', options:{items:themes_}
            }
		);
	
	/*
	 * Configuration editor for filter
	 */
	var filters = instance.getContext("filterloader").getRouters();
	
	for(var findex in filters){
		var filterprops = filters[findex];
		
		var filterExtendedfields = TemplateUtils.getFieldFromObject(filterprops.getPreference(), "preference__filter__" + filterprops.routerid + "__");
		for(var fieldIndex in filterExtendedfields){
			var filterExtendedfield = filterExtendedfields[fieldIndex];
			if(fieldIndex == 0)
				filterExtendedfield.html.category = 'Filter Configuration for - ' + filterprops.routerid;
			
			if(filterExtendedfield.multiple &&  filterExtendedfield.dataType == 'object'){
				jsoneditor.addJSONDefaults(filterExtendedfield.field, filterExtendedfield.defaultvalue[0]);
				
				filterExtendedfield.defaultvalue = filterExtendedfield.defaultvalue[0];
				editoroptions.fields.push(
		            { html:{caption: 'New ' + (filterExtendedfield.html.caption||filterExtendedfield.field)}, field: filterExtendedfield.field + '__new', type:'new', parentfield:filterExtendedfield.field, objecttype:'object'}
				);
			} else if(filterExtendedfield.multiple &&  filterExtendedfield.dataType == 'string'){
				jsoneditor.addJSONDefaults(filterExtendedfield.field, {});
				
				editoroptions.fields.push(
		            { html:{caption: 'New ' + (filterExtendedfield.html.caption||filterExtendedfield.field)}, field: filterExtendedfield.field + '__new', type:'new', parentfield:filterExtendedfield.field, objecttype:'string'}
				);
			}
			editoroptions.fields.push(filterExtendedfield);
		}
	}
	
	/*
	 * Configuration editor for filter
	 */
	var startups = instance.getContext("startuploader").getRouters();
	
	for(var findex in startups){
		var startupprops = startups[findex];
		
		if(!startupprops.getConfiguration("plugin")){
			var startupExtendedfields = TemplateUtils.getFieldFromObject(startupprops.getPreferenceSetting(), "preference__startup__" + startupprops.routerid + "__");
			
			for(var fieldIndex in startupExtendedfields){
				var startupExtendedfield = startupExtendedfields[fieldIndex];
				if(fieldIndex == 0)
					startupExtendedfield.html.category = 'Startup Configuration for - ' + startupprops.routerid;
				
				if(startupExtendedfield.multiple &&  startupExtendedfield.dataType == 'object'){
					jsoneditor.addJSONDefaults(startupExtendedfield.field, startupExtendedfield.defaultvalue[0]);
					
					startupExtendedfield.defaultvalue = startupExtendedfield.defaultvalue[0];
					editoroptions.fields.push(
			            { html:{caption: 'New ' + (startupExtendedfield.html.caption||startupExtendedfield.field)}, field: startupExtendedfield.field + '__new', type:'new', parentfield:startupExtendedfield.field, objecttype:'object'}
					);
				} else if(startupExtendedfield.multiple &&  startupExtendedfield.dataType == 'string'){
					jsoneditor.addJSONDefaults(startupExtendedfield.field, {});
					
					editoroptions.fields.push(
			            { html:{caption: 'New ' + (startupExtendedfield.html.caption||startupExtendedfield.field)}, field: startupExtendedfield.field + '__new', type:'new', parentfield:startupExtendedfield.field, objecttype:'string'}
					);
				}
				editoroptions.fields.push(startupExtendedfield);
			}
		}
	}
	
	/* Configuration editor for webapp */
	var uiplugins = instance.getContext("pluginloader").getPlugins('uiplugin');
	for(var findex in uiplugins){
		var uipluginprops = uiplugins[findex];
		
		var uipluginExtendedfields = TemplateUtils.getFieldFromObject(instance.getContext("pluginloader").getPreferenceSetting(uipluginprops), "preference__plugin__" + uipluginprops.id + "__");
		for(var fieldIndex in uipluginExtendedfields){
			var uipluginExtendedfield = uipluginExtendedfields[fieldIndex];
			if(fieldIndex == 0)
				uipluginExtendedfield.html.category = 'Plugin (uiplugin) preference for - ' + uipluginprops.title;
			
			editoroptions.fields.push(uipluginExtendedfield);
		}
	}
	
	/* Configuration editor for theme */
	var themeplugins = instance.getContext("pluginloader").getPlugins('theme');
	for(var findex in themeplugins){
		var themeprops = themeplugins[findex];
		
		var themeExtendedfields = TemplateUtils.getFieldFromObject(instance.getContext("pluginloader").getPreferenceSetting(themeprops), "preference__plugin__" + themeprops.id + "__");
		for(var fieldIndex in themeExtendedfields){
			var themeExtendedfield = themeExtendedfields[fieldIndex];
			if(fieldIndex == 0)
				themeExtendedfield.html.category = 'Plugin (theme) preference for - ' + themeprops.title;
			
			editoroptions.fields.push(themeExtendedfield);
		}
	}
	
	/* Configuration editor for webapp */
	var webapps = instance.getContext("pluginloader").getPlugins('webapp');
	
	if(!jsoneditor.defaultjsonobject.preference)
		jsoneditor.defaultjsonobject.preference = {};
	
	if(!jsoneditor.defaultjsonobject.preference.plugin)
		jsoneditor.defaultjsonobject.preference.plugin = {};
	
	for(var findex in webapps){
		var webappprops = webapps[findex];
		
		var configobject = {preference:{plugin:{}}};
		configobject.preference.plugin[webappprops.id] = instance.getContext("pluginloader").getPreference(webappprops);
		
//		console.log(JSON.stringify(instance.getContext("pluginloader").getPreference(webappprops)))
		jsoneditor.updateRecord(configobject);
		
//		console.log(JSON.stringify(configobject));
//		console.log(webappprops.id)
		
		var webappExtendedfields = TemplateUtils.getFieldFromObject(instance.getContext("pluginloader").getPreferenceSetting(webappprops), "preference__plugin__" + webappprops.id + "__");
		for(var fieldIndex in webappExtendedfields){
			var webappExtendedfield = webappExtendedfields[fieldIndex];
			if(fieldIndex == 0)
				webappExtendedfield.html.category = 'Plugin preference for - ' + webappprops.title;
			
			if(webappExtendedfield.multiple &&  webappExtendedfield.dataType == 'object'){
				jsoneditor.addJSONDefaults(webappExtendedfield.field, webappExtendedfield.defaultvalue[0]);
//				console.log(webappExtendedfield);
				webappExtendedfield.defaultvalue = webappExtendedfield.defaultvalue;
				editoroptions.fields.push(
		            { html:{caption: 'New ' + (webappExtendedfield.html.caption||webappExtendedfield.field)}, field: webappExtendedfield.field + '__new', type:'new', parentfield:webappExtendedfield.field, objecttype:'object'}
				);
			} else if(webappExtendedfield.multiple &&  webappExtendedfield.dataType == 'string'){
				jsoneditor.addJSONDefaults(webappExtendedfield.field, {});
				
//				jsoneditor.updateRecord(configobject);
//				var jsonchanges_unflattened = simpleportalUtil.unFlattenJSON(webappExtendedfield.defaultValue, '__');
				
				editoroptions.fields.push(
		            { html:{caption: 'New ' + (webappExtendedfield.html.caption||webappExtendedfield.field)}, field: webappExtendedfield.field + '__new', type:'new', parentfield:webappExtendedfield.field, objecttype:'string'}
				);
			}
			editoroptions.fields.push(webappExtendedfield);
		}
	}
	
	/*@TODO activate later
	var servicefields = {};
	simpleportal.serviceloader.services.service['GET /']({user:{role:'superadmin'}}, {}, function(error, services){
		if(instance.configuration&&!instance.configuration.services)
			instance.configuration.services={};
		
		var services_ = [];
		for(sindex in services){
			var serviceprops = services[sindex];
			
			services_.push({id:serviceprops.name, text:serviceprops.name});
			
			if(!instance.configuration.services[serviceprops.name])
				instance.configuration.services[serviceprops.name] = serviceprops.configuration;
			
			servicefields[serviceprops.name]=[];
			servicefields[serviceprops.name].push({ html:{caption:'Use oauth'}, field: 'services__' + serviceprops.name+ '__oauth', type:'checkbox'});
			servicefields[serviceprops.name].push({ html:{caption:'Oauth provider'}, field: 'services__' + serviceprops.name+ '__oauthprovider', type:'list', options:{items:oauthproviders}});
		}
		
		extendedFields.push({ html:{caption:'See Service details', category:'services'}, field: 'services__' + '__details', type:'list', options:{items:services_}});
	});*/

	var oauthdefaults,
		router = "oauthloader";
	
	if(instance.getContext(router)){
		var preferencekey = instance.getContext(router).preferencekey;
		editoroptions.fields.push(
            { html:{caption: 'New ' + preferencekey}, field: preferencekey + '__new', type:'new', parentfield:preferencekey, objecttype:'object'}
		);
		
		var routers = instance.getServerInstance().getConfiguration(preferencekey);
		if(routers){
			var routerkeys = Object.keys(routers).filter(function(key){return key != "use";});
			
			if(routerkeys.length > 0)
				editoroptions.fields.push({html:{caption:preferencekey + 'to use'}, field: preferencekey + '__use', type:'list', options:{items:routerkeys}});
			
			for(var rindex in routerkeys){
				editoroptions.fields = editoroptions.fields.concat(instance.getContext(router).getRouterFields(routerkeys[rindex]));
			}
		}
		
		instance.getContext(router).on("provider.loaded", function(provider){
			console.log("New provider --> ");
			console.log(provider);
			console.log("New provider --> ");
			// let us save the values in to the fileor else in to the database.
		})
	}
	
	// get he dbpool from server instance 
	if(instance.getServerInstance().getRouter("dbpool")){
		var routerInstance = instance.getServerInstance().getRouter("dbpool");
		editoroptions.fields.push(
            { html:{caption: 'New ' + routerInstance.preferencekey}, field: routerInstance.preferencekey + '__new', type:'new', parentfield:routerInstance.preferencekey, objecttype:'object'}
		);
		
		var routers = instance.getServerInstance().getConfiguration(routerInstance.preferencekey);
		var routerkeys = Object.keys(routers).filter(function(key){return key!= "use";});
		
		if(routerkeys.length > 0)
			editoroptions.fields.push({html:{caption:routerInstance.preferencekey + 'to use'}, field: routerInstance.preferencekey + '__use', type:'list', options:{items:routerkeys}});
		
		for(var i in routerkeys){
			editoroptions.fields = editoroptions.fields.concat(routerInstance.getRouterFields(routerkeys[i]));
		}
	}
	
	jsoneditor.updateFields(editoroptions.fields);
	
	if(instance.getContext("oauthloader"))
		jsoneditor.addJSONDefaults(instance.getContext("oauthloader").preferencekey, instance.getContext("oauthloader").getRouterDefaults());
	
	if(instance.getServerInstance().getRouter("dbpool"))
		jsoneditor.addJSONDefaults(instance.getServerInstance().getRouter("dbpool").preferencekey, instance.getServerInstance().getRouter("dbpool").getRouterDefaults());
	
	var tabs = jsoneditor.editorsettings.tabs;
	var dbtab = util.getJSONObject(tabs, 'id', 'db');
	
	if (dbtab){
		dbtab.buttons=[];
		
		dbtab.buttons.push({field:'checkdbconnection', type:'button', action:uri + '/checkdbconnection', html:{caption:'Test Database connection'}});
		dbtab.buttons.push({field:'', type:'link', html:{caption:'Download Mongo DB'}, action:'http://www.mongodb.org/downloads?_ga=1.138445744.2085945964.1424807802'});
	}
	
	var generaltab = util.getJSONObject(tabs, 'id', 'general');
	if(generaltab){
		generaltab.buttons = [];
		
		generaltab.buttons.push({field:'shutdown', type:'button', action:uri + '/shutdown', html:{caption:'Shutdown server'}});
		generaltab.buttons.push({field:'restart', type:'button', action:uri + '/restart', html:{caption:'Restart server'}});
		
		var serveractions = instance.getServerInstance().getServerActions();
		for(var i in serveractions){
			var serveraction = serveractions[i];
			
			generaltab.buttons.push({type:'link', action:serveraction.url, field:serveraction.action, html:{caption:serveraction.action}});
		}
	}
	var pluginerrors = instance.getContext("pluginloader").getPluginErrors();
	if(pluginerrors &&  Object.keys(pluginerrors).length > 0){
		var tab  = {id:"plugin_errors", caption:"Plugin exceptions", buttons:[], fields:[]};
		
		for(var plugin in pluginerrors){
			var pluginerror = pluginerrors[plugin];

			if(pluginerror['missingnpmdependencies'] && pluginerror['missingnpmdependencies'].length > 0){
				for(var pei in pluginerror['missingnpmdependencies']){
					var mnpmmodule = pluginerror['missingnpmdependencies'][pei];
					
					var button = {field:'install-npm-' + mnpmmodule, type:'button', action:uri + '/installnpm?module=' + mnpmmodule, html:{caption:'Install npm module ('+mnpmmodule+')'}};
					
					if(pei == 0){
						button["html"]["categorytitle"] = 'NPM modules missing';
						button["html"]["category"] = plugin;
					}
					
					tab.buttons.push(button);
				}
			}
			
			if(pluginerror['missingdependencies'] && pluginerror['missingdependencies'].length > 0){
				var mpluginmodules = pluginerror['missingdependencies'];
				
				for(var pei in mpluginmodules) {
					var mpluginmodule = mpluginmodules[pei];
					
					var button = {field:'install-plugin-' + mpluginmodule, type:'button', action:uri + '/installplugin/' + mpluginmodule, html:{caption:'Install plugin module ('+mpluginmodule+')'}};
					
					if(pei == 0){
						button["html"]["categorytitle"] = 'Plugin missing';
						button["html"]["category"] = plugin;
					}
					
					tab.buttons.push(button);
				}
			}
			
			if(pluginerror['missingresources'] && pluginerror['missingresources'].length > 0){
				var mpluginresources = pluginerror['missingresources'];
				
				for(var pei in mpluginresources) {
					var mpluginresource = mpluginresources[pei],
						button;
					
					if(typeof mpluginresource == "object") {
						button = {field:'install-plugin-resource-' + mpluginresource, type:'button', action:uri + '/installresource?plugin=' + plugin +"&resource="+mpluginresource, html:{caption:'Install plugin resource named ('+mpluginresource+')'}};
					}else
						button = {field:'install-plugin-resource-' + mpluginresource, type:'button', action:uri + '/installresource?plugin=' + plugin +"&resource="+mpluginresource, html:{caption:'Install plugin resource named ('+mpluginresource+')'}};
					
					if(button){
						if(pei == 0){
							button["html"]["categorytitle"] = 'Plugin resource missing';
							button["html"]["category"] = plugin;
						}
						
						tab.buttons.push(button);
					}
				}
			}
		}
		
		jsoneditor.editorsettings.tabs.push(tab);
	}
	
	function updateErrors(instance, jsoneditor, moduleName){
		var routererrors = instance.getContext(moduleName).getRouterErrors();
		
		if(routererrors &&  Object.keys(routererrors).length > 0){
			var tab  = {id : moduleName + "_errors", caption:moduleName + " exceptions", messages:[], fields:[]};
			
			for(var routername in routererrors){
				var routererror = routererrors[routername];
				if(routererror['error']){
//					tab.messages.push(routername + (routererror.plugin ? '@' + routererror.plugin : '' ) + ' ' +  routererror['error']+'');
				}
			}
			
			jsoneditor.editorsettings.tabs.push(tab);
		}
	}
	
	updateErrors(instance, jsoneditor, "serviceloader");
	updateErrors(instance, jsoneditor, "filterloader");
	
//	if(serviceerrors &&  Object.keys(serviceerrors).length > 0){
//		var tab  = {id:"service_errors", caption:"API Service exceptions", messages:[], fields:[]};
//		
//		for(var apiservice in serviceerrors){
//			var serviceerror = serviceerrors[apiservice]
//			if(serviceerror['error']){
//				tab.messages.push(apiservice + (serviceerror.plugin ? '@' + serviceerror.plugin : '' ) + ' ' +  serviceerror['error']+'');
//			}
//		}
//		jsoneditor.editorsettings.tabs.push(tab);
//	}
	
	instance.getServerInstance().get(uri + "/templates/:tabview", function(request, response, callback){
		var templatename = request.pathGroup;
		
		if(request.query)
			jsoneditor.renderTemplate(templatename, jsoneditor.getObject(null, request.query.category, request.query.categoryid), response);
		else
			jsoneditor.renderTemplate(templatename, jsoneditor.getObject(), response);
	});
	
	instance.getServerInstance().get(uri+ '/configuration', function(request, response, callback){
		var result = {html:'', config:jsoneditor.getObject(null, request.query.category, request.query.categoryid)};
		
		if(request.query)
			jsoneditor.renderTemplate('newconfig', result.config, function(error, html){
				if(html)
					result.html = html;
				
				response.json(result);
			});
		else
			response.json(result);
	});
	
	instance.getServerInstance().post(uri+ '/:category/configuration', function(request, response, callback){
		var category = request.pathGroup;
		
		var configobject = jsoneditor.getObject(null, category);
		var name = request.body[category];
		
		jsoneditor.getUpdatedObject(request.body, jsoneditor.getJSONDefaults(category), configobject.fields, function(error, jsonobject){
			var serverconfig = {};
			if(!jsonobject.id)jsonobject.id=name;
			var fieldsetting = jsoneditor.getFieldSetting(category);
			var jsonchanges_unflattened;
			if(fieldsetting && fieldsetting.multiple &&  fieldsetting.dataType == "object"){
				serverconfig[category] = [jsonobject];

				jsonchanges_unflattened = simpleportal.util.unFlattenJSON(serverconfig, '__');
			} else if(fieldsetting && fieldsetting.multiple &&  fieldsetting.dataType == "string"){
				serverconfig[category] = [jsonobject.id];

				jsonchanges_unflattened = simpleportal.util.unFlattenJSON(serverconfig, '__');
			}else{
				var newconfig = {};
					newconfig[name] = jsonobject;
				
				serverconfig[category] = newconfig;
				
				var fieldsetting = jsoneditor.getFieldSetting(category);
				jsonchanges_unflattened = simpleportal.util.unFlattenJSON(serverconfig, '__');
			}
			
			jsoneditor.defaultjsonobject  = simpleportal.util.extendJSON(jsoneditor.defaultjsonobject, jsonchanges_unflattened);
			
			jsoneditor.save(jsonchanges_unflattened);
			instance.getServerInstance().setConfiguration(jsonchanges_unflattened);
			
			if(category == "oauth")
				instance.getContext("oauthloader").emit("register.provider", newconfig);
			
			response.json({"status": "success"});
		});
		
//		jsoneditor.update(request.body, function(error, updatedobject){
//			if(updatedobject && Object.keys(updatedobject).length > 0) {
//				jsoneditor.save(updatedobject);
//				
//				instance.getServerInstance().setConfiguration(updatedobject);
//				
//				response.json({"status": "success"});
//			}else
//				response.json({"status": "error", "message":"No data to update"});
//		});
	});
	
	instance.getServerInstance().get(uri, function(request, response, callback){
		if(request.query)
			response.json(jsoneditor.getObject(null, request.query.category, request.query.categoryid));
		else
			response.json(jsoneditor.getObject());
	});
	
	instance.getServerInstance().post(uri, function(request, response, callback){
		jsoneditor.update(request.body, function(error, updatedobject){
			if(updatedobject && Object.keys(updatedobject).length > 0) {
				jsoneditor.save(updatedobject);
				
				instance.getServerInstance().setConfiguration(updatedobject);
				
				response.json({"status": "success"});
			}else
				response.json({"status": "error", "message":"No data to update"});
		});
	});
	
	
	instance.getServerInstance().post(uri + "/installresource", function(request, response, callback){
		// check for user permission
		if(request.query && request.query.plugin && request.query.resource) {
			// call the plugin manager install function
			instance.getServerInstance().getRouter("pluginloader").emit("install.resource", {id:request.query.plugin, resourcename:request.query.resource});
			
			response.json({"status": "success"});
		}else
			response.json({"status": "error", "message":"No modules found"});
	});
	
	instance.getServerInstance().post(uri + "/installnpm", function(request, response, callback){
		// check for user permission
		if(request.query && request.query.module){
			util.installNpmModule(request.query.module, function(error, data){
				if(error){
					console.trace(error);
					response.json({"status": "error", "message":data});
				}else
					response.json({"status": "success", "message":data});
			});
		}else
			response.json({"status": "error", "message":"No modules found"});
	});
	
	instance.getServerInstance().post(uri + "/shutdown", function(request, response, callback){
		// check for user permission
		instance.getServerInstance().emit("shutdown");
	});
	
	instance.getServerInstance().post(uri + "/checkdbconnection", function(request, response, callback){
		// check for user permission
		jsoneditor.update(request.body, function(error, updatedobject){
			var updatedobject = util.unFlattenJSON(jsoneditor.getJSONObject(), '__');
			
			checkDBConfig(updatedobject, function(error){
				if(error)
					response.json({"status": "error", "message" : error});
				else
					response.json({"status": "success"});
			});
		});
	});
	
	instance.getServerInstance().on("preference.change", function(preference){
		if(preference && Object.keys(preference).length > 0)
			jsoneditor.save({'preference':preference});
	})
	
	if(callback)
		callback();
};

var checkDBConfig = function(latestconfiguration, callback){
	var dbToUse = latestconfiguration.db['use'],
		dbOptions;
	
	if(dbToUse){
		dbOptions = latestconfiguration.db[latestconfiguration.db['use']];
	} 
	
	if(dbOptions)
		DbUtil.checkDBConfig(dbOptions, function(error, client){
			if(error)
				callback(error);
			else
				callback(error, client);
		});
	else
		callback('No valid db configuration found!!');
}