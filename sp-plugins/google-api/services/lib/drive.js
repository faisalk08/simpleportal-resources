"use strict"
var simpleportal = require("simpleportal"),
	fs = require("fs"),
	google = require('googleapis');

var OAuth2 = google.auth.OAuth2;

var GoogleDrive = module.exports = function(options, googleApi) {
	var instance = this;
	
	this._googleApi=googleApi;
	
	return instance;
};

GoogleDrive.prototype.getGDrive = function(options){
	var instance = this;

	if(instance._googleApi && instance._googleApi.authenticated)
		return google.drive({ version: 'v2', auth: instance.getOauthClient() });
	else  if(options && options["public"])
		return google.drive({ version: 'v2', auth: instance.getOauthClient() });
	else
		return null;
}

GoogleDrive.prototype.getOauthClient = function(){
	var instance = this;
	
	return instance._googleApi.getOauthClient();
}

GoogleDrive.prototype.getApplicationFolder = function(foldername){
	var instance = this;
	
	if(!instance._applicationfolder)
		return null;
	
	if(foldername)
		return instance._applicationfolder[foldername]
	else	
		return instance._applicationfolder["root"];
};

GoogleDrive.prototype.createFolders = function(props, callback){
	var instance = this;
	
	if(props.resource && typeof props.resource.length == 'number'){
		var resourcecbcount = 0;
		var resourcecount = props.resource.length;
		var folderdata = {};
		
		for(var i in props.resource){
			var resource_ = props.resource[i];
			var props_ = simpleportal.util.extendJSON({}, props);
			props_.resource = resource_;
			
			instance.createFolder(props_, function(error, gfolderdata){
				if(gfolderdata&&gfolderdata.title)
					folderdata[gfolderdata.title]={id:gfolderdata.id};
				else if(gfolderdata&&props.resource.title)
					folderdata[props.resource.title]={id:gfolderdata.id};
				
				if(resourcecbcount++ == resourcecount-1){
					callback(null, folderdata);
				}
			});
		}
	}else
		instance.createFolder(props, callback);
}

GoogleDrive.prototype.createFolder = function(props, callback){
	var instance = this;
	
	var drive = instance.getGDrive();
	
	if(!drive){
		callback("Google api is not configured.");
	} else {
		props.resource.mimeType=props.mimeType='application/vnd.google-apps.folder';

		var searchparams = {applicationfolder:true, q:
			'mimeType="application/vnd.google-apps.folder" and trashed=false and title="'+props.resource.title+'"'
//				{trashed:false, title:props.resource.title, mimeType:"application/vnd.google-apps.folder"}
		};
		
		if(props.parents||props.resource.parents){
			searchparams.applicationfolder=false;
			searchparams.parents=props.parents||props.resource.parents;
			
			if(!props.resource.parents)
				props.resource.parents = props.parents;
		}
		
		instance.fileDetails(searchparams, function(error, savedfolder){
			if(!error&&savedfolder /*&&savedfolder.title == props.resource.title*/){
				if(!savedfolder.title && props.resource.title)
					savedfolder.title = props.resource.title; 
				
				callback(null, savedfolder);
			}else{
				drive.files.insert(props, callback);
			}
		});
	}
};

/**
 * Expect props in the format for google drive api
 * {resource:{title:'', description:'', mimetype:''}}
 * file // file to upload
 */
GoogleDrive.prototype.insertFile = function(props, callback){
	var instance = this;
	
	var drive = instance.getGDrive();
	
	if(!drive){
		callback("Google api is not configured.");
	} else if(props && props.file && props.resource) {
		
		var media = {
			body: fs.createReadStream(props.file)
		};

		if(props.mimeType){
			media.mimeType=props.mimeType;
		}else if(props.resource.mimeType){
			media.mimeType=props.resource.mimeType;
		}
		
		var fileprops = {
			resource: props.resource,
			media: media
		};
				
		var api = 'files',
			apifunction = 'insert';
		
		if(props && props.fileId){
			fileprops.fileId=props.fileId;
			apifunction = 'update';
		}
		
		if(fileprops.resource.parents){}// if parents is already available
		else if(instance.getApplicationFolder()){
			fileprops.resource.parents=[instance.getApplicationFolder()];
		}
		
		drive[api][apifunction](fileprops, function(err, file) {
			if(err) {
				// Handle error
				callback(err);
			} else {
				console.log("Successfully "+apifunction+"ed my data to google drive back up and the file id is - " + file.id)
				callback(null, file);
			}
		});
	}else{
		callback("No file provided and resource information is also missing");
	}	
}

/**
 * List files from the connected google drive api
 */
GoogleDrive.prototype.fileDetails = function(fileprops, callback){
	var instance = this;
	
	var drive = instance.getGDrive();
	
	if(!drive){
		callback("Google api is not configured.");
	} else if(fileprops && fileprops.q) {
		var api = 'files',
			apifunction = 'list';
		
		if(fileprops.parents && fileprops.parents.length > 0){
			api = 'children';
			fileprops.folderId=fileprops.parents[0].id;
		}else if(fileprops.applicationfolder){}
		else if(instance.getApplicationFolder()){
			api = 'children';
			fileprops.folderId=instance.getApplicationFolder().id;
		}
		
		drive[api][apifunction](fileprops, function(err, resp) {
			if (err) {
				console.log('An error occured', err);
				callback(err);
			}
			
			// Got the response from custom search
			if (resp && resp.items && resp.items.length > 0) {
				callback(null, resp.items[0]);
			}else
				callback("No file found");
		});
	}else
		callback("No file props provided");
}

/**
 * List files from the connected google drive api
 */
GoogleDrive.prototype.listFiles = function(searchprops, callback){
	var instance = this;
	
	var options = {};
	if(searchprops && searchprops["public"])
		options["public"] =true;
	
	var drive = instance.getGDrive(options);
	
	if(!drive){
		callback("Google api is not configured.");
	} else if(searchprops && searchprops.folderId)
		drive.children.list(searchprops||{}, function(err, resp) {
			console.log(resp);
			if (err) {
				callback(err, resp ? resp.items: resp);
			}else if (resp && resp.items && resp.items.length > 0) {
				callback(null, resp.items);
			}else
				callback("No file found");
		});
	else
		drive.files.list(searchprops||{}, function(err, resp) {
			console.log(resp);
			if (err) {
				callback(err, resp ? resp.items: resp);
			}else if (resp && resp.items && resp.items.length > 0) {
				// Got the response from custom search  
				callback(null, resp.items);
			}else
				callback("No file found");
		});
}