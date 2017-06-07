"use strict";
/*!
 * Simpleportaljs 
 * 
 * Copyright(c) 2012 Faisal(admin@simpleportaljs.com)
 * MIT Licensed
 */

var simpleportal = require("simpleportal"),
	crypto = require('crypto'), 
	fs = require('fs');

var getLocalSubDir = function(localdir, options, callback){
	fs.readdir(localdir, function(err, files) { 
        var dirs = []; 
        for (var index = 0; index < files.length; ++index) { 
            var file = files[index]; 
            
            if (file[0] !== '.' && file[0].indexOf(".") != 0 ) { 
                var filePath = localdir + '/' + file; 
                
                fs.stat(filePath, function(err, stat) {
                    if (stat.isDirectory()) {
                    	var pathhash = simpleportal.util.getHash(this.filePath);
                        dirs.push({ title:(options && options.title ? options.title + " - " + this.file : this.file), pathhash:pathhash, path:this.file } ); 
                    } 
                    if (files.length === (this.index + 1)) { 
                        return callback(null, dirs); 
                    } 
                }.bind({index: index, file: file, filePath:filePath})); 
            }
        }
    });
}

var getLocalSubDirs = function(localdirs, options, callback){
	var cbcount = 0;
	var localfiles = [],
		errors=[];
	
	for(var i in localdirs){}
		getLocalSubDir(localdirs[i], options, function(error, dirlocalfiles){
			if(dirlocalfiles && dirlocalfiles.length > 0)
				localfiles = localfiles.concat(dirlocalfiles);
			
			if(error)
				errors.push(error);
			
			if(cbcount++ == localdirs.length-1)
				callback(errors, localfiles);
		});
};

var scanLocalDirs = function(localdirs, options, callback){
	if(!options){
		if(callback)
			callback();
		else
			return;
	}else {
		var cbcount = 0;
		var localfiles = [],
			errors=[];
		
		for(var i in localdirs){}
			scanLocalDir(localdirs[i], options, function(error, dirlocalfiles){
				if(dirlocalfiles && dirlocalfiles.length > 0)
					localfiles = localfiles.concat(dirlocalfiles);
				
				if(error)
					errors.push(error);
				
				if(cbcount++ == localdirs.length-1)
					callback(errors, localfiles);
			});
	}
}


var scanLocalDir = function(localdir, options, callback){
	if(!options){
		if(callback)
			callback();
		else
			return [];
	}else{
		console.log("scanning -->" + localdir + ('< -- >') + fs.existsSync(localdir));
		var localfiles = [];
		
		if(fs.existsSync(localdir)) {
			var folderhash = simpleportal.util.getHash(localdir);
			
			simpleportal.util.getFileList(localdir, {
				filename:options.filename||null,
				timestamp:options.timestamp||null,
				datadisplay:'title', 
				hash:true, 
				folder:folderhash, 
				root:localdir, 
				includeroot:false, 
				extension:options.fileextension
			}, function(error, filelist){
				if(callback)
					callback(null, filelist);
				else
					return filelist;
			});
		} else if(fs.existsSync(localdir) && callback)
			callback("No directory found -" + localdir, localfiles);
		else if(callback)
			callback("Directory already scanned -" + localdir, localfiles);
		else
			return [];
	}
}

var getHash = function(name){
	return crypto.createHash('md5').update(name).digest('hex');
}

module.exports = {
	scanLocalDir:scanLocalDir,
	scanLocalDirs:scanLocalDirs,
	getLocalSubDirs:getLocalSubDirs
};