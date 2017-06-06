"use strict"

var simpleportal = require("simpleportal"),
	fs=require("fs"), 
	path=require("path"),
	lwip = require('lwip'),
	Util=require("./lib/util");

/*
 * Creating the CRUD Service for service user and using user as the 
 * collection name.
 */
var photogalleryService = new simpleportal.Service.CRUDService({
	collection:'photogallery',
	name:'photogallery', modify:true,
	primaryKeyFields:["pathhash"],
	model:{
		title:"",
		path:"",
		file:'',
		thumbnail:'',
		displayTitle:'',
		caption:'',
		version:'', 
		pathhash:"",
		folder:"",
	}, configuration: {
		modelsettings: {
			"file":{display:'hidden', disabled:true},
			"thumbnail":{display:'hidden', disabled:true},
			"pathhash":{display:'hidden',disabled:true}
		}
	}, preferencesetting:{
		fileextension:"png|jpg",
		localdirs:['']
	}
});

photogalleryService.on("startup", function() {
//	photogalleryService.getStorageService().clear(function(){});
	
	photogalleryService.getServiceloader().getService("mediadir").on("sync.dir", function(syncoptions){
		if(syncoptions && syncoptions.servicemodel)
			syncPhotos(syncoptions.servicemodel.path, syncoptions.servicemodel, function(){});
	});
	
//	photogalleryService.on("sync.file", function(syncoptions){
//		if(syncoptions && syncoptions.servicemodel)
//			syncPhotos(syncoptions.servicemodel.path, syncoptions.servicemodel, function(){});
//	});
});

var createThumbnail = function(mediafolder, photofile, callback){
	if(!mediafolder || !mediafolder.path || !photofile || !photofile.file	)
		callback("Not a valid photo file.");
	else{
		var tempmediapath = photogalleryService.getPluginloader().getTempPath(null, mediafolder.uri + "/" + mediafolder.path.substring(mediafolder.path.indexOf("/mediagallery/") + 14) + "/thumbnails");
		
		lwip.open(mediafolder.path + photofile.file, function(err, image){
			if(err)
				callback(err);
			else {
				image.resize(100, 100, function(error, thumbnail) {
					if(error)
						callback(error);
					else {
						simpleportal.util.checkDirSync(tempmediapath);
						
						var extension = '.png';//photofile.file.substring(photofile.file.lastIndexOf("."));
						
						thumbnail.writeFile(tempmediapath + "/" + photofile.id + extension, 'png', function(error, savedthumbnail){
							callback(error, savedthumbnail);
						});
					}
				});
				
			}
		});
	}
}

// update the photo and also update the thumbnail status
var updatePhoto = function(mediafolder, mediafile, callback){
	createThumbnail(mediafolder, mediafile, function(error, thumbnail){
		var extension = '.png';//mediafile.file.substring(mediafile.file.lastIndexOf("."));
		
		if(!error)
			mediafile.thumbnail = "/thumbnails/" + mediafile.id + extension;
		
		photogalleryService.getStorageService().add_update({id:mediafile.id}, mediafile, function(error, photofile){
			// update the thumbnail if not available in the temporary folder.
		});
	});
}

var syncPhotos = function(localdir, options, callback){
	var _options = {fileextension:photogalleryService.getPreference("fileextension")};
	if(options && options.syncdate)
		_options.mtime = options.syncdate;
		
	Util.scanLocalDir(localdir, _options, function(error, mediafiles){
		// let us sync the data to the photgallery now
		if(mediafiles) {
			for(var mfi in mediafiles) {
				updatePhoto(options, mediafiles[mfi], function(){});
			}
			
			// after search update the sync info back to the media directory.
			photogalleryService.emit("sync.dir", {localdir:localdir});
		}
	});
};

module.exports = photogalleryService;