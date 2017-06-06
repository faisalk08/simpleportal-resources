var simpleportal = require("simpleportal"),
	util = require("simpleportal/lib/util"),
	fs = require("fs");

/**
 * API to handle language ids required for internationalization.
 * 
 * @class API Languageid
 * @extends CRUDService
 * @module languagebuilder
 * 
 * @static
 */
var languageidService = new simpleportal.Service.CRUDService({
	collection:'langageids', 
	name:'languageid', modify:true,
	primaryKeyFields:['languageid'],
	model:{
		languageid:"",
		display:"",
		icon:"",
		status:"default",
		iconpath:""
	},validation:{
		languageid:"required",
		display:"required",
		icon:"required",
	},configuration:{
		modelsettings:{
			status:{url:'/api/languageid/status', display:'display', id:'id', multiple:false},
			icon:{fieldplugin:'iconpicker', displayoptions:{iconset:'flagicon', showlabel:true}}
		}
	}	
});

/**
 * Api to get the icon
 *
 * @method POST /icon
 * @param request http request
 * @param response http response
 * @param callback callback function
 */ 
languageidService.post('/icon', function(request, response, callback){
	callback(null, {path:request.files.file.path})
});

/**
 * Api to get the active language ids
 *
 * @method GET /active
 * @param request http request
 * @param response http response
 * @param callback callback function
 */ 
languageidService.get('/active', function(request, response, callback){
	languageidService.search({status:'active'}, callback);
});

/**
 * Api to get all the language ids except the one which is not archived
 *
 * @method GET /active
 * @param request http request
 * @param response http response
 * @param callback callback function
 */ 
languageidService.get('/', function(request, response, callback){
	languageidService.search({status:{$ne:'archived'}}, callback);
});


languageidService.beforeSave = function(data, callback){
	if(data.iconpath&&data.iconpath!=''){
		if(fs.existsSync(data.iconpath))
			fs.readFile(data.iconpath, function(err, original_data){
			    var base64Image = new Buffer(original_data, 'binary').toString('base64');
			    
			    data.icontext=base64Image;
			    
			    callback(null, data);
			});
		else
			callback(null, data);
	}else
		callback(null, data);
};

/**
 * @method langIdsFromISOJSON to get the language ids from ISO json file
 * @param callback callback function 
 * @param disable if disabled iso file wont be downloaded.
 */
languageidService.langIdsFromISOJSON = function(callback, disable){
	var isojsonpath = languageidService.getPluginloader().getDataDirectory({plugintype:'webapp', id:languageidService.plugin}, "iso_639-2.json");
	if(fs.existsSync(isojsonpath)){
		var isojson = util.readJSONFile(isojsonpath);
		
		//languageidService.getStorageService().clear(function(){});
		languageidService.getStorageService().count({}, function(erro, dbcount){
			var langids = Object.keys(isojson),
				totcount = langids.length,
				langobjects=[],
				count =0;
			
			if(dbcount >= totcount){
				languageidService.getLogger().info('languageid:langIdsFromISOJSON', 'Skipping data import from json as database has more data than the json!');
				if(callback)callback();
			} else{
				var langids = Object.keys(isojson),
					langobjects=[],
					totcount = langids.length,
					count =0;
				
				for(var index in langids){
					var langid = langids[index];
					var lang = isojson[langid];
					
					var langobj = {languageid:langid, display:lang.int, native:lang.native};

					if(lang.int.length == 1)
						langobj = {languageid:langid, display:lang.int[0], native:lang.native[0]};
					
					if(langid.length  == 2){
						langobj.status='active';
						langobj.iso='639-1';
					}else if(langid.length == 3 && (lang.int.length == 1 && lang.native.length == 1) && langobj.display.toLowerCase().substring(0,3) == langid)
						langobj.iso='639-2/T';
					else if(langid.length == 3 && (lang.int.length == 1 && lang.native.length == 1) && langobj.native.toLowerCase().substring(0,3) == langid)
						langobj.iso='639-2/B';
					else if(langid.length == 3)
						langobj.iso='639-2/B';
					else if(lang.int.length > 1)
						langobj.status='default';
					
					if(langobj.iso != '639-1')
						langobj.status='archived';
					else
						langobj.status='imported';
					
					langobj.id=langid;
					
					languageidService.getStorageService().add_update({id:langid}, langobj, function(error){
						if(count++ == totcount-1)
							if(callback)callback();
					});
				}
			}
		});
	}else if(!disable) {
		var pluginsetting = languageidService.getPluginloader().getPluginDetails(languageidService.plugin, 'webapp');
		var isojsonconfig = simpleportal.util.getJSONObject(pluginsetting.resources);
		
		if(isojsonconfig && isojsonconfig.downloadlink){
			languageidService.getPluginloader().installDependencies(pluginsetting, function(error, data){
				if(error)
					callback();
				else
					languageidService.langIdsFromISOJSON(callback, true);
			}, isojsonconfig)
		}
	} else
		callback('No JSON file available');
}

languageidService.on("afterupdate", function(){
	updateServerConfig();
});

languageidService.on("startup", function(configuration){
	languageidService.langIdsFromISOJSON(function(){
		// set the languages in to the configuration
		// let us activate the languages as well
		var languages = ['en'];
		for(var i in languages){
			var languageid = languages[i];
			languageidService.getStorageService().findOne(
				{languageid:languageid, status:'imported'}, function(error, data){
					if(data){
						languageidService.getStorageService().add_update({id:data.id}, {id:data.id, status:'active', icon:'flag-icon flag-icon-'+ (data.languageid == "en" ? "gb" : data.languageid) }, function(){});
					}
				}
			);
		}
		
		updateServerConfig();
	});
});

/**
 * To update the server config with the active language ids so that systemwide template can use it.
 * @method updateServerConfig
 * @private
 */
var updateServerConfig = function(){
	languageidService.search({status:'active'}, function(error, languageiddata){
		languageidService.getLogger().info("langugaeid:@startup", "updating the langugaes in to the server configuration");
		
		languageidService.getServerInstance().setConfiguration("languages", languageiddata.results);
	});
}

/*
 * Exporting the language id service.
 */
module.exports = languageidService;