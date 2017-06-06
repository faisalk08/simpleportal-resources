"use strict"

var simpleportal = require("simpleportal"),
	FFmpeg = require('fluent-ffmpeg'),
	crypto = require('crypto'), 
	fs=require("fs"), 
	path=require("path"),
	Template=require("simpleportal/lib/util/template");

/*
 * Creating the CRUD Service for service user and using user as the 
 * collection name.
 */
var videogalleryService = new simpleportal.Service.CRUDService({
	collection:'videogallery',
	name:'videogallery', modify:true,
	primaryKeyFields:['title'],
	model:{
		title:"",
		path:"",
		thumbnail:'',
		description:'',
		version:'', pathhash:""
	}, configuration:{
		modelsettings:{
			"thumbnail":{disabled:true},
			"pathhash":{disabled:true}
		}, 
		modelaction:[
		    {
				action:'videoplayer', url:'/view/videogallery', display:'videoplayer', method:'get'
			}
	    ]
	}, preferencesetting:{
		fileextension:"avi|AVI|wmv|WMV|flv|FLV|mpg|MPG|mp4|MP4|mov|avi|mpeg",
		filefilter:'^.*\.(avi|AVI|wmv|WMV|flv|FLV|mpg|MPG|mp4|MP4|mov|avi|mpeg)$',
		localdirs:['']
	}, servicetemplates:{videoplayer:"videoplayer"}
});

videogalleryService.get("/:id/stream", function(request, response, callback){
	videogalleryService.details(
		request.pathGroup,
		function(error, videofile){
			if(error)
				callback(error);
			else
				streamVideo(videofile, request, response, callback);
		}
	);
});

videogalleryService.get("/:id/thumbnail", function(request, response, callback){
	videogalleryService.details(
		request.pathGroup,
		function(error, videofile){
			if(error)
				callback(error);
			else
				_sendThumbnail(videofile, request, response, callback);
		}
	);
});

videogalleryService.post("/:id/videoplayer", function(request, response, callback){
	videogalleryService.details(
		request.pathGroup,
		videogalleryService.serviceCallback(callback, "videoplayer", "videoplayer", request, response)
	);
});

videogalleryService.get("/:id/videoplayer", function(request, response, callback){
	videogalleryService.details(
		request.pathGroup,
		videogalleryService.serviceCallback(callback, "videoplayer", "videoplayer", request, response)
	);
});

videogalleryService.on("afterupdate", function(eventdata){
	if(eventdata.servicemodel){
		_createThumbnail(eventdata.servicemodel, function(error, data){
			videogalleryService.getStorageService().update({_id:eventdata.servicemodel._id}, data, function(error, updateddata){
				console.log(updateddata);
			});
		});
	}
});

videogalleryService.on("startup", function(){
//	simpleportal.util.readJSONFile(__dirname+ '/../localfiles.json', function(error, videolist){
//		var stats = fs.statSync(__dirname+ '/../localfiles.json');
//		
//		videogalleryService.getStorageService().findOne({}, function(error, topvideo){
//			if(!topvideo || topvideo.created_at <= stats.mtime)
//				videogalleryService.getStorageService().save(videolist, function(error, datalist){
//					console.log(datalist);
//				});
//		});
//	});
	
//	var localdirs = videogalleryService.getPreference('localdirs');
//	if(localdirs)
//		localdirs = localdirs.filter(function(localdir){return localdir && localdir!='';})
//	
//	scanLocalDirs(localdirs, false, function(error, videolist){
//		if(videolist && videolist.length > 0)
//			for(var i in videolist){
//				videogalleryService.getStorageService().add_update({id:videolist[i].id}, videolist[i], function(error, datalist){
//					console.log(datalist);
//				});
//			}
//	});
});

/**
 * Sends a static file to the HTTP client, supporting partial transfers.
 * 
 * @req HTTP request object
 * @res HTTP response object
 * @fn Path to file that should be sent
 * @contentType MIME type for the response (defaults to HTML)
 */      
function sendFile(req, res, fn, contentType) {

  contentType = contentType || "text/html";
  fn = path.normalize(fn);
 
  console.log('Sending video file - '+ fn);
  
  fs.stat(fn, function(err, stats) {
    var headers;
//    console.log(stats);
    
    if (err) {
      res.writeHead(404, {"Content-Type":"text/plain"});
      res.end("Could not read file");
      return;
    }

    var range = req.headers.range || "";    
    var total = stats.size;

//    console.log('Senindg video file - ' + range + ' --- ' + total + ' >>>> ' + contentType);
    
    if (range) {
    	var parts = range.replace(/bytes=/, "").split("-");
      	var partialstart = parts[0];
      	var partialend = parts[1];

      	var start = parseInt(partialstart, 10);
      	var end = partialend ? parseInt(partialend, 10) : total-1;

      	var chunksize = (end-start)+1;

      	headers = { 
    		  "Content-Range": "bytes " + start + "-" + end + "/" + total, 
    		  "Accept-Ranges": "bytes", 
    		  "Content-Length": chunksize, 
    		  "Content-Type": contentType 
      	};
      
      	res.writeHead(206, headers);
    } else {
    	headers = { 
    			"Accept-Ranges": "bytes", 
    			"Content-Length": stats.size, 
    			"Content-Type": contentType 
    	};
    	res.writeHead(200, headers);
	}

    var readStream = fs.createReadStream(fn, {start:start, end:end});
    readStream.pipe(res);
  });
}

var streamVideo = function(videofile, request, response){
	if(typeof videofile == 'object')
		if(videofile && videofile.path){
			var contentType = 'video/mp4';
			
			if(simpleportal.util.getExtension(videofile.path) == '.mpg')
				contentType ='video/mpeg';
			else if(simpleportal.util.getExtension(videofile.path) == '.avi')
				contentType ='video/x-msvideo';
			else if(simpleportal.util.getExtension(videofile.path) == '.flv')
				contentType ='video/x-flv';
			
			sendFile(request, response, videofile.path, contentType);
		}else{
			var templateProcess = new Template({file:__dirname + '/../templates/error.ejs', data:{message:'No Video found with Id - ' +id}}); 
			templateProcess.render(function(error, html){
				var mainTemplateProcess = new Template({file:__dirname + '/../templates/template.ejs', data:{content:html}});
				mainTemplateProcess.render(response);
			});
		}
	else if (typeof videofile == 'string')	
		videogalleryService.getStorageService().details(id, function(error, videofile){
			if(error){
				var templateProcess = new Template({file:__dirname + '/../templates/error.ejs', data:{message:'No Video found with Id - ' +id}}); 
				templateProcess.render(function(error, html){
					var mainTemplateProcess = new Template({file:__dirname + '/../templates/template.ejs', data:{content:html}});
					mainTemplateProcess.render(response);
				});
			}else
				streamVideo(videofile, request, response); 
		});
	else
		callback("No video found with the given data.")
}

var _sendThumbnail = function(localfile, request, response, callback){
	if((!localfile || !localfile.thumbnail) && localfile.id)
		callback("Required data missing for sending thumbnail.");
	else{
		var thumbnailpath = videogalleryService.getDataDirectory("thumbnail", localfile.id, localfile.thumbnail.replace(".png", "_1.png"));
//		console.log(localfile.id + '-->' + localfile.thumbnail + '-->'+ thumbnailpath);
//		console.log(localfile);
		
		fs.stat(thumbnailpath, function(error, stats){
			if(!stats || error ){
				if(localfile.id)
					_createThumbnail(localfile, function(error, thumbnailprops){
//						console.log(thumbnailprops);
						if(thumbnailprops && thumbnailprops.thumbnail){
							_sendThumbnail(thumbnailprops, request, response, callback);
						} else {
							var rstream = fs.createReadStream(__dirname + '/../resources/thumbnail/120x120.png');
							rstream.pipe(response);
						}
					});
				else {
					var rstream = fs.createReadStream(__dirname + '/../resources/thumbnail/120x120.png');
					rstream.pipe(response);
				}	
			} else if(stats.isFile()){
				var rstream = fs.createReadStream(thumbnailpath);
				rstream.pipe(response);
			} else {
				var rstream = fs.createReadStream(__dirname + '/../resources/thumbnail/120x120.png');
				rstream.pipe(response);
			}	
		});	
	}
}

var _createThumbnail = function(localfile, callback){
	if(!localfile.id)
		callback("No thumbnail found."	);
	else {
		var thumbnailname = getHash(path.basename(path.dirname(localfile.path)));
		var thumbfolder = videogalleryService.getDataDirectory("thumbnail", localfile.id);
		
		var filepath = simpleportal.util.appendFilePath(thumbfolder, thumbnailname + '.png');
		
		var thumbnailpath = thumbnailname + '.png';
		
		if(fs.existsSync(localfile.path)){
			fs.stat(filepath, function(error, stats){
				if(!stats || error){
					// create the flder if not exists
					simpleportal.util.checkDirSync(thumbfolder);
					videogalleryService.getLogger().info('videogallery:_createThumbnail', thumbfolder + ' --- >>'+ thumbnailname);
					
					try{
						FFmpeg(localfile.path)
						.screenshots(
							{
								// Will take screens at 20%, 40%, 60% and 80% of the video
								size:'120x120',
								filename: thumbnailname,
								count: 1,
								folder: thumbfolder,
								timemarks: [ '00:00:01.000', '6' ]
							}
						);
						
						if(callback)
							callback(null, {thumbnail:thumbnailpath});
					}catch(error){
						console.error(error);
						videogalleryService.getLogger().error('videogallery:_createThumbnail'+ filepath + ' --- '+ localfile.path, error);
					
						if(callback)callback();
					}
				} else if(callback)
					callback(error, {thumbnail:thumbnailpath});
			});
		}else
			callback("No file found with -" + localfile.path);
	}
}

//var __store = function(){
//	var instance = this;
//	
//	fs.writeFileSync(instance.options.localfile, JSON.stringify(instance.localfiles, null, '\t'));
//}

videogalleryService.localfiles=[];
videogalleryService.localdirs=[];

var scanLocalDirs = function(localdirs, reload, callback){
	var cbcount = 0;
	if(typeof reload == 'function'){
		callback = reload;
		reload=false;
	}	 
	
	var localfiles = [],
		errors=[];
	
	for(var i in localdirs)
		scanLocalDir(localdirs[i], reload, function(error, dirlocalfiles){
			if(dirlocalfiles && dirlocalfiles.length > 0)
				localfiles = localfiles.concat(dirlocalfiles);
			
			if(error)
				errors.push(error);
			
			if(cbcount++ == localdirs.length-1)
				callback(errors, localfiles);
		});
}

videogalleryService.scanLocalDir = function(localdir, syncdate, callback){
	// console log udpate the scan directry.
	console.log("get files which is modified from the given sync date -- > " + syncdate);
} 
	
var scanLocalDir = function(localdir, reload, callback){
	if(typeof reload == 'function'){
		callback = reload;
		reload=false;
	}
	
	if(reload && videogalleryService.localdirs[localdir])
		delete videogalleryService.localdirs[localdir];
	
	var localfiles = [];
	
	console.log("scanning -->" + localdir + fs.existsSync(localdir));
	
	if(fs.existsSync(localdir) && !videogalleryService.localdirs[localdir]) {
		var folderhash = simpleportal.util.getHash(localdir);
		
		simpleportal.util.getFileList(localdir, {datadisplay:'title', hash:true, folder:folderhash, root:localdir, includeroot:false, extension:videogalleryService.getPreference('fileextension')}, function(error, filelist){
			console.log(folderhash);
			console.log("file list");
			console.log(filelist);
			
			if(callback)
				callback(null, filelist);
			else
				return filelist;
		});
		
//		var dirlocalfiles = fs.readdirSync(localdir).filter(function(file){
//			return !/^\./.test(file);
//		});
		
//		var cbcount = dirlocalfiles.length;
//		dirlocalfiles.forEach(function(filename){
//			var localfile = localdir + '/' + filename;
//			
//			var filefileter = new RegExp(videogalleryService.getPreference('filefilter'));
//			//if(fs.statSync(localfile).isFile()){
//			if(filename.indexOf('.') != 0 && filefileter.test(filename)){
//				var thumbnailname = getHash(path.basename(path.dirname(localfile)));
//				var videofile = {id : getHash(filename), path:path.normalize(localfile), title:filename};
//				
//				videofile.thumbnail = thumbnailname + '.png';// + thumbnailname + '.png';
////				'thumbnail/' + foldername + '/' + videofile.id +'.png';
//				
////				if(!simpleportal.util.jsonarraycontains(localfiles, 'id', videofile.id)){
//				localfiles.push(videofile);
//				
////				_createThumbnail(videofile, function(error, data){});
////				}
//			}else if(fs.statSync(localfile).isDirectory()){
//				var sublocalfiles = scanLocalDir(localfile, reload);
//				
//				if(sublocalfiles && sublocalfiles.length > 0)
//					localfiles = localfiles.concat(sublocalfiles);
//			}
//			
//			if(cbcount-- == 1){
//				if(callback)
//					callback(null, localfiles);
//				else
//					return localfiles;
//			}	
//		});
		
	} else if(fs.existsSync(localdir) && callback)
		callback("No directory found -" + localdir, localfiles);
	else if(callback)
		callback("Directory already scanned -" + localdir, localfiles);
	else
		return [];
}

var getHash = function(name){
	return crypto.createHash('md5').update(name).digest('hex');
}

module.exports = videogalleryService;