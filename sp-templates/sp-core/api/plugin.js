"use strict";

var simpleportal = require("simpleportal"),
	path = require('path'),
	fs = require('fs'),
	wrench = require('simpleportal/node_modules/wrench');

var pluginService = new simpleportal.Service.CRUDService({
	name:'plugin',
	modify:true, 
	collection:'plugin', 
	userrole:['superadmin', 'admin'],
	defaultsort:{sort:[['pluginsourcetype',1, 'timestamp', 1, 'plugintype', -1]]}, 
	primaryKeyFields:['pluginid'/*, 'version'*/],
	model:{
		plugintype:'',
		title:'',
		pluginid:'',
		description:'',
		version:0.1,
		priority:1.1,
		themesetting:{},
		webappsetting:{},
		uipluginsetting:{},
		permission:[{}],
		dependencies:[''],
		status:'default'
	},
	dataformat:{
		object: function(plugin, request){
			var settingtokeep;
			if(plugin && plugin.plugintype)
				settingtokeep = plugin.plugintype + "setting";
			
			var plugintypes = pluginService.getPluginloader().getPluginFolders(pluginService.getPluginloader().templatedir, 1);
			for(var index in plugintypes){
				var availablesetting = plugintypes[index].id + 'setting';
				if(availablesetting != settingtokeep)
					delete plugin[availablesetting];
			}
			
			if(!plugin.pluginid)
				plugin.pluginid=simpleportal.db.generateId(plugin.title);
			
			return plugin;
		}
	},
	validation:{
		title:'required'
	}, 
	configuration:{
		modelaction:[
 		    {
 				url:'backup', display:'backup'
 			},{
 				url:'backupwebapp', display:'backup-webapp'
 			},{
 				url:'clearcache', display:'clearcache'
 			},{
 				url:'resetdependencies', display:'resetdependencies'
 			},{
 				url:'minify', display:'minify'
 			}
 		],
		modelsettings:{
			dependencies:{
				url:'', multiple:true, display:['title', 'plugintype'], displayseperator:'(', id:'id'
			},
			plugintype:{
				url:'plugintype', display:'id', id:'id', multiple:false,
				displayoptions:{plugin:'radio'},
				change:{webapp:{webappsetting:"show"}, theme:{themesetting:"show"}, uiplugin:{uipluginsetting:"show"}}
			}, uipluginsetting:{
				depends:'plugntype',
				html:{display:"none", cssclass:"settings"},
				model:{
					hompepage:'',
					downloadlink:'',
					css:[''],
					javascript:[''],
					fieldplugin:false
				},
			}, themesetting:{
				depends:'plugntype',
				html:{display:"none", cssclass:"settings"},
				model:{
					themeuri:'',
					css:[''],
					fonts:[''],
					javascript:{},
					layout:{}
				},
				modelsettings:{
					layout:{
						model:{
							pagelayout:"",
							servicelayout:""
						},modelsettings:{
							pagelayout:{
								url:'pagelayout'
							},
							servicelayout:{
								url:'contentlayout'
							}
						}
					},
					css:{
						multiple:true, url:"cdn/resources?type=css", plugin:"multi-tree", dataType:"string", type:"array"
					},fonts:{
						multiple:true, url:"cdn/resources?type=fonts", plugin:"multi-tree", dataType:"string", type:"array"
					}, 
					javascript:{
						model:{
							theme:[""],
							cdn:[""]
						},modelsettings:{
							theme:{multiple:true, url:"cdn/resources?type=js", plugin:"multi-tree", dataType:"string", type:"array", model:{presecript:""}},
							cdn:{multiple:true, url:"cdn/resources?type=js", plugin:"multi-tree", dataType:"string", type:"array", model:{cdn:""}}
						}, validation:{
							cdn:{unique:["theme"]},
							theme:{unique:["cdn"]}
						}
					}
				}
			}, webappsetting:{
				depends:'plugntype',
				html:{display:"none", cssclass:"settings"},
				model:{
					webapptype:"",
					webappuri:'',
					dynamicwebapp:false,
					metatags:[{}],
					css:[''],
					javascript:{},
					fonts:[''],
					iconclass:"",
					changetheme:false,
					theme:"",
					layout:{},
					"footerconfig":{}
				}, modelsettings:{
					footerconfig:{
						model:{
							copyright:{},
							contact:{}
						},modelsettings:{
							copyright : {
								model:{
									"info":"2000-2025",
									"company":"Simpleportaljs",
									"website":"http://www.simpleportaljs.com"
								}, validation:{
									website:'url'	
								}
							}, "contact":{
								model:{
									"website":"http://www.simpleportaljs.com",
									"email":"info@simpleportaljs.com",
									"phone":"(49) 00 000 000 00-0"
								}, validation:{
									email:'email',
									phone:'phone',
									website:'url'
								}
							}
						}
					},
					webapptype:{
						fieldplugin:'simpleselector', url:'webapp/type', ajax:false, displayoptions:{plugin:'radio', datadisplay:'id'}
					},
					iconclass:{
						fieldplugin:'iconPicker'
					},
					theme:{
						url:'search?plugintype=theme', display:'title', id:'id', multiple:false
					},
					css:{
						multiple:true, url:"cdn/resources?type=css", plugin:"multi-tree", dataType:"string", type:"array"
					},fonts:{
						multiple:true, url:"cdn/resources?type=fonts", plugin:"multi-tree", dataType:"string", type:"array"
					}, 
					metatags:{
						multiple:true,
						model:{
							attribute:'',
							value:"",
							contentoptions:"",
							content:""
						},modelsettings:{
							value:{change:{contentoptions:'dependant'}, inherit:['options']},
							attribute:{url:'metataglookup', ajax:true, dataroot:'attribute', inherit:['options'], change:{value:'dependant'}}
						}, validation:{
							attribute:'required',
							value:"required"
						}
					}, 
					javascript:{
						model:{
							cdn:[""],
							prescript:[""],
							postscript:[""]
						},modelsettings:{
							cdn:{multiple:true, url:"cdn/resources?type=js", plugin:"multi-tree", dataType:"string", type:"array", model:{cdn:""}},
							prescript:{multiple:true, url:"cdn/resources?type=js", plugin:"multi-tree", dataType:"string", type:"array", model:{presecript:""}},
							postscript:{multiple:true, url:"cdn/resources?type=js", plugin:"multi-tree", dataType:"string", type:"array", model:{postscript:""}}
						}, validation:{
							cdn:{unique:["prescript", "postscript"]},
							prescript:{unique:["cdn", "postscript"]},
							postscript:{unique:["cdn", "prescript"]}
						}
					},
					layout:{
						model:{
							pagelayout:"",
							servicelayout:"",
							sidepanel:[{}]
						},modelsettings:{
							pagelayout:{
								url:'pagelayout'
							},
							servicelayout:{
								url:'contentlayout'
								//url:'/api/plugin/plugin/layout'
							},
							sidepanel:{
								multiple:true,
								model:{
									display:'',
									urlRoot:'',
									url:'',
									templateName:'',
									templatedir:'templates/',
									uri:'',
									icon:'glyphicon glyphicon-text-height',
									newform:false,
									searchform:false,
									search:{},
									form:{},
									details:{}
								}, validation:{
									display:'required',
									uri:"required",
									urlRoot:"required",
									templateName:"required"
								},modelsettings:{
									templateName:{
										url:'backbone/template?type=list', urlquery:['theme']
									},
									icon:{
										fieldplugin:'iconPicker'
									},
									search:{
										model:{
											templateName:""
										},modelsettings:{
											templateName:{
												url:'backbone/template?type=search'
											}
										}
									},
									details:{
										model:{
											templateName:""
										},modelsettings:{
											templateName:{
												url:'backbone/template?type=details'
											}
										}
									},
									form:{
										model:{
											templateName:""
										},modelsettings:{
											templateName:{
												url:'backbone/template?type=form'
											}
										}
									}
								}
							}
						}
					}
				}
			},
			permission:{
				multiple:true,
				model:{
					roles:[""], oauth:[""]
				},modelsettings:{
					oauth:{
						multiple:true
					},
					roles:{
						url:'/api/system/user/role', displayseperator:"(", display:['display', 'roletype'], id:'role', multiple:true
					}
				}
			},
			status:{
				url:'status', display:'display', id:'id', multiple:false
			}
		}
	}
});

/**
 * To get the icons from the plugin
 */
pluginService.get("/icons", function(request, response, callback){
	var aggregatequery = [{$unwind:"$icons"}, {$project:{id:"$icons", _id:0}}];
	
	pluginService.getStorageService().getCollection(function(error, collection){
		if(!error)
			collection.aggregate(aggregatequery, callback);
		else
			callback(error);
	});
});

pluginService.get("/contentlayout", function(request, response, callback){
	var aggregatequery = [
        {$unwind:"$layouts"}, 
        {$project:{_id:0, layouts:1, pluginid:"$id", layouttype:"$layouts.layouttype", id:{$concat:["/", "$id", "/", "$layouts.path", "/", "$layouts.id"]}, display:{$concat:["$title", " / ", "$layouts.title"]}}},
        {$match:{layouttype:{$eq:"content"}}}
    ];
	
	pluginService.getStorageService().getCollection(function(error, collection){
		if(!error)
			collection.aggregate(aggregatequery, function(error, data){
				simpleportal.util.getResources(
					[pluginService.getPluginloader().layoutdir+'/content/'],
					{
						root:(pluginService.getPluginloader().layoutdir+'/content/'),
						extensoin:'html.ejs',
						excludeDir:true
					}
					, callback, data||[]
				);
			});
		else
			callback(error);
	});
});

pluginService.get("/pagelayout", function(request, response, callback){
	var aggregatequery = [
        {$unwind:"$layouts"}, 
        {$project:{_id:0, layouts:1, pluginid:"$id", layouttype:"$layouts.layouttype", id:{$concat:["/", "$id", "/", "$layouts.path", "/", "$layouts.id"]}, display:{$concat:["$title", " / ", "$layouts.title"]}}},
        {$match:{layouttype:{$eq:"page"}}}
    ];
	
	pluginService.getStorageService().getCollection(function(error, collection){
		if(!error)
			collection.aggregate(aggregatequery, function(error, data){
				simpleportal.util.getResources(
					[pluginService.getPluginloader().layoutdir+'/'],
					{
						root:(pluginService.getPluginloader().layoutdir+'/'),
						extensoin:'html.ejs',
						excludeDir:true
					}
					, callback ,data||[]
				);
			});
		else
			callback(error);
	});
});

pluginService.get("/resourcesource", function(request, response, callback){
	var resourcesources = [
	  {display:'Server resources', resourceurl:pluginService.getApiUrl() + '/server/resources'},
      {display:'Static Resources', resourceurl:pluginService.getApiUrl() + '/static/resources'},
      {display:'Plugin Templates', resourceurl:pluginService.getApiUrl() + '/templates/resources'},
      {display:'UI Plugin', resourceurl:pluginService.getApiUrl() + '/uipluign/resources'},
      {display:'Webapps', resourceurl:pluginService.getApiUrl() + '/webapp/resources'},
      {display:'Theme', resourceurl:pluginService.getApiUrl() + '/theme/resources'}
    ];
	
	callback(null, resourcesources);
});

pluginService.get("/fieldplugin", function(request, response, callback){
	pluginService.getStorageService().find({plugintype:'uiplugin', "uipluginsetting.fieldplugin":true}, callback);
});

pluginService.get("/plugintype", function(request, response, callback){
	// inclue plugin types also in to the mix.
	var plugintypes = pluginService.getPluginloader().getPluginFolders(pluginService.getPluginloader().templatedir, 1);
		plugintypes.push({id:'pluginsource', display:'Plugin source'});
		plugintypes.push({id:'pluginstore', display:'Plugin store'});
	
	callback(null, plugintypes);
});

pluginService.get("/template", function(request, response, callback){
	getPluginTemplates("", callback, [], request.query);
});

pluginService.get("/metataglookup", function(request, response, callback){
	var metatag = simpleportal.util.readJSONFile(__dirname + "/metatag.json");
	
	callback(null, metatag.metatag);
});

pluginService.post('/save', function(request, response, callback){
	// to save resource directly to a folder
	// enable or disable file update
	var enableresourceupdate = true;
	var modelprops = {
		name:'resourceeditor',
		model : {
			editor:'',
			contenttype:'',
			resourcename:'',
			resourcefolder:'',
			plugintype:'',
			pluginid:''
		},
		validation : {
			editor:'required',
			resourcename:'required',
			object:function(object){
				return {isValid:(object.plugintype && object.pluginid), message:'No plugin provided for plugin service!'};;
			}
		}
	};
	var object = simpleportal.util.getObject(request, modelprops);
	
	if(object.validationmessages && object.validationmessages.length > 0){
		callback(object.validationmessages, object);
	}else{
		delete object.validationmessages;
		
		//if resource name and resource folder default files will be uploaded to ui plugin dir
		if(object.pluginid) {
			var searchquery = {id:object.pluginid};
			if(object.pluginid && object.plugintype){
				searchquery = {id:{$in:[object.pluginid, object.pluginid+object.plugintype]}}	
			}
			
			pluginService.getStorageService().findOne(searchquery, function(error, curpluginsetting){
				if(curpluginsetting)
					curpluginsetting = formatSavedPluginsetting(curpluginsetting);
				
				if(curpluginsetting && curpluginsetting.installeddir){
					var resourcefolder = simpleportal.util.appendFilePath(curpluginsetting.installeddir, object.resourcefolder, "/");
					var resourcewithextension = simpleportal.util.appendFileExtension(resourcefolder, object.resourcename, object.contenttype);
					if(!fs.existsSync(resourcewithextension) || enableresourceupdate){
						simpleportal.util.checkDirSync(resourcefolder);
						
						fs.writeFile(resourcewithextension, object.editor, callback);
					}else if(fs.existsSync(resourcewithextension))
						callback("A file exists with the same name, update is disabled for now!!", object);
					else
						callback("Not able to find the resource folder to save!", object);
				}else
					callback("No valid plugin found with plugin id - " + object.pluginid);
			});
		}else{
			var resourcefolder = simpleportal.util.appendFilePath(pluginService.getPluginloader().uiplugindir, object.resourcefolder, "/");
			
			var resourcewithextension = simpleportal.util.appendFileExtension(resourcefolder, object.resourcename, object.contenttype);
			if(!fs.existsSync(resourcewithextension)){
				simpleportal.util.checkDirSync(resourcefolder);
				
				fs.writeFile(resourcewithextension, object.editor, callback);
			}else if(fs.existsSync(resourcewithextension))
				callback("A file exists with the same name, update is disabled for now!!", object);
			else
				callback("Not able to find the resource folder to save!", object);
		}
	}
});

/**
 * To upload a web resource to the plugin folder
 * 
 */
pluginService.post('/upload', function(request, response, callback){
	var pluginsource = pluginService.getObject(request);
	
	if(pluginsource.pluginid){
		var searchquery = {id:pluginsource.pluginid};
		if(pluginsource.pluginid && pluginsource.plugintype){
			searchquery = {id:{$in:[pluginsource.pluginid, pluginsource.pluginid + pluginsource.plugintype]}}	
		}
		
		pluginService.getStorageService().findOne(searchquery, function(error, curpluginsetting){
			if(curpluginsetting && curpluginsetting.installeddir){
				for(var fileindex in request.files){
					var file = request.files[fileindex];
					
					var uploadresource = {
						resourceroot:curpluginsetting.installeddir,
						resourcename:simpleportal.util.generateId(request.body["resourcename"]||file.name), 
						resourcefolder:simpleportal.util.generateId(request.body["resourcefolder"]), 
						resourcebundle:file.path,
						bundlefile:file.path,
						isfile:true
					};
					//pluginsource.installeddir = simpleportal.util.appendFilePath(pluginService.getPluginloader().uiplugindir, uploadresource.resourcename);
					
					var errors;
					new pluginService.getServiceloader().getService("system_pluginsource").PluginInstaller(pluginsource).installPluginResource(uploadresource, function(error, data){
						if(error){
							if(!errors)errors=[];
								
							errors.push(error);
						}
						if(data && data.file)
							data.file='/' + curpluginsetting.plugintype + '/' + (curpluginsetting.pluginid||simpleportal.util.generateId(curpluginsetting.title)) + data.file.replace(curpluginsetting.installeddir, '');
						
						callback(errors, data);
					});
				}
			}
		});
	} else if(pluginsource.plugintype == "uiplugin"){ //@TODO other plugin types
		for(var fileindex in request.files){
			var file = request.files[fileindex];
			
			var uploadresource = {
				resourceroot:pluginService.getPluginloader().uiplugindir,
				resourcename:simpleportal.util.generateId(request.body["resourcename"]), 
				resourcefolder:simpleportal.util.generateId(request.body["resourcefolder"]), 
				resourcebundle:file.path
			};
			
			pluginsource.installeddir = simpleportal.util.appendFilePath(pluginService.getPluginloader().uiplugindir, uploadresource.resourcename);
			
			var errors;
			new pluginService.getPluginloader().getService("system_pluginsource")
				.PluginInstaller(pluginsource)
				.installPluginResource(uploadresource, function(error, data){
					if(error){
						if(!errors)errors=[];
						errors.push(error);
					}
					callback(errors, data);
			});
		}
	}else {
		var files = request.files;
		
		if(files){
			if(files.pluginfile){
				var pluginfile = files.pluginfile;
				var extension = simpleportal.util.getExtension(pluginfile.path);
				
				pluginService.getPluginloader().upload({
					name : pluginfile.originalFilename, 
					file:pluginfile.path
				}, callback);
			}else
				callback('No plugin file uploaded');
		}else
			callback('No plugin file uploaded');
	}
});

pluginService.get("/:plugintype/uiresources", function(request, response, callback){
	getPluginresources({plugintype:request.pathGroup}, callback)
});

pluginService.get("/:id/dependentresources", function(request, response, callback){
	var pluginerrors = pluginService.getPluginloader().getPluginErrors(),
		pluginerror = pluginerrors ? pluginerrors[request.pathGroup] : null;
	
	pluginService.details(request.pathGroup, function(error, pluginsetting){
		if( pluginsetting && !error ){
			if(pluginerror && pluginsetting.resources){
				var pluginresources = simpleportal.util.extendJSON([], pluginsetting.resources);
				
				if(pluginerror && pluginerror['missingresources'] && pluginerror['missingresources'].length > 0){
					var mpluginresources = pluginerror['missingresources'];
					
					for(var pei in pluginresources) {
						var presource = pluginresources[pei];
						var mresource = simpleportal.util.getJSONObject(mpluginresources, 'resourcename', presource.resourcename);
						
						if(mresource)
							console.log(mresource);
					}
					
					callback(null, pluginresources);
				}else
					callback(null, pluginresources);
			} else {
				callback(null, pluginsetting.resources);
			}
		} else callback(error);
	});
});

pluginService.post("/:id/installresource/:resourcename", function(request, response, callback){
	var plugin = request.pathGroup,
		uridata = request.path;
	
	pluginService.details(request.pathGroup, function(error, pluginsetting){
		if( pluginsetting && !error ){
			var depresource;// = simpleportal.util.getJSONObject(pluginsetting.missingresources, "resourcename", uridata.group2);
			if(pluginsetting.missingresources && pluginsetting.missingresources.indexOf(uridata.group2) != -1)
				depresource = simpleportal.util.getJSONObject(pluginsetting.resources, "resourcename", uridata.group2);
			
			if(depresource)
				pluginService.getPluginloader().installDependencies(pluginsetting, function(error, data){
					console.log(error);
					console.log(data);
				}, depresource);
			else
				callback("No resorce found with - " + uridata.group2);
		}else
			callback();
	});
});	

pluginService.get("/:id/resources", function(request, response, callback){
	if(request.query.type == 'all')
		delete request.query.type;
	
	var searchquery = {id:request.pathGroup};
	var extension;
	if(request.query && request.query.type){
		extension= request.query.type;
		if(extension == "fonts")
			extension = 'ttf|eot|svg|woff|otf|svg';
		if(extension == "javascript")
			extension = 'javascript|js';
	}
	var resourcelookups = [];
	
	if(request.pathGroup == 'templates'){
		resourcelookups.push(
		   {
			   resourcesdir:pluginService.getPluginloader().templatedir, 
			   root:pluginService.getPluginloader().templatedir, 
			   rootpath:"/templates", extension:extension,
			   resourcekey:'resources-'
		   }
		);
		getResources(resourcelookups, callback);
	} else if(request.pathGroup == 'server'){
		resourcelookups.push(
		   {
			   resourcesdir:simpleportal.util.appendFilePath(simpleportal.rootdir, "server/resources/templates"), 
			   root:simpleportal.util.appendFilePath(simpleportal.rootdir, "resources/templates"), 
			   rootpath:"/templates", extension:extension,
			   resourcekey:'server-'
		   }
		);
		getResources(resourcelookups, callback);
	} else  if(simpleportal.util.arraycontains(['webapp', 'theme', 'plugin', 'uiplugin'], request.pathGroup)){
		searchquery = {plugintype:request.pathGroup};
		
		pluginService.getStorageService().find(searchquery, function(error, pluginlist){
			if(pluginlist && pluginlist.results){
				for(var i in pluginlist.results){
					pluginlist.results[i] = formatSavedPluginsetting(pluginlist.results[i]);
					
					if(pluginlist.results[i].installeddir)
						if(pluginlist.results[i].plugintype == 'uiplugin'){
							resourcelookups.push({
								resourcesdir:pluginlist.results[i].installeddir, 
								root:pluginlist.results[i].installeddir, 
								rootpath: "/uiplugin/" + (pluginlist.results[i].pluginid||pluginService.getObjectId(pluginlist.results[i])), 
								extension:extension,
								resourcekey:'plugin-'
							});
						}else
							resourcelookups.push({
								resourcesdir:pluginlist.results[i].installeddir, 
								root:pluginlist.results[i].installeddir, 
								rootpath: "/plugin/" + pluginlist.results[i].id, 
								extension:extension,
								resourcekey:'plugin-'
							});
				}
			} else{}	
			
			getResources(resourcelookups, callback);
		});	
	}else{
		pluginService.getStorageService().findOne({id:request.pathGroup}, function(error, pluginsetting){
			var resourcelookups = [
			   {
				   resourcesdir:pluginService.getPluginloader().uiplugindir, 
				   root:pluginService.getPluginloader().uiplugindir, 
				   rootpath:"/uiplugin", extension:extension,
				   resourcekey:'resources-'
			   }
			];
			
			if(pluginsetting){
				resourcelookups.push({
					resourcesdir:pluginsetting.installeddir, 
					root:pluginsetting.installeddir, 
					rootpath: "/plugin/" + pluginsetting.id, 
					extension:extension,
					resourcekey:'plugin-'
				});
			} else{}	
			
			getResources(resourcelookups, callback);
		});	
	}
});

pluginService.get("/:id/type", function(request, response, callback){
	callback(null, pluginService.getPluginloader().getPluginFolders(pluginService.getPluginloader().templatedir + "/" + request.pathGroup, 1));
});

pluginService.get("/:id/layout", function(request, response, callback){
	getPluginTemplates(request.pathGroup, callback, [], {templatepath:pluginService.getPluginloader().layoutdir, templatesubpath:"/"});
});

pluginService.get("/:id/template", function(request, response, callback){
	getPluginTemplates(request.pathGroup, callback, [], request.query);
});

pluginService.post("/:id/backupwebapp", function(request, response, callback){
	var /*backupath = pluginService.getServerInstance().getConfiguration("resources").backupdir || "./._dump";
		backupath = simpleportal.util.getServerPath(backupath + "/plugin");*/
		backupath = pluginService.getServerInstance().getDataDirectory(instance.getServerInstance().getConfiguration("resources").backupdir||'backup', 'plugin');
		
	pluginService.details(request.pathGroup, function(error, pluginsetting){
		if( pluginsetting && !error ){
			pluginService.getPluginloader().backup({
				disableNotification:true, 
				staticfiles:true,
				pluginid: pluginsetting.pluginid, 
				id: pluginsetting.id, 
				backupath: backupath
			}, callback);
		}else
			callback(error);
	});
});

pluginService.post("/:id/backup", function(request, response, callback){
	var /*backupath = pluginService.getServerInstance().getConfiguration("resources").backupdir || "./._dump";
		backupath = simpleportal.util.getServerPath(backupath + "/plugin");*/
		backupath = pluginService.getServerInstance().getDataDirectory(instance.getServerInstance().getConfiguration("resources").backupdir||'backup', 'plugin');
		
	pluginService.details(request.pathGroup, function(error, pluginsetting){
		
		if( pluginsetting && !error ){
			pluginService.getPluginloader().backup({
				disableNotification:true, 
				pluginid: pluginsetting.pluginid, 
				backupath: backupath
			}, callback);
		}else
			callback(error);
	});
});

pluginService.post("/:id/minify", function(request, response, callback){
	pluginService.details(request.pathGroup, function(error, pluginsetting){
		if(pluginsetting && !error){
			pluginService.emit("minify", pluginsetting);
			
			callback(error, pluginsetting);
		}else
			callback(error, pluginsetting);
	});
});

pluginService.post("/:id/resetdependencies", function(request, response, callback){
	pluginService.details(request.pathGroup, function(error, pluginsetting){
		if(pluginsetting && !error){
			var temppath = pluginService.getPluginloader().getDataDirectory(pluginsetting, "dependencies");
//			var temppath = simpleportal.util.getServerPath(resourcetempdir + "/" + pluginsetting.id);
			if(fs.existsSync(temppath)){
				// remove the temporary folder 
				simpleportal.util.deleteFolderRecursiveSync(temppath);
				
//				pluginService.getPluginloader().emit('generate.template', pluginsetting);
				
				pluginService.getPluginloader().installDependencies(pluginsetting);
				
				callback(error, {});
			}else
				callback(error, {});
		}else{
			callback(error, pluginsetting);
		}
	});
});

pluginService.post("/:id/clearcache", function(request, response, callback){
	pluginService.details(request.pathGroup, function(error, pluginsetting){
		if(pluginsetting && !error){
			var temppath = pluginService.getPluginloader().getTempPath(pluginsetting);
			
			if(fs.existsSync(temppath)){ // check te file or folder exists under.
				simpleportal.util.deleteFolderRecursiveSync(temppath);
				
				pluginService.getPluginloader().emit('generate.template', pluginsetting);
				
				callback(error, {});
			}else
				callback(error, {});
		}else{
			callback(error, pluginsetting);
		}
	});
});

pluginService.get("/:id/mobile", function(request, response, callback){
	pluginService.details(request.pathGroup, function(error, pluginsetting){
		callback(null, pluginsetting);
	});
});

/**
 * To uninstall specific plugin 
 */
pluginService.post('/:id/uninstall', function(request, response, callback){
	pluginService.details(request.pathGroup, function(error, pluginsetting){
		if(error || !pluginsetting)
			callback(error);
		else{
			pluginService.getPluginloader().uninstall(pluginsetting, function(error, data){
				callback(error, data);
			});
		}
	});
});

/**
 * To uninstall specific plugin 
 */
pluginService.get('/:id/usage', function(request, response, callback){
	pluginService.details(request.pathGroup, function(error, pluginsetting){
		if(error || !pluginsetting)
			callback(error);
		else{
			var pluginsettingfield = pluginsetting.plugintype + 'setting';
			var depqueries = [];
				depqueries.push({
					'themesetting.dependencies':{
						$elemMatch:{
							$in:[pluginsetting.id, pluginsetting.id + '@']
						}
					}
				});
				depqueries.push({
					'webappsetting.dependencies':{
						$elemMatch:{
							$in:[pluginsetting.id, pluginsetting.id + '@']
						}
					}
				});
				depqueries.push({
					'dependencies':{
						$elemMatch:{
							$in:[pluginsetting.id, pluginsetting.id + '@']
						}
					}
				});
			
			// create a searchquery with }
//			pluginService.search(searchquery, function(){});
			
			pluginService.search({$or:depqueries}, function(error, usage){
				pluginsetting.usage = usage;
				
				callback(error, pluginsetting);
			}, {id:1, title:1}, {limit:'none'});
		}
	});
});

/**
 * After updarte callback
 */
pluginService.afterupdate = function(error, pluginsetting, callback){
	if(!pluginsetting||error)
		callback(error, pluginsetting);
	else{
		// how about creating the plugin inside the resources specifc folder
		if(pluginsetting && pluginsetting.installeddir) {
			// get the installed dir
			if(!fs.existsSync(pluginsetting.installeddir)){
				pluginService.getLogger.info("No plugin folder found for plugin - "+  pluginsetting.id);
				
				callback("No plugin folder found for plugin - "+  pluginsetting.id, pluginsetting);
			}
		} else {
			// get the installed dir
			// set it to theme dir
			if(pluginsetting.plugintype == "theme"){
				pluginsetting.installeddir = pluginService.getPluginloader().publicappdir + "/themes/" + pluginsetting.id;
			}else if(pluginsetting.plugintype == "layout")
				pluginsetting.installeddir = pluginService.getPluginloader().publicappdir + "/layout/" + pluginsetting.id;
			else if(pluginsetting.plugintype == "webapp")
				pluginsetting.installeddir = pluginService.getPluginloader().plugindir + "/" + pluginsetting.id;
			else 
				pluginsetting.installeddir = pluginService.getPluginloader().plugindir + "/"+ pluginsetting.plugintype+"/" +pluginsetting.id;
			// set it to layout dir
			// set it to webapp dir
			
			if(!fs.existsSync(pluginsetting.installeddir)){
				simpleportal.util.checkDirSync(pluginsetting.installeddir);
				
				var installeddir = pluginsetting.installeddir;
				delete pluginsetting.installeddir;
				fs.writeFileSync(installeddir + '/plugin.json', JSON.stringify(pluginsetting, null, '\t'));
				pluginsetting.installeddir = installeddir;
			}
		}
		
		if(pluginsetting && pluginsetting.id){
			var curpluginsetting = pluginService.getPluginloader().getPluginDetails(pluginsetting.id, pluginsetting.plugintype);
			
			if(curpluginsetting){
				simpleportal.util.extendJSON(curpluginsetting, pluginsetting);
				
				// only update settings property
				if(curpluginsetting[pluginsetting.plugintype + 'setting']){
					var configuration = pluginsetting.configuration;
					
					var curconfiguration = {};
					if(fs.existsSync(pluginsetting.installeddir + '/configuration.json')){
						curconfiguration = simpleportal.util.readJSONFile(pluginsetting.installeddir + '/configuration.json');
					}
					
					var updatesettings = {};
					var plugintypesettings = curpluginsetting[pluginsetting.plugintype + 'setting'] 
						= curconfiguration[pluginsetting.plugintype + 'setting'] 
						= pluginsetting[pluginsetting.plugintype + 'setting'];
					
					//curconfiguration = simpleportal.util.extendJSON({}, curconfiguration, updatesettings)
						
					fs.writeFileSync(pluginsetting.installeddir + '/configuration.json', JSON.stringify(curconfiguration, null, '\t'));
					
					// have a look a customjs
//					if((plugintypesettings && plugintypesettings.customjs)){
////						simpleportal.util.checkDirSync(pluginsetting.installeddir+ '/html5');
//						
//						fs.writeFileSync(pluginsetting.installeddir + '/custom.js', plugintypesettings.customjs);
//					}	

					// have a look at custom css
//					if((plugintypesettings && plugintypesettings.customcss)){
////						simpleportal.util.checkDirSync(pluginsetting.installeddir+ '/html5');
//						
//						fs.writeFileSync(pluginsetting.installeddir + '/custom.css', plugintypesettings.customcss);	
//					}
				}
			} else{
				// it is read from database not from file
				pluginService.getLogger.info("New plugin '"+pluginsetting.id+"' not available inside the plugin registry!!");
			}
		}
		callback(error, pluginsetting);	
	}
}

pluginService.on("afterupdate", function(eventdata){
	if(eventdata 
		&& eventdata.servicemodel
		&& eventdata.servicemodel.installeddir) {
		
		removeOldTempFiles(eventdata.servicemodel);
	}
});

pluginService.on("init", function(){
	pluginService.getServiceloader().on("server.ready", function(){
		updatePluginDatabase(function(){
			console.log("finsihed updating plugin db");
		});
	});
	
	pluginService.getPluginloader().on("plugin.clear.cache", function(pluginsetting){
		clearCache(pluginsetting, true, function(){});
	});
	
	pluginService.getPluginloader().on("generate.template", function(pluginsetting){
		if(pluginsetting.configuration && pluginsetting.configuration.services){
			for(var i in pluginsetting.configuration.services){
				var serviceInstance = pluginService.getServiceloader().getService(i, {plugin:pluginsetting.id});
				
				if(serviceInstance)
					pluginService.getServiceloader().emit("generate.template", serviceInstance);
			}
		}
	});
});

/**
 * To clear cached files from plugin
 * @method clearCache
 * @param pluginsetting plugin info
 * @param recreate boolean value to recreate or not
 * @param callback callback function after finishing.
 */
var clearCache = function(pluginsetting, recreate, callback){
	if(pluginsetting){
		var temppath = pluginService.getPluginloader(pluginsetting);
		if(fs.existsSync(temppath)){ 
			simpleportal.util.deleteFolderRecursiveSync(temppath);
			
			if(recreate)
				pluginService.getPluginloader().emit('generate.template', pluginsetting);
			
			callback(null, {});
		}else
			callback(null, {});
	} else{
		callback(null, pluginsetting);
	}
}

var updateMissingDependencies = function(callback){
	// let us check for missing dependencies and if enabled auto install install it
	var autoinstall = pluginService.getServerInstance().getConfiguration("resources", {autoinstall:false}).autoinstall;
	if(autoinstall) {
		pluginService.search({ missingdependencies : {"$exists":true, "$ne":[], "$not":{"$size":0}}}, function(error, missingplugins){
			var mccount = 0;
			for(var i in missingplugins){
				var missingpluign = missingplugins[i];
				
				pluginService.getPluginloader().installMissingDependencies(missingpluign, {}, function(error, updateinfo){
					if(error)pluginService.getLogger().error(error);
					
					pluginService.getPluginloader().checkDependencies(missingpluign, function(error, updatedplugin){
						console.log(updatedplugin);
						
						// callback
						if(mccount++ == missingplugins.length-1)
							callback();
					})
					// now let us search for the missing plugins and update it in to the db.
				});
			}
		}, {id:1, missingdependencies:1}, {limit:'none'});
	}else if(callback)
		callback();
}
/**
 * To uninstall the old plugins
 */
var updatePluginDatabase = function(callback){
	updateActivePlugin(function(error, plugins){
		
		pluginService.search({pluginid:{$nin:plugins}}, function(error, pluginresult){
			if(pluginresult && pluginresult.length > 0) {
				var cbc = pluginresult.length;
				
				for(var index in pluginresult){
					var plugin = pluginresult[index];
					
					pluginService.getStorageService().add_update(
						{id:plugin.id}, 
						{id:plugin.id, disabled:true, installed:false}, 
						function(error, pluginupdated){
							if(error)
								pluginService.getLoggee().error(error);
							else if(pluginupdated)
								pluginService.getLogger().debug("Plugin disabled inside database - " + pluginupdated.id)
								

							if(cbc-- == 1)
								updateMissingDependencies(callback);
						}
					);
				}
			}else
				updateMissingDependencies(callback);
		}, {id:1}, {limit:'none'});
	});
};

/**
 * To remove old temp files.
 * 
 * @param pluginsetting
 * @param callback
 */
function removeOldTempFiles(pluginsetting, callback){
	if(pluginsetting && pluginsetting.id && pluginsetting.installeddir){
		var resourcetempdir = pluginService.getPluginloader().getTempPath(pluginsetting);
		
		// get the file status
		fs.stat(pluginsetting.installeddir, function(error, pluginstats){
			if(fs.existsSync(resourcetempdir)) {
				fs
				.readdirSync(resourcetempdir)
				.map(function(v) { 
					return { 
						name:v,
						filepath:resourcetempdir +"/"+ v,
	            		time:fs.statSync(resourcetempdir +"/"+ v).mtime
					};
				})
				.filter(function(file){
					return file.name.indexOf(".") != -1 || pluginstats.mtime < file.mtime;
				})
				.forEach(function(file){
					console.log(pluginsetting.id + " --> deleting older files -- > " + file);
					fs.unlink(file.filepath, function(){});
				});
			}
			
			if(callback)
				callback();
		});
	}else if(callback)
		callback("WARN: Not a valid plugin or plugin install directory not found!");
}

/**
 * Prvate function for formatting the pluginsettings
 * 
 * @param pluginsetting
 * @return {object}
 */
function formatSavedPluginsetting(pluginsetting){
	if(!pluginsetting.pluginid) {
//		pluginsetting.pluginid = pluginsetting.title;
		pluginsetting.pluginid = simpleportal.db.generateId(pluginsetting.title);
	}else
		pluginsetting.pluginid = simpleportal.db.generateId(pluginsetting.pluginid);//pluginService.getObjectId(pluginsetting);
	
	if(!pluginsetting.installeddir){
		var plugindir = simpleportal.util.appendFilePath(simpleportal.util.getServerPath(pluginService.getPluginloader().plugindir), pluginsetting.pluginid);
		
		if(fs.existsSync(plugindir))
			pluginsetting.installeddir = plugindir;
	}
	
	return pluginsetting;
}

/**
 * To update the active plugin inside the plugin repository which is read from the plugin folder
 * 
 * @method updateActivePlugin
 * @param callback
 */
function updateActivePlugin(callback){
	var activeplugins =[],
		plugins = pluginService.getPluginloader().getPlugins();
	
	for(var subModule in plugins){
		var subplugins = plugins[subModule];
		
		if(subplugins){
			for(var plugin in subplugins){
				var plugindata = subplugins[plugin];
				
				var details = pluginService.getPluginloader().getPluginDetails(plugindata.id, plugindata.plugintype);
								
				if(details) {
					details = formatSavedPluginsetting(details);
					
					activeplugins.push(details);
				}
			}
		}
	}
	
	var count = 0;
	var pluginids = [];
	
	if(activeplugins && activeplugins.length > 0) {
		activeplugins.sort(function(a, b) {
		    return a.plugintype == "webapp" ? 1 : (b.priority - a.priority) + (b.plugintype.charAt(0) - a.plugintype.charAt(0)) ;
		});
		
		for(var index in activeplugins) {
			var activeplugin = activeplugins[index];
			delete activeplugin._id;
			
			pluginids.push(activeplugin.pluginid);
			
			// here we have something wrong happending preference is reset here.
			pluginService.getStorageService().add_update({id:activeplugin.id}, activeplugin, function(error, data){
				if(error){
					pluginService.getLogger().error("plugin:updateActivePlugin", error);
				} else {
					// let us fire the afterupdate event
					pluginService.emit("afterupdate", {service:pluginService.name, error:error, servicemodel:data});
				}
				
				if(count++ == activeplugins.length-1)
					callback(null, pluginids);
			});
		}
	}else
		callback(null, pluginids);
}

/**
 * To get the resources with in the server
 * @param resourcelookups
 * @param callback
 * @param results
 */
function getResources(resourcelookups, callback, results){
	results = results||[];
	
	var lookupcount = 0;
	if(resourcelookups.length == 0)
		callback(null, results);
	else
		for(var index in resourcelookups) {
			var resourcelookup = resourcelookups[index];
			
			simpleportal.util.getResources([resourcelookup.resourcesdir], {
				root:resourcelookup.root, 
				rootpath:resourcelookup.rootpath, 
				extension:resourcelookup.extension, 
				resourcekey:resourcelookup.resourcekey
			}, function(error, subresults){
				if(subresults && subresults.length > 0)
					results = results.concat(subresults);
				
				if(lookupcount++ == resourcelookups.length -1)
					callback(null, results);
			}, []);
		}
}

/**
 * To get the plugin resources stored in the database
 * 
 * @param searchquery
 * @param callback
 */
function getPluginresources(searchquery, callback){
	var aggregatequery = [
		{$unwind:"$resources"}, 
		{$project:{_id:0, plugintype:1, resources:1, title:"$resources.resourcename", id:{$concat:["/", "$id", "/", "$resources.resourcefolder", "/", "$resources.resourcename"]}, display:{$concat:["$title", " / ", "$resources.resourcename"]}}},
		{$match:searchquery}
	];
  	
  	pluginService.getStorageService().getCollection(function(error, collection){
  		if(!error)
  			collection.aggregate(aggregatequery, callback);
  		else
  			callback(error);
  	});
}

/**
 * To get the templates 
 * 
 * @param dir
 * @param props
 * @param callback
 * @param templatelist
 */
function getTemplates(dir, props, callback, templatelist){
	// read from directory
	if(!templatelist)
		templatelist = [];
	
	if(!(dir instanceof Array))
		dir=[dir];
	
	for(var i in dir){
		if(fs.existsSync(dir[i]))
			fs.readdirSync(dir[i]).forEach(function(filename){
				if(/\.html.ejs$/.test(filename)){
					var id = filename.replace(".html.ejs", "");
					var template = {};
		
					// decide what is the type
					if(/list.html.ejs$/.test(filename))
						template.type="list";
					else if(/form.html.ejs$/.test(filename))
						template.type="form";
					else if(/search.html.ejs$/.test(filename))
						template.type="search";
					else if(/service.html.ejs$/.test(filename))
						template.type="details";
										
					if(!props || !props.type || props.type == template.type){
						template = simpleportal.util.extendJSON(template, props||{}, {id:id, display:simpleportal.util.capitaliseFirstLetter(id)});
						templatelist.push(template);
					}	
				}
			});
	}
	
	callback(null, templatelist);
}

/**
 * To get plugin templates
 *  
 * @param pluginid
 * @param callback
 * @param templatelist
 * @param props
 */
function getPluginTemplates(pluginid, callback, templatelist, props){
	if(!templatelist)
		templatelist = [];
	
	if(!props)
		props = {};
	
	var templatesubpath = props.templatesubpath||"/html5/templates";
	var templatepath = props.templatepath||pluginService.getPluginloader().templatedir + "/webapp";
	
	if(!pluginid && templatesubpath)
		getTemplates([templatepath + "/" + templatesubpath], {displaycategory:"system", type:props.type}, callback, templatelist);
	else if (pluginid)
		pluginService.details(pluginid, function(error, pluginsetting){
			if(error){
				var templatepaths = [templatepath + templatesubpath, templatepath + "/" + pluginid + "/templates/" + templatesubpath];

				getTemplates(templatepaths, {displaycategory:"system", type:props.type}, callback, templatelist);
			}else{
				var plugintemplatedir;
				if(pluginsetting.plugintype == "theme" && props && props.pluginsubtype)
					plugintemplatedir = pluginsetting.installeddir + "/templates/" + props.pluginsubtype + templatesubpath;
				if(pluginsetting && pluginsetting.pluginsubtype)
					plugintemplatedir = pluginService.getPluginloader().templatedir + "/" + pluginsetting.pluginsubtype + templatesubpath;
				
				if(pluginsetting && pluginsetting.pluginsubtype && plugintemplatedir){
					getTemplates(plugintemplatedir, {displaycategory:"system", type:props.type}, function(erro, plugintemplatelist){
						// get the theme templates
						if(pluginsetting.plugintype != "theme" && pluginsetting.theme){
							getPluginTemplates(pluginsetting.theme, callback, templatelist, {pluginsubtype:pluginsetting.pluginsubtype, templatepath:templatepath, templatesubpath:templatesubpath});
						}else
							callback(null, templatelist);
					}, templatelist);
				} else if(plugintemplatedir && pluginsetting.plugintype == "theme"){
					getTemplates(plugintemplatedir, {displaycategory:"theme", type:props.type}, callback, templatelist);
				} else
					callback(error, templatelist);
			}
		});
	else
		callback(error, templatelist);
}

/**
 * Exporting the plugin api.
 */
module.exports = pluginService;