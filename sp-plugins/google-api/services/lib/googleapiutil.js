var simpleportal = require("simpleportal"),
	xoauth2 = require('xoauth2'),
	fs = require("fs"),
	google = require('googleapis');

var OAuth2 = google.auth.OAuth2;

module.exports = GoogleApiUtil = {
	Drive:{},
	Mail:{},
//	Translate:{},
	Core:{},
	setPluginloader:function(pluginloader){
		_pluginloader = this.pluginloader = pluginloader;
	}, getPluginloader:function(){
		return this.pluginloader;
	}
};

var _pluginloader;
var oauth2Client; 
var applicationFolder;

GoogleApiUtil.getOauthClient = function(){
	return oauth2Client;
};

//GoogleApiUtil.getApplicationFolder = function(foldername){
//	if(!applicationFolder)
//		return null;
//	
//	if(foldername)
//		return applicationFolder[foldername]
//	else	
//		return applicationFolder["root"];
//};

GoogleApiUtil.setup = function(props, callback){
	var oauthPreference = _pluginloader.getServiceloader().getPreference({name:"googleapi"}, "googleoauth2client");
	
	if(oauthPreference && oauthPreference.clientId)
		_pluginloader.getServiceloader().getSavedPreference({name:"googleapi"}, "googleoauth2client.token", function(error, savedpreference){
			if(savedpreference && savedpreference.preference) {
				// also set the oauth2 client
				oauth2Client = new OAuth2(
					oauthPreference.clientId,
					oauthPreference.clienSecret,
					_pluginloader.getServerInstance().getServerUrl('/api/googleapi/registercallback')
				);
				oauth2Client.setCredentials(savedpreference.preference);
				
				GoogleApiUtil.createFolder({
					resource:{
						description:'Application folder for simpleportal webapp',
						title:'Simpleportal-webserver'
					}
				}, function(error, data){
					if(error) {
						console.log(error);
					} else {
						applicationFolder={root:{id:data.id}};
						
						GoogleApiUtil.createFolders({
							resource:[
							    {
									description:'API service',
									title:'apiservice'
								},{
									description:'Plugin',
									title:'plugin'
								},{
									description:'npm modules',
									title:'npm'
								},{
									description:'Server',
									title:'server'
								},{
									description:'API Service sync',
									title:'apiservice-sync'
								}
							],
							parents:[applicationFolder.root]
						}, function(error, gfolderdata){
							if(gfolderdata)
								simpleportal.util.extendJSON(applicationFolder, gfolderdata);
						});
					}
					
					callback();
				});
			} else
				callback();
		});
	else
		callback("Please configure oauth client details before using google api")
}

GoogleApiUtil.unregisterGoogleAccount = function(callback){
	_pluginloader.getServiceloader().removeSavedPreference({name:"googleapi"}, "googleoauth2client.token", function(){
		oauth2Client = null;
		
		callback();
	});
};

GoogleApiUtil.registerGoogleAccount = function(code, callback){
	console.log("google registerig tokens ->" + code);
	console.log(_pluginloader.getServerInstance().getServerUrl('/api/googleapi/registercallback'));	
	
	if(!code){
		var oauthPreference = _pluginloader.getServiceloader().getPreference({name:"googleapi"}, "googleoauth2client");
		console.log(oauthPreference);
		if(oauthPreference && oauthPreference.clientId){
			oauth2Client = new OAuth2(
				oauthPreference.clientId, 
				oauthPreference.clientSecret, 
				_pluginloader.getServerInstance().getServerUrl('/api/googleapi/registercallback')
			);
			
			// generate a url that asks permissions for Google+ and Google Calendar scopes
			var scopes = oauthPreference.scopes||[
			  'https://www.googleapis.com/auth/plus.me',
			  "https://mail.google.com/",
			  "https://www.googleapis.com/auth/gmail.compose",
			  "https://www.googleapis.com/auth/gmail.insert",
			  "https://www.googleapis.com/auth/gmail.modify",
			  'https://www.googleapis.com/auth/gmail.send',
			  "https://www.googleapis.com/auth/drive",
			  "https://www.googleapis.com/auth/drive.appdata",
			  "https://www.googleapis.com/auth/drive.file",
			  "https://www.googleapis.com/auth/drive.metadata",
			  "https://www.googleapis.com/auth/drive.readonly",
			  "https://www.googleapis.com/auth/drive.photos.readonly",
			  "https://www.googleapis.com/auth/drive.readonly",
			  "https://www.googleapis.com/auth/drive.scripts"
			];
			
			var url = oauth2Client.generateAuthUrl({
				access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token)
				scope: scopes // If you only need one scope you can pass it as string
			});
			
			callback(null, url);
		} else
			callback("No valid googleclient defined for server, please configure preference.");
	}else{
		console.log(oauth2Client);
		oauth2Client.getToken(code, function(err, tokens) {
			console.log(tokens);
			if(!err && tokens){
				oauth2Client.setCredentials(tokens);
				
				_pluginloader.getServiceloader().getService("googleapi").savePreference({title:'Google api permission for email and google drive.', key:"googleoauth2client.token", preference:tokens}, callback)
			} else {
				console.log(err);
			
				callback(err, url);
			}
		});
	}
};

GoogleApiUtil.createFolders = function(props, callback){
	if(props.resource && typeof props.resource.length == 'number'){
		var resourcecbcount = 0;
		var resourcecount = props.resource.length;
		var folderdata = {};
		for(var i in props.resource){
			var resource_ = props.resource[i];
			var props_ = simpleportal.util.extendJSON({}, props);
			props_.resource = resource_;
			
			GoogleApiUtil.createFolder(props_, function(error, gfolderdata){
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
		GoogleApiUtil.createFolder(props, callback);
}

// -{'mimeType' :}
GoogleApiUtil.createFolder = function(props, callback){
	var drive = google.drive({ version: 'v2', auth: GoogleApiUtil.getOauthClient() });
	props.resource.mimeType=props.mimeType='application/vnd.google-apps.folder';

	var searchparams = {applicationfolder:true, q:
		'mimeType="application/vnd.google-apps.folder" and trashed=false and title="'+props.resource.title+'"'
//			{trashed:false, title:props.resource.title, mimeType:"application/vnd.google-apps.folder"}
	};
	
	if(props.parents||props.resource.parents){
		searchparams.applicationfolder=false;
		searchparams.parents=props.parents||props.resource.parents;
		
		if(!props.resource.parents)
			props.resource.parents = props.parents;
	}
	
	GoogleApiUtil.fileDetails(searchparams, function(error, savedfolder){
		if(!error&&savedfolder/*&&savedfolder.title == props.resource.title*/){
			if(!savedfolder.title && props.resource.title)
				savedfolder.title = props.resource.title; 
			
			callback(null, savedfolder);
		}else{
			drive.files.insert(props, callback);
		}
	});
};

/**
 * Expect props in the format for google drive api
 * {resource:{title:'', description:'', mimetype:''}}
 * file // file to upload
 */
GoogleApiUtil.insertFile = function(props, callback){
	if(props && props.file && props.resource) {
		var drive = google.drive({ version: 'v2', auth: GoogleApiUtil.getOauthClient() });
		
		var media = {
			body: fs.createReadStream(props.file)
		};

//		if((!props.mimeType&&props.resource.mimeType == 'text/csv') && props.resource.convert){
//			
//			props.resource.mimeType='application/vnd.google-apps.spreadsheet';
//		}else 

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
		else if(GoogleApiUtil.getApplicationFolder()){
			fileprops.resource.parents=[GoogleApiUtil.getApplicationFolder()];
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
GoogleApiUtil.fileDetails = function(fileprops, callback){
	var drive = google.drive({ version: 'v2', auth: GoogleApiUtil.getOauthClient() });
	
	if(fileprops && fileprops.q) {
		var api = 'files',
			apifunction = 'list';
		
		if(fileprops.parents&&fileprops.parents.length > 0){
			api = 'children';
			fileprops.folderId=fileprops.parents[0].id;
		}else if(fileprops.applicationfolder){}
		else if(GoogleApiUtil.getApplicationFolder()){
			api = 'children';
			fileprops.folderId=GoogleApiUtil.getApplicationFolder().id;
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
GoogleApiUtil.listFiles = function(searchprops, callback){
	var drive = google.drive({ version: 'v2', auth: GoogleApiUtil.getOauthClient() });
	
	drive.files.list(searchprops||{}, function(err, resp) {
		if (err) {
			callback(err, resp.items);
		}
		
		// Got the response from custom search
		if (resp && resp.items && resp.items.length > 0) {
			callback(null, resp.items);
		}else
			callback("No file found");
	});
}
//
//GoogleApiUtil.Mail.sendEmail = function(options, callback){
//	if(GoogleApiUtil.getOauthClient()){
//		var mailoptions = simpleportal.util.extendJSON({
//			from: 'simpleportaljs@gmail.com',
//			fromName:'Simpleportaljs-server'
//		}, options);
//		
//		var gmail = google.gmail({version:'v1', auth:GoogleApiUtil.getOauthClient()});
//		
//		var email_lines = [];
//
//	    email_lines.push("From: \""+mailoptions.subject+"\" <"+mailoptions.from+">");
//	    email_lines.push("To: "+mailoptions.to);
//	    email_lines.push('Content-type: text/html;charset=iso-8859-1');
//	    email_lines.push('Date: '+new Date());
//	    email_lines.push('MIME-Version: 1.0');
//	    email_lines.push("Subject: "+mailoptions.subject);
//	    email_lines.push("Message-ID: <"+mailoptions.from+">");
//	    email_lines.push("\r\n" + mailoptions.text.trim());
//	    
//	    var email = email_lines.join("\r\n").trim();
//	    
//	    var base64EncodedEmail = new Buffer(email).toString('base64');
//	    base64EncodedEmail = base64EncodedEmail.replace(/\+/g, '-').replace(/\//g, '_') 
//	    
//		gmail.users.messages.send({
//			userId:'me',
//			resource:{
//				raw:base64EncodedEmail	
//			}
//		}, function(error, data){
//			if(error)
//				console.log(error);
//			
//			if(callback)
//				callback();
//		});
//	}else{
//		console.log("google api is not configured.");
//		if(callback)callback("google api is not configured.");
//	}
//};

///**
// * List files from the connected google drive api
// */
//GoogleApiUtil.Translate.translate = function(searchprops, callback){
//	var translate = google.translate({ version: 'v2', auth: GoogleApiUtil.getOauthClient() });
//	
//	translate.translations.list(searchprops, callback);
//};