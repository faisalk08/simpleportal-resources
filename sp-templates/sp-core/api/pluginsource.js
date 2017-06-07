"use strict";

var simpleportal = require("simpleportal"),
	fs =require("fs"),
	Resourceinstaller= require("simpleportal/lib/util/resourceinstaller"),
	util = require("simpleportal/lib/util"),
	url = require("url");

/**
 * API for template snippets
 * @class 
 */
var pluginsourceService = new simpleportal.Service.CRUDService({
	name:'pluginsource',
	modify:true, 
	collection:'pluginsource', 
	userrole:['superadmin', 'admin'],
	defaultsort:{sort:[['title', -1]]}, primaryKeyFields:['title', 'plugintype'],
	model:{
		title:"",
		plugintype:"",
		sourcetype:"",
		version:0.1,
		homepage:"",
		downloadlink:"",
		resources:[{}],
		plugins:[{}],
		dependencies:[""],
		authentication:{},
		status:'default'
	},
	validation:{
		homepage:"url",
		downloadlink:"url",
		title:'required'
	}, 
	configuration:{
		modelaction:[
		    {
				url:'install', display:'install'
			}, {
				url:'update', display:'update'
			}, {
				url:'reinstall', display:'reinstall'
			}
		],
		modelsettings:{
			status:{
				url:'status', display:'display', id:'id', multiple:false
			}, plugintype:{
				url:'/api/system/plugin/plugintype', display:'id', id:'id', multiple:false,
				change:{pluginsource:{sourcetype:"show", 'authentication': {'authtype':'basic'}}}
			},sourcetype:{
				depends:'plugintype',
				html:{display:"none"}
			},authentication:{
				multiple:false,
				model:{
					authtype:'',
					authkey:''
				}, modelsettings:{
					authtype:{
						options:['basic', 'oauth'], multiple:false,
						change:{oauth:{authkey:"show"}}
					}, authkey:{
						depends:'authkey', html:{display:"none"}
					}
				}
			}, resources:{
				multiple:true,
				model:{
					"resourcename": "",
	     			"resourcefolder": "",
	     			"downloadlink": ""
				}, modelsettings:{
				}, validation:{
					downloadlink:'url,required'
				}
			}, plugins:{
				multiple:true,
				model:{
					"homepage": "",
					"version": "",
					"resourcename": "",
	     			"resourcefolder": "",
	     			"downloadlink": "",
	     			resources:[{}]
				}, modelsettings:{
					resources:{
						multiple:true,
						model:{
							"resourcename": "",
			     			"resourcefolder": "",
			     			"downloadlink": ""
						}, modelsettings:{
						}, validation:{
							downloadlink:'url,required'
						}
					}
				}, validation:{
					downloadlink:'url,required'
				}
			}
		}
	}
});

pluginsourceService.get('/pluginlist', function(request, response, callback){
	var searchquery = {
		plugintype:{$ne:'pluginresource'}
	};
	
	if(request.query && request.query.plugintype){
		searchquery.plugintype = {$in:request.query.plugintype.split(",")};
	}
	
	var aggregateQuery = [
	      {
	    	  	$match:searchquery
	      },
	      {
	    	  $lookup:
	    	  	{
	    		  from: "plugin",
	    		  localField: "title",
	    		  foreignField: "title",
	    		  as: "installedplugin"
	    	  	}
	      }
	];
	
	if(request.query && request.query.installed && request.query.installed == 'true'){
		
	}else{
		aggregateQuery.push({
		  	$match:{
		  		installedplugin:{"$eq":[]}
	  		}
		});
	}
	
	aggregateQuery.push({
	  	$sort:{
	  		plugntype:1, installedplugin:1
  		}
	});	
	
	pluginsourceService.getStorageService().aggregate({pipeline:aggregateQuery}, callback);
});

pluginsourceService.post('/update', function(request, response, callback){
	var plugindetails = pluginsourceService.getPluginloader().getPluginDetails('sp-pluginmanager', 'webapp');
	
	var cbcount=0,
		psourcecount =0;
	
	if(plugindetails.preference.pluginsource && plugindetails.preference.pluginsource.length > 0){
		psourcecount = plugindetails.preference.pluginsource.length;
		
		for(var i in plugindetails.preference.pluginsource){
			var pluginsource = plugindetails.preference.pluginsource[i];
			
			if(typeof pluginsource == 'object')
				updateRemotePluginSource(pluginsource, request, function(error, data){
					if(cbcount++ == psourcecount-1)
						callback(null, {status:'success'});
				});
			else if(cbcount++ == psourcecount-1)
					callback(null, {status:'success'});
		}
	}else
		callback(null, {status:'success'});
});

pluginsourceService.get('/fetch', function(request, response, callback){
	var destinationid = request.query.id;
	
	if(destinationid)
		pluginsourceService.details(request.pathGroup, function(error, pluginsource){
			if(error||!pluginsource.serviceurl)
				callback(error||'No service url found!');
			else if(pluginsourceService.serviceurl){
				var serveroptions = url.parse(pluginsourceService.serviceurl);
				
				simpleportal.util.getJSON(serveroptions, request, function(error, data){
					callback(error, data);
				});
			}
		});
	else if(request.query && request.query.url){
		var serveroptions = url.parse(request.query.url);
		
		simpleportal.util.getJSON(serveroptions, request, function(error, data){
			// let us check if it is array or not if it is array try to store this in to our 
			// plugin source as a new item so that we can install from plugin source
			if(data)for(var i in data){
				var pluginsource = data[i];
				pluginsource.id = pluginsourceService.getObjectId(pluginsource);
				pluginsourceService.getStorageService().add_update({id:pluginsource.id}, pluginsource, function(error, uppsource){});
			}
			
			callback(error, data);
		});
	}
});

/**
 * @method API /:id/install
 */
pluginsourceService.post('/:id/upload', function(request, response, callback){
	pluginsourceService.details(request.pathGroup, function(error, pluginsource){
		if(!pluginsource)
			callback(error)
		else{
			checkStatus(pluginsource.id, function(error, details){
				if(error)
					callback(error);
				else {
					for(var fileindex in request.files){
						var file = request.files[fileindex];
						
						var uploadresource = {
							resourceroot : pluginsourceService.getPluginloader().getUIPluginPath(),
							resourcename : util.generateId(pluginsource.title), 
							resourcefolder :".",//util.generateId(pluginsource.title), 
							resourcebundle :file.path,
							bundlefile :file.path,
							isfile :false
						};
						//pluginsource.installeddir = simpleportal.util.appendFilePath(pluginService.getPluginloader().uiplugindir, uploadresource.resourcename);
						installPluginResource(uploadresource, function(error){
							if(error){
								pluginsourceService.getLogger().error("pluginsource:installPlugin", error);
								errors.push(error);
							}
							installPlugin(pluginsource, callback);
						});
					}
				}	
			})	
		}	
	});
});

/**
 * @method API /:id/install
 */
pluginsourceService.post('/:id/install', function(request, response, callback){
	pluginsourceService.installPlugin(request.pathGroup, request.body, callback)
});

pluginsourceService.installPlugin = function(pluginid, options, callback, request, response){
	pluginsourceService.details(pluginid, function(error, pluginsource){
		if(error && !pluginsource)
			callback(error)
		else{
			checkStatus(pluginsource.id, function(error, details){
				if(error)
					callback(error);
				else 
					installPlugin(pluginsource, callback, options, request, response);
			})	
		}	
	});
};

/**
 * @method API /:id/install
 */
pluginsourceService.post('/:id/update', function(request, response, callback){
	pluginsourceService.details(request.pathGroup, function(error, pluginsource){
		if(!pluginsource)
			callback(error)
		else if(pluginsource.plugintype == "pluginsource"){
			updatePluginsource(pluginsource, request.body, callback);
		}else if(pluginsource && pluginsource.downloadlink){
			var pluginid = pluginsource.id.replace(pluginsource.plugintype, '');
			var plugindetails = pluginsourceService.getPluginloader().getPluginDetails(pluginid, pluginsource.plugintype),
				errormessage;
			
			if(plugindetails && Number(plugindetails.version)<Number(pluginsource.version))
				installPlugin(pluginsource, callback);
			else if(plugindetails)
				errormessage = "Not able to update plugin with id ("+pluginid+") v("+plugindetails.version+") to v("+pluginsource.version+")";
			else
				errormessage = "No plugin found with id - "+ pluginid;
			
			if(errormessage)
				callback(errormessage);
		}else
			callback();
	});
});

/**
 * To re install the plugin from the remote server
 * 
 * @method API /:id/reinstall
 */
pluginsourceService.post('/:id/reinstall', function(request, response, callback){
	pluginsourceService.details(request.pathGroup, function(error, pluginsource){
		if(!pluginsource)
			callback(error)
		else{
			if(pluginsource.installeddir && fs.exists(pluginsource.installeddir))
				fs.unlinkSync(pluginsource.installeddir);
			
			installPlugin(pluginsource, callback);
		}	
	});
});

/**
 * To listen to the init event of the plugin source service.
 */
pluginsourceService.on("init", function(){
	pluginsourceService.getServiceloader().on("server.ready", function(){
		updatePluginsourcelist(pluginsourceService.getConfiguration(), function(){
			
			//try to install plugin source from the remote server.
			pluginsourceService.getServiceloader().getService("plugin").search({ plugintype:'webapp', resources : {"$exists":true, "$ne":[], "$not":{"$size":0}}}, function(error, pluginresources){
				for(var i in pluginresources) {
					var plugin = pluginresources[i];
					var presources = plugin.resources;
					
					var pluginresourcesource = simpleportal.util.extendJSON({},
						{plugin:plugin.id, title:plugin.title + ' - resources', plugintype:'pluginresource', homepage:'', downloadlink:'', version:plugin.version, resources:plugin.resources, dependencies:'', status:'default'}
					);
					
					pluginresourcesource.id = pluginsourceService.getObjectId(pluginresourcesource);
					
					pluginsourceService.getStorageService().add_update({id:pluginresourcesource.id}, pluginresourcesource, function(error, uppsource){});
				}
			}, {resources:1, plugintype:1, id:1, title:1, version:1}, {limit:'none'});
			
			// let us also fetch the plugin store and update it
			pluginsourceService.search({ plugintype:'pluginstore', autoupdate : true}, function(error, pluginstores){
				for(var i in pluginstores) {
					var pluginsource = pluginstores[i];
					
					// autoupdate the plugin store
					installPlugin(pluginsource, function(){});
				}
			}, {limit:'none'});
		});
		
	});
});

function updateRemotePluginSource(serveroptions, request, callback){
	if(!serveroptions.path && serveroptions.url)
		serveroptions.path = serveroptions.url;
	if(!serveroptions.hostname && serveroptions.host)
		serveroptions.hostname = serveroptions.host;
	
	simpleportal.util.getJSON(serveroptions, request, function(error, remotedata){
		if(remotedata)
			for(var i in remotedata){
				var pluginsource = remotedata[i];
				
				delete pluginsource._id;
				pluginsource.id = pluginsourceService.getObjectId(pluginsource);
				
				pluginsourceService.getStorageService().add_update({id:pluginsource.id}, pluginsource, function(error, uppsource){});
			}
		
		callback(error, remotedata);
	});
}

/**
 * To install plugin source in to the server folder
 * @method updatePluginsourcelist
 * 
 * @param plugin configuration.
 * @param callback callback function
 */
var updatePluginsourcelist = function(configuration, callback){
	var count = 0;
	
	var foldertosearch = [pluginsourceService.getPluginloader().templatedir];
		foldertosearch.push(simpleportal.util.getServerPath());
	
	var pluginsourcelist = [];
	var foldercount = 0;
	
	for(var i in foldertosearch){
		util.getFileList(foldertosearch[i], {filename:"pluginsource.json"}, function(error, filelist){
			if(filelist && filelist.length > 0){
				for(var fileindex in filelist){
					//pluginsource
					var pluginsource = util.readJSONFile(filelist[fileindex].file);
					if(pluginsource && typeof pluginsource == "object"){
						for(var plugintype in pluginsource){
							var plugintypesourcelist = pluginsource[plugintype];
							
							if(plugintypesourcelist)
								for(var j in plugintypesourcelist){
									plugintypesourcelist[j].plugintype = plugintype;
									plugintypesourcelist[j].id = pluginsourceService.getObjectId(plugintypesourcelist[j]);
								}
							
							if(plugintypesourcelist)
								pluginsourcelist = pluginsourcelist.concat(plugintypesourcelist);
						}
					}
				}
			}
			
			if(foldercount++ == foldertosearch.length-1){
				if(pluginsourcelist.length > 0){
					var count = 0;
					if(pluginsourcelist && pluginsourcelist.length > 0){
						for(var index in pluginsourcelist){
							pluginsourceService.getStorageService().add_update({id:pluginsourcelist[index].id}, pluginsourcelist[index], function(error){
								if(count++ == pluginsourcelist.length-1)
									callback();
							});
						}
					}else
						callback();
				}else callback(error);
			}
		});
	}
};

/**
 * To check the status of the plugin whether it is installed or not.
 * @param pluginid
 * @param callback
 */
function checkStatus(pluginid, callback){
	pluginsourceService.getServiceloader().getService("system_plugin").details(pluginid, function(error, plugindata){
		if(plugindata && plugindata.installeddir){
			fs.access(plugindata.installeddir, fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK, function(err){
				if(!err || (err && err.code == 'ENOENT'))
					callback();
				else
					callback("A plugin already installed with the id -> "+ pluginid);
			});
		} else
			callback();
	});
}

/**
 * To install the plugin from the plugin source.
 */
function installPlugin (pluginsource, callback, options, request, response) {
	// ui plugin is installed inside the special folder inside simpleportal.
	if(pluginsource && pluginsource.plugintype == "pluginstore"){
		if(pluginsource.downloadlink){
			var serveroptions = url.parse(pluginsource.downloadlink);
			
			updateRemotePluginSource(serveroptions, request, function(error, data){
				callback(error, data);
			});
		} else
			callback("Not a valid server link - " + pluginsource.downloadlink);
		
	} else if( pluginsource && pluginsource.plugintype == "pluginresource" && pluginsource.plugin){
		pluginsourceService.getServiceloader().getService("plugin").details(pluginsource.plugin, function(error, plugindata){
			if(plugindata)
				pluginsourceService.getPluginloader().installDependencies(plugindata, callback);
			else
				callback(error||"No plugin found with - " + pluginsource.plugin)
		});
	} else if(pluginsource && pluginsource.plugintype == "uiplugin") {
		var errors = [],
			installationcount = 0,
			resourcecount = 0,
			webresource_ = {resourceroot:pluginsourceService.getPluginloader().getUIPluginPath()},
			pluginresourcedir = util.generateId(pluginsource.title);
		
		pluginsource.installeddir = pluginsourceService.getPluginloader().getUIPluginPath(util.generateId(pluginsource.title));//util.appendFilePath(pluginsourceService.getPluginloader().uiplugindir, util.generateId(pluginsource.title));
		
		// check if there is downloadlink
		if(pluginsource.downloadlink) {
			var webresource = {
				downloadlink 	: pluginsource.downloadlink, 
				resourceroot 	: pluginsourceService.getPluginloader().getUIPluginPath(), 
				resourcefolder	: util.generateId(pluginsource.title), 
				resourcename	: util.generateId(pluginsource.title),
				resourcebundle	: pluginsource.resourcebundle
			};
			
			if(!webresource.resourcebundle && webresource.downloadlink.indexOf(".") == -1)
				webresource.resourcebundle=pluginsource.id + '.tar.gz';
				
			installPluginResource(webresource, function(error){
				if(error){
					pluginsourceService.getLogger().error("pluginsource:installPlugin", error);
					errors.push(error);
				}
				
				// let us also check you have some other files to download along with main file.
				if(!error){
					if(!webresource.resources)
						installPluginExtensions(pluginsource, function(){
							updatePlugin(pluginsource, callback);
						});
					else
						installPluginResources(pluginsource, function(){
							installPluginExtensions(pluginsource, function(){
								updatePlugin(pluginsource, callback);
							});
						});
				} else{
					callback(error);
				}
			});
		} else {
			installPluginResources(pluginsource, function(){
				installPluginExtensions(pluginsource, function(){
					updatePlugin(pluginsource, callback);
				});
			});
		}
	} else if( pluginsource && pluginsource.plugintype == "pluginsource" ){
		installPluginsource(pluginsource, options, callback);
	} else if(pluginsource && /webapp|theme/.test(pluginsource.plugintype)){
		var downloaddir = pluginsourceService.getServerInstance().getDataDirectory(pluginsourceService.getServerInstance().getConfiguration("resources").downloaddir || '._downloads', 'plugin')
		
		pluginsource.resourcefolder = downloaddir;
			pluginsource.resourcename = pluginsource.id;
			pluginsource.resourcebundle=pluginsource.id + '.tar.gz';
		
		var sr = new Resourceinstaller(pluginsource);
		sr.download(function(error, file){
			if(sr.downloaded && sr.options && sr.options.bundlefile){
				pluginsourceService.getPluginloader().install({
					file:sr.options.resourcebundle
				}, callback);
			}
		});
	}else
		callback("plugin type mentioned in the plugin source is not yet supported for this type of installation.");
}


/**
 * To checkout the plugin source code in to the local folder
 * 
 * @method installPluginsource
 * @param pluginsource
 * @param callback
 */
function installPluginsource(pluginsource, options, callback){
	
	if(pluginsource.sourcetype && pluginsource.sourcetype == "localdir"){
		pluginsourceService.emit("sourcecode", {
			options:{
				name:util.generateId(pluginsource.title), 
				sourcedir:pluginsource.sourceurl
			}, 
			sourcetype:pluginsource.sourcetype, 
			sourcedir:pluginsource.sourceurl
		});
		
		callback();
	}else if(pluginsource.sourcetype) {
		var sourcecode = require("simpleportal/lib/sourcecode");
		if(sourcecode.isValidClient(pluginsource.sourcetype)){
			var isValid = !pluginsource.authentication;
			if(pluginsource.authentication){
				if(pluginsource.authentication.authtype == "basic" && options && (options.username && options.password)){
					isValid =  true;
				} else if(pluginsource.authentication.authtype)
					isValid = false;
			}
			
			if(isValid){
				var rootpath = pluginsourceService.getServerInstance().getDataDirectory(pluginsource.plugintype);
				
				pluginsource.soucecodesetting = {
					sourcedir:rootpath,
					sourceurl:pluginsource.sourceurl||pluginsource.downloadlink,
					name:util.generateId(pluginsource.title)
				};
				
				if(!fs.existsSync(rootpath + '/' + pluginsource.soucecodesetting.name)){
					var sourcecodeClient = sourcecode.getClient(pluginsource.sourcetype, pluginsource.soucecodesetting);
					
					sourcecodeClient.checkout(options, function(error, info){
						if(error)
							console.log("There is error while checking out data.");
						
						var pstoupdate = {id:pluginsource.id};
						
						sourcecodeClient.getInfo(function(error, sourcecode_info){
							if(sourcecode_info){
								if(!pstoupdate.sourcecode_info) {
									pstoupdate.sourcecode_info=sourcecode_info;
									
									delete pstoupdate.sourcecode_info['$'];
									
									pstoupdate.sourcecode_info.configuration=pluginsource.soucecodesetting;
								} else if(sourcecode_info.commit){
									pstoupdate.sourcecode_info.commit=sourcecode_info.commit;
								}
								
								if(pstoupdate.sourcecode_info && pstoupdate.sourcecode_info.commit)
									delete pstoupdate.sourcecode_info.commit['$'];
								
								pluginsourceService.getStorageService().update({id:pluginsource.id}, pstoupdate, function(error, pupdated){});
							}
						});
						pluginsourceService.emit("sourcecode", sourcecodeClient);
						
						callback();
					});
				} else{
					callback("source code available, please use update function to update the source code.")
				}
			}else
				callback("Please provide authentication values for source code to checkout");
		} else
			callback("not a valid source code type - " + pluginsource.sourcetype);
	} else{
		installPluginResource(webresource, function(error){
			if(error){
				pluginsourceService.getLogger().error("pluginsource:installPlugin", error);
				callback(error);
			}else
				updatePlugin(pluginsource, callback);
		});
	}
}

/**
 * To update the plugin source code
 * 
 * @method updatePluginsource
 * @param pluginsource
 * @param callback
 */
function updatePluginsource(pluginsource, options, callback){
	if(pluginsource.sourcetype) {
		var sourcecode = require("simpleportal/lib/sourcecode");
		if(sourcecode.isValidClient(pluginsource.sourcetype)){
			var isValid = !pluginsource.authentication;
			if(pluginsource.authentication){
				if(pluginsource.authentication.authtype == "basic" && options && (options.username && options.password)){
					isValid =  true;
				} else if(pluginsource.authentication.authtype)
					isValid = false;
			}
			
			if(isValid){
				var rootpath = pluginsourceService.getServerInstance().getDataDirectory(pluginsource.plugintype);
				
				pluginsource.soucecodesetting={
					sourcedir:rootpath,
					sourceurl:pluginsource.downloadlink,
					name:util.generateId(pluginsource.title)
				};
				
				if(fs.existsSync(rootpath + '/' + pluginsource.soucecodesetting.name)){
					var sourcecodeClient = sourcecode.getClient(pluginsource.sourcetype, pluginsource.soucecodesetting);
					
					sourcecodeClient.update(options, function(error, info){
						if(error)
							console.log("There is error while checking out data.");
						
						var pstoupdate = {id:pluginsource.id};
						
						sourcecodeClient.getInfo(function(error, sourcecode_info){
							if(sourcecode_info){
								if(!pstoupdate.sourcecode_info) {
									pstoupdate.sourcecode_info=sourcecode_info;
									
									delete pstoupdate.sourcecode_info['$'];
									
									pstoupdate.sourcecode_info.configuration=pluginsource.soucecodesetting;
								} else if(sourcecode_info.commit){
									pstoupdate.sourcecode_info.commit=sourcecode_info.commit;
								}
								
								if(pstoupdate.sourcecode_info && pstoupdate.sourcecode_info.commit)
									delete pstoupdate.sourcecode_info.commit['$'];
								
								pluginsourceService.getStorageService().update({id:pluginsource.id}, pstoupdate, function(error, pupdated){});
							}
						});
						pluginsourceService.emit("sourcecode", sourcecodeClient);
						
						callback();
					});
				} else{
					callback("No source code available to update, please install it before updating it.")
				}
			}else
				callback("Please provide authentication values for source code to checkout");
		} else
			callback("not a valid source code type - " + pluginsource.sourcetype);
	} else {
		installPluginResource(pluginsource, function(error){
			if(error){
				pluginsourceService.getLogger().error("pluginsource:installPlugin", error);
				callback(error);
			}else
				updatePlugin(pluginsource, callback);
		});
	}
}

/**
 * To install the specific web resource 
 * 
 * @method installPluginResource
 * @param webresource
 * @param callback
 */
function installPluginExtensions(pluginsource, callback){
	// let us also check you have some other files to download along with main file.
	var error;
	if(pluginsource.plugins && pluginsource.plugins.length > 0){
		var pluginscount = pluginsource.plugins.length,
			installationcount = 0,
			webresource_ = {resourceroot:pluginsourceService.getPluginloader().getUIPluginPath(util.generateId(pluginsource.title))},
			pluginresourcedir = "plugin";//util.generateId(pluginsource.title);
		
		// check there is resources inside the plugin setting
		for(var i in pluginsource.plugins) {
			var webresource = util.extendJSON({}, webresource_, pluginsource.plugins[i]);
			
			if(!webresource.resourcefolder)
				webresource.resourcefolder = pluginresourcedir;
			else if(webresource.resourcefolder.indexOf("/") == 0)
				webresource.resourcefolder = webresource.resourcefolder.substring(1);
			else
				webresource.resourcefolder = util.appendFilePath(pluginresourcedir, webresource.resourcefolder);
			
			installPluginResource(webresource, function(_error){
				if(_error) {
					pluginsourceService.getLogger().error(_error);
					if(!error) error=[];
					error.push(_error);
				}
				
				if(installationcount++ == pluginscount-1){
					callback(error);
				}
			});
		}
	}else
		callback(error);
}

/**
 * To install the specific web resource 
 * 
 * @method installPluginResource
 * @param webresource
 * @param callback
 */
function installPluginResources(pluginsource, callback, resources){
	resources = resources || pluginsource.resources;
	var error;
	
	// let us also check you have some other files to download along with main file.
	if(resources && resources.length > 0){
		var resourcecount = resources.length,
			installationcount = 0,
			webresource_ = {resourceroot:pluginsource.resourceroot||pluginsourceService.getPluginloader().getUIPluginPath()},
			pluginresourcedir = pluginsource.resourcefolder||util.generateId(pluginsource.title);
		
		// check there is resources inside the plugin setting
		for(var i in resources) {
			var webresource = util.extendJSON({}, webresource_, resources[i]);
			
			if(!webresource.resourcefolder)
				webresource.resourcefolder = pluginresourcedir;
			else if(webresource.resourcefolder.indexOf("/") == 0)
				webresource.resourcefolder = webresource.resourcefolder.substring(1);
			else
				webresource.resourcefolder = util.appendFilePath(pluginresourcedir, webresource.resourcefolder);
			
//			if(!webresource.resourcename && webresource.downloadlink && webresource.downloadlink.indexOf("/") != -1)
//				webresource.resourcename = webresource.downloadlink.substring(webresource.downloadlink.lastIndexOf("/")); 
			
			installPluginResource(webresource, function(_error){
				if(_error){
					pluginsourceService.getLogger().error(_error);
					if(!error) error=[];
					error.push(_error);
				}
				
				if(installationcount++ == resourcecount-1){
					callback(error);
				}
			});
		}
	}else
		callback(error);
}

/**
 * To install the specific web resource 
 * 
 * @method installPluginResource
 * @param webresource
 * @param callback
 */
function installPluginResource(webresource, callback){
	webresource.downloaddir = pluginsourceService.getServerInstance().getDataDirectory(pluginsourceService.getServerInstance().getConfiguration("resources").downloaddir || '._downloads', webresource.plugintype)
	
	if(webresource.downloadlink && /(\.js|\.css|\.html)$/.test(webresource.downloadlink))
		delete webresource.resourcename;
	
	if(!webresource.downloadlink && webresource.resources)
		installPluginResources(webresource, callback);
	else if(webresource.downloadlink) {
		var sr = new Resourceinstaller(webresource);

		sr.install(function(error, data){
			installPluginResources(webresource, callback);
		});
	}else
		callback(webresource, callback);
}

/**
 * To update the plugin json from plugin source after installing it from pluginsource.
 * 
 * @method updatePlugin
 * @param pluginsource
 * @param callback
 */
function updatePlugin(pluginsource, callback){
	util.checkDirSync(pluginsource.installeddir);
	
	// check if pluginsource is from database and hase information
	fs.writeFile(pluginsource.installeddir + '/plugin.json', JSON.stringify(pluginsource, null, '\t'), function(error, data){
		// when a plugin is installed need to update the plugin loader.
		pluginsourceService.getPluginloader().emit('installed', { id:pluginsource.id, plugintype:pluginsource.plugintype, plugindir: pluginsource.installeddir});
		
		pluginsourceService.getStorageService().add_update({id:pluginsource.id}, {id:pluginsource.id, installed:true}, callback);
		
		// @TODO do this by plugin api not here
		pluginsourceService.getServiceloader().getService("plugin").getStorageService().add_update({id:pluginsource.id}, pluginsource, function(error, data){});
	});
}

/**
 * @class PluginInstaller
 * 
 * Class for installing plugin using plugin source
 */
var PluginInstaller = function(pluginsource){
	var instance = this;
	
	instance.pluginsource = pluginsource;
};

/**
 * @method checkStatus
 * 
 * To check the status of the plugin before installing the plugin
 */
PluginInstaller.prototype.checkStatus = function(){
	pluginsourceService.getServiceloader().getService("system_plugin").details(pluginid, function(error, plugindata){
		if(plugindata && plugindata.installeddir){
			fs.access(plugindata.installeddir, function(error, fsstaus){
				if(error && error.code == 'ENOENT')
					callback();
				else
					callback("A plugin already installed with the id - "+ pluginid);
//				else
//					callback();
			});
		} else
			callback();
	});
}

/**
 * To install plugin
 */
PluginInstaller.prototype.installPlugin = function(){
	
}

/**
 * To install plugin resources
 */
PluginInstaller.prototype.installPluginResource = function(webresource, callback){
	var instance = this;
	
	webresource.downloaddir = pluginsourceService.getPluginloader().tempdir;
	
	var sr = new Resourceinstaller(webresource);
	sr.install(callback);
}

/**
 * To update the plugin
 */
PluginInstaller.prototype.updatePlugin = function(){}

/**
 * export the PLugin installer to other classes
 */
pluginsourceService.PluginInstaller=PluginInstaller;

/**
 * Export template snippets
 */
module.exports = pluginsourceService;