"use strict"

var simpleportal = require("simpleportal"),
	fs = require("fs"),
	lwip = require('lwip'),
	Util = require("./lib/util");

/*
 * Creating the CRUD Service for service user and using user as the 
 * collection name.
 */
var mediadirService = new simpleportal.Service.CRUDService({
	collection:'mediadir',
	name:'mediadir', modify:true,
	primaryKeyFields:['pathhash'],
	model:{
		title : "",
		photoalbum:false,
		path : "", 
		pathhash :"", 
		mediafiles:'',
		status:'default'
	}, configuration: {
		modelsettings: {
			"thumbnail":{disabled:true},
			"mediafiles":{
				"field":"mediafiles", "fieldplugin":"dropzone", "upload-url":"upload", "displayoptions":{
					"acceptedFiles":".jpg,.png,.jpeg", "clickable":true
				}
			}
		}, 
		modelaction:[
 		    {
 				action:'photos', display:'photogallery', method:'get'
 			}, {
 				action:'cleanup'
 			}
 	    ]
	}, servicetemplates:{photos:"photos", photoalbum:"photoalbum"}
});

mediadirService.get("/photoalbum", function(request, response, callback){
	if(request && request.query && request.query.template)
		request.servicetemplate = request.query.template;
	
	aggregatePhotos({photoalbum:true}, mediadirService.serviceCallback(callback, "photoalbum", "photoalbum", request, response));
});

mediadirService.get("/:id/photos", function(request, response, callback){
	if(request && request.query && request.query.template)
		request.servicetemplate = request.query.template;
	
	aggregatePhotos({$or:[{pathhash:request.pathGroup}, {path:request.pathGroup}, {id:request.pathGroup}]}, mediadirService.serviceCallback(callback,
			"photos", "photos", request, response));
	
});

var aggregatePhotos = function(searchquery, callback){
	var aggregateQuery = [
      {
    	  $match:searchquery
      }, 
      {
    	  $lookup:
    	  	{
    		  from: "photogallery",
    		  localField: "pathhash",
    		  foreignField: "folder",
    		  as: "photos"
    	  	}
      }, {
    	  $project: {
    		  "photos.file":1, "photos.size":1, "photos.id":1, "photos.display":1, "photos.displayTitle":1, "photos.caption":1, "photos.thumbnail":1, title:1, id:1, thumbnail:1, uri:{$concat:["$uri", "/", "$path"]}
    	  }
      }
    ];
	
	mediadirService.getStorageService().aggregate(
		{pipeline:aggregateQuery}, callback
	);
}

mediadirService.post("/:id/cleanup", function(request, response, callback){
	//get all files and search for files with in the folder and if not found delete frommthe db.
	mediadirService.details(request.pathGroup, function(error, mediafolder){
		var mediapath = mediafolder.uri + '/' + mediafolder.path;
		var pluginuri = '/' + mediafolder.uri.split("/")[1];
		
		var plugin = mediadirService.getPluginloader().getPluginDetails(pluginuri, "webapp");
		if(plugin && plugin.installeddir){
			mediapath = mediapath.replace(pluginuri, plugin.installeddir + '/html5');
			
			var removedfiles = []; 
			
			aggregatePhotos({id:mediafolder.id}, function(error, photoresponse){
				if(photoresponse && photoresponse.length > 0){
					for(var i in photoresponse[0].photos){
						var photfile = photoresponse[0].photos[i];
						var photopath  = mediapath + photfile.file;
						
						if(!fs.existsSync(photopath)){
							removedfiles.push(photfile.id);
						}
					}
				}
				if(removedfiles.length > 0)
					mediadirService.getServiceloader().getService("photogallery").getStorageService().remove({id:{$in:removedfiles}}, callback);
			});
		}else
			callback("no valid path found with media folder.");
	});
})

mediadirService.post("/:id/upload", function(request, response, callback){
	mediadirService.details(request.pathGroup, function(error, mediafolder){
		// now check you have plugin with uri mentioned
		if(mediafolder.uri){
			var mediapath = mediafolder.uri + '/' + mediafolder.path;
			var pluginuri = '/' + mediafolder.uri.split("/")[1];
			
			var plugin = mediadirService.getPluginloader().getPluginDetails(pluginuri, "webapp");
			if(plugin && plugin.installeddir){
				mediapath = mediapath.replace(pluginuri, plugin.installeddir + '/html5');
				
				// name of the file field
				var uploadedfile = request.files.file;
				if(uploadedfile){
					if(!fs.existsSync(mediapath + '/' + uploadedfile.originalFilename)){
						fs.createReadStream(uploadedfile.path).pipe(fs.createWriteStream(mediapath + '/' + uploadedfile.originalFilename));

						mediafolder.path = mediapath;
						mediadirService.emit("sync.dir", {servicemodel:mediafolder});
						
						callback(null, {title:uploadedfile.name});
					} else if(fs.existsSync(mediapath + '/' + uploadedfile.originalFilename))
						callback("A file named - " + uploadedfile.originalFilename + " exists in the folder.");
				}
			}
		}else
			callback(null, request.files.file)
	});
});

/**
 * To update the last sync date
 */
mediadirService.updateSyncDate = function(id, callback) {
	mediadirService.details(id, function(error, mediafolder){
		var updateobject = {id:id, syncdate:new Date()};
		if(!mediafolder.thumbnail)
			updatePhotoAlbumThumbnail(mediafolder, function(error, thumbnail){
				if(!error)
					this.updateobject.thumbnail = "/" + id + ".png";
				
				mediadirService.getStorageService().add_update({id:this.id}, this.updateobject, callback);
			}).bind({id:id, mediafolder:mediafolder, updateobject:updateobject});
		else
			mediadirService.getStorageService().add_update({id:id}, updateobject, callback);
	});
}

mediadirService.on("startup", function(){
	mediadirService.getServiceloader().getService("photogallery").on("sync.dir", function(syncinfo){
		if(syncinfo && syncinfo.options && syncinfo.options.id) {
			mediadirService.updateSyncDate(syncinfo.options.id, function(error, mediafolder){
//				updatePhotoAlbumThumbnail(mediafolder, function(){});
			});
		}
	})
	
	// get all plugins and search for plugins that have mediagallery enabled
	var pluginwithmediagallery = mediadirService.getPluginloader().getPlugins('webapp').filter(function(plugin){
		return plugin.preference && plugin.preference.mediagallery;
	});
	
	var localdirs = [];
	for(var i in pluginwithmediagallery){
		var pluginsetting = pluginwithmediagallery[i];
		
		updatePluginLocalDir(pluginsetting);
	}
});

var _getThumbnailFiles = function(folder, filecount, callback){
	if(typeof filecount == 'function')
		callback = filecount;
	
	if(!filecount || typeof filecount == 'function')
		filecount = 4;
	
	if(!fs.existsSync(folder))
		callback('No folder exists');
	else
		fs.readdir(folder, function(error, files){
			var thumbfiles = files.filter(function(file, index){return file.indexOf(".") != 0 && index<filecount;});
			
			callback(error, thumbfiles);
		});
};

var appendImage = function(x, y, image, thumbfile, callback){
	console.log(thumbfile);
	
	lwip.open(thumbfile, function(err, thumbimage){
		if(thumbimage) {
			image
				.paste(x, y, thumbimage);
			
			callback(null, image, x, y, thumbfile);
		} else {
			console.log("------ ******** ------");
			console.log(thumbfile);
			console.log(err);
			console.log("------ ******** ------");
			callback(err||'Image not found.', image);
		}
	});
};

var appendThumbnail = function(gallerybatch, mediafolder, thumbfiles, callback){
	var tempmediapath = mediadirService.getPluginloader().getTempPath(null, mediafolder.uri + '/' + mediafolder.path),
		cbc=0, matsize=2, r=0, c=0, width=100;
	
	for(var i in thumbfiles) {
		console.log( (r)*width + ":> appending -> " + (c)*width )
		
		appendImage((r)*width, (c)*width, gallerybatch, tempmediapath + '/thumbnails/' + thumbfiles[i], function(error, gallerybatch, xx, yy, tf){
			console.log( tf + ":> appended -> " + xx + ":" + yy )
			if(cbc++ == thumbfiles.length-1) {
				gallerybatch
					.resize(100, 100)
					.writeFile(tempmediapath + '/' + mediafolder.id + '.png', callback);
			}
		});
		
		if(c++ == matsize-1){
			r++; c=0;
		}
		
//		if(i%2== 0){
//			x=100;y=0;
//		} else{
//			x=100;y=100;
//		}
	} 
};

/**
 * To group thumbnails
 * @method groupThumbnails
 * @param mediafolder
 * @param thumbfiles list of files to include in the folder
 * @param callback callback function
 * 
 */
var groupThumbnails = function(mediafolder, thumbfiles, callback){
	var width = 100*(Math.floor(thumbfiles.length/2)),
		height = 100*(Math.floor(thumbfiles.length/2));

	// calculate the new file width
	lwip.create(width, height, function(error, gallery) {
		var gallerybatch = gallery.batch();
		
		appendThumbnail(gallerybatch, mediafolder, thumbfiles, callback);
	});
}

var updatePhotoAlbumThumbnail = function(mediafolder, callback){
	if(!mediafolder || !mediafolder.path)
		callback('Not a valid media folder');
	else{
		var tempmediapath = mediadirService.getPluginloader().getTempPath(null, mediafolder.uri + '/' + mediafolder.path);
		
		_getThumbnailFiles(tempmediapath + "/thumbnails", function(error, thumbfiles){
			if(thumbfiles && thumbfiles.length == 1){
				var extension = thumbfiles[0].substring(thumbfiles[0].lastIndexOf("."));
				
				fs.createReadStream(tempmediapath + "/thumbnails/" + thumbfiles[0]).pipe(fs.createWriteStream(tempmediapath + '/' + mediafolder.id + extension));
				callback(null, tempmediapath + '/' + mediafolder.id + extension);
			} else if(thumbfiles && thumbfiles.length >= 4){
				// group 4 thumbnail and form a single file
				groupThumbnails(mediafolder, thumbfiles, callback);
			}
		});
	}
}

function updatePluginLocalDir(pluginsetting, options){
	var plugingallerydir = simpleportal.util.appendFilePath(pluginsetting.installeddir, "html5/mediagallery");
	options = options||{};
	options.title = pluginsetting.title;
	
	Util.getLocalSubDirs([plugingallerydir], options, function(error, localdirs){
		if(localdirs)
			for(var dirindex in localdirs){
				updateLocalDir(plugingallerydir, localdirs[dirindex], pluginsetting);
			}
	});
}

function updateLocalDir(plugingallerydir, localdirinfo, pluginsetting){
	localdirinfo.id = localdirinfo.pathhash;
	if(pluginsetting && pluginsetting.webappsetting && pluginsetting.webappuri)
		localdirinfo.uri = pluginsetting.webappuri + "/mediagallery";
	
	mediadirService.getStorageService().add_update({id:localdirinfo.pathhash}, localdirinfo, function(error, savedmediadir){
		savedmediadir.path = plugingallerydir + "/" + savedmediadir.path;
		
		mediadirService.emit("sync.dir", {servicemodel:savedmediadir});
		// now search for files inside the media dir.
	});
}

module.exports = mediadirService;