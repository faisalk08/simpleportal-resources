"use strict";

var simpleportal = require("simpleportal"),
	fs = require("fs"),
	path = require('path'),
	util = require("simpleportal/lib/util"),	
	Template = require('simpleportal/lib/util/template'),
	EditorUtil = require('simpleportal/lib/editor/editorutil'),
	TemplateUtil = require('simpleportal/lib/template/util'),
	ApiImporter  = require('./lib/apiimporter'),
	DataImporter = require('./lib/dataimporter');

var apiserviceService = new simpleportal.Service.CRUDService({
	name:'apiservice',
	modify:true, 
	collection:'apiservice', 
	userrole:['superadmin', 'admin'],
	primaryKeyFields:['servicetype', 'name'],
	viewservice:true,
	model:{
		servicetype:'',
		title:'',
		name:'',
		modelname:'',
		description:'', 
		modify:false, 
		remoteservice:false,
		viewservice:false,
		/*scheduler:false,*/
		dbid:'',
		collection:'',
		plugin:'',
		modelfields:[{}], 
		configuration:{},
		searchqueryparams:[{}],
		status:''
	},
	dataformat: {
		object: function(object, request) {
			if(object.modelfields && typeof object.modelfields.length == 'number'){
				for(var i in object.modelfields){
					var modelfield = object.modelfields[i];
					if(modelfield.primary && (!object.primaryKey || object.primaryKey == '_id' )){
//						delete object.primaryKey;
						object.primaryKey = 'id';
					}
				}
			}
			
			return object;
		}
	},
	configuration:{
		validation:{
			name:'required',
			object:function(service, request){
				// check custom validation
				return {isValid:(service.servicetype && service.servicetype == "plugin" && service.plugin), message:'No plugin provided for plugin service!'};
			}
		},
		modelsettings:{
			status:{
				url:'status', display:'display', id:'id', multiple:false
			},
			servicetype:{
				fieldplugin:'radio', options:["system", "server", "plugin"],
				change:{plugin:{plugin:"dependant"}}
			},
			plugin:{
				url:'/api/system/plugin/search?plugintype=webapp', display:'title', id:'id', multiple:false
			},searchqueryparams:{
				multiple:true,
				model:{key:'', value:''},
				validation:{key:'required'},
				modelsettings:{}
			},
			remoteservice:{
				change:{configuration:{remoteservice:"show"}, searchqueryparams:"show"}
			},
			configuration:{
				model:{
					uri:'', 
					remoteservice:{}
				}, modelsettings:{
					multiple:false,
					remoteservice:{
						validation:{
							path:'required'
						},
						model:{
							path:'', 
							oauth:false,
							oauthprovider:'default',
							skiplogin:false
						}, modelsettings:{
							//@TODO replace with a better code
//							oauthprovider:{options:Object.keys(apiserviceService.getServerInstance().getRouter("oauthloader").getOauthproviders())}	
						}
					}
				}
			},
			dbid:{
				//@TODO replace with a better code
//				defaultvalue:'default', options:simpleportal.db.dbpool.getDbIds()
			},
			modelfields:{
				multiple:true,
				model:{
					field:'', 
					primary:false, 
					multiple:false, 
					dataType:'', 
					type:'', 
					validation:'',
					fieldsetting:{}
				}, modelsettings:{
					primary:{
						change:{validation:'required'}
					},
					dataType:{
						options:['text', 'number', 'float', 'boolean', 'object'/*, 'array'*/]
					}, type:{
						html:{display:"display-type-(html)"},
						options:["text", "date", "time", "number", "password", "textarea", "select", "checkbox", "radio", "date","readonly", "hidden"/*, "array"*/],
						change:{format:'DD.MM.YYYY'}
					},
					fieldsetting:{
						model:{
							format:"",
							multiple:false,
							fieldplugin:'', 
							url:'', 
							ajax:false,
							display:'', 
							id:'', 
							dataType:'',
							somethingelse:[""], 
							options:[""]
						}, modelsettings:{
//							inherit:{
//								multiple:true, type:"array", dataType:"string", model:{
//									inherit:""
//								}
//							},
							options:{
								dataType:"string", type:"array", multiple:true, model:{
									options:""
								}
							},
							fieldplugin:{
								url:'/api/system/plugin/fieldplugin', displayoptions:{display:'title'}
							},
							dataType:{
								options:['json', 'jsonp']
							}
						}
					}
				}, validation:{
					field:'required', dataType:'required'
				}
			}
		}
	}
});

/**
 * @Method("cleardata");
 * @modelaction(true);
 * @display("clear-data");
 */
apiserviceService.post('/:id/cleardata', function(request, response, callback){
	apiserviceService.details(request.pathGroup, function(error, apiservice){
		var serviceInstance = apiserviceService.getServiceloader().getService(apiservice.name);
		
		if(serviceInstance)
			serviceInstance.getStorageService().clear(callback);
		else
			callback("No service found - "+ request.pathGroup);
	});
});

/**
 * @Method("resave");
 * @modelaction(true);
 */
apiserviceService.post('/:id/resave', function(request, response, callback){
	apiserviceService.details(request.pathGroup, function(error, apiservice){
		var serviceInstance = apiserviceService.getServiceloader().getService(apiservice.name);
		
		if(serviceInstance)
			serviceInstance.getStorageService().checkcollection(callback, serviceInstance);
		else
			callback("No service found - "+ request.pathGroup);
	});
});

/**
 * @Method("model.js");
 * @modelaction(true);
 */
apiserviceService.get('/:id/:jsmodel', function(request, response, callback){
	var templatefile = request.params.group2;
	
	apiserviceService.servicetemplates[templatefile] = templatefile;
	
	getService(request.pathGroup, apiserviceService.serviceCallback(callback, templatefile, templatefile, request, response));
});

/**
 * @Method("model.js");
 * @modelaction(true);
 */
apiserviceService.get('/dynamictemplate/:id/:subfield/templates/:templatedir/:jsmodel', function(request, response, callback){
	getSubDynamicTemplate(apiserviceService.getServiceloader().getService(request.pathGroup), request, response, callback);
});

/**
 * @Method("model.js");
 * @modelaction(true);
 */
apiserviceService.get('/dynamictemplate/:id/:subfield/:subsubfield/templates/:templatedir/:jsmodel', function(request, response, callback){
	var gp2 = request.params.group2;
	var gp3 = request.params.group3;
	var gp4 = request.params.group4;
	var gp5 = request.params.group5;
	
	if(gp2.indexOf("/") == -1){
		request.params.group2 = gp2 + "/" + gp3;
		request.params.group3 = gp4;
		request.params.group4 = gp5;
		delete request.params.group5;
	}
	
	getSubDynamicTemplate(apiserviceService.getServiceloader().getService(request.pathGroup), request, response, callback);
});

/**
 * @Method("model.js");
 * @modelaction(true);
 */
apiserviceService.get('/dynamictemplate/:id/templates/:templatedir/:jsmodel', function(request, response, callback){
	if(request.pathGroup == "templates")
		request.pathGroup = "apiservice";
	
//	var templatefile = request.pathGroup + "templates" + request.params.group2 + request.params.group3;
	
//	apiserviceService.servicetemplates[templatefile] = "templates/" + request.params.group2  +"/"+ request.params.group3;
//	request.viewtemplatedir = request.params.group2;
	apiserviceService.getLogger().info("apiservice:/:id/templates/:templatedir/:jsmodel", " getting template - " + request.pathGroup);
	
	if(request.pathGroup == "templates")
		callback("no-such-method");
	else
//		getService(request.pathGroup, apiserviceService.serviceCallback(callback, templatefile, templatefile, request, response));
		getDynamicTemplate(apiserviceService.getServiceloader().getService(request.pathGroup), request, response, callback);
});

/**
 * @Method("model.js");
 * @modelaction(true);
 */
apiserviceService.get('/:id/:templatedir/:jsmodel', function(request, response, callback){
	if(request.pathGroup == "templates")
		request.pathGroup="apiservice";
	
	var templatefile = request.pathGroup + request.params.group2  + request.params.group3;
	
	apiserviceService.servicetemplates[templatefile] = "templates/" + request.params.group2 + "/" + request.params.group3;
//	request.viewtemplatedir = request.params.group2;
	
	getService(request.pathGroup, apiserviceService.serviceCallback(callback, templatefile, templatefile, request, response));
});

apiserviceService.post('/upload', function(request, response, callback){
	request.body.saveRecord = false;
	
	apiserviceService.createServiceFromDatabackup(request, response, callback);
});

apiserviceService.post('/:id/uploaddata', function(request, response, callback){
	if(request && request.body && request.body.importeroptions){
		request.body.importeroptions.saveRecord=true;
		
		importAPIServicedata(request.body.importeroptions, callback);
	} else
		callback("No importer options found!");
});

apiserviceService.createServiceFromDatabackup = function(request, response, callback){
	// of the file is valid
	var servicename = request.body["servicename"];
	var pluginname = request.body["pluginid"];
	if(!request.body["pluginid"] && request.body["plugin"])
		pluginname = request.body["pluginid"];
	
	if(request.files){
		var file = request.files['file'];
		
		if(!servicename) {
			callback("Please provide a valid service name");
		} else if(file && file.path){
			var importeroptions = {servicename:servicename, plugin:pluginname, file:file.path};
			
			var optionsfields = ['csvdelimiter', 'datatype', 'csvquote', 'saveRecord'];
			for(var i in optionsfields){
				var field = optionsfields[i];
				if(request.body[field])
					importeroptions[field]=request.body[field];
			}
			
			try{
				if(apiserviceService.getServiceloader().getService(servicename)){
					importeroptions.saveRecord=true;
//					var serviceimporter = new ApiImporter(importeroptions);
//					
//					serviceimporter.import_data(callback);
					
					importAPIServicedata(importeroptions, callback);
				} else {
					var serviceimporter = new ApiImporter(importeroptions, apiserviceService.getServiceloader());
					
					serviceimporter.import(request, response, callback);
				}
			} catch(error){
				apiserviceService.getLogger().error("apiservice:createServiceFromDatabackup", error);
				callback(error);
			}
		} else
			callback("No file found to upload", file);
	}else
		callback("Please upload a valid file!");
}

//@TODO replace with the startup function of the individual serice loader
apiserviceService.on("startup", function(){
	// to have reference fo the app instance
	storeServices();
});

apiserviceService.on("afteradd", function(data){
	if(data.servicemodel){
		createServiceFile(data.servicemodel, function(error, servicefile){
			if (error) 
				apiserviceService.getLogger().error("apiservice:@on[afteradd]:createServiceFile", error);
			else{
				registerService(servicefile, data.servicemodel, function(){
					// callback 
					apiserviceService.getServiceloader().getService('system_apiservice').emit("service.registered", data.servicemodel);
				});
			}
		});
	}
});

apiserviceService.on("afterupdate", function(data){
	if(data.servicemodel){
		createServiceFile(data.servicemodel, function(error, servicefile){
			if (error) 
				apiserviceService.getLogger().error("apiservice:@on[afterupdate]:createServiceFile", error);
		});
		
		if(data.servicemodel && data.servicemodel.name){
			var spservice = apiserviceService.getServiceloader().getService(data.servicemodel.name);
			
			// update the primary key
			if(spservice && spservice.get){
				if(spservice.primaryKey != data.servicemodel.primaryKey)
					spservice.primaryKey = data.servicemodel.primaryKey;
				
				if(spservice.primaryKeyFields != data.servicemodel.primaryKeyFields)
					spservice.primaryKeyFields = data.servicemodel.primaryKeyFields;
				
				if(spservice.modelfields != data.servicemodel.modelfields){
					spservice.modelfields = data.servicemodel.modelfields;
					
					spservice.model = TemplateUtil.getModelFromSettings(data.servicemodel.modelfields);
				}
			} 
		}
	}
});

function callTemplateAction(serviceInstance, modelfield, template, action){
	action = action.replace(".ejs", ""); 
	
	getSubDynamicTemplate(serviceInstance, {
		getUserprofile: function(){
			return {};
		}, query:{},
		viewservice:true, 
		pathGroup:serviceInstance.name,
		params: {
			group1:serviceInstance.name,
			group2:modelfield,
			group3:template,
			group4:action
		}
	}, null, function(error) {
		if(error){
			apiserviceService.getLogger().error("apiservice:callTemplateAction", error);
		}
	});
	
	serviceInstance.getServiceConfig(modelfield, function(error, serviceconfig){
		if(serviceconfig)
			for(var i in serviceconfig.modelfields){
				var submodelfield = serviceconfig.modelfields[i];
				if(submodelfield 
					&& (
						(submodelfield.model 
						&& Object.keys(fieldsetting.model).length > 0)
						||(typeof submodelfield.defaultvalue == 'object')
					)
				)
				getSubDynamicTemplate(serviceInstance, {
					getUserprofile: function(){
						return {};
					}, query:{},
					viewservice:true, 
					pathGroup:serviceInstance.name,
					params:{
						group1:serviceInstance.name,
						group2:modelfield + "/" + submodelfield.field,
						group3:template,
						group4:action
					}
				}, null, function(error){
					if(error){
						apiserviceService.getLogger().error("apiservice:callTemplateAction", error);
					}
				});
	//			callTemplateAction(serviceInstance, modelfield + "/" + submodelfield.field, template, action)
			}
	});
}

function callTemplatesActions(serviceInstance, modelfield, templates, actions){
	templates.forEach(function(template){
		var subactions = apiserviceService.viewservicetemplates[template];
		
		callTemplateActions(serviceInstance, modelfield, template, subactions)
	});
}

function callTemplateActions(serviceInstance, modelfield, template, actions){
	actions.forEach(function(action){
		callTemplateAction(serviceInstance, modelfield, template, action)
	});
}

apiserviceService.on("viewready", function(options, more){
	if(options.viewoptions /*&&  options.viewoptions.apiservice == "apiservice"*/){
		// check if the resource has . then save in with .
		if(options.viewoptions.resource && options.viewoptions.resource.indexOf(".") != -1){
			// it is .js move it to webapp template folder
			if(options.viewoptions.resource.indexOf(".") != -1/* && options.viewoptions.data.plugin*/){
				
				var webappsetting;
				if(options.viewoptions.data.plugin){
					webappsetting = apiserviceService.getPluginloader().getPluginDetails(options.viewoptions.data.plugin, "webapp");
				}
				var tempfilepath;
				
				// change the path if it is models
				// if it is model or view save it to api.js
				if(/model.js|view.js/.test(options.viewoptions.resource)){
					var tempfile = options.viewoptions.resource;
					if(webappsetting)
						tempfilepath = util.appendFilePath(webappsetting.id, "js", tempfile.substring(0, tempfile.lastIndexOf(".")) + "s", options.viewoptions.data.name + '.js')
					else
						tempfilepath = util.appendFilePath("system", "js", tempfile.substring(0, tempfile.lastIndexOf(".")) + "s", options.viewoptions.data.name + '.js')
					
					createTempfile(tempfilepath, options);
				}else if(/templates\//.test(options.viewoptions.resource)){
					var tempfile = options.viewoptions.resource;
					
					var templfile_ = tempfile.substring(tempfile.lastIndexOf("/"));
					var templpath_ =  tempfile.substring(0, tempfile.lastIndexOf("/"));
					
					if(webappsetting) {
//						if(options.viewoptions.data.modelfield)
//							tempfilepath = util.appendFilePath(webappsetting.id, options.viewoptions.data.name, options.viewoptions.data.modelfield, templpath_, templfile_);
//						else
//							tempfilepath = util.appendFilePath(webappsetting.id, templpath_, options.viewoptions.data.name, templfile_);
							tempfilepath = util.appendFilePath(webappsetting.id, "templates", options.viewoptions.data.name, options.viewoptions.data.modelfield||"", templpath_, templfile_);
					}else
//						if(options.viewoptions.data.modelfield)
							tempfilepath = util.appendFilePath("system", options.viewoptions.data.name, options.viewoptions.data.modelfield||"", templpath_, templfile_);
//						else
//							tempfilepath = util.appendFilePath("system", options.viewoptions.data.name, templpath_, templfile_);
//					var tempfilepath = util.appendFilePath(webappsetting.id, "templates", tempfile.substring(0, tempfile.lastIndexOf(".")) + options.viewoptions.data.name)
					
					createTempfile(tempfilepath, options);
				}else{
					var tempfilepath;
					if(webappsetting)
						tempfilepath = util.appendFilePath(webappsetting.id, "js", "service", options.viewoptions.data.name, options.viewoptions.resource);
					else
						tempfilepath = util.appendFilePath("system", "js", "service", options.viewoptions.data.name, options.viewoptions.resource);
					
					createTempfile(tempfilepath, options);	
				}
			}else	
				createTemplatefile(options.viewoptions.data.name, options.viewoptions.resource, options);
		} else
			createTemplatefile(options.viewoptions.data.name, options.viewoptions.resource + ".ejs", options);
	}
	//createTempfile(options.viewoptions.data.name, options.viewoptions.resource + ".ejs", options.content)
});

apiserviceService.on("init", function(){
	/**
	 * Should be from the view template dir
	 */
	var apiservice_viewtemplatedir = __dirname + '/../resources/templates/apiservice/templates';

	var apiservice_viewtemplates = fs.readdirSync(apiservice_viewtemplatedir).filter(function(v){
		return !/^\./.test(v) && fs.statSync(path.join(apiservice_viewtemplatedir, v)).isDirectory();
	});

	apiserviceService.viewservicetemplates = {};
	apiservice_viewtemplates.forEach(function(templatedir){
		apiserviceService.viewservicetemplates[templatedir]=[];
	});

	apiservice_viewtemplates.forEach(function(templatedir){
		var servicetemplates = fs.readdirSync(apiservice_viewtemplatedir + "/" + templatedir).filter(function(v){
			return /\.ejs$/.test(v) && !fs.statSync(path.join(apiservice_viewtemplatedir + "/" + templatedir, v)).isDirectory();
		});
		
		apiserviceService.viewservicetemplates[templatedir] = servicetemplates;
	});
	
	apiserviceService.getServiceloader().on("servicestartup", function(serviceInstance){
		cacheTemplates(serviceInstance);
	});
	
	apiserviceService.getServiceloader().on("generate.template", function(serviceInstance){
		cacheTemplates(serviceInstance);
	});
});

var cacheTemplates = function(serviceInstance){
	if(serviceInstance.viewservice) {
		
		// template to be generated
		// sub templates
		var viewurl = serviceInstance.getViewUrl(),
			viewtemplates = Object.keys(apiserviceService.viewservicetemplates);
		
		viewtemplates.forEach(function(template){
			var templateactions = apiserviceService.viewservicetemplates[template];
			
			templateactions.forEach(function(action){
				action = action.replace(".ejs", "");
				
				if(action.indexOf("subservice") == 0 || action.indexOf("subdetails") == 0)
				{}else
					getDynamicTemplate(serviceInstance, {
						getUserprofile:function(){return {}},query:{},
						viewservice:true, 
						pathGroup:serviceInstance.name,
						params:{
							group1:serviceInstance.name,
							group2:template,
							group3:action
						}
					}, null, function(error){
						if(error){
							apiserviceService.getLogger().error("apiservice:callTemplateAction", error);
						}	
					});
			});
		});

//		var subviewactions = ["subdetails.html", "subserviceform.html"];
		for(var modelfield in serviceInstance.getConfiguration('modelsettings')){
			var fieldsetting = serviceInstance.getConfiguration('modelsettings')[modelfield];
			
			if((fieldsetting.model 
				&& Object.keys(fieldsetting.model).length > 0) /*
				|| fieldsetting.type == "object" 
				|| fieldsetting.dataType == "object"*/
			){
				callTemplatesActions(serviceInstance, modelfield, viewtemplates);
			}
		}
	}
};

/**
 * To get the service from Api service 
 */
function getService(servicename, callback){
	var targetservice = apiserviceService.getServiceloader().getService(servicename);
	
	if(targetservice)
		callback(null, targetservice.getServiceConfig());
	else
		apiserviceService.details(servicename, callback);
}

function storeService(data, callback){
	data.id = apiserviceService.getObjectId(data);
	
	apiserviceService.getLogger().debug("apservice:storeService", "storing service - " + data.id);
	apiserviceService.getStorageService().add_update({id:apiserviceService.getObjectId(data)}, data, callback);
}

function storeServices(callback){
//	var result = [];
	
	var routers = apiserviceService.getServiceloader().getRouters();
	
	var count = routers.length;// util.getModuleFunctions(apiserviceService.getServiceloader(), false, 'exportConfig').length;
	
	for(var i in routers){
		var router = routers[i];
		
		if(router && router.name) {
			storeService(router.getServiceConfig(), function(error){
				
				if(count-- == 0 && callback)
					callback(error);
			});
		}
	}
}

/**
 * Create service file from service props
 * 
 * @param data
 */
function createServiceFile(data, callback){
	//@TODO generate then send it back
	// check you have modelfields or model
	if( !data.modelfields || data.modelfields.length == 0 && data.model ){
		data.modelfields = TemplateUtil.getFieldFromObject(data.model);
	}
	
	if(data /*&& !data.primaryKeyFields*/){
		data.primaryKeyFields = [];
		
		// do update primaryKeyFields
		var primaryKeyFields =  data.modelfields.filter(function(modelfield){
			return modelfield.primary;
		});
		
		for(var key in primaryKeyFields)
			data.primaryKeyFields.push(primaryKeyFields[key].field);
	}
	
	var servicetemplatepath = apiserviceService.getServiceloader().templatedir + "/crudservice.js.tmpl" 
	if(data && data.remoteservice)
		servicetemplatepath = apiserviceService.getServiceloader().templatedir + "/remoteservice.js.tmpl"
	
	data.model = TemplateUtil.getModelFromSettings(data.modelfields);
	
	if(data.configuration){
		data.configuration.validation = EditorUtil.getValidationFromSettings(data.modelfields);
		data.configuration.modelsettings = EditorUtil.getModelSettingsFromSettings(data.modelfields);
	}
	
	data.filename = data.name;
	var template = new Template({engine:'ejs', file:servicetemplatepath, data:data});
	
	template.render(function(error, jscontent){
		var installpath;
		var pluginsetting;
		if(data.servicetype == 'plugin'){
			pluginsetting = apiserviceService.getPluginloader().getPluginDetails(data.plugin, "webapp");
			
			if(pluginsetting){
				var servicedir;
				if(!pluginsetting.servicedir)
					servicedir = pluginsetting.installeddir + "/" + pluginsetting.servicedir[0];
				else
					servicedir = pluginsetting.installeddir + "/services";
				
				util.checkDirSync(servicedir);
				
				installpath = pluginsetting.installeddir + "/services/" + data.name+ ".js";
			}
		}else if(data.servicetype == 'server'){
			installpath = util.getServerPath("api/" + data.name+ ".js");
		}else
			installpath = apiserviceService.getServiceloader().systemapidir + "/" + data.name + ".js";
		
		installpath = util.getServerPath(installpath);
		
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
	
//	template.render(servicetemplatepath, data, (function(callback){ 
//		return function(error, jscontent){
//			// find the plugin
//			var installpath;
//			var pluginsetting;
//			if(data.servicetype == 'plugin'){
//				pluginsetting = apiserviceService.getPluginloader().getPluginDetails(data.plugin, "webapp");
//				
//				if(pluginsetting){
//					var servicedir;
//					if(!pluginsetting.servicedir)
//						servicedir = pluginsetting.installeddir + "/" + pluginsetting.servicedir[0];
//					else
//						servicedir = pluginsetting.installeddir + "/services";
//					
//					util.checkDirSync(servicedir);
//					
//					installpath = pluginsetting.installeddir + "/services/" + data.name+ ".js";
//				}
//			}else if(data.servicetype == 'server'){
//				installpath = util.getServerPath("api/" + data.name+ ".js");
//			}else
//				installpath = apiserviceService.getServiceloader().systemapidir + "/" + data.name + ".js";
//			
//			installpath = util.getServerPath(installpath);
//	
//			if(installpath)
//				fs.writeFile(installpath, jscontent, (function(callback){
//					return function(){
//						callback(null, installpath);
//					}
//				})(callback));
//			else
//				callback("No install path found");
//		};
//	})(callback));
}

/**
 * import api service data
 * 
 * @param importeroptions
 * @param callback
 */
function importAPIServicedata(importeroptions, callback){
	try{
		var serviceimporter = new ApiImporter(importeroptions, apiserviceService.getServiceloader());
		
		if(apiserviceService.getServiceloader().getService(importeroptions.servicename)){
			var pid =  importeroptions.servicename + '-' + util.formatJSONKey(importeroptions.file);
			
			if(!importprocess[pid]){
				importprocess[pid] = importeroptions;
				importprocess[pid].status='processing';
				
				callback(null, {processing:true, pid:pid});
				
				serviceimporter.import_data(function(error, data){
					importprocess[pid].status = 'finished';
				});
			}
			
			callback(null, importprocess[pid]);
		} else {
			callback("No Service found for importing!");
		}
	} catch(error){
		apiserviceService.getLogger().error("apiservice:importAPIServicedata", error);
		callback(error);
	}
}

/**
 * Register the service
 * 
 * @param servicefile
 * @param data
 * @param callback
 */
function registerService(servicefile, data, callback){
	var configuration = {
		plugin:data.plugin, 
		name:data.name, 
		services:{}
	};
	
	configuration['services'][data.name] = {};
	
	apiserviceService.getLogger().debug("apiservice:registerService", "registering --- " + data.name + ' --' + servicefile);
	
	apiserviceService.getServiceloader().registerService(servicefile, configuration, function(error, services){
		if(error)
	    	apiserviceService.getLogger().error("apiservice:createTemplatefile", error);
		
		if(!error && apiserviceService.getServiceloader().getService(data.name)){
			// register the service
			// create with server instance
			// @start
			// @startup
			// @init
			apiserviceService.getServiceloader().getService(data.name).init(apiserviceService.getServerInstance(), function(error, serviceconfig){
				if(error)
			    	apiserviceService.getLogger().error("apiservice:createTemplatefile", error);
				
				if(callback)
					callback(error, data);
			});
		}else if(callback)callback(error, data);
		// now update the pluginsetting configuration services
	});
}

/**
 * Create temp file inside temp
 * 
 * @param filepath
 * @param options
 */
function createTempfile(filepath, options){
	var //resourcetempdir = apiserviceService.getServerInstance().getConfiguration("resources").tempdir || "._tmp";
		resourcetempdir = apiserviceService.getPluginloader().getTempPath();//instance.getServerInstance().getDataDirectory(instance.getServerInstance().getConfiguration("resources").tempdir||'._tmp');
	
	var temppath = util.getServerPath(resourcetempdir);
	var tempfile = util.appendFilePath(temppath, filepath);

	if(tempfile && options.content){
		util.checkDirSync(tempfile.substring(0, tempfile.lastIndexOf("/")));
		
		var filecontent = options.content.trim();
		var mtime;
		
		if(options.templateFile && options.templateFile.stat)mtime = options.templateFile.stat.mtime;
		
		if(  options.viewoptions.data && options.viewoptions.data.stats && (!mtime || options.viewoptions.data.stats) || (mtime && mtime > options.viewoptions.data.stats.mtime))
			mtime = options.viewoptions.data.stats.mtime;
		
		fs.stat(tempfile, function(error, tempfilestat){
			if(error)
		    	apiserviceService.getLogger().error("apiservice:createTemplatefile", error);
			
			if(tempfilestat && mtime && tempfilestat.mtime > mtime){
				apiserviceService.getLogger().warn("apiservice:createTempfile", "Temp file has a newer modified time than the template- "  + tempfile);
			} else if((!error || error.code == "ENOENT")){
				fs.writeFile(tempfile, filecontent, function (err) {
				    if(err) 
				    	apiserviceService.getLogger().error("apiservice:createTempfile", err);
				});
			}
		})
		
	}
}

/**
 * Creare a view template for an api service
 * 
 * @param apiservice
 * @param file
 * @param options
 */
function createTemplatefile(apiservice, file, options){
	var /*resourcetempdir = apiserviceService.getServerInstance().getConfiguration("resources").tempdir || "._tmp";*/
		resourcetempdir = instance.getPluginloader().getTempPath();
	//().getDataDirectory(instance.getServerInstance().getConfiguration("resources").tempdir||'._tmp');
	
	var temppath = util.getServerPath(resourcetempdir + "/resources/templates");
	var tempfile = util.appendFilePath(temppath, apiservice, file);
	
	util.checkDirSync(tempfile.substring(0, tempfile.lastIndexOf("/")));
	
	var filecontent = options.content.trim();
	
	/**
	 * Writing in to writeFile
	 */
	fs.writeFile(tempfile, filecontent, function (err) {
	    if(err)
	    	apiserviceService.getLogger().error("apiservice:createTemplatefile", err);
	});
}

/**
 * To ge tthe dynamic template
 * 
 * @param serviceInstance
 * @param request
 * @param response
 * @param callback
 */
function getDynamicTemplate(serviceInstance, request, response, callback){
	var templatefile = 'templates',
		templatepath = 'templates';
	
	if(request.params)
		Object.keys(request.params).forEach(function(param){
			templatefile += request.params[param];
			
			if(param != "group1" && request.params[param]){
				templatepath += "/" + request.params[param];
			}	
		});
	
	apiserviceService.servicetemplates[templatefile] = templatepath;
	
	var _callback = apiserviceService.serviceCallback(callback, templatefile, templatefile, request, response);
//	var targetservice = apiserviceService.getServiceloader().getService(request.pathGroup);
	
	/*if(targetservice && request.params.group2)
		_callback(null, targetservice.getServiceConfig(request.params.group2));
	else*/ 
	request.serviceconfig = serviceInstance.getServiceConfig();
	if(serviceInstance)
		_callback(null, serviceInstance.getServiceConfig());
	else
		callback("Not a valid sub field");
};

/**
 * To get the sub dynamic templates
 * 
 * @param serviceInstance
 * @param request
 * @param response
 * @param callback
 */
function getSubDynamicTemplate(serviceInstance, request, response, callback){
	var templatefile = 'templates',
		templatepath = 'templates';
	
	Object.keys(request.params).forEach(function(param){
		if(request.params[param]){
			templatefile += request.params[param];
			
			if(param != "group1"){
				if(param != "group2")
					templatepath += "/" + request.params[param];
			}
		}
	});
	
	apiserviceService.servicetemplates[templatefile] = templatepath;
	
	var _callback = apiserviceService.serviceCallback(callback, templatefile, templatefile, request, response);
		
	if(serviceInstance && request.params.group2){
		serviceInstance.getServiceConfig(request.params.group2, _callback);
	} else if(serviceInstance)
		_callback(null, serviceInstance.getServiceConfig());
	else
		callback("Not a valid sub field");
};

/**
 * local variable for importprocess ids
 */
var importprocess = {};

module.exports = apiserviceService;