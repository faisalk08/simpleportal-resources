var simpleportal = require("simpleportal"),
	util = require("simpleportal/lib/util"),
	fs = require("fs");
	TemplateUtil = require('simpleportal/lib/editor/template'),
	exec = require('child_process').exec,
	TEMPLATE_DIR=__dirname + '/../templates';

/**
 * API to save language key and its translation for internationalization.
 * 
 * @class API langkey
 * @extends CRUDService
 * @module languagebuilder
 * 
 * @static
 */
var langkeyService = new simpleportal.Service.CRUDService({
	collection:'translation', 
	name:'langkey', modify:true,
	primaryKeyFields:['key', 'langId'],
	model:{
		key:"",
		langId:"en",
		translation:"",
		tags:[""],
		status:""
	},validation:{
		key:"required",
		langId:"required",
		translation:"required"
	},dataformat:{
		'key':function(key){
			return key.toLowerCase().replace(/[ ]/gi, ' ');
		}
	},configuration:{
		modelsettings:{
			translation:{fieldplugin:'virtualkeyboard'},
			status:{url:'status', displayoptions:{datadisplay:'display'}},
			langId:{url:'/api/languageid/search?status=active', displayoptions:{datadisplay:'display', dataicon:'icon'}},
			tags:{url:'/api/langtag/search?status=active', displayoptions:{datadisplay:'title', multiple:true}}
		}
	}, preference:{
		translation:true
	}
});

/**
 * Api to save the translation using translator
 *
 * @method POST /translator
 * @param request http request
 * @param response http response
 * @param callback callback function
 */ 
langkeyService.post('/translator', function(request, response, callback){
	var langkeyobj = langkeyService.getObject(request);
	
	delete langkeyobj['$count'];
	
	langkeyService.getServiceloader().getService('languageid').search({status:'active'}, function(error, languagedata){
		var languages = [];
		if(languagedata && languagedata.results)
			languages = languagedata.results;
		
		var cbcount = 0;
		
		for(var i in languages){
			var language = languages[i];
			if(request.body[language.languageid]){
				updateTranslation(langkeyobj, language.languageid, request.body[language.languageid], function(error, data){
					if(error){
						console.trace(error);
					}
					cbcount++;
					if(cbcount == languages.length)
						callback(null, langkeyobj);
				});
			}else{
				cbcount++;
				if(cbcount == languages.length)
					callback(null, langkeyobj);
			}
		}
	}, {languageId:1}, {limit:'none'});
});

/**
 * Api to get the active language ids and also corresponding data required for translator
 *
 * @method GET /translator
 * @param request http request
 * @param response http response
 * @param callback callback function
 */ 
langkeyService.get('/translator', function(request, response, callback){
	langkeyService.getServiceloader().getService("languageid").search({status:'active'}, function(error, results){
		if(error)
			callback(null, {languages:[]});
		else
			callback(null, {languages:results.results})
	});
});

/**
 *  Api to get the translation in a js file
 *
 * @method GET /js
 * @param request http request
 * @param response http response
 * @param callback callback function
 */ 
langkeyService.get('/js', function(request, response, callback){
	getLanguageCoreJS('/api/langkey/js/', request, response);
});

/**
 * Api to get the translation in a js file
 *
 * @method GET /js.js
 * @param request http request
 * @param response http response
 * @param callback callback function
 */ 
langkeyService.get('/js.js', function(request, response, callback){
	getLanguageCoreJS('/api/langkey/js/', request, response);
});

/**
 * Api to get the translation as a json file
 *
 * @method GET /js.json
 * @param request http request
 * @param response http response
 * @param callback callback function
 */ 
langkeyService.get('/js.json', function(request, response, callback){
	getLanguageCoreJS('/api/langkey/js/', request, response);
});

/**
 * Api to get the translation as a json file specific to a language id
 *
 * @method GET /js/:languageid
 * @param request http request
 * @param response http response
 * @param callback callback function
 */
langkeyService.get('/js/:languageid', function(request, response, callback){
	if(request.pathGroup.indexOf('.js') != -1)
		request.pathGroup = request.pathGroup.substring(0, request.pathGroup.indexOf('.js'));
	
	getTranslationJS({langId:request.pathGroup, status:'active'}, request, response);
});

/**
 * @TODO Api to import translation from a bulk file.
 *
 * @method POST /import
 * @param request http request
 * @param response http response
 * @param callback callback function
 */
langkeyService.post('/import', function(request, response, callback){
	var langId = searchquery_.langId=langId;
	
	if(langId){
		callback('Will update the db soon');
	}else{
		callback("Please provide a valid language id");
	}
});

/**
 * Api to export translation.
 *
 * @method POST /export
 * @param request http request
 * @param response http response
 * @param callback callback function
 */
langkeyService.post('/export', function(request, response, callback){
	var searchquery = {};
	
	if(request.query && request.query.tag){
		if(typeof request.query.tag ==  'object')
			searchquery.tag = {$in : request.query.tag};
		else
			searchquery.tag = {$in : [request.query.tag]};
	}
	
	exportAllLangIdToJS(searchquery, function(){
		downloadLangkeyPackage(request, response, callback)
	});
});

/**
 * API to get download the translation in a zip file.
 * 
 * @method GET /download
 * @param request http request
 * @param response http response
 * @param callback callback function
 */
langkeyService.get('/download', function(request, response, callback){
	downloadLangkeyPackage(request, response, callback);
});

/**
 * API to get the inline editor 
 * 
 * @method GET /inlineeditor
 * @param request http request
 * @param response http response
 * @param callback callback function
 */
langkeyService.get('/inlineeditor', function(request, response, callback){
	if(request.query && request.query.key){
		var searchquery = {$or:[{key:request.query.key}, {id:request.query.key+(request.query.langId||'en')}]};
		
		langkeyService.search(searchquery, function(error, data){
			if(!data)
				data={id:'', key:request.query.key, translation:request.query.key, langId:request.query.langId||'en'};
			else if(data.length != undefined && data.length > 0)
				data =data[0];
			else
				data={id:'', key:request.query.key, translation:request.query.key, langId:request.query.langId||'en'};
			
			data.statuslist=langkeyService.statuslist;
			langkeyService.getServiceloader().getService('languageid').search({status:'active'}, function(error, languages){
				data.languages=languages;
				
				TemplateUtil.render(TEMPLATE_DIR + '/inlineeditor.html.ejs', data, function(error, replacecontent){
					if(typeof response == 'function')
						response(error, replacecontent);
					else
						response.send(200, null, replacecontent);
				});
			}, {}, {limit:'none'});
		}, {}, {limit:'none'});
	}else
		callback(null, {});
});

/**
 * API to get all translation done for translation key from the database.
 * 
 * @method API /translate
 * @param request http request
 * @param response http response
 * @param callback callback function
 */
langkeyService.get('/translate', function(request, response, callback){
	langkeyService.getServiceloader().invoke("langkey", "GET /$cmd/aggregate", request, callback);
}); 

/**
 * method to download the langkey packages to zip file.
 *
 * @method downloadLangkeyPackage
 * @private 
 * @param request http request
 * @param response http response
 * @param callback callback function
 */
function downloadLangkeyPackage(request, response, callback){
	var langpackdir = langkeyService.getPluginloader().getTempPath(langkeyService, langkeyService.plugin, 'langpack'),
		languagepack = util.getServerPath( langpackdir + '/language.tar.gz');
	
	if(fs.existsSync(languagepack)){
		response.setHeader('Content-disposition', 'attachment; filename=language.tar.gz');
		response.writeHead(200, { 'Content-Type': 'binary/octet-stream'});
		
		var rs = fs.createReadStream(languagepack);
		rs.pipe(response, function(){
			response.end();
		});
	} else
		callback('No language pack available for downloading!');
}

/**
 * To package the javascript files to be directly used inside the webapps, with out any backend.
 * 
 * @method packageJS
 * @private 
 * @param callback
 */
function packageJS(callback){
	var tempdir = langkeyService.getPluginloader().getTempPath(langkeyService, langkeyService.plugin, 'langkey'),
		langpackdir = langkeyService.getPluginloader().getTempPath(langkeyService, langkeyService.plugin, 'langpack');
	
	simpleportal.util.checkDirSync(langpackdir);
	
	var system_cmd = 'cd ' + tempdir + ' && tar -zcvf '+langpackdir+'/language.tar.gz .';
	
	exec(system_cmd, function (error, stderr, stdout) {
		callback(error, {stderr:stderr, stdout:stdout});
	});	
}

/**
 * To export all available language ids tranlsations.
 * 
 * @method exportAllLangIdToJS
 * @private 
 * @param searchquery 
 * @param callback
 */
function exportAllLangIdToJS(searchquery, callback){
	langkeyService.getServiceloader().getService('languageid').search({status:'active'}, function(error, languageids){
		var langIds = [],
			count = 0;
		if(languageids && languageids.length > 0){
			generateCoreJS(languageids, null, function(){
				if(languageids && languageids.length > 0)
					for(var index in languageids){
						langIds.push(languageids[index].languageid);
						
						exportLangIdToJS(languageids[index].languageid, searchquery, function(error){
							if(count++ == languageids.length-1)
								packageJS(callback);
						})	
					}
				else
					packageJS(callback);
			});
		}else 
			callack("No active language found");
	}, {languageid:1, display:1}, {limit:'none'});
}

/**
 * To generate the core js which need to be included in the html file for translation.
 * 
 * @method generateCoreJS
 * @private 
 * @param languageids 
 * @param langpath 
 * @param callback
 */
function generateCoreJS(languageids, langpath, callback){
	var tempdir = langkeyService.getPluginloader().getTempPath(langkeyService, langkeyService.plugin, 'langkey');
	
	util.deleteFolderRecursiveSync(tempdir);
	
	TemplateUtil.render(TEMPLATE_DIR + '/core.js.tmpl', {languagepath:langpath||'/langugae/', languageids:languageids}, function(error, replacecontent){
		util.checkDirSync(tempdir);
		
		fs.writeFileSync( tempdir + '/core.js', replacecontent);
		
		callback(null, replacecontent);
	});
}

/**
 * To export a specific langugae id translation to a file.
 * 
 * @method generateCoreJS
 * @private 
 * @param langId 
 * @param searchquery 
 * @param callback
 */
function exportLangIdToJS(langId, searchquery, callback){
	var searchquery_ = util.extendJSON({}, searchquery);
	searchquery_.langId=langId;
	var tempdir = langkeyService.getPluginloader().getTempPath(langkeyService, langkeyService.plugin, 'langkey');
	
	langkeyService.getStorageService().find(searchquery_, function(error, langkeydata){
		var langkeys = [];
		if(langkeydata  && langkeydata.results)
			langkeys = langkeydata.results;
		
		TemplateUtil.render(TEMPLATE_DIR + '/langkey.js.tmpl', {
			langId:langId, translations:langkeys
		}, function(error, replacecontent){
			util.checkDirSync(tempdir);
			
			fs.writeFileSync( tempdir + "/" + langId + '.js', replacecontent);
			
			callback(null, replacecontent);
		});
	});
}

/**
 * To get the language core js content using template.
 * 
 * @method getLanguageCoreJS
 * @private 
 * @param langpath 
 * @param request 
 * @param response
 */
var getLanguageCoreJS = function(langpath, request, response){
	langkeyService.getServiceloader().getService('languageid').search({status:'active'}, function(error, languageiddata){
		var languageids,
			count = 0,
			langIds = [];
		
		if(languageiddata){
			if(languageiddata && languageiddata.results)
				languageids = languageiddata.results;
			else if (typeof languageiddata.length == 'number')
				languageids = languageiddata;
			
			TemplateUtil.render(
				TEMPLATE_DIR + '/core.js.tmpl', 
				{
					languagepath:langpath||'/langugae/', languageids:languageids
				}, function(error, replacecontent){
					if(error)
						langkeyService.getLogger().error("langkey:getLanguageCoreJS", error);
					
//					langkeyService.getLogger().info("langkey:getLanguageCoreJS", replacecontent);
					
					response.send(200, { 'Content-Type': 'text/javascript'}, replacecontent);
				}
			);
		} else
			response.send(200, { 'Content-Type': 'text/javascript'}, '/** No translation active **/');
	}, {languageid:1, display:1, icon:1});	
};

/**
 * To get the translation as js file
 * 
 * @method getTranslationJS
 * @private 
 * @param searchquery 
 * @param request 
 * @param response
 */
var getTranslationJS = function(searchquery, request, response){
	var searchquery_ = util.extendJSON({}, searchquery);
	
	langkeyService.getStorageService().find(searchquery_, function(error, langkeydata){
		var langkeys = [];
		if(langkeydata  && langkeydata.results)
			langkeys = langkeydata.results;
		else
			langkeys = langkeydata;
		TemplateUtil.render(TEMPLATE_DIR + '/langkey.js.tmpl', {langId:searchquery.langId, translations:langkeys}, function(error, replacecontent){
			response.send(200, { 'Content-Type': 'text/javascript'}, replacecontent);
		});
	}, {}, {limit:'none'});
};

/**
 * To update the translation to the database.
 * 
 * @method updateTranslation
 * @private 
 * @param langkeyobj 
 * @param langId 
 * @param translation
 * @param callback
 */
var updateTranslation = function(langkeyobj, langId, translation, callback){
	var translationobject = util.extendJSON({}, langkeyobj, {langId:langId, translation:translation});

	delete translationobject.validationmessages;
	
	var id = langkeyService.getObjectId(translationobject);
		
	var savecallback = (function(_id, _translationobject, _callback){
		return function(error, data){
			if(error)
				console.trace(error);
			
			if(error || !data){
				_translationobject.id=_id;
				langkeyService.getStorageService().add_update({id:_id}, _translationobject, _callback);
			} else if(data && data.translation != _translationobject.translation){
				langkeyService.getStorageService().add_update({id:_id}, {translation:_translationobject.translation}, _callback);
			}else
				_callback();
		}
	})(id, translationobject, callback);
	
	if(id)
		langkeyService.getStorageService().findOne({id:id}, savecallback);
	else
		callback();
}

/**
 * To import the translation to the database.
 * 
 * @method _importTranslation
 * @private 
 * @param languageid 
 * @param translations 
 * @param callback
 * @param tags tags to be included in each translation
 */
var _importTranslation = function(languageid, translations, callback, tags){
	langkeyService.getLogger().debug("langkey:_importTranslation", "importing " + languageid);
	
	if(languageid && translations){
		var langkeys = Object.keys(translations);
		var cblangidkeys = 0;
		
		for(var lk in langkeys){
			var langobject = {
				key 		: langkeys[lk],
				langId 		: languageid,
				translation	: translations[langkeys[lk]],
				tags		: tags||[""],
				status		: "active"
			};
			
			updateTranslation(langobject, languageid, translations[langkeys[lk]], function(){
				// now check for total count and then callback
				if(cblangidkeys++ == langkeys.length-1){
					if(callback)callback();
				}
			});
		}
	} else{
		if(callback)callback();
	}
}

/**
 * To import the translation from a file to the database.
 * 
 * @method _importFromFile
 * @private 
 * @param filepath 
 * @param callback
 * @param options
 */
var  _importFromFile = function(filepath, callback, options){
	if(fs.existsSync(filepath)) {
		langkeyService.getLogger().debug("langkey:_importFromFile", filepath);
		
		try{
			var translations = require(filepath);
			
			var languages = Object.keys(translations);
			var localcount = 0;
			for(var i in languages) {
				var languageid = languages[i];
				var langidkeys = translations[languageid];
				
				localcount += Object.keys(langidkeys).length;
			}
			
			var searchquery = {};
			
			if(options && options.tags){
				if(typeof options.tags == "object" && typeof options.tags.length == "number" )
					searchquery = {tags:{$in:options.tags}};
				else
					searchquery = {tags:{$in:[options.tags]}};
			}
			
			// check for last modified time in adb to know whether it is imported or not
			
//			langkeyService.getStorageService().find({}, function(error, lastlangid){
//				console.log(lastlangid)
//			}, {sort:{_id:-1}}, {limit:1});
			
//			db.<collection>.find().sort({'_id': -1}).limit(1) 
			
			langkeyService.getStorageService().count(searchquery, function(error, count){
//				console.log(JSON.stringify(searchquery) + ">> " + count);
				if(count < localcount){
					var cblccount = 0;
					for(var i in languages){
						var languageid = languages[i];
						_importTranslation(languageid, translations[languageid], function(){
							if(cblccount++ == languages.length -1){
								langkeyService.getLogger().debug("langkey:_importFromFile", "finished importing "+cblccount+ " translations from -" + languageid);
								
								callback();
							}
						}, options.tags);
					}
				}else{
					langkeyService.getLogger().debug("langkey:_importFromFile", "Skipping update as the langkey database already containes translations.");
					
					if(callback)
						callback();	
				}
			});
		}catch(error){
			langkeyService.getLogger().error("langkey:_importFromFile", error);
			
			if(callback)
				callback();
		}
		
	}else if(callback)
		callback("no file found to to import -" + filepath);
}

langkeyService.on("import", function(options){
	if(options && options.filepath){
		_importFromFile(options.filepath, function(){
			langkeyService.getLogger().debug("langkey:@event[import]", "finished import translation file  "+options.filepath+" in to the langkey service");
		}, options);
	}
});

langkeyService.on("startup", function(){
//	langkeyService.getStorageService().clear(function(){});
	langkeyService.emit("import", {filepath: simpleportal.rootdir+ "/server/translation.json", tags:["system"]});
	langkeyService.emit("import", {filepath:util.getServerPath("translation.json"), tags:["server"]});
	
	// let us check the files inside plugins
	var webapps = langkeyService.getPluginloader().getPlugins("webapp");
	for(var windex in webapps){
		var pluginsetting = webapps[windex];
		
		if(!pluginsetting.disabled && pluginsetting.id != "sp-langbuilder"){
			langkeyService.emit("import", {filepath : pluginsetting.installeddir + ("/translation.json"), tags:[ pluginsetting.id ]});
		}
		
		// let us include the dynamic js and css dependancies in to the webappsetting
		if(!pluginsetting.disabled && pluginsetting.webappsetting){
			langkeyService.getLogger().debug(langkeyService.name + ":loadDependancies", "Including lang key in to the router dependencies list");
			
			if(pluginsetting && pluginsetting.webappsetting 
					&& langkeyService.getServerInstance().getConfiguration("translation") 
					&& pluginsetting.id != langkeyService.plugin) {
				
				if(!pluginsetting.webappsetting.dependencies)
					pluginsetting.webappsetting.dependencies = [ langkeyService.plugin ];
				else
					pluginsetting.webappsetting.dependencies.push(langkeyService.plugin);
				
				langkeyService.getPluginloader().pluginChanged(pluginsetting.id);
			}
		}
	}
});

/*
 * Exporting the language key service.
 */
module.exports = langkeyService;